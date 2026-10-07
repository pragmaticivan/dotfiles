export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "needs_review";

export type Order = {
  id: string;
  cartId: string;
  amountCents: number;
  status: OrderStatus;
  chargeId: string | null;
};

export type CartItem = { sku: string; unitCents: number; quantity: number };

export const db = {
  carts: new Map<string, CartItem[]>(),
  orders: new Map<string, Order>(),
  processedEvents: new Set<string>(),
};

export function findOrderByChargeId(chargeId: string): Order | undefined {
  for (const order of db.orders.values()) {
    if (order.chargeId === chargeId) return order;
  }
  return undefined;
}
