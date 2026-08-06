#!/usr/bin/env python3
"""Labeled regression suite for ste_check.py.

The four evals in evals.json measure agent behavior and need agent runs. This
file measures the checker itself, which is deterministic, so it runs anywhere in
under a second.

Each case carries the verdict a human gives it, so a change to the checker shows
up as a moved number and not as an opinion:

  "error"  a true positive. The standard refuses this, and it must stay an error.
  "warn"   the checker cannot settle it. Rule 1.5 lets a technical noun through,
           so a noun reading of a word refused as a verb needs a human decision.
  "clean"  correct STE. An error here is a false alarm.

Usage: python3 evals/checker_regression.py [--verbose]
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                os.pardir, "scripts"))
import ste_check as stec  # noqa: E402

SKILL = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)

# (label, text, want, rules_of_interest)
# `want` is the worst severity the case may produce for those rules.
CASES = [
    # ---- true positives: the standard names each substitution -------------
    ("recurring verb: should", "You should read the file.", "error", {"1.1"}),
    ("recurring verb: verify", "Verify the config.", "error", {"1.1"}),
    ("recurring verb: ensure", "Ensure the pods are correct.", "error", {"1.1"}),
    ("recurring verb: delete", "Delete the record.", "error", {"1.1"}),
    ("recurring verb: utilize", "Utilize the script.", "error", {"1.1"}),
    ("recurring adj: every", "Every record is correct.", "error", {"1.1"}),
    ("recurring adj: both", "Both records are correct.", "error", {"1.1"}),
    ("recurring adv: never", "Never stop the server.", "error", {"1.1"}),
    ("perfect tense", "The task has been done.", "error", {"3.4"}),
    # Rule 3.5 needs a human decision, because an "-ing" form can be a technical
    # noun. A warn is the designed result, and not a miss.
    ("progressive form", "The server is starting.", "warn", {"3.5"}),
    ("semicolon", "Read the file; then stop.", "error", {"8.1"}),
    ("contraction", "Do not use it, it isn't correct.", "error", {"4.2"}),
    ("Latin abbreviation", "Use the flag, e.g. the long form.", "error", {"GR-6"}),
    ("descriptive sentence over 25 words, one line",
     "The checker reads the file and then it counts the words in each sentence "
     "and it reports the rule number and the approved word for each error that "
     "it finds in the text.", "error", {"6.3", "5.1"}),
    # The same sentence, hard-wrapped. A line break is not the end of a
    # sentence, so this must break the same limit.
    ("descriptive sentence over 25 words, hard-wrapped",
     "The checker reads the file and then it counts the words in each\n"
     "sentence and it reports the rule number and the approved word for\n"
     "each error that it finds in the text.", "error", {"6.3", "5.1"}),
    ("paragraph over 6 real sentences",
     "One is correct. Two is correct. Three is correct. Four is correct. "
     "Five is correct. Six is correct. Seven is correct.", "error", {"6.6"}),

    # ---- a noun reading needs a human, and not a hard error ---------------
    ("noun after a determiner", "The two files are correct.", "warn", {"1.1"}),
    ("noun after `and`", "Markdown and text files are correct.", "warn", {"1.1"}),
    ("noun after another noun", "The command reads the config files.", "warn", {"1.1"}),
    ("noun as a subject before a copula", "Error and log strings are correct.", "warn", {"1.1"}),
    ("plural noun subject", "The config keys are correct.", "warn", {"1.1"}),
    # `prompt` is refused as an adjective, where it means "immediately". Rule
    # 1.5 lets the software noun through, so this is a decision and not an error.
    ("technical noun refused as an adjective", "The hook sends the prompt.", "warn", {"1.1"}),
    ("technical noun refused as an adjective, object",
     "The card is in the prompt.", "warn", {"1.1"}),

    # ---- holes the noun escape must not open ------------------------------
    # An adjective modifies the noun after it, so each of these must stay an
    # error even though the word follows a determiner.
    ("attributive adjective", "The common case is correct.", "error", {"1.1"}),
    ("attributive adjective, after `an`", "This is an impossible condition.", "error", {"1.1"}),
    ("recurring adjective: main", "The main cause is correct.", "error", {"1.1"}),
    # `required` is in RECURRING_ERRORS and its dictionary headword is `require`,
    # so the block must test the word and the headword.
    ("recurring adjective: required", "The required field is correct.", "error", {"1.1"}),
    ("coordinated imperative", "Read the file and delete the record.", "error", {"1.1"}),
    ("imperative after `then`", "Then delete the record.", "error", {"1.1"}),
    ("verb after a modal", "You must utilize the script.", "error", {"1.1"}),
    ("verb after `to`", "Use the tool to verify the config.", "error", {"1.1"}),
    ("adverb", "Do it now.", "error", {"1.1"}),
    ("preposition", "One report per machine.", "error", {"1.1"}),

    # ---- a wrapped inline code span stays exempt -------------------------
    # The words in a code span are unchangeable (Rule 8.6). A span that wraps
    # over two lines must not leak its words to the dictionary check.
    ("inline code span that wraps",
     "Use `Find the broken\nwires`, not `delete the broken wires`.", "clean", {"1.1"}),

    # ---- correct STE: an error here is a false alarm ----------------------
    ("approved imperative", "Do the procedure.", "clean", {"1.1", "5.1"}),
    ("approved make sure", "Make sure that the pods are correct.", "clean", {"1.1"}),
    ("four real sentences, hard-wrapped",
     "The card is correct, each time. The hook gives you the full text with\n"
     "each card, and it starts before your first reply, so this file holds no\n"
     "copy of it. The template is the single source. Change that one file,\n"
     "then use the tool.", "clean", {"6.6"}),
    ("a fenced block is not read",
     "Do the procedure.\n\n```\nYou should verify every file; don't stop.\n```",
     "clean", {"1.1", "8.1", "4.2"}),
    ("inline code is not read", "Use `should verify every` as the flag value.",
     "clean", {"1.1"}),
]

RANK = {"clean": 0, "info": 0, "warn": 1, "error": 2}


def worst(text, rules):
    dictionary = stec.Dictionary(
        os.path.join(SKILL, "references", "dictionary-approved.md"),
        os.path.join(SKILL, "references", "dictionary-unapproved.md"))
    found = [f for f in stec.check_text(text, "case", "auto", dictionary)
             if f.rule in rules]
    if not found:
        return "clean", []
    top = max(RANK[f.severity] for f in found)
    name = {0: "clean", 1: "warn", 2: "error"}[top]
    return name, found


def main():
    verbose = "--verbose" in sys.argv
    passed = failed = 0
    bad = []

    for label, text, want, rules in CASES:
        got, found = worst(text, rules)
        ok = RANK[got] == RANK[want]
        if ok:
            passed += 1
        else:
            failed += 1
            bad.append((label, want, got, found))
        if verbose:
            print(f"  {'PASS' if ok else 'FAIL'}  want {want:<5} got {got:<5}  {label}")

    print(f"\nchecker regression: {passed} pass, {failed} fail, "
          f"{len(CASES)} cases")
    for label, want, got, found in bad:
        print(f"\n  FAIL  {label}\n        want {want}, got {got}")
        for f in found[:3]:
            print(f"        [{f.rule}] {f.severity}: {f.message}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
