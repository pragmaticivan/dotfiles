import { test } from "node:test";
import assert from "node:assert/strict";
import { formatOrderTotal } from "./formatOrder.ts";

test("multiplies price by quantity and formats dollars", () => {
  const order = { items: [{ price: 2.5, qty: 2 }, { price: 1.25, qty: 4 }] };
  assert.equal(formatOrderTotal(order), "$10.00");
});

test("empty order formats as zero", () => {
  assert.equal(formatOrderTotal({ items: [] }), "$0.00");
});
