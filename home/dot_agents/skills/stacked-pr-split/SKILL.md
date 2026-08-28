---
name: stacked-pr-split
description: 'Split one oversized pull request or branch into a chain of small, dependent pull requests using GitHub''s native stacked pull requests (the `gh stack` CLI extension, public preview). Analyzes the diff into a reviewer-weighted budget, proposes a dependency-ordered layer plan for approval, builds each layer as a provably lossless cumulative snapshot, submits the linked stack, and carries the original PR''s review threads over to the right layer. Trigger for: stacked PRs, stacked pull requests, stacked diffs, gh stack, gh-stack, split this PR, split my branch, break up this PR, make this PR smaller, this PR is too big, PR too large to review, stack of PRs, dependent pull requests, restack, retarget PR base, gh stack submit, gh stack merge. Implicit queries: ''reviewers say this PR is unreviewable'', ''can you break this branch into reviewable chunks'', ''how do I ship this feature in layers'', ''turn my existing PR into a stack'', ''this diff is 2000 lines and nobody will review it''.'
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(git:*), Bash(gh:*), Bash(jq:*), Bash(bash:*), AskUserQuestion
---

# Split a PR into a native GitHub stack

Take one large pull request (or an unpushed branch) and turn it into a **stack**: a chain of small pull requests where the bottom targets the trunk and each one above targets the branch below it. GitHub links them into a first-class stack object, so branch protection and CI are evaluated for every layer against the *stack base*, and the whole stack merges bottom-up atomically.

```text
   ┌── auth/4-ui       → PR #418 (base: auth/3-api)    ← top
  ┌── auth/3-api       → PR #417 (base: auth/2-core)
 ┌── auth/2-core       → PR #416 (base: auth/1-schema)
┌── auth/1-schema      → PR #415 (base: main)          ← bottom
main (trunk)
```

**Why the work is worth it:** review quality collapses with diff size. A 300-line PR gets architectural feedback; a 2,000-line PR gets skimmed. Splitting does not reduce the total code — it converts one unreviewable artifact into several reviewable ones.

**The one invariant that makes this safe:** each layer branch holds the *cumulative* final content of layers 1..k, so the top layer's tree is byte-identical to the original branch. `build-stack.sh` refuses to finish unless `git diff <top-layer> <original-branch>` is empty. If that gate passes, nothing was dropped, duplicated, or mangled — you never have to eyeball a rebase to trust the split.

Announce at the start: *"Using the stacked-pr-split skill — I'll analyze the diff, propose a layer plan for your approval, then build and submit the stack."*

## Two things to read when you need them

- `references/layer-design.md` — how to choose layer boundaries: dependency ordering, the self-containment rule, size targets, and the PR-body template. **Read this before designing a plan** (Phase 3); it is the judgment-heavy part.
- `references/gh-stack-invariants.md` — the `gh stack` command surface, non-interactive rules, exit codes, and platform limits. **Read this before running any `gh stack` command** (Phase 6+).

---

## Phase 0 — Preflight

Never start building on a machine that can't finish. Run these together and report the results as a short checklist.

```bash
gh --version | head -1                       # need >= 2.90.0
git --version                                # need >= 2.20
gh auth status 2>&1 | head -3
gh stack --version 2>/dev/null || echo "MISSING: gh extension install github/gh-stack"
git status --porcelain                       # must be empty
git branch --show-current                    # must not be detached, must not be the trunk
gh repo view --json nameWithOwner,isFork,defaultBranchRef \
  --jq '{repo: .nameWithOwner, isFork, trunk: .defaultBranchRef.name}'
git remote | wc -l                           # >1 needs remote.pushDefault
```

Then probe whether stacks are actually available on the repository — this is the check most likely to end the run early, so do it before spending effort on analysis:

```bash
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh api "repos/$REPO/stacks" --jq 'length' && echo "stacks API reachable"
```

A `404`/`403` here, or exit code `9` from any later `gh stack` command, means **stacked pull requests are not enabled for this repository**. Stop and tell the user — they need it enabled (it is a public-preview feature). Offer the fallback: build the same chain of branches and open ordinary PRs with chained `--base` values, which reviewers can still read bottom-up but which GitHub will not treat as a stack (no stack map, no atomic `gh stack merge`, no stack-base rule evaluation).

Two blockers that cannot be worked around, so surface them immediately:

