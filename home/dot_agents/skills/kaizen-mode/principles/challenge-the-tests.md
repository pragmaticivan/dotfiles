# Challenge the tests

*Apply when you design tests, assess coverage, or accept a passing suite for changed behavior.*

Ask which plausible wrong behavior could still pass. Derive cases from requirements and known risks before copying the implementation's branches.

- Check relevant input groups, boundaries, condition combinations, and state transitions.
- Include reachable failure paths and observable side effects, not only successful return values.
- Use an independent expected result, model, or justified property. The implementation cannot define its own expected result.
- For material risk, check that an existing regression or a plausible isolated mutation fails at the intended assertion.
- Report important gaps. Passing tests, line coverage, and mutation scores do not establish complete use-case coverage.

Keep the effort proportional. A focused regression can be sufficient for a small fix. No new tool or agent is mandatory.
Use [adversarial test design](../../test-driven-development/references/adversarial-tests.md) for scenario selection and checks of test sensitivity.
