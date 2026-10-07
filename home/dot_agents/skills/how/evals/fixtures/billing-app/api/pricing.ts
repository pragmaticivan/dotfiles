import type { CartItem } from "./db.ts";

export function totalCents(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
}
