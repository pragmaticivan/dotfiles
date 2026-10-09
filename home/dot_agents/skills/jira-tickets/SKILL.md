---
name: jira-tickets
description: Write Jira epics, stories, tasks, and bugs that humans scan fast and coding agents can start. Use for "create a jira ticket", "write a story/bug/task/epic", "break this into tickets", "groom this ticket", or a bare Jira key.
---

# Jira tickets

Turn a request into Jira tickets in the format from `references/templates.md`. Speed counts. Do one draft pass and one validation pass, and do not loop.

## 1. Read the request

Read `references/templates.md` now. Each later step uses it.

- **Bare Jira key** (the full request is one token like `ABC-123`): fetch the issue and rewrite it in the template. For a key inside a longer request, do not fetch the issue unless the request asks you to use it as context, for example as a parent epic.
- **Pick the type.** Use the first row that matches:

| Signal | Type |
| --- | --- |
| Something worked before, or must work, and does not | Bug |
| More than one deliverable, or more than one sprint of work | Epic |
| A user notices the change | Story |
| Anything else: refactor, upgrade, config, migration, spike | Task |

- **Missing facts.** Ask one batched question only when you cannot write the title or the `TL;DR`. Make every other gap an open question in the ticket. Grooming answers open questions faster than chat does.

## 2. Gather and draft in parallel

Send these in one message so they run at the same time:

- **Grounding.** Do this only inside a git repository, when the work touches code. Spawn one read-only subagent (in Claude Code, `Explore`, model `haiku`). Ask it for the area, the entry point (file and symbol), the test or check command, and the files that the change will likely edit. It must return 15 lines or fewer, and each path must be one it opened.
- **Context.** Fetch each parent epic or linked key that the request names. Stop and ask when a key resolves to a different title or to a cancelled issue, because a key with two digits swapped is a common mistake. When Jira is reachable, run one JQL search for open issues that already cover this work. Report a likely duplicate in step 5. Do not draft a second copy of it.
- **Drafts.**
  - One ticket: draft it yourself while the grounding runs. Then fill in the `Agent notes` from the grounding result.
  - An epic: write the epic and its `Breakdown` table yourself. Then spawn one drafter subagent for each child ticket, all in one message (in Claude Code, `general-purpose`, model `sonnet`). Give each drafter the path to `references/templates.md`, its row from the table, the epic `TL;DR`, the grounding result, and its output path. Do not paste other drafts into its prompt.

Write each ticket to its own file in `/tmp/jira-tickets/<run-slug>/`. Use `00-epic.md` for the epic and `<nn>-<slug>.md` for each child. Agents that write in parallel must not share a file.

Cut each child ticket as a vertical slice. It delivers one behavior that a person can demo or verify end to end, through every layer it needs. Do not cut by layer (a storage ticket, then an API ticket). When the slices collide in shared code, put a prefactor ticket first that makes the change easy. A wide mechanical change, for example a rename across many call sites, is the exception: add the new form, migrate the callers in batches, then delete the old form.

Lanes come from the files that each ticket edits. Tickets that edit the same file go in one lane, in dependency order. All other tickets go in different lanes, so that agents can run them at the same time.

## 3. Lint

```bash
python3 <skill-dir>/scripts/lint_ticket.py story /tmp/jira-tickets/<run>/01-x.md task /tmp/jira-tickets/<run>/02-y.md
```

Fix each `FAIL` before validation. The lint finds dropped sections, placeholders that remain, a `Done when` with no checkbox, and a ticket that is "ready" while it has a blocking question.

## 4. Validate

Spawn validator subagents in one message (in Claude Code, `general-purpose`, model `sonnet`). Each validator gets the path to `references/validate.md`, its ticket paths, and the repository root when grounding ran. Give one validator each ticket. For an epic, give one more validator the full set, which checks for lane conflicts and gaps in coverage.

Apply each `[blocking]` fix to the ticket. When a fix needs a human decision, add it as a `[blocking]` open question with an owner, and set `Ready for an agent` to `no`. Apply each `[non-blocking]` fix that takes one line. Run the lint again. Do not validate a second time.

## 5. Present

Show the tickets in chat, epic first. Then show a short report:

- The verdict for each ticket and the `[blocking]` items that a human must answer. These are the grooming agenda.
- The tickets that are ready for an agent, and the lanes that can start in parallel.
- The paths that you could not verify.

## 6. Write to Jira, only with approval

Create or update issues only after the user approves the specific action. Use a Jira write tool from the Atlassian MCP when one exists. If not, use `acli` when `acli jira auth status` succeeds. Create the epic first, then the children with the epic as parent. Create one issue and make sure that Jira accepts it before you create the others. If Jira rejects a create for a missing required field, fetch an existing issue of the same project and type, and copy only that field. Then replace the `#` numbers in each `Depends on` with the new keys, and add each dependency as a Jira "is blocked by" link. Add the `ready-for-agent` label to each ticket whose `Ready for an agent` is `yes`. Then an agent can find ready work with a JQL query.

After the writes, fetch each new issue again and check three things:

- The `- [ ]` items show as Jira checkboxes, not as text.
- Each "is blocked by" link points the correct direction. Some Jira sites invert it.
- Remove the labels that the tool added on its own, for example `created-with-atlassian-mcp`. Keep `ready-for-agent`.

Jira refuses a link to a closed issue. Report the refused link and continue.

With `acli`, pass the description with `--description-file` and wrap the summary in single quotes. Do not put a title into a double-quoted shell argument.

If neither path works, the files in `/tmp/jira-tickets/<run-slug>/` are the deliverable. The `#` line is the Jira Summary, and the rest is the Description. Jira Cloud converts pasted Markdown.
