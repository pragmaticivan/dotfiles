#!/usr/bin/env bash
set -euo pipefail
export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana@example.com"
export GIT_AUTHOR_DATE="2026-09-14T10:00:00Z" GIT_COMMITTER_DATE="2026-09-14T10:00:00Z"
git init -q -b main
cp server/checkout.js checkout.js.new
cat > server/checkout.js <<'JS'
const { lookupPrices } = require('./pricing');

function handleCart(cart) {
  const prices = lookupPrices(cart.items.map((item) => item.sku));
  const lines = cart.items.map((item, j) => ({
    sku: item.sku,
    qty: item.qty,
    totalCents: prices[j].cents * item.qty,
  }));
  const totalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  return { lines, totalCents };
}

module.exports = { handleCart };
JS
git add package.json server
git -c commit.gpgsign=false commit -q -m "feat: add orders endpoint"
mv checkout.js.new server/checkout.js
export GIT_AUTHOR_DATE="2026-09-21T15:30:00Z" GIT_COMMITTER_DATE="2026-09-21T15:30:00Z"
git add server/checkout.js
git -c commit.gpgsign=false commit -q -m "perf: batch price lookups in groups of 20"
