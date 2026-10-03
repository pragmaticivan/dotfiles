#!/usr/bin/env python3
"""Calculate and rank function-level CRAP scores from normalized JSON."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def crap_score(complexity: int, coverage_percent: float) -> float:
    uncovered = 1 - coverage_percent / 100
    return complexity**2 * uncovered**3 + complexity


def load_records(path: str) -> list[dict[str, Any]]:
    text = sys.stdin.read() if path == "-" else Path(path).read_text()
    data = json.loads(text)
    records = data.get("functions") if isinstance(data, dict) else data
    if not isinstance(records, list):
        raise ValueError("input must be a JSON list or an object with a functions list")
    return [validate_record(record, index) for index, record in enumerate(records)]


def validate_record(record: Any, index: int) -> dict[str, Any]:
    if not isinstance(record, dict):
        raise ValueError(f"record {index} must be an object")

    symbol = record.get("symbol")
    complexity = record.get("complexity")
    coverage = record.get("coverage")

    if not isinstance(symbol, str) or not symbol.strip():
        raise ValueError(f"record {index} has no symbol")
    if isinstance(complexity, bool) or not isinstance(complexity, int) or complexity < 1:
        raise ValueError(f"record {index} complexity must be an integer of 1 or more")
    if isinstance(coverage, bool) or not isinstance(coverage, (int, float)) or not 0 <= coverage <= 100:
        raise ValueError(f"record {index} coverage must be between 0 and 100")

    result = dict(record)
    result["crap"] = round(crap_score(complexity, float(coverage)), 2)
    return result


def render_table(records: list[dict[str, Any]]) -> str:
    lines = [
        "| CRAP | CC | Coverage | Function | Location |",
        "| ---: | ---: | ---: | --- | --- |",
    ]
    for record in records:
        path = str(record.get("path", ""))
        line = record.get("line")
        location = f"{path}:{line}" if path and line is not None else path
        symbol = str(record["symbol"]).replace("|", "\\|")
        location = location.replace("|", "\\|")
        lines.append(
            f"| {record['crap']:.2f} | {record['complexity']} | "
            f"{float(record['coverage']):.2f}% | {symbol} | {location} |"
        )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Rank normalized function measurements by CRAP score.")
    parser.add_argument("input", nargs="?", default="-", help="JSON file. Use - for standard input.")
    parser.add_argument("--json", action="store_true", help="Write enriched JSON instead of a Markdown table.")
    args = parser.parse_args()

    try:
        records = load_records(args.input)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        parser.error(str(error))

    records.sort(key=lambda record: (-record["crap"], -record["complexity"], record["symbol"]))
    if args.json:
        print(json.dumps(records, indent=2))
    else:
        print(render_table(records))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
