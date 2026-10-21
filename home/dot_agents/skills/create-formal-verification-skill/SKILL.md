---
# Source: https://github.com/cursor/plugins/blob/main/pstack/skills/create-formal-verification-skill/SKILL.md
name: create-formal-verification-skill
description: "Formally verify one property of the code where a bug costs most and tests reach least, then write a project-local verify skill for it. Use for 'model-check this race', 'prove this invariant', or a costly race, retry, or state-machine bug."
---

# Create a formal verification skill

A test checks the cases that a person wrote. Formal verification checks all the cases in a stated scope: each order of steps in a model, each input up to a bound, or each input. This skill finds the part of the repo where that has the most value. It verifies one property of that part. Then it writes a project-local skill that lets the next agent check a change against that property.

Write that skill for an agent that reads it cold, in the middle of a change, and that did not see your work. The user must trust the result and act on it without knowledge of the verification language.

## Choose the target from the code

Get the answer from the codebase. Ask the user only for what you cannot see. If the user names an area or a bug, start there.

A good target is a promise that the code makes, where a break causes harm to users and tests almost never reach the case that breaks it. Choose the strongest target in the repo, not the target that is easiest to verify.

## Let the question choose the tool

Choose the tool that answers the question at the lowest cost: a model checker, a proof assistant, an SMT-backed verifier, or a different tool.

- **Event order.** For a question about events in a bad order, use a model checker on a small model of the design. TLA+ is the default for this, in all languages.
- **Code behavior for each input.** For memory safety, overflow, or a data-structure invariant, use a verifier that runs on the code.
- **No verifier for the language.** Tell the user. Then test the real code with generated inputs, not a hand model of the function. Use fast-check for TypeScript, Hypothesis for Python, and native fuzzing or `rapid` for Go.
- **All sizes.** A property that must hold at each size, where a bound is not sufficient, can need a proof.

This host supplies TLA+ only. The `tlc` command runs TLC from `~/.local/share/tlaplus/tla2tools.jar` (v1.7.4) with the Java from mise. The project brings its own verifier for all other tools, such as Kani, Dafny, or z3. Use the verifier that the repo has, or add one as a pinned dev dependency of the repo. Do not install a verifier globally. Prefer a tool that the developers of the repo can install and run. Tell the user why you chose the tool.

## Make it good

- **True to the code.** Each part of the model or proof points to code that a reviewer can open. One indivisible step in the verification is one indivisible step in the code. The names come from this repo.
- **Able to fail.** A check that you did not see fail proves nothing. Show each property fail on a broken variant of the code that it guards, for example a removed check or two steps in a different order.
- **Findings stay findings.** When the current code breaks the property, report the break with the counterexample in the terms of the code. Do not make the property or the model weaker until it passes. Do not change product code unless the user tells you to.
- **Honest about scope.** Say what you verified, with which bounds and assumptions, and what you did not include. A pass covers the model or the bound, not the full system.
- **Readable without the tool.** Give the property in one plain sentence and the harm in one plain sentence. Tell a counterexample as a short sequence of steps in the words of the code.
- **Cheap to run again.** Give one command, a tool version that does not change, and a run sufficiently short that the next agent uses it on each applicable change.
- **In step with the code.** Record the files and functions that each check covers. Record the commit where you last confirmed that the verification agrees with them. When the covered code changes after that commit, the next agent can see that the verification needs a new look.

## Write the verify skill

Put the skill in the target repo at `.claude/skills/<name>/SKILL.md`. If the repo keeps its skills in `.agents/skills`, put it there. Give it frontmatter that names the area and says when to use the skill. Without frontmatter, the skill does not register.

From the skill alone, the next agent must be able to do these tasks:

1. Find if a change touches the verified code.
2. Run the check.
3. Tell a real bug from a model error.
4. Update the verification when a change is intended.

Put the coverage record and the sync commit in the skill. Tell the next agent to move the sync commit forward only after it confirms that the verification agrees with the code at the new commit. Use the real commands, paths, and nouns of this repo. Leave no placeholders. Do not make the command depend on the `tlc` command of this host. Write the `java` command and the jar version so that each developer can run it.

## Prove it before you hand off

1. Follow the generated skill one time, as the next agent does, on a scratch change that breaks the property in the real code. The check must catch the break.
2. Remove the scratch change.
3. Make sure that the check is in its initial condition again: it passes, or it fails only on the findings that you report.

A verify skill that nobody ran is a draft. If the skill does not catch the break, or a step does not run, fix the skill or the verification. Do not change the scratch change.

## Hand off

Tell the user these items:

- what you verified,
- the tool and why you chose it,
- the bounds,
- what the check found, in plain words,
- how to run the check,
- what the check does not cover.

Suggest a second target only if you found one near the first. Tell the user that the `maintain-formal-verification-skill` skill brings the verification back in line after changes that did not check it again.
