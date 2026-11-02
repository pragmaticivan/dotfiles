---
name: decider
description: 'Triage many items at once with the local strands-decider model: yes/no, pick-one, and score answers with a confidence. Use to sort test failures, log lines, grep hits, or review comments, or for a decision in a hook or script.'
allowed-tools: Bash(python3:*)
---

# Decider

`strands-decider` is a 2B decision model that Ollama serves at `http://localhost:11434/v1/systemone`. It reads a text (the state) and answers typed questions about it. It does not generate text. A warm question takes about 0.1 s.

## When to use it

Use it to sort many items before you read them yourself. Reading 200 log lines or 60 grep hits in context costs tokens and attention. One call per item costs neither.

Do not use it for:

- One decision about something already in your context. Decide yourself. You are more accurate, and the call adds a round trip.
- A fact that a command can show, such as whether a test passes or a file exists. Run the command.
- Arithmetic, dates, long policies, multi-step inference, or tradeoffs. Jev-class models are weak there.
- A safety or permission gate. In a test, it called `kubectl delete namespace payments-prod` not destructive.

## Ask

Run from this skill's directory. Send the request as JSON on stdin. Use `"states": [...]` for a batch and `"state": "..."` for one item. Put a big state, such as a diff or a log, in a file and pass `--state-file`.

```bash
python3 scripts/decide.py <<'EOF'
{"states": ["FAIL api.test.ts: timeout waiting for db connection", "FAIL parse.test.ts: expected 3 to equal 4"],
 "questions": {
   "env": {"type": "noul", "instructions": "Did the failure come from the machine or a missing service, not the code?"},
   "area": {"type": "choice", "instructions": "Which area failed?", "criteria": {"db": "Database access", "parser": "Row parsing"}},
   "severity": {"type": "score", "instructions": "How severe is the failure?", "criteria": ["Cosmetic", "Degraded", "Broken"]}}}
EOF
```

The script prints one JSON line per state, in order:

```json
{"env": {"answer": "yes", "confidence": 0.549, "sure": false}, "area": {"answer": "db", "confidence": 0.871, "sure": false}, "severity": {"answer": "Broken", "confidence": 0.046, "sure": false, "score": 1.243}}
{"env": {"answer": "no", "confidence": 0.802, "sure": false}, "area": {"answer": "parser", "confidence": 0.671, "sure": false}, "severity": {"answer": "Broken", "confidence": 0.022, "sure": false, "score": 1.161}}
```

- `noul` is a yes/no question. `criteria` is not necessary.
- `choice` picks one key from `criteria`. Each value describes its key, and the model reads it.
- `score` rates on the `criteria` list, in order from low to high. `answer` is the most probable label, and `score` is the expected index. Its confidence is usually low, thus prefer `choice` or `noul`.
- Many questions about one state cost almost the same as one question. Ask them all in one call.

`--raw` prints the model's probabilities. `--threshold` changes the 0.9 confidence that sets `sure`. `DECIDER_URL` and `DECIDER_MODEL` override the endpoint and the model.

## Act on the answer

- `sure: true`: act on the answer. Upstream measured about 95% accuracy at a confidence of 0.9 or more.
- `sure: false`: read the item yourself. Use the answer to order your reading, not to skip it.
- Exit code not 0: the model is down. Say so in one line and do the work without it.

Most answers come back with `sure: false`. Thus the usual gain is the order of your reading. Report how many items the model settled and how many you checked.

## Write good questions

- Put the facts in the state and one question in `instructions`.
- Prefer a concrete yes/no question to an abstract category. "Did the machine run out of disk space?" was right and sure. "Which category caused this failure?" was wrong on the same log line.
- Name the item and the task in the state when relevance depends on the task: `Task: <task>\nHit: <grep line>`.
- The wording moves the answer. When the answers look wrong on a few items that you know, change the wording before you trust the batch.

[references/use-cases.md](references/use-cases.md) has tested requests for development tasks.
