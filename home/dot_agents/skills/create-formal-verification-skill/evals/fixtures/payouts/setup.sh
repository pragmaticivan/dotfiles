#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME=Dev GIT_AUTHOR_EMAIL=dev@example.com GIT_COMMITTER_NAME=Dev GIT_COMMITTER_EMAIL=dev@example.com
export GIT_AUTHOR_DATE="2026-09-01T10:00:00Z" GIT_COMMITTER_DATE="2026-09-01T10:00:00Z"
git init -q -b main
git add -A
git commit -q -m "Add payout worker"
