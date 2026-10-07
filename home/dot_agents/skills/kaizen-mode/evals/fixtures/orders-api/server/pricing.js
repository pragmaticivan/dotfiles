const CATALOG = new Map();
for (let n = 1; n <= 100; n++) {
  CATALOG.set(`SKU-${String(n).padStart(3, '0')}`, n * 100);
}

function lookupPrices(skus) {
  return skus.map((sku) => {
    const cents = CATALOG.get(sku);
    if (cents === undefined) {
      throw new Error(`unknown sku ${sku}`);
    }
    return { sku, cents };
  });
}

module.exports = { lookupPrices };
