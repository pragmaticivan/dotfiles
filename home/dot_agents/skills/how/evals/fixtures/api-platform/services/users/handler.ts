import type { Req, Res } from "../../gateway/types.ts";
import { invalid, parseJson, requireString, type FieldErrors } from "../shared/validate.ts";

const TIMEZONES = new Set(["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles"]);

export function updateUser(req: Req): Res {
  const input = parseJson(req.body);
  if (!input) return invalid({ body: "must be a JSON object" });

  const errors: FieldErrors = {};
  requireString(input, "displayName", errors, 80);
  if (input.timezone !== undefined && !TIMEZONES.has(input.timezone as string)) errors.timezone = "unsupported timezone";
  if (Object.keys(errors).length > 0) return invalid(errors);

  return { status: 200, json: { displayName: input.displayName, timezone: input.timezone ?? "UTC" } };
}
