import { test } from "node:test";
import assert from "node:assert/strict";
import { checkout } from "../src/checkout.ts";

test("totals a small cart", async () => {
  const receipt = await checkout([
    { sku: "SKU-0001", qty: 2 },
    { sku: "SKU-0003", qty: 1 },
  ]);
  assert.equal(receipt.totalCents, 499 * 2 + 549);
});
