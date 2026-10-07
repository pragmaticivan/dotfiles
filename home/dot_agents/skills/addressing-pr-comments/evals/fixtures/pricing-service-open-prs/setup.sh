#!/usr/bin/env bash
set -euo pipefail
cd pricing-service
export GIT_AUTHOR_NAME="Jamie Lee" GIT_AUTHOR_EMAIL="jlee@everquote.com"
export GIT_COMMITTER_NAME="Jamie Lee" GIT_COMMITTER_EMAIL="jlee@everquote.com"
git init -q -b main
git add README.md
GIT_AUTHOR_DATE="2026-09-28T10:00:00Z" GIT_COMMITTER_DATE="2026-09-28T10:00:00Z" git commit -q -m "chore: initial pricing-service layout"
git checkout -q -b fix/quote-rounding main
printf '\nPremiums round half-up to the cent.\n' >> README.md
git add README.md
GIT_AUTHOR_DATE="2026-10-02T10:00:00Z" GIT_COMMITTER_DATE="2026-10-02T10:00:00Z" git commit -q -m "fix: round premiums half-up to the cent"
git checkout -q -b chore/bump-requests main
printf 'requests==2.32.3\n' > requirements.txt
git add requirements.txt
GIT_AUTHOR_DATE="2026-10-03T10:00:00Z" GIT_COMMITTER_DATE="2026-10-03T10:00:00Z" git commit -q -m "chore: bump requests to 2.32.3"
git checkout -q -b feat/quote-api-retries main
git add retry_client.py test_retry_client.py
GIT_AUTHOR_DATE="2026-10-05T14:00:00Z" GIT_COMMITTER_DATE="2026-10-05T14:00:00Z" git commit -q -m "feat: retry quote API calls with exponential backoff"
git remote add origin https://github.com/everquote/pricing-service.git
