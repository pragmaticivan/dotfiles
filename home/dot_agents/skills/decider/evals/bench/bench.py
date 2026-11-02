#!/usr/bin/env python3
"""Compare three ways to make one decision per item: the LLM only, the decider only, and the decider with the LLM for unsure items.

run_all.sh runs every step. The steps are:
  bench.py prepare <task> --run <n> [--batch 20]   run the decider arm and write the LLM prompts
  run_llm.sh <out>/<task> [model]                  send each prompt to the LLM
  bench.py score <task> [<task> ...]               print accuracy, tokens, time, and cost per arm
"""
import argparse
import importlib.util
import json
import os
import re
import statistics
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("decide", HERE.parents[1] / "scripts" / "decide.py")
decide = importlib.util.module_from_spec(spec)
spec.loader.exec_module(decide)

TASKS = json.loads((HERE / "tasks.json").read_text())
THRESHOLDS = (0.5, 0.6, 0.7, 0.8, 0.9)
OUT = Path(os.environ.get("DECIDER_BENCH_OUT", Path.home() / ".cache" / "decider-bench"))


def load(task):
    return [json.loads(line) for line in (HERE / "data" / f"{task}.jsonl").read_text().splitlines()]


def keys(question):
    return list(question["criteria"]) if question["type"] == "choice" else ["yes", "no"]


def prompt(question, items):
    if question["type"] == "choice":
        options = "\n".join(f"- {key}: {text}" for key, text in question["criteria"].items())
    else:
        options = "- yes\n- no"
    body = "\n\n".join(f"[{item['id']}]\n{item['state']}" for item in items)
    return (f"{question['instructions']}\nAnswer each item with one of these keys:\n{options}\n"
            f"Reply with only a JSON object that maps each item id to its key.\n\n{body}\n")


def prepare(task, run, batch):
    question, items = TASKS[task], load(task)
    out = OUT / task
    out.mkdir(parents=True, exist_ok=True)
    # Ollama answers a repeated state from its cache in about 4 ms, thus run_all.sh unloads the model before each run.
    # This request loads the model again, so that the load time is not in the item times.
    decide.ask("warm up", {"q": {"type": "noul", "instructions": "Is this a test?"}})
    rows, started = [], time.perf_counter()
    for item in items:
        t0 = time.perf_counter()
        answer = decide.verdict(decide.ask(item["state"], {"label": question})["label"], 0.9)
        rows.append({"id": item["id"], **answer, "ms": round((time.perf_counter() - t0) * 1000, 1)})
    total_ms = round((time.perf_counter() - started) * 1000, 1)
    (out / f"r{run}-decider.json").write_text(json.dumps({"total_ms": total_ms, "rows": rows}))
    unsure = [item for item, row in zip(items, rows) if not row["sure"]]
    for arm, subset in (("llm", items), ("hybrid", unsure)):
        for start in range(0, len(subset), batch):
            (out / f"r{run}-{arm}-b{start // batch + 1}.txt").write_text(prompt(question, subset[start:start + batch]))
    print(f"{task} run {run}: decider {total_ms / 1000:.1f} s, {len(items) - len(unsure)} of {len(items)} sure")


def llm_answers(out, run, arm, ids):
    # The LLM sometimes shortens an id, such as "21" for "test_failures-21".
    short = {item_id.split("-", 1)[1]: item_id for item_id in ids}
    answers, usage = {}, {"tokens": 0, "cost": 0.0, "api_ms": 0, "wall_ms": 0, "calls": 0, "bad_replies": 0, "unmatched_ids": 0}
    for reply_file in sorted(out.glob(f"r{run}-{arm}-b*.txt.json")):
        reply = json.loads(reply_file.read_text())
        u = reply["usage"]
        usage["tokens"] += u["input_tokens"] + u["cache_creation_input_tokens"] + u["cache_read_input_tokens"] + u["output_tokens"]
        usage["cost"] += reply.get("total_cost_usd", 0)
        usage["api_ms"] += reply["duration_api_ms"]
        usage["wall_ms"] += int(Path(str(reply_file)[:-5] + ".wall").read_text())
        usage["calls"] += 1
        match = re.search(r"\{.*\}", reply.get("result", ""), re.DOTALL)
        try:
            reply_answers = json.loads(match.group(0))
        except (AttributeError, json.JSONDecodeError):
            usage["bad_replies"] += 1
            continue
        for key, answer in reply_answers.items():
            item_id = key if key in ids else short.get(key)
            if item_id:
                answers[item_id] = answer
            else:
                usage["unmatched_ids"] += 1
    missing = len(list(out.glob(f"r{run}-{arm}-b*.txt"))) - usage["calls"]
    if missing:
        raise SystemExit(f"{out.name} run {run} {arm}: {missing} prompt(s) have no reply. Run run_llm.sh first.")
    return answers, usage


