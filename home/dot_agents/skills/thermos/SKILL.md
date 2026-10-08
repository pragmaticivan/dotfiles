---
# Source: https://github.com/cursor/plugins/blob/main/thermos/skills/thermos/SKILL.md
name: thermos
description: "Run both thermo-nuclear reviews in parallel, then synthesize one deduplicated verdict. Use for /thermos, 'thermos this branch', or a double thermo review that covers correctness, security, and code quality in one pass."
---

# Thermos

## Workflow

1. Determine the review scope from the user request, PR, current branch, or relevant changed files.
2. Gather the diff and any file/context excerpts needed for reviewers to evaluate the change without guessing.
3. Launch both subagents in the same message with `run_in_background: true`:
   - `subagent_type: "thermo-nuclear-review-subagent"` for bugs, breakages, security, devex regressions, feature-flag leaks, and other branch-audit risks.
   - `subagent_type: "thermo-nuclear-code-quality-review-subagent"` for maintainability, structure, file-size growth, spaghetti, abstractions, and codebase-health risks.
4. Pass each subagent the same scoped diff/file context and ask it to return prioritized findings with file references and evidence.
5. After both finish, synthesize the results with findings first, deduplicated across reviewers. Resolve disagreements with your own judgment, and keep summaries brief.
   - Merge findings about the same code into one item, even when one reviewer reports a bug and the other reports a structure problem. Name the concrete failure, then show how the structure caused it.
   - Raise the priority of a finding that both reviewers reported independently, and say in the item that the agreement is the reason.

Before the findings, state in the reply the scope that you reviewed: the branch and base, the files, the diff size, and the context that both reviewers got.

If individual background summaries are already visible to the user, do not restate them wholesale. Surface the unified verdict, the highest-signal findings, and any remaining uncertainty.
