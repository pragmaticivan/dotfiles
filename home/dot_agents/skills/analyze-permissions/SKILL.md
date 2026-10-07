---
name: analyze-permissions
description: "Audit accumulated Claude Code permissions, propose wildcard patterns, and apply the approved ones to the chezmoi-managed global settings. Use only for /analyze-permissions or when the user asks for this skill by name."
model: sonnet
---

# Analyze Claude Code Permissions

Analyze accumulated permissions in `settings.local.json` and suggest smart wildcard patterns to add to the global config.

Global settings on this machine are managed by **chezmoi**. `~/.claude/settings.json` is a generated copy: editing it directly is silently reverted on the next `chezmoi apply`. All global edits go to the chezmoi source file.

## Arguments (parsed from user input)

- **action**: What to do - `analyze` (default) or `apply`

Example invocations:

- `/analyze-permissions` → analyze and suggest patterns
- `/analyze-permissions apply` → apply approved patterns to the chezmoi source and run `chezmoi apply`

## Your Task

### Step 1: Locate and Read Current Permissions

1. Resolve the chezmoi source file (do not hardcode the path):

   ```bash
   chezmoi source-path ~/.claude/settings.json
   ```

   If the command fails, chezmoi is not managing the file — stop and tell the user. The result is one of two shapes:
   - A plain `dot_claude/settings.json`: the whole file is the JSON to read and edit.
   - A modify script such as `dot_claude/modify_settings.json.tmpl` (this machine): a shell script that merges a managed JSON object into the live file. The permissions sit in the JSON between the `MANAGED_JSON` heredoc markers. Read and edit only that block, and leave the script and any `{{ }}` template lines around it alone.

2. Read the permissions in that source file — this is the source of truth for global permissions (`permissions.allow`, `permissions.deny`, `permissions.ask`).
3. Read the project-local file: `<project-root>/.claude/settings.local.json` — accumulated "Always allow" entries. Per-project, **not** chezmoi-managed, edited in place.

The global file is shared across all projects and all machines that run this chezmoi config.

### Step 2: Analyze Patterns

For each entry in `settings.local.json`:

1. **Check if already covered** - Is there a wildcard in the global file that covers this?
   - `Bash(git commit -m "Fix bug")` is covered by `Bash(git commit:*)`
   - `Bash(npm run build)` is covered by `Bash(npm run:*)`

2. **Check against the global `deny` list first** - `deny` beats `allow`. The global config denies whole tool families on purpose (`sudo`, `curl`, `wget`, `ssh`, `kubectl`, `aws`, `terraform`, secret reads, …). Never suggest an `allow` pattern that a `deny` entry already blocks — it will not work, and loosening `deny` needs an explicit ask.

3. **Identify pattern opportunities** - Group similar commands:
   - Multiple `docker` commands → suggest `Bash(docker:*)`
   - Multiple `pnpm run` commands → suggest `Bash(pnpm run:*)`
   - Multiple WebFetch for same domain → suggest `WebFetch(domain:example.com)`

4. **Decide global vs local** - Where should the pattern live?
   - **Global (chezmoi source)**: General-purpose tools used across projects and worth syncing to every machine
   - **Local (`settings.local.json`)**: Project-specific commands, or write operations wanted only in that repo (e.g. `git push` for a personal repo)

5. **Assess safety** - Consider if the pattern is safe for auto-approval:
   - Read-only commands: Generally safe
   - Commands with side effects: Flag for review; prefer keeping them per-project in local settings
   - Overly broad patterns: Warn about security implications
   - Never suggest auto-approving `sudo`, permission-loosening patterns like `chmod 777`, or anything that could expose credentials or secrets

### Step 3: Present Analysis

Output a structured report:

```markdown
## Permission Analysis

### Settings Overview
- settings.local.json: X entries
- chezmoi source (`<path printed by chezmoi source-path>`): Y allow / Z deny entries

### Already Covered (can be removed)
These entries in settings.local.json are redundant:

| Entry | Covered by |
|-------|------------|
| Bash(git commit -m "...") | Bash(git commit:*) |

### Blocked by Global Deny
These entries can never take effect:

| Entry | Denied by |
|-------|-----------|
| Bash(kubectl get pods) | Bash(kubectl:*) |

### Suggested New Patterns
These patterns would consolidate multiple specific entries:

| Pattern | Covers | Target | Safety |
|---------|--------|--------|--------|
| Bash(docker:*) | 4 entries | global | ⚠️ Review (can modify) |
| Bash(pnpm run:*) | 3 entries | local | ✅ Safe |

### Uncategorized
These entries don't fit a pattern (one-offs):

- Bash(some-specific-command)
```

### Step 4: Handle Actions

**analyze (default):**

- Present the report. Change nothing. Ask if the user wants to apply.

**apply:**

1. Confirm each suggested pattern with the user before writing it.
2. Add global patterns to `permissions.allow` in the **chezmoi source file** resolved in Step 1 (inside the `MANAGED_JSON` block for a modify script). Keep the existing formatting (2-space indent, one entry per line) and append near related entries.
3. Validate the JSON that the source produces before applying. `chezmoi cat` renders the template or runs the modify script, thus this check works for both shapes. Running `jq` on the source file itself fails for a script or a template.

   ```bash
   chezmoi cat ~/.claude/settings.json | jq -e .permissions >/dev/null && echo valid
   ```

   If this fails, fix the JSON before continuing (a trailing comma is the usual cause). A broken settings.json makes Claude Code fall back to defaults.
4. Show the pending change, then apply it to the home directory:

   ```bash
   chezmoi diff ~/.claude/settings.json
   chezmoi apply ~/.claude/settings.json
   ```

5. Verify `chezmoi status ~/.claude/settings.json` prints nothing (source and target in sync).
6. Remove the now-redundant entries from the project's `settings.local.json` directly (that file is not chezmoi-managed).
7. Tell the user the chezmoi repo now has an uncommitted change. Do not commit unless asked.

### Notes

- Restart Claude Code (or start a new session) for global permission changes to take effect.
- `settings.json` also accumulates "don't ask again" entries written by Claude Code itself. Those land in `~/.claude/settings.json`, which chezmoi will overwrite — check `chezmoi diff ~/.claude/settings.json` for entries worth promoting into the source file before they are lost.