def score_run(task, run):
    out, items = OUT / task, load(task)
    decider = json.loads((out / f"r{run}-decider.json").read_text())
    rows = {row["id"]: row for row in decider["rows"]}
    ids = {item["id"] for item in items}
    llm, llm_use = llm_answers(out, run, "llm", ids)
    hybrid, hybrid_use = llm_answers(out, run, "hybrid", ids)
    hybrid.update({i: row["answer"] for i, row in rows.items() if row["sure"]})
    sure = [item for item in items if rows[item["id"]]["sure"]]

    def accuracy(answers):
        return sum(answers.get(item["id"]) == item["label"] for item in items) / len(items)

    return {
        "decider": {"accuracy": accuracy({i: r["answer"] for i, r in rows.items()}), "tokens": 0, "cost": 0.0,
                    "api_ms": decider["total_ms"], "wall_ms": decider["total_ms"],
                    "sure_rate": len(sure) / len(items),
                    "sure_accuracy": sum(rows[i["id"]]["answer"] == i["label"] for i in sure) / len(sure) if sure else None},
        "llm": {"accuracy": accuracy(llm), **llm_use},
        "hybrid": {"accuracy": accuracy(hybrid), **hybrid_use,
                   "api_ms": hybrid_use["api_ms"] + decider["total_ms"], "wall_ms": hybrid_use["wall_ms"] + decider["total_ms"]},
    }


def spread(values, fmt):
    values = [v for v in values if v is not None]
    if not values:
        return "n/a"
    low, mid, high = min(values), statistics.median(values), max(values)
    return fmt(mid) if low == high else f"{fmt(mid)} ({fmt(low)}-{fmt(high)})"


def score(tasks):
    pct, sec, num = (lambda v: f"{v:.0%}"), (lambda v: f"{v / 1000:.1f}"), (lambda v: f"{v:,.0f}")
    print("| Task | Items | Arm | Accuracy | Tokens | Model s | Wall s | Cost $ | Sure | Right when sure | Lost answers |")
    print("|---|---|---|---|---|---|---|---|---|---|---|")
    summary = {}
    for task in tasks:
        runs = sorted(int(p.name[1:].split("-")[0]) for p in (OUT / task).glob("r*-decider.json"))
        results = [score_run(task, run) for run in runs]
        summary[task] = results
        for arm in ("llm", "decider", "hybrid"):
            col = lambda key: [r[arm].get(key) for r in results]
            print(f"| {task} | {len(load(task))} | {arm} | {spread(col('accuracy'), pct)} | {spread(col('tokens'), num)} "
                  f"| {spread(col('api_ms'), sec)} | {spread(col('wall_ms'), sec)} | {spread(col('cost'), lambda v: f'{v:.4f}')} "
                  f"| {spread(col('sure_rate'), pct) if arm == 'decider' else ''} "
                  f"| {spread(col('sure_accuracy'), pct) if arm == 'decider' else ''} "
                  f"| {sum(col('bad_replies')) + sum(col('unmatched_ids')) if arm != 'decider' else ''} |")
    print(f"\n{len(results)} run(s) per task. Values are the median, with the range in brackets.")
    print("\nDecider answers kept at each confidence threshold: the share of items kept, and how many of those are right.\n")
    print("| Task | " + " | ".join(f"{t:.1f}" for t in THRESHOLDS) + " |")
    print("|---|" + "---|" * len(THRESHOLDS))
    for task in tasks:
        labels = {item["id"]: item["label"] for item in load(task)}
        rows = json.loads((OUT / task / "r1-decider.json").read_text())["rows"]
        cells = []
        for threshold in THRESHOLDS:
            kept = [row for row in rows if row["confidence"] >= threshold]
            right = sum(row["answer"] == labels[row["id"]] for row in kept)
            cells.append(f"{len(kept) / len(rows):.0%} kept, {right / len(kept):.0%} right" if kept else "none kept")
        print(f"| {task} | " + " | ".join(cells) + " |")
    (OUT / "summary.json").write_text(json.dumps(summary, indent=1))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("prepare")
    p.add_argument("task", choices=TASKS)
    p.add_argument("--run", type=int, required=True)
    p.add_argument("--batch", type=int, default=20)
    s = sub.add_parser("score")
    s.add_argument("tasks", nargs="+", choices=TASKS)
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.task, args.run, args.batch)
    else:
        score(args.tasks)


if __name__ == "__main__":
    main()
