#!/usr/bin/env python3
"""Check a ticket against its template in references/templates.md.

Usage: lint_ticket.py <story|task|bug|epic> <ticket.md> [<type> <ticket.md> ...]
Exit 0 when every ticket passes, 1 otherwise.
"""
import re
import sys
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parent.parent / "references" / "templates.md"
MARKER = re.compile(r"^(## .+|\*\*[^*]+\*\*|- \*\*[^*]+:\*\*)")


def required_markers():
    markers, current, in_fence = {}, None, False
    for line in TEMPLATES.read_text().splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
        elif not in_fence and line.startswith("## "):
            current = line[3:].strip().lower()
            markers[current] = []
        elif in_fence and current and (m := MARKER.match(line)):
            markers[current].append(m.group(1))
    return markers


def lint(kind, text, markers):
    problems = [f"missing `{m}`" for m in markers[kind] if not any(l.startswith(m) for l in text.splitlines())]
    if not text.startswith("# "):
        problems.append("first line must be `# <title>`")
    if re.search(r"<[A-Z][^>]*>", text):
        problems.append("unfilled `<placeholder>` left in the ticket")
    if kind != "epic" and not re.search(r"^- \[ \] ", text, re.M):
        problems.append("`Done when` has no `- [ ]` item")
    if "[blocking]" in text and re.search(r"Ready for an agent:\*\* yes", text):
        problems.append("says ready for an agent but has a [blocking] question")
    return problems


def main(args):
    if not args or len(args) % 2:
        sys.exit(__doc__)
    markers, failed = required_markers(), False
    for kind, path in zip(args[::2], args[1::2]):
        if kind not in markers:
            sys.exit(f"unknown type {kind!r}, use one of {sorted(markers)}")
        problems = lint(kind, Path(path).read_text(), markers)
        failed |= bool(problems)
        print(f"{'FAIL' if problems else 'ok'}  {kind}  {path}")
        for p in problems:
            print(f"      {p}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
