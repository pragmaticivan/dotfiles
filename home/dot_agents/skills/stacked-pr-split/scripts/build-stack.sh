#!/usr/bin/env bash
#
# build-stack.sh — turn a signed-off layer plan into a chain of local branches
# whose parentage is already linear, ready for the stack CLI to adopt.
#
# Usage:
#   build-stack.sh <plan.json>                 build the layer branches, then verify
#   build-stack.sh --verify-only <plan.json>   verify branches that already exist
#
# Each layer branch holds the CUMULATIVE final content of layers 1..k:
#
#   L1 = trunk + final content of L1's files
#   L2 = L1    + final content of L2's files
#   Lk = L(k-1)+ final content of Lk's files
#
# So layer k's diff against its base is exactly its own files, and the top
# layer's tree is byte-identical to the source branch. That identity is the
# correctness gate this script enforces — it is what makes the split provably
# lossless, and it is why no `git rebase --onto` is involved (rebasing a split
# out of an existing branch is where the classic "which base did I mean?"
# footgun lives).
#
# Plan schema:
# {
#   "trunk":  "main",
#   "source": "feat/big-auth",
#   "layers": [
#     { "branch": "auth/1-schema",
#       "title":  "Add users and sessions tables",
#       "body":   "optional PR body; becomes the commit body",
#       "files":  ["db/schema.sql", "db/migrations/001_users.sql"] }
#   ]
# }
#
# Env:
#   SPLIT_RUN_HOOKS=1   run commit hooks (default: skipped — see note below)
#   EXCLUDE_PATTERNS    ERE of paths that cost no review attention; must match
#                       analyze-split.sh or per-layer budgets will disagree
#
# Bash 3.2 compatible (macOS system bash).

set -euo pipefail

# Keep in sync with analyze-split.sh — a mismatch makes a layer look wildly
# over budget when the excess is all generated content.
DEFAULT_EXCLUDE_PATTERNS='(^|/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Cargo\.lock|Gemfile\.lock|go\.sum|composer\.lock|uv\.lock|Pipfile\.lock)$|(^|/)(node_modules|vendor|dist|build|\.next|\.nuxt|target|__snapshots__)/|\.min\.(js|css)$|\.generated\.|__generated__|_pb\.go$|_pb2\.py$|\.pb\.go$|_generated\.go$'
EXCLUDE_PATTERNS="${EXCLUDE_PATTERNS:-$DEFAULT_EXCLUDE_PATTERNS}"

VERIFY_ONLY=0
if [[ "${1:-}" == "--verify-only" ]]; then VERIFY_ONLY=1; shift; fi
PLAN="${1:-}"

die() { printf 'error: %s\n' "$*" >&2; exit 1; }
note() { printf '%s\n' "$*" >&2; }

[[ -n "$PLAN" ]] || die "usage: build-stack.sh [--verify-only] <plan.json>"
[[ -f "$PLAN" ]] || die "plan file not found: $PLAN"
command -v jq >/dev/null || die "jq is required"
git rev-parse --is-inside-work-tree &>/dev/null || die "not inside a git work tree"
jq -e . "$PLAN" >/dev/null 2>&1 || die "plan is not valid JSON: $PLAN"

TRUNK="$(jq -r '.trunk // empty' "$PLAN")"
SOURCE="$(jq -r '.source // empty' "$PLAN")"
LAYER_COUNT="$(jq '.layers | length' "$PLAN")"

[[ -n "$TRUNK"  ]] || die "plan is missing .trunk"
[[ -n "$SOURCE" ]] || die "plan is missing .source"
[[ "$LAYER_COUNT" -ge 1 ]] || die "plan has no layers"

git rev-parse --verify --quiet "$SOURCE" >/dev/null || die "source branch '$SOURCE' not found"
TRUNK_REF="$TRUNK"
git rev-parse --verify --quiet "$TRUNK" >/dev/null || TRUNK_REF="origin/$TRUNK"
git rev-parse --verify --quiet "$TRUNK_REF" >/dev/null || die "trunk '$TRUNK' not found locally or on origin"

