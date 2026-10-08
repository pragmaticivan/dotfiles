---
name: addressing-pr-comments
description: 'Fetch, triage, fix, and resolve GitHub PR review comments, bot comments included. Use for "address PR comments", "fix review comments", "is this comment valid", "fix and resolve", a `#discussion_r` URL, or a PR number with review context.'
effort: medium
---

# Addressing PR Comments

Fetch PR review comments, categorize them as obvious fixes vs. non-obvious, auto-fix the obvious ones (with confirmation), and iterate with the user on the rest.

## One comment URL

When the request gives one comment URL (`.../pull/<PR>#discussion_r<id>`), work on that comment only:

1. Fetch it with `gh api repos/{owner}/{repo}/pulls/comments/{id}`. Read the code it points at.
2. Give a verdict first: valid or not valid, with the reason from the code.
3. If the request says to fix ("if yes, fix", "fix and resolve"), a valid comment needs no more confirmation. Fix it, commit, and push. For a comment that is not valid, change no code and give the disproof.
4. Do Step 7 for the reply and the resolve.

## Usage

```
/addressing-pr-comments [PR_NUMBER]
```

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
- Status-bot comments that report CI, coverage, or lint results. Keep the comments of a review bot that comments on code lines, and judge each one against the code, because review bots also post wrong findings.
- Already-resolved comment threads (where `gh api` shows resolved status)
- Pure acknowledgments ("LGTM", "looks good", thumbs up reactions)

### 4. Categorize Each Comment

Classify each actionable comment with `./comment-classification-guide.md`:

- **Obvious fix.** The comment has one correct mechanical response, such as a rename, a typo, an import, or formatting.
- **Non-obvious.** The comment needs judgment, a design decision, or discussion. Multiple valid responses exist.

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

If the request already says to fix the comments ("fix and resolve them"), apply the obvious fixes without this question.

Use `AskUserQuestion` with options:
- "Apply all" (Recommended)
- "Let me pick which ones"
- "Skip obvious fixes"

After confirmation, make the changes and commit them. Group into atomic commits by file or logical unit. Do not add Claude as co-author in commit messages.

### 6. Handle Non-Obvious Comments

For each non-obvious comment, use `AskUserQuestion` to present:
- The reviewer's name and the full comment text
- The relevant code context (file + line)
- 2-4 concrete options for how to respond, such as:
  - Make a specific code change (describe what)
  - Draft a reply explaining current approach
  - Open a follow-up task/issue
  - Dismiss (not actionable)

Execute whatever the user chooses. If they choose a code change, make it and commit. If they want a reply drafted, prepare it but do not post it (see Step 7).

### 7. Reply and Resolve (Only When Explicitly Asked)

By default, do not reply to, post on, or resolve threads on the PR.
"Reply" in the request allows replies. "Resolve" allows resolving threads. Each word gives only its own permission.

When posting replies:
- Do not add an AI attribution prefix, and do not mention Claude, AI, or an assistant.
- For a fix, give the commit SHA. For a dismissal, give the disproof in one or two sentences.
- Post using: `gh api repos/{owner}/{repo}/pulls/{PR}/comments/{comment_id}/replies -f body="..."`
- For review-level replies: `gh api repos/{owner}/{repo}/pulls/{PR}/reviews/{review_id}/comments -f body="..."`

To resolve a thread, push the fix first. Then find the thread ID and resolve the thread:

```bash
gh api graphql -F n={PR} -f o={owner} -f r={repo} -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved comments(first:1){nodes{databaseId}}}}}}}'
gh api graphql -f id={thread_id} -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}'
```

The thread is the node whose first comment `databaseId` is the comment ID. Leave a thread open when the comment is not valid and the request did not ask to resolve it.

### 8. Summary

After all comments are addressed, provide a summary:

```
Done! Here's what happened:
- N obvious fixes applied (M commits)
- N non-obvious comments addressed
- N comments skipped/deferred
- N replies posted (if any)
- N threads resolved (if any)
```

## Constraints

- Follow the project's worktree workflow if CLAUDE.local.md specifies one
