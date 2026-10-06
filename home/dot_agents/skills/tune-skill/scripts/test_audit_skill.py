from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("audit_skill.py")
SPEC = importlib.util.spec_from_file_location("audit_skill", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
audit_skill = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit_skill)

GOOD_FRONTMATTER = '---\nname: pdf-forms\ndescription: "Fills PDF forms. Use when the user asks to fill a PDF."\n---\n'
THREE_EVALS = json.dumps({"evals": [{"id": 1}, {"id": 2}, {"id": 3}]})


class AuditTest(unittest.TestCase):
    def build(self, files: dict[str, str]) -> Path:
        root = Path(tempfile.mkdtemp())
        files.setdefault("evals/evals.json", THREE_EVALS)
        for name, text in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        return root

    def rules(self, files: dict[str, str]) -> list[str]:
        return [finding.rule for finding in audit_skill.audit(self.build(files)) if finding.severity != "info"]

    def test_clean_skill_has_no_findings(self) -> None:
        body = GOOD_FRONTMATTER + "Read [the guide](references/guide.md).\n"
        self.assertEqual(self.rules({"SKILL.md": body, "references/guide.md": "# Guide\n"}), [])

    def test_frontmatter_rules(self) -> None:
        cases = [
            ("---\nname: Bad_Name\ndescription: Fills forms. Use when asked.\n---\n", "name"),
            ("---\nname: claude-helper\ndescription: Fills forms. Use when asked.\n---\n", "name"),
            ("---\nname: ok\ndescription: I can fill forms. Use when asked.\n---\n", "description-voice"),
            ("---\nname: ok\ndescription: Fills forms.\n---\n", "description-trigger"),
            ("---\nname: ok\ndescription: Fills <b>forms</b>. Use when asked.\n---\n", "description"),
            ("no frontmatter\n", "frontmatter"),
        ]
        for skill_md, rule in cases:
            with self.subTest(rule=rule, skill_md=skill_md):
                self.assertIn(rule, self.rules({"SKILL.md": skill_md}))

    def test_folded_description_is_parsed(self) -> None:
        skill_md = "---\nname: ok\ndescription: >\n  Fills forms.\n  Use when asked.\n---\n"
        self.assertEqual(self.rules({"SKILL.md": skill_md}), [])

    def test_nested_reference_is_flagged(self) -> None:
        files = {
            "SKILL.md": GOOD_FRONTMATTER + "See [advanced](advanced.md).\n",
            "advanced.md": "See [details](details.md).\n",
            "details.md": "The facts.\n",
        }
        self.assertIn("nested-reference", self.rules(files))

    def test_links_in_code_and_placeholders_are_ignored(self) -> None:
        body = GOOD_FRONTMATTER + "```\n[x](missing.md)\n```\nUse `- [Title](url)`. Cite [PR](url).\n"
        self.assertEqual(self.rules({"SKILL.md": body}), [])

    def test_link_to_other_skill_is_not_nested(self) -> None:
        root = self.build({
            "pdf/SKILL.md": GOOD_FRONTMATTER + "See [guide](guide.md).\n",
            "pdf/guide.md": "Use [swarm](../swarm/SKILL.md).\n",
            "swarm/SKILL.md": GOOD_FRONTMATTER,
        })
        (root / "pdf/evals").mkdir()
        (root / "pdf/evals/evals.json").write_text(THREE_EVALS)
        rules = [f.rule for f in audit_skill.audit(root / "pdf") if f.severity != "info"]
        self.assertEqual(rules, [])

    def test_broken_link_is_an_error(self) -> None:
        self.assertIn("broken-link", self.rules({"SKILL.md": GOOD_FRONTMATTER + "See [x](gone.md).\n"}))

    def test_long_reference_needs_contents(self) -> None:
        long_doc = "# API\n" + "line\n" * 120
        with_toc = "# API\n## Contents\n- Auth\n" + "line\n" * 120
        base = GOOD_FRONTMATTER + "See [api](api.md).\n"
        self.assertIn("reference-toc", self.rules({"SKILL.md": base, "api.md": long_doc}))
        self.assertNotIn("reference-toc", self.rules({"SKILL.md": base, "api.md": with_toc}))

    def test_body_length(self) -> None:
        self.assertIn("body-length", self.rules({"SKILL.md": GOOD_FRONTMATTER + "x\n" * 501}))

    def test_text_rules(self) -> None:
        body = GOOD_FRONTMATTER + "Save under out\\invoices\\ now.\nBefore August 2025, use the v1 API.\n" + "You MUST do it.\n" * 6
        rules = self.rules({"SKILL.md": body})
        for rule in ("windows-path", "time-sensitive", "emphasis"):
            with self.subTest(rule=rule):
                self.assertIn(rule, rules)

    def test_past_dates_in_examples_are_not_time_sensitive(self) -> None:
        body = GOOD_FRONTMATTER + "We scanned the PRs that touched this file since 2023.\n"
        self.assertNotIn("time-sensitive", self.rules({"SKILL.md": body}))

    def test_third_party_import_needs_install_line(self) -> None:
        script = "import json\nimport pypdf\nimport helper\n"
        files = {"SKILL.md": GOOD_FRONTMATTER, "scripts/fill.py": script, "scripts/helper.py": ""}
        self.assertIn("dependency", self.rules(files))
        files["SKILL.md"] = GOOD_FRONTMATTER + "Use the pypdf library.\n"
        self.assertIn("dependency", self.rules(files))
        files["SKILL.md"] = GOOD_FRONTMATTER + "Run `pip install pypdf` first.\n"
        self.assertNotIn("dependency", self.rules(files))

    def test_evals_minimum(self) -> None:
        few = json.dumps({"evals": [{"id": 1}]})
        self.assertIn("evals", self.rules({"SKILL.md": GOOD_FRONTMATTER, "evals/evals.json": few}))

    def test_evals_with_wrong_key_is_an_error(self) -> None:
        root = self.build({"SKILL.md": GOOD_FRONTMATTER, "evals/evals.json": json.dumps({"cases": [1, 2, 3]})})
        severities = [f.severity for f in audit_skill.audit(root) if f.rule == "evals"]
        self.assertEqual(severities, ["error"])


if __name__ == "__main__":
    unittest.main()
