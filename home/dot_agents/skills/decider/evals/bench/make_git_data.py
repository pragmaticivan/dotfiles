#!/usr/bin/env python3
"""Build a dataset from git log output on stdin.

  git log --no-merges --format='@@@%H %s' --stat -p --unified=1 | make_git_data.py commit_type data/commit_type.jsonl
  git log --no-merges --format='@@@%H' --name-only | make_git_data.py docs_only data/docs_only.jsonl
"""
import json
import random
import re
import sys

DOCS = re.compile(r"(\.md$|^docs/|(^|/)README)", re.IGNORECASE)
SUBJECT = re.compile(r"^(feat|fix|chore)(\([^)]*\))?!?: ")
PER_LABEL = 20
MAX_STATE = 3000


def commits(text):
    for block in text.split("@@@")[1:]:
        head, _, body = block.partition("\n")
        yield head, body.strip("\n")


def commit_type(text):
    for head, body in commits(text):
        sha, _, subject = head.partition(" ")
        match = SUBJECT.match(subject)
        if match and body:
            yield match.group(1), {"id": f"commit_type-{sha[:8]}", "state": body[:MAX_STATE]}


def docs_only(text):
    for sha, body in commits(text):
        files = [line for line in body.splitlines() if line]
        if files:
            label = "yes" if all(DOCS.search(f) for f in files) else "no"
            yield label, {"id": f"docs_only-{sha[:8]}", "state": "Changed files:\n" + "\n".join(files[:40])}


def main():
    mode, out = sys.argv[1], sys.argv[2]
    by_label = {}
    for label, item in {"commit_type": commit_type, "docs_only": docs_only}[mode](sys.stdin.read()):
        by_label.setdefault(label, []).append({**item, "label": label})
    rng = random.Random(7)
    items = [item for label in sorted(by_label) for item in rng.sample(by_label[label], min(PER_LABEL, len(by_label[label])))]
    rng.shuffle(items)
    with open(out, "w") as handle:
        handle.writelines(json.dumps(item) + "\n" for item in items)
    print(mode, len(items), {label: sum(i["label"] == label for i in items) for label in sorted(by_label)})


if __name__ == "__main__":
    main()
