import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleChargeSucceeded, type ChargeSucceededEvent } from './stripeChargeHandler.ts';
import { ledger, resetLedger } from '../payments.ts';

beforeEach(() => resetLedger());

const event: ChargeSucceededEvent = {
  id: 'evt_1',
  type: 'charge.succeeded',
  data: { object: { id: 'ch_1', customer: 'cus_42', amount: 4999 } },
  request: { idempotency_key: 'idem_1' },
};

test('a charge.succeeded event charges the customer', async () => {
  const res = await handleChargeSucceeded(event);
  assert.equal(res.status, 200);
  assert.deepEqual(ledger, [{ id: 'ch_1', customer: 'cus_42', amount: 4999 }]);
});
