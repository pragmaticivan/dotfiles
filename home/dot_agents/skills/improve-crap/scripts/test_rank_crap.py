from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("rank_crap.py")
SPEC = importlib.util.spec_from_file_location("rank_crap", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
rank_crap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rank_crap)


class CrapScoreTest(unittest.TestCase):
    def test_known_scores(self) -> None:
        cases = [
            (1, 100, 1),
            (10, 100, 10),
            (1, 0, 2),
            (10, 0, 110),
            (7, 0, 56),
            (10, 50, 22.5),
        ]

        for complexity, coverage, expected in cases:
            with self.subTest(complexity=complexity, coverage=coverage):
                self.assertEqual(rank_crap.crap_score(complexity, coverage), expected)

    def test_record_validation_adds_score(self) -> None:
        record = rank_crap.validate_record(
            {"symbol": "price", "complexity": 10, "coverage": 75}, 0
        )

        self.assertEqual(record["crap"], 11.56)

    def test_record_validation_rejects_invalid_ranges(self) -> None:
        for record in (
            {"symbol": "x", "complexity": 0, "coverage": 50},
            {"symbol": "x", "complexity": 1, "coverage": 101},
            {"symbol": "", "complexity": 1, "coverage": 50},
        ):
            with self.subTest(record=record):
                with self.assertRaises(ValueError):
                    rank_crap.validate_record(record, 0)


if __name__ == "__main__":
    unittest.main()
