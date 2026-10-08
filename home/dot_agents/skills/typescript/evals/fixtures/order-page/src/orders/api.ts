import type { Order } from "./types";

export async function fetchOrder(orderId: string): Promise<Order> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
  if (!res.ok) {
    throw new Error(`Order request failed with ${res.status}`);
  }
  return res.json();
}
