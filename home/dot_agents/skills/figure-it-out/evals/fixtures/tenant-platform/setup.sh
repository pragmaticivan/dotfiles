#!/usr/bin/env bash
set -e
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com" GIT_AUTHOR_DATE="2026-09-14T10:00:00Z"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com" GIT_COMMITTER_DATE="2026-09-14T10:00:00Z"
git init -q -b main
git add -A -- . ':!setup.sh'
git commit -q -m "feat: gateway and job workers"
