export type Entry = { value: unknown; expiresAt: number };

export class Cache {
  private store = new Map<string, Entry>();
  private deps = new Map<string, Set<string>>();
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  set(key: string, value: unknown, ttlMs = 60_000): void {
    this.store.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  get(key: string): unknown {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  addDependent(parent: string, child: string): void {
    let children = this.deps.get(parent);
    if (!children) {
      children = new Set();
      this.deps.set(parent, children);
    }
    children.add(child);
  }

  dependentsOf(parent: string): string[] {
    return [...(this.deps.get(parent) ?? [])];
  }

  evict(key: string): void {
    this.store.delete(key);
  }

  toJSON(): { entries: [string, Entry][]; deps: [string, string[]][] } {
    return {
      entries: [...this.store],
      deps: [...this.deps].map(([k, s]) => [k, [...s]]),
    };
  }

  static fromJSON(data: { entries: [string, Entry][]; deps: [string, string[]][] }, now: () => number = Date.now): Cache {
    const cache = new Cache(now);
    for (const [k, e] of data.entries) cache.store.set(k, e);
    for (const [k, children] of data.deps) cache.deps.set(k, new Set(children));
    return cache;
  }
}
