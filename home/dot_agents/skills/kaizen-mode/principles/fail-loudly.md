# Fail Loudly

*Apply when you handle an error, write a fallback, or make a failing test pass. Let an unexpected failure stop the operation at its source, with a message that names the cause.*

An error that the code hides moves the failure to a different place and a later time. Let it stop the operation where it occurs, and make the message name the input and the cause.

**Why:** A broad `catch`, a default value, or an empty return makes the test pass and the symptom go away. The real defect then appears later, far from its cause, with a misleading message. That makes **Fix Root Causes** (`principles/fix-root-causes.md`) slow.

**The pattern:**

- **Catch only what you can handle.** Catch a specific error when the code has a correct recovery. Otherwise let the error propagate.
- **No silent fallback.** Do not replace a missing or invalid value with a default unless the contract defines that default.
- **No catch-all to make a test pass.** When a test fails with an error, find why the error occurs. Do not suppress it.
- **Give the message the facts.** Name the input, the file, the key, or the identifier that caused the failure.
- **Keep the original error.** When you wrap an error, keep its cause (for example `raise ... from err` or `new Error(msg, { cause })`).

**Not this principle:** retries, timeouts, and circuit breakers. Add those only when there is evidence of a transient failure, at the boundary that owns it (**Boundary Discipline**, `principles/boundary-discipline.md`). When a case is not an error, remove it from the API with **Define Errors Out of Existence** (`principles/define-errors-out-of-existence.md`). Do not hide it.

**The test:** if this fails in production, does the first error message point to the cause? If it points somewhere else, or there is no message, the code hides a failure.
