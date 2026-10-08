# Contract: give a skill's evals the context they need

You own the evals of ONE skill: `~/.local/share/chezmoi/home/dot_agents/skills/<skill>/evals/`.
An agent runs each eval prompt in an empty scratch directory. A pilot showed that when the prompt names code, a repo, a branch, a diff, a PR, or a file that the directory does not hold, the agent correctly stops and asks for it. The eval then fails for a reason that has nothing to do with the skill.

## Your job

For each case in `evals/evals.json`, decide: does a good reply need to read something that the prompt names but does not include?

- No: leave the case alone.
- Yes: add a fixture so that the scratch directory holds it. Then the expectations become checkable.

Do not edit SKILL.md or any file outside `evals/`. Do not weaken, delete, or reword an expectation to make it easier. You may make an expectation more precise when the fixture now pins a fact (for example, name the planted bug).

## Fixture rules

- Put each fixture under `evals/fixtures/<name>/`. List the path in the case's `"files"` array, relative to the skill directory, for example `"evals/fixtures/cache-service"`. The runner copies each listed path into the scratch directory at the same relative path, so the agent sees `evals/fixtures/cache-service/...`. Edit the prompt so it points there the way a user would ("the repo is in evals/fixtures/cache-service"). Keep the rest of the prompt as it is.
- Small and real. A few files, under about 300 lines total. The code must run with what this machine has: python3 3.14, node 24 (runs .ts directly with type stripping), go 1.26, git, bash. No package install, no network.
- Plant the facts the expectations need, and make them true. If an expectation says the agent finds a caller outside the two obvious ones, plant that caller. If it says the agent runs the code, make the code runnable with one command, and run that command yourself.
- Git history: you cannot commit a `.git` directory. When a case needs branches, commits, a diff against main, or blame history, write `evals/fixtures/<name>/setup.sh`. The runner runs it with bash inside the copied fixture directory, then deletes it. The script builds the repo in its own directory: `git init -b main`, commits with a fixed author and fixed dates through GIT_AUTHOR_DATE and GIT_COMMITTER_DATE, and branches. Make it deterministic. Run it once yourself in a temp copy to prove it works.
- Remote things (a GitHub PR, its review comments, CI): the agent cannot reach them. Give the agent what a user would paste or export instead. Put the comments in the prompt, or put a file such as `pr-482-review.json` in the fixture and have the prompt mention it ("gh isn't authed on this box, I dumped the review threads to ..."). Keep the case about the skill's behavior.
- File names in this repository go through chezmoi. A file or directory that starts with a dot must use the `dot_` prefix: `dot_claude/settings.local.json` copies as `.claude/settings.local.json`. Do not use names that end in `.tmpl`. Do not start a name with `executable_`, `private_`, `run_`, `modify_`, `create_`, `symlink_`, `exact_`, `readonly_`, or `literal_`.
- Blinding: inside fixture content (code, comments, file names other than the `evals/fixtures/` prefix) do not use the words eval, harness, grader, rubric, benchmark, candidate, or fixture. Normal test files such as `cache.test.ts` are fine.
- A case whose need is a live tool (a browser, a third-party API, another model) is out of scope when no local file can fake it. Leave it and say so.

## Check before you finish

1. `python3 -c "import json; json.load(open('evals/evals.json'))"` passes.
2. Every path in every `"files"` array exists.
3. For each fixture with code, you ran its command and it does what the expectations assume.
4. For each `setup.sh`, you ran it in a temp copy and `git log --all --oneline` shows the history you meant.

## Last message

One line per case: `#<id>: unchanged`, or `#<id>: fixture <name> (<10 words on what it plants>)`, or `#<id>: no fixture possible (<reason>)`.
