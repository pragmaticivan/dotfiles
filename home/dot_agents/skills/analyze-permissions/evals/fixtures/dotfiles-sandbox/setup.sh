#!/usr/bin/env bash
set -euo pipefail

mkdir -p src/dot_claude home/.claude
: > chezmoi.toml

cat > src/dot_claude/modify_settings.json <<'SCRIPT'
#!/usr/bin/env bash
# Merge the managed keys into the live ~/.claude/settings.json. Keys that
# Claude Code adds by itself stay. The managed keys always win.
set -euo pipefail
managed=$(
    cat <<'MANAGED_JSON'
{
  "permissions": {
    "defaultMode": "auto",
    "deny": [
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(kubectl:*)",
      "Bash(helm:*)",
      "Bash(aws:*)",
      "Bash(terraform:*)"
    ],
    "ask": [
      "Bash(docker rm:*)",
      "Bash(docker system prune:*)",
      "Bash(git push:*)"
    ],
    "allow": [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git commit:*)",
      "Bash(npm:*)",
      "Bash(gh pr list:*)",
      "Bash(gh pr diff:*)",
      "Bash(jq:*)"
    ]
  }
}
MANAGED_JSON
)

current=$(cat)
if ! printf '%s' "$current" | jq -e . >/dev/null 2>&1; then
    current='{}'
fi
jq -n --argjson cur "$current" --argjson man "$managed" '$cur + $man'
SCRIPT

cat > home/.claude/settings.json <<'JSON'
{
  "model": "opus",
  "permissions": {
    "defaultMode": "auto",
    "allow": ["Bash(git status:*)"]
  }
}
JSON

home=$PWD/home
chezmoi --config "$PWD/chezmoi.toml" --source "$PWD/src" --destination "$home" \
    cat "$home/.claude/settings.json" > "$home/.claude/settings.json.new"
mv "$home/.claude/settings.json.new" "$home/.claude/settings.json"

git -C src init -q -b main
git -C src add -A
GIT_AUTHOR_NAME=Ivan GIT_AUTHOR_EMAIL=ivan@example.com GIT_AUTHOR_DATE=2026-09-01T10:00:00Z \
GIT_COMMITTER_NAME=Ivan GIT_COMMITTER_EMAIL=ivan@example.com GIT_COMMITTER_DATE=2026-09-01T10:00:00Z \
    git -C src commit -q -m "chore: add claude settings"
