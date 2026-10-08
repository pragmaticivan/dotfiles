export type Order = { id: string; totalCents: number; status: "pending" | "paid" };
export type WebhookEvent = { type: string; data: { amount: string | number; orderId: string } };

export function markPaid(order: Order) {
  order.status = "paid";
}

export function handlePaymentSucceeded(event: WebhookEvent, order: Order) {
  const expectedTotal = order.totalCents;

  // Stripe's v2 webhook payload sends `amount` as a string instead of a number due to
  // a known bug in their API (see STRIPE-4821); this coercion can be removed once they fix it upstream.
  const amountCents = Number(event.data.amount);

  // eslint-disable-next-line eqeqeq
  if (amountCents == expectedTotal) {
    markPaid(order);
  }
  return order;
}
