#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"
commit() {
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}

git init -q -b main

cat > retry_config.py <<'PY'
PAYMENT_WEBHOOK_MAX_RETRIES = 3
PAYMENT_WEBHOOK_BACKOFF_SECONDS = 2.0
PY

git add retry_config.py
commit "2026-09-10T10:00:00Z" "feat: add payment webhook retry config"

git checkout -q -b PAY-812-webhook-retries
sed -i.bak 's/MAX_RETRIES = 3/MAX_RETRIES = 5/' retry_config.py
rm retry_config.py.bak
git add retry_config.py
commit "2026-09-12T15:00:00Z" "fix: raise payment webhook retry count"
