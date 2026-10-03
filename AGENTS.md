# Repository guide

This repository is the chezmoi source for Ivan's dotfiles. Edit the source files in this repository, not the installed files in `$HOME`.

## Find the source file

Use `chezmoi source-path <target>` to find the source for an installed file. Use `chezmoi target-path <source>` for the reverse lookup.

| Area | Source | Installed target |
| --- | --- | --- |
| OpenCode server configuration | `home/dot_config/opencode/modify_opencode.jsonc` | `~/.config/opencode/opencode.jsonc` |
| OpenCode CLI configuration | `home/dot_config/opencode/cli.json` | `~/.config/opencode/cli.json` |
| OpenCode plugins | `home/dot_config/opencode/plugins/` | `~/.config/opencode/plugins/` |
| OpenCode plugin dependencies | `home/dot_config/opencode/package.json` | `~/.config/opencode/package.json` |
| Pi configuration | `home/dot_pi/agent/` | `~/.pi/agent/` |
| Shared agent skills | `home/dot_agents/skills/` | `~/.agents/skills/` |
| Portable agent templates | `home/.chezmoitemplates/agents/` | Agent-specific directories |
| Install scripts | `home/.chezmoiscripts/` | Run by chezmoi |
| macOS packages | `home/Brewfile.tmpl` | `~/Brewfile` |
| Linux packages | `home/.chezmoidata/pkgs/` | Read by chezmoi templates |

Do not edit files in `~/.config/opencode`, `~/.pi`, or installed `node_modules`. Use those files only to inspect runtime state or installed APIs.

## Search the repository

Start with `git ls-files` or a search in the source area from the table. Do not start with a recursive search of the full repository.

Exclude `.worktrees/` from normal searches. A recursive search includes old copies of the repository and produces duplicate results.

Search installed packages only when the task depends on an installed API. Limit that search to the applicable package.

## Check the change

Run the smallest applicable check first.

| Change | Check |
| --- | --- |
| Shell, YAML, or templates | `make lint` |
| General chezmoi state | `chezmoi apply --dry-run` |
| OpenCode plugin | `chezmoi apply ~/.config/opencode && npm test --prefix ~/.config/opencode` |
| OpenCode worktree launcher | `bats tests/opencode2-worktree.bats` |
| Pi OpenCode interface | `node --test tests/pi-open-tui-statusline.test.ts` |
| Pi rewind behavior | `node --test tests/pi-rewind-*.test.ts` |

After an OpenCode change, use `opencode reload` when the command is sufficient. Restart the service only when the changed feature needs a restart.

## Use current documentation

OpenCode and Pi APIs change frequently. Do not infer their APIs from old session output or copied examples.

For OpenCode V2, use `https://opencode.ai/v2/docs/` and the installed type declarations. Do not use `https://opencode.ai/docs/`, which documents V1.

For Pi, use the installed package documentation and type declarations that match the active package version.

Treat `README.md` as setup documentation. Treat this file as the repository navigation reference.
