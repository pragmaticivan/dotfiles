# Observable Behavior Is a Contract

*Apply when you change output, ordering, error text, exit codes, timing, or a default at a boundary that other code or people consume. Each observable behavior has a consumer, documented or not.*

With enough users, each behavior that a consumer can observe becomes a dependency of some consumer (Hyrum's Law). The documented contract is only part of the real contract.

**Why:** A change that is a refactor from the inside can be a breaking change from the outside. Scripts parse output, tests match error strings, and dashboards depend on field order. These consumers are not in the diff, and they fail after the release.

**The pattern:**

- **Find the consumers before the change.** Search the repository and the known downstream repositories for the output, the error text, or the field name. Use the **blast-radius** skill when the consumers are outside the diff.
- **Name each observable change.** In the PR, list each change to output shape, order, text, exit code, or default. Do not call the change a refactor when a consumer can see a difference.
- **Keep the old behavior, or announce the break.** For consumers that you do not own, keep the old behavior, add the new behavior as an option, or make a versioned break with a changelog entry.
- **Do not promise accidental behavior.** Do not document or test an order or a text that you do not intend to keep. Make it explicitly unspecified where the format allows it.

This principle applies at boundaries that you do not own. For an internal API where you can change each caller, use **Migrate Callers Then Delete Legacy APIs** (`principles/migrate-callers-then-delete-legacy-apis.md`).
