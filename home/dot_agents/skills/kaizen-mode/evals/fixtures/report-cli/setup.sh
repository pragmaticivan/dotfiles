#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Lee Moreau" GIT_AUTHOR_EMAIL="lee@example.com"
export GIT_COMMITTER_NAME="Lee Moreau" GIT_COMMITTER_EMAIL="lee@example.com"
export GIT_AUTHOR_DATE="2026-08-03T11:00:00Z" GIT_COMMITTER_DATE="2026-08-03T11:00:00Z"
git init -q -b main
git add README.md package.json cli data scripts
git -c commit.gpgsign=false commit -q -m "feat: add usage report command"
