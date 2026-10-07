import { createHmac, timingSafeEqual } from "node:crypto";
import { db, findOrderByChargeId } from "../db.ts";
import { canTransition } from "../orders/state.ts";
import type { OrderStatus } from "../db.ts";

type PaycoEvent = {
  id: string;
  type: "charge.succeeded" | "charge.failed" | "charge.refunded";
  data: { chargeId: string; amount: number };
};

const targetStatus: Record<PaycoEvent["type"], OrderStatus> = {
  "charge.succeeded": "paid",
  "charge.failed": "failed",
  "charge.refunded": "refunded",
};

export function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function handlePaycoWebhook(rawBody: string, signature: string, secret: string): { status: number } {
  if (!verifySignature(rawBody, signature, secret)) return { status: 401 };
  const event = JSON.parse(rawBody) as PaycoEvent;
  if (db.processedEvents.has(event.id)) return { status: 200 };

  const order = findOrderByChargeId(event.data.chargeId);
  // PayCo can deliver the webhook before postCheckout saves chargeId. A 500 makes PayCo retry later.
  if (!order) return { status: 500 };

  let next = targetStatus[event.type];
  if (next === "paid" && event.data.amount !== order.amountCents) next = "needs_review";

  if (canTransition(order.status, next)) {
    db.orders.set(order.id, { ...order, status: next });
  }
  db.processedEvents.add(event.id);
  return { status: 200 };
}
