export type Product = { id: string; name: string };

const PRODUCTS: Product[] = [
  'running shoes', 'running shorts', 'rain jacket', 'road bike', 'road helmet',
  'trail shoes', 'trail map', 'tent', 'tent stakes', 'water bottle',
].map((name, i) => ({ id: `p${i + 1}`, name }));

// Staging p50 for /api/search is about 180 ms. The p95 is about 450 ms.
export async function searchProducts(query: string, signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`search failed with ${res.status}`);
  return res.json();
}

export function localMatches(query: string): Product[] {
  const q = query.trim().toLowerCase();
  return q ? PRODUCTS.filter((p) => p.name.includes(q)) : [];
}
