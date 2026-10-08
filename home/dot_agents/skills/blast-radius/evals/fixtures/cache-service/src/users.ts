import { Cache } from './cache.ts';

export type User = { id: string; name: string; orgId: string };

const db = new Map<string, User>();

export function seedUser(user: User): void {
  db.set(user.id, user);
}

export function loadUser(cache: Cache, id: string): User | undefined {
  const key = `user:${id}`;
  const hit = cache.get(key) as User | undefined;
  if (hit) return hit;
  const user = db.get(id);
  if (!user) return undefined;
  cache.set(key, user);
  cache.set(`${key}:profile`, { display: user.name.toUpperCase() });
  cache.addDependent(key, `${key}:profile`);
  cache.addDependent(key, `org:${user.orgId}:settings`);
  return user;
}

// Called on every profile edit to drop the stale user record.
export function updateUser(cache: Cache, id: string, patch: Partial<User>): void {
  const user = db.get(id);
  if (!user) return;
  db.set(id, { ...user, ...patch });
  cache.evict(`user:${id}`);
}

export function deleteUser(cache: Cache, id: string): void {
  db.delete(id);
  const key = `user:${id}`;
  for (const child of cache.dependentsOf(key)) cache.evict(child);
  cache.evict(key);
}
