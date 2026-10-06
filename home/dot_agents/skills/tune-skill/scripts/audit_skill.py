#!/usr/bin/env python3
"""Audit a skill directory against the structural rules of the Anthropic skill guide."""

import argparse
import ast
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

BODY_MAX_LINES = 500
REFERENCE_TOC_THRESHOLD = 100
TOC_SEARCH_LINES = 30
EMPHASIS_LIMIT = 5
EVALS_MIN = 3

MARKDOWN_LINK = re.compile(r"\]\(([^)#\s]+)(?:#[^)]*)?\)")
CODE_PATH = re.compile(r"`([\w./-]+/[\w.-]+\.(?:md|py|sh|js|ts|json))`")
INLINE_CODE = re.compile(r"`[^`]*`")
EMPHASIS = re.compile(r"\b(MUST|NEVER|ALWAYS|CRITICAL|IMPORTANT|REQUIRED)\b")
MONTH = r"(january|february|march|april|may|june|july|august|september|october|november|december)"
DATED = re.compile(rf"\b(before|after|until|as of)\s+({MONTH}\s+)?20\d\d\b", re.IGNORECASE)
WINDOWS_PATH = re.compile(r"\b[\w.-]+\\[\w.-]+")
FIRST_OR_SECOND_PERSON = re.compile(r"^(I|You)\b|\b(I can|you can|I will|I'll)\b", re.IGNORECASE)
TRIGGER = re.compile(r"\b(use (when|for|to|this|it)|trigger|invoke|when (the user|asked|someone))\b", re.IGNORECASE)
RESERVED = ("anthropic", "claude")
SEVERITIES = ("info", "warn", "error")


@dataclass
class Finding:
    severity: str
    rule: str
    path: str
    line: int
    message: str


@dataclass
class Skill:
    root: Path
    frontmatter: dict
    body: list[str]
    body_offset: int

    @property
    def skill_md(self) -> Path:
        return self.root / "SKILL.md"

    def rel(self, path: Path) -> str:
        return str(path.relative_to(self.root))


def parse_frontmatter(lines: list[str]) -> tuple[dict, int]:
    if not lines or lines[0].strip() != "---":
        return {}, 0
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return {}, 0
    fields: dict = {}
    key = None
    for raw in lines[1:end]:
        match = re.match(r"^([\w-]+):\s*(.*)$", raw)
        if match and not raw.startswith((" ", "\t")):
            key, value = match.group(1), match.group(2).strip()
            fields[key] = "" if value in (">", "|", ">-", "|-") else value.strip("\"'")
        elif key and raw.strip():
            fields[key] = (fields[key] + " " + raw.strip()).strip()
    return fields, end + 1


def load(root: Path) -> Skill:
    lines = (root / "SKILL.md").read_text().splitlines()
    frontmatter, offset = parse_frontmatter(lines)
    return Skill(root, frontmatter, lines[offset:], offset)


def links(path: Path, lines: list[str]) -> list[tuple[int, Path, bool]]:
    """Return (line, target, explicit) for links outside code.

    A Markdown link is explicit. A backtick path counts only when the file exists.
    """
    found = []
    fenced = False
    for number, line in enumerate(lines, 1):
        if line.lstrip().startswith("```"):
            fenced = not fenced
        if fenced:
            continue
        for target in MARKDOWN_LINK.findall(INLINE_CODE.sub("", line)):
            if "://" not in target and not target.startswith(("~", "/", "$")) and re.search(r"[./]", target):
                found.append((number, (path.parent / target).resolve(), True))
        for target in CODE_PATH.findall(line):
            resolved = (path.parent / target).resolve()
            if resolved.exists():
                found.append((number, resolved, False))
    return found


def check_frontmatter(skill: Skill):
    if not skill.frontmatter:
        yield Finding("error", "frontmatter", "SKILL.md", 1, "No YAML frontmatter.")
        return
    name = skill.frontmatter.get("name", "")
    description = skill.frontmatter.get("description", "")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name) or len(name) > 64:
        yield Finding("error", "name", "SKILL.md", 2, f"Name {name!r} must be kebab-case and 64 characters or fewer.")
    if any(word in name for word in RESERVED):
        yield Finding("error", "name", "SKILL.md", 2, f"Name {name!r} contains a reserved word.")
    if not description:
        yield Finding("error", "description", "SKILL.md", 3, "Description is empty.")
        return
    if len(description) > 1024:
        yield Finding("error", "description", "SKILL.md", 3, f"Description has {len(description)} characters. The limit is 1024.")
    if re.search(r"<[^>]+>", description):
        yield Finding("error", "description", "SKILL.md", 3, "Description contains an XML tag.")
    if FIRST_OR_SECOND_PERSON.search(description):
        yield Finding("warn", "description-voice", "SKILL.md", 3, "Write the description in the third person.")
    if not TRIGGER.search(description):
        yield Finding("warn", "description-trigger", "SKILL.md", 3, "Description does not say when to use the skill.")


def check_body_length(skill: Skill):
    if len(skill.body) > BODY_MAX_LINES:
        yield Finding("warn", "body-length", "SKILL.md", skill.body_offset + 1,
                      f"Body has {len(skill.body)} lines. Move detail into reference files to stay under {BODY_MAX_LINES}.")


