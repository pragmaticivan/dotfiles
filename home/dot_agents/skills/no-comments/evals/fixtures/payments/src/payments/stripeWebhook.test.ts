import { test } from "node:test";
import assert from "node:assert/strict";
import { handlePaymentSucceeded, type Order } from "./stripeWebhook.ts";

const pending = (): Order => ({ id: "ord_1", totalCents: 4200, status: "pending" });

test("string amount that matches marks the order paid", () => {
  const order = handlePaymentSucceeded({ type: "payment.succeeded", data: { amount: "4200", orderId: "ord_1" } }, pending());
  assert.equal(order.status, "paid");
});

test("mismatched amount leaves the order pending", () => {
  const order = handlePaymentSucceeded({ type: "payment.succeeded", data: { amount: "4199", orderId: "ord_1" } }, pending());
  assert.equal(order.status, "pending");
});
