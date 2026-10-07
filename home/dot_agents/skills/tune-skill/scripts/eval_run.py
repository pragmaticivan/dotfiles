#!/usr/bin/env python3
"""Lay out, blind, and summarize an old-against-new eval run of a skill.

Layout: <workspace>/<model>/iteration-<n>/eval-<id>/<config>/run-<k>/outputs/
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
import sys
from pathlib import Path

CONFIGS = ("old_skill", "new_skill")


def run_dirs(workspace: Path) -> list[Path]:
    return sorted(path for path in workspace.glob("*/iteration-*/eval-*/*/run-*") if path.parent.name in CONFIGS)


def setup(workspace: Path, evals_file: Path, models: list[str], runs: int, iteration: int) -> list[Path]:
    evals = json.loads(evals_file.read_text())["evals"]
    created = []
    for model in models:
        for case in evals:
            eval_dir = workspace / model / f"iteration-{iteration}" / f"eval-{case['id']}"
            eval_dir.mkdir(parents=True, exist_ok=True)
            metadata = {"eval_id": case["id"], "prompt": case["prompt"], "assertions": case.get("expectations", [])}
            (eval_dir / "eval_metadata.json").write_text(json.dumps(metadata, indent=2))
            for config in CONFIGS:
                for k in range(1, runs + 1):
                    outputs = eval_dir / config / f"run-{k}" / "outputs"
                    outputs.mkdir(parents=True, exist_ok=True)
                    created.append(outputs)
    return created


def write_timing(run_dir: Path, tokens: int, duration_ms: int) -> None:
    timing = {"total_tokens": tokens, "duration_ms": duration_ms, "total_duration_seconds": round(duration_ms / 1000, 1)}
    (run_dir / "timing.json").write_text(json.dumps(timing))


def blind(workspace: Path, filename: str, seed: int | None) -> Path:
    """Copy each new run's output to blind/eval-<id>/R<nnn>.md so a grader cannot see the config or the model.

    Runs already in the map keep their names, so added runs can be graded without grading the old ones again.
    """
    rng = random.Random(seed)
    map_file = workspace / "blind" / "map.json"
    mapping = json.loads(map_file.read_text()) if map_file.exists() else {}
    known = set(mapping.values())
    by_eval: dict[str, list[Path]] = {}
    for run in run_dirs(workspace):
        if str(run.relative_to(workspace)) not in known:
            by_eval.setdefault(run.parent.parent.name, []).append(run)
    for eval_name, runs in by_eval.items():
        target = workspace / "blind" / eval_name
        target.mkdir(parents=True, exist_ok=True)
        used = {int(key.split("/R")[1]) for key in mapping if key.startswith(f"{eval_name}/")}
        free = sorted(set(range(100, 1000)) - used)
        for run, number in zip(runs, rng.sample(free, len(runs))):
            shutil.copy(run / "outputs" / filename, target / f"R{number}.md")
            mapping[f"{eval_name}/R{number}"] = str(run.relative_to(workspace))
    map_file.parent.mkdir(parents=True, exist_ok=True)
    map_file.write_text(json.dumps(mapping, indent=1))
    return map_file


def unblind(workspace: Path) -> None:
    map_file = workspace / "blind" / "map.json"
    if not map_file.exists():
        return
    for key, run in json.loads(map_file.read_text()).items():
        grading = workspace / "blind" / f"{key}.grading.json"
        if grading.exists():
            shutil.copy(grading, workspace / run / "grading.json")


def report(workspace: Path) -> str:
    unblind(workspace)
    totals: dict[tuple[str, str], dict[str, float]] = {}
    results: dict[tuple[str, str], list[bool]] = {}
    missing = []
    for run in run_dirs(workspace):
        model, config, eval_name = run.parts[-5], run.parent.name, run.parent.parent.name
        grading_file = run / "grading.json"
        if not grading_file.exists():
            missing.append(str(run.relative_to(workspace)))
            continue
        expectations = json.loads(grading_file.read_text())["expectations"]
        row = totals.setdefault((model, config), {"passed": 0, "total": 0, "tokens": 0, "seconds": 0, "runs": 0})
        row["passed"] += sum(item["passed"] for item in expectations)
        row["total"] += len(expectations)
        row["runs"] += 1
        timing_file = run / "timing.json"
        if timing_file.exists():
            timing = json.loads(timing_file.read_text())
            row["tokens"] += timing["total_tokens"]
            row["seconds"] += timing["total_duration_seconds"]
        for item in expectations:
            results.setdefault((eval_name, item["text"]), []).append(bool(item["passed"]))

    lines = ["| Model | Config | Passed | Rate | Avg tokens | Avg seconds |", "|---|---|---|---|---|---|"]
    for (model, config), row in sorted(totals.items(), key=lambda item: (item[0][0], CONFIGS.index(item[0][1]))):
        runs = row["runs"]
        lines.append(
            f"| {model} | {config} | {row['passed']:.0f}/{row['total']:.0f} | {row['passed'] / row['total']:.2f}"
            f" | {row['tokens'] / runs:.0f} | {row['seconds'] / runs:.0f} |"
        )
    flat = [f"- {eval_name}: {text}" for (eval_name, text), passes in sorted(results.items()) if len(set(passes)) == 1]
    if flat:
        lines += ["", "Assertions with the same result in every run (they do not separate old from new):", *flat]
    if missing:
        lines += ["", "Runs with no grading.json:", *(f"- {run}" for run in missing)]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    setup_parser = commands.add_parser("setup", help="Create the run directories and eval metadata.")
    setup_parser.add_argument("workspace", type=Path)
    setup_parser.add_argument("--evals", type=Path, required=True, help="Path to the skill's evals/evals.json.")
    setup_parser.add_argument("--models", nargs="+", default=["haiku", "sonnet", "opus"])
    setup_parser.add_argument("--runs", type=int, default=1, help="Runs per config and eval.")
    setup_parser.add_argument("--iteration", type=int, default=1)

    timing_parser = commands.add_parser("timing", help="Record the tokens and duration from a task notification.")
    timing_parser.add_argument("run_dir", type=Path)
    timing_parser.add_argument("tokens", type=int)
    timing_parser.add_argument("duration_ms", type=int)

    blind_parser = commands.add_parser("blind", help="Copy the outputs to anonymous names for the graders.")
    blind_parser.add_argument("workspace", type=Path)
    blind_parser.add_argument("--file", default="response.md", help="Output file name in each outputs/ directory.")
    blind_parser.add_argument("--seed", type=int)

    report_parser = commands.add_parser("report", help="Copy the grades back and print the pass rate per model.")
    report_parser.add_argument("workspace", type=Path)

    args = parser.parse_args()
    if args.command == "setup":
        for outputs in setup(args.workspace, args.evals, args.models, args.runs, args.iteration):
            print(outputs)
    elif args.command == "timing":
        write_timing(args.run_dir, args.tokens, args.duration_ms)
    elif args.command == "blind":
        print(blind(args.workspace, args.file, args.seed))
    else:
        print(report(args.workspace))
    return 0


if __name__ == "__main__":
    sys.exit(main())
