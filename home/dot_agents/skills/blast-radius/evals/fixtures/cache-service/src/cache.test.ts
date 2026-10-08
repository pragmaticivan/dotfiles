import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cache } from './cache.ts';
import { seedUser, loadUser, updateUser, deleteUser } from './users.ts';

test('get returns undefined after ttl', () => {
  let t = 0;
  const c = new Cache(() => t);
  c.set('a', 1, 10);
  t = 11;
  assert.equal(c.get('a'), undefined);
});

test('updateUser drops the stale user record', () => {
  const c = new Cache();
  seedUser({ id: '1', name: 'ada', orgId: 'o1' });
  loadUser(c, '1');
  updateUser(c, '1', { name: 'grace' });
  assert.equal((loadUser(c, '1') as { name: string }).name, 'grace');
});

test('deleteUser removes user and profile', () => {
  const c = new Cache();
  seedUser({ id: '2', name: 'lin', orgId: 'o1' });
  loadUser(c, '2');
  deleteUser(c, '2');
  assert.equal(c.get('user:2'), undefined);
  assert.equal(c.get('user:2:profile'), undefined);
});
