---
# Source: https://github.com/cursor/plugins/blob/main/pstack/skills/interrogate/SKILL.md
name: interrogate
description: "Use for adversarial review of a change with one reviewer per configured model. Resolve findings with evidence, not votes. Return a review-only verdict."
---

# Interrogate

Spawn one reviewer per configured model to adversarially review code changes. Each model gets the same prompt and rubric, without assigned personas.
Use the [adversarial review protocol](../kaizen-mode/references/adversarial-review.md) for independence, finding records, evidence checks, and the review budget.
Agreement can prioritize investigation. A supported minority finding outweighs an unsupported majority.

The deliverable is a synthesized verdict. Do not apply changes, even when the user also asks you to fix what you find or the change is small. A fix request does not replace the review. Run the reviewers, deliver the verdict, and ask which Act On items to apply. The user approves fixes after seeing the verdict, because a fix that skips the cross-model check loses the signal the user asked for.

## Step 1, Determine Scope

Identify what to review from context:

- If the user points at specific files or a diff, use that
- If on a feature branch, run `git diff main...HEAD` (or the appropriate base branch) for the full changeset
- If the user's message references recent work, gather the relevant files

Package the diff (or file contents) plus any surrounding context files the reviewers need to understand the code.

## Step 2, State the Intent

Before spawning reviewers, state the intent explicitly. What is this code trying to accomplish? Derive this from:

- The user's message
- Commit messages
- PR description if one exists
- The code itself

Write one clear paragraph. Reviewers challenge whether the work achieves the intent well, not whether the intent itself is correct. If you're unsure about the intent, ask the user before proceeding.

## Step 3, Spawn Reviewers

Launch all reviewers in a single message using the Agent tool. Use the `interrogate reviewers` list from `~/.claude/kaizen-models.md` when present, one reviewer per entry, extending or shrinking the Reviewer A/B/C/D labels below to the configured entry count; otherwise use the table defaults.

| Subagent | Default model |
|----------|---------------|
| Reviewer A | `opus` |
| Reviewer B | `fable` |
| Reviewer C | `sonnet` |
| Reviewer D | `haiku` |

For each reviewer:
- `subagent_type`: `general-purpose`
- `model`: the configured `interrogate reviewers` entry, or the table default with no configured line
- `readonly`: `true`

If a model slug is unavailable, check the host's model list for a supported replacement within the declared budget.
Report the substitution and any change in model diversity. Do not edit configuration or open a PR during review-only work.
If the configured value is `inherit-parent` or `auto`, omit `model`. Do not treat those aliases as broken slugs.

If capacity prevents a reviewer from starting, retry after a running reviewer finishes, within the declared budget.
Report unavailable reviewers in the Agreement Map. Do not present reduced review coverage as a completed configured pass.

Read `references/reviewer-prompt.md` and fill in the template with:
1. The stated intent
2. The diff or file contents
3. The review rubric from `references/rubric.md`
4. The code-quality lens from `references/code-quality-review.md`

The same filled template goes to all reviewers, so every model applies the code-quality lens.

Each reviewer produces structured findings as described in the prompt template.

## Step 4, Synthesize

As results come back, build a unified picture:

1. **Parse all findings** from the reviewers
2. **Record agreement** for attribution, not evidence strength or impact severity.
3. **Check minority findings** against the same evidence standard as shared findings.
4. **Deduplicate**. Different models may describe the same issue differently. Merge these and note which models raised it.
5. **Resolve factual disagreements** with the protocol's targeted checks. Preserve unresolved claims when the evidence is insufficient.

## Step 5, Lead Judgment

You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator.

Read `references/lead-judgment.md` for the full framework. Reviewers only see a slice of the codebase. You have the full context (the goal, the constraints, the timeline, which tradeoffs were already considered). Use that context aggressively.

Categorize every finding using these buckets:

- **Act on**. Real issues affecting correctness, security, or maintainability given the actual goals. These would block a real PR.
- **Consider**. Legitimate points, but you're not sure they outweigh the cost of addressing them right now. Worth the user's attention.
- **Noted**. Technically valid but not actionable. Context-dependent, premature optimization, or low-impact given the current stage.
- **Dismissed**. Wrong, nitpicky, or missing context. Brief explanation why.

For each finding, include:
- Which model(s) raised it
- The category (act on / consider / noted / dismissed)
- A one-line rationale for the categorization
- The evidence disposition and any verification gap. Keep unresolved blockers visible rather than listing them as dismissed.

## Output Format

Present the verdict in this structure:

### Intent
> [The stated intent paragraph from Step 2]

### Reviewers
- Reviewer [label]: [model name], [N findings] (one bullet per reviewer)

### Act On
[Findings that should be addressed. For each: description, which models raised it, why it matters.]

### Consider
[Findings worth thinking about. For each: description, which models raised it, tradeoff involved.]

### Noted
[Valid but low-priority. Brief list.]

### Dismissed
[Rejected findings with brief rationale. This shows the user what was filtered out and why, so they can override your judgment if they disagree.]

### Agreement Map
[Reporter overlap, disagreements, unavailable reviewers, and the evidence that settled each disputed claim. Do not use vote counts as proof.]

### Verification and limits
[Reviewed revision, checks and results, unresolved claims, unreviewed scope, and the budget stop reason.]
