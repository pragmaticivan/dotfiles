#!/usr/bin/env python3
"""Convert a ticket from references/templates.md to Jira ADF JSON for `acli --description-file`.

Usage: md_to_adf.py <ticket.md> > description.json
Drops the `# title` line, because the title is the Jira Summary.
Handles the template's Markdown only: `##` headings, paragraphs, `- [ ]` task items,
`- ` bullets, `1.` numbered items, a `| table |`, `**bold**`, and `` `code` ``.
"""
import json
import re
import sys
import uuid

INLINE = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`)")


def inline(text):
    nodes = []
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**"):
            nodes.append({"type": "text", "text": part[2:-2], "marks": [{"type": "strong"}]})
        elif part.startswith("`"):
            nodes.append({"type": "text", "text": part[1:-1], "marks": [{"type": "code"}]})
        else:
            nodes.append({"type": "text", "text": part})
    return nodes


def para(text):
    return {"type": "paragraph", "content": inline(text)}


def table(rows):
    cells = [[c.strip() for c in r.strip("|").split("|")] for r in rows if not re.match(r"^\|[-| ]+\|$", r)]
    return {"type": "table", "content": [
        {"type": "tableRow", "content": [
            {"type": "tableHeader" if i == 0 else "tableCell", "content": [para(c)]} for c in row]}
        for i, row in enumerate(cells)]}


def convert(md):
    blocks, group, kind = [], [], None

    def flush():
        nonlocal group, kind
        if kind == "task":
            blocks.append({"type": "taskList", "attrs": {"localId": str(uuid.uuid4())}, "content": [
                {"type": "taskItem", "attrs": {"localId": str(uuid.uuid4()), "state": "TODO"}, "content": inline(t)}
                for t in group]})
        elif kind in ("bulletList", "orderedList"):
            blocks.append({"type": kind, "content": [{"type": "listItem", "content": [para(t)]} for t in group]})
        elif kind == "table":
            blocks.append(table(group))
        group, kind = [], None

    for line in md.splitlines():
        patterns = [("task", r"^- \[ \] (.*)"), ("bulletList", r"^- (.*)"), ("orderedList", r"^\d+\. (.*)"), ("table", r"^(\|.*\|)$")]
        for name, pattern in patterns:
            if m := re.match(pattern, line):
                if kind != name:
                    flush()
                kind = name
                group.append(m.group(1))
                break
        else:
            flush()
            if line.startswith("# ") or not line.strip():
                continue
            if m := re.match(r"^(#{2,6}) (.*)", line):
                blocks.append({"type": "heading", "attrs": {"level": len(m.group(1))}, "content": inline(m.group(2))})
            else:
                blocks.append(para(line))
    flush()
    return {"type": "doc", "version": 1, "content": blocks}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1]) as f:
        json.dump(convert(f.read()), sys.stdout)
