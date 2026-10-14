#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"
export GIT_AUTHOR_DATE="2026-09-01T10:00:00Z" GIT_COMMITTER_DATE="2026-09-01T10:00:00Z"
git init -q -b main
git add -A -- . ':!setup.sh'
git commit -q -m "feat: pokedex list and csv export"
