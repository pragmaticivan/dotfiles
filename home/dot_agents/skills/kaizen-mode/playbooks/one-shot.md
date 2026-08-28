### One-shot

**You own the whole chain. Plan, build, review, verify, and open the draft PR in one run, with no check-in.** For "one-shot this", "take it all the way", "build it and open the PR", "do the whole thing without asking me".

This playbook is the other playbooks in a fixed order. The one thing it adds is a stated gate between each pair of steps. Use it for one coherent change that a single owner can finish, when you have authority to push and to open a PR.

Route elsewhere when the shape differs. A queue of independent PRs is `autopilot-full.md`. A queue delivered as one reviewed stack is `autopilot-stack.md`. A loop against a metric or a predicate is `autonomous-run.md`. A large or cross-cutting effort is the **figure-it-out** skill. A standing multi-day program is `orchestrate.md`.

**Gate discipline.** Every step below ends in a gate. Read each gate as a predicate over an artifact you can see, never over a delegate's summary (the **prove-it-works** principle). A failed gate gets one bounded retry with the scope corrected and the inputs unchanged. A second failure is terminal. Stop, report which gate failed and the evidence you hold, and do not start the next step. A blocked stop is a result. Continuing past a red gate is the failure this playbook exists to prevent.

**Receipt.** Each delegate returns one. It names the changed files, the gate command and its output, the surface it verified on and the evidence, whether behavior changed, its blockers, and anything it declined to do. A receipt that reports a behavior change and no verification evidence fails the gate. "Done" is not a receipt.

**Git safety.** Commit before any destructive git command. Never run `git checkout --`, `git reset --hard`, `git stash drop`, or `git clean` while work sits uncommitted, because replaying it depends on your context surviving. Commit first, then revert the commit. Commit with the hooks armed. `--no-verify` is allowed in one case: a hook reformats parts of a file the change never touched, you already ran that hook yourself on exactly the changed paths, and you record the bypass in the decision trail. Any other `--no-verify` is a gate bypass.

0. **Open the progress list.** First item is to read the Principles section of the `kaizen-mode` skill in full. Then the ten steps below, copied verbatim, before any task-specific todo. A step you skip stays in the list as `skip: <reason>`.

   Use the host's todo tool when it has one. Some hosts ship no todo tool at all, so check once with `ToolSearch` for `TodoWrite` rather than assuming either way. When it is absent, the progress list is a `## Run checklist` of `- [ ]` boxes at the top of the plan file from step 1, ticked as each gate passes. The plan file is already a checklist, so this costs nothing.

   Also start a decision trail via the **show-me-your-work** skill, one row per gate verdict. The trail is in addition to the progress list, never instead of it. The progress list is how the human reads progress, and the trail is how the human audits it afterward. A run with only the trail has no progress surface, and a run with only the list leaves no record.

   Gate: a progress list exists in one of those two forms and holds all ten steps.

1. **Plan.** Write the single-PR shape of the skeleton in `multi-phase-plan.md`, one `## <task>` section with its evidence boxes. Author its content per `../references/plan.md`, which owns phase sizing, data structures, and verification-per-phase, except that file's step 7, which hands back to the user. This playbook overrides that step, because the run continues into step 2 without a check-in.

   The triage rules the plan out only for a change of one or two files with an obvious approach. Both halves must hold. Count the files first and put the count in the skip reason. An obvious approach across six files is not a triage skip. Phases written in chat are not a written plan, because they do not survive compaction, and a hands-off run is exactly where compaction happens unattended.

   Gate: `node ~/.claude/skills/kaizen-mode/scripts/check-plan.mjs --single <plan.md>` exits 0. Fix every line it prints rather than arguing with it (the **encode-lessons-in-structure** principle). Or a recorded skip that states the file count and why the approach is obvious. An open question inside the plan means the plan is not implementable. Resolve it per `../references/plan.md` step 2, or put it out of scope and say so. Write no product code in this step.

