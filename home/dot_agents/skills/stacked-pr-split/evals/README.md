# Evals for `stacked-pr-split`

Three evals, each backed by a generated fixture repository so the run works on a real diff with known ground truth. Same layout as `skills/context7/evals/` — `evals.json` here, run results under `skills/stacked-pr-split-workspace/iteration-N/`.

## Why fixtures

`context7`'s evals are pure prompts; this skill needs a repository to split. Describing a diff in prose would let a run agree with a plan it never verified. A generated repo makes every mechanical assertion falsifiable: either the built stack reproduces the original branch or it doesn't.

Fixtures are deterministic — no network, no clock in the content, no GitHub.

| Fixture | Weighted / raw lines | Tests |
|---|---|---|
| `layered-feature` | 887 / ~1,500 | Happy path: 4 natural layers, a rename, lockfile churn |
| `straddling-file` | 895 / ~1,500 | One file carrying two dependency levels — no clean file-level split exists |
| `mostly-generated` | 146 / ~1,900 | A big-looking diff that should **not** be split |

## Running

```bash
cd skills/stacked-pr-split

# 1. Build a fixture (prints the repo path; wipes and recreates it)
bash evals/fixtures/make-fixture.sh layered-feature

# 2. Run the eval prompt from evals.json against that repo, with and without
#    the skill, saving each arm's outputs and transcript.

# 3. Grade the mechanical assertions.
#    Pass the plan the run produced, or copy it to the default location:
#    <repo-dir>.plan.json — i.e. a sibling file named after the repo.
cp /tmp/plan.json /tmp/stacked-pr-split-fixtures/layered-feature.plan.json
bash evals/grade.sh layered-feature /tmp/stacked-pr-split-fixtures/layered-feature

# ...or point at it directly:
bash evals/grade.sh layered-feature /tmp/stacked-pr-split-fixtures/layered-feature /tmp/plan.json
```

The default is `<repo-dir>.plan.json` rather than `<repo-dir>/../plan.json` because all three fixtures share a parent directory — a bare `plan.json` there gets clobbered by whichever eval ran last, and you grade the wrong plan without noticing.

`grade.sh` writes `grading.json` in the shape the skill-creator eval viewer expects (`expectations[].{text,passed,evidence}` plus `summary`), so results drop straight into `scripts/aggregate_benchmark` and `eval-viewer/generate_review.py`.

## What is graded how

Assertions in `evals.json` whose text matches `grade.sh` output **verbatim** are graded mechanically. The rest are judgment-shaped — whether the run sought approval before touching git, whether it explained the straddling file instead of quietly working around it, whether it pushed back on the generated diff — and need a human or grader model reading the transcript. Forcing those into a script would only measure whether the run said a magic word.

`fixtures/expected/layered-feature.plan.json` is a reference solution. Not the only correct answer: merging layers 3 and 4, or splitting store from auth, are both defensible. It exists to sanity-check the grader and to document what a good plan looks like.

## Scope limit

Fixtures have **no git remote**, so these evals cover Phases 0–5: preflight, ingest, measure, plan, build, verify. Phase 6+ — `gh stack init` / `submit --auto`, and migrating review threads off the original PR — needs a real GitHub repo with stacked pull requests enabled, plus the `gh stack` extension installed. That half is untested here; treat it as the known coverage gap.

The eval prompts say "local branches only, nothing on GitHub" partly to keep runs inside this boundary and partly because it is what someone with an unpushed branch would actually ask for.

## Verifying the grader itself

A grader that passes everything measures nothing. Confirmed discrimination against deliberately-broken plans:

| Plan | Score | Caught by |
|---|---|---|
| reference | 10/10 | — |
| inverted layer order | 9/10 | dependency ordering |
| rename split across layers | 9/10 | rename cohesion |
| lockfile given its own layer | 9/10 | lockfile budget |
| one giant layer | 8/10 | layer count + 600-line cap |
| plan written, never built | 9/10 | losslessness |
| straddling file duplicated | 9/11 | coverage + losslessness |
| generated diff split anyway | 1/2 | "does not split" |

Note that the inverted-order plan still passes losslessness — reversing layers yields a complete stack, just an unreviewable one. That separation is the point: the gates prove nothing was lost, the ordering assertions judge whether the split is any good.

Re-run these checks after changing `grade.sh`.
