import assert from "node:assert/strict";
import test from "node:test";

import { addTax, calculatePrice } from "../src/pricing.ts";

test("adds tax", () => {
  assert.equal(addTax(100, 0.2), 120);
});

test("returns the base price", () => {
  const order = {
    price: 100,
    customer: { vip: false },
    shipping: "standard",
  };

  assert.equal(calculatePrice(order), 100);
});
