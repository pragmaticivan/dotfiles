# The ten laws and the three keys

From John Maeda, *The Laws of Simplicity*. Each law gets one rule for code, one rule for prose,
and one before and after pair. Read the law you need. You do not need all ten for one change.

## 1. Reduce

The simplest way to reach simplicity is thoughtful reduction. Maeda's order is shrink, hide,
embody. Shrink the surface first. Hide detail behind a boundary second. Embody the quality in the
name last, so the smaller thing still reads as capable.

**Code.** Delete before you add. A wrapper with one caller, an interface with one implementation,
and a factory that builds one type are all reducible to the thing itself.

**Prose.** Cut the sentence that carries no fact. A concession with no specifics was never
carrying information.

```js
// before
const service = new UserServiceFactory(config).create()

// after
const service = new UserService(config.db)
```

## 2. Organize

Organization makes a system of many appear fewer. Maeda's order is sort, label, integrate,
prioritize.

**Code.** Encode a repeated shape in one structure instead of scattering it. A table, a state
machine, a registry, or a reducer replaces branches that repeat the same assumption in several
files. See `../../kaizen-mode/principles/model-the-domain.md`.

**Prose.** One section per reader question. Put the question in the heading.

```js
// before, in three files
if (status === 'draft') return false
if (status === 'review') return user.isEditor
if (status === 'live') return true

// after, in one file
const CAN_PUBLISH = { draft: () => false, review: u => u.isEditor, live: () => true }
```

## 3. Time

Savings in time feel like simplicity. The reviewer's clock is the real budget.

**Code.** A nine hundred line diff costs more than the sum of its parts, because the reviewer
loses the thread halfway and starts again. Split along the axis that lets each part be reviewed
alone, and order the parts so each one proves itself. See
`../../kaizen-mode/principles/sequence-verifiable-units.md`.

**Prose.** Put the answer in the first sentence. A reader who stops after one line must still
have the point.

**Before.** One PR renames a module, changes its behavior, and adds a migration.
**After.** Three PRs. The rename is mechanical and reviewed in a minute. The behavior change is
small and testable. The migration stands alone and is reversible.

## 4. Learn

Knowledge makes everything simpler. Every abstraction you invent is homework you assign to
another person.

**Code.** Use the vocabulary the codebase and the language already have before you invent one.
Reuse of a known name costs nothing. A new name costs every future reader one lookup.

**Prose.** Use the same name for the same thing in the whole document. A synonym reads as a
second concept.

```ts
// before, a new word for a known thing
class HandlerRegistryCoordinator { /* wraps a Map */ }

// after
const handlers = new Map<EventName, Handler>()
```

## 5. Differences

Simplicity and complexity need each other. Contrast is what makes the simple part legible.

**Code.** Uniform flatness hides the line that matters. Keep the main path short and plain, and
give the hard case its own named function. The reader then sees where the difficulty lives.

**Prose.** Vary sentence length. A short sentence after two long ones lands. A page of sentences
at the same length reads as one gray block and nothing stands out.

## 6. Context

What lies in the periphery of simplicity is not peripheral.

**Code.** The diff is not the change. The test, the migration, the log line, the alert, and the
runbook are part of it. A change that is simple inside its own lines and surprising to its callers
is not simple. Use the `blast-radius` skill when the risk sits outside the diff.

**Prose.** The title and the first line do most of the work, because most readers read only those.
Spend your effort there.

## 7. Emotion

More emotion is better than less. Stripping a document to a skeleton does not make it simple, it
makes it unusable.

**Prose.** Keep the opinion, the concrete number, and the honest hedge. "I ran the flaky test two
hundred times and it did not repeat" tells a reader more than "reliability was verified". Use the
`stop-slop` skill to keep the voice while you cut the slop.

**Code.** The error message is your emotional surface, and it is read on the worst day of
somebody's week.

```
// before
throw new Error('Invalid input')

// after
throw new Error(`retryLimit must be 1 to 10, got ${n}`)
```

## 8. Trust

In simplicity we trust. A reader skips the body of a function when they trust the name. Earn that.

**Code.** Make the name true, make the type unable to hold a wrong value, and let a test carry the
claim. Then skipping is safe. See `../../kaizen-mode/principles/type-system-discipline.md`.

**Prose.** One wrong detail costs the document its credit, and the reader then verifies
everything. Check the fact before you write the sentence.

```ts
// before, the name lies, thus nobody can skip the body
function getUser(id: string): User | null { /* also writes an audit row */ }

// after
function getUser(id: UserId): User | null
function recordUserAccess(id: UserId): void
```

## 9. Failure

Some things can never be made simple. Pretending otherwise is the more expensive mistake.

**Both.** Name the irreducible part, say why it is irreducible, and keep it in one place with the
invariant stated at the boundary. A hard concurrency rule belongs in one module, not spread across
five call sites as coordination.

Do not hide the hard part behind a friendly name. A reviewer who finds difficulty where the name
promised none stops trusting the rest of the change.

**Before.** "Simplified the sync logic." The retry, the clock skew, and the partial write are
still there, now spread across three helpers.
**After.** "`SyncCursor` owns ordering. It is the only place that reads the clock. Partial writes
are impossible because the cursor advances after the commit." One hard thing, one place, one
sentence.

## 10. The one

Simplicity is about subtracting the obvious and adding the meaningful.

This is the closing check on any change. Ask both halves. What did I remove that a reader would
have worked out anyway. What did I add that a reader could not have known. If the second answer is
empty, the change carries no information. If the first answer is empty, you only added.

## The three keys

- **Away.** More appears like less by moving it far away. Progressive disclosure is this key. A
  long reference file, loaded when needed, is simpler than a long main file. This skill is built
  that way.
- **Open.** Openness simplifies complexity. An inspectable format, a plain log line, and a script
  a reviewer can rerun beat a clever opaque mechanism, even when the clever one is shorter.
- **Power.** Use less, gain more. Fewer dependencies, fewer flags, fewer moving parts. Each one
  you skip is a failure mode you never have to explain.
