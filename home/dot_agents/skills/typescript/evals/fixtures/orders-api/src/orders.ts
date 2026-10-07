import { pool } from "./db.ts";

export async function markOrderPaid(orderId: string, amountCents: number): Promise<boolean> {
  const result = await pool.query(
    "UPDATE orders SET status = 'paid', paid_cents = $2, paid_at = now() WHERE id = $1 AND status = 'pending'",
    [orderId, amountCents],
  );
  return result.rowCount === 1;
}

export async function markOrderShipped(orderId: string, trackingNumber: string): Promise<boolean> {
  const result = await pool.query(
    "UPDATE orders SET status = 'shipped', tracking_number = $2 WHERE id = $1 AND status = 'paid'",
    [orderId, trackingNumber],
  );
  return result.rowCount === 1;
}
