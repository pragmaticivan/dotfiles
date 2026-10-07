import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { fetchOrder } from "./api";
import type { Order } from "./types";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function OrderDetailPage() {
  const { orderId } = useParams();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchOrder(orderId);
        setOrder(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load order");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  return (
    <main className="order-detail">
      {loading && <div className="spinner" aria-label="Loading order" />}
      {error && <div className="banner banner-error">{error}</div>}
      {order && (
        <section>
          <h1>Order {order.id}</h1>
          <p>Status: {order.status}</p>
          <ul>
            {order.lines.map((line) => (
              <li key={line.sku}>
                {line.quantity} x {line.name} at {formatCents(line.unitPriceCents)}
              </li>
            ))}
          </ul>
          <p>Total: {formatCents(order.totalCents)}</p>
        </section>
      )}
    </main>
  );
}
