#!/usr/bin/env python3
"""Fetch the Anthropic skill and prompting guides as Markdown into a local cache."""

import argparse
import pathlib
import sys
import urllib.request

BASE = "https://platform.claude.com/docs/en"
PROMPTING = f"{BASE}/build-with-claude/prompt-engineering"

DOCS = {
    "skill-best-practices.md": f"{BASE}/agents-and-tools/agent-skills/best-practices.md",
    "skills-overview.md": f"{BASE}/agents-and-tools/agent-skills/overview.md",
    "prompting-best-practices.md": f"{PROMPTING}/claude-prompting-best-practices.md",
    "prompting-fable-5.md": f"{PROMPTING}/prompting-claude-fable-5.md",
    "prompting-fable-5-1.md": f"{PROMPTING}/prompting-claude-fable-5-1.md",
    "prompting-opus-5-5.md": f"{PROMPTING}/prompting-claude-opus-5-5.md",
    "prompting-sonnet-5-5.md": f"{PROMPTING}/prompting-claude-sonnet-5-5.md",
    "llms.txt": "https://platform.claude.com/llms.txt",
}


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "tune-skill-fetch/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=pathlib.Path, default=pathlib.Path.home() / ".cache/tune-skill/docs")
    parser.add_argument("--url", action="append", default=[], help="Extra doc URL to fetch. Repeat for more.")
    args = parser.parse_args()

    docs = dict(DOCS)
    for url in args.url:
        docs[url.rstrip("/").rsplit("/", 1)[-1]] = url

    args.out.mkdir(parents=True, exist_ok=True)
    failed = 0
    for name, url in docs.items():
        try:
            text = fetch(url)
        except OSError as error:
            print(f"FAIL {url}: {error}", file=sys.stderr)
            failed += 1
            continue
        (args.out / name).write_text(text)
        print(f"ok   {args.out / name} ({len(text.splitlines())} lines)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
