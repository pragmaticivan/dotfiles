---
name: simplified-technical-english
description: 'Writes, rewrites, and audits text in ASD-STE100 Simplified Technical English (STE) Issue 9 — the controlled-language standard for technical documentation: 875 approved words, 53 rules, a 20-word limit for procedures and 25 for descriptions, active voice, one instruction per step. Use this skill whenever someone asks for Simplified Technical English, STE, ASD-STE100, a controlled language, or plain technical English — and also when they want a runbook, procedure, README, API doc, incident update, alert text, error message, or safety warning that non-native readers, translators, or a new on-call engineer can follow without ambiguity. Trigger on "rewrite this so anyone can follow it", "make these steps unambiguous", "simplify this documentation", "is this doc STE-compliant", "check this text against the standard", "our docs are too wordy", or "write a procedure for X". Bundles a deterministic checker and the full Part 2 dictionary, so compliance is verified and not estimated.'
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Simplified Technical English (ASD-STE100 Issue 9)

STE is a controlled natural language: a restricted dictionary of 875 approved
words plus 53 writing rules. It exists because ambiguous technical text causes
accidents, bad translations, and repeated support questions. A reader with weak
English, a machine translator, and a tired on-call engineer at 03:00 all read
STE the same way, and that is the point.

The dictionary is not a style preference. In STE, `ensure` is wrong and
`make sure` is right, `perform` is wrong and `do` is right, `should` is wrong
and `must` is right. Fluent English is not the target — one meaning per word is.

## Two types of text, two sets of limits

Decide this first, because every later limit depends on it:

- **Procedural** (Section 5) — instructions that tell the reader what to do.
  Imperative form, one instruction per sentence, maximum 20 words.
- **Descriptive** (Section 6) — information, not instructions: an overview, a
  system description, a report, or a note inside a procedure. The imperative
  form is not permitted. Maximum 25 words.

Most real documents mix the two. Keep them in separate blocks and never mix
them in one vertical list (Rule 4.3).

## Mode 1: write new STE text

1. Decide the type of each block: procedural or descriptive.
2. Write the draft. Prefer approved verbs, one action per sentence, and the
   active voice. Do not chase word counts yet — get the content right first.
3. Select the words. Obey the flow in `references/word-selection.md`. Look a
   word up when you are not sure:
   ```bash
   python3 scripts/ste_check.py --lookup ensure     # -> NOT APPROVED: use MAKE SURE (v)
   grep -i "^ACCESS " references/dictionary-approved.md
   grep -i "^accomplish " references/dictionary-unapproved.md
   ```
4. Run the checker on the draft and fix every `error`:
   ```bash
   python3 scripts/ste_check.py draft.md
   ```
5. Judge each `warn` and `info` yourself — those are the rules a script cannot
   settle. Read "How to judge the checker output" below.
6. Do the final checklist.

## Mode 2: rewrite existing text into STE

Work sentence by sentence and preserve the technical content exactly. STE
changes the words, never the facts. Deleting a caveat or a limit value is a
worse failure than a rule breach.

For each sentence:

1. Ask what the reader must **do** or **know**. Write that as the new sentence.
2. Replace unapproved words. When the approved alternative has a different part
   of speech, change the construction — a word-for-word swap is not always
   possible (Rules 1.2, 9.1).
3. Split the sentence when it holds more than one action or is over the limit.
4. Turn passive into active by naming the agent (Rule 3.6).
5. Convert prose lists into vertical lists (Rule 4.3).

Then run the checker over the result and report what you changed. Deliver the
rewritten text plus a short table of the substantive rewrites (rule, before,
after) — reviewers need to see that no facts moved. Do not list every `the` you
added.

## Mode 3: audit text for STE compliance

Produce a report, not a rewrite. Use this structure:

```markdown
# STE compliance audit: <file or document name>

## Verdict
<Compliant | Not compliant> — <n> errors, <n> items that need a decision.
Checked against ASD-STE100 Issue 9 with scripts/ste_check.py.

## Summary
| Rule | Section | Findings | Severity |
|------|---------|----------|----------|

## Findings
### <rule number> — <rule title>
- `file:line` — <the offending text>
  - Why it breaches the rule: <one sentence>
  - Suggested STE: <the corrected text>

## Items that need a human decision
<technical nouns to confirm, past participles that may be adjectives>

## What is already correct
<name the rules the text obeys, so the author knows what to keep>
```

