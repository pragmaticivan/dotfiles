---
# Source: https://github.com/cursor/plugins/blob/main/pstack/skills/how/SKILL.md
name: how
description: "Explain how a subsystem works, trace a runtime flow, or say which layer owns code. Can also critique the architecture. Use for 'how does X work', 'walk me through', or 'where should this live'. Use why for the motivation behind the shape."
---

# How

Explore the codebase to answer "how does X work?" questions. Produce clear architectural explanations at the level of a senior engineer onboarding onto a subsystem. Enough to build a working mental model, not annotated source code.

Two modes:

1. **Explain** (default). Explore the codebase and produce a clear explanation
2. **Critique.** Explain first, then spawn multiple models to independently identify architectural issues

## Explain Mode

### Step 1. Understand the Question and Assess Complexity

Parse what the user is asking about:

- "How does the rate limiter work?", a subsystem
- "How do we handle billing for on-demand usage?", a feature flow
- "How is the auth service structured?", an architectural overview
- "Walk me through what happens when a user submits a form", a runtime trace

Identify the scope. If ambiguous, state your best-guess interpretation before exploring. Don't ask. Let the user redirect if you're off.

**Assess complexity to decide the approach:**

- **Simple** (a single module, a small utility, a narrow question like "how does function X work"): skip explorer agents; the explainer explores and explains in a single pass. Go to Step 2b.
- **Complex** (a subsystem spanning multiple files/services, a cross-cutting feature, a full architectural overview): spawn parallel explorer agents first, then hand off to the explainer. Go to Step 2a.

When in doubt, lean simple. You can always spawn explorers if the explainer hits a wall.

### Step 2a. Explore (complex questions only)

Decompose the question into 2-4 parallel exploration angles, each a distinct slice of the subsystem so explorers don't duplicate work. Example split for "how does the rate limiter work?":

- Explorer 1: data model and state management
- Explorer 2: request path and enforcement
- Explorer 3: configuration and metrics infrastructure

Narrow questions: 2 explorers is fine. Broad subsystems: up to 4.

Spawn all explorers in a single message:

- `subagent_type`: `general-purpose`
- `model`: the `how-explorer` line in `~/.claude/kaizen-models.md` when present, otherwise `sonnet`
- `readonly`: `true`

Each explorer gets the same base prompt from `references/explorer-prompt.md` plus a specific exploration angle naming its slice. Overlap between explorers is fine; the explainer reconciles.

Then proceed to Step 3.

### Step 2b. Direct Explain (simple questions)

Spawn a single Task subagent that explores and explains in one pass:

- `subagent_type`: `general-purpose`
- `model`: the `how-explainer` line in `~/.claude/kaizen-models.md` when present, otherwise `opus`
- `readonly`: `true`

The agent does its own exploration (Glob, Grep, Read) and writes the explanation directly. Read `references/explainer-prompt.md` for the communication style and output format. Same structure, just no explorer findings as input.

Proceed to Step 4.

### Step 3. Synthesize (complex questions only)

Once all explorers return, spawn a single Task subagent to synthesize their findings into one coherent explanation:

- `subagent_type`: `general-purpose`
- `model`: the `how-explainer` line in `~/.claude/kaizen-models.md` when present, otherwise `opus`
- `readonly`: `true`

The explainer gets all explorers' findings and writes the human-facing explanation (output format below). Read `references/explainer-prompt.md` for the full prompt template.

### Step 4. Present

Present the explainer's output to the user. You may lightly edit for clarity or add context from the conversation, but don't substantially rewrite. The explainer's communication is the product. Its output format is in `references/explainer-prompt.md`.

## Critique Mode

Triggered when the user asks for architectural issues, problems, or improvements, not just understanding.

### Step 1. Explain First

Run the full explain flow above (Steps 1-4).

### Step 2. Spawn Critics

After the explanation is complete, spawn one architectural critic per model in the `how-critics` line of `~/.claude/kaizen-models.md` when present, otherwise `opus`, `fable`, `sonnet`, and `haiku`, all in a single message.

For each critic:
- `subagent_type`: `general-purpose`
- `model`: one model from that list. These are minimum reasoning levels. The lead should escalate any model when the architecture warrants deeper analysis.
- `readonly`: `true`

Read `references/critic-prompt.md` for the prompt template. Each critic gets:
1. The explanation from Step 1 (so they don't re-explore)
2. The relevant file paths (so they can read the actual code)
3. The architectural critique rubric from `references/critique-rubric.md`

### Step 3. Lead Judgment

Same framework as the interrogate skill. You're a pragmatic lead, not an aggregator.

Categorize findings:
- **Act on.** Architectural problems worth fixing now
- **Consider.** Real concerns, but the cost/benefit is unclear
- **Noted.** Valid observations, low priority
- **Dismissed.** Wrong, missing context, or style preference

Present the explanation first (from Step 1), then the critique verdict below it. The explanation should stand on its own; someone who just wants to understand the system shouldn't wade through critique.
