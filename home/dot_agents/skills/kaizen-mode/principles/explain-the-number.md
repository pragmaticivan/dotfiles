<!-- Source: https://github.com/cursor/plugins/blob/main/pstack/skills/principle-explain-the-number/SKILL.md -->

# Explain the Number

*Apply before you trust, report, or act on a number that you measured: a speedup, a regression, a throughput, a latency, or an eval result. Find what limits it, and make sure that it does not measure other work.*

A measured number is a claim about a system. Before you trust it, report it, or act on it, find what limits it. Then rule out that it measured something else.

**Why:** A run that went wrong still prints a plausible number. Failed requests, a cache that skipped the work, code that did not run, a side left on default settings, and run-to-run noise all give results that look correct. If you cannot say why the number is not twice as good, you do not know what you measured.

**Pattern:**

- **Ask "why not double?"** Name the resource or code path that limits the result, for example a core, a lock, the disk, the network, or the load generator. Get it from a profile or from system counters that you took during a run, then map it to the source. A guess from the code is not a limiter.
- **List what else the number can measure, and rule out each item with evidence.** The usual causes are errors, skipped or cached work, an untuned side, noise, and a piece too small to matter end to end.
- **Keep the evidence with the number.** Put the run count, the spread, and the limiter in the notes or in a linked artifact, so that a reader can check the claim.

For a performance number, do the full procedure in `references/benchmark-checklist.md`. For an eval result, ask the same questions of the trials. Did every run do the task? Does the gap stay across trials and models? Does the scenario matter?

You skipped this principle when the evidence for a number has no run count, no spread, or no named limiter. You also skipped it when the time saved is more than the time the changed piece took.

This principle is different from **Prove It Works** (`principles/prove-it-works.md`), which makes sure that an output is real. This principle makes sure that a measured number means what you say.
