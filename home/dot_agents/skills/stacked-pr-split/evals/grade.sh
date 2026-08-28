#!/usr/bin/env bash
#
# grade.sh <fixture-name> <fixture-repo-dir> [plan.json]
#
# Grades the objectively-checkable assertions for one eval by inspecting the
# fixture repo the run left behind, and emits grading.json in the shape the
# skill-creator eval viewer expects:
#
#   { "expectations": [ {"text": ..., "passed": bool, "evidence": ...} ],
#     "summary": {"passed": n, "failed": n, "total": n, "pass_rate": f} }
#
# Only the mechanical assertions live here — file coverage, dependency
# ordering, losslessness, linearity, budget, whether a split happened at all.
# The judgment-shaped assertions in evals.json (did the run explain the
# straddling file, did it seek approval before touching git) are marked
# "qualitative" there and graded by a human or a grader model reading the
# transcript. Scripting the mechanical half is what keeps re-grading across
# iterations cheap and consistent.
#
# Exits 0 if every checked assertion passed, 1 otherwise.

set -uo pipefail

FIXTURE="${1:-}"
REPO="${2:-}"
# Default the plan to a sibling FILE named after the repo, not `<repo>/../plan.json`
# — fixtures share a parent directory, so a bare `plan.json` there gets
# overwritten by whichever eval ran last and you grade the wrong plan.
PLAN="${3:-${REPO%/}.plan.json}"

