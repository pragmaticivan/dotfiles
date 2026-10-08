import { fetchPricePage, type Price } from "./catalog.ts";

export type CartLine = { sku: string; qty: number };
export type Receipt = { lines: { sku: string; qty: number; lineCents: number }[]; totalCents: number };

async function lookupPrices(skus: string[]): Promise<Map<string, Price>> {
  const page = await fetchPricePage(skus);
  return new Map(page.items.map((p) => [p.sku, p]));
}

export async function checkout(cart: CartLine[]): Promise<Receipt> {
  const prices = await lookupPrices(cart.map((l) => l.sku));
  const lines = cart.map((l) => ({
    sku: l.sku,
    qty: l.qty,
    lineCents: prices.get(l.sku)!.amountCents * l.qty,
  }));
  return { lines, totalCents: lines.reduce((sum, l) => sum + l.lineCents, 0) };
}