2. **Build.** Run `feature.md`, and hold its three load-bearing steps as their own todo items, because a pointer to another playbook does not keep them in view.

   1. **`how`** over each affected subsystem before changing it.
   2. **`architect`** for parallel design exploration. A skip stays as `architect skipped: <reason>` in the todolist and the trail.
   3. **Delegate the code-writing** to a subagent with a named scope and success criteria, then review its diff yourself. `feature.md` step 4 marks this mandatory with no skip-with-reason escape, and the **laziness-protocol** does not override it. The gain is review separation, not lines saved. Writing the code yourself means step 4 reviews your own work with no independent pass anywhere in the chain.

   Then `feature.md` steps 5 and 6: verify, and rebase into small ordered commits.

   Gate: one receipt per delegate, a green gate run (types, lint, project tests, and the repository's own validators), and a live VERIFIED verdict per step 6's rules on the surface the change touches. Prove the artifact works here, where you just built it, rather than saving the proof for later. A receipt you cannot match against the diff fails this gate.

3. **Simplify the diff.** Two skip conditions, and both are checkable: the diff touches only docs or markdown paths, or `git diff --shortstat` reports under 10 changed lines. Anything else runs the step. A skip needs its row in the todolist and the trail.

   Otherwise apply the **laziness-protocol** and **minimize-reader-load** principles to the diff you just produced, per `refactoring.md`. Commit it as its own behavior-preserving commit. Do not fold it into the feature commits, because a reviewer needs to read the two apart.

   Gate: the gate run from step 2 is still green, and no behavior changed.

4. **Self-review.** In one message, collect `git diff <base>...HEAD` with `Bash` and the changed-file contents with an `Explore` agent. Then spawn `thermo-nuclear-review-subagent` through the `Agent` tool, with the two labeled sections its definition names. Add `thermo-nuclear-code-quality-review-subagent` when the diff crosses a module boundary or runs past roughly 300 lines. This step prescribes its own subagent types, so the `kaizen-agent` default does not apply to `Explore` or to either reviewer. Reviewing your own diff through a copy of yourself gives up the separation the step exists for.

   Apply a finding only when all of these hold. The evidence still matches the code at the cited `file:line`. The fix is one coherent change. It changes no contract, no auth or permission posture, and no public API shape. Everything else becomes a residual for step 5. Triage each finding on its merits per `../references/review-bot-triage.md`, and never churn code to satisfy a claim you could not verify. Measure a correctness claim against the real data or the real surface before you edit, and record what you measured.

   When a finding names a fact the change documents in more than one place, fix every place, not only the cited line. A contract that disagrees with itself misleads the next reader.

   **Blast radius.** Run this in parallel with the reviewers, in its own `kaizen-agent` subagent following the **blast-radius** skill, whenever the change reaches outside its own lines: a published interface, a schema or wire format, an exported or shared symbol, a deleted or renamed symbol, or a pinned dependency version. Skip it only when every consumer of what changed sits inside the diff, and record that skip with the reason. Both thermo-nuclear reviewers are scoped to added and modified code by their own rubric, so without this nothing in the chain asks what the change breaks somewhere else.

   A safety fact that stopped below rung 4 of that skill's how-sure ladder, meaning nobody ran real code to prove it, is a residual for step 5 even when no reviewer flagged it. Never round an unproven fact up to safe.

   Gate: every finding is applied, or recorded as a residual with a concrete reason. Blast radius has run or carries a recorded skip, and its load-bearing safety fact is proven or recorded as unproven.

5. **Record the residuals.** Skip this step when step 4 produced none. Otherwise write them to a committed record file, never to the PR body, which duplicates GitHub's own tracking and goes stale as items resolve.

   Reuse the repository's existing residual directory when it has one. Otherwise write `docs/residual-findings/<branch>.md`, with `/` in the branch name replaced by `-`. One entry per residual: severity, `file:line`, the finding, and why you did not apply it. Stage that file alone and commit it.

   Gate: the file exists in a commit.

6. **Re-verify after the review fixes.** Step 2 already proved the artifact works. This step proves the fixes from steps 3 and 4 did not break it. Re-run the gate run, then exercise the surface again the same way. Browser, Electron, and web UIs go through the **browser-testing-with-devtools** skill. CLIs and TUIs you drive yourself in a terminal. A change to a stateful resource rebuilds it in a scratch location, verifies, and drops it.

   The verdict is VERIFIED, NOT VERIFIED, or INCONCLUSIVE. Inconclusive is not a pass. A green gate run is not a pass either, because unit tests show that a branch behaves a certain way and do not prove the feature works.

   Gate: VERIFIED, with the evidence named. NOT VERIFIED spends the bounded retry back in step 4.

7. **Open the draft PR, or a stack when the diff is too big to review.** Measure first, then decide:

   ```bash
   bash ~/.claude/skills/stacked-pr-split/scripts/analyze-split.sh <base> HEAD
   ```

   At `weighted_review_lines` of 600 or more, hand off to the **stacked-pr-split** skill instead of opening one PR, and let it own the layer plan, the build, and the submit. That number is this repository's floor, not the script's default of 200. Below 600 a reviewer still engages with one PR, and above it review quality collapses, so the ceremony of a stack only earns its place past that line.

   Two things that send it back to the single PR. The skill's Phase 0 probe reports that stacked pull requests are not enabled on the repository, or the change comes from a fork, which stacks cannot span. Record which one fired. Thread migration does not apply here, because a fresh one-shot PR has no review threads yet.

   Otherwise run `opening-a-pr.md` for the worktree, commit, and sizing rules. Its `/stop-slop` and `/no-comments` passes are gates here, not suggestions.

   Write the PR title and body through the **creating-pull-requests** skill. Load it before drafting a single line. It owns the size gate, the section budget, the PROSE.md rules, and the no-attribution rules, and none of that is yours to improvise.

   Open the PR as a **draft** (`gh pr create --draft`). The user marks it ready for review. A one-shot run never does.

   Gate: a PR URL, and `gh pr view <number> --json isDraft,state` reports it open and draft. For a stack, every layer is open and draft, and the bottom layer targets the trunk.

8. **Babysit the draft to CI-decided.** Run `babysit.md` in `drive` mode, and declare that mode in your first line as its step 1 requires.

   A draft PR can never report `READY`, so do not wait for it. The stop verdict here is CI decided, every review thread triaged per `../references/review-bot-triage.md`, and the PR still in draft.

   For a stack, work the merge frontier and nothing above it, per `babysit.md` step 2, and never mutate stack topology from inside a babysit, per its step 4.

   Gate: CI decided, no unhandled thread, and `isDraft` still true. For a stack, that verdict is on the frontier layer.

9. **Stop at CI-decided.** Do not mark the PR ready for review, do not merge, and do not arm merge-when-ready. Landing is `shipping.md`, which the user invokes after marking the PR ready, because green is not safe and an independent verdict has to come from an agent that did not write the code.

**Reply:** the gate verdict for each of the ten steps, the draft PR link, what you applied versus recorded as a residual and where that record lives, the blast-radius safety fact with the rung it reached, the verification surface and its evidence for step 2 and step 6, the decision-trail path, and what marking it ready and landing still needs.
