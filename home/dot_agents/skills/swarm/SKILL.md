---
# Source: https://github.com/cursor/plugins/blob/main/pstack/skills/swarm/SKILL.md
# Merged in: https://github.com/cursor/plugins/blob/main/pstack/skills/arena/SKILL.md (compete mode)
name: swarm
description: "Fan out N parallel workers at one task. Cover mode returns one report from slices and races. Compete mode cross-judges N candidates, picks a base, and grafts in the best of the losers."
disable-model-invocation: true
---

# Swarm

Fan out N parallel workers. Two modes, declared in Phase A before anything spawns.

- **Cover** (default). Workers take separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns **one report**.
- **Compete** (the arena). N candidates attempt the same artifact. A cross-judge scores them, you pick a base, graft the best of the losers into it, and verify. The deliverable is **one synthesized artifact**.

Reach for compete when one attempt would lock in the wrong shape: design or code bakeoffs, one-way-door decisions. Reach for cover when you need breadth, not synthesis.

Phases A and B are shared. The phases after them differ by mode.

## Start

Open a todolist with one entry per phase before launching anything. The swarm runs autonomously and the list keeps phases from silently disappearing.

Cover: 1. Frame  2. Fan out  3. Aggregate  4. Report

Compete: 1. Frame  2. Fan out  3. Cross-judge  4. Pick  5. Graft  6. Verify

## Phase A: Frame

Every worker receives the same brief, so the brief is the contract. Get it right before spawning anything.

1. State the done predicate and the artifact or report the swarm must return.
2. Declare the mode.
   - **Cover.** Choose the shape: partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
   - **Compete.** Derive the rubric. State what success looks like for *this* task, then turn it into 3-6 concrete gradeable criteria. Concrete: `Adds a --dry-run flag that skips writes`. Vague: `code is correct`. The rubric is the picker's tool in Phase D; candidates only see the task.
3. Set N and pick the models.
   - **Cover.** Set N from the user or derive it from the shape. N is total workers, not the concurrency limit; excess workers queue and run as slots free up. Use `swarm workers` in `~/.claude/kaizen-models.md` when present, otherwise `sonnet`. For a model race, name each arm's model up front.
   - **Compete.** Use `arena runners` from `~/.claude/kaizen-models.md` when present. Otherwise default to one each on `opus`, `fable`, and `sonnet`. Spawn more when the swarm covers multiple design directions. Same model N times when the work is generation-bound rather than judgment-sensitive.
4. Give each worker its own writable output. Use `isolation: "worktree"`, a branch, or `/tmp/swarm-<slug>/worker-<n>/`. N workers writing to the same path is shared mutable state and fails the `../kaizen-mode/principles/separate-before-serializing-shared-state.md` test.

## Phase B: Fan out

Spawn all N workers in one message with `run_in_background: true` and the configured model. Cover mode uses `subagent_type: "general-purpose"`. Add `isolation: "worktree"` for any worker that writes files, so parallel writers cannot conflict. Run in the session's own checkout only when the worker needs something on this machine that a worktree does not carry.

When a worker must start from a non-default branch, check that branch out in its worktree as the brief's first step.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report.

- **Cover.** Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.
- **Compete.** Each brief carries the task, the path to the shared grounding, its own output path, and instructions to produce both the artifact and a short rationale. The rationale is mandatory. Without it, the parent cannot tell whether a candidate's structure is principled or accidental, which makes Phase E grafting unreliable. Each rationale names the alternatives the candidate considered and what it rejected.

If a worker drops out, proceed with N-1 and note it. In compete mode, the dropout goes in the synthesis record.

---

# Cover mode

## Phase C: Aggregate

Read the terminal results. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.

---

# Compete mode

## Phase C: Cross-judge

After all Phase B candidates complete, choose one model from the `arena cross-judge pool` in `~/.claude/kaizen-models.md` when present. Otherwise use `opus`, `fable`, or `sonnet`. Prefer a different model from the parent's. Spawn one judge subagent on that model with a read-only tool set (`Read`, `Grep`, `Glob`, no write tools). It sees the rubric and the candidates by path label, scores each criterion, and recommends a base with rationale. It runs in parallel with the parent's reading in Phase D, not with the candidates themselves. Spawning while candidates are still writing means the judge sees partial or empty outputs and reports them as dropouts.

## Phase D: Pick a base

Read every candidate end to end before picking. Skimming N candidates surfaces only the candidate whose surface looks most familiar.

Score each candidate against the rubric criterion by criterion, not on holistic feel. Compare against the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base on which candidate a future maintainer can extend most easily without breaking invariants. Prefer the cleaner boundary or smaller surface area when two feel tied, per the Laziness Protocol.

Record the pick and the reason in a short synthesis note alongside the base artifact, including the cross-judge's verdict.

## Phase E: Graft

Walk each losing candidate once more and identify what is worth porting into the base. The signal is usually one or two things per candidate, not most of it.

Fold each graft in by hand, per the **redesign-from-first-principles** principle. Don't paste mechanically. The result has to remain coherent under one mental model.

Record what was grafted, from which candidate, and what was rejected and why. The rejection notes are the highest-signal part of the record. Future readers learn from what you considered and dropped, not just what you kept.

When N candidates converge on the same shape, that is a strong agreement signal. Note the convergence in the record and ship the consensus shape. No graft is needed. When N candidates wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

The synthesized artifact has to hold up under the same scrutiny as any other output, per the **prove-it-works** principle. The swarm does not earn you a pass.

If verification surfaces a problem the swarm did not catch, either Phase A was wrong (re-frame and re-run) or one candidate caught it and you missed the graft (go back to Phase E). Don't paper over.

## Outputs

One synthesized artifact. One short synthesis note alongside, naming the base, the grafts (with source candidate), the rejections, the dropouts if any, and the verification result.
