#!/usr/bin/env bash
set -euo pipefail
cd pricing-service
export GIT_AUTHOR_NAME="Jamie Lee" GIT_AUTHOR_EMAIL="jlee@everquote.com"
export GIT_COMMITTER_NAME="Jamie Lee" GIT_COMMITTER_EMAIL="jlee@everquote.com"
git init -q -b main
git add README.md
GIT_AUTHOR_DATE="2026-09-28T10:00:00Z" GIT_COMMITTER_DATE="2026-09-28T10:00:00Z" git commit -q -m "chore: initial pricing-service layout"
git checkout -q -b feat/quote-api-retries
git add retry_client.py test_retry_client.py
GIT_AUTHOR_DATE="2026-10-05T14:00:00Z" GIT_COMMITTER_DATE="2026-10-05T14:00:00Z" git commit -q -m "feat: retry quote API calls with exponential backoff"
git remote add origin https://github.com/everquote/pricing-service.git
