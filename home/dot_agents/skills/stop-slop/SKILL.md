---
name: stop-slop
description: "Cut AI tells from prose and put the voice back in. Use for any prose surface: a chat reply, a doc, a PR description, a commit body, or a log string."
model: haiku
---

# Stop Slop

Eliminate predictable AI patterns from prose and add human voice. Apply these rules to any writing task.

## Process

1. Scan for the patterns in `references/patterns.md` and the phrase lists below.
2. Rewrite. Preserve meaning, match intended tone.
3. Add soul (see next section).
4. Self-audit: "What makes this obviously AI generated?" Fix remaining tells.

## Adding soul

Removing patterns is half the job. Sterile, voiceless writing is just as obvious.

- **Have opinions.** React to facts instead of neutrally listing pros and cons.
- **Vary rhythm.** Short sentences. Then longer ones that take their time. Mix it up.
- **Acknowledge complexity.** "Impressive but also kind of unsettling" beats "impressive."
- **Use "I" when it fits.** First person isn't unprofessional.
- **Let some mess in.** Perfect structure looks machine-made.
- **Be specific.** Not "this is concerning" but "there's something unsettling about agents churning away at 3am."

## Fix the shape, not the vocabulary

The tell that survives a rewrite is the sentence's shape. Swapping the fancy words for plain
ones leaves the rhetorical move intact, and the move is what reads as machine-written. So after
each rewrite, ask what the sentence is *doing*, not which words it uses.

Two that keep getting through:

- **The concession-then-survival move** (rule 6). "Despite the challenges of migrating legacy
  data, the system continues to thrive" becomes "The team migrated legacy data, a hard job, and
  the system still works well." Same move, plainer words, still nothing to know. The move is only
  gone when a fact replaces it: "The migration moved 4M rows and ran for six hours. Nothing broke."
  If you cannot supply the fact, cut the sentence. A concession with no specifics was never
  carrying information.
- **The triad** (rule 10). "reliable, scalable, and fast" becomes "It is reliable, it scales, and
  it is fast." Recasting three nouns as three clauses keeps the forced-list rhythm. Count what you
  actually have evidence for and write that number of items. Usually it is one.

The general test: read the before and after side by side. If they make the same move in the same
order, you edited the vocabulary and left the slop. Change the structure or delete the sentence.

## Reference Files

See the `references/` directory for:
- `patterns.md` - The numbered rule catalog, cited by number from other skills
- `phrases.md` - Specific phrases to eliminate
- `structures.md` - Formulaic patterns to avoid
- `examples.md` - Before/after transformations
