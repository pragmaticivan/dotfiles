import { test } from "node:test";
import assert from "node:assert/strict";
import { planBackfillRange } from "./planNextRun.ts";

test("backfill range covers both named days", () => {
  assert.deepEqual(planBackfillRange("2026-09-01T00:00:00Z", "2026-09-03T00:00:00Z"), {
    from: new Date("2026-09-01T00:00:00Z"),
    to: new Date("2026-09-03T00:00:00Z"),
  });
});

test("backfill range rejects an inverted range", () => {
  assert.equal(planBackfillRange("2026-09-03T00:00:00Z", "2026-09-01T00:00:00Z"), null);
});
