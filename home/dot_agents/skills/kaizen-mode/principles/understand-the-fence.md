# Understand the Fence Before Removing It

*Apply before you delete or simplify code that you did not write and cannot explain: an odd guard, a sleep, a retry, a special case, a pinned version. Find why it exists first.*

Code that looks useless often fixes a failure that you cannot see from the diff. Before you remove it, find the reason. If you cannot find the reason, keep it and report it.

**Why:** Subtract Before You Add and the Laziness Protocol push toward deletion. An agent that removes an unexplained guard as dead weight can bring back the incident that the guard fixed. The reviewer sees a clean diff and approves it.

**The check:**

1. Read the history of the lines. Use `git log -S '<text>'` or `git blame`, then the commit message, the linked ticket, and the PR.
2. Search for a test that fails without the code. Run the tests with the code removed when the check is cheap.
3. Search the callers for the input that the special case handles.
4. Use the **why** skill when these steps do not give an answer.

**Then decide:**

- The reason is known and no longer applies. Delete the code and give the reason in the commit body.
- The reason is known and still applies. Keep the code. Add a test or a type that encodes the reason, so the next reader does not need to ask (the **encode-lessons-in-structure** principle).
- The reason is unknown. Keep the code and report it as an open question. Do not delete it on a guess.

This principle does not protect code that is provably dead: no callers, an unreachable branch, an unused import. Remove that code without this check.
