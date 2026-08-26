### Opening a PR

Invoked at the end of every other playbook.

**Worktree.** Work from a git worktree off main; subagents inherit it. Multiple `Agent` calls on the same branch each get their own worktree, or `git fetch && git reset --hard origin/<branch>` between them. Dirty branch with unrelated work: patch out, fresh worktree, apply. Snarled worktree: reset from main, redo minimally.

**Commits.** Commit liberally; rebase into small, ordered commits before opening PRs. Each commit is a future PR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit; new commit when separable.

**PRs.** `/stop-slop` the diff before commit; `/no-comments` the diff before review; apply the **stop-slop** skill to the PR description and commit bodies. Small PRs, 5 narrow over 1 fat; stack follow-ups, branch off main only for genuinely independent work. For stacked PRs, use whatever stacking tool your team uses; the principle is small, ordered slices with the stack visible to reviewers. `gh pr view <number>` before referencing PR status. Rebase on `main` before substantial stack work. No `## Summary` / `## Test plan` boilerplate on small PRs; commit bodies don't restate the subject. After opening, run the **Babysit** playbook (`babysit.md`); push back when feedback drifts from intent.

**Sizing.** "Small" has a number. About 100 changed lines reviews in one sitting. About 300 is acceptable for a single logical change. About 1000 is too large, so split it. One change is one self-contained modification that addresses one thing, carries its tests, and leaves the system working. Complete file deletions and mechanical refactors can run larger, because the reviewer verifies intent rather than every line. Refactoring plus new behavior is two PRs.

Split a fat PR by stacking (sequential dependencies), by file group (different reviewers), horizontally (shared code and stubs first, then consumers), or vertically (smaller full-stack slices).

A subagent that opens a PR runs `interrogate`, `/stop-slop`, and `/no-comments`, returns the URL, and does NOT babysit. Return to the parent.
