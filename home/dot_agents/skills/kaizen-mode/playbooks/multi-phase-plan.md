### Multi-phase or multi-PR plan

**You own the plan, not the code. The plan is a checklist an owner runs box by box and the operator audits from the evidence.** For work that spans phases or stacked PRs. The plan is the deliverable. Do not implement.

1. When the change is one or two files with an obvious approach, skip the plan. Say so and stop. When the change is one PR, write the single-PR shape instead and check it with `--single` per step 6. `one-shot.md` step 1 owns that path.
2. Settle open questions by prototype before you write. For a question about layout, timing, behavior, or whether an API works, run `prototype.md`. Keep the branch, the SHA, and the artifacts for Appendix A. Ask the operator only about a product or preference call that no run can settle. Give options (the **never-block-on-the-human** principle).
3. Explore in subagents with `subagent_type: "kaizen-agent"` and an explicit model per the Subagents section (the **guard-the-context-window** principle). Each returns file pointers, conventions, test commands, and entry points. No inlined dumps.
4. Copy the skeleton below into the plan file and fill every placeholder. Unless the operator names a path, write the file under the repository's `docs/`. Keep every heading and every sub-block in the order shown. One section per PR. One PR is one change with its own evidence (the **sequence-verifiable-units** principle). Name the execution playbook in **How to read this**. Pick between `autopilot-full.md` and `autopilot-stack.md` per the rule at the end of `autopilot-stack.md`. A standing program takes `orchestrate.md`. Author each phase's content per `../references/plan.md`, which owns phase sizing, data structures, and verification-per-phase.
5. Write under the **technical-writing** skill in full, then `/stop-slop`. The body is one Diátaxis mode, how-to. Appendices hold explanation and reference. Two rules apply verbatim. "i dont want any abstract metaphors" and "write like hemingway". Each heading states the task or the finding. No long dashes. No mid-sentence colons.
6. Run `node ~/.claude/skills/kaizen-mode/scripts/check-plan.mjs <plan.md>` and fix every line it prints (the **encode-lessons-in-structure** principle). It enforces the skeleton's shape, the verification rule in every verification block, and the punctuation rules. Add `--single` for a one-PR plan, which drops the program checklist, the close section, and the appendices, makes **Depends on**, **Verify, perf**, and **Review gate** optional, and takes at least three live lanes instead of ten.
7. Hand back. Post the plan path and the script's output, then stop. Execution starts on the operator's explicit go, under the execution playbook the plan names.

**Verification.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked (the **prove-it-works** principle). That sentence is the verification rule. Every verification block opens with it. The live block is mandatory. Ten lanes at the PR head drive the real surface, per the **swarm** skill, on your configured verification model. Each lane is one box with a concrete scenario, the evidence file it saves, and its pass predicate. The perf block names the metric, the probe, the trunk baseline measured first, and the rule with the number that fails. A PR that changes an interaction is review-gated. The operator reviews it in chat with screenshots and a video before merge. A PR that changes no interaction writes `**Review gate.** None. <PR id> is not review-gated.` and no boxes under it.

**Driving the surface.** Pick by surface. Browser, Electron, and web UIs go through the **browser-testing-with-devtools** skill. CLIs and TUIs the lane drives directly in a terminal. Native mobile uses whatever simulator-driving skill the repo has. A PR that touches two surfaces gets lanes on both. A surface with no scripted way to drive it is a risk in Appendix C, and its live block still names how each lane drives it.

````markdown
# <Program> plan

<Under ten lines. What changes, for whom, the rule the program enforces, and the PR ids in order.>

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `playbooks/<execution playbook>.md`. <Who merges, and which PR ids are the operator's items that stop at merge-ready.>

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on her explicit go.
- [ ] On her go, arm the run under `/loop` in dynamic mode with this exact text. "<The plan path, the PR ids in order, the verification rule, who merges, and the done condition.>"
- [ ] Read these from trunk at program start. Re-read them at every tick.
  - [ ] `git show origin/main:<the execution playbook, when the repo vendors it>`
  - [ ] `~/.claude/skills/swarm/SKILL.md`
  - [ ] `~/.claude/skills/kaizen-mode/playbooks/opening-a-pr.md`
  - [ ] `~/.claude/skills/<each other routed skill the program uses>/SKILL.md`