def check_references(skill: Skill):
    root = skill.root.resolve()
    direct = set()
    for number, target, _ in links(skill.skill_md, skill.body):
        if not target.exists():
            yield Finding("error", "broken-link", "SKILL.md", skill.body_offset + number, f"Linked file {target.name} does not exist.")
        else:
            direct.add(target)
    for doc in sorted(skill.root.rglob("*.md")):
        if doc.name == "SKILL.md" or "evals" in doc.relative_to(skill.root).parts:
            continue
        doc_lines = doc.read_text().splitlines()
        for number, target, explicit in links(doc, doc_lines):
            if explicit and not target.exists():
                yield Finding("error", "broken-link", skill.rel(doc), number, f"Linked file {target.name} does not exist.")
            elif target.suffix == ".md" and target.is_relative_to(root) and target not in direct and target.name != "SKILL.md":
                yield Finding("warn", "nested-reference", skill.rel(doc), number,
                              f"{target.name} is reachable only through {doc.name}. Link it from SKILL.md.")
        if doc.resolve() not in direct:
            yield Finding("info", "unlinked-file", skill.rel(doc), 1, "SKILL.md does not link this file.")
        if len(doc_lines) > REFERENCE_TOC_THRESHOLD and not has_toc(doc_lines):
            yield Finding("warn", "reference-toc", skill.rel(doc), 1,
                          f"File has {len(doc_lines)} lines and no contents list near the top.")


def has_toc(lines: list[str]) -> bool:
    head = lines[:TOC_SEARCH_LINES]
    if any(re.match(r"^#+\s*(table of )?contents\b", line, re.IGNORECASE) for line in head):
        return True
    return sum(bool(re.match(r"^\s*[-*\d.]+\s*\[.+\]\(#", line)) for line in head) >= 3


def check_text(skill: Skill):
    files = [(skill.skill_md, skill.body, skill.body_offset)]
    files += [(doc, doc.read_text().splitlines(), 0) for doc in sorted(skill.root.rglob("*.md"))
              if doc.name != "SKILL.md" and "evals" not in doc.relative_to(skill.root).parts]
    for path, lines, offset in files:
        fenced = False
        emphasis = 0
        for number, line in enumerate(lines, offset + 1):
            if line.lstrip().startswith("```"):
                fenced = not fenced
            if fenced:
                continue
            if WINDOWS_PATH.search(line):
                yield Finding("warn", "windows-path", skill.rel(path), number, "Use forward slashes in paths.")
            emphasis += len(EMPHASIS.findall(line))
            if DATED.search(line):
                yield Finding("warn", "time-sensitive", skill.rel(path), number,
                              "Date-bound instruction. Move it to an old-patterns section or delete it.")
        if emphasis > EMPHASIS_LIMIT:
            yield Finding("warn", "emphasis", skill.rel(path), offset + 1,
                          f"{emphasis} all-caps emphasis words. Newer models over-apply them. Use plain instructions.")


def third_party_imports(script: Path) -> set[str]:
    try:
        tree = ast.parse(script.read_text())
    except SyntaxError:
        return set()
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names.add(node.module.split(".")[0])
    local = {path.stem for path in script.parent.glob("*.py")}
    return {name for name in names if name not in sys.stdlib_module_names and name not in local}


def check_dependencies(skill: Skill):
    install_lines = [line.lower() for line in skill.body if "install" in line.lower()]
    for script in sorted(skill.root.rglob("*.py")):
        if "evals" in script.relative_to(skill.root).parts:
            continue
        missing = sorted(name for name in third_party_imports(script) if not any(name.lower() in line for line in install_lines))
        if missing:
            yield Finding("warn", "dependency", skill.rel(script), 1,
                          f"Imports {', '.join(missing)} but SKILL.md has no install line for it.")


def check_evals(skill: Skill):
    path = skill.root / "evals" / "evals.json"
    if not path.exists():
        yield Finding("warn", "evals", "evals/evals.json", 1, f"No evals. Write at least {EVALS_MIN}.")
        return
    try:
        evals = json.loads(path.read_text())["evals"]
        count = len(evals) if isinstance(evals, list) else None
    except (json.JSONDecodeError, KeyError, TypeError):
        count = None
    if count is None:
        yield Finding("error", "evals", "evals/evals.json", 1, 'evals.json must be a JSON object with an "evals" list.')
        return
    if count < EVALS_MIN:
        yield Finding("warn", "evals", "evals/evals.json", 1, f"{count} evals. Write at least {EVALS_MIN}.")


RULES = [check_frontmatter, check_body_length, check_references, check_text, check_dependencies, check_evals]


def audit(root: Path) -> list[Finding]:
    skill = load(root)
    return [finding for rule in RULES for finding in rule(skill)]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill_dirs", type=Path, nargs="+")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--min-severity", choices=SEVERITIES, default="info")
    args = parser.parse_args()
    report = {}
    for skill_dir in args.skill_dirs:
        if not (skill_dir / "SKILL.md").exists():
            print(f"{skill_dir} has no SKILL.md", file=sys.stderr)
            return 2
        floor = SEVERITIES.index(args.min_severity)
        report[str(skill_dir)] = [f for f in audit(skill_dir) if SEVERITIES.index(f.severity) >= floor]
    if args.json:
        print(json.dumps({name: [asdict(f) for f in findings] for name, findings in report.items()}, indent=2))
    else:
        for name, findings in report.items():
            print(f"== {name}: {len(findings)} findings")
            for f in findings:
                print(f"{f.severity:5} {f.rule:20} {f.path}:{f.line} {f.message}")
    return 1 if any(f.severity == "error" for findings in report.values() for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
