#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
git config user.name "placeholder"
git config user.email "placeholder@example.com"
git config commit.gpgsign false

commit() {
  GIT_AUTHOR_NAME="$1" GIT_AUTHOR_EMAIL="$2" GIT_COMMITTER_NAME="$1" GIT_COMMITTER_EMAIL="$2" \
  GIT_AUTHOR_DATE="$3" GIT_COMMITTER_DATE="$3" git commit -q -m "$4"
}

src=legacy/billing/src/reconcileInvoices.py
final=$(cat "$src")
py2=${final/'    log.info("reconciled %d invoices", len(rows))'/'    print "reconciled %d invoices" % len(rows)'}
printf '%s\n' "$py2" > "$src"
git add legacy
commit "Greg Kowalski" "gkowalski@northwind.example" "2021-03-02T17:48:00-05:00" "Import billing from svn r4410

History before this point is not preserved."

printf '%s\n' "$final" > "$src"
git add legacy
commit "Dana Liu" "dana.liu@northwind.example" "2023-09-14T11:20:00-04:00" "py3: replace print statement with logging"
