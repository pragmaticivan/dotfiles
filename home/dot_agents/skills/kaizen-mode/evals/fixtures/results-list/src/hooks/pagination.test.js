import test from 'node:test';
import assert from 'node:assert';
import { paginate } from './pagination.js';

const items = Array.from({ length: 51 }, (_, i) => i + 1);

test('last page holds the remainder', () => {
  assert.deepStrictEqual(paginate(items, 3, 25), { page: 3, pageCount: 3, rows: [51] });
});

test('page past the end clamps to the last page', () => {
  assert.strictEqual(paginate(items, 9, 25).page, 3);
});

test('empty list still has one page', () => {
  assert.deepStrictEqual(paginate([], 1, 25), { page: 1, pageCount: 1, rows: [] });
});
