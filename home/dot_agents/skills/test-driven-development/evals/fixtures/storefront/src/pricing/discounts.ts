import type { Order } from './types.ts';

const COUPONS: Record<string, number> = {
  WELCOME10: 0.1,
  SPRING5: 0.05,
};

export function applyCouponCode(order: Order, code: string): number {
  const rate = COUPONS[code.toUpperCase()] ?? 0;
  return roundCents(order.subtotal * rate);
}

export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
