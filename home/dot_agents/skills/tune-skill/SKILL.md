---
name: tune-skill
description: "Audit a skill against Anthropic's skill and prompting guides, tighten it, and prove the change with evals. Use to improve, tune, or audit a SKILL.md, or when a skill acts inconsistently or was written for an older model."
metadata:
  tested-models: "sonnet, opus"
---

# Tune skill

Change an existing skill only where a guideline or an eval result gives a reason.
Each kept edit must hold or raise the eval pass rate.

## Source documents

The rules below summarize the Anthropic documents. Refresh the local copies before each run:

```bash
python3 scripts/fetch_docs.py
```

The scripts use only the Python standard library. `fetch_docs.py` writes Markdown to `~/.cache/tune-skill/docs/`.
Read `skill-best-practices.md` there when a rule below is unclear or when the audit and this file disagree.
Read the `prompting-<model>.md` guide for each model that runs the skill.
Add a document with `--url <url>`. The `llms.txt` file in the cache lists every page.

## Workflow

Copy this checklist into your reply and update it as you work:

```text
- [ ] 1. Run the structural audit
- [ ] 2. Do the judgment review
- [ ] 3. Make sure there are 3 or more evals
- [ ] 4. Report the findings and the edit plan
- [ ] 5. Snapshot, edit, and re-audit until no error remains
- [ ] 6. Run the evals old against new on each target model
- [ ] 7. Keep or revert each edit from the eval result
```

### 1. Run the structural audit

```bash
python3 scripts/audit_skill.py <skill-dir>
python3 scripts/audit_skill.py --min-severity warn <dir-a> <dir-b>
```

The script exits `1` when it finds an error. Use `--json` for a machine-readable report.
Fix every `error`. Treat each `warn` as a candidate edit. Ignore an `info` finding unless the file is dead weight.

### 2. Do the judgment review

The audit cannot check these rules. Read the full skill and record each finding with a file and a line.

| Rule | Check |
| --- | --- |
| Concise | Delete each sentence that tells the model a fact it already knows. Keep project facts, conventions, and gotchas. |
| Degrees of freedom | For each step, ask what breaks if the model does it differently. Give a goal when nothing breaks. Give a template when the shape matters. Give an exact command or a script when the step is fragile, such as money, deletion, or a migration. One skill can mix the three levels. |
| Scripts for fragile steps | Replace a long prose procedure for a fragile step with a script. The model runs a script and does not load its text into context. |
| Prescription level | Look for all-caps rules, repeated warnings, and step lists for work where the order does not matter. Newer models over-apply them. Cut them and let the evals decide. |
| Checklists | Use a checklist only when the order matters. A validation step must name the step to return to on failure. |
| Feedback loop | A quality-critical output must have a check, fix, and repeat loop. The check can be a script or a written standard. |
| Progressive disclosure | Keep the body under 500 lines. Split references by domain so that one task loads one file. Link every reference from SKILL.md. |
| Dependencies | Put the install command next to each script that needs a package. Do not assume a tool is present. |
| Description | State what the skill does and when to use it, in the third person, with the words a user types. |
| Terminology | Use one name for one thing in all files. |
| Options | Give one default and one escape hatch, not a menu. |
| Examples | Make each example concrete and close to a real input. |

### 3. Make sure there are 3 or more evals

Read `evals/evals.json` in the skill. Write the missing cases in this shape:

```json
{
  "skill_name": "<name>",
  "evals": [
    {"id": 1, "prompt": "<a request a user would type>", "expected_output": "<the result>", "files": [], "expectations": ["<a check that a grader can verify>"]}
  ]
}
```

Base each case on a real request or a real failure, not on the rule you plan to add.
Include one case where the skill must decline or push back.
When the skill reads files or a repository, put a small fixture under `evals/fixtures/` and list it in `files`.
Without a fixture, a grader cannot check an assertion about evidence from a file.

### 4. Report the findings and the edit plan

List each finding with its rule, its location, and the edit you plan.
Stop here when the user asked for an audit only.

### 5. Snapshot, edit, and re-audit until no error remains

Snapshot the skill before the first edit. Keep the workspace out of the skill's parent directory, because a dotfiles manager or a skill loader can install it as a skill:

```bash
WS=~/.cache/tune-skill/<name>-workspace
mkdir -p $WS && cp -R <skill-dir> $WS/skill-snapshot
```

Change how the skill instructs, not what the skill does. Ask the user before you add or remove a behavior.
Make the edits. Run the audit again, and also run the repository's own lint, which can be stricter. Return to the edit when an error remains.

### 6. Run the evals old against new on each target model

Run on each model that the skill targets. Without a stated target, run on Haiku, Sonnet, and Opus.
Evaluate all the edits as one batch. Use the snapshot as the baseline.

```bash
python3 scripts/eval_run.py setup $WS --evals <skill-dir>/evals/evals.json
```

The command prints one `outputs/` directory for each model, eval, and config. For each directory, start a subagent on that model.
Give it the eval prompt and the skill path, which is the snapshot for `old_skill` or `<skill-dir>` for `new_skill`. Tell it to write its reply to `response.md` in that directory.
Record each task notification with `python3 scripts/eval_run.py timing <run-dir> <tokens> <duration_ms>`.

Grade blind, so that a grader cannot favor the new version:

```bash
python3 scripts/eval_run.py blind $WS
```

Start one grader for each `$WS/blind/eval-<id>/` directory. Use skill-creator's `agents/grader.md` as its standard.
Tell it to write `R<nnn>.grading.json` next to each reply that has none, with an `expectations` list of `text`, `passed`, and `evidence`.
Then print the pass rate per model:

```bash
python3 scripts/eval_run.py report $WS
```

Read the result per model:

- A step that a small model misses needs a clearer instruction or a script.
- A large model that does worse with the skill than without it needs fewer instructions. Cut until the result recovers.

### 7. Keep or revert each edit from the eval result

Check the evals before you trust the pass rate:

- The report lists each assertion that has the same result in every run. That assertion cannot show a change.
- Read the grader notes. An assertion that rewards a wrong behavior, such as a score with no evidence, gives a false gain.

Fix those assertions and grade again before you decide. Fixing an assertion does not require you to run the skill again.

With one run for each config, treat a change of one assertion as noise.
When a target model regresses, revert one edit at a time to find the cause. When the decision depends on a small change, run `setup --runs 3` on the same workspace for that model, run the new subagents, then run `blind` again. It adds only the new runs, so the graders grade only those.
Revert an edit that lowers the pass rate on a target model. Keep an edit that holds the pass rate and removes text.
When a run fails for a reason that no rule covers, propose the new rule to the user. Do not add it unasked.

Report the audit before and after, the pass rate per model before and after, and each reverted edit.
