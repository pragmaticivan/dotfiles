# Contract: improve ONE skill from its blind eval failures

Skill source: `~/.local/share/chezmoi/home/dot_agents/skills/<skill>/`.
Grades: `/tmp/skillrun/ws/<skill>/blind/eval-<id>/R<nnn>.grading.json`. Each has `expectations` with `text`, `passed`, `evidence`, and `cause` (`skill` or `eval`). The reply that was graded is the `R<nnn>.md` next to it.
The prompts and expectations: `<skill>/evals/evals.json`.
The skill was run on Sonnet. A different agent will rerun the evals blind on your edited version and compare.

## Do

1. Read SKILL.md and the files it links. Read every failed expectation, its evidence, and the reply.
2. For each `skill` failure, find the root cause in the skill text. Typical causes: the rule is missing, the rule is buried or vague, two rules conflict, or an example teaches the wrong thing. Ask whether a capable model reading the skill would know to do the expected thing.
3. For each `eval` failure, or a `skill` failure where the expectation is wrong (it rewards bad behavior, conflicts with the skill's own documented gate, or demands evidence that a reply cannot show), fix the expectation or the prompt in `evals/evals.json` instead. Do not weaken an expectation that is right.
4. Make the smallest edits that fix the root causes. Prefer one clear sentence in the right place over a new section. Do not add all-caps rules or repeated warnings. Keep the skill's style. Follow the rules in `~/.local/share/chezmoi/home/dot_agents/skills/tune-skill/SKILL.md` for skill edits, and keep SKILL.md under 500 lines.
5. Do not tune to the eval text. An edit must help real users with requests like these, not just this exact prompt. Do not paste eval prompts or expectation wording into the skill.
6. Do not commit. Do not touch other skills.

## Last message

- One line per edit: file, what changed, which failed expectation it targets.
- One line per expectation you changed and why.
- One line for each failure you chose not to fix, with the reason.
