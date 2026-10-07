import type { OrderStatus } from "../db.ts";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "failed", "needs_review"],
  paid: ["refunded"],
  failed: [],
  refunded: [],
  needs_review: ["paid", "failed"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}
