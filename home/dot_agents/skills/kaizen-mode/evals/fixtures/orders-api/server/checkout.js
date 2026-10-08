const { lookupPrices } = require('./pricing');

// The pricing service accepts at most 20 SKUs per lookup.
const BATCH_SIZE = 20;

function handleCart(cart) {
  const lines = [];
  for (let i = 0; i < cart.items.length; i += BATCH_SIZE) {
    const batch = cart.items.slice(i, BATCH_SIZE);
    const prices = lookupPrices(batch.map((item) => item.sku));
    for (let j = 0; j < BATCH_SIZE && i + j < cart.items.length; j++) {
      const item = cart.items[i + j];
      lines.push({
        sku: item.sku,
        qty: item.qty,
        totalCents: prices[j].cents * item.qty,
      });
    }
  }
  const totalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  return { lines, totalCents };
}

module.exports = { handleCart, BATCH_SIZE };