MERGE_BASE="$(git merge-base "$TRUNK_REF" "$SOURCE")"

# `--no-renames` throughout: a rename must surface as a delete of the old path
# plus an add of the new one, so both paths can be assigned to a layer
# explicitly. Rename detection would collapse them into one row and the
# coverage check below would then report a phantom uncovered file.
DIFF_OPTS="--no-renames"

TMPDIR_RUN="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_RUN"' EXIT

EXPECTED="$TMPDIR_RUN/expected"
PLANNED="$TMPDIR_RUN/planned"
git diff --name-only $DIFF_OPTS "$MERGE_BASE" "$SOURCE" | LC_ALL=C sort > "$EXPECTED"
jq -r '.layers[].files[]' "$PLAN" | LC_ALL=C sort > "$PLANNED"

# ---------------------------------------------------------------------------
# Plan validation: every changed file assigned exactly once, nothing invented.
# Catching this before touching git is the difference between a clear error and
# a half-built stack.
# ---------------------------------------------------------------------------
PLAN_ERRORS=""
DUPES="$(LC_ALL=C uniq -d "$PLANNED" || true)"
MISSING="$(LC_ALL=C comm -23 "$EXPECTED" <(LC_ALL=C uniq "$PLANNED") || true)"
EXTRA="$(LC_ALL=C comm -13 "$EXPECTED" <(LC_ALL=C uniq "$PLANNED") || true)"

[[ -z "$DUPES"   ]] || PLAN_ERRORS="${PLAN_ERRORS}files assigned to more than one layer (a file belongs to exactly one layer; split by hunk into separate files first, or merge the layers):"$'\n'"$DUPES"$'\n'
[[ -z "$MISSING" ]] || PLAN_ERRORS="${PLAN_ERRORS}changed files not assigned to any layer (the split would silently drop them):"$'\n'"$MISSING"$'\n'
[[ -z "$EXTRA"   ]] || PLAN_ERRORS="${PLAN_ERRORS}planned files that are not part of the diff (typo, or already on trunk):"$'\n'"$EXTRA"$'\n'

DUP_BRANCHES="$(jq -r '.layers[].branch' "$PLAN" | LC_ALL=C sort | LC_ALL=C uniq -d)"
[[ -z "$DUP_BRANCHES" ]] || PLAN_ERRORS="${PLAN_ERRORS}duplicate layer branch names:"$'\n'"$DUP_BRANCHES"$'\n'

for i in $(seq 0 $((LAYER_COUNT - 1))); do
  b="$(jq -r ".layers[$i].branch // empty" "$PLAN")"
  t="$(jq -r ".layers[$i].title  // empty" "$PLAN")"
  n="$(jq ".layers[$i].files | length" "$PLAN")"
  [[ -n "$b" ]] || PLAN_ERRORS="${PLAN_ERRORS}layer $i is missing .branch"$'\n'
  [[ -n "$t" ]] || PLAN_ERRORS="${PLAN_ERRORS}layer $i ($b) is missing .title — it becomes the PR title"$'\n'
  [[ "$n" -ge 1 ]] || PLAN_ERRORS="${PLAN_ERRORS}layer $i ($b) has no files"$'\n'
done

if [[ -n "$PLAN_ERRORS" ]]; then
  printf '%s' "$PLAN_ERRORS" >&2
  die "plan validation failed — no git operations were performed"
fi

TOP_BRANCH="$(jq -r ".layers[$((LAYER_COUNT - 1))].branch" "$PLAN")"

