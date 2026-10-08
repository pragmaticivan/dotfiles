'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { rateLimiter, RATE_LIMIT_MAX, _buckets } = require('../src/middleware/rateLimiter.js');

function call() {
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end() {} };
  let passed = false;
  rateLimiter({ headers: { 'x-api-key': 'k1' }, socket: {} }, res, () => { passed = true; });
  return { res, passed };
}

test('allows 42 requests per window, then returns 429', () => {
  _buckets.clear();
  for (let i = 0; i < RATE_LIMIT_MAX; i++) assert.strictEqual(call().passed, true);
  const last = call();
  assert.strictEqual(last.passed, false);
  assert.strictEqual(last.res.statusCode, 429);
  assert.strictEqual(RATE_LIMIT_MAX, 42);
});
