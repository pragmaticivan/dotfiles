#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"
git init -q -b main
git add -A -- . ':!setup.sh'
GIT_AUTHOR_DATE="2026-09-01T10:00:00Z" GIT_COMMITTER_DATE="2026-09-01T10:00:00Z" \
  git commit -q -m "feat: add cache with dependent index"
git checkout -q -b evict-dependents
python3 -c '
p = "src/cache.ts"
old = "    this.store.delete(key);\n  }\n\n  toJSON"
new = (
    "    this.store.delete(key);\n"
    "    const children = this.deps.get(key) ?? [];\n"
    "    for (const child of children) {\n"
    "      this.store.delete(child);\n"
    "    }\n"
    "    this.deps.delete(key);\n"
    "    // dependents are derived from the parent, so they are stale too\n"
    "  }\n\n  toJSON"
)
s = open(p).read()
assert s.count(old) == 1
open(p, "w").write(s.replace(old, new))
'
git add -A -- . ':!setup.sh'
GIT_AUTHOR_DATE="2026-10-05T15:30:00Z" GIT_COMMITTER_DATE="2026-10-05T15:30:00Z" \
  git commit -q -m "fix(cache): evict also clears dependent entries"
