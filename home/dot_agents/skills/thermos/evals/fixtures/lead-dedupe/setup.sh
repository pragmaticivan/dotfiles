#!/usr/bin/env bash
set -euo pipefail

export GIT_AUTHOR_NAME="Ivy Chen" GIT_AUTHOR_EMAIL="ivy.chen@example.com"
export GIT_COMMITTER_NAME="Ivy Chen" GIT_COMMITTER_EMAIL="ivy.chen@example.com"

git init -q -b main
printf 'setup.sh\nhistory/\n' >> .git/info/exclude
git config user.name "Ivy Chen"
git config user.email "ivy.chen@example.com"

snapshot() {
  cp -R "history/$1/." .
  git add -A
  GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$3"
}

mkdir -p leads tests
touch leads/__init__.py tests/__init__.py
snapshot 1-main "2026-09-20T11:00:00-04:00" "feat(leads): dedupe inbound leads by email"

git checkout -q -b chore/bump-deps
snapshot 2-bump "2026-10-06T09:30:00-04:00" "chore(deps): bump requests to 2.32.3"

git checkout -q main
git checkout -q -b fix/lead-dedupe-phone
snapshot 3-phone "2026-10-07T10:12:00-04:00" "fix(leads): fall back to phone when a lead has no email"

git checkout -q main
snapshot 4-docs "2026-10-07T12:40:00-04:00" "docs: note pass-through for leads without contact info"

git checkout -q fix/lead-dedupe-phone
cp -R history/5-work/. .
git add leads/dedupe.py
rm -rf history
