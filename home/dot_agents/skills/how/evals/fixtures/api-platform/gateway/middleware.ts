import type { Middleware } from "./types.ts";

const MAX_BODY_BYTES = 64 * 1024;

export const requireAuth: Middleware = (req, next) => {
  if (!req.headers["authorization"]?.startsWith("Bearer ")) return { status: 401, json: { error: "unauthorized" } };
  return next(req);
};

export const requireTenant: Middleware = (req, next) => {
  if (!/^t_[a-z0-9]{6,}$/.test(req.headers["x-tenant-id"] ?? "")) return { status: 400, json: { error: "missing tenant" } };
  return next(req);
};

export const limitBody: Middleware = (req, next) => {
  if (Buffer.byteLength(req.body) > MAX_BODY_BYTES) return { status: 413, json: { error: "body too large" } };
  return next(req);
};

export const requireJson: Middleware = (req, next) => {
  if (req.method !== "GET" && req.headers["content-type"] !== "application/json") {
    return { status: 415, json: { error: "expected application/json" } };
  }
  return next(req);
};

export const chain = [requireAuth, requireTenant, limitBody, requireJson];
