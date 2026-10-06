<!-- Source: https://github.com/cursor/plugins/blob/main/pstack/skills/principle-test-behavior-not-implementation/SKILL.md -->

# Test Behavior, Not Implementation

*Apply when you write, change, or keep a test. Call the code as its users do and compare the result they see with a literal expected value. If the test still passes when every imported function returns `undefined`, rewrite the assertion or delete the test.*

A test calls the code as its users do and compares the result they see with a literal expected value. A test that asserts which calls the code made, or that restates a constant from the code, does neither.

The check: before you keep a test, ask if it still passes when every function it imports returns `undefined`. If it does, it sees no behavior and cannot fail for a defect. Rewrite the assertion or delete the test.

**Why:** A test that cannot fail for a defect costs CI time and review attention and finds nothing. A constant pin also fails when a person changes the constant or the prompt that it restates, so it blocks a correct change.

**Five shapes that still pass when every imported function returns `undefined`:**

- **Weak or no assertion.** No `expect`, or only `toBeDefined`, `toBeTruthy`, `not.toThrow`, `toBeInstanceOf`, `toBeGreaterThan(0)`.
- **Mock or absence only.** Only `toHaveBeenCalled`, `not.toHaveBeenCalled`, `toBeUndefined`, `toEqual([])`, `toHaveLength(0)`, `not.toBe(wrongValue)`.
- **Self-referential.** The expected value comes from the code under test: `expect(f(a)).toBe(f(a))`, `expect(parsed.url).toBe(buildUrl(...))`.
- **Constant pin.** The assertion restates a hand-maintained constant, config default, table row, or prompt string: `expect(LIMITS.maxTools).toBe(8)`, `expect(PROMPT).toContain("You are")`.
- **Fixture asserts fixture.** The assertion reads data that the test built or a value from `beforeEach`, and the subject does not run in the test body.

**The fix:** call the subject in the test body with one concrete input, and assert the literal output or the effect you can see: `expect(slugify("Hello, World!")).toBe("hello-world")`. For an absence, assert the presence on the other input in the same test. For a constant, test the mechanism that reads it with one input. Do not restate the value. For a mock, assert the payload it got or the state after the call, not only that it was called. If no such assertion is possible, delete the test.

**Keep** a test of a relation across the rows of a table (a key in two tables, a parent that exists), and a compile-time check in a `*.test-d.ts` file.
