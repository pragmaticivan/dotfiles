#!/usr/bin/env bash
#
# analyze-split.sh — measure a branch's diff and emit a reviewer-weighted budget
# plus candidate groupings, as JSON, for designing a stacked-PR split.
#
# Usage: analyze-split.sh [trunk] [source]
#   trunk   base branch the split will be rooted on (default: origin's HEAD)
#   source  branch being split (default: current branch)
#
# Env overrides:
#   TARGET_LINES_PER_LAYER  reviewer-weighted line budget per layer (default 300)
#   EXCLUDE_PATTERNS        ERE of paths to exclude from the budget
#
# Reviewer-weighted lines = source + (tests / 2). Generated/vendored/lockfiles
# count zero: they inflate a diff without costing review attention, so counting
# them would split a PR that is actually small.
#
# Adapted from the `split-branch` skill in github.com/zpyoung/quirk (analyze.sh).
# Bash 3.2 compatible (macOS system bash) — no associative arrays, no mapfile.

set -euo pipefail

TARGET_LINES_PER_LAYER="${TARGET_LINES_PER_LAYER:-300}"

DEFAULT_EXCLUDE_PATTERNS='(^|/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Cargo\.lock|Gemfile\.lock|go\.sum|composer\.lock|uv\.lock|Pipfile\.lock)$|(^|/)(node_modules|vendor|dist|build|\.next|\.nuxt|target|__snapshots__)/|\.min\.(js|css)$|\.generated\.|__generated__|_pb\.go$|_pb2\.py$|\.pb\.go$|_generated\.go$'
EXCLUDE_PATTERNS="${EXCLUDE_PATTERNS:-$DEFAULT_EXCLUDE_PATTERNS}"

die() { printf '%s\n' "error: $*" >&2; exit 1; }

detect_trunk() {
  if [[ -n "${1:-}" ]]; then printf '%s\n' "$1"; return; fi
  if git symbolic-ref refs/remotes/origin/HEAD &>/dev/null; then
    git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
  elif git show-ref --verify --quiet refs/heads/main; then echo main
  elif git show-ref --verify --quiet refs/heads/master; then echo master
  else die "cannot detect trunk branch; pass it explicitly"
  fi
}

git rev-parse --is-inside-work-tree &>/dev/null || die "not inside a git work tree"

TRUNK="$(detect_trunk "${1:-}")"
SOURCE="${2:-$(git branch --show-current)}"
[[ -n "$SOURCE" ]] || die "detached HEAD — pass the source branch explicitly"
[[ "$SOURCE" != "$TRUNK" ]] || die "source branch and trunk are both '$TRUNK'"

git rev-parse --verify --quiet "$TRUNK" >/dev/null \
  || git rev-parse --verify --quiet "origin/$TRUNK" >/dev/null \
  || die "trunk '$TRUNK' not found locally or on origin"

MERGE_BASE="$(git merge-base "$TRUNK" "$SOURCE" 2>/dev/null || git merge-base "origin/$TRUNK" "$SOURCE")"

# `--no-renames` keeps a rename as a delete of the old path plus an add of the
# new one. build-stack.sh assigns files to layers by path, so both paths must
# appear here or the coverage check there reports a phantom uncovered file.
NUMSTAT="$(git diff --numstat --no-renames "$MERGE_BASE" "$SOURCE")"
COMMITS="$(git rev-list --count "$MERGE_BASE..$SOURCE")"
MERGE_COMMITS="$(git rev-list --merges --count "$MERGE_BASE..$SOURCE")"

WARNINGS=""
# Unit separator, not a newline. `awk -v` rejects a literal newline in a value,
# so a newline here aborted the whole run as soon as any warning fired.
add_warning() { WARNINGS="${WARNINGS}${1}"$'\037'; }

git diff --quiet                  || add_warning "working tree has unstaged changes — commit or stash before splitting"
git diff --cached --quiet         || add_warning "index has staged uncommitted changes — commit or stash before splitting"
[[ "$MERGE_COMMITS" -eq 0 ]]     || add_warning "$MERGE_COMMITS merge commit(s) in $MERGE_BASE..$SOURCE — the snapshot build ignores history shape, so this is informational only"
[[ -n "$NUMSTAT" ]]              || add_warning "no changes between $MERGE_BASE and $SOURCE — nothing to split"

