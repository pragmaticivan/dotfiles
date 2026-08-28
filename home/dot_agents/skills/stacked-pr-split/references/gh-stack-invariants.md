# `gh stack` invariants

Everything here is what this skill needs in order to drive `gh stack` without hanging or corrupting a stack. Stacked pull requests are a **public-preview** feature; behavior can change. Authoritative sources: [GitHub's stacked PR docs](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs) and the official [`gh-stack` skill](https://github.com/github/gh-stack/blob/main/skills/gh-stack/SKILL.md).

## Contents

- [Setup](#setup)
- [Non-interactive rules](#non-interactive-rules)
- [Commands this skill uses](#commands-this-skill-uses)
- [Exit codes](#exit-codes)
- [How GitHub evaluates a stack](#how-github-evaluates-a-stack)
- [Merging](#merging)
- [Platform limits](#platform-limits)

## Setup

```bash
gh extension install github/gh-stack     # needs gh >= 2.90.0, git >= 2.20
git config rerere.enabled true           # else `init` may prompt for confirmation
git config remote.pushDefault origin     # only if the repo has >1 remote
```

GitHub also ships an optional agent skill covering `gh stack` in more depth (`gh skill install github/gh-stack`). This skill does not depend on it.

With more than one remote and no `remote.pushDefault`, `checkout` and `trunk` fail in non-interactive mode — they have **no `--remote` flag**. `push`, `submit`, `sync`, `rebase`, and `link` do.

## Non-interactive rules

Every one of these opens a TUI or a prompt that will hang the session:

| Never | Always |
|---|---|
| `gh stack view` | `gh stack view --json` |
| `gh stack submit` | `gh stack submit --auto` |
| `gh stack init` (no args) | `gh stack init <branches...>` |
| `gh stack add` (no arg) | `gh stack add <branch>` |
| `gh stack checkout` (no arg) | `gh stack checkout <stack-no \| pr-no \| branch>` |
| `gh stack merge` (relying on prompts) | `gh stack merge --yes` |
| `gh stack modify` | not usable by agents at all — use `unstack` + `init` |

`gh stack checkout <pr-number>` also prompts unbypassably when a *different* local stack already tracks those branches. Run `gh stack unstack --local` first (which leaves the stack on GitHub intact), then retry.

Status messages go to **stderr** with `✓ ✗ ⚠ ℹ` prefixes; data goes to **stdout**. Pipe with `2>/dev/null` when you only want the JSON.

## Commands this skill uses

### `gh stack init --base <trunk> <branches...>`

Creates the stack locally, bottom-to-top in argument order. **Branches that already exist are adopted**, which is exactly how this skill hands off from `build-stack.sh`; missing branches would be created from the trunk. Branch names are used verbatim — slashes are kept, nothing is prefixed. Checks out the last branch listed. Enables `git rerere`.

### `gh stack submit --auto [--open]`

Pushes every branch (per-branch `--force-with-lease`, **not** atomic), creates a PR for each branch that lacks one with the base set to the branch below, then links them into a stack object on GitHub.

- Creates **drafts** by default. `--open` makes them ready for review.
- **PR title and body cannot be set by flag.** With `--auto`, a branch with a *single* commit uses the commit subject as the title and the commit body as the PR body (plus a footer). A branch with multiple commits gets a title humanized from the branch name. This is why `build-stack.sh` writes exactly one commit per layer with the intended title as its subject. Use `gh pr edit` afterwards to change either.
- If a later branch's push is rejected, earlier pushes and PR updates stand — fix the rejection and rerun the same command.
- If every PR in the stack is already merged, `submit` starts a *new* stack rooted at the trunk for the unmerged branches.

### `gh stack view --json`

```json
{ "trunk": "main", "currentBranch": "auth/2-api",
  "branches": [ { "name": "auth/1-schema", "head": "...", "base": "...",
                  "isCurrent": false, "isMerged": false, "isQueued": false,
                  "needsRebase": false,
                  "pr": { "number": 415, "url": "...", "state": "OPEN" } } ] }
```

`state` is `OPEN`, `MERGED`, or `QUEUED`; `pr` is absent when no PR exists. `needsRebase` means the base is not an ancestor — non-linear, and therefore unmergeable.

Useful probes:

```bash
gh stack view --json | jq '[.branches[] | select(.needsRebase)] | length'
gh stack view --json | jq -r '.branches[] | select(.pr.state=="OPEN") | .pr.url'
gh stack view --json | jq '[.branches[].isMerged] | all'
```

### `gh stack rebase [--upstack|--downstack|--no-trunk] [--continue|--abort]`

Fetches, then cascade-rebases each branch onto the one below, bottom-up. Handles a squash-merged lower PR automatically via `--onto`. On conflict it stops with exit code 3 and lists the conflicted files: resolve, `git add`, then `--continue`; or `--abort` to restore every branch. Follow with `gh stack push`.

`--upstack` (current branch and above) is the one to use after fixing review feedback in a lower layer.

### `gh stack push`

Pushes active (non-merged, non-queued) branches with per-branch `--force-with-lease`. Non-atomic. Does not touch PRs.

### `gh stack sync [--prune]`

Fetch → reconcile the remote stack → fast-forward trunk → cascade rebase (only if trunk moved) → push → sync PR state → link the stack → prune. Safe in automation for the clean remote-ahead case. On conflict it restores everything and exits 3. If local and remote stacks have genuinely **diverged**, a non-interactive run aborts without pushing (exiting successfully, with `ℹ Sync aborted`) — resolve by unstacking and recreating. `--prune` deletes local branches for merged PRs; in non-interactive runs pruning happens *only* with the flag.

### `gh stack unstack [<stack-number>] [--local]`

Removes the stack grouping. **Never deletes PRs or branches.** `--local` removes only local tracking and never contacts GitHub. Merged and queued PRs cannot be removed from a stack and remain in it. This plus `init` is the agent-safe way to restructure, since `gh stack modify` is interactive-only.

### `gh stack merge [<stack-no>|<pr-no>] --yes [--squash|--rebase|--merge]`

See [Merging](#merging).

## Exit codes

| Code | Meaning | Response |
|---|---|---|
| 0 | Success | — |
| 1 | Generic error | Read stderr |
| 2 | Not in a stack / stack not found | `gh stack init` first |
| 3 | Rebase conflict | Resolve, `git add`, `gh stack rebase --continue` |
| 4 | GitHub API failure | Check `gh auth status`, retry |
| 5 | Invalid arguments | Fix the invocation |
| 6 | Disambiguation required | Branch belongs to multiple stacks; check out a non-shared branch |
| 7 | Rebase already in progress | `--continue` or `--abort` |
| 8 | Stack locked by another process | Wait — the lock times out after ~5s |
| 9 | **Stacked PRs not enabled for this repo** | Stop; the user must get the feature enabled |
| 10 | Interrupted `modify` session | `gh stack modify --abort` |

## How GitHub evaluates a stack

Every PR in the stack is evaluated against the rules of the **stack base** (the bottom PR's base branch), not the branch it directly targets. This is the property that makes stacks trustworthy, and it has real consequences:

- Required reviews, required status checks, CODEOWNERS, and code-scanning workflows all apply to **mid-stack PRs too**.
- A workflow triggered by `pull_request` events on `main` runs for **every** PR in the stack. No workflow changes are needed — but CI cost multiplies by the number of layers.
- Stack metadata is exposed to workflows as `github.event.pull_request.stack`, present only when the PR is in a stack. Use it to skip redundant jobs.
- The trunk does not have to be the default branch; a stack can be rooted on a release branch via `init --base`.

A PR can merge only when it **and every PR below it** satisfy those requirements, and the stack has **fully linear history**.

## Merging

- `gh pr merge` **does not work** on stacked PRs. Use `gh stack merge`.
- Merges are **bottom-up and atomic**: merging PR *k* merges everything below it in one all-or-nothing operation. If any PR in the selection can't merge, none do.
- PRs above the merge point stay open and are **automatically re-targeted** to the stack's base.
- Only basic state is checked before the merge (open, not draft); GitHub evaluates protections when the merge runs. **Merge requirements cannot be bypassed for stacks.**
- All three merge methods work. Squash produces one commit per PR; the resulting history matches merging each PR individually from the bottom.
- **Merge queues** are supported: the whole stack enters the queue in order, the queue picks the method (any method flag you pass is ignored with a warning), and the stack may land across consecutive merge groups. If a PR is ejected from the queue, everything above it is ejected too.

Restoring linear history after trunk moves: `gh stack rebase && gh stack push`, or the **Rebase stack** button in the merge box. **The web button's commits are unsigned** — if the repo requires signed commits, always rebase from the CLI so local signing config applies.

## Platform limits

- **No cross-fork stacks.** The branches must live in the same repository.
- **GitHub Desktop is unsupported.**
- **Strictly linear.** One parent, one child — no branching stacks. Independent workstreams need separate stacks.
- **Closing a mid-stack PR blocks everything above it.** The stack relationship persists; you must dissolve and recreate the stack to restructure.
- **Unstacking is partial.** It removes open, draft, and closed PRs from the stack; merged and queued PRs stay. The stack dissolves entirely only if none have merged.
- **Repository must have the feature enabled** — exit code 9 otherwise.

Programmatic access exists if you need it: the REST API exposes a `stack` object on pull request resources plus endpoints to list/create/extend/dissolve stacks (`gh api repos/{owner}/{repo}/stacks`), and GraphQL exposes read-only `stack`/`stackEntry` fields on `PullRequest`. Merging via the API requires the newer async merge endpoint.
