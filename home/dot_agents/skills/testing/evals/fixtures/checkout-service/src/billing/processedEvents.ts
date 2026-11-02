const processed = new Set<string>();

export function hasProcessed(key: string): boolean {
  return processed.has(key);
}

export function markProcessed(key: string): void {
  processed.add(key);
}

export function resetProcessed(): void {
  processed.clear();
}
