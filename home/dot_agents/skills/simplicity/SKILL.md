---
name: simplicity
description: "Keep code and prose simple enough that one reviewer grasps a whole change in one pass. Use when writing or simplifying code, a doc, a PR, or a commit, and when tempted to add a layer, an option, or a section."
---

# Simplicity

A human reviews your work, approves it, then answers questions about it. Whatever they cannot hold
in one pass becomes a meeting. Simplicity is measured in that head, not in your line count.

## The one test

**A reviewer who did not write this reads it once and explains it back correctly.** Every rule
below serves that test. When two rules fight, the test decides.

## Procedure

1. **Name the one thing.** One sentence for the change. If it needs *and*, split it.
2. **Subtract first.** Delete before you add. One-caller wrapper, unused option, speculative
   guard, paragraph that restates its heading.
3. **Organize what is left.** Conditionals become one table, paragraphs one answer-first section.
4. **Hide behind a boundary only if it pays.** Hiding a decision earns a layer. Renaming does not.
5. **Name what cannot be simple.** Say which part is irreducible and why, in the PR body or doc.
6. **Read it as the reviewer.** If you cannot explain it back, return to step 1 with less scope.

## Budgets

Defaults. Exceed one only by naming the reason in the PR body. One claim a PR. One new name or
abstraction a change. Three file hops to any answer. One screen and two nesting levels a function.
One instruction a sentence. Zero new flags until a caller needs one today.

## Simplicity is not

- **Fewer characters.** A golfed expression and a stripped doc both move work to the reader.
- **Fewer files.** One file of two thousand lines is not simpler than six honest ones.
- **Fewer facts.** Cut the number, the field name, or the caveat and the reader asks you instead.
- **A smaller surface over the same mess.** Complexity moved one level down fails the test.
- **Silence about the hard part.** An unexplained hard part reads as a bug.

## Add the meaningful

Subtraction is half of it. Four additions earn their cost. The fact that answers the reviewer's
first question. The name that makes a comment unnecessary. The test that lets a reader trust the
change unread. One sentence of *why*, when the shape surprises.

## More

`references/laws.md` holds John Maeda's ten laws as a code rule and a prose rule each. Read it
when a change resists the procedure. For document structure use `technical-writing`, for voice use
`stop-slop`.
