---
# Source: https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-formal-verification-skill/SKILL.md
name: maintain-formal-verification-skill
description: "Bring a project's formal verification back in line after code changes that skipped it: read the commits, update the model, rerun, and call each failure drift or a bug. Use for 'is the model still true to the code' or after merges to verified code."
---

# Maintain a formal verification skill

A formal check proves a property of what it describes. When the code changes and the verification does not, the check can continue to pass while it describes code that no longer exists. That pass is the dangerous case, because it looks like a proof.

This skill is the upkeep loop for a verify skill that `create-formal-verification-skill` wrote. It also applies to each project-local skill that runs a model checker, a prover, or a code-level verifier against named code. The project-local skill handles a change that an agent makes while it uses that skill. This skill handles the changes that did not use it: merges, edits without the skill, and drift across many commits.

## Outcomes

Give each check one outcome, and say which:

- **in sync**: no change since the last sync alters what the check describes, and the check passes.
- **updated**: the code changed, the verification now describes the new code, and the check passes.
- **bug**: the verification describes the current code, and the code breaks the property. This is a finding about the code. It is not drift.
- **blocked**: you cannot bring the check back in line, or the check cannot run. Say accurately why.

A check can be both updated and bug. The update makes the verification describe the code again, and then the property fails on it.

## Edit scope

Edit only the verification: models, harnesses, property files, and the verify skill. Do not edit product code during a run, unless the user tells you to. When a property fails on the current code, do not make the property or the model weaker until it passes. Report the failure.

## Pass

1. **Find the checks.** A verify skill has no fixed name. Find it by what it does: a project skill in `.claude/skills` or `.agents/skills` that runs a model checker, a prover, or a different verifier against named code. Read each skill that you find, or the skill that the user names. For each check, collect the property, the covered code, the bounds and assumptions, the command, and the sync commit. If no verify skill exists, stop and tell the user to use `create-formal-verification-skill`. If the skill records no sync commit, use the last commit that changed the verification files, and say that you did.

2. **Run it as it is.** Run each check one time before you change anything, and record the result. A pass here does not show that the code is correct. It shows only that the old description is still true. A failure here can be drift or a bug. Do not decide which until step 5.

3. **Read each change to covered code.** Compare the covered files at the sync commit and at the current commit, and read each commit message. Look for code that moved: a covered function that has a new name, that is now two functions, or that is in a different file is still covered code. Look for new code that touches the state that a check guards, for example a new function that writes the same fields. Put each change in one of these groups:
   - **No effect.** The change does not alter what the verification describes. Examples are format changes, comments, and code paths that the verification does not cover. Compare the change with the model or harness, not with the commit message.
   - **The verification no longer describes the code.** One indivisible step is now two, a branch is new or removed, a check moved, a new path gets to the guarded state, or a value has a different range. The model or harness must change.
   - **The promise changed on purpose.** The change alters what the code promises, and evidence in the change shows that this is the intent: the doc comment, the tests, the changelog, or the commit message. The property must change, and you must give that evidence.
   - **The promise can be broken.** The code changed, and no evidence shows that the promise changed. Treat a failure that follows as a possible bug.

4. **Update from the code, not from the result.** Change the model or harness so that each changed part again points to code that a reviewer can open. Keep one indivisible step in the code as one step in the verification. Write the update from the code before you run the check again. Do not let the result of the check change how you write the update. Change a property only for a promise that changed on purpose. Write the old text, the new text, and the evidence. Keep the bounds unless the change makes them incorrect. If you must decrease a bound, say so in the report.

5. **Run again and judge each result.**
   - **Pass.** A pass can come from a description that cannot fail now. Break the new code in the way that the property guards against, for example remove a new check or put two new steps in a different order. Make sure that the check catches the break. Then remove the break.
   - **Fail.** Replay the counterexample against the real code, one step at a time. If a step cannot occur in the code, the verification is incorrect. Fix the verification, and say what was incorrect. If each step can occur, it is a bug. Name the commit that caused it. Tell the counterexample as a sequence of steps in the words of the code, and give the harm in one sentence. If a cheap test or reproduction against the real code shows the bug, add it to the report as evidence. Do not commit it to the product code.

6. **Update the verify skill.** Update the covered code of each check, the commands, the bounds, the assumptions, and the sync commit. Set the sync commit to the commit that you checked. Do not move the sync commit of a blocked check, and say so in the report. Then follow the verify skill one time as the next agent does, to make sure that its steps still run.

## Report

Tell the user these items for each check:

- the outcome, and the commits that you read.
- what changed in the verification and why, with a short cause for each change: the code changed shape, or the promise changed on purpose (with the evidence).
- the result of the new run, and the break that shows the updated check can still fail.
- each bug, in plain words: the counterexample as steps in the words of the code, the harm, and the commit that caused it.
- what the verification does not cover, which includes new code that it must cover and does not.

Say clearly which failures were drift in the verification and which were bugs in the code. If a check passed before your update and fails after it, say that the old pass was on an old description.

Put the verification updates in a commit of their own, not in the same commit as a product fix.
