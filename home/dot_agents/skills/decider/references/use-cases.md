# Tested use cases

Each request below ran against `strands-decider` on 2026-10-27. The result shows the top answers and the confidence range. Run `python3 scripts/decide.py` with the JSON on stdin.

| Use case | Top answers right | Confidence |
| --- | --- | --- |
| Commit type from a diff summary | 3 of 3 | 0.68 to 0.88 |
| Review-bot comment triage | 3 of 3 | 0.15 to 0.88 |
| Grep hit relevance to a task | 3 of 3 | 0.71 to 0.89 |
| Docs-only change, to skip a test run | 3 of 3 | 0.74 to 0.89 |
| Playbook routing from a user request | 4 of 4 | 0.51 to 0.73 |
| Destructive shell command | 4 of 5 | 0.50 to 0.93 |
| Eval assertion grading | 1 of 2 | 0.70 to 0.93 |

The answers are mostly right, but few reach the 0.9 confidence. Use the model to order and pre-sort work, and check each item that is not `sure`.

## Triage test failures

```json
{"states": ["<one failure block>", "<another failure block>"],
 "questions": {"disk": {"type": "noul", "instructions": "Did the machine run out of disk space?"},
               "service": {"type": "noul", "instructions": "Did the test fail because a service such as a database was not available?"}}}
```

Read the failures that both questions answer `no` first. They are the likely code bugs.

## Filter grep hits

```json
{"states": ["Task: find where the retry backoff is computed.\nHit: src/http/retry.ts:18: const delay = base * 2 ** attempt + jitter()"],
 "questions": {"relevant": {"type": "noul", "instructions": "Is this search hit relevant to the task?"}}}
```

Open the `yes` hits first. Skip only a `no` that is `sure`.

## Triage review-bot comments

```json
{"states": ["Bot comment on src/db.ts:42: `rows` can be undefined when the query returns no result, and `rows.length` then throws."],
 "questions": {"action": {"type": "choice", "instructions": "What must the author do with this review comment?",
                          "criteria": {"fix": "It names a real bug that a user could hit", "dismiss": "A style nit or a preference with no defect", "ask": "It is unclear what the reviewer wants"}},
               "bug": {"type": "noul", "instructions": "Does the comment name a concrete runtime failure?"}}}
```

Verify each `fix` against the code before you change it. The model reads the comment, not the code.

## Pick a commit type

```json
{"state": "<diff --stat and a one-line summary>",
 "questions": {"type": {"type": "choice", "instructions": "Which Conventional Commits type fits this change?",
                        "criteria": {"feat": "Adds a new feature or flag", "fix": "Fixes a bug", "chore": "Dependency bump or tooling with no behavior change", "docs": "Only documentation"}}}}
```

## Decide in a hook or a script

A hook has no LLM in the loop. Call the script and branch on `sure`:

```bash
python3 ~/.agents/skills/decider/scripts/decide.py --state-file "$LOG" <<'EOF' | jq -e '.flaky.sure and .flaky.answer == "yes"'
{"questions": {"flaky": {"type": "noul", "instructions": "Did the test fail from timing or ordering that a retry can pass?"}}}
EOF
```

Let the hook only add a note or order a queue. Do not let it block or allow an action.
