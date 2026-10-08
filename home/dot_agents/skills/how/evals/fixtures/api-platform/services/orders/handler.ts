import type { Req, Res } from "../../gateway/types.ts";
import { invalid, parseJson, requirePositiveInt, requireString, type FieldErrors } from "../shared/validate.ts";

export function createOrder(req: Req): Res {
  const input = parseJson(req.body);
  if (!input) return invalid({ body: "must be a JSON object" });

  const errors: FieldErrors = {};
  requireString(input, "sku", errors, 40);
  requirePositiveInt(input, "quantity", errors);
  if (input.quantity !== undefined && (input.quantity as number) > 100) errors.quantity = "at most 100 per order";
  if (Object.keys(errors).length > 0) return invalid(errors);

  return { status: 201, json: { id: "ord_1", sku: input.sku, quantity: input.quantity, tenant: req.headers["x-tenant-id"] } };
}