- **Forks.** Stacks cannot span forks. If the PR comes from a fork, the stack has to be built in the upstream repository.
- **GitHub Desktop.** Unsupported; the user needs CLI or web.

Finally, make `gh stack` safe to drive non-interactively — without these, commands hang on prompts:

```bash
git config rerere.enabled true                # else `init` may prompt
git config remote.pushDefault origin          # only if >1 remote
```

## Phase 1 — Ingest the thing being split

**From an open PR** (`/stacked-pr-split 412`, a URL, or "split PR 412"):

```bash
gh pr view 412 --json number,title,body,headRefName,baseRefName,url,isDraft,additions,deletions,changedFiles,reviewDecision
gh pr view 412 --json reviews --jq '.reviews[] | {author: .author.login, state}'
gh api "repos/$REPO/pulls/412/comments" --paginate \
  --jq '.[] | {id, path, line, user: .user.login, body: (.body[:200])}'
git fetch origin && git checkout <headRefName>
```

The PR's **own base** is the trunk for the stack — not necessarily the default branch. A PR targeting `release/24.3` produces a stack rooted on `release/24.3`.

**From the current local branch:** the trunk is the default branch unless the user says otherwise. There is no PR to migrate, so Phase 7 collapses to just creating the stack.

Record: `TRUNK`, `SOURCE` (head branch), `PR_NUMBER` (if any), and the review-comment list.

## Phase 2 — Measure

The two bundled scripts live alongside this file. Set the path once — you run from the user's repository, not from the skill directory:

```bash
SPLIT=~/.claude/skills/stacked-pr-split/scripts   # resolve the real path if the tilde isn't expanded

bash "$SPLIT/analyze-split.sh" "$TRUNK" "$SOURCE" > /tmp/analyze.json
jq '{weighted_review_lines, suggested_layer_count, split_recommended,
     groups: [.groups[] | select(.weighted > 0)], warnings}' /tmp/analyze.json
```

`weighted_review_lines` counts source at 1×, tests at 0.5×, and generated/vendored/lockfile content at 0× — because those are what actually consume reviewer attention. A 3,000-line diff that is 2,800 lines of regenerated lockfile does not need splitting, and a raw line count would tell you it does.

If `split_recommended` is `false` (under ~200 weighted lines), say so and ask whether to proceed anyway rather than splitting something that is already reviewable.

Read the full `files` array — you need per-file paths and sizes to design layers. Note `warnings`: a dirty tree blocks the build, and binary files can't be split below file granularity.

## Phase 3 — Design the layer plan

**Read `references/layer-design.md` now.** This is where the skill earns its keep, and it is genuinely hard: you are inferring a dependency DAG from a diff and then linearizing it.

The process, in brief:

1. **Find the dependency edges.** For each changed file, ask what other changed files it needs in order to make sense. Grep for the new symbols to find their callers within the diff.
2. **Pull pure refactors to the bottom.** Renames, moves, and interface extractions are often 20–30% of a diff at near-zero defect risk. As layer 1 they approve fast and shrink everything above.
3. **Linearize by dependency, foundation first.** Schema → shared types → core logic → API → UI → integration tests. A stack is strictly linear; if two chunks are genuinely independent, they still have to be ordered, so put the one with fewer dependents lower.
4. **Check each layer against the size budget** (~300 weighted lines, hard cap ~600) and against **self-containment**: a new definition should ship with at least one caller, or a contract test, or an explicit forward reference in the PR body.
5. **Verify file-level separability.** Every changed file must belong to exactly *one* layer. If one file carries changes for two layers (a router file that both wires layer 1 and adds a layer-3 route), you must either move a layer boundary, split the file, or accept the coarser layer. `build-stack.sh` rejects a plan that assigns a file twice — that is deliberate, not a limitation to route around.

Write the plan to `/tmp/plan.json`:

```json
{
  "trunk": "main",
  "source": "feat/big-auth",
  "layers": [
    { "branch": "auth/1-schema",
      "title": "Add users and sessions tables",
      "body": "## Stack position\n1 schema (this PR) → 2 core → 3 api → 4 ui\n\n## Intentionally missing\nNo callers yet; the session store lands in layer 2.",
      "files": ["db/schema.sql", "db/migrations/001_users.sql"] }
  ]
}
```

