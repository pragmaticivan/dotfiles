#!/usr/bin/env python3
"""Lay out a blind run of skill evals: eval_run.py workspace, a skill snapshot with no evals/, and a sanitized work dir per case.

prep.py setup <skill>... [--config old_skill|new_skill] [--iteration N]  -> writes briefs to /tmp/skillrun/briefs.jsonl
prep.py collect                                                          -> copies replies into outputs/response.md
"""
import json, random, shutil, subprocess, sys
from pathlib import Path

SRC = Path.home() / ".local/share/chezmoi/home/dot_agents/skills"
ROOT = Path("/tmp/skillrun")
WS = ROOT / "ws"
SNAP = Path("/tmp/agent-skills")
WORK = Path("/tmp/projects")
EVAL_RUN = SRC / "tune-skill/scripts/eval_run.py"
WORDS = "amber birch cedar delta ember fjord grove harbor iris juniper kestrel lumen maple nimbus orchid pine quartz river sage tundra umber vale willow yarrow zephyr".split()
FENCE = ("You may read from GitHub, Jira, and other remote systems, but do not write to them: "
         "no comments, replies, pushes, merges, ticket edits, or messages. "
         "Do not change any file outside /tmp, and do not run chezmoi apply.")


def brief(skill_dir, workdir, reply, prompt):
    return (f"Your working directory is {workdir}. The skill for this request is at {skill_dir}/SKILL.md. "
            f"Read it and follow it.\n{FENCE}\n"
            f"When you finish, write your complete final reply to the user, as you would show it in chat, to {reply}. "
            f"Your last message to me is only the word done.\n\nThe request:\n\n{prompt}")


def undot(path):
    """Apply the chezmoi executable_ and dot_ prefixes, as an install would."""
    for p in sorted(path.rglob("*") if path.is_dir() else [], key=lambda p: -len(p.parts)):
        name = p.name
        if name.startswith("executable_"):
            name = name[len("executable_"):]
            p.chmod(0o755)
        if name.startswith("dot_"):
            name = "." + name[4:]
        if name != p.name:
            p.rename(p.with_name(name))


def setup(skills, config, iteration, model="sonnet"):
    rng = random.Random()
    briefs = []
    for skill in skills:
        sdir = SRC / skill
        ev = json.loads((sdir / "evals/evals.json").read_text())["evals"]
        ws = WS / skill
        subprocess.run([sys.executable, EVAL_RUN, "setup", ws, "--evals", sdir / "evals/evals.json",
                        "--models", model, "--iteration", str(iteration)], check=True, capture_output=True)
        snap = SNAP / (skill if config == "old_skill" else f"{skill}-v{iteration}")
        if config == "old_skill" and not snap.exists() or config == "new_skill":
            shutil.rmtree(snap, ignore_errors=True)
            shutil.copytree(sdir, snap, ignore=shutil.ignore_patterns("evals", "*-workspace"))
            undot(snap)
        for case in ev:
            slug = f"{rng.choice(WORDS)}-{rng.choice(WORDS)}-{rng.randint(10, 99)}"
            while (WORK / slug).exists():
                slug = f"{rng.choice(WORDS)}-{rng.choice(WORDS)}-{rng.randint(10, 99)}"
            workdir = WORK / slug
            workdir.mkdir(parents=True)
            for f in case.get("files", []):
                src = sdir / f
                dst = workdir / f
                dst.parent.mkdir(parents=True, exist_ok=True)
                (shutil.copytree if src.is_dir() else shutil.copy)(src, dst)
                undot(dst)
                script = dst / "setup.sh"
                if script.exists():
                    subprocess.run(["bash", script.name], cwd=dst, check=True, capture_output=True)
                    script.unlink()
            reply = WORK / f"{slug}.reply.md"
            outputs = ws / model / f"iteration-{iteration}" / f"eval-{case['id']}" / config / "run-1" / "outputs"
            briefs.append({"skill": skill, "id": case["id"], "slug": slug, "reply": str(reply), "outputs": str(outputs),
                           "brief": brief(snap, workdir, reply, case["prompt"])})
        other = "new_skill" if config == "old_skill" else None
        if other:
            for d in ws.glob(f"*/iteration-{iteration}/eval-*/{other}"):
                shutil.rmtree(d)
    for b in briefs:
        (WORK / f"{b['slug']}.task.md").write_text(b["brief"])
    with open(ROOT / "briefs.jsonl", "a") as fh:
        for b in briefs:
            fh.write(json.dumps(b) + "\n")
    for b in briefs:
        print(b["skill"], b["id"], b["slug"])


def collect():
    missing = []
    for line in (ROOT / "briefs.jsonl").read_text().splitlines():
        b = json.loads(line)
        reply, out = Path(b["reply"]), Path(b["outputs"]) / "response.md"
        if reply.exists():
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(reply.read_text() + f"\n\n---\nWorking directory after the run: {WORK / b['slug']}\n")
        elif not out.exists():
            missing.append(f"{b['skill']}#{b['id']} {b['slug']}")
    print("missing:", *missing, sep="\n  ") if missing else print("all collected")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[0] == "collect":
        collect()
    elif args[0] == "pop":
        pending = ROOT / "pending.txt"
        items = pending.read_text().split() if pending.exists() else []
        queue = (ROOT / "queue.txt").read_text().split()
        pos = int((ROOT / "next.txt").read_text())
        n = int(args[1])
        while len(items) < n and pos < len(queue):
            items.append(queue[pos]); pos += 1
        out, rest = items[:n], items[n:]
        pending.write_text("".join(s + "\n" for s in rest))
        (ROOT / "next.txt").write_text(str(pos))
        print(" ".join(out), f"| left: {len(rest) + len(queue) - pos}")
    elif args[0] == "timing":
        for pair in args[1:]:
            slug, tokens, ms = pair.split(":")
            for line in (ROOT / "briefs.jsonl").read_text().splitlines():
                b = json.loads(line)
                if b["slug"] == slug:
                    subprocess.run([sys.executable, EVAL_RUN, "timing", Path(b["outputs"]).parent, tokens, ms], check=True)
    else:
        config = "old_skill"
        iteration = 1
        if "--config" in args:
            i = args.index("--config"); config = args[i + 1]; del args[i:i + 2]
        if "--iteration" in args:
            i = args.index("--iteration"); iteration = int(args[i + 1]); del args[i:i + 2]
        setup(args[1:], config, iteration)
