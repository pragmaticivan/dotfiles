---
name: simplified-technical-english
description: "Write, rewrite, or audit text in ASD-STE100 Simplified Technical English Issue 9, with the 875-word dictionary and 53 rules bundled. Use for STE, controlled language, or an unambiguous runbook, procedure, or error string."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Simplified Technical English (ASD-STE100 Issue 9)

STE is a controlled natural language: 875 approved words plus 53 writing rules.
One meaning per word is the target, not fluent English. `ensure` is wrong and
`make sure` is right. `perform` is wrong and `do` is right.

Apply your judgment, and look a word up when you are not sure. There is no
checker. Do not estimate a compliance score, and do not report a count of
errors that you did not find yourself.

The rules apply to everything that you write, not only to the document. The
rewrite and the notes that go with it ship together, and the reader gets both.
The failure that recurs is a clean document with a rationale beside it that
uses semicolons and unapproved words. Write the rationale, the summary, and the
chat reply to the same standard. A semicolon in `stale has no approved
equivalent; I used old` is a rule breach in the answer.

## Look a word up

The dictionaries are plain text. `grep` reads them.

```bash
grep -i "^ensure " references/dictionary-unapproved.md   # -> the approved alternatives
grep -i "^ACCESS " references/dictionary-approved.md     # -> the approved meaning
```

Do this for a word that you doubt, not for each word. `references/word-selection.md`
gives the decision flow and the 39 errors that recur.

## Decide the type of the text first

Every limit depends on this:

- **Procedural** (Section 5) — tells the reader what to do. Imperative, one
  instruction per sentence, 20 words maximum.
- **Descriptive** (Section 6) — information, not instructions. The imperative
  form is not permitted. 25 words maximum.

Most documents mix the two. Keep them in different blocks, and never mix them
in one vertical list (Rule 4.3).

A step keeps the imperative form. To shorten a step, do not change it into a
description of what the command does. `The command erases the local cache` is
descriptive text in a procedure, and the reader no longer knows what to do.
Write `Erase the local cache`. If a step needs the result as well, add the
result as its own descriptive sentence after the instruction.

## The loop

1. Write or rewrite the text. Get the content correct first.
2. Read it again against the core limits below. Correct what is wrong.
3. Look up the words that you doubt. Replace them with the approved word.
4. Read the text for the rules that a list cannot settle: one topic per
   paragraph (6.5), gradual information (6.1), the same name for the same item
   (1.11, 9.4), a note that hides an instruction (5.5), and a safety
   instruction with no stated consequence (7.3).

When you rewrite, preserve the technical content exactly. STE changes the
words, never the facts. To delete a caveat or a limit value is a worse failure
than a rule breach. Report the substantive rewrites (rule, before, after), and
do not list every `the` you added.

## Core limits

| Limit | Rule |
| --- | --- |
| 20 words maximum in a procedural sentence, safety instructions included | 5.1 |
| 25 words maximum in a descriptive sentence or a note | 6.3, 5.5 |
| Six sentences maximum in a paragraph | 6.6 |
| Three words maximum in a multi-word noun | 2.1 |
| Only these verb forms: infinitive, imperative, simple present, simple past, simple future, past participle as an adjective | 3.2 |
| Active voice. In descriptive text, the passive is permitted only if the agent is unknown | 3.6 |
| One instruction in a sentence, unless the actions occur at the same time | 5.2 |
| The condition in front of the command | 5.4 |
| No semicolon, no contraction, no Latin abbreviation | 8.1, 4.2, GR-6 |
| An article or a demonstrative adjective before a noun, when applicable | 4.5 |
| The "-ing" form only as a technical noun or as a modifier in one | 3.5 |
| American English spelling | 1.14 |

A word count is not a usual word count (Rules 8.4 thru 8.7). Each of these
counts as **one** word: a number, a number with its unit, an abbreviation, an
alphanumeric identifier, quoted text, a heading, a proper noun, a hyphenated
group, and all the text in parentheses. A code block or a command is not text,
and the limits do not apply to it.

## The substitutions that recur

These come up in almost all software text. Learn them, and look up the rest.

| Not approved | Use |
| --- | --- |
| ensure, verify | make sure |
| perform, execute | do |
| utilize, leverage | use |
| should | must |
| however | but |
| therefore | thus, as a result |
| i.e., e.g. | that is, for example |
| prior to | before |
| in order to | to |
| attempt | try |
| terminate | stop |
| require | need (v), necessary (adj) |
| additional | more |
| via | with, by, through |

`references/software-domain.md` has the full list for software, cloud, and
operations work.

## Technical nouns and technical verbs

The dictionary holds no domain terms. Rule 1.5 permits a noun in one of 22
categories, and Rule 1.12 permits a verb in one of 4. This is how `pod`,
`token`, and `deploy` become usable while `leverage` does not. Two constraints
matter more than the category lists:

- **Prefer an approved verb.** `Find the broken wires`, not `detect the broken
  wires` (1.12).
- **One term for one thing.** Do not call the same item a `service`, an `app`,
  and a `deployment` in one document (1.11).

A word that is in neither dictionary is a candidate technical noun or verb.
Confirm its category, then use the same word everywhere.

## Safety instructions

A **warning** is about injury or death. A **caution** is about damage to
equipment. When both apply, use a warning (7.1). Start with the command or the
condition (7.2), then give the risk or the result (7.3). A note gives
information only (5.5). Destructive commands and data loss get a caution.

```
CAUTION: DO NOT RUN THIS COMMAND ON THE PRODUCTION DATABASE. THE COMMAND
ERASES ALL THE RECORDS IN THE TABLE, AND YOU CANNOT GET THEM AGAIN.
```

## Audits

An audit gives a report, not a rewrite. Give the rule number and the offending
text for each finding, and the approved alternative from the dictionary for
each word finding. Report only what you found by reading. A verdict of
"compliant" needs the rules that the text obeys, not a score.

## Final checklist

- Each word is approved, a technical noun, or a technical verb (1.1), used as
  its approved part of speech (1.2) and meaning (1.3).
- The voice is active, except a descriptive sentence with an unknown agent (3.6).
- Instructions are imperative (5.3), one instruction in a sentence (5.2), with
  the condition in front of the command (5.4).
- Each paragraph has one topic (6.5), and the information is gradual (6.1).
- Notes give information only (5.5).
- Safety instructions give the risk level, the command or the condition, and
  the consequence (7.1 thru 7.3).
- The same item has the same name everywhere (1.11), and the same type of step
  has the same words (9.4).

## Example

Non-STE:

> The configuration has been validated by the pipeline; the operator should
> then verify the credentials.

STE:

> The pipeline validates the configuration. Then, make sure that the
> credentials are correct.

## References

Read these as you need them.

| File | Read it when |
| --- | --- |
| `references/writing-rules.md` | You need the text of a rule, its exceptions, or an example pair. All 53 rules and the 8 general recommendations. |
| `references/word-selection.md` | You must decide if a word is usable: the decision flow, verb types, and the 39 recurring errors. |
| `references/software-domain.md` | The text is about software, cloud, or operations: category mapping and the substitutions that recur there. |
| `references/dictionary-approved.md` | Confirm a word and read its approved meaning. `grep -i "^WORD "`. |
| `references/dictionary-unapproved.md` | Find the approved alternatives for a word. `grep -i "^word "`. |

Scope: Part 1 (the 53 rules), Part 2 (the dictionary), and GR-1 thru GR-6 and
GR-8. GR-7 (inclusive language) is out of scope.
