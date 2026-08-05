#!/usr/bin/env python3
"""Grade the mechanically checkable assertions of the STE skill evals.

For each run directory it emits `mechanical.json`: the objective signals a
human grader would otherwise eyeball. Judgment-bound assertions (did it explain
its reasoning? is the report proportionate?) are graded by reading, not here.

Usage: python3 grade_mechanical.py <iteration-dir>
"""

import json
import os
import re
import subprocess
import sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECKER = os.path.join(SKILL, "scripts", "ste_check.py")
FIXTURES = os.path.join(SKILL, "evals", "fixtures")

BANNED = ["ensure", "verify", "should", "may ", "however", "therefore", "e.g.",
          "i.e.", "etc.", "utilize", "perform", "execute", "currently",
          "experiencing", "elevated", "actively", "shortly", "provide"]
CONTRACTION_RE = re.compile(r"\b\w+n't\b|\b(?:it|that|there|you|we|they)'(?:s|re|ve|ll)\b", re.I)

EVAL1_FACTS = ["profile-enrichment", "/profiles/:id", "CrashLoopBackOff", "OOMKilled",
               "maxReplicaCount", "ClusterTriggerAuthentication", "14 d",
               "Consumer Profile - Queue Depth", "kubectl get pods -n consumer-profile"]
EVAL2_RULES = ["1.1", "3.4", "3.6", "5.5", "6.3", "8.1", "GR-6", "3.5", "7.1", "1.5"]


def run_checker(path, extra=()):
    out = subprocess.run([sys.executable, CHECKER, *extra, path],
                         capture_output=True, text=True, cwd=SKILL)
    findings = [line for line in out.stdout.splitlines() if re.search(r":\d+: \[", line)]
    errors = [f for f in findings if "] error:" in f]
    warns = [f for f in findings if "] warn:" in f]
    return errors, warns


def ste_text_files(outputs):
    """Text files that are meant to BE Simplified Technical English."""
    keep = []
    for name in sorted(os.listdir(outputs)):
        if not name.endswith(".md"):
            continue
        if name in {"commands.md"}:
            continue
        keep.append(os.path.join(outputs, name))
    return keep


def deliverable_text(outputs, files):
    """The text that is meant to BE STE, separated from the agent's reply prose.

    When the run wrote a dedicated artifact file, that file is the deliverable.
    When the whole answer is the reply (the one-line status-page eval), the
    deliverable is the quoted or fenced rewrite inside it — grading the
    surrounding explanation would punish a run for quoting the original.
    """
    artifacts = [f for f in files if os.path.basename(f) not in {"response.md", "commands.md"}]
    if artifacts:
        return "\n".join(open(f, encoding="utf-8").read() for f in artifacts), \
               [os.path.basename(f) for f in artifacts]

    response_path = os.path.join(outputs, "response.md")
    if not os.path.exists(response_path):
        return "", []
    text = open(response_path, encoding="utf-8").read()

    blocks = re.findall(r"(?:^>.*\n?)+", text, re.M)
    if blocks:
        longest = max(blocks, key=len)
        return re.sub(r"^>\s?", "", longest, flags=re.M).replace("**", ""), ["response.md (quoted rewrite)"]
    fenced = re.findall(r"```[a-z]*\n(.*?)```", text, re.S)
    if fenced:
        return max(fenced, key=len), ["response.md (fenced rewrite)"]
    return text, ["response.md (whole reply)"]


def longest_step_words(text):
    """Longest STE word count among the numbered or bulleted steps."""
    worst, worst_line = 0, ""
    for line in text.splitlines():
        if not re.match(r"^\s*(?:[-*+]|\(?\d+[.)])\s+\S", line):
            continue
        body = re.sub(r"^\s*(?:[-*+]|\(?\d+[.)])\s+", "", line)
        for part in re.split(r"(?<=[.!?:])\s+", body):
            proc = subprocess.run(
                [sys.executable, "-c",
                 "import sys;sys.path.insert(0,'scripts');import ste_check as s;"
                 "print(s.ste_word_count(sys.argv[1]))", part],
                capture_output=True, text=True, cwd=SKILL)
            try:
                count = int(proc.stdout.strip())
            except ValueError:
                continue
            if count > worst:
                worst, worst_line = count, part[:80]
    return worst, worst_line


