import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCouponCode } from './discounts.ts';

test('applyCouponCode gives 10% for WELCOME10', () => {
  assert.equal(applyCouponCode({ id: 'o1', subtotal: 80 }, 'welcome10'), 8);
});

test('applyCouponCode gives nothing for an unknown code', () => {
  assert.equal(applyCouponCode({ id: 'o2', subtotal: 80 }, 'NOPE'), 0);
});
