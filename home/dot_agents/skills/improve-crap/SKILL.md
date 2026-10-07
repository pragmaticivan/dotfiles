---
name: improve-crap
description: "Find and reduce change risk with CRAP scores. Use when asked to improve CRAP, rank risky functions, combine complexity with coverage, or choose high-value tests and refactors from coverage and cyclomatic-complexity data."
---

# Improve CRAP

Reduce the change risk in functions that combine high cyclomatic complexity with low test coverage.
Do not turn the work into a coverage quota.

Use this formula for a function `m`:

```text
CRAP(m) = CC(m)^2 * (1 - coverage(m))^3 + CC(m)
```

In the formula, coverage is a fraction from `0` through `1`. Treat `30` as a triage hint, not a quality gate.

## Data shape

Represent each measured function with these fields:

```json
{
  "symbol": "calculatePrice",
  "path": "src/pricing.ts",
  "line": 42,
  "complexity": 7,
  "coverage": 0
}
```

In the data shape, `coverage` is a percentage from `0` through `100`. `rank_crap.py` converts it. Keep the analyzer name, analyzer version, coverage kind, and source revision with the report.

## Workflow

1. Read the repository instructions and the current worktree state.
2. Find the existing test, coverage, and cyclomatic-complexity commands in project configuration and CI.
3. Run the tests before changing code.
4. Measure function-level coverage and cyclomatic complexity on the same source revision.
5. Record the coverage kind and the analyzer's decision-counting rules.
6. Normalize the measurements to the data shape above.
7. Rank the records with `python scripts/rank_crap.py measurements.json`.
8. Exclude generated, vendored, and unreachable code from the candidate list. State each exclusion.
9. Select one reachable function that is likely to change. Prefer the highest CRAP score unless change frequency or impact gives a stronger reason.
10. Add a characterization test that fails when the selected behavior changes.
11. Add tests for uncovered decisions, not lines that execute without checking behavior.
12. Simplify the function when its branches express accidental complexity.
13. Run the focused tests after each edit.
14. Run the full test suite.
15. Repeat the original measurement commands.
16. Report the before and after values from comparable reports.

If the project has no suitable analyzer, identify the smallest compatible tool or configuration change. Do not install it or change CI unless the user requested tooling changes.

If coverage is available only by file, stop before calculating CRAP. File coverage does not support a function-level CRAP claim.

## Pick the treatment from the measurements

| Shape | Treatment |
| --- | --- |
| High complexity, low coverage | Characterize behavior first. Then remove accidental branches. |
| High complexity, high coverage | Simplify the domain model. Keep the behavior tests. |
| Low complexity, low coverage | Usually leave it alone unless the function changes often or has high impact. |
| Low complexity, high coverage | Do not spend time on it. |

Use a table, state machine, typed model, registry, or smaller domain boundary only when that structure removes decisions or invalid states. Do not add a layer that only moves the decisions.

## Do not game the score

Reject an apparent improvement when it comes only from one of these changes:

- Split one function into wrappers while the same decision graph remains.
- Move branches into unmeasured code.
- Exclude difficult files from coverage.
- Change analyzers or coverage kinds between the baseline and the result.
- Add tests that execute lines without checking outcomes.
- Optimize a low-risk function because its score is easy to lower.

CRAP is a ranking signal. It is not proof that behavior is correct. Tests must check externally visible outcomes or stable domain invariants.

## Report

Return these sections:

1. **Measurement.** Name the commands, analyzers, versions, coverage kind, and source revision.
2. **Hotspots.** Show the highest CRAP records and any stated exclusions.
3. **Selected function.** Explain why this function is worth changing now.
4. **Change.** Describe the behavior tests and the complexity reduction.
5. **Result.** Show complexity, coverage, and CRAP before and after.
6. **Verification.** List the focused test, full test, and repeated measurement results.
7. **Limits.** State missing function coverage, incompatible reports, or untested paths without rounding confidence up.

Do not claim success from a lower repository-wide average. Show the selected function and confirm that behavior still passes.
