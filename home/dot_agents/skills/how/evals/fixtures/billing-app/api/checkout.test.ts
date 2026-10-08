import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { db } from "./db.ts";
import { postCheckout } from "./routes/checkout.ts";
import { handlePaycoWebhook } from "./webhooks/payco.ts";

const secret = "whsec_test";
const sign = (body: string) => createHmac("sha256", secret).update(body).digest("hex");
const provider = { createCharge: async () => ({ id: "ch_1", status: "processing" as const }) };

test("checkout then webhook marks the order paid once", async () => {
  db.carts.set("cart_1", [{ sku: "pro-monthly", unitCents: 2000, quantity: 1 }]);
  const res = await postCheckout({ cartId: "cart_1", paymentMethodId: "pm_1" }, provider);
  const { orderId } = res.json as { orderId: string };
  assert.equal(db.orders.get(orderId)!.status, "pending");

  const body = JSON.stringify({ id: "evt_1", type: "charge.succeeded", data: { chargeId: "ch_1", amount: 2000 } });
  assert.deepEqual(handlePaycoWebhook(body, sign(body), secret), { status: 200 });
  assert.equal(db.orders.get(orderId)!.status, "paid");

  const late = JSON.stringify({ id: "evt_2", type: "charge.failed", data: { chargeId: "ch_1", amount: 2000 } });
  handlePaycoWebhook(late, sign(late), secret);
  assert.equal(db.orders.get(orderId)!.status, "paid");
});

test("amount mismatch parks the order in needs_review", async () => {
  db.carts.set("cart_2", [{ sku: "seat", unitCents: 500, quantity: 3 }]);
  const p = { createCharge: async () => ({ id: "ch_2", status: "processing" as const }) };
  const res = await postCheckout({ cartId: "cart_2", paymentMethodId: "pm_1" }, p);
  const { orderId } = res.json as { orderId: string };
  const body = JSON.stringify({ id: "evt_3", type: "charge.succeeded", data: { chargeId: "ch_2", amount: 1000 } });
  handlePaycoWebhook(body, sign(body), secret);
  assert.equal(db.orders.get(orderId)!.status, "needs_review");
});

test("webhook for an unknown charge returns 500", () => {
  const body = JSON.stringify({ id: "evt_4", type: "charge.succeeded", data: { chargeId: "ch_unknown", amount: 1 } });
  assert.deepEqual(handlePaycoWebhook(body, sign(body), secret), { status: 500 });
});
