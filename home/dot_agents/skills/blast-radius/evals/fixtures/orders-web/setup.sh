#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Sam Okafor" GIT_AUTHOR_EMAIL="sam@example.com"
export GIT_COMMITTER_NAME="Sam Okafor" GIT_COMMITTER_EMAIL="sam@example.com"
git init -q -b main
printf 'node_modules/\n' > .gitignore
git add -A -- . ':!setup.sh'
GIT_AUTHOR_DATE="2026-08-12T09:00:00Z" GIT_COMMITTER_DATE="2026-08-12T09:00:00Z" \
  git commit -q -m "feat: order export and nightly reconcile"
git checkout -q -b bump-datekit-3
python3 -c '
def sub(p, old, new):
    s = open(p).read()
    assert s.count(old) == 1, (p, old)
    open(p, "w").write(s.replace(old, new))
sub("package.json", "\"datekit\": \"2.30.0\"", "\"datekit\": \"3.0.0\"")
sub("src/invoice.ts", "import { parse, formatDay }", "import { parseDate, formatDay }")
sub("src/invoice.ts", "formatDay(parse(row.issued_at))", "formatDay(parseDate(row.issued_at))")
sub("src/dueDate.ts", "addDays(issued, termsDays)", "addDays(termsDays, issued)")
'
git add -A -- . ':!setup.sh'
GIT_AUTHOR_DATE="2026-10-06T16:20:00Z" GIT_COMMITTER_DATE="2026-10-06T16:20:00Z" \
  git commit -q -m "chore(deps): bump datekit to 3.0.0"
