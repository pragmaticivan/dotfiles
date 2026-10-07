export interface OrderLine {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  status: "pending" | "paid" | "shipped" | "cancelled";
  placedAt: string;
  lines: OrderLine[];
  totalCents: number;
}