- [ ] Arm the 30-minute audit tick. In a local session, a real terminal `/loop`. In a cloud root, a cloud-sleeper wake chain. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook and the armed loop. Audit the operation against both and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then send the operator a status message, whether or not anything changed, with the queue table of PR, owner, state, and head SHA, the verdicts since the last tick, what merged, open operator gates, and blockers."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks.
  - [ ] <PR id> and <PR id> are independent and first. Both branch from `main`.
  - [ ] <PR id> after <PR id>.
- [ ] Hold the file boundaries. <PR id or class> touches only `<glob>`.
- [ ] Hold the review gate. <PR ids> change an interaction. They wait for the operator's review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Write the PR title and body through the **creating-pull-requests** skill, which opens the PR as a draft. The operator marks it ready for review.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/stop-slop` before each commit and `/no-comments` before review.
- [ ] Triage every review bot and security-reviewer comment per `../references/review-bot-triage.md`.
- [ ] Rebase onto current trunk before babysit and again before the merge-ready report.

### Verdict and merge, for every PR

- [ ] At the merge-ready head SHA, run the swarm per `~/.claude/skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. One audit lane that reads the diff and the receipts and distrusts the PR body.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner. A new head gets a fresh swarm and a fresh verdict.
- [ ] <The merge or append rule from the execution playbook, with the patch-id rule from `shipping.md`.>

### Boot recipe, for every live lane

Each live lane runs at the PR head and drives the surface per **Driving the surface**.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] <Start the backend and the surface. Wait for ready.>
- [ ] <Deliver input only through the surface itself. Name the read-only diagnostics.>
- [ ] Save every artifact to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the report.

## <Task as a verb phrase> (<PR id>)

**Depends on.** <PR id, or None.>

**Files.**

- [ ] Edit `<path>`.
- [ ] Create `<path>`.
- [ ] Delete `<path>`.

**Build.**

- [ ] <One change. Name the symbol and the file.>

**You see.**

- [ ] <One observable result, with the exact log line or screen state.>

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] <Test file and the case it gains.> Run `<command>`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes at the PR head, per the boot recipe.

- [ ] Lane 1. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 2. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 3. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 4. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 5. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 6. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 7. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 8. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 9. <Scenario.> Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 10. <Scenario.> Save `<slug>.png`. Pass when <predicate>.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. <What is measured.>
- [ ] Probe. <The command or procedure, run at trunk and at the head, interleaved.>
- [ ] Baseline. Record the trunk <value> first.
- [ ] Rule. <Head against trunk, with the number that fails.>

**Review gate.** The operator reviews before merge.

- [ ] Copy lane <n> screenshots into `<media path>/<pr-id>-review-<slug>.png`.
- [ ] Record a 30 to 60 second video of the change on a lane host. Save it as `<media path>/<pr-id>-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] review bot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] <The owner squash-merges its own PR, or the root appends the PR to the Graphite stack and the operator lands it.>

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

<Each open question a prototype answered, with the branch, the SHA, and the artifact links. Each question that stays unproven.>

## Appendix B. Alternatives rejected

<Each approach weighed and why it lost.>

## Appendix C. Risks

<Each risk with the PR it lands in and what the owner watches.>

## Appendix D. Links and reading list

<Docs to read before editing. Which PRs get the **how** skill and the **interrogate** skill. The trail per the **show-me-your-work** skill.>
````

**Reply:** the plan path, the PR ids with their dependencies and the review-gated set, what the prototypes proved and what stays unproven, and the check script's output.
