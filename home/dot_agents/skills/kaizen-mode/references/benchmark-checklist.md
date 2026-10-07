<!-- Source: https://github.com/cursor/plugins/blob/main/pstack/skills/benchmark-checklist/SKILL.md -->

# Benchmark checklist

Use this checklist when you make a performance number: the before and after of a PR, a regression claim, a hillclimb harness, or a choice between libraries or configurations. The **Explain the Number** principle (`../principles/explain-the-number.md`) gives the reason. Answer each question with evidence from a run, not with a guess from the code.

For a quick estimate that the user asked for, one run is sufficient. Still answer questions 4 and 7, and say that it is one run. Skip the other questions unless that run looks wrong. A choice between options is never a quick estimate.

## Before you run

- Write the claim that you expect to make, in the words you will ship ("export is 30% faster at p50 on the 60k-row dataset"). The questions test that sentence.
- Read the measurement script. Note what it times, what it counts, and what it ignores.
- Get the load average with `uptime` and the core count with `sysctl -n hw.ncpu` (macOS) or `nproc` (Linux). If the machine is busy, find out what runs. If you cannot stop it, interleave the sides so that both get the same noise, and say so in the report.

## The questions

1. **Why not double?** Name the limiter. Profile in a run that you do not report, because profilers and tracers make the work slower. Use CPU per process (`top`, `pidstat`), a profiler for the runtime (`node --cpu-prof`, `py-spy`, `perf`), I/O wait, and syscall counts (`strace -c` on Linux, `dtruss` on macOS). Then map the hot spot to the source. Also monitor the load generator. If it saturates first, you measured the load generator. If a change did not move the number, the limiter tells you why. Find it before you call the change useless.
2. **Was it tuned?** Run every side as production runs it: release builds, production flags and environment, batch and transaction settings, connection pools, caches as warm or cold as production has them, and the same versions and data. If one side runs on defaults, you compared configurations, not implementations. A limiter that is a setting (a commit for each row, a debug build, a missing index) means that the side is not tuned. Tune it and measure again before you select a winner. If you cannot tune it, do not select a winner from that run. A smaller claim about the code as it ships today does not fix this when the user chooses what to adopt. They adopt the option, not the current settings.
3. **Did it go past a limit?** Do the arithmetic. Compare bytes per second with the disk and network bandwidth. Compare operations per second times the cost of one operation with the cores you have. Compare the time saved with the time that the changed piece took. If you remove a piece that takes 10% of the run, the run can be at most about 11% faster. A result past a limit means that the run measured something other than the work, for example a cache, a no-op, or a bug.
4. **Did it fail?** Count failures and non-success responses. Make sure that the outputs are correct, not only present. Errors do not behave as successes do. Rejections are frequently fast, and timeouts and retries are slow. If the script does not count errors, add the count.
5. **Does it repeat?** Run each side at least 5 times, and alternate the sides (A, B, A, B) so that warmup, lazy initialization, caches, and drift do not help one side. Report the median and the range. If the gap is smaller than the run-to-run variation, there is no measurable difference. When the result is close, use a rank-sum test or the statistics of the harness.
6. **Does it matter?** Next to each micro result, measure the end-to-end path that a user waits on, with realistic data sizes and concurrency. Report the micro result as a part of the whole. A helper that takes 1% of a request can make the request at most 1% faster, however fast the helper gets.
7. **Did the work occur?** Make sure that the work ran in the timed region. The request got to the server, the rows were written, the bytes were read, and the code used the result. Lazy code (generators that nothing iterates, promises that nothing awaits, results that the JIT can discard) and timeouts all give numbers for work that did not occur.

## Report

- Start with the verdict: faster, slower, no measurable difference, or inconclusive.
- Give the number with its unit, the run count, the range, and the limiter. For example, "p50 41 ms → 33 ms, median of 7 runs per side, range 32 to 35 ms after, limited by JSON parsing on one core."
- The verdict is inconclusive when you claim a difference but cannot name the limiter, when a side was not tuned, or when you could not answer questions 4 and 7. Name the gap.
- Put one primary number in the PR body. Put the runs, the range, and the limiter evidence in a linked artifact or a notes file.

## How this checklist fits the other performance material

- The **Perf issue** playbook (`../playbooks/perf-issue.md`) finds and fixes slowness, and the mantras in its step 2 give the fixes. This checklist examines its baseline before the playbook plans from it, and each number after that.
- The **Hillclimb** playbook (`../playbooks/hillclimb.md`) loops on one metric. This checklist examines its harness before you freeze the harness. The frozen harness then prints error and work counts, so each keep-or-revert decision answers questions 4 and 7 automatically.
