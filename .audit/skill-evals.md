# Skill eval run, 2026-10-07

Each skill in `home/dot_agents/skills/` has `evals/evals.json`. Each case ran blind on Sonnet. One Opus grader graded the replies of a skill in one pass. The bar is a pass rate of 0.85.

The decision trail is `skill-evals.tsv`. The harness is in `skill-evals-harness/`.

## Results

"Before" is the first graded score on the fixed evals. "After" is the score of the version in this branch. One run per case and per version.

| Skill | Before | After | Change to the skill |
|---|---|---|---|
| addressing-pr-comments | 18/21 | 20/21 | none (eval fixes) |
| aeo-optimizer | 20/22 | 20/22 | none |
| analyze-permissions | 17/18 | 17/18 | handles a chezmoi modify-script source |
| architect | 18/20 | 18/20 | none |
| blast-radius | 16/18 | 16/18 | none (new fixtures) |
| bro | 17/20 | 17/20 | none (edit reverted, no gain) |
| browser-testing-with-devtools | 13/19 | 19/19 | headless Chrome over CDP when the MCP is absent |
| context7 | 18/18 | 18/18 | none |
| creating-pull-requests | 19/21 | 20/21 | none (eval fixes) |
| figure-it-out | 13/20 | 18/20 | routes to an existing playbook first |
| how | 19/19 | 19/19 | none |
| improve-crap | 15/16 | 15/16 | none |
| interrogate | 10/21 | 19/21 | retries reviewer spawns, stays review-only |
| kaizen-mode | 26/35 | 26/35 | none (edit reverted, no gain) |
| no-comments | 20/21 | 20/21 | none (edit reverted, no gain) |
| reflect | 17/20 | 20/20 | full fan-out for any learning |
| show-me-your-work | 17/21 | 20/21 | short why cell, outcome word first |
| simplicity | 16/22 | 21/22 | delete what a change routes around, and four more rules |
| simplified-technical-english | 27/33 | 31/33 | full-text dictionary scan, rule-numbered change table |
| stacked-pr-split | 31/35 | 31/35 | none |
| stop-slop | 17/21 | 20/21 | rewrite only sentences with a tell |
| swarm | 14/16 | 16/16 | no swarm when one deterministic pass answers |
| technical-writing | 18/21 | 18/21 | none |
| test-driven-development | 18/18 | 18/18 | none |
| thermo-nuclear-code-quality-review | 17/19 | 17/19 | none |
| thermo-nuclear-review | 17/18 | 17/18 | none |
| thermos | 16/21 | 19/21 | states scope, merges findings |
| tune-skill | 22/25 | 24/25 | re-audit loops on planned warns |
| typescript | 36/42 | 40/42 | union transitions, no escape-hatch fallback, Biome facts |
| why | 19/20 | 19/20 | none (new fixtures) |

## Open items

- kaizen-mode stays at 0.74. Between two runs of the same case, one score went from 9/10 to 4/10. One run per case cannot separate an edit from noise. Run 3 or more runs per case before you change this skill.
- No swarm case tests a real Cover-mode fan-out now. Add a case where each unit needs judgment.
- stacked-pr-split case 0 mixes an approval gate with assertions that need a built stack.
- Multi-agent skills compete with the eval run for the 20-agent limit. Run them with fewer parallel cases.
- Graders see the reply and the working directory, not the transcript. Assertions about tool calls are checked from what the reply says.
