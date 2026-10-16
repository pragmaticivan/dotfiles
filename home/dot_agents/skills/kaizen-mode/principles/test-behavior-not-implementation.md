<!-- Source: https://github.com/cursor/plugins/blob/main/pstack/skills/principle-test-behavior-not-implementation/SKILL.md -->

# Test Behavior, Not Implementation

*Apply when you write, change, or keep a test. Call the code as its users do and compare observable behavior with an independent oracle.*

A test calls the code as its users do and checks the result or effect they observe. Use a known answer, justified property, or contract-derived model as the oracle.

Before you keep a test, name a plausible wrong behavior that its assertions detect. Use the [Challenge the Tests principle](challenge-the-tests.md) to check sensitivity.

**Why:** A test that cannot fail for a defect costs CI time and review attention and finds nothing. A constant pin also fails when a person changes the constant or the prompt that it restates, so it blocks a correct change.

**Weak test shapes to inspect:**

- **Weak or no assertion.** No assertion, or only existence, truthiness, type, or a broad range when the contract specifies more.
- **Mock or absence only.** Call counts or empty results without evidence that they distinguish correct behavior from a plausible defect.
- **Self-referential.** The expected value comes from the code under test: `expect(f(a)).toBe(f(a))`, `expect(parsed.url).toBe(buildUrl(...))`.
- **Constant pin.** The assertion restates a hand-maintained constant, config default, table row, or prompt string: `expect(LIMITS.maxTools).toBe(8)`, `expect(PROMPT).toContain("You are")`.
- **Fixture asserts fixture.** The assertion reads data that the test built or a value from `beforeEach`, and the subject does not run in the test body.

**The fix:** call the subject with a contract-derived input. Assert the expected output, effect, or independently justified property.
For an absence, include a contrasting case that establishes when the effect must occur. Separate focused tests are acceptable.
For a constant, test the mechanism that reads it with one input. Do not restate the value.
For a mock, assert the payload it got or the state after the call, not only that it was called.
An empty result or `undefined` can be correct. Choose mutations from the contract rather than requiring every test to reject those values.

**Keep** a test of a relation across the rows of a table (a key in two tables, a parent that exists), and a compile-time check in a `*.test-d.ts` file.
