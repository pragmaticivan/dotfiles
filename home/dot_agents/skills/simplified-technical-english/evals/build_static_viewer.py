#!/usr/bin/env python3
"""Render the skill-creator eval viewer as a static HTML file.

The skill-creator's own generate_review.py spawns a browser subprocess, which
this machine's deny policy blocks. This builds the same viewer.html template
with the same EMBEDDED_DATA shape, minus the process spawning, so the review
step still happens against the upstream UI rather than a hand-rolled one.

Usage: python3 build_static_viewer.py <iteration-dir> <output.html>
"""

import json
import os
import sys

TEMPLATE = "/Users/ivan.santos/.claude/skills/skill-creator/eval-viewer/viewer.html"
METADATA = {"grading.json", "eval_metadata.json", "timing.json", "mechanical.json",
            "benchmark.json", "benchmark.md"}


def collect(iteration):
    runs = []
    for entry in sorted(os.listdir(iteration)):
        eval_dir = os.path.join(iteration, entry)
        if not os.path.isdir(eval_dir) or not entry.startswith("eval-"):
            continue
        meta_path = os.path.join(eval_dir, "eval_metadata.json")
        meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
        for arm in ("with_skill", "without_skill"):
            run_dir = os.path.join(eval_dir, arm)
            outputs_dir = os.path.join(run_dir, "outputs")
            if not os.path.isdir(outputs_dir):
                continue
            files = []
            for name in sorted(os.listdir(outputs_dir)):
                path = os.path.join(outputs_dir, name)
                if not os.path.isfile(path) or name in METADATA:
                    continue
                files.append({"name": name, "type": "text",
                              "content": open(path, encoding="utf-8", errors="replace").read()})
            grading_path = os.path.join(run_dir, "grading.json")
            runs.append({
                "id": f"{entry}-{arm}",
                "prompt": meta.get("prompt", "(No prompt found)"),
                "eval_id": meta.get("eval_id"),
                "outputs": files,
                "grading": json.load(open(grading_path)) if os.path.exists(grading_path) else None,
            })
    return runs


def main():
    iteration, out_path = sys.argv[1], sys.argv[2]
    benchmark_path = os.path.join(iteration, "benchmark.json")
    data = {
        "skill_name": "simplified-technical-english",
        "runs": collect(iteration),
        "benchmark": json.load(open(benchmark_path)) if os.path.exists(benchmark_path) else None,
        "previous_feedback": {},
        "previous_outputs": {},
        "static": True,
    }
    payload = (json.dumps(data)
               .replace("</", "<\\/")
               .replace("<!--", "\\u003c!--"))
    html = open(TEMPLATE, encoding="utf-8").read().replace(
        "/*__EMBEDDED_DATA__*/", f"const EMBEDDED_DATA = {payload};")
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(html)
    print(f"wrote {out_path} ({len(html) // 1024} KB, {len(data['runs'])} runs)")


if __name__ == "__main__":
    main()
