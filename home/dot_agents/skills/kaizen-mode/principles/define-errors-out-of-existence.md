# Define Errors Out of Existence

*Apply when you design a function, a command, or an API, or when many callers handle the same error in the same way. Define the semantics so that the case is a normal result, not an error.*

Each error that an API raises adds work to each caller. When all callers do the same thing for a case, move that behavior into the API and remove the error (Ousterhout, *A Philosophy of Software Design*).

**Why:** Exceptions are part of the interface. If fourteen callers wrap `remove(key)` in the same `try`/`except KeyError: pass`, the API has the wrong contract. The duplicated handlers are fourteen more places for a defect.

**The pattern:**

- **Make the end state the contract.** `remove(key)` makes sure that the key is absent. A missing key is success, as in `rm -f` or `Set.delete`.
- **Clamp when the meaning is clear.** A slice with an index past the end returns the available items.
- **Mask the case at a low level.** Handle a recoverable case one time inside the module, so the callers never see it.
- **Aggregate the handlers.** When an error must stay, handle it at one high-level boundary, not in each caller.

**The limit:** remove an error only when each caller would do the same thing for it, and that thing is correct. If a caller must know about the case, for example a missing account during a payment, the error stays. **Fail Loudly** (`principles/fail-loudly.md`) applies to that error. Hiding a real error is not this principle.

**The test:** "Do all callers handle this error in the same way?" If yes, put that handling in the API.
