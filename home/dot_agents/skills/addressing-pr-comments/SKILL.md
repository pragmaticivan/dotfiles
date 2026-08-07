---
name: addressing-pr-comments
description: Address GitHub PR review comments by fetching, categorizing, and fixing them. Use when the user wants to handle PR feedback, fix review comments, address PR suggestions, or respond to code review. Triggers on "address PR comments", "fix review comments", "handle PR feedback", "PR comments", or when given a PR number with review context.
effort: medium
---

# Addressing PR Comments

Fetch PR review comments, categorize them as obvious fixes vs. non-obvious, auto-fix the obvious ones (with confirmation), and iterate with the user on the rest.

## Usage

```
/addressing-pr-comments [PR_NUMBER]
```

If no PR number is provided, detect from the current branch or ask.

## Instructions

### 1. Determine PR Number

Try in order:
1. Use the argument if provided
2. Detect from current branch: `gh pr view --json number -q .number`
3. Ask the user with `AskUserQuestion`

### 2. Fetch All Review Comments

Run these commands to gather the full picture:

```bash
# PR-level review comments (inline code comments)
gh api repos/{owner}/{repo}/pulls/{PR}/comments --paginate

# Review summaries (APPROVED, CHANGES_REQUESTED, etc.)
gh api repos/{owner}/{repo}/pulls/{PR}/reviews --paginate

# Issue-level comments (general discussion)
gh pr view {PR} --comments --json comments
```

Determine `{owner}/{repo}` from:
```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

### 3. Filter to Actionable Comments

Exclude:
- Comments from the PR author (they're self-notes, not review feedback)
- Bot comments (CI, linters, etc.)
- Already-resolved comment threads (where `gh api` shows resolved status)
- Pure acknowledgments ("LGTM", "looks good", thumbs up reactions)

### 4. Categorize Each Comment

Classify each actionable comment using `./comment-classification-guide.md` as reference:

**Obvious fix** — Can be addressed mechanically with no ambiguity:
- Rename variable/function
- Fix typo in code or comment
- Add/remove import
- Style/formatting change
- Add missing type annotation
- Simple null check or error message tweak

**Non-obvious** — Requires judgment, design decisions, or discussion:
- Architectural changes
- "Have you considered..." questions
- Alternative approach suggestions
- Performance/correctness concerns
- Anything where multiple valid responses exist

### 5. Present Obvious Fixes for Confirmation

Show the user a numbered list of all obvious fixes:

```
I found N obvious fixes from reviews:

1. [reviewer] file.py:42 — Rename `foo` to `bar`
2. [reviewer] file.py:88 — Remove unused import
3. [reviewer] utils.py:15 — Fix typo: "recieve" → "receive"
...

Shall I apply all of these?
```

Use `AskUserQuestion` with options:
- "Apply all" (Recommended)
- "Let me pick which ones"
- "Skip obvious fixes"

After confirmation, make the changes and commit them. Group into atomic commits by file or logical unit. Do NOT add Claude as co-author in commit messages.

### 6. Handle Non-Obvious Comments

For each non-obvious comment, use `AskUserQuestion` to present:
- The reviewer's name and the full comment text
- The relevant code context (file + line)
- 2-4 concrete options for how to respond, such as:
  - Make a specific code change (describe what)
  - Draft a reply explaining current approach
  - Open a follow-up task/issue
  - Dismiss (not actionable)

Execute whatever the user chooses. If they choose a code change, make it and commit. If they want a reply drafted, prepare it but do NOT post it (see Step 7).

### 7. Reply to Comments (ONLY When Explicitly Asked)

**Default behavior: NEVER reply to or post comments on the PR.**

Only post replies if the user explicitly says something like "reply to the comments" or "post responses."

When posting replies:
- Always prefix with: `*[This reply was drafted by Claude and posted on behalf of @{username}]*`
- Get the GitHub username from: `gh api user -q .login`
- Post using: `gh api repos/{owner}/{repo}/pulls/{PR}/comments/{comment_id}/replies -f body="..."`
- For review-level replies: `gh api repos/{owner}/{repo}/pulls/{PR}/reviews/{review_id}/comments -f body="..."`

### 8. Summary

After all comments are addressed, provide a summary:

```
Done! Here's what happened:
- N obvious fixes applied (M commits)
- N non-obvious comments addressed
- N comments skipped/deferred
- N replies posted (if any)
```

## Constraints

- Never auto-reply to comments without explicit user request
- Always attribute posted replies to Claude
- Group fixes into atomic commits (by file or logical unit)
- Do NOT add Claude as co-author in commits
- Follow the project's worktree workflow if CLAUDE.local.md specifies one
- Read files before editing — never guess at code context