Run the checker first, then read the text yourself for the rules the checker
cannot see: one topic per paragraph (6.5), gradual information (6.1),
consistent terminology (1.11, 9.4), notes that hide instructions (5.5), and
safety instructions with no stated consequence (7.3).

## Core limits

These always apply. Numbers are the rules in Part 1 of the standard.

| Limit | Rule |
| --- | --- |
| Maximum 20 words in a procedural sentence, safety instructions included | 5.1 |
| Maximum 25 words in a descriptive sentence | 6.3 |
| Maximum 25 words in a sentence of a note | 5.5 |
| Maximum six sentences in a paragraph | 6.6 |
| Maximum three words in a multi-word noun | 2.1 |
| Only these verb forms: infinitive, imperative, simple present, simple past, simple future, past participle as an adjective | 3.2 |
| Active voice. In descriptive text, the passive is permitted only if the agent is unknown | 3.6 |
| One instruction in a sentence, unless the actions occur at the same time | 5.2 |
| No semicolon | 8.1 |
| An article (the, a, an) or a demonstrative adjective (this, these) before a noun, when applicable | 4.5 |
| No contractions and no omitted words | 4.2 |
| The "-ing" form only as a technical noun or as a modifier in one | 3.5 |
| American English spelling | 1.14 |

Word count is not a word count in the usual sense (Rules 8.4 thru 8.7). Each
of these counts as **one** word: a number, a number with its unit, an
abbreviation, an alphanumeric identifier, quoted text, a heading or placard
text, a proper noun, a hyphenated group, and all the text inside parentheses.
A colon in a vertical list ends a sentence, and each item after it is a new
sentence with its own limit. `python3 scripts/ste_check.py --stats FILE` counts
this way, so use it instead of counting by hand.

## Technical nouns and technical verbs

The dictionary holds no domain terms, and it does not need to. Rule 1.5 permits
a noun that fits one of 22 categories, and Rule 1.12 permits a verb that fits
one of 4. This is how `pod`, `token`, `firewall`, `reboot`, and `deploy` become
usable in STE while `leverage` and `utilize` do not.

Two constraints matter more than the category lists:

- **Prefer an approved dictionary verb.** Rule 1.12 tells you not to use a
  technical verb when approved words say the same thing. `Find the broken
  wires`, not `detect the broken wires`.
- **One term for one thing.** Rule 1.11 forbids calling the same item a
  `service`, an `app`, and a `deployment` in one document. Pick one and repeat
  it, even where a thesaurus tempts you.

`references/software-domain.md` maps the categories onto software, platform,
and infrastructure work, and gives the substitutions that come up most in that
writing. Read it whenever the text is about code, cloud, or operations.

## Safety instructions

A **warning** tells the reader about a risk of injury or death. A **caution**
tells the reader about a risk of damage to equipment. When both apply, use a
warning (Rule 7.1). Start with the command or the condition (7.2), then state
the risk or the result (7.3). A note is information only — never an instruction
(5.5).

The same structure carries directly into software: destructive commands,
production changes, and data loss deserve a caution with a stated consequence.

```
CAUTION: DO NOT RUN THIS COMMAND ON THE PRODUCTION DATABASE. THE COMMAND
ERASES ALL THE RECORDS IN THE TABLE, AND YOU CANNOT GET THEM AGAIN.
```

## How to judge the checker output

`scripts/ste_check.py` proves what is mechanical and defers what is not. Treat
the three severities differently, and never report text as compliant on the
strength of `0 error` alone:

| Severity | What it means | What you do |
| --- | --- | --- |
| `error` | The rule is broken and the script can prove it: word count, semicolon, contraction, perfect or progressive tense, Latin abbreviation, a word refused for the part of speech it is used in. | Fix it. |
| `warn` | The rule needs a decision the script cannot make: a possible technical noun, a possible multi-word noun, an "-ing" form, a past participle that may be an adjective (3.3) and not a passive verb (3.6). | Decide, and say why in your report. |
| `info` | The word is in neither list. It is a candidate technical noun or verb. | Confirm the category, and keep the term consistent (1.11). |

