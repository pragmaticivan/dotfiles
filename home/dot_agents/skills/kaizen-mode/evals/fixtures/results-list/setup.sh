#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Sam Okafor" GIT_AUTHOR_EMAIL="sam@example.com"
export GIT_COMMITTER_NAME="Sam Okafor" GIT_COMMITTER_EMAIL="sam@example.com"
export GIT_AUTHOR_DATE="2026-09-30T09:00:00Z" GIT_COMMITTER_DATE="2026-09-30T09:00:00Z"
git init -q -b main
mkdir -p .git/pending
mv src/hooks src/ResultsList.jsx .git/pending/
mv base/src/ResultsList.jsx src/ResultsList.jsx
rm -r base
git add -A package.json src
git -c commit.gpgsign=false commit -q -m "feat: list search results with paging"
git checkout -q -b refactor/use-pagination
rm src/ResultsList.jsx
mv .git/pending/hooks .git/pending/ResultsList.jsx src/
rmdir .git/pending
git add -A package.json src
