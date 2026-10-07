import { Cache } from './cache.ts';

// Sessions live only in the cache. There is no backing store.
export function login(cache: Cache, userId: string, token: string): void {
  cache.set(`session:${token}`, { userId }, 24 * 60 * 60 * 1000);
  // Registered so that deleteUser() also kills the user's sessions.
  cache.addDependent(`user:${userId}`, `session:${token}`);
}

export function whoami(cache: Cache, token: string): string | undefined {
  const s = cache.get(`session:${token}`) as { userId: string } | undefined;
  return s?.userId;
}
