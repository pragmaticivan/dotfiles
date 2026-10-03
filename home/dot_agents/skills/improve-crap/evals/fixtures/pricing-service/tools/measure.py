#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse


DECISION = re.compile(r"\b(?:if|for|while|case|catch)\b|&&|\|\||\?")


def load_functions(directory: Path) -> dict[tuple[str, str, int], dict[str, object]]:
    functions: dict[tuple[str, str, int], dict[str, object]] = {}
    for report_path in directory.glob("*.json"):
        report = json.loads(report_path.read_text())
        for script in report["result"]:
            source_path = Path(unquote(urlparse(script["url"]).path))
            if source_path.suffix != ".ts" or "/src/" not in source_path.as_posix():
                continue
            for function in script["functions"]:
                name = function["functionName"]
                if not name:
                    continue
                start = function["ranges"][0]["startOffset"]
                key = (source_path.as_posix(), name, start)
                previous = functions.get(key)
                if previous is None or sum(r["count"] for r in function["ranges"]) > sum(
                    r["count"] for r in previous["ranges"]
                ):
                    functions[key] = function
    return functions


def measure(directory: Path) -> list[dict[str, object]]:
    records = []
    for (path_text, name, start), function in load_functions(directory).items():
        path = Path(path_text)
        source = path.read_text()
        end = function["ranges"][0]["endOffset"]
        body = source[start:end]
        ranges = function["ranges"]
        covered = sum(1 for item in ranges if item["count"] > 0)
        records.append(
            {
                "symbol": name,
                "path": path.relative_to(Path.cwd()).as_posix(),
                "line": source.count("\n", 0, start) + 1,
                "complexity": 1 + len(DECISION.findall(body)),
                "coverage": round(100 * covered / len(ranges), 2),
            }
        )
    return sorted(records, key=lambda record: (record["path"], record["line"]))


if __name__ == "__main__":
    print(json.dumps(measure(Path(sys.argv[1])), indent=2))