`title` becomes the PR title and `body` becomes the PR body — `gh stack submit --auto` derives both from a single-commit branch's commit message, and there is no flag to set them directly. Give every layer a stack-position header and an "Intentionally missing" note; without it reviewers file the deliberate gaps as bugs.

## Phase 4 — Get explicit approval (never skip)

Present the plan with `AskUserQuestion` before touching git. Show, per layer: branch name, title, weighted line count, file count, and what it depends on. Call out anything you had to compromise on — a layer over budget, a definition without a caller, a file you couldn't cleanly separate.

Offer: **execute** / **adjust boundaries** / **rename branches** / **cancel**.

The plan is a proposal about someone else's code architecture. Guessing wrong and building anyway costs them a pile of branches to clean up.

## Phase 5 — Build and verify the layers

```bash
bash "$SPLIT/build-stack.sh" /tmp/plan.json > /tmp/build.json
jq '{verified, layers, errors, backup_branch}' /tmp/build.json
```

The script validates the plan completely *before* any git operation (every changed file assigned exactly once, no invented paths, no duplicate branch names), snapshots `SOURCE` to `backup/<source>_<timestamp>`, builds each layer from the one below, and then enforces two gates: the top layer's tree matches `SOURCE` exactly, and parentage is strictly linear. On failure it rolls back the branches it created and keeps the backup.

If you hand-adjust a layer branch afterwards, re-run the gates before submitting — `bash "$SPLIT/build-stack.sh" --verify-only /tmp/plan.json`. This is only meaningful *before* the stack has PRs; once review feedback lands, the top layer intentionally diverges from the original branch and the losslessness gate no longer applies.

Commit hooks are skipped by default (`SPLIT_RUN_HOOKS=1` to run them) because intermediate layers are legitimately non-building — a definition can land one layer below its caller — and a pre-commit build hook would abort the run midway. Report this to the user; don't let it pass silently.

**Per-layer quality gate.** Now that the branches exist, check each one against the repo's own toolchain, bottom-up:

```bash
for b in $(jq -r '.layers[].branch' /tmp/plan.json); do
  git checkout -q "$b"
  echo "── $b"; <the repo's build/lint/test command> || echo "FAILS on $b"
done
```

A failing intermediate layer is not automatically wrong — it may be the self-containment tradeoff you already documented. But an *unexpected* failure means a dependency edge was missed, and the fix is to move a file down a layer, not to paper over it. Report which layers pass and which don't, with the reason.

## Phase 6 — Create the stack on GitHub

**Read `references/gh-stack-invariants.md` before this phase.** Every command must be non-interactive or it will hang.

```bash
BRANCHES=$(jq -r '.layers[].branch' /tmp/plan.json | tr '\n' ' ')
gh stack init --base "$TRUNK" $BRANCHES     # adopts the existing branches, in order
gh stack view --json | jq '{trunk, branches: [.branches[] | {name, needsRebase}]}'
gh stack submit --auto                       # pushes, opens PRs, links them as a stack
gh stack view --json | jq '[.branches[] | {name, pr: .pr.number, state: .pr.state}]'
```

`submit --auto` creates PRs as **drafts**. That is the right default here: keep them draft until the stack is reviewed, so nothing merges early and silently changes a downstream diff. Mark the bottom ready first, then work up as each is approved:

```bash
gh pr ready <bottom-pr-number>
```

Pass `--open` to `submit` only if the user explicitly wants every layer ready for review immediately.

If `needsRebase` is true on any branch, run `gh stack rebase && gh stack push` before submitting — GitHub will not merge a non-linear stack.

## Phase 7 — Hand off the original PR

Default behavior: **keep the original open as an umbrella, then close it only on explicit confirmation.** It carries the review history and the reviewers' attention; closing it silently loses both.

1. **Comment the stack map on the original**, so anyone watching it can find the new PRs:

```bash
gh pr comment "$PR_NUMBER" --body "$(cat <<'EOF'
This PR has been split into a stack of smaller PRs. Review bottom-up:

- #415 `auth/1-schema` — Add users and sessions tables (base: `main`)
- #416 `auth/2-core` — Session store and token validation
- #417 `auth/3-api` — Auth endpoints
- #418 `auth/4-ui` — Sign-in UI and integration tests

Full change for context: compare `auth/4-ui` against `main`.
EOF
)"
```

2. **Carry the open review threads to the layer that now owns the code.** Map each review comment's `path` to the layer holding that file, then post one summary comment per affected layer PR that quotes the thread and links to the original. Link rather than re-authoring inline — the words are someone else's, and a link preserves attribution and the original context.

