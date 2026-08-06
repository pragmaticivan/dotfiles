#!/usr/bin/env python3
"""ASD-STE100 (Simplified Technical English) checker.

Checks text against the mechanically verifiable parts of ASD-STE100 Issue 9:
STE word counting (rules 8.4 thru 8.7), sentence and paragraph limits
(5.1, 5.5, 6.3, 6.6), banned punctuation and constructions (8.1, 4.2, 3.2,
3.4, 3.5, 3.6), Latin abbreviations (GR-6), and dictionary approval of every
word (1.1, 1.2, 9.2) against the bundled Part 2 word lists.

Judgment calls the script cannot make (is this word a technical noun? is this
past participle an adjective or a passive verb?) are reported as `warn` or
`info` so a human or a model decides. Only unambiguous breaches are `error`.

Usage:
  ste_check.py FILE [FILE ...]           # check files
  ste_check.py -                          # check stdin
  ste_check.py --mode procedure FILE      # force procedural limits (20 words)
  ste_check.py --json FILE                # machine-readable findings
  ste_check.py --lookup ensure            # dictionary lookup for one word
  ste_check.py --stats FILE               # counts only, no findings

Exit code 1 when any `error` finding exists, else 0.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict

REF_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references")
APPROVED_FILE = os.path.join(REF_DIR, "dictionary-approved.md")
UNAPPROVED_FILE = os.path.join(REF_DIR, "dictionary-unapproved.md")

PROCEDURAL_MAX = 20  # Rule 5.1
DESCRIPTIVE_MAX = 25  # Rule 6.3 and 5.5 (notes)
PARAGRAPH_MAX_SENTENCES = 6  # Rule 6.6
MULTIWORD_NOUN_MAX = 3  # Rule 2.1

# Rule 3.5: the only "-ing" words the dictionary approves.
APPROVED_ING = {
    "lighting", "opening", "routing", "servicing",
    "mating", "missing", "remaining", "something", "during",
}

# Rule 4.2: contractions are not permitted. The possessive 's is (GR-8).
CONTRACTIONS = {
    "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't",
    "can't", "won't", "wouldn't", "shouldn't", "couldn't", "haven't",
    "hasn't", "hadn't", "mustn't", "it's", "that's", "there's", "here's",
    "you're", "we're", "they're", "i'm", "let's", "you've", "we've",
    "they've", "i've", "you'll", "we'll", "they'll", "it'll", "i'd",
}

# GR-6: use English words, not Latin abbreviations.
LATIN_ABBREVIATIONS = {
    "e.g.": "for example", "eg.": "for example", "i.e.": "that is",
    "ie.": "that is", "etc.": "and so on", "etc": "and so on",
    "viz.": "namely", "cf.": "refer to", "n.b.": "note", "vs.": "or",
}

# Rule 3.2/3.4: irregular past participles that signal a complex construction
# or the passive voice when they follow an auxiliary verb.
IRREGULAR_PARTICIPLES = {
    "been", "begun", "broken", "brought", "built", "chosen", "come", "cut",
    "done", "driven", "eaten", "fallen", "felt", "found", "given", "gone",
    "held", "hit", "kept", "known", "left", "lost", "made", "meant", "met",
    "paid", "put", "read", "run", "seen", "sent", "set", "shown", "shut",
    "sold", "spent", "taken", "taught", "told", "thought", "understood",
    "won", "worn", "written",
}

AUXILIARY_PERFECT = {"has", "have", "had"}
AUXILIARY_BE = {"is", "are", "was", "were", "be", "been", "being", "am"}

UNITS = (
    r"mm|cm|m|km|in|ft|yd|kg|g|mg|lb|oz|l|ml|s|ms|us|ns|min|h|hr|hz|khz|mhz|ghz|"
    r"kb|mb|gb|tb|kib|mib|gib|tib|bps|kbps|mbps|gbps|rpm|psi|kpa|bar|v|mv|kv|a|ma|"
    r"w|kw|mw|ohm|Ω|°c|°f|°|%|qps|rps|req/s|vcpu|cpu|core|cores|node|nodes|pod|pods|replica|replicas"
)

NUMBER_UNIT_RE = re.compile(rf"\b\d[\d,._]*\s*(?:{UNITS})\b", re.IGNORECASE)
PLAIN_NUMBER_RE = re.compile(r"\b\d[\d,._]*\b")
PAREN_RE = re.compile(r"\([^()]*\)")
QUOTE_RE = re.compile(r"\"[^\"]*\"|“[^”]*”|`[^`]*`")
URL_RE = re.compile(r"https?://\S+|\b[\w./-]+\.(?:md|py|go|ts|js|json|yaml|yml|tf|sh)\b")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z'’\-/]*")

SEVERITY_ORDER = {"error": 0, "warn": 1, "info": 2}


@dataclass
class Finding:
    path: str
    line: int
    rule: str
    severity: str
    message: str
    fix: str = ""

    def render(self) -> str:
        tail = f" -> {self.fix}" if self.fix else ""
        return f"{self.path}:{self.line}: [{self.rule}] {self.severity}: {self.message}{tail}"


# --------------------------------------------------------------------------
# Dictionary loading
# --------------------------------------------------------------------------

class Dictionary:
    """The bundled Part 2 word lists, indexed for lookup."""

    def __init__(self, approved_path: str, unapproved_path: str):
        self.approved: dict[str, list[str]] = {}      # headword -> [pos]
        self.meanings: dict[str, list[str]] = {}      # headword -> [meaning lines]
        self.forms: set[str] = set()                  # every usable inflected form
        self.unapproved: dict[str, list[str]] = {}    # headword -> [alternatives]
        self.unapproved_pos: dict[str, set[str]] = {}  # headword -> {pos}
        self.function_words: set[str] = set()         # art/prep/conj/pron/adv + verbs
        self._load_approved(approved_path)
        self._load_unapproved(unapproved_path)

    def _load_approved(self, path: str) -> None:
        entry = re.compile(r"^([A-Z][A-Z '\-/]*?)(?:\s+\(([a-z]+)\))?\s*=\s*(.+)$")
        with open(path, encoding="utf-8") as handle:
            for raw in handle:
                match = entry.match(raw.rstrip("\n"))
                if not match:
                    continue
                word, pos, meaning = match.group(1).strip(), match.group(2) or "", match.group(3)
                key = word.lower()
                self.approved.setdefault(key, [])
                if pos and pos not in self.approved[key]:
                    self.approved[key].append(pos)
                self.meanings.setdefault(key, []).append(f"({pos}) {meaning}" if pos else meaning)
                self.forms.update(key.split())
                self.forms.add(key)
                if pos in {"art", "prep", "conj", "pron", "adv", "v"}:
                    self.function_words.update(key.split())
                for form in self._bracket_forms(meaning):
                    self.forms.add(form)
                    self.forms.update(form.split())

    @staticmethod
    def _bracket_forms(meaning: str) -> list[str]:
        """Pull the inflected forms the dictionary lists in [SQUARE BRACKETS]."""
        found: list[str] = []
        for block in re.findall(r"\[([^\]]*)\]", meaning):
            head = block.split(";")[0].replace("also", "")
            if not head.strip() or not re.fullmatch(r"[A-Z ,()'\-/]*", head):
                continue
            for item in re.split(r"[,()]", head):
                item = item.strip().lower()
                if item and item != "also":
                    found.append(item)
        return found

    def _load_unapproved(self, path: str) -> None:
        entry = re.compile(r"^([a-z][a-z '\-/]*?)(?:\s+\(([a-z]+)\))?\s*->\s*(.+)$")
        with open(path, encoding="utf-8") as handle:
            for raw in handle:
                match = entry.match(raw.rstrip("\n"))
                if not match:
                    continue
                word, pos = match.group(1).strip(), match.group(2) or ""
                alternatives = match.group(3).strip()
                self.unapproved.setdefault(word, [])
                if alternatives not in self.unapproved[word]:
                    self.unapproved[word].append(alternatives)
                self.unapproved_pos.setdefault(word, set())
                if pos:
                    self.unapproved_pos[word].add(pos)

    def variants(self, token: str) -> list[str]:
        """Plausible base forms of a token, for Rule 1.4 form matching."""
        candidates = [token]
        if token.endswith("s") and len(token) > 3:
            candidates += [token[:-1], token[:-2]] if token.endswith("es") else [token[:-1]]
        if token.endswith("ies") and len(token) > 4:
            candidates.append(token[:-3] + "y")
        if token.endswith("ed") and len(token) > 3:
            candidates += [token[:-2], token[:-1]]
            if len(token) > 5 and token[-3] == token[-4]:
                candidates.append(token[:-3])
        if token.endswith(("er", "est")):
            candidates.append(token[:-2] if token.endswith("er") else token[:-3])
        return candidates

    def status(self, token: str) -> tuple[str, list[str], str]:
        """('approved'|'unapproved'|'unknown', alternatives, matched headword)."""
        low = token.lower()
        if low in self.forms or low in self.approved:
            return "approved", [], low
        if low in self.unapproved:
            return "unapproved", self.unapproved[low], low
        for variant in self.variants(low):
            if variant in self.forms or variant in self.approved:
                return "approved", [], variant
            if variant in self.unapproved:
                return "unapproved", self.unapproved[variant], variant
        return "unknown", [], low


# --------------------------------------------------------------------------
# Sentence extraction and STE word counting
# --------------------------------------------------------------------------

@dataclass
class Sentence:
    text: str
    line: int
    kind: str  # 'procedure' | 'descriptive' | 'note'


def ste_word_count(sentence: str) -> int:
    """Count words the way rules 8.4 thru 8.7 count them.

    Parenthetical text, quoted text, a number, a number with its unit, an
    abbreviation, an alphanumeric identifier and a hyphenated group each count
    as one word.
    """
    text = sentence
    text = URL_RE.sub(" URLTOKEN ", text)
    text = PAREN_RE.sub(" PARENTOKEN ", text)        # Rule 8.5
    text = QUOTE_RE.sub(" QUOTETOKEN ", text)        # Rule 8.6 item 5
    text = NUMBER_UNIT_RE.sub(" NUMUNITTOKEN ", text)  # Rule 8.6 item 2
    text = PLAIN_NUMBER_RE.sub(" NUMTOKEN ", text)   # Rule 8.6 item 1
    tokens = [t for t in re.split(r"[\s,:;.!?]+", text) if t.strip(" -–—")]
    return len(tokens)


def content_words(sentence: str) -> list[tuple[str, str, str, str]]:
    """(word, preceding word, word before that, next word) to check against the dictionary.

    Masked elements are removed first: quoted text and abbreviations are
    unchangeable (8.6), and numbers and identifiers are not dictionary words.

    The next word decides two questions that the words before cannot. A copula
    after the word puts the word in the subject, which makes it a noun. And an
    adjective modifies a noun that comes after it, so a word with no noun after
    it is the head of its phrase.
    """
    text = URL_RE.sub(" ", sentence)
    text = QUOTE_RE.sub(" ", text)
    text = NUMBER_UNIT_RE.sub(" ", text)
    text = PLAIN_NUMBER_RE.sub(" ", text)
    # First pass: every token in order, with the surface form the neighbors see
    # and a mark for the tokens that end a phrase.
    stream: list[tuple[str, str, bool]] = []   # (token, surface, boundary_before)
    cursor = 0
    for match in WORD_RE.finditer(text):
        token = match.group(0)
        # After a comma or a period the next word starts a clause. That position
        # is the strongest signal of the imperative form, so keep it.
        boundary = bool(re.search(r"[,.;:!?]", text[cursor:match.start()]))
        cursor = match.end()
        if token.isupper() and len(token) > 1:   # abbreviation (8.6 item 3)
            surface = "@abbr"
        elif "-" in token:
            surface = "@hyphen"
        else:
            surface = token.lower()
        stream.append((token, surface, boundary))

    def is_content(token: str) -> bool:
        if token.isupper() and len(token) > 1:
            return False
        if any(char.isdigit() for char in token) or len(token) < 2:
            return False
        return token.lower() not in NUMBER_WORDS   # Rule 8.6 item 1

    pairs: list[tuple[str, str, str, str]] = []
    for position, (token, _surface, _boundary) in enumerate(stream):
        if not is_content(token):
            continue
        previous = before = ""
        for offset in (1, 2):
            index = position - offset
            if index < 0 or stream[index + 1][2]:   # a boundary cuts the view
                break
            value = stream[index][1]
            if offset == 1:
                previous = value
            else:
                before = value
        # The next word, unless a punctuation mark ends the phrase first.
        following = ""
        if position + 1 < len(stream) and not stream[position + 1][2]:
            following = stream[position + 1][1]
        pairs.append((token, previous, before, following))
    return pairs


NUMBER_WORDS = {
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty",
    "sixty", "seventy", "eighty", "ninety", "hundred", "thousand", "million",
    "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth",
    "ninth", "tenth",
}


DETERMINERS = {"the", "a", "an", "this", "these", "that", "those", "each", "all",
               "no", "its", "their", "your", "our", "some", "any", "one", "two",
               "of", "in", "on", "for", "with", "from", "at", "by", "every",
               "@abbr", "@hyphen"}
VERB_CUES = {"", "must", "can", "cannot", "will", "do", "does", "did", "not",
             "you", "we", "it", "they", "then", "and", "but", "to", "should",
             "shall", "may", "might", "would", "could", "always", "never"}

# The 39 recurring errors of the Part 2 introduction, less the entries whose
# correction depends on the part of speech (check, test, cover, damage, both,
# any, old, secure). The standard tells writers outright not to use these.
RECURRING_ERRORS = {
    "acceptable", "alternate", "avoid", "ensure", "fit", "follow", "further",
    "however", "insert", "main", "may", "need", "now", "people", "perform",
    "portion", "press", "reach", "repeat", "required", "rotate", "shall",
    "should", "since", "therefore", "using",
}


def guess_usage(word: str, previous: str, before: str, following: str = "") -> str:
    """'noun', 'verb' or 'unknown' — a cheap part-of-speech guess.

    STE approves or refuses a word per part of speech (Rules 1.2, 9.2), so the
    same spelling can be correct as a noun and wrong as a verb. The guess only
    decides how loudly to report a word: a noun reading may still be a valid
    technical noun (Rule 1.6), so it becomes a warning the reader resolves.
    """
    # A copula after the word puts the word in the subject, so it is a noun.
    # "Markdown and text files ARE correct" reads the same as "the files".
    if following in COPULAS:
        return "noun"
    if previous in DETERMINERS:
        return "noun"
    if previous in VERB_CUES:
        # A verb takes a determiner, a preposition, or nothing after it: "delete
        # THE record", "go TO the panel", "stop". A noun inside a compound noun
        # takes a second noun: "log STRINGS", "config FILES". Rule 2.1 expects
        # that compound, so read the first word as a noun.
        if following and following not in DETERMINERS \
                and following not in VERB_CUES and following != "@abbr":
            return "noun"
        return "verb"
    if before in DETERMINERS and previous not in VERB_CUES:
        return "noun"   # "the TEST switch", "the four screws"
    if word.lower().endswith(("tion", "ment", "ness", "ity", "ance", "ence")):
        return "noun"
    return "unknown"


# A word in front of one of these is the subject of the sentence, so it is a noun.
COPULAS = {"is", "are", "was", "were", "be", "has", "have", "had",
           "must", "can", "cannot", "will", "shall", "does", "do", "did"}


STEP_RE = re.compile(r"^\s*(?:[-*+]|\(?\d+[.)]|\(?[a-zA-Z][.)])\s+")
NOTE_RE = re.compile(r"^\s*(?:NOTE|Note)\b\s*[:.]?", re.IGNORECASE)
SAFETY_RE = re.compile(r"^\s*(?:WARNING|CAUTION|DANGER)\b\s*[:.]?")
HEADING_RE = re.compile(r"^\s*#{1,6}\s+|^\s*\|")   # headings and table rows
FENCE_RE = re.compile(r"^\s*(?:```|~~~)")


def imperative_start(sentence: str, dictionary: Dictionary) -> bool:
    """True when the sentence opens with an approved verb in command form."""
    words = WORD_RE.findall(sentence)
    if not words:
        return False
    first = words[0].lower()
    if first in {"do", "make"} and len(words) > 1:
        return True
    return first in dictionary.approved and "v" in dictionary.approved.get(first, [])


def join_wrapped(lines: list[str]) -> list[tuple[int, str]]:
    """Makes a hard-wrapped sentence whole again, and keeps its first line number.

    A line break is not the end of a sentence. Rule 6.6 counts the sentences in a
    paragraph, and Rules 5.1 and 6.3 count the words in a sentence, so a file that
    wraps one sentence over three lines must still give one sentence. Without this
    step a 34-word sentence hides from the 25-word limit, and a paragraph of four
    sentences reports seven.

    A line continues the line before it only when the line before does not end
    with a sentence mark, and the line itself does not start a new block.
    """
    units: list[list] = []
    in_fence = False
    for index, raw in enumerate(lines, start=1):
        if FENCE_RE.match(raw):
            in_fence = not in_fence
            units.append([index, raw])
            continue
        starts_block = bool(
            not raw.strip() or HEADING_RE.match(raw) or STEP_RE.match(raw)
            or NOTE_RE.match(raw.lstrip("-*+ ")) or SAFETY_RE.match(raw.lstrip("-*+ ")))
        if not in_fence and not starts_block and units:
            previous_index, previous_text = units[-1]
            if (previous_text.strip() and not FENCE_RE.match(previous_text)
                    and not HEADING_RE.match(previous_text)
                    and not previous_text.rstrip().endswith((".", "!", "?", ":"))):
                units[-1] = [previous_index, previous_text.rstrip() + " " + raw.strip()]
                continue
        units.append([index, raw])
    return [(index, text) for index, text in units]


def extract_sentences(lines: list[str], mode: str, dictionary: Dictionary) -> list[Sentence]:
    sentences: list[Sentence] = []
    in_fence = False
    for index, raw in join_wrapped(lines):
        if FENCE_RE.match(raw):
            in_fence = not in_fence
            continue
        if in_fence or not raw.strip():
            continue
        if HEADING_RE.match(raw):
            continue  # Rule 8.6: a heading counts as one word, not a sentence

        body = raw
        kind = mode
        is_step = bool(STEP_RE.match(raw))
        if NOTE_RE.match(raw.lstrip("-*+ ")):
            kind = "note"
        elif SAFETY_RE.match(raw.lstrip("-*+ ")):
            kind = "procedure"  # Rule 5.1 covers safety instructions
        elif mode == "auto":
            # A numbered or bulleted step is procedural (Section 5), unless it
            # opens with an article — Rule 4.3 starts the items of a descriptive
            # vertical list that way.
            stripped = STEP_RE.sub("", raw).strip()
            first = (WORD_RE.findall(stripped) or [""])[0].lower()
            if is_step:
                kind = "descriptive" if first in {"the", "a", "an", "this", "these"} \
                    else "procedure"
            else:
                kind = "procedure" if imperative_start(raw, dictionary) else "descriptive"

        body = STEP_RE.sub("", body)
        body = NOTE_RE.sub("", body)
        body = SAFETY_RE.sub("", body)

        # A colon ends a sentence for counting purposes (Rule 8.4).
        for part in re.split(r"(?<=[.!?:])\s+|(?<=:)$", body):
            part = (part or "").strip()
            if not part or not WORD_RE.search(part):
                continue
            sentences.append(Sentence(part, index, kind))
    return sentences


def paragraphs(lines: list[str]) -> list[tuple[int, list[str]]]:
    blocks: list[tuple[int, list[str]]] = []
    current: list[str] = []
    start = 1
    in_fence = False
    for index, raw in enumerate(lines, start=1):
        if FENCE_RE.match(raw):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if not raw.strip():
            if current:
                blocks.append((start, current))
                current = []
            continue
        if HEADING_RE.match(raw) or STEP_RE.match(raw):
            if current:
                blocks.append((start, current))
                current = []
            continue
        if not current:
            start = index
        current.append(raw)
    if current:
        blocks.append((start, current))
    return blocks


# --------------------------------------------------------------------------
# Checks
# --------------------------------------------------------------------------

def check_sentence(sentence: Sentence, path: str, dictionary: Dictionary) -> list[Finding]:
    findings: list[Finding] = []
    text = sentence.text
    lower = text.lower()
    line = sentence.line

    limit = PROCEDURAL_MAX if sentence.kind == "procedure" else DESCRIPTIVE_MAX
    rule = "5.1" if sentence.kind == "procedure" else ("5.5" if sentence.kind == "note" else "6.3")
    count = ste_word_count(text)
    if count > limit:
        findings.append(Finding(
            path, line, rule, "error",
            f"{sentence.kind} sentence has {count} STE words (max {limit}): "
            f"\"{text[:70]}{'...' if len(text) > 70 else ''}\"",
            "divide it into two sentences, each with one topic or one action",
        ))

    for match in re.finditer(";", text):
        start = max(0, match.start() - 25)
        findings.append(Finding(
            path, line, "8.1", "error",
            f"semicolon is not permitted in STE: \"...{text[start:match.end() + 15]}...\"",
            "write two separate sentences",
        ))

    for token in re.findall(r"[A-Za-z]+['’][a-z]+", text):
        if token.lower().replace("’", "'") in CONTRACTIONS:
            findings.append(Finding(path, line, "4.2", "error",
                                    f"contraction \"{token}\"",
                                    "write the words in full"))

    for abbreviation, replacement in LATIN_ABBREVIATIONS.items():
        if re.search(rf"(?<![\w.]){re.escape(abbreviation)}", lower):
            findings.append(Finding(path, line, "GR-6", "error",
                                    f"Latin abbreviation \"{abbreviation}\"",
                                    f"use \"{replacement}\""))

    tokens = [word.lower() for word in WORD_RE.findall(text)]
    for position, token in enumerate(tokens):
        nxt = tokens[position + 1] if position + 1 < len(tokens) else ""
        if not nxt:
            continue
        participle = nxt.endswith("ed") or nxt in IRREGULAR_PARTICIPLES
        if token in AUXILIARY_PERFECT and participle:
            findings.append(Finding(path, line, "3.4", "error",
                                    f"complex verb construction \"{token} {nxt}\" "
                                    "(perfect tense is not an approved tense)",
                                    "use the simple past tense"))
        elif token in AUXILIARY_BE and nxt.endswith("ing"):
            findings.append(Finding(path, line, "3.2", "error",
                                    f"progressive form \"{token} {nxt}\"",
                                    "use the simple present or simple past tense"))
        elif token in AUXILIARY_BE and participle:
            by_agent = re.search(rf"\b{re.escape(nxt)}\b\s+by\b", lower)
            findings.append(Finding(
                path, line, "3.6",
                "error" if by_agent else "warn",
                f"passive voice \"{token} {nxt}{' by ...' if by_agent else ''}\"",
                "make the agent the subject: \"the X does Y\". Rule 3.3 permits "
                "this form only when the past participle is an adjective that "
                "shows a condition",
            ))

    for token in re.findall(r"\b[a-z]+ing\b", lower):
        if token in APPROVED_ING:
            continue
        findings.append(Finding(path, line, "3.5", "warn",
                                f"\"-ing\" form \"{token}\"",
                                "permitted only as a technical noun or as a modifier "
                                "in a technical noun; otherwise rewrite with an "
                                "approved verb form"))

    if sentence.kind == "note" and imperative_start(text, dictionary):
        findings.append(Finding(path, line, "5.5", "error",
                                "a note gives information only, and this note "
                                "starts with an instruction",
                                "move the instruction into a numbered work step"))

    return findings


def check_vocabulary(sentence: Sentence, path: str, dictionary: Dictionary,
                     reported: set[str]) -> list[Finding]:
    findings: list[Finding] = []
    for word, previous, before, following in content_words(sentence.text):
        status, alternatives, headword = dictionary.status(word)
        key = word.lower()
        if status == "unapproved":
            entry_pos = dictionary.unapproved_pos.get(headword, set())
            usage = guess_usage(word, previous, before, following)
            # An adjective modifies a noun that comes after it. A word with no
            # noun after it heads its phrase, so it reads as a noun there, and
            # Rule 1.5 lets a technical noun through whatever the dictionary
            # says about the adjective. "The hook sends the PROMPT" is a noun.
            # "The COMMON case" is the adjective the dictionary refuses.
            heads_phrase = (not following or following in COPULAS
                            or following in VERB_CUES)
            # Rules 1.5 and 1.6 let an unapproved word through when it is a
            # technical noun, so a noun reading of a word that is refused only
            # as a verb needs a human decision. Nothing rescues the recurring
            # errors the standard names.
            # RECURRING_ERRORS holds the words the standard tells you not to
            # use. Test the word and its dictionary headword, because the set
            # holds an inflected form for `required` and the headword is
            # `require`.
            recurring = (headword in RECURRING_ERRORS or key in RECURRING_ERRORS)
            noun_escape = (usage == "noun" and "n" not in entry_pos
                           and (bool(entry_pos - {"adj", "adv", "prep", "conj", "pron"})
                                or heads_phrase)
                           and not recurring)
            shown = "/".join(sorted(entry_pos)) if entry_pos else "any part of speech"
            findings.append(Finding(
                path, sentence.line, "1.1", "warn" if noun_escape else "error",
                f"\"{word}\" is not approved as ({shown})"
                + (", and it reads as a noun here — confirm it is a technical "
                   "noun of an approved category (1.5)" if noun_escape else ""),
                f"use {alternatives[0]}" if alternatives else "use an approved word",
            ))
        elif status == "unknown" and key not in reported:
            reported.add(key)
            findings.append(Finding(path, sentence.line, "1.5/1.12", "info",
                                    f"\"{word}\" is not in the dictionary",
                                    "use it only if it is a technical noun or a "
                                    "technical verb of an approved category, and "
                                    "record it in the project glossary"))
    return findings


def check_multiword_nouns(sentence: Sentence, path: str,
                          dictionary: Dictionary) -> list[Finding]:
    """Rule 2.1: a multi-word noun has a maximum of three words."""
    findings: list[Finding] = []
    run: list[str] = []
    for word in WORD_RE.findall(sentence.text):
        low = word.lower()
        verb_form = low.endswith(("ed", "ing")) and low not in APPROVED_ING
        if low in dictionary.function_words or "-" in word or verb_form:
            if len(run) > MULTIWORD_NOUN_MAX:
                findings.append(Finding(
                    path, sentence.line, "2.1", "warn",
                    f"possible multi-word noun of {len(run)} words: \"{' '.join(run)}\"",
                    "use a maximum of three words. Use prepositions (of, on, in, "
                    "for) to break it up, or hyphenate the words that operate as "
                    "one unit",
                ))
            run = []
            continue
        run.append(word)
    if len(run) > MULTIWORD_NOUN_MAX:
        findings.append(Finding(
            path, sentence.line, "2.1", "warn",
            f"possible multi-word noun of {len(run)} words: \"{' '.join(run)}\"",
            "use a maximum of three words",
        ))
    return findings


def check_paragraphs(lines: list[str], path: str, mode: str,
                     dictionary: Dictionary) -> list[Finding]:
    findings: list[Finding] = []
    for start, block in paragraphs(lines):
        count = len(extract_sentences(block, mode, dictionary))
        if count > PARAGRAPH_MAX_SENTENCES:
            findings.append(Finding(path, start, "6.6", "error",
                                    f"paragraph has {count} sentences (max "
                                    f"{PARAGRAPH_MAX_SENTENCES})",
                                    "divide it into two paragraphs, each with one topic"))
    return findings


def check_text(text: str, path: str, mode: str, dictionary: Dictionary) -> list[Finding]:
    lines = text.splitlines()
    sentences = extract_sentences(lines, mode, dictionary)
    findings: list[Finding] = []
    reported_unknown: set[str] = set()
    for sentence in sentences:
        findings += check_sentence(sentence, path, dictionary)
        findings += check_vocabulary(sentence, path, dictionary, reported_unknown)
        findings += check_multiword_nouns(sentence, path, dictionary)
    findings += check_paragraphs(lines, path, mode, dictionary)

    unique: dict[tuple, Finding] = {}
    for finding in findings:
        unique.setdefault((finding.line, finding.rule, finding.message), finding)
    findings = sorted(unique.values(),
                      key=lambda f: (f.line, SEVERITY_ORDER[f.severity], f.rule))
    return findings


def summarize(text: str, path: str, mode: str, dictionary: Dictionary) -> dict:
    lines = text.splitlines()
    sentences = extract_sentences(lines, mode, dictionary)
    counts = [ste_word_count(s.text) for s in sentences] or [0]
    return {
        "path": path,
        "sentences": len(sentences),
        "procedural_sentences": sum(1 for s in sentences if s.kind == "procedure"),
        "descriptive_sentences": sum(1 for s in sentences if s.kind == "descriptive"),
        "notes": sum(1 for s in sentences if s.kind == "note"),
        "paragraphs": len(paragraphs(lines)),
        "longest_sentence_words": max(counts),
        "mean_sentence_words": round(sum(counts) / len(counts), 1),
    }


def lookup(word: str, dictionary: Dictionary) -> str:
    low = word.lower()
    out: list[str] = []
    if low in dictionary.approved:
        out.append(f"APPROVED: {word.upper()}")
        for meaning in dictionary.meanings[low]:
            out.append(f"  {meaning}")
    if low in dictionary.unapproved:
        out.append(f"NOT APPROVED: {low}")
        for alternative in dictionary.unapproved[low]:
            out.append(f"  -> {alternative}")
    if not out:
        status, alternatives, _ = dictionary.status(low)
        if status == "approved":
            return (f"APPROVED (inflected form of an approved word): {word}\n"
                    "  Refer to Rule 1.4 for the permitted forms.")
        if status == "unapproved":
            return f"NOT APPROVED: {word}\n  -> {alternatives[0]}"
        return (f"NOT IN THE DICTIONARY: {word}\n"
                "  Use it only as a technical noun (Rule 1.5) or a technical verb "
                "(Rule 1.12) of an approved category. If it is neither, do not use it.")
    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description="ASD-STE100 Simplified Technical English checker")
    parser.add_argument("paths", nargs="*", help="files to check, or - for stdin")
    parser.add_argument("--mode", choices=["auto", "procedure", "descriptive"], default="auto",
                        help="sentence-length regime: 20 words for procedures (5.1), "
                             "25 for descriptive text (6.3). Default auto-detects per line.")
    parser.add_argument("--json", action="store_true", help="emit findings as JSON")
    parser.add_argument("--stats", action="store_true", help="emit counts only")
    parser.add_argument("--lookup", metavar="WORD", help="look up one word in the dictionary")
    parser.add_argument("--severity", choices=["error", "warn", "info"], default="info",
                        help="minimum severity to report (default info)")
    args = parser.parse_args()

    dictionary = Dictionary(APPROVED_FILE, UNAPPROVED_FILE)

    if args.lookup:
        print(lookup(args.lookup, dictionary))
        return 0

    if not args.paths:
        parser.error("give at least one file, - for stdin, or --lookup WORD")

    documents: list[tuple[str, str]] = []
    for path in args.paths:
        if path == "-":
            documents.append(("<stdin>", sys.stdin.read()))
        else:
            with open(path, encoding="utf-8") as handle:
                documents.append((path, handle.read()))

    if args.stats:
        stats = [summarize(text, path, args.mode, dictionary) for path, text in documents]
        print(json.dumps(stats, indent=2) if args.json else
              "\n".join(f"{s['path']}: {s['sentences']} sentences, "
                        f"{s['paragraphs']} paragraphs, longest "
                        f"{s['longest_sentence_words']} words, mean "
                        f"{s['mean_sentence_words']}" for s in stats))
        return 0

    threshold = SEVERITY_ORDER[args.severity]
    findings: list[Finding] = []
    for path, text in documents:
        findings += [f for f in check_text(text, path, args.mode, dictionary)
                     if SEVERITY_ORDER[f.severity] <= threshold]

    if args.json:
        print(json.dumps([asdict(f) for f in findings], indent=2))
    else:
        for finding in findings:
            print(finding.render())
        errors = sum(1 for f in findings if f.severity == "error")
        warns = sum(1 for f in findings if f.severity == "warn")
        infos = sum(1 for f in findings if f.severity == "info")
        print(f"\n{errors} error, {warns} warn, {infos} info")
        if errors == 0:
            print("No rule breach that the checker can prove. Do the checklist in "
                  "SKILL.md for the rules that need judgment.")

    return 1 if any(f.severity == "error" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
