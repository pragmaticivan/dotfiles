import { randomUUID } from "node:crypto";
import { db } from "../db.ts";
import { totalCents } from "../pricing.ts";
import type { PaymentProvider } from "../payments/provider.ts";

export async function postCheckout(
  body: { cartId: string; paymentMethodId: string },
  provider: PaymentProvider,
): Promise<{ status: number; json: unknown }> {
  const items = db.carts.get(body.cartId);
  if (!items || items.length === 0) return { status: 400, json: { error: "empty cart" } };

  const order = { id: randomUUID(), cartId: body.cartId, amountCents: totalCents(items), status: "pending" as const, chargeId: null };
  db.orders.set(order.id, order);

  const charge = await provider.createCharge({
    amountCents: order.amountCents,
    paymentMethodId: body.paymentMethodId,
    idempotencyKey: `checkout:${body.cartId}`,
  });
  db.orders.set(order.id, { ...order, chargeId: charge.id });

  return { status: 202, json: { orderId: order.id, status: "pending" } };
}