def grade_run(run_dir, eval_id):
    outputs = os.path.join(run_dir, "outputs")
    result = {"run": run_dir, "eval_id": eval_id, "signals": {}}
    if not os.path.isdir(outputs) or not os.listdir(outputs):
        result["signals"]["produced_output"] = {"passed": False, "evidence": "outputs/ is empty"}
        return result

    files = ste_text_files(outputs)
    body = "\n".join(open(f, encoding="utf-8").read() for f in files)
    response_path = os.path.join(outputs, "response.md")
    response = open(response_path, encoding="utf-8").read() if os.path.exists(response_path) else ""
    commands_path = os.path.join(outputs, "commands.md")
    commands = open(commands_path, encoding="utf-8").read() if os.path.exists(commands_path) else ""

    result["signals"]["produced_output"] = {
        "passed": True, "evidence": f"{len(os.listdir(outputs))} file(s): {os.listdir(outputs)}"}

    # Did the run use the bundled checker at all?
    used = bool(re.search(r"ste_check\.py", commands + response))
    result["signals"]["used_bundled_checker"] = {
        "passed": used,
        "evidence": "ste_check.py referenced in commands/response" if used
        else "no reference to ste_check.py"}

    deliverable, deliverable_names = deliverable_text(outputs, files)
    result["signals"]["deliverable_identified"] = {
        "passed": bool(deliverable.strip()),
        "evidence": f"graded as STE: {deliverable_names}"}

    # STE compliance of the delivered text. Eval 2 delivers an audit report
    # about someone else's text, so the report itself is not held to STE.
    if eval_id != 2:
        tmp = os.path.join(run_dir, "_deliverable.md")
        with open(tmp, "w", encoding="utf-8") as handle:
            handle.write(deliverable)
        all_errors, all_warns = run_checker(tmp)
        os.remove(tmp)
        result["signals"]["checker_zero_errors_on_output"] = {
            "passed": not all_errors,
            "evidence": f"{len(all_errors)} error, {len(all_warns)} warn on {deliverable_names}"
                        + ("; first: " + all_errors[0].split("] ", 1)[-1] if all_errors else "")}

        worst, snippet = longest_step_words(deliverable)
        result["signals"]["steps_within_20_words"] = {
            "passed": worst <= 20,
            "evidence": f"longest step = {worst} STE words: \"{snippet}\"" if worst
            else "no numbered or bulleted steps found"}

    # An audit report quotes the fixture's banned words and semicolons as
    # evidence, so these three signals apply only to text that is itself STE.
    if eval_id != 2:
        hits = sorted({w.strip() for w in BANNED
                       if re.search(rf"(?<![\w-]){re.escape(w.strip())}", deliverable, re.I)})
        result["signals"]["no_banned_vocabulary"] = {
            "passed": not hits, "evidence": f"found: {hits}" if hits else "none of the banned words"}

        prose = re.sub(r"```.*?```", "", deliverable, flags=re.S)
        semis = prose.count(";")
        result["signals"]["no_semicolon_in_prose"] = {
            "passed": semis == 0, "evidence": f"{semis} semicolon(s) outside code blocks"}

        contractions = sorted(set(CONTRACTION_RE.findall(prose)))
        result["signals"]["no_contractions"] = {
            "passed": not contractions,
            "evidence": f"found: {contractions}" if contractions else "none"}

    has_safety = bool(re.search(r"\b(WARNING|CAUTION)\b", deliverable))
    if eval_id in (1, 3):
        result["signals"]["has_warning_or_caution"] = {
            "passed": has_safety,
            "evidence": "WARNING/CAUTION present" if has_safety else "no WARNING or CAUTION block"}

    if eval_id == 1:
        missing = [f for f in EVAL1_FACTS
                   if f.replace("14 d", "14") not in body and f not in body]
        result["signals"]["facts_preserved"] = {
            "passed": not missing, "evidence": f"missing: {missing}" if missing
            else f"all {len(EVAL1_FACTS)} facts present"}
        note_instruction = bool(re.search(r"NOTE.{0,120}(page|tell|inform)", deliverable, re.I | re.S))
        result["signals"]["note_no_longer_holds_instruction"] = {
            "passed": not note_instruction,
            "evidence": "a NOTE still carries the paging instruction" if note_instruction
            else "paging rule is not inside a NOTE"}
        table = bool(re.search(r"\|.*(rule|Rule).*\|", response + body))
        result["signals"]["change_summary_table"] = {
            "passed": table, "evidence": "rule/before/after table present" if table
            else "no change table found"}

    if eval_id == 2:
        cited = [r for r in EVAL2_RULES if re.search(rf"(?<![\d.]){re.escape(r)}(?![\d])", body)]
        result["signals"]["cites_six_distinct_rules"] = {
            "passed": len(cited) >= 6, "evidence": f"cited {len(cited)}: {cited}"}
        l5 = "line 5" in body.lower() or ":5" in body
        l15 = "line 15" in body.lower() or ":15" in body
        result["signals"]["locates_both_prose_semicolons"] = {
            "passed": l5 and l15,
            "evidence": f"line 5 cited: {l5}, line 15 cited: {l15}"}
        sql_flagged = bool(re.search(r"REBUILD_SHOPPER_PROFILE.{0,200}(semicolon|8\.1)", body, re.S))
        result["signals"]["spares_sql_semicolon"] = {
            "passed": not sql_flagged,
            "evidence": "flagged the SQL statement terminator" if sql_flagged
            else "SQL block not flagged for the semicolon"}
        rewrote = len(body) > 2 * os.path.getsize(os.path.join(FIXTURES, "migration-doc.md"))
        result["signals"]["did_not_deliver_full_rewrite"] = {
            "passed": True,
            "evidence": f"output {len(body)} chars vs fixture "
                        f"{os.path.getsize(os.path.join(FIXTURES, 'migration-doc.md'))}"
                        f" — {'verify by reading (long output)' if rewrote else 'report-sized'}"}

    if eval_id == 3:
        verbatim = "eq-sync reset" in deliverable
        result["signals"]["command_verbatim"] = {
            "passed": verbatim, "evidence": "eq-sync reset present" if verbatim else "command altered or absent"}

    if eval_id == 4:
        facts = {"api": bool(re.search(r"quote submission", deliverable, re.I)),
                 "high_errors": bool(re.search(r"error", deliverable, re.I)),
                 "cause_known": bool(re.search(r"cause", deliverable, re.I)),
                 "fix_in_progress": bool(re.search(r"fix|correct|repair", deliverable, re.I)),
                 "further_update": bool(re.search(r"update|message|report|tell", deliverable, re.I))}
        result["signals"]["keeps_all_facts"] = {
            "passed": all(facts.values()), "evidence": json.dumps(facts)}
        invented = re.findall(r"\b\d{1,3}%|\bINC-\d+|\b\d{1,2}:\d{2}\b", deliverable)
        # A next-update time is fine when the run tells the author to replace it.
        flagged = bool(re.search(r"replace|placeholder|fill in|TBD|<[^>]*>|\[[^\]]*\]",
                                 response + deliverable, re.I))
        result["signals"]["invents_no_unmarked_numbers"] = {
            "passed": not invented or flagged,
            "evidence": (f"found {invented}; marked as a placeholder to replace: {flagged}"
                         if invented else "no invented numbers")}
        progressive = re.findall(r"\b(?:is|are|was|were|am)\s+\w+ing\b", deliverable, re.I)
        perfect = re.findall(r"\b(?:has|have|had)\s+\w+(?:ed|en)\b", deliverable, re.I)
        result["signals"]["no_progressive_or_perfect"] = {
            "passed": not progressive and not perfect,
            "evidence": f"progressive: {progressive}, perfect: {perfect}"}

    return result


def main():
    iteration = sys.argv[1]
    summary = []
    for entry in sorted(os.listdir(iteration)):
        eval_dir = os.path.join(iteration, entry)
        if not os.path.isdir(eval_dir) or not entry.startswith("eval-"):
            continue
        eval_id = int(entry.split("-")[1])
        for arm in ("with_skill", "without_skill"):
            run_dir = os.path.join(eval_dir, arm)
            if not os.path.isdir(run_dir):
                continue
            graded = grade_run(run_dir, eval_id)
            with open(os.path.join(run_dir, "mechanical.json"), "w") as handle:
                json.dump(graded, handle, indent=2)
            passed = sum(1 for s in graded["signals"].values() if s and s["passed"])
            total = sum(1 for s in graded["signals"].values() if s)
            summary.append((entry, arm, passed, total, graded["signals"]))

    for entry, arm, passed, total, signals in summary:
        print(f"\n{entry} [{arm}] {passed}/{total} mechanical signals")
        for name, signal in signals.items():
            if not signal:
                continue
            mark = "PASS" if signal["passed"] else "FAIL"
            print(f"  {mark} {name}: {signal['evidence'][:150]}")


if __name__ == "__main__":
    main()
