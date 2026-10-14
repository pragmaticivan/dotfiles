#!/usr/bin/env bash
# Usage: link_blocks.sh [--check] BLOCKED BLOCKER [BLOCKED BLOCKER ...]
# Makes each BLOCKED issue "is blocked by" its BLOCKER, then reads the link back from Jira.
# --check reads only, and creates nothing. Exit 1 when a link is missing or reversed.
set -euo pipefail

check_only=0
if [ "${1:-}" = "--check" ]; then
  check_only=1
  shift
fi
if [ $# -eq 0 ] || [ $(($# % 2)) -ne 0 ]; then
  sed -n '2,4p' "$0"
  exit 2
fi
for key in "$@"; do
  [[ $key =~ ^[A-Z][A-Z0-9]+-[0-9]+$ ]] || { echo "not a Jira key: $key"; exit 2; }
done

failed=0
while [ $# -gt 0 ]; do
  blocked=$1 blocker=$2
  shift 2
  if [ $check_only -eq 0 ]; then
    # acli prints "<out> Blocks <in>", but Jira stores "<in> blocks <out>". Measured on AIE-745 and AIE-755.
    acli jira workitem link create --out "$blocked" --in "$blocker" --type 'Blocks' --yes >/dev/null
  fi
  links=$(acli jira workitem view "$blocked" --fields issuelinks --json)
  if jq -e --arg b "$blocker" '[.fields.issuelinks[] | select(.type.name == "Blocks" and .inwardIssue.key == $b)] | length > 0' <<<"$links" >/dev/null; then
    echo "ok    $blocked is blocked by $blocker"
  elif jq -e --arg b "$blocker" '[.fields.issuelinks[] | select(.type.name == "Blocks" and .outwardIssue.key == $b)] | length > 0' <<<"$links" >/dev/null; then
    echo "FAIL  reversed: $blocked blocks $blocker"
    failed=1
  else
    echo "FAIL  missing: $blocked is not blocked by $blocker"
    failed=1
  fi
done
exit $failed
