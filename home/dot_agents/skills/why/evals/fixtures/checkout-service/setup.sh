#!/usr/bin/env bash
set -euo pipefail
git init -q -b main
git config user.name "placeholder"
git config user.email "placeholder@example.com"
git config commit.gpgsign false
echo "pr-exports/" >> .git/info/exclude

commit() {
  GIT_AUTHOR_NAME="$1" GIT_AUTHOR_EMAIL="$2" GIT_COMMITTER_NAME="$1" GIT_COMMITTER_EMAIL="$2" \
  GIT_AUTHOR_DATE="$3" GIT_COMMITTER_DATE="$3" git commit -q -m "$4"
}

mkdir -p services/checkout/src/cart services/checkout/migrations
cat > services/checkout/src/cart/updateCart.ts <<'TS'
import type { Db } from "../db.ts";
import { quoteTax } from "../tax/client.ts";

export type CartLine = { sku: string; qty: number; unitCents: number };

export async function updateCart(db: Db, cartId: string, lines: CartLine[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.query("SELECT id FROM carts WHERE id = $1 FOR UPDATE", [cartId]);
    const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0);
    const tax = await quoteTax(cartId, subtotal);
    await tx.query(
      "UPDATE carts SET lines = $2, subtotal_cents = $3, tax_cents = $4 WHERE id = $1",
      [cartId, JSON.stringify(lines), subtotal, tax],
    );
  });
}
TS
cat > services/checkout/src/db.ts <<'TS'
export type Tx = { query: (sql: string, params: unknown[]) => Promise<{ rowCount: number; rows: any[] }> };
export type Db = Tx & { transaction: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T> };
TS
git add services
commit "Marco Diaz" "marco.diaz@shopco.example" "2024-02-05T10:12:00-05:00" "feat(cart): add cart update service (#180)"

cat > services/checkout/migrations/0007_cart_row_version.sql <<'SQL'
ALTER TABLE carts ADD COLUMN row_version integer NOT NULL DEFAULT 0;
SQL
cat > services/checkout/src/cart/updateCart.ts <<'TS'
import type { Db } from "../db.ts";
import { quoteTax } from "../tax/client.ts";

export type CartLine = { sku: string; qty: number; unitCents: number };

export class CartVersionConflict extends Error {}

export async function updateCartWithVersion(
  db: Db,
  cartId: string,
  expectedVersion: number,
  lines: CartLine[],
): Promise<number> {
  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0);
  const tax = await quoteTax(cartId, subtotal);
  const result = await db.query(
    `UPDATE carts
        SET lines = $3, subtotal_cents = $4, tax_cents = $5, row_version = row_version + 1
      WHERE id = $1 AND row_version = $2`,
    [cartId, expectedVersion, JSON.stringify(lines), subtotal, tax],
  );
  if (result.rowCount === 0) throw new CartVersionConflict(cartId);
  return expectedVersion + 1;
}
TS
git add services
commit "Marco Diaz" "marco.diaz@shopco.example" "2024-06-18T16:40:00-04:00" "fix(cart): replace FOR UPDATE with row_version check (#212)

Do the tax quote before the write and guard the write with
row_version instead of holding a row lock across the tax call.

Refs CHK-318"

cat > services/checkout/src/cart/updateCart.ts <<'TS'
import type { Db } from "../db.ts";
import { quoteTax } from "../tax/client.ts";

export type CartLine = { sku: string; qty: number; unitCents: number };

export class CartVersionConflict extends Error {}

export async function updateCartWithVersion(
  db: Db,
  cartId: string,
  expectedVersion: number,
  lines: CartLine[],
): Promise<number> {
  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0);
  const tax = await quoteTax(cartId, subtotal);
  const result = await db.query(
    `UPDATE carts
        SET lines = $3, subtotal_cents = $4, tax_cents = $5, row_version = row_version + 1
      WHERE id = $1 AND row_version = $2`,
    [cartId, expectedVersion, JSON.stringify(lines), subtotal, tax],
  );
  if (result.rowCount === 0) throw new CartVersionConflict(cartId);
  return expectedVersion + 1;
}

export async function updateCartRetrying(db: Db, cartId: string, lines: CartLine[]): Promise<number> {
  const read = async () =>
    (await db.query("SELECT row_version FROM carts WHERE id = $1", [cartId])).rows[0].row_version as number;
  try {
    return await updateCartWithVersion(db, cartId, await read(), lines);
  } catch (err) {
    if (!(err instanceof CartVersionConflict)) throw err;
    return updateCartWithVersion(db, cartId, await read(), lines);
  }
}
TS
git add services
commit "Ana Okafor" "ana.okafor@shopco.example" "2024-09-02T09:05:00-04:00" "chore(cart): retry once on version conflict (#241)"
