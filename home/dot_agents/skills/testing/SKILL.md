---
name: testing
description: "Design and organize unit, integration, and end-to-end tests with adversarial cases that catch real defects. Use to add or review tests, write a bug regression test, pick a test level, or lay out a suite, even for a bare 'add tests'."
---

# Testing

A test earns its place when a plausible defect makes it fail. Call the code the way its users do, at the level that owns the behavior, and compare the result with an expected value that the code under test did not compute.

The order of test and code is your choice. The evidence is not optional: each test that you keep must have failed against a wrong version at least once, through a reproduced bug or a mutation.

Examples are TypeScript with Vitest and Playwright. When the repository uses another runner, keep its runner and conventions and apply the same rules.

## Workflow

1. **State the contract.** Write down the behavior, the supported inputs, the expected results, and the side effects. When the contract is ambiguous, record the gap. Do not make the current behavior the oracle.
2. **Plan the happy path and the adversarial cases in the same pass.** For each case that shows the behavior works, name the plausible wrong version that the suite must reject. Use [adversarial test design](references/adversarial-tests.md). For a material change, start a blind challenger in parallel (below).
3. **Pick the level per case.** Use the lowest level that can observe the defect. See [test levels](references/levels.md).
4. **Put each test where the suite expects it.** Follow the existing layout. When there is none, use [test organization](references/organization.md).
5. **Write the tests.** Use [test patterns](references/patterns.md) for structure, test data, test doubles, time, async, and components.
6. **Prove the tests can fail.** For a bug, run the reproduction before the fix and see it fail for the reported reason. For new or untested behavior, mutate an isolated copy at the material risks and see an intended assertion fail. Discard the mutation. A failure because the function does not exist yet proves nothing about the assertions.
7. **Run and report** (below).

A small fix needs one focused regression test and a few minutes of thought about step 2. A new module, a state machine, money, auth, or concurrency needs the full table and the challenger.

## Plan adversarial cases in parallel

Start the challenger before you write any test, so that it does not anchor on your cases. Give it the contract and the public interface, not the implementation or your draft tests:

```
Contract: <behavior, inputs, outputs, side effects>
Interface: <signatures or endpoint shapes>
List the plausible wrong implementations that a happy-path suite would accept.
For each, give: risk -> scenario -> expected result from the contract.
Do not read <implementation paths>. Do not write tests.
```

Merge its list with your own. Drop cases outside the contract. Keep the cases that would catch a defect your list missed. A separate agent reduces anchoring, but it does not prove test quality. The mutation check in step 6 does that.

## Fix a bug

1. Reproduce the bug with the narrowest test that can see it, usually the existing test file for that codepath.
2. Run it. Make sure that it fails, and that it fails for the reported reason, not a setup or import error.
3. Fix the code. Run the test again, then the adjacent tests, the type check, and the lint.
4. Commit the failing test before the fix when the history matters.

When a reproduction test is impractical (production-only state, vague steps, a harness much larger than the fix), say why before the fix. Then use the closest executable check: a script, a command, a browser session, or a log assertion. Run it before and after the fix. Prefer no new test over a bad test that mostly tests mocks or would be deleted after the fix.

## Guardrails

- Do not change a test to match a wrong implementation.
- Do not weaken an assertion unless the contract changed. Say what changed.
- Do not skip, disable, or `.only` a test to get a green run.
- In test-only work on protected code, keep the implementation unchanged. Mutate only an isolated copy.
- Do not add a test framework or dependency unless the existing tools cannot express a material case.
- For browser behavior, reproduce through the real surface and commit a Playwright spec. Use the **browser-testing-with-devtools** skill for traces, computed styles, and performance.

## Report the result

- The contract risks that you checked, and the test or check for each.
- The failing-before evidence: the reproduction or mutation, and the assertion that failed.
- The passing run, with the command and the count of tests that ran.
- The gaps that remain. Do not claim exhaustive coverage from a finite list, a coverage number, or a mutation score.
