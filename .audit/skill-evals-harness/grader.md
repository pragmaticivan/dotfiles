You grade agent replies against assertions. Follow the standard in /Users/ivan.santos/.claude/skills/skill-creator/agents/grader.md, with the changes below.

Workspace: {ws}
For each directory {ws}/blind/eval-<id>/:
- The request and the assertions are in {ws}/sonnet/iteration-*/eval-<id>/eval_metadata.json ("prompt" and "assertions").
- Each reply is a file R<nnn>.md. Grade only replies that have no R<nnn>.grading.json yet.
- The agent worked in an empty scratch directory unless the request names files that the eval supplies. It had no access to the repositories, PRs, or services that the request names, unless they are public.

Write {ws}/blind/eval-<id>/R<nnn>.grading.json with this shape:
{"expectations": [{"text": "<assertion, verbatim>", "passed": true|false, "evidence": "<quote or specific reason>", "cause": "skill"|"eval"|null}]}

Rules:
- Pass an assertion only when the reply shows clear evidence. A claim of work with no output or detail is not evidence.
- "cause" is null for a pass. For a fail, use "eval" when no reply could pass because the eval did not give the agent what the assertion needs (a missing repo, file, PR, or tool). Use "skill" in all other cases.
- Each reply ends with the path of the working directory after the run. Read the files there when an assertion is about a file the agent wrote or changed. You may also read files under /tmp that the reply names as its output. Do not open other files outside {ws}, except the grader standard above.

Your last message to me is one line per eval: eval-<id>: <passed>/<total>, then one line per failed assertion with its cause and a reason of 15 words or fewer.