# ---------------------------------------------------------------------------
# Verification — shared by build and --verify-only.
# ---------------------------------------------------------------------------
verify_and_report() {
  local errors="" i parent layer
  local stats="["

  # Gate 1: the top layer must reproduce the source branch exactly. If this
  # holds, no change was lost, duplicated, or mangled anywhere in the stack.
  if ! git diff --quiet "$TOP_BRANCH" "$SOURCE" -- 2>/dev/null; then
    errors="${errors}LOSSLESSNESS: top layer '$TOP_BRANCH' does not match '$SOURCE'. Differing paths:"$'\n'
    errors="${errors}$(git diff --name-status $DIFF_OPTS "$TOP_BRANCH" "$SOURCE" | sed 's/^/  /')"$'\n'
  fi

  # Gate 2: strictly linear parentage. GitHub refuses to merge a stack whose
  # branches are not linear, and `gh stack init` would immediately report
  # needsRebase on adoption.
  parent="$TRUNK_REF"
  for i in $(seq 0 $((LAYER_COUNT - 1))); do
    layer="$(jq -r ".layers[$i].branch" "$PLAN")"
    if ! git rev-parse --verify --quiet "$layer" >/dev/null; then
      errors="${errors}LINEARITY: layer branch '$layer' does not exist"$'\n'
      parent="$layer"; continue
    fi
    if ! git merge-base --is-ancestor "$parent" "$layer"; then
      errors="${errors}LINEARITY: '$parent' is not an ancestor of '$layer' — history is not linear"$'\n'
    fi
    parent="$layer"
  done

  # Per-layer reviewer-weighted size, so an over-budget layer is visible before
  # reviewers ever see it.
  parent="$TRUNK_REF"
  for i in $(seq 0 $((LAYER_COUNT - 1))); do
    layer="$(jq -r ".layers[$i].branch" "$PLAN")"
    local w=0 files=0
    if git rev-parse --verify --quiet "$layer" >/dev/null; then
      local ns; ns="$(git diff --numstat $DIFF_OPTS "$parent" "$layer" || true)"
      w="$(printf '%s\n' "$ns" | awk -F'\t' -v exclude_re="$EXCLUDE_PATTERNS" '
        NF>=3 && $1!="-" {
          if (exclude_re != "" && $3 ~ exclude_re) next
          l = $1 + $2
          if ($3 ~ /(^|\/)(tests?|specs?|__tests__|testdata|fixtures)\// || $3 ~ /\.(test|spec)\.[a-zA-Z]+$/ || $3 ~ /(_test|Test|_spec)\.[a-zA-Z]+$/) t += l
          else s += l
        } END { print s + int(t/2) }')"
      files="$(printf '%s\n' "$ns" | grep -c . || true)"
      [[ -n "$w" ]] || w=0
    fi
    [[ "$i" -eq 0 ]] || stats="${stats},"
    stats="${stats}{\"branch\":$(printf '%s' "$layer" | jq -Rs .),\"base\":$(printf '%s' "$parent" | jq -Rs .),\"files\":${files:-0},\"weighted_review_lines\":${w:-0}}"
    parent="$layer"
  done
  stats="${stats}]"

  local ok="true"
  [[ -z "$errors" ]] || ok="false"

  cat <<JSON
{
  "verified": $ok,
  "trunk": $(printf '%s' "$TRUNK" | jq -Rs .),
  "source": $(printf '%s' "$SOURCE" | jq -Rs .),
  "top_branch": $(printf '%s' "$TOP_BRANCH" | jq -Rs .),
  "backup_branch": $(printf '%s' "${BACKUP_BRANCH:-}" | jq -Rs .),
  "layers": $stats,
  "errors": $(printf '%s' "$errors" | jq -Rs 'split("\n") | map(select(length > 0))')
}
JSON

  [[ "$ok" == "true" ]] || return 1
  return 0
}

if [[ "$VERIFY_ONLY" -eq 1 ]]; then
  verify_and_report
  exit $?
fi

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
git diff --quiet && git diff --cached --quiet || die "working tree is dirty — commit or stash first"

STARTING_BRANCH="$(git branch --show-current)"
[[ -n "$STARTING_BRANCH" ]] || die "detached HEAD — check out a branch first"

for i in $(seq 0 $((LAYER_COUNT - 1))); do
  b="$(jq -r ".layers[$i].branch" "$PLAN")"
  ! git rev-parse --verify --quiet "$b" >/dev/null || die "branch '$b' already exists — delete it or rename the layer"
done

BACKUP_BRANCH="backup/${SOURCE//\//-}_$(date +%Y%m%d_%H%M%S)"
git branch "$BACKUP_BRANCH" "$SOURCE"
note "backup: $BACKUP_BRANCH -> $(git rev-parse --short "$SOURCE")"

CREATED=""
cleanup_failed_build() {
  local code=$?
  [[ $code -eq 0 ]] && return 0
  note "build failed — rolling back"
  git checkout -q "$STARTING_BRANCH" 2>/dev/null || true
  for b in $CREATED; do git branch -qD "$b" 2>/dev/null && note "  removed $b"; done
  note "  backup preserved: $BACKUP_BRANCH"
  rm -rf "$TMPDIR_RUN"
  exit $code
}
trap cleanup_failed_build EXIT

if [[ "${SPLIT_RUN_HOOKS:-0}" == "1" ]]; then
  HOOK_FLAG=""
else
  # Intermediate layers are legitimately non-compiling by design (a definition
  # can land one layer below its caller), so a pre-commit hook that builds or
  # lints would abort the build midway and leave a half-formed stack. Quality is
  # gated per layer afterwards instead — see the SKILL's per-layer gate step.
  HOOK_FLAG="--no-verify"
  note "commit hooks skipped (SPLIT_RUN_HOOKS=1 to run them)"
fi

PARENT="$TRUNK_REF"
for i in $(seq 0 $((LAYER_COUNT - 1))); do
  BRANCH="$(jq -r ".layers[$i].branch" "$PLAN")"
  TITLE="$(jq -r ".layers[$i].title" "$PLAN")"
  BODY="$(jq -r ".layers[$i].body // \"\"" "$PLAN")"

  git checkout -q -b "$BRANCH" "$PARENT"
  CREATED="$CREATED $BRANCH"

  while IFS= read -r f; do
    [[ -n "$f" ]] || continue
    if git cat-file -e "$SOURCE:$f" 2>/dev/null; then
      git checkout -q "$SOURCE" -- "$f"
    elif git cat-file -e "$MERGE_BASE:$f" 2>/dev/null; then
      git rm -q --cached --ignore-unmatch -- "$f" >/dev/null
      rm -f -- "$f"
      git add -A -- "$f" 2>/dev/null || true
    else
      die "layer '$BRANCH': '$f' exists in neither $SOURCE nor the merge base"
    fi
  done < <(jq -r ".layers[$i].files[]" "$PLAN")

  git add -A -- $(jq -r ".layers[$i].files[]" "$PLAN" | tr '\n' ' ') 2>/dev/null || true

  if git diff --cached --quiet HEAD; then
    die "layer '$BRANCH' produces no change against '$PARENT' — its files are identical to the layer below, so the layer is empty"
  fi

  # One commit per layer, with the layer's PR title as the subject. Submitting
  # the stack has no flag for PR title/body, but it derives both from a
  # single-commit branch's message — so writing the message correctly here is
  # what produces well-titled PRs with no follow-up edit needed.
  MSGFILE="$TMPDIR_RUN/msg.$i"
  printf '%s\n' "$TITLE" > "$MSGFILE"
  if [[ -n "$BODY" ]]; then printf '\n%s\n' "$BODY" >> "$MSGFILE"; fi
  git commit -q $HOOK_FLAG -F "$MSGFILE"

  note "built $BRANCH (base: $PARENT)"
  PARENT="$BRANCH"
done

git checkout -q "$STARTING_BRANCH"
trap 'rm -rf "$TMPDIR_RUN"' EXIT

verify_and_report
