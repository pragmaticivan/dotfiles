#!/usr/bin/env bash
set -e
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"
git init -q -b main
cp public/app.js app.js.current
sed -e 's/dataset\.taskId/dataset.id/' -e 's/data-task-id/data-id/' app.js.current > public/app.js
GIT_AUTHOR_DATE="2026-09-28T10:00:00Z" GIT_COMMITTER_DATE="2026-09-28T10:00:00Z" \
  git add package.json server.mjs public && git commit -q -m "feat: tasks page with mark complete"
mv app.js.current public/app.js
git add public/app.js
GIT_AUTHOR_DATE="2026-10-06T15:30:00Z" GIT_COMMITTER_DATE="2026-10-06T15:30:00Z" \
  git commit -q -m "refactor: rename task row data attribute to data-task-id"
