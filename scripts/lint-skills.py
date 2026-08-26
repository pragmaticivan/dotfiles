#!/usr/bin/env python3
"""Checks each skill in home/dot_agents/skills against the repository quality bar.

The bar has three parts. The frontmatter must give a name that matches the
directory. The description must fit in two terminal lines, because a long
description crowds the always-in-context skill list and does not improve
triggering. And each skill must ship evals, because a skill with no eval has no
evidence that it works.

Uses the standard library only. The repository ships no Python dependency, and
this check runs in CI on a bare checkout.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SKILLS_DIR = Path(__file__).resolve().parent.parent / "home/dot_agents/skills"

# Two lines of a 125-column terminal, less the "description: " prefix.
MAX_DESCRIPTION = 250

MIN_EVALS = 3
MIN_EXPECTATIONS = 4

FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
FIELD = re.compile(r"^(?P<key>[A-Za-z][A-Za-z0-9_-]*):\s*(?P<value>.*?)(?=\n[A-Za-z][A-Za-z0-9_-]*:|\Z)", re.DOTALL | re.MULTILINE)


def read_frontmatter(skill_md: Path) -> dict[str, str]:
    """Returns the frontmatter fields as flat strings.

    Parses by hand rather than with PyYAML, which the repository does not pin.
    Only scalar top-level fields matter here, so a field regex is enough.
    """
    match = FRONTMATTER.match(skill_md.read_text())
    if not match:
        raise ValueError("no YAML frontmatter")
    fields = {}
    for field in FIELD.finditer(match.group(1)):
        value = " ".join(field.group("value").split())
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            quote = value[0]
            value = value[1:-1]
            if quote == '"':
                value = value.replace('\\"', '"').replace("\\\\", "\\")
        fields[field.group("key")] = value
    return fields


def check_skill(skill: Path) -> list[str]:
    problems: list[str] = []
    skill_md = skill / "SKILL.md"

    if not skill_md.is_file():
        return ["no SKILL.md"]

    try:
        fields = read_frontmatter(skill_md)
    except ValueError as error:
        return [str(error)]

    name = fields.get("name")
    if name != skill.name:
        problems.append(f"frontmatter name {name!r} does not match the directory")

    description = fields.get("description", "")
    if not description:
        problems.append("no description")
    elif len(description) > MAX_DESCRIPTION:
        problems.append(f"description is {len(description)} characters, the limit is {MAX_DESCRIPTION}")

    problems.extend(check_evals(skill))
    return problems


def check_evals(skill: Path) -> list[str]:
    evals_json = skill / "evals" / "evals.json"
    if not evals_json.is_file():
        return ["no evals/evals.json"]

    try:
        data = json.loads(evals_json.read_text())
    except json.JSONDecodeError as error:
        return [f"evals/evals.json is not valid JSON: {error}"]

    problems: list[str] = []
    if data.get("skill_name") != skill.name:
        problems.append(f"evals skill_name {data.get('skill_name')!r} does not match the directory")

    cases = data.get("evals")
    if not isinstance(cases, list):
        return problems + ["evals/evals.json has no evals list"]
    if len(cases) < MIN_EVALS:
        problems.append(f"{len(cases)} eval case(s), the minimum is {MIN_EVALS}")

    seen: set[object] = set()
    for index, case in enumerate(cases):
        where = f"eval {case.get('id', index)}"
        if not isinstance(case, dict):
            problems.append(f"{where} is not an object")
            continue
        case_id = case.get("id")
        if case_id in seen:
            problems.append(f"{where} repeats an id")
        seen.add(case_id)
        for field in ("prompt", "expected_output"):
            if not str(case.get(field, "")).strip():
                problems.append(f"{where} has no {field}")
        if "assertions" in case:
            problems.append(f"{where} uses 'assertions'; the field is 'expectations'")
        expectations = case.get("expectations")
        if not isinstance(expectations, list) or len(expectations) < MIN_EXPECTATIONS:
            count = len(expectations) if isinstance(expectations, list) else 0
            problems.append(f"{where} has {count} expectation(s), the minimum is {MIN_EXPECTATIONS}")

    return problems


def main() -> int:
    if not SKILLS_DIR.is_dir():
        print(f"lint-skills: {SKILLS_DIR} is not a directory", file=sys.stderr)
        return 1

    skills = sorted(path for path in SKILLS_DIR.iterdir() if path.is_dir())
    if not skills:
        print("lint-skills: no skills found", file=sys.stderr)
        return 1

    failed = 0
    for skill in skills:
        problems = check_skill(skill)
        if problems:
            failed += 1
            for problem in problems:
                print(f"lint-skills: {skill.name}: {problem}", file=sys.stderr)

    print(f"lint-skills: {len(skills)} skill(s), {failed} with problems")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
