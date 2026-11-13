#!/usr/bin/env bash
# Usage: upload-pr-screenshots.sh <pr-number> <image>...
#
# Push the images to the folder pr-<pr-number>/ on the shared orphan branch
# pr-screenshots, then print one Markdown image link for each image.
# Each PR writes only to its own folder, thus parallel uploads do not conflict.
# A push that loses a race fetches the new tip and tries again.
# The links contain the commit SHA, thus a later upload does not change them.
set -euo pipefail

branch="${PR_SCREENSHOTS_BRANCH:-pr-screenshots}"
remote="${PR_SCREENSHOTS_REMOTE:-origin}"

if [ $# -lt 2 ]; then
  echo "usage: $(basename "$0") <pr-number> <image>..." >&2
  exit 2
fi
pr=$1
shift
if ! [[ $pr =~ ^[0-9]+$ ]]; then
  echo "error: the PR number must be digits, not '$pr'" >&2
  exit 2
fi
for file in "$@"; do
  if [ ! -f "$file" ]; then
    echo "error: no file at $file" >&2
    exit 2
  fi
done

url=$(git config --get "remote.$remote.url")
slug=$(sed -E 's#^(git@[^:]+:|ssh://git@[^/]+/|https?://[^/]+/)##; s#\.git$##' <<<"$url")

index=$(mktemp)
tip_ref="refs/upload-pr-screenshots/$$"
trap 'rm -f "$index"; git update-ref -d "$tip_ref" 2>/dev/null || true' EXIT

for attempt in $(seq 10); do
  parent=""
  if git fetch -q "$remote" "+refs/heads/$branch:$tip_ref" 2>/dev/null; then
    parent=$(git rev-parse "$tip_ref")
  fi

  rm -f "$index"
  if [ -n "$parent" ]; then
    GIT_INDEX_FILE=$index git read-tree "$parent"
  else
    GIT_INDEX_FILE=$index git read-tree --empty
  fi
  for file in "$@"; do
    blob=$(git hash-object -w "$file")
    GIT_INDEX_FILE=$index git update-index --add --cacheinfo "100644,$blob,pr-$pr/$(basename "$file")"
  done
  tree=$(GIT_INDEX_FILE=$index git write-tree)
  if [ -n "$parent" ]; then
    commit=$(git commit-tree "$tree" -p "$parent" -m "screenshots: PR #$pr")
  else
    commit=$(git commit-tree "$tree" -m "screenshots: PR #$pr")
  fi

  if git push -q "$remote" "$commit:refs/heads/$branch" 2>/dev/null; then
    for file in "$@"; do
      name=$(basename "$file")
      echo "![${name%.*}](https://github.com/$slug/blob/$commit/pr-$pr/$name?raw=true)"
    done
    exit 0
  fi
  sleep "$((RANDOM % attempt)).$((RANDOM % 10))"
done

echo "error: the push to $branch failed 10 times. Examine the remote, then run the script again." >&2
exit 1
