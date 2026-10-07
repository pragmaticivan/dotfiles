#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@billing.example"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@billing.example"
git init -q -b main
printf 'setup.sh\n' >> .git/info/exclude
git add -A
GIT_AUTHOR_DATE="2026-08-03T10:00:00Z" GIT_COMMITTER_DATE="2026-08-03T10:00:00Z" \
  git commit -q -m "feat: billing event handlers on queue.publish"
git checkout -q -b chore/eventbus-migration
