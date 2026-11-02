# Run the team

Use the host's available subagent tools rather than a fixed agent or model name.
Keep the team at one lead and three workers by default.
For a narrow fix, keep proposals within the affected component.

| Role | Responsibility | Output |
| --- | --- | --- |
| Lead | Own the brief, reconcile proposals, and integrate source changes | One implementation and decision record |
| Designer | Fetch references and propose a task-specific visual direction | Proposal with source links and tradeoffs |
| Challenger | Independently propose an alternative, then contest both directions | Concrete defects, counterproposal, and acceptance conditions |
| Browser verifier | Exercise the integrated revision in Playwright | Screenshots, measurements, and observed results |

Give every worker the same user goal, scope, route, constraints, and acceptance conditions.
Include the current source revision or working-copy snapshot and relevant file paths.
Give each worker its own output directory.
Make the lead the only writer to the integrated application source.
Workers may build competing sketches only in separate worktrees or copies.
Use separate browser contexts for concurrent browser work.
If the host exposes one shared page, let only the verifier drive it.

## Contest, then converge

1. Start the designer and challenger with the same brief, without the other's conclusions.
   Ask for different directions, not two approvals of the first idea.
2. Share both proposals after they finish.
   Ask each worker to name what the other direction improves or breaks.
   Require a specific component, user effect, and evidence for each claimed defect.
3. Record one direction before implementation.
   Combine useful details only when the result remains coherent.
   Resolve factual disputes with the smallest browser experiment that separates the claims.
   For a genuine product preference, state the tradeoff and ask the user only if it blocks progress.
4. Let the lead implement the agreed direction.
   Let the verifier inspect the current revision using the browser check.
   Give the screenshots and findings to the challenger for an independent critique.
5. Correct the highest-impact supported defect.
   Repeat verification and critique on the changed revision.
   Use at least two review passes for a redesign, without inventing defects to fill a quota.
   Stop after three correction rounds if agreement or evidence remains incomplete.
   Report unresolved items rather than claiming approval.

Consensus means the designer and challenger accept the direction and the verifier finds no unresolved blocker in the current revision.
Consensus is not a vote or proof of user satisfaction.
For a proposal-only task, label consensus provisional until browser checks run.
Keep a supported minority finding open even when the other agents disagree.
Record each decision as a proposal, objection, evidence, resolution, and remaining dissent.
Include rejected alternatives and their reasons in the handoff.
If a worker fails, report its missing role and the resulting check gap.
Do not silently replace independent review with the lead's own approval.
