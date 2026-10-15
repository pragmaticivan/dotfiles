# Adversarial test design

## Select scenarios from the contract

1. State the behavior, its expected result, and the supported input domain before writing tests.
2. Identify plausible defects that a passing happy-path test would miss.
3. Select the applicable risks below. Do not create a full Cartesian product or invent unsupported behavior.
4. For material changes, record `risk -> scenario -> oracle -> evidence or gap` in a compact table.
5. For a small fix, check the relevant risks without a separate document.

An oracle is the rule that determines the expected result. Coverage shows which code ran, not whether the oracle detects wrong behavior.

| Risk | Candidate scenarios |
| --- | --- |
| Input groups | Representative supported values, empty values, and invalid values accepted at an external boundary. |
| Boundaries | The threshold and the nearest meaningful values on each side, including capacity and rounding boundaries. |
| Conditions | Combinations that change the result, such as permission plus ownership or discount plus eligibility. |
| State | Valid and invalid transitions, repeated operations, reset, and order changes where the contract supports them. |
| Failure | Reachable dependency errors, partial completion, cleanup, and the state that remains after failure. |
| Shared state | Duplicate delivery, stale reads, cancellation, and controlled interleavings when concurrent actors exist. |
| Compatibility | Existing consumers and boundary formats affected by the change. |

Test the contract at the boundary that owns it. Do not add internal null guards or retry behavior merely to satisfy invented cases.
For concurrency tests, control scheduling rather than depending on sleeps.

## Choose an independent oracle

- Use literal known-answer examples where practical.
- For broad input domains, use properties with constrained generators. Keep concrete boundary examples as well.
- For stateful behavior, compare command sequences with a small model derived from the contract.
- When exact outputs are unavailable, use a justified metamorphic relation between related inputs and outputs.
- Check the relation against a known-answer example where practical. A wrong implementation can preserve a relation.
- Do not calculate expected values with the production helper under test or copy its algorithm into the test.
- If the contract is ambiguous, record the gap. Do not make current behavior the oracle without justification.

Preserve failing generated inputs and seeds. Reduce failures to a small reproduction when the tool supports shrinking.
Use existing test tools. Add property-testing or mutation-testing dependencies only when their benefit justifies the cost.

## Check that tests detect plausible defects

For material risk, use an existing failing-before regression as evidence of sensitivity to that defect.
For important risks that evidence does not cover, choose a small plausible mutation in an isolated copy.
Examples include changing `<` to `<=`, omitting a state update, returning stale data, or suppressing a required error.

1. Run the correct version first. Make sure the relevant tests pass.
2. Change only the behavior under examination in the isolated copy. Leave test assertions unchanged.
3. Run the relevant tests against the mutation.
4. Make sure an intended assertion fails because of wrong behavior, not syntax, imports, or setup.
5. Discard the isolated mutation. Make sure the correct version still passes.

Investigate surviving mutations. They can indicate a missing scenario, a weak oracle, or behavior equivalent under the contract.
Do not add meaningless assertions merely to increase a mutation score. Never mutate the user's working copy or production state.

## Report the limits

Name the important checked risks, sensitivity evidence, and untested cases.
Do not claim exhaustive coverage from a finite scenario list or generated run.
Use a fresh test author or challenger for complex or high-risk changes when useful. Give them the contract before the proposed fix.
A separate agent is not proof of independence or test quality.

## Research basis

- [ISTQB black-box techniques](https://astqb.org/4-2-black-box-test-techniques/) describe partitions, boundaries, decision tables, and state transitions. Partitions assume similar behavior within each group.
- [Experiences with QuickCheck](https://research.chalmers.se/en/publication/232550) describes model-based stateful testing. This is an experience report, not a controlled comparison.
- [Metamorphic Testing](https://arxiv.org/abs/2002.12543) describes related executions when exact oracles are difficult. A relation is only a partial oracle.
- [Mutation effectiveness, FSE 2014](https://homes.cs.washington.edu/~mernst/pubs/mutation-effectiveness-fse2014-abstract.html) reports correlation with real-fault detection beyond coverage. Correlation does not establish correctness.
- [LLM unit-test generation study, 2024](https://arxiv.org/html/2406.18181v1#S3.SS4) identifies missing triggering inputs among undetected defects. Its models and Java benchmark do not establish current-model failure rates.
