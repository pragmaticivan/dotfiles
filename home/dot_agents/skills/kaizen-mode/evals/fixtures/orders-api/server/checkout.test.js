const test = require('node:test');
const assert = require('node:assert');
const { handleCart } = require('./checkout');

test('prices a small cart', () => {
  const order = handleCart({
    items: [
      { sku: 'SKU-001', qty: 2 },
      { sku: 'SKU-005', qty: 1 },
    ],
  });
  assert.strictEqual(order.totalCents, 700);
  assert.strictEqual(order.lines.length, 2);
});
