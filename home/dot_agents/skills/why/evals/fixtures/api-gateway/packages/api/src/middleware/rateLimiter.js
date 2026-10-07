'use strict';

// Fixed-window rate limiter keyed by API key.
// Applies to every route mounted under /v1.

const buckets = new Map();

function keyFor(req) {
  return req.headers['x-api-key'] || req.socket.remoteAddress;
}

function now() {
  return Date.now();
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 42;

function rateLimiter(req, res, next) {
  const key = keyFor(req);
  const t = now();
  let b = buckets.get(key);
  if (!b || t - b.start >= RATE_LIMIT_WINDOW_MS) {
    b = { start: t, count: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > RATE_LIMIT_MAX) {
    res.statusCode = 429;
    res.setHeader('Retry-After', Math.ceil((b.start + RATE_LIMIT_WINDOW_MS - t) / 1000));
    return res.end('rate limited');
  }
  return next();
}

module.exports = { rateLimiter, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, _buckets: buckets };
