---
name: rigorous-coding
description: Apply rigorous coding standards before, during, and after writing code. Use whenever implementing new logic, fixing a bug, or touching existing behavior — even for small changes. Make sure to use this whenever the user asks you to build, add, fix, or change something in code, not just when they explicitly ask for "rigorous" or "high quality" code.
---

## Before writing code

Do not write code before stating assumptions.
Do not start implementing before you understand why the existing code works the way it does.
If multiple interpretations of the request exist, name them — don't silently pick one.

## While writing code

Do not handle only the happy path. Under what conditions does this work? Under what conditions does it break?
Do not add abstractions, options, or error handling for scenarios that can't happen here.
Touch only what the task requires — no drive-by refactors, no "while I'm here" cleanups.
Match existing style and conventions even when you'd personally do it differently.

## Before calling it done

Do not claim correctness you haven't verified. Run it, test it, or show the evidence.
Do not leave orphaned imports, variables, or dead branches your change created.
If you notice unrelated dead code, mention it — don't delete it unasked.
