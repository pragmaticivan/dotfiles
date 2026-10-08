#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Lee Park" GIT_AUTHOR_EMAIL="lee@example.com"
export GIT_COMMITTER_NAME="Lee Park" GIT_COMMITTER_EMAIL="lee@example.com"
commit() {
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}

git init -q -b main
mkdir -p migrations app

cat > migrations/0041_create_leads.sql <<'SQL'
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  score INTEGER,
  legacy_score INTEGER
);
SQL

cat > app/leads.py <<'PY'
def lead_row(lead):
    return {"id": lead.id, "email": lead.email, "score": lead.score}
PY

git add .
commit "2026-08-01T10:00:00Z" "feat: add leads table"

git checkout -q -b drop-legacy-score
cat > migrations/0042_drop_legacy_score.sql <<'SQL'
ALTER TABLE leads DROP COLUMN legacy_score;
SQL
git add .
commit "2026-10-06T15:00:00Z" "chore: drop unused leads.legacy_score column"
