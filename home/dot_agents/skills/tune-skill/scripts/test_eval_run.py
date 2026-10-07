from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("eval_run.py")
SPEC = importlib.util.spec_from_file_location("eval_run", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
eval_run = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(eval_run)

EVALS = {"evals": [{"id": 1, "prompt": "p1", "expectations": ["a", "b"]}, {"id": 2, "prompt": "p2", "expectations": ["a"]}]}


class EvalRunTest(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(tempfile.mkdtemp())
        self.evals = self.root / "evals.json"
        self.evals.write_text(json.dumps(EVALS))
        self.workspace = self.root / "ws"

    def test_setup_creates_each_model_config_and_run(self) -> None:
        created = eval_run.setup(self.workspace, self.evals, ["haiku", "opus"], runs=2, iteration=1)
        self.assertEqual(len(created), 2 * 2 * 2 * 2)
        metadata = json.loads((self.workspace / "opus/iteration-1/eval-2/eval_metadata.json").read_text())
        self.assertEqual(metadata["assertions"], ["a"])
        self.assertTrue((self.workspace / "haiku/iteration-1/eval-1/new_skill/run-2/outputs").is_dir())

    def test_blind_hides_config_and_report_unblinds(self) -> None:
        for outputs in eval_run.setup(self.workspace, self.evals, ["opus"], runs=1, iteration=1):
            (outputs / "response.md").write_text(outputs.parent.parent.name)
            eval_run.write_timing(outputs.parent, 1000, 2000)
        mapping = json.loads(eval_run.blind(self.workspace, "response.md", seed=1).read_text())
        self.assertEqual(len(mapping), 4)
        for key, run in mapping.items():
            self.assertNotIn("skill", key)
            new = run.split("/")[3] == "new_skill"
            grading = {"expectations": [{"text": "a", "passed": new, "evidence": ""}, {"text": "b", "passed": True, "evidence": ""}]}
            (self.workspace / "blind" / f"{key}.grading.json").write_text(json.dumps(grading))

        text = eval_run.report(self.workspace)

        self.assertIn("| opus | old_skill | 2/4 | 0.50 | 1000 | 2 |", text)
        self.assertIn("| opus | new_skill | 4/4 | 1.00 | 1000 | 2 |", text)
        self.assertIn("- eval-1: b", text)
        self.assertNotIn("- eval-1: a", text)
        self.assertTrue((self.workspace / "opus/iteration-1/eval-1/new_skill/run-1/grading.json").exists())

    def test_blind_again_adds_only_new_runs(self) -> None:
        for outputs in eval_run.setup(self.workspace, self.evals, ["opus"], runs=1, iteration=1):
            (outputs / "response.md").write_text("first")
        first = json.loads(eval_run.blind(self.workspace, "response.md", seed=1).read_text())

        for outputs in eval_run.setup(self.workspace, self.evals, ["opus"], runs=2, iteration=1):
            (outputs / "response.md").write_text(outputs.parent.name)
        second = json.loads(eval_run.blind(self.workspace, "response.md", seed=1).read_text())

        self.assertEqual({key: second[key] for key in first}, first)
        self.assertEqual(len(second), 8)
        for key in first:
            self.assertEqual((self.workspace / "blind" / f"{key}.md").read_text(), "first")

    def test_report_lists_ungraded_runs(self) -> None:
        eval_run.setup(self.workspace, self.evals, ["haiku"], runs=1, iteration=1)
        self.assertIn("Runs with no grading.json:", eval_run.report(self.workspace))


if __name__ == "__main__":
    unittest.main()
