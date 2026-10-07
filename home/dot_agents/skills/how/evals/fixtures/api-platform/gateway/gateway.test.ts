import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "./router.ts";

const headers = { authorization: "Bearer tok", "x-tenant-id": "t_acme01", "content-type": "application/json" };

test("gateway rejects a request with no tenant before the service runs", () => {
  const res = dispatch({ method: "POST", path: "/orders", headers: { ...headers, "x-tenant-id": "" }, body: "{}" });
  assert.equal(res.status, 400);
});

test("gateway passes a bad field through and the service returns 422", () => {
  const res = dispatch({ method: "POST", path: "/orders", headers, body: JSON.stringify({ sku: "A1", quantity: 0 }) });
  assert.deepEqual(res, { status: 422, json: { error: "validation failed", fields: { quantity: "must be a positive integer" } } });
});

test("users service rejects an unknown timezone", () => {
  const res = dispatch({ method: "PATCH", path: "/users/me", headers, body: JSON.stringify({ displayName: "Ana", timezone: "Mars/Base" }) });
  assert.equal(res.status, 422);
});

test("valid order is created", () => {
  const res = dispatch({ method: "POST", path: "/orders", headers, body: JSON.stringify({ sku: "A1", quantity: 2 }) });
  assert.equal(res.status, 201);
});
