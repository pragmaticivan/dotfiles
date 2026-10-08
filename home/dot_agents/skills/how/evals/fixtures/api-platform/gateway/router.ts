import { chain } from "./middleware.ts";
import type { Handler, Req, Res } from "./types.ts";
import { createOrder } from "../services/orders/handler.ts";
import { updateUser } from "../services/users/handler.ts";

const routes: Record<string, Handler> = {
  "POST /orders": createOrder,
  "PATCH /users/me": updateUser,
};

export function dispatch(req: Req): Res {
  const handler = routes[`${req.method} ${req.path}`];
  if (!handler) return { status: 404, json: { error: "not found" } };
  const run = chain.reduceRight<Handler>((next, mw) => (r) => mw(r, next), handler);
  return run(req);
}
