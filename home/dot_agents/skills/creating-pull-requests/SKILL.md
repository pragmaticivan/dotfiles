---
name: creating-pull-requests
description: "Draft or update a pull request description that transfers the author's mental model to the reviewer. Use it before writing any PR text: 'open a PR', 'write the PR description', a rewrite, or a sync of the body to the current branch."
effort: low
---

# Creating and updating pull requests

The author built a mental model of the problem over hours. The description hands that model to the reviewer in minutes. Write only what the diff cannot show: why, what was rejected, proof it works, and what a merge risks.

## Rules

- Create PRs with `--draft`. The user marks them ready.
- Write the body to a temp file and pass `--body-file`. Never `--body` or a HEREDOC.
- No `Co-Authored-By`, no "Generated with", no mention of Claude, AI, or an assistant.
- No sentence opens with "This PR", "This change", or "In this pull request". Open with the problem, the action, or the component.
- Read `~/.claude/PROSE.md` before you draft and apply it.
- Use the repo's own domain terms. Check `GLOSSARY.md` or `CONTEXT.md` if present.
- No placeholders such as "add the URL" or "TODO" in the body. Leave a missing fact out and ask for it in your reply.

## Process

1. **Detect.** `gh pr view --json number,title,body,baseRefName,url` tells you create or update.
2. **Gather.** Read `git diff $BASE...HEAD`, its `--stat`, and `git log $BASE..HEAD --oneline`. Read the diff, not just the stat.
3. **Find the why.** Look in the commits, branch name, tickets, and conversation. If it is still unclear, ask the user what was broken, missing, or blocked. Never invent a motivation and never write filler like "improves code quality".
4. **Size it** with the table below and lock the section budget before you write.
5. **Draft the TL;DR first.** If it does not fit in two sentences, you do not understand the PR yet. Re-read the diff.
6. **Cut.** For each sentence, ask whether the reviewer could learn it from the diff. If yes, delete it. Delete any section whose absence would not slow the reviewer.
7. **Apply.** `gh pr create --draft --title ... --body-file /tmp/pr-body.md`, or `gh pr edit <n> --title ... --body-file ...`.

## Size gate

A long description on a small diff reads as "AI-generated, ignore".

| Size (`--stat`) | Sections |
|---|---|
| Small: < 50 lines, one concern | TL;DR and Links. Body shorter than the diff. |
| Medium: 50 to 200 lines | TL;DR, Summary, and at most two more that earn their place. Body shorter than the diff. |
| Large: 200+ lines or several concerns | Every section that applies. Summary with a start-here file view and Reviewer notes are required. |

Merge Danger overrides the gate. Add it at any size when the change is a one-way door or its blast radius reaches past the diff.

## Template

```markdown
## TL;DR

<Sentence 1: the problem, with a concrete number, error, or example.
Sentence 2: what the PR does about it. Optional: what is out of scope.>

## Summary

<The smallest visual that lets the reviewer predict the diff. See below.>

## Evidence

**Before:** <screenshot, output, or failing test>
**After:** <screenshot, output, or passing test>

## Merge Danger

**Door:** <one-way | two-way>. <What a rollback costs.>
**Blast radius:** <one word>. <What could break outside the diff.>

## Reviewer notes

- **<Bold headline>.** One non-obvious fact, a rejected alternative, or the
  spot where you want a second opinion.

## Links

- [PROJ-123](url)
```

### Summary

Pick the smallest view that makes the key point. Usually one, sometimes two. Put each visual next to the sentence it supports, and show only the calls, files, or states the point needs.

- **Pseudocode** for logic or an algorithm.
- **Call tree** for runtime control flow.
- **Component tree** for UI structure, with the state and module boundaries that matter.
- **Annotated file tree** for file responsibility or a broad refactor. Mark the entry point with `(start here)`. On a large PR, list every changed file, tests and config included.
- **Mermaid** for interaction or data flow. Diagram what changed, under 15 nodes.
- **`diff` sketch** when the surrounding shape already exists and the point is what moves:

```diff
 submitForm
   createSession
     persistPrompt
+    expandSkillMention
     launchAgent
```

Before the visual, name the design idea in one sentence ("small entries go to Redis, large ones stay on S3"). Name the alternative you rejected and why. A visual that reads like the file list with more words gets cut.

### Evidence

Show proof that it works, as before and after. "Tests pass" alone is not proof. Name the test that covers the new behavior, or show the number that moved. A screenshot is the best evidence for a visual change. Execution is next: the test that failed and now passes, or the command output. Put long logs and benchmarks in `<details><summary>label</summary>`. The PR must make sense without expanding them.

### Merge Danger

A two-way door rolls back with a revert. A one-way door does not: a dropped column, a data migration, a published API or event shape, a sent message, a deleted resource. Say which one, and for a one-way door say what makes it permanent.

Blast radius names what could break beyond the changed lines: consumers of an API, layout on other pages, mobile, jobs that read the same table. Use the **blast-radius** skill when you do not know. Put a one-way door in a `> [!WARNING]` alert.

## Title

`<Verb> <what> [in/for/to <context>]`, imperative and present tense: `Fix memory leak in cache`, not `Fixed memory leak` or `Update session.py`. At most two nouns in a row. If a Jira key appears in the branch, commits, or conversation, prefix it as `PROJ-1234 - <title>` and link it in Links.

## Updating a PR

Describe the full current state of the branch against base, as if you wrote it fresh. Drop changelog words like "also adds", "additionally", and "now includes".

## Examples

Small, title `PROJ-1234 - Fix off-by-one in chunk boundary calculation`:

```markdown
## TL;DR

Chunking a 10-second clip at 5-second boundaries produced three chunks
instead of two, the last one empty. The boundary loop now uses `<`
instead of `<=`.

- [PROJ-1234](https://jira.example.com/browse/PROJ-1234)
```

Small, but a one-way door, title `Rename quote_id to quoteId in webhook payload`:

```markdown
## TL;DR

The `quote.bound` webhook is the only payload that still sends snake_case
keys, and partners ask about it in every onboarding. The payload now sends
`quoteId`.

## Merge Danger

> [!WARNING]
> **Door:** one-way. Partners who adopt `quoteId` break again if we revert.

**Blast radius:** partners. The three partners that parse `quote_id` need the
notice from PROJ-88 before this merges.
```
