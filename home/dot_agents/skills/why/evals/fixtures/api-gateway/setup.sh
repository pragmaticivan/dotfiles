#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
git config user.name "placeholder"
git config user.email "placeholder@example.com"
git config commit.gpgsign false
echo "pr-exports/" >> .git/info/exclude

commit() {
  GIT_AUTHOR_NAME="$1" GIT_AUTHOR_EMAIL="$2" GIT_COMMITTER_NAME="$1" GIT_COMMITTER_EMAIL="$2" \
  GIT_AUTHOR_DATE="$3" GIT_COMMITTER_DATE="$3" git commit -q -m "$4"
}

limiter=packages/api/src/middleware/rateLimiter.js
final=$(cat "$limiter")
test_file=$(cat packages/api/test/rateLimiter.test.js)
rm -r packages/api/test

printf '%s\n' "${final/RATE_LIMIT_MAX = 42;/RATE_LIMIT_MAX = 100;}" > "$limiter"
git add packages
commit "Lena Fischer" "lena.fischer@acme.example" "2023-04-11T11:00:00+02:00" "feat(api): add per-key rate limiter (#41)"

printf '%s\n' "${final/RATE_LIMIT_MAX = 42;/RATE_LIMIT_MAX = 50;}" > "$limiter"
git add packages
commit "Lena Fischer" "lena.fischer@acme.example" "2023-08-29T15:30:00+02:00" "fix(api): lower rate limit to 50/min (#63)"

printf '%s\n' "$final" > "$limiter"
mkdir -p packages/api/test
printf '%s\n' "$test_file" > packages/api/test/rateLimiter.test.js
git add packages
commit "Tom Becker" "tom.becker@acme.example" "2024-01-16T10:45:00+01:00" "chore(api): tune rate limiter after load test (#87)

See thread in #api-perf."
