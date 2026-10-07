import test from 'node:test';
import assert from 'node:assert';
import { MemoryQueue } from './queue.ts';
import { consumeBilling, CardDeclined, type ChargeJob } from './billing.ts';
import { consumeWebhook, HttpError, type WebhookJob } from './webhooks.ts';

test('billing requeues a declined card with a longer delay', async () => {
  const q = new MemoryQueue<ChargeJob>();
  q.push('c1', { customerId: 'cus_1', cents: 500 });
  await consumeBilling(q, async () => {
    throw new CardDeclined('declined');
  });
  assert.strictEqual(q.size, 1);
  assert.strictEqual(q.dead.length, 0);
});

test('webhook dead-letters a 4xx at once', async () => {
  const q = new MemoryQueue<WebhookJob>();
  q.push('w1', { url: 'https://example.com/hook', payload: {} });
  await consumeWebhook(q, async () => {
    throw new HttpError(410);
  });
  assert.strictEqual(q.size, 0);
  assert.strictEqual(q.dead.length, 1);
});
