import { test } from "node:test";
import assert from "node:assert/strict";
import { server } from "../gateway/server.ts";
import * as pricing from "../workers/pricing.ts";

pricing.start();

test("routes a tenant job to its worker", async () => {
  await new Promise<void>((ok) => server.listen(0, ok));
  const { port } = server.address() as { port: number };
  const res = await fetch(`http://127.0.0.1:${port}/v1/jobs/pricing`, {
    method: "POST",
    headers: { "x-tenant-id": "acme" },
    body: JSON.stringify({ quoteId: "q-1" }),
  });
  server.close();
  assert.equal(res.status, 202);
  assert.deepEqual(pricing.processed.at(-1), { tenantId: "acme", kind: "pricing", payload: { quoteId: "q-1" } });
});
