### Perf issue

**You own the measurement story. Plan, review, verify the numbers.** Tie every fix to a measurement, don't read source instead of measuring.

1. Capture a baseline trace via the matching control skill. Vet the baseline, and each later number, with `references/benchmark-checklist.md`.
2. `how` to ground hypotheses; don't claim a perf ceiling without running it first.
   Try the performance mantras in order, cheapest first:
   1. Don't do it. Stop work whose result nothing uses, rather than making it cheaper. The trace shows what is slow, never that it is deletable, so this mantra needs the `how` pass, not the profiler.
   2. Do it, but don't do it again.
   3. Do it less.
   4. Do it later.
   5. Do it when they're not looking.
   6. Do it concurrently.
   7. Do it cheaper.

   When an earlier mantra meets the target, stop.
3. Plan the fix from the trace. If it crosses a function boundary, `architect` first. Delegate implementation to a subagent using your configured perf-issue model (default `fable`); review the diff. Capture a post-fix trace.
   Apply the **sequence-verifiable-units** principle, verifying each attempt before trying the next.
4. Parse and compare the artifacts (JSON to sqlite, diff). "Inconclusive" or wrong-surface is not a pass; flag it.
5. Cite the measurement in the PR.
6. Run **Opening a PR**.

For sustained improvement against a metric rather than a one-off fix, use the Hillclimb playbook (`playbooks/hillclimb.md`).

**Reply:** baseline number, post-fix number, delta, artifact path.