[[ -n "$FIXTURE" && -n "$REPO" ]] || { echo "usage: grade.sh <fixture-name> <repo-dir> [plan.json]" >&2; exit 2; }
[[ -d "$REPO/.git" ]] || { echo "not a git repo: $REPO" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq required" >&2; exit 2; }

# Resolve the sibling scripts to absolute paths BEFORE cd'ing into the fixture.
# A relative `dirname $0` would resolve against the fixture repo after the cd,
# the script invocations would fail silently, and the gates they back would be
# reported as failed rather than as unrunnable — the worst kind of wrong.
SCRIPTS="$(cd "$(dirname "$0")/../scripts" && pwd)"
PLAN="$(cd "$(dirname "$PLAN")" 2>/dev/null && pwd)/$(basename "$PLAN")"
[[ -x "$SCRIPTS/build-stack.sh" || -f "$SCRIPTS/build-stack.sh" ]] \
  || { echo "cannot locate scripts/ next to grade.sh (looked in $SCRIPTS)" >&2; exit 2; }

cd "$REPO"

TRUNK=main
SOURCE="$(git branch --list 'feat/*' 'chore/*' --format='%(refname:short)' | head -1)"
MERGE_BASE="$(git merge-base "$TRUNK" "$SOURCE" 2>/dev/null)"

RESULTS=""
NPASS=0; NFAIL=0

check() { # check <passed:0|1> <text> <evidence>
  local ok="$1" text="$2" ev="$3"
  local json_ok="false"
  if [[ "$ok" == "1" ]]; then json_ok="true"; NPASS=$((NPASS+1)); else NFAIL=$((NFAIL+1)); fi
  [[ -z "$RESULTS" ]] || RESULTS="${RESULTS},"
  RESULTS="${RESULTS}{\"text\":$(printf '%s' "$text" | jq -Rs .),\"passed\":$json_ok,\"evidence\":$(printf '%s' "$ev" | jq -Rs .)}"
}

# Which layer index holds a given path? Empty if unassigned.
layer_of() {
  [[ -f "$PLAN" ]] || { echo ""; return; }
  jq -r --arg p "$1" '[.layers[].files] | to_entries[] | select(.value | index($p)) | .key' "$PLAN" 2>/dev/null | head -1
}

HAS_PLAN=0
[[ -f "$PLAN" ]] && jq -e . "$PLAN" >/dev/null 2>&1 && HAS_PLAN=1

# ---------------------------------------------------------------------------
# mostly-generated: the correct outcome is to NOT split. Checked first because
# every other assertion assumes a stack was built.
# ---------------------------------------------------------------------------
if [[ "$FIXTURE" == "mostly-generated" ]]; then
  NEW_BRANCHES="$(git branch --format='%(refname:short)' | grep -vE "^($TRUNK|$SOURCE)$" | grep -v '^backup/' || true)"
  if [[ -z "$NEW_BRANCHES" ]]; then
    check 1 "Does not split the branch: no layer branches were created" "Only $TRUNK and $SOURCE exist (plus any backup/*). Correct — the diff is ~146 weighted review lines once the regenerated lockfile and .pb.go are excluded."
  else
    check 0 "Does not split the branch: no layer branches were created" "Layer branches were created despite the diff being ~146 weighted lines: $(printf '%s' "$NEW_BRANCHES" | tr '\n' ' ')"
  fi

  W="$(bash "$SCRIPTS/analyze-split.sh" "$TRUNK" "$SOURCE" 2>/dev/null | jq -r '.weighted_review_lines')"
  if [[ -n "$W" && "$W" -lt 200 ]]; then
    check 1 "Reported weighted review size is below the 200-line split threshold" "analyze-split.sh reports weighted_review_lines=$W against a raw diff of ~1,900 lines."
  else
    check 0 "Reported weighted review size is below the 200-line split threshold" "weighted_review_lines=${W:-unknown}"
  fi

else
  # -------------------------------------------------------------------------
  # layered-feature / straddling-file: a stack should have been built.
  # -------------------------------------------------------------------------
  if [[ "$HAS_PLAN" == "1" ]]; then
    check 1 "A layer plan was written as machine-readable JSON" "Found a valid plan at $PLAN with $(jq '.layers|length' "$PLAN") layers."
  else
    check 0 "A layer plan was written as machine-readable JSON" "No valid plan JSON found at $PLAN — cannot grade plan-shaped assertions."
  fi

  # Coverage: every changed file assigned exactly once.
  if [[ "$HAS_PLAN" == "1" ]]; then
    EXPECTED="$(git diff --name-only --no-renames "$MERGE_BASE" "$SOURCE" | LC_ALL=C sort)"
    PLANNED="$(jq -r '.layers[].files[]' "$PLAN" | LC_ALL=C sort)"
    DUPES="$(printf '%s\n' "$PLANNED" | LC_ALL=C uniq -d)"
    MISSING="$(comm -23 <(printf '%s\n' "$EXPECTED") <(printf '%s\n' "$PLANNED" | LC_ALL=C uniq))"
    if [[ -z "$DUPES" && -z "$MISSING" ]]; then
      check 1 "Every changed file is assigned to exactly one layer" "All $(printf '%s\n' "$EXPECTED" | grep -c .) changed files assigned once; no duplicates."
    else
      check 0 "Every changed file is assigned to exactly one layer" "duplicates: [$(printf '%s' "$DUPES" | tr '\n' ' ')] unassigned: [$(printf '%s' "$MISSING" | tr '\n' ' ')]"
    fi

    NL="$(jq '.layers|length' "$PLAN")"
    if [[ "$NL" -ge 3 && "$NL" -le 5 ]]; then
      check 1 "Splits into 3-5 layers (the diff has four natural dependency levels)" "Plan has $NL layers."
    else
      check 0 "Splits into 3-5 layers (the diff has four natural dependency levels)" "Plan has $NL layers; 4 is the natural count for this diff."
    fi

    # Dependency ordering: schema below store below api below ui.
    L_SCHEMA="$(layer_of db/schema.sql)"
    L_STORE="$(layer_of internal/store/store.go)"
    L_API="$(layer_of internal/api/handlers_auth.go)"
    L_UI="$(layer_of web/app.tsx)"
    ORDER_EV="schema=L${L_SCHEMA:-?} store=L${L_STORE:-?} api=L${L_API:-?} ui=L${L_UI:-?} (0-indexed, bottom first)"
    if [[ -n "$L_SCHEMA" && -n "$L_STORE" && -n "$L_API" && -n "$L_UI" \
          && "$L_SCHEMA" -le "$L_STORE" && "$L_STORE" -le "$L_API" && "$L_API" -le "$L_UI" ]]; then
      check 1 "Layers are ordered by dependency: schema <= store/auth <= api <= ui" "$ORDER_EV"
    else
      check 0 "Layers are ordered by dependency: schema <= store/auth <= api <= ui" "$ORDER_EV"
    fi

    # A rename must not be split across layers, or one layer deletes a file the
    # other still needs.
    L_OLD="$(layer_of internal/auth/legacy_token.go)"
    L_NEW="$(layer_of internal/auth/token.go)"
    if [[ -n "$L_OLD" && "$L_OLD" == "$L_NEW" ]]; then
      check 1 "The rename's old and new paths land in the same layer" "legacy_token.go and token.go both in layer L$L_OLD."
    else
      check 0 "The rename's old and new paths land in the same layer" "legacy_token.go=L${L_OLD:-unassigned} token.go=L${L_NEW:-unassigned} — a split rename leaves one layer referencing a deleted file."
    fi

    # The excluded lockfile must not be treated as review-worthy content.
    L_LOCK="$(layer_of package-lock.json)"
    LOCK_ALONE=0
    [[ -n "$L_LOCK" ]] && [[ "$(jq ".layers[$L_LOCK].files|length" "$PLAN")" == "1" ]] && LOCK_ALONE=1
    if [[ "$LOCK_ALONE" == "0" ]]; then
      check 1 "The regenerated lockfile did not get a layer of its own" "package-lock.json rides along in layer L${L_LOCK:-?} with other files (it is 0-weight, so it should never justify a layer)."
    else
      check 0 "The regenerated lockfile did not get a layer of its own" "package-lock.json is alone in layer L$L_LOCK — 303 excluded lines were treated as reviewable content."
    fi

    # Every layer needs a body reviewers can orient with.
    # Any marker that orients a reviewer within the chain counts: an explicit
    # stack header, an arrow diagram, a "depends on" line, or a layer/PR
    # reference. The assertion is about orientation, not a fixed template.
    NO_BODY="$(jq -r '[.layers[] | select((.body // "") | test("[Ss]tack|→|->|this PR|[Dd]epends on|[Ll]ayer *[0-9]|#[0-9]|[Bb]ottom|[Tt]op of") | not) | .branch] | join(", ")' "$PLAN")"
    if [[ -z "$NO_BODY" ]]; then
      check 1 "Every layer has a PR body carrying stack-position context" "All $NL layers have a body referencing stack position."
    else
      check 0 "Every layer has a PR body carrying stack-position context" "Layers without stack-position context in .body: $NO_BODY"
    fi

    # Losslessness + linearity, via the skill's own gates.
    VERIFY="$(bash "$SCRIPTS/build-stack.sh" --verify-only "$PLAN" 2>/dev/null)"
    if [[ "$(printf '%s' "$VERIFY" | jq -r '.verified' 2>/dev/null)" == "true" ]]; then
      check 1 "Built stack is lossless and linear (top layer's tree matches the original branch)" "build-stack.sh --verify-only reports verified=true for $(printf '%s' "$VERIFY" | jq -r '.top_branch') vs $SOURCE."
    else
      check 0 "Built stack is lossless and linear (top layer's tree matches the original branch)" "verify errors: $(printf '%s' "$VERIFY" | jq -c '.errors' 2>/dev/null || echo 'branches missing or plan unbuilt')"
    fi

    OVER="$(printf '%s' "$VERIFY" | jq -r '[.layers[] | select(.weighted_review_lines > 600) | .branch] | join(", ")' 2>/dev/null)"
    if [[ -z "$OVER" || "$OVER" == "null" ]]; then
      check 1 "No layer exceeds the 600-weighted-line hard cap" "Layer sizes: $(printf '%s' "$VERIFY" | jq -c '[.layers[].weighted_review_lines]' 2>/dev/null)"
    else
      check 0 "No layer exceeds the 600-weighted-line hard cap" "Over cap: $OVER"
    fi
  fi

  # The original branch must survive untouched — the split is additive.
  if git rev-parse --verify --quiet "$SOURCE" >/dev/null; then
    check 1 "The original branch still exists and was not rewritten" "$SOURCE is at $(git rev-parse --short "$SOURCE")."
  else
    check 0 "The original branch still exists and was not rewritten" "$SOURCE is gone."
  fi

  if [[ "$FIXTURE" == "straddling-file" ]]; then
    L_ROUTER="$(layer_of internal/api/router.go)"
    if [[ -n "$L_ROUTER" ]]; then
      check 1 "The straddling file (internal/api/router.go) is assigned to exactly one layer, not duplicated" "router.go assigned to layer L$L_ROUTER only."
    else
      check 0 "The straddling file (internal/api/router.go) is assigned to exactly one layer, not duplicated" "router.go is unassigned or duplicated in the plan."
    fi
  fi
fi

TOTAL=$((NPASS + NFAIL))
RATE=0
[[ "$TOTAL" -gt 0 ]] && RATE="$(awk -v p="$NPASS" -v t="$TOTAL" 'BEGIN{printf "%.4g", p/t}')"

cat <<JSON
{
  "eval_name": $(printf '%s' "$FIXTURE" | jq -Rs .),
  "graded_by": "evals/grade.sh (mechanical assertions only)",
  "expectations": [$RESULTS],
  "summary": { "passed": $NPASS, "failed": $NFAIL, "total": $TOTAL, "pass_rate": $RATE }
}
JSON

[[ "$NFAIL" -eq 0 ]]
