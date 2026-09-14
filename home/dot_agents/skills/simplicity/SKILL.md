---
name: simplicity
description: "Make code and prose simple by design, so one human reviewer can hold a whole change in their head after one pass. Use this skill whenever you write or restructure code, a document, a PR description, a commit body, a ticket, or a config, and whenever you catch yourself adding a layer, a helper, an option, a flag, an abstraction, or a section. Also use it when asked to simplify, to cut over-engineering, to make a change reviewable, to split a large diff, or to shrink anything a human must read and then explain to another human."
---

# Simplicity

Simplicity is measured in the reader's head, not in your line count. The ten laws come from John
Maeda, *The Laws of Simplicity*. This skill turns them into a procedure for code and for prose.

The reason is human. A person who did not write this must review it, approve it, and then answer
questions about it from someone else. Everything they cannot hold in one pass becomes a meeting.

## The one test

**A reviewer who did not write this reads it once and explains it back correctly.**

Every rule below serves that test. When two rules fight, the test decides.

For the two costs the test measures, read `../kaizen-mode/principles/minimize-reader-load.md`.
Layers to trace and state to hold are the axes. Do not restate them, apply them.

## Procedure

1. **Name the one thing.** Write one sentence that says what this change does. If the sentence
   needs the word *and*, you have two changes. Split them.
2. **Subtract first.** Look for what to delete before what to add. Dead branch, unused option,
   one-caller wrapper, speculative guard, redundant validator, stub reference, paragraph that
   restates its heading.
3. **Organize what is left.** Sort, label, integrate, prioritize. Scattered conditionals become
   one table or one state machine. Scattered paragraphs become one section per reader question.
4. **Hide only behind a boundary that pays.** A boundary earns its keep when it hides a decision.
   A boundary that renames arguments adds a layer and hides nothing. Delete it.
5. **Name what cannot be simple.** Some parts are irreducible. Say which part, say why, and keep
   it in one place. Write that sentence in the PR body or the doc, not in a code comment.
6. **Run the one test.** Read your own work as the reviewer. If you cannot explain it back, go
   to step 1 with less scope.

## Budgets

These are defaults, not laws. Exceed one when you name the reason in the PR body. An unnamed
overrun is the usual sign that step 1 never happened.

- **One change, one sentence.** One reviewable PR, one claim.
- **One new concept.** A reader learns at most one new name or abstraction per change. Every new
  abstraction is homework you assign to somebody else.
- **Three hops.** A reader answers "where does this value come from" in three file hops or fewer.
- **One screen.** A function fits on one screen, at two levels of nesting or fewer.
- **One instruction a sentence.** Twenty words for a procedure, twenty five for a description.
- **Zero new options.** Add no flag, no parameter, and no config key until a caller needs it
  today.

## What simplicity is not

Agents over-correct here, thus each item names the failure.

- **Not fewer characters.** A golfed expression and a stripped doc both move work to the reader.
- **Not fewer files.** One file of two thousand lines is not simpler than six honest ones.
- **Not fewer facts.** Cutting the number, the field name, or the caveat makes the reader ask you
  instead of reading. That is the opposite of the goal.
- **Not a smaller surface over the same complexity.** Moving the mess one level down and calling
  the wrapper *simple* fails the one test.
- **Not silence about the hard part.** An unexplained hard part reads as a bug.

## Add the meaningful

Subtraction is half the work. Law 10 asks you to add the meaningful. Four things earn their cost.

- The one fact that answers the reviewer's first question.
- The name that makes a comment unnecessary.
- The test that lets a reader trust the change without reading the body.
- One sentence of *why*, when the shape is surprising.

## Prose surfaces

The same six steps apply. Four moves carry most of the value.

- Lead with the conclusion. The first sentence is the answer.
- Order sections by the reader's questions, not by the order you learned things.
- Use the same name for the same thing in the whole document.
- Link to the source instead of restating it.

For document structure use the `technical-writing` skill. For voice use the `stop-slop` skill.
This skill decides how much to say. Those two decide how to say it.

## Reference

`references/laws.md` holds the ten laws and the three keys, each with a code rule, a prose rule,
and one before and after pair. Read it when a change resists the six steps, when you must defend
a tradeoff between simple and complete, or when you are unsure whether a boundary pays.