A false `warn` on a real technical noun is expected behavior, not a bug: the
standard itself cannot decide that question without your domain glossary.

## Examples

**1. Passive, perfect tense, and a semicolon (3.4, 3.6, 8.1)**

Non-STE: `The configuration has been validated by the pipeline; the operator
should then verify the credentials.`

STE: `The pipeline validates the configuration. Then, make sure that the
credentials are correct.`

**2. Two instructions and a hidden condition in one step (5.2, 5.4)**

Non-STE: `Restart the pods and scale the deployment when the queue is empty.`

STE:
```
1. When the queue is empty, start the pods again.
2. Increase the number of replicas of the deployment.
```

**3. A long multi-word noun (2.1)**

Non-STE: `service deployment configuration validation failure`

STE: `a failure in the validation of the configuration of the deployment` —
or, better, name the thing the reader knows: `a validation failure of the
deployment configuration` (3 words + preposition).

**4. A note that is really an instruction (5.5)**

Non-STE: `NOTE: Make sure that you rotate the key before the deploy.`

STE: make it a work step, because a reader who skips the notes must still be
able to do the procedure correctly:
```
3. Before the deploy, turn the key to the new value.
```

**5. A vague warning (7.1, 7.3)**

Non-STE: `CAUTION: EXTREME CARE IS REQUIRED WITH THE MIGRATION SCRIPT.`

STE: `WARNING: DO NOT RUN THE MIGRATION SCRIPT WHILE THE SERVER OPERATES. THE
SCRIPT LOCKS THE TABLE, AND THE SERVICE STOPS FOR ALL THE USERS.`

## Final checklist

Before you deliver text as STE, confirm each item. The rule numbers let a
reviewer check your work against the standard.

- Every word is approved in the dictionary, a technical noun, or a technical
  verb (1.1), used as its approved part of speech (1.2) and meaning (1.3).
- Verbs use only the approved forms and tenses (3.2). No perfect tense, no
  progressive form, no "-ing" verbs (3.4, 3.5).
- The voice is active, except where a descriptive sentence has an unknown agent
  (3.6).
- Instructions are imperative (5.3), one instruction per sentence (5.2), with
  conditions in front of the command (5.4).
- Sentences obey 20 words for procedures (5.1) and 25 for descriptions and
  notes (6.3, 5.5), counted the STE way (8.4 thru 8.7).
- Each paragraph has one topic (6.5) and six sentences at most (6.6).
- Multi-word nouns have three words at most (2.1).
- No semicolon (8.1), no contraction (4.2), no Latin abbreviation (GR-6).
- Notes give information only (5.5).
- Safety instructions state the risk level, the command or condition, and the
  consequence (7.1 thru 7.3).
- The same item has the same name everywhere (1.11), and the same type of step
  uses the same wording (9.4).
- The checker reports zero errors, and you have a stated decision for each
  warning.

## References

Read these as you need them — the SKILL.md body is enough for most rewrites.

| File | Read it when |
| --- | --- |
| `references/writing-rules.md` | You need the exact text of a rule, its exceptions, or an example pair. All 53 rules and the 8 general recommendations. |
| `references/word-selection.md` | You must decide if a word is usable: the full decision flow, the dictionary format, verb types, and the 39 recurring errors. |
| `references/software-domain.md` | The text is about software, cloud, or operations: category mapping, the substitutions that recur in that writing, and glossary practice. |
| `references/dictionary-approved.md` | Confirm a word is approved and read its approved meaning. 875 approved words, one line per part of speech. `grep -i "^WORD "`. |
| `references/dictionary-unapproved.md` | Find the approved alternatives for a word that is not approved. 1274 entries. `grep -i "^word "`. |
| `scripts/ste_check.py` | Always, before you claim compliance. `--lookup WORD`, `--stats`, `--json`, `--mode procedure`, `--severity error`. |

Scope: this skill covers Part 1 (the 53 writing rules) and Part 2 (the
dictionary) of ASD-STE100 Issue 9, and the general recommendations GR-1 thru
GR-6 and GR-8. GR-7 (inclusive language) is out of scope.