# Per-file rows and aggregates. One awk pass emits the `files` array, the
# per-directory rollup, and the totals so the shell never re-classifies.
printf '%s\n' "$NUMSTAT" | awk -F'\t' \
  -v exclude_re="$EXCLUDE_PATTERNS" \
  -v trunk="$TRUNK" -v source="$SOURCE" -v mb="$MERGE_BASE" \
  -v target="$TARGET_LINES_PER_LAYER" -v commits="$COMMITS" -v merges="$MERGE_COMMITS" \
  -v warnings="$WARNINGS" '
  function jesc(s) { gsub(/\\/, "\\\\", s); gsub(/"/, "\\\"", s); gsub(/\t/, "\\t", s); return s }
  function classify(fp) {
    if (exclude_re != "" && fp ~ exclude_re) return "excluded"
    # Prose before tests. A documentation tree named docs/specs/ matched the
    # specs?/ test pattern below and got counted as a test suite.
    if (fp ~ /^docs?\// || fp ~ /\.(md|mdx|rst|adoc|txt)$/) return "docs"
    if (fp ~ /(^|\/)(tests?|specs?|__tests__|testdata|fixtures)\//) return "test"
    if (fp ~ /\.(test|spec)\.[a-zA-Z]+$/) return "test"
    if (fp ~ /(_test|Test|_spec)\.[a-zA-Z]+$/) return "test"
    return "source"
  }
  # Group key: two path segments when available, else one. Two levels separate
  # e.g. src/api from src/db, which one level would merge into a single "src".
  function groupof(fp,  parts, n) {
    n = split(fp, parts, "/")
    if (n == 1) return "(root)"
    if (n == 2) return parts[1]
    return parts[1] "/" parts[2]
  }
  BEGIN { nf = 0; ng = 0 }
  NF >= 3 {
    fp = $3
    kind = ($1 == "-") ? "binary" : classify(fp)
    lines = ($1 == "-") ? 0 : $1 + $2
    nf++
    f_path[nf] = fp; f_add[nf] = $1; f_del[nf] = $2; f_kind[nf] = kind; f_lines[nf] = lines
    if (kind == "binary") { binaries[++nb] = fp }
    if (kind == "excluded") { excl[++nx] = fp; tot_excluded += lines }
    else if (kind == "docs") { tot_docs += lines }
    else if (kind == "test") { tot_test += lines }
    else if (kind == "source") { tot_source += lines }
    if ($1 != "-") { tot_add += $1; tot_del += $2 }
    g = groupof(fp)
    if (!(g in g_seen)) { g_seen[g] = 1; g_order[++ng] = g }
    g_src[g] += (kind == "source") ? lines : 0
    g_tst[g] += (kind == "test")   ? lines : 0
    g_doc[g] += (kind == "docs")   ? lines : 0
    g_exc[g] += (kind == "excluded") ? lines : 0
    g_cnt[g] += 1
  }
  END {
    weighted = tot_source + int(tot_test / 2) + int(tot_docs / 4)
    # Ceiling division: how many layers the budget implies.
    suggested = (weighted <= target) ? 1 : int((weighted + target - 1) / target)

    printf "{\n"
    printf "  \"trunk\": \"%s\",\n", jesc(trunk)
    printf "  \"source\": \"%s\",\n", jesc(source)
    printf "  \"merge_base\": \"%s\",\n", jesc(mb)
    printf "  \"commits\": %d,\n", commits
    printf "  \"merge_commits\": %d,\n", merges
    printf "  \"total_files\": %d,\n", nf
    printf "  \"lines_added\": %d,\n", tot_add + 0
    printf "  \"lines_deleted\": %d,\n", tot_del + 0
    printf "  \"source_lines\": %d,\n", tot_source + 0
    printf "  \"test_lines\": %d,\n", tot_test + 0
    printf "  \"docs_lines\": %d,\n", tot_docs + 0
    printf "  \"excluded_lines\": %d,\n", tot_excluded + 0
    printf "  \"weighted_review_lines\": %d,\n", weighted
    printf "  \"target_lines_per_layer\": %d,\n", target
    printf "  \"suggested_layer_count\": %d,\n", suggested
    printf "  \"split_recommended\": %s,\n", (weighted >= 200 ? "true" : "false")

    printf "  \"groups\": [\n"
    for (i = 1; i <= ng; i++) {
      g = g_order[i]
      printf "    { \"group\": \"%s\", \"source_lines\": %d, \"test_lines\": %d, \"docs_lines\": %d, \"excluded_lines\": %d, \"weighted\": %d, \"file_count\": %d }%s\n", \
        jesc(g), g_src[g], g_tst[g], g_doc[g], g_exc[g], g_src[g] + int(g_tst[g] / 2) + int(g_doc[g] / 4), g_cnt[g], (i < ng ? "," : "")
    }
    printf "  ],\n"

    printf "  \"files\": [\n"
    for (i = 1; i <= nf; i++) {
      printf "    { \"path\": \"%s\", \"added\": \"%s\", \"deleted\": \"%s\", \"kind\": \"%s\", \"lines\": %d }%s\n", \
        jesc(f_path[i]), f_add[i], f_del[i], f_kind[i], f_lines[i], (i < nf ? "," : "")
    }
    printf "  ],\n"

    printf "  \"binary_files\": ["
    for (i = 1; i <= nb; i++) printf "%s\"%s\"", (i > 1 ? ", " : ""), jesc(binaries[i])
    printf "],\n"

    printf "  \"excluded_files\": ["
    for (i = 1; i <= nx; i++) printf "%s\"%s\"", (i > 1 ? ", " : ""), jesc(excl[i])
    printf "],\n"

    printf "  \"warnings\": ["
    n = split(warnings, w, "\037"); first = 1
    for (i = 1; i <= n; i++) {
      if (w[i] == "") continue
      printf "%s\"%s\"", (first ? "" : ", "), jesc(w[i]); first = 0
    }
    printf "]\n"
    printf "}\n"
  }
'
