# The ten laws and the three keys

From John Maeda, *The Laws of Simplicity*. Each law gets one code rule and one prose rule. Read
the law you need. One change rarely needs more than two.

## 1. Reduce

Shrink, then hide, then embody the quality in the name so the smaller thing still reads as
capable.

- **Code.** A wrapper with one caller, an interface with one implementation, and a factory that
  builds one type all reduce to the thing itself.
- **Prose.** Cut the sentence with no fact in it. A concession with no specifics carried nothing.

## 2. Organize

Sort, label, integrate, prioritize. Organization makes many appear fewer.

- **Code.** Encode a repeated shape in one structure. A table, a state machine, or a reducer
  replaces branches that repeat the same assumption across files. See
  `../../kaizen-mode/principles/model-the-domain.md`.
- **Prose.** One section per reader question, and the question goes in the heading.

```js
// before, in three files        // after, in one
if (s === 'draft') return false  const CAN_PUBLISH = {
if (s === 'review') return ed      draft: () => false, review: u => u.isEditor, live: () => true }
```

## 3. Time

Savings in time feel like simplicity, and the reviewer's clock is the budget.

- **Code.** A nine hundred line diff costs more than its parts, because the reviewer loses the
  thread halfway and starts again. Split along the axis that lets each part be reviewed alone. See
  `../../kaizen-mode/principles/sequence-verifiable-units.md`.
- **Prose.** The first sentence is the answer. A reader who stops there still has the point.

## 4. Learn

Knowledge makes everything simpler, and every abstraction you invent is homework for someone else.

- **Code.** Use the vocabulary the codebase and the language already have. A known name costs
  nothing, a new one costs every future reader a lookup. Do not name a `Map` a
  `HandlerRegistryCoordinator`.
- **Prose.** The same name for the same thing in the whole document. A synonym reads as a second
  concept.

## 5. Differences

Simplicity and complexity need each other, because contrast is what makes the simple part legible.

- **Code.** Uniform flatness hides the line that matters. Keep the main path short and plain, and
  give the hard case its own named function.
- **Prose.** Vary sentence length. A page at one length reads as gray and nothing stands out.

## 6. Context

What lies in the periphery is not peripheral.

- **Code.** The diff is not the change. The test, the migration, the log line, and the runbook are
  part of it. Use the `blast-radius` skill when the risk sits outside the diff.
- **Prose.** The title and the first line do most of the work, because most readers read only
  those.

## 7. Emotion

More emotion is better than less. A skeleton is not simple, it is unusable.

- **Prose.** Keep the opinion, the number, and the honest hedge. "I ran the flaky test two hundred
  times and it did not repeat" beats "reliability was verified". Use `stop-slop` to cut the slop
  and keep the voice.
- **Code.** The error message is your emotional surface, read on the worst day of someone's week.
  `retryLimit must be 1 to 10, got 40` beats `Invalid input`.

## 8. Trust

A reader skips a function body when they trust the name. Earn that.

- **Code.** Make the name true, make the type unable to hold a wrong value, and let a test carry
  the claim. A `getUser` that also writes an audit row breaks all three. See
  `../../kaizen-mode/principles/type-system-discipline.md`.
- **Prose.** One wrong detail costs the document its credit, and then the reader verifies
  everything. Check the fact before you write the sentence.

## 9. Failure

Some things can never be made simple, and pretending otherwise costs more.

- **Both.** Name the irreducible part, say why, and keep it in one place with the invariant stated
  at the boundary. A hard concurrency rule belongs in one module, not spread across five call
  sites as coordination.
- **Never hide the hard part behind a friendly name.** A reviewer who finds difficulty where the
  name promised none stops trusting the rest.

## 10. The one

Subtract the obvious, add the meaningful. The closing check asks both halves. What did I remove
that a reader would have worked out anyway. What did I add that a reader could not have known. An
empty second answer means the change carries no information.

## The three keys

- **Away.** More appears like less at a distance. Progressive disclosure is this key, and this
  skill is built that way.
- **Open.** An inspectable format, a plain log line, and a script a reviewer can rerun beat a
  clever opaque mechanism, even a shorter one.
- **Power.** Use less, gain more. Each dependency, flag, and moving part you skip is a failure
  mode you never explain.