```bash
jq -r --arg p "<path>" '.layers[] | select(.files[] == $p) | .branch' /tmp/plan.json
```

Tell the user explicitly if any thread has no home — e.g. it was on a line that no longer exists.

3. **Ask before closing.** Show what will happen, then:

```bash
gh pr close "$PR_NUMBER" --comment "Superseded by the stack above."
```

**Alternative — reuse the original PR as the top of the stack.** Because the top layer's content is identical to the original branch, the original PR can *become* the top PR instead of being closed, which keeps its review threads and CI history attached in place. Offer this when the PR already has substantial review discussion:

```bash
gh pr comment "$PR_NUMBER" --body "Retargeting this PR onto \`$SECOND_FROM_TOP\` as the top of a stack; inline comments on lines now owned by lower PRs may be marked outdated. Prior full diff: <permalink>."
gh pr edit "$PR_NUMBER" --base "$SECOND_FROM_TOP"
```

Comment *before* retargeting — retargeting can invalidate inline comments. This requires the original head branch to be the top layer, so name it accordingly in the plan.

## Phase 8 — Living with the stack

Hand the user the operations they will need, and use these yourself when they come back with review feedback.

| Situation | Do this |
|---|---|
| Review feedback on layer *k* | `gh stack checkout <branch>`, commit the fix **in that layer**, `gh stack rebase --upstack`, `gh stack push` |
| Trunk moved / stack not linear | `gh stack rebase && gh stack push` (not the web **Rebase stack** button if the repo requires signed commits — server-side rebases are unsigned) |
| Bottom PR merged | `gh stack sync --prune` |
| Merge the stack | `gh stack merge --yes` (`gh pr merge` does **not** work on stacks) |
| Merge only up to layer *k* | `gh stack merge <pr-number> --yes` |
| Restructure after review | `gh stack unstack`, fix branches, `gh stack init --base "$TRUNK" <branches>`, `gh stack submit --auto` |
| Clean up backups once merged | `git branch -D backup/<source>_<timestamp>` — only after the user confirms |

Never delete the backup branch on your own initiative. It is the only cheap way back if the split turns out wrong.

---

## Red flags — stop and reconsider

- Designing a plan without running `analyze-split.sh`. You'd be guessing at sizes.
- Any git operation before the user approves the plan.
- Working around the "file assigned to two layers" error by duplicating the file. The layer boundary is wrong; fix the boundary.
- Proceeding when `build-stack.sh` reports `verified: false`. The losslessness gate failing means the stack does not reproduce the original — there is nothing to salvage by pushing it.
- Closing or force-pushing the original PR's branch before the stack exists on GitHub and the user has confirmed.
- Splitting a diff that is mostly generated content. Check `excluded_lines` first.
- Building a stack in a fork, or without confirming stacks are enabled. Both fail at `submit`, after all the work.

## Common mistakes

- **Every PR targeting `main`.** That is not a stack — it is a set of growing snapshots, and each layer's incremental diff is lost the moment any of them merges.
- **No stack-position header in the PR body.** Reviewers flag intentional forward references as bugs.
- **Splitting tests away from the code they cover** to hit a line target. Tests count 0.5× precisely so they can ride along with their layer.
- **Interactive `gh stack` invocations.** `gh stack view` without `--json`, or `submit` without `--auto`, opens a TUI and hangs the session.
- **`git push --force`** instead of the `--force-with-lease` that `gh stack push` already uses.
- **Marking every layer ready for review at once.** A mid-stack PR merging early silently rewrites the diffs above it.

## Provenance

Layer-design heuristics, the reviewer-weighted budget, and the safety practices are adapted from the [`split-branch` skill](https://github.com/zpyoung/quirk/tree/main/skills/split-branch) (which builds stacks manually with `git rebase --onto`). This skill retargets that thinking at GitHub's native stacked pull requests and replaces the rebase-based extraction with a verifiable cumulative-snapshot build. `gh stack` behavior is drawn from [GitHub's stacked pull requests docs](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs) and the official [`gh-stack` skill](https://github.com/github/gh-stack/blob/main/skills/gh-stack/SKILL.md), which is complementary — install it (`gh skill install github/gh-stack`) for deeper `gh stack` coverage, though this skill does not require it.
