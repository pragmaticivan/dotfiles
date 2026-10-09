# Ticket templates

One template for each type. Copy the template for the type, fill each slot, and delete the guide text in angle brackets. Keep each heading. `scripts/lint_ticket.py` reads the `##` headings in this file and fails a ticket that drops one.

Rules for all types:

- The first three lines answer "what, why, done" for a reader who stops there.
- Write for the engineer who was not in the meeting. No "as discussed", no "the usual way".
- Each `Acceptance Criteria` item is something a person can see, run, or measure. "Works correctly" fails.
- An unknown becomes an open question with an owner. Do not guess an answer.
- Tag each open question `[blocking]` or `[non-blocking]`. An agent does not start a ticket with a `[blocking]` question. Thus tag a question `[blocking]` only when a different answer changes what gets built. A question that the engineer can answer from the code, or that changes only a detail, is `[non-blocking]`.
- Do not add scope that the request did not ask for: new error types, metrics, or targets. Put an idea like that in `Open questions` as `[non-blocking]`.
- Name a file, symbol, or command only when you read it in the code. Otherwise write `not verified`.
- Keep lists flat. Jira renders nested lists badly.

## Story

```markdown
# <The outcome a user notices, for example "Leads list filters by created date">

**TL;DR** <Who> can <do what> so that <benefit>.
**Why now** <The pain or goal, with evidence: a number, a support ticket, a quote.>

## Acceptance Criteria
- [ ] <Given a state, when an action, then an observable result.>

## Out of scope
- <Adjacent work that a reader could expect here, and that this ticket does not do.>

## Open questions
- [blocking] <Question.> Owner: <name or role>.

## Agent notes
- **Ready for an agent:** <yes | no, blocked on the questions above>
- **Area:** <`path/` (verified) or not verified>
- **Start here:** <`path/file.ext` symbol, or not verified>
- **Verify:** <`command` that proves the Acceptance Criteria items>
- **Constraints:** <What must not change: APIs, flags, migrations, files owned by others.>
- **Depends on:** <KEY-123, or none>
```

## Task

```markdown
# <The end state, for example "Lead export runs on the shared job runner">

**TL;DR** <The change> so that <benefit>.
**Why now** <What goes wrong, or what gets slower, if nobody does this.>

## Acceptance Criteria
- [ ] <An observable end state: a command output, a metric, a config value.>

## Approach
<Optional. One to three lines on the known approach. Write "Open" when the engineer chooses.>

## Out of scope
- <Adjacent work that this ticket does not do.>

## Open questions
- [non-blocking] <Question.> Owner: <name or role>.

## Agent notes
- **Ready for an agent:** <yes | no, blocked on the questions above>
- **Area:** <`path/` (verified) or not verified>
- **Start here:** <`path/file.ext` symbol, or not verified>
- **Verify:** <`command`>
- **Constraints:** <What must not change.>
- **Depends on:** <KEY-123, or none>
```

## Bug

```markdown
# <The defect as a symptom, for example "Lead export drops rows after 10,000">

**TL;DR** <What breaks, for whom, and how often.>
**Impact** <Severity S1 to S4. Users or revenue affected. Workaround, or "none".>

## Repro
1. <Step.>
2. <Step.>

**Expected** <Result.>
**Actual** <Result.>
**Evidence** <Logs, a dashboard link, the first-seen date, the version or commit.>

## Acceptance Criteria
- [ ] The repro steps give the expected result.
- [ ] A regression test fails before the fix and passes after it.

## Open questions
- [blocking] <Question.> Owner: <name or role>.

## Agent notes
- **Ready for an agent:** <yes | no, blocked on the questions above>
- **Suspected cause:** <`path/file.ext` symbol and why, or unknown>
- **Area:** <`path/` (verified) or not verified>
- **Verify:** <`command` that runs the regression test>
- **Constraints:** <What must not change.>
- **Depends on:** <KEY-123, or none>
```

## Epic

```markdown
# <The business or user outcome, for example "Agents can work leads without leaving the leads list">

**TL;DR** <The outcome in one sentence.>
**Why now** <The goal, with evidence.>
**Success measure** <Metric: baseline to target, by date.>

## Scope
- In: <Item.>
- Out: <Item.>

## Breakdown
| # | Ticket | Type | Depends on | Lane |
|---|--------|------|------------|------|
| 1 | <Title> | Story | none | A |
| 2 | <Title> | Task | 1 | A |
| 3 | <Title> | Story | none | B |

Tickets in one lane run in order. Different lanes run in parallel and do not edit the same files.

## Risks
- <Risk and the mitigation.>

## Open questions
- [blocking] <Question.> Owner: <name or role>.
```
