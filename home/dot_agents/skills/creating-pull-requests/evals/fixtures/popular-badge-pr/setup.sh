#!/usr/bin/env bash
set -e
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"
git init -q -b main
cp public/pricing.html pricing.html.new
cp public/styles.css styles.css.new
grep -v 'class="badge"' pricing.html.new >public/pricing.html
grep -v '^\.badge' styles.css.new | sed 's/ position: relative;//' >public/styles.css
GIT_AUTHOR_DATE="2026-10-01T10:00:00Z" GIT_COMMITTER_DATE="2026-10-01T10:00:00Z" \
  git add package.json server.mjs public && git commit -q -m "feat: pricing page"
git switch -q -c feat/popular-badge
mv pricing.html.new public/pricing.html
mv styles.css.new public/styles.css
GIT_AUTHOR_DATE="2026-10-09T15:00:00Z" GIT_COMMITTER_DATE="2026-10-09T15:00:00Z" \
  git commit -q -am "feat: mark the Pro plan as most popular"
git clone -q --bare . remote.git
printf 'remote.git/\nshots/\n' >>.git/info/exclude
git remote add origin git@github.com:acme/shop.git
git config url."$PWD/remote.git".insteadOf git@github.com:acme/shop.git
git fetch -q origin
git branch -q --set-upstream-to=origin/feat/popular-badge
