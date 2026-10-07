export type Session = { cartId: string; userId: string | null; expiresAt: number };

const TTL_MS = 10 * 60 * 1000;

export class SessionStore {
  private entries = new Map<string, Session>();
  private readonly maxEntries: number;

  constructor(maxEntries = 50_000) {
    this.maxEntries = maxEntries;
  }

  get(id: string, now = Date.now()): Session | undefined {
    const session = this.entries.get(id);
    if (!session) return undefined;
    this.entries.delete(id);
    if (session.expiresAt <= now) return undefined;
    this.entries.set(id, session);
    return session;
  }

  set(id: string, cartId: string, userId: string | null, now = Date.now()): void {
    this.entries.delete(id);
    this.entries.set(id, { cartId, userId, expiresAt: now + TTL_MS });
    if (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

export const sessionStore = new SessionStore();
