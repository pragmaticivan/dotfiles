#!/usr/bin/env bash
#
# make-fixture.sh <fixture-name> [dest-dir]
#
# Builds a throwaway git repository containing an oversized feature branch, so
# the stacked-pr-split evals run against a real diff with known ground truth
# instead of a hand-waved description. Deterministic: no network, no clock in
# the content, no GitHub. Prints the repo path on stdout.
#
# Fixtures:
#   layered-feature    clean full-stack diff: 4 natural layers, one rename,
#                      lockfile churn. The happy path.
#   straddling-file    same shape, but internal/api/router.go carries BOTH a
#                      layer-1 concern and a layer-3 concern, so no file-level
#                      assignment splits it cleanly.
#   mostly-generated   ~2,900-line diff of which ~150 lines are real source;
#                      the rest is a regenerated lockfile and protobuf output.
#
# The fixture has NO remote, so evals exercise Phases 0-5 (preflight through
# build + verify). Phase 6+ needs a real GitHub repo with stacks enabled.

set -euo pipefail

FIXTURE="${1:-}"
DEST="${2:-/tmp/stacked-pr-split-fixtures/$FIXTURE}"

[[ -n "$FIXTURE" ]] || { echo "usage: make-fixture.sh <fixture-name> [dest-dir]" >&2; exit 1; }

rm -rf "$DEST"
mkdir -p "$DEST"
cd "$DEST"

git init -q -b main .
git config user.email eval@example.com
git config user.name "Eval Fixture"
git config commit.gpgsign false

# Repeatable filler that looks like real code rather than "line 1, line 2" —
# a diff of obvious junk invites different behavior than a plausible one.
gofill() { # gofill <count> <prefix>
  local n="$1" p="$2" i
  for ((i = 1; i <= n; i++)); do
    printf 'func %s%d(ctx context.Context, id string) error {\n\treturn nil\n}\n' "$p" "$i"
  done
}
tsfill() {
  local n="$1" p="$2" i
  for ((i = 1; i <= n; i++)); do
    printf 'export function %s%d(props: Props) {\n  return null;\n}\n' "$p" "$i"
  done
}

case "$FIXTURE" in

layered-feature|straddling-file)
  # ---------------- trunk ----------------
  mkdir -p db internal/store internal/auth internal/api web tests
  printf 'CREATE TABLE accounts (id TEXT PRIMARY KEY);\n' > db/schema.sql
  { echo 'package store'; echo; gofill 20 'Query'; } > internal/store/store.go
  { echo 'package auth'; echo; gofill 12 'LegacyVerify'; } > internal/auth/legacy_token.go
  { echo 'package api'; echo; echo 'func Register(mux *http.ServeMux) {'; echo '	mux.HandleFunc("/health", handleHealth)'; echo '}'; } > internal/api/router.go
  { echo 'export const version = 1;'; tsfill 10 'Widget'; } > web/app.tsx
  printf '{ "lockfileVersion": 3, "packages": {} }\n' > package-lock.json
  git add -A && git commit -qm "baseline"

  git checkout -q -b feat/user-auth

  # ---- layer 1 material: schema (foundation, no callers in-diff) ----
  cat > db/schema.sql <<'SQL'
CREATE TABLE accounts (id TEXT PRIMARY KEY);
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
SQL
  mkdir -p db/migrations
  { echo '-- migrate:up'; sed -n '2,20p' db/schema.sql; echo '-- migrate:down'; echo 'DROP TABLE sessions;'; echo 'DROP TABLE users;'; } > db/migrations/001_users_sessions.sql

  # ---- layer 2 material: store + token (depends on schema) ----
  { echo 'package store'; echo; gofill 20 'Query'; echo; echo '// SessionStore reads and writes the sessions table added in db/schema.sql.'; gofill 55 'Session'; } > internal/store/store.go
  git mv internal/auth/legacy_token.go internal/auth/token.go
  { echo 'package auth'; echo; echo '// Verify replaces LegacyVerify; see internal/store for session lookup.'; gofill 60 'Verify'; } > internal/auth/token.go

  # ---- layer 3 material: api handlers (depends on store + auth) ----
  { echo 'package api'; echo; echo 'import "context"'; echo; gofill 70 'HandleAuth'; } > internal/api/handlers_auth.go

  # ---- layer 4 material: ui + tests (depends on api) ----
  { echo 'export const version = 1;'; tsfill 10 'Widget'; echo; tsfill 45 'SignIn'; } > web/app.tsx
  { echo 'package tests'; echo; gofill 80 'TestAuthFlow'; } > tests/auth_flow_test.go

  # ---- generated churn that must not drive the split ----
  { echo '{ "lockfileVersion": 3, "packages": {'; for i in $(seq 1 300); do echo "  \"node_modules/pkg-$i\": { \"version\": \"1.0.$i\" },"; done; echo '  "": {} } }'; } > package-lock.json

  if [[ "$FIXTURE" == "straddling-file" ]]; then
    # router.go now carries a LAYER-1 concern (wiring the store that layer 2
    # introduces is impossible, so wire the schema-level migration runner) AND a
    # LAYER-3 concern (the auth route that only exists after handlers land).
    # No file-level assignment puts this file in one layer honestly.
    cat > internal/api/router.go <<'GO'
package api

// RunMigrations belongs with the schema layer: it is the only caller of the
// migration files and does not depend on the store or on auth.
func RunMigrations(dir string) error {
	return nil
}

func Register(mux *http.ServeMux) {
	mux.HandleFunc("/health", handleHealth)
	// This route depends on handlers_auth.go, three layers up.
	mux.HandleFunc("/auth/session", HandleAuth1)
}
GO
  fi

  git add -A && git commit -qm "Add user authentication end to end"
  ;;

mostly-generated)
  mkdir -p internal/api/gen internal/billing
  printf 'package billing\n\nfunc Total() int { return 0 }\n' > internal/billing/total.go
  printf '{ "lockfileVersion": 3, "packages": {} }\n' > package-lock.json
  printf '// Code generated by protoc-gen-go. DO NOT EDIT.\npackage gen\n' > internal/api/gen/service.pb.go
  git add -A && git commit -qm "baseline"

  git checkout -q -b chore/regen-deps

  # ~150 lines of real, reviewable change.
  { echo 'package billing'; echo; echo '// Total now applies proration.'; gofill 48 'Prorate'; } > internal/billing/total.go

  # ~2,750 lines of regenerated output that costs no review attention.
  { echo '{ "lockfileVersion": 3, "packages": {'; for i in $(seq 1 800); do echo "  \"node_modules/dep-$i\": { \"version\": \"2.0.$i\", \"resolved\": \"https://registry.npmjs.org/dep-$i\" },"; done; echo '  "": {} } }'; } > package-lock.json
  { echo '// Code generated by protoc-gen-go. DO NOT EDIT.'; echo 'package gen'; echo; gofill 320 'GeneratedAccessor'; } > internal/api/gen/service.pb.go

  git add -A && git commit -qm "Regenerate deps and protobufs, add proration"
  ;;

*)
  echo "unknown fixture: $FIXTURE" >&2
  echo "known: layered-feature straddling-file mostly-generated" >&2
  exit 1
  ;;
esac

git checkout -q "$(git branch --show-current)"
printf '%s\n' "$DEST"
