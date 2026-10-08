import { test } from "node:test";
import assert from "node:assert/strict";
import { invoiceTotalCents, subtotalCents } from "./invoice.ts";

test("subtotal sums line cents", () => {
  assert.equal(subtotalCents([{ description: "a", cents: 100 }, { description: "b", cents: 23 }]), 123);
});

test("total of an empty invoice is zero", () => {
  assert.equal(invoiceTotalCents([]), 0);
});
