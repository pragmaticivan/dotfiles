# Check ui-workroom

Run the structural checks from the dotfiles repository root.

```sh
python3 home/dot_agents/skills/tune-skill/scripts/audit_skill.py home/dot_agents/skills/ui-workroom
python3 scripts/lint-skills.py
```

## Check the grid in a real browser

Start the fixture server from the repository root.

```sh
python3 -m http.server 4188 --bind 127.0.0.1 --directory home/dot_agents/skills/ui-workroom
```

Use the Playwright browser tools to open `http://127.0.0.1:4188/evals/fixtures/plans/`.
Run `evals/check-grid.js` with the browser tool that accepts a Playwright function file.
The function needs the current `page`, not a Node package or a new browser installation.
If the tool only accepts text, pass the file's contents.
The check exercises the actual `scripts/grid.js` at desktop and narrow widths.
It checks content edges, column counts, page height, pointer input, repeated injection, and cleanup.
The fixture deliberately has layout defects for the agent evals.
A passing grid check does not approve the fixture's design.

## Evaluate the workflow

Use `evals.json` for five source-grounded cases and one browser-enabled case.
Keep each run in its own output directory outside the installed skills.
Case 5 needs actual independent subagents.
Cases 1 through 4 test proposals or refusal, not completed browser work.
Case 6 needs an isolated fixture copy, a local server, and actual Playwright screenshot inspection.
Keep worker artifacts and invocation records with the final response for grading.
Use the tune-skill old-versus-new runner and blind grader for comparisons.
Report unavailable models and failed starts separately from scored results.
