# Doc comments

Companion to `SKILL.md`. How long a doc comment should be, and what to do with the knowledge that does
not fit.

- [The budget](#the-budget)
- [Why TypeScript makes the budget tighter](#why-typescript-makes-the-budget-tighter)
- [Length is a diagnosis, not a style preference](#length-is-a-diagnosis-not-a-style-preference)
- [The four places overflow belongs](#the-four-places-overflow-belongs)
- [A worked cut](#a-worked-cut)
- [What earns three lines](#what-earns-three-lines)
- [Inline comments](#inline-comments)
- [TSDoc tags](#tsdoc-tags)

## The budget

**Two lines. Three when the invariant genuinely needs it. Never a wall.**

That is not an aesthetic rule. A nine-line block above a function has three costs that compound:

- **Nobody reads it.** A reader scanning for the call signature scrolls past the prose. The one sentence
  that would have saved them is buried among eight that would not.
- **It goes stale invisibly.** Nothing checks a comment. The longer it is, the more claims it makes, and
  the more of those claims quietly stop being true. A stale comment is worse than no comment, because a
  reader trusts it.
- **It hides the real problem.** Long comments cluster on functions that do too much, on types too loose
  to state their own contract, and on names that do not say what they mean. The comment is the symptom.

## Why TypeScript makes the budget tighter

In an untyped language a doc comment carries the contract: what goes in, what comes out, what can be null.
In TypeScript the signature carries all of that, and the compiler checks it. So a comment that describes
shapes is not just verbose — it is a second, unchecked copy of something already true in the code.

```ts
// Don't. Every line restates the signature, and the signature cannot drift from itself.
/**
 * Finds a user by id.
 * @param id - the user's id, a string
 * @param opts - options object, optional
 * @returns a Promise of the User, or undefined if not found
 */
export async function findUser(id: UserId, opts?: FindOptions): Promise<User | undefined>
```

The signature already says all of it. Delete the comment; there was nothing in it.

That leaves a doc comment exactly one job: **the why the types cannot hold.** A non-obvious invariant, a
reason the obvious implementation is wrong, a constraint from outside the codebase. If you cannot name
which of those you are writing, you are writing filler.

## Length is a diagnosis, not a style preference

When a comment runs long, do not reach for the delete key first. Ask what the length is telling you, and
fix that:

| The comment explains… | The actual fix |
|---|---|
| When a field is set, or which combination of fields is valid | A discriminated union. See `SKILL.md`. The comment wants to be a variant. |
| That two parameters must not be swapped | Brand the types, or take an object argument. |
| That the input must be non-empty, ordered, or in range | Construct the type so the bad value cannot exist — `NonEmpty<T>`, `{ start, durationMs }`. |
| Four separate behaviours in one function | Two or three functions. Each one's comment is then short because each does one thing. |
| What the function does, step by step | Better names, or extracted helpers whose names are the steps. |
| A whole subsystem's model | A doc or an ADR. A function header is the wrong container for it. |

Truncating without doing this loses real knowledge. That is the failure mode on the other side, and it is
worse than verbosity — verbosity annoys a reader, deletion costs them the fact.

## The four places overflow belongs

When you cut a long comment, every load-bearing fact in it goes somewhere. In rough order of preference:

1. **Into the types.** A variant, a brand, a non-empty tuple. Now the compiler enforces what the prose
   asked for, and it cannot go stale.
2. **Into a name.** `oldestPendingDailyInstant` carries "oldest", "pending", and "daily" for free. Scope
   caveats especially belong here — a comment saying "this reads the daily track only" is a name asking to
   be more specific.
3. **Into a test.** "A source that has never run must not drag the others back" is a test case, and unlike
   a sentence it fails when someone breaks it. Prefer this for any claim about behaviour.
4. **Into a doc or ADR, linked by one line.** Subsystem models, historical decisions, and vendor quirks
   are real knowledge that no function header can hold. `// see docs/pipeline-windows.md` is two words and
   points at the whole story.

What is left after those four is usually one sentence, and that sentence is worth reading.

## A worked cut

Before — nine lines of prose above a function:

```ts
/**
 * The oldest instant any of a pipeline's daily sources still needs, or null
 * when none has run.
 *
 * The sources advance independently, thus one that stalled on a day older than
 * the others widens the next run back to it. The sources that already hold a
 * planned day rewrite its key in place, which downstream dedup resolves. A
 * source that has never run takes whatever the others plan, thus one new source
 * does not drag every other source back to the floor. An unreadable stamp is
 * named and ignored for the same reason.
 *
 * This reads the daily track only. A backfill names its own range.
 */
export function oldestNeeded(sources: Source[]): Date | null
```

Sort the claims by who needs them:

- *Returns the oldest instant, or null when none has run* — the signature says this.
- *Reads the daily track only* — the **name** should say this.
- *A stalled source widens the run back to it* — the one non-obvious rule. **Keep.**
- *A never-run source, and an unreadable stamp, are skipped rather than treated as the floor* — surprising,
  and a plausible bug if someone "fixes" it. **Keep, compressed.**
- *Sources holding a planned day rewrite the key in place, downstream dedup resolves it* — describes the
  caller's machinery, not this function. **Move** to the dedup site.
- *A backfill names its own range* — about a different code path. **Move** to the backfill entry point.

After:

```ts
/**
 * Sources advance independently, so the furthest-behind one sets the floor.
 * A source that never ran, or whose stamp will not parse, is skipped rather
 * than treated as the floor — one new source must not drag the rest back.
 */
export function oldestPendingDailyInstant(sources: Source[]): Date | null
```

Three lines. Nothing load-bearing was dropped: two claims moved to where they apply, two were already in
the code, and the rename absorbed the scope caveat. If the never-ran rule matters as much as the prose
suggested, it also wants a test — and then the comment could fall to two lines.

## What earns three lines

A short list, because the honest answer is "not much":

- **A non-obvious invariant** a reader would otherwise break. The pipeline example above.
- **Why the obvious implementation is wrong.** `// A Set here loses insertion order, which the wire
  format depends on.` This is the highest-value comment there is: it stops a future refactor from
  reintroducing a fixed bug.
- **A constraint from outside the codebase.** A vendor's undocumented rate limit, a legacy column that
  cannot be renamed, a spec requirement. Nothing in the repo can tell the reader this.
- **A deliberate escape hatch.** Every surviving `as`, `!`, `@ts-expect-error`, or `biome-ignore` needs the
  reason and, where possible, the condition for removing it.

Notice that none of these describe what the code does. They all describe something the code cannot say.

## Inline comments

Same budget, one line, and the same test: does it say something the line below cannot?

```ts
// Don't
// increment the counter
count += 1;

// Do
// Stripe rounds half-up; Number.toFixed rounds half-even, which drifts by a cent per ~200 charges.
const cents = Math.round(amount * 100);
```

A comment restating the next line is the version of this problem that is easiest to spot and delete.

## TSDoc tags

Use them where a tool consumes them, and not otherwise.

Worth writing:

- `@deprecated Use parseUser instead.` — editors surface it at every call site, so it does real work.
- `@example` on a published library's public API, where the reader has no repo to grep.
- `@throws` when throwing is part of the contract, since the return type cannot express it.

Not worth writing:

- `@param` and `@returns` that restate the types. In TypeScript this is duplication the compiler already
  owns. Add `@param` only when the parameter's *meaning* is non-obvious in a way the name and type do not
  cover — and prefer fixing the name.
- `@public` / `@internal` on an app. The module's exports are the boundary. These matter for a published
  library with an API-extractor step, and nowhere else.

For a published library the calculus shifts: a consumer reads your `.d.ts` in a tooltip with no access to
the implementation, so an `@example` and a real description on each public export are worth more lines than
they would be internally. That is a reason to exceed the budget deliberately on the public surface, not a
reason to abandon it everywhere.
