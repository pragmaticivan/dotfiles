export type Price = { sku: string; amountCents: number };

const PAGE_SIZE = 20;

const PRICES: Record<string, number> = Object.fromEntries(
  Array.from({ length: 200 }, (_, i) => [`SKU-${String(i + 1).padStart(4, "0")}`, 499 + i * 25]),
);

export type PricePage = { items: Price[]; nextCursor: number | null };

export async function fetchPricePage(skus: string[], cursor = 0): Promise<PricePage> {
  const slice = skus.slice(cursor, cursor + PAGE_SIZE);
  const items = slice
    .filter((sku) => sku in PRICES)
    .map((sku) => ({ sku, amountCents: PRICES[sku] }));
  const next = cursor + PAGE_SIZE;
  return { items, nextCursor: next < skus.length ? next : null };
}
