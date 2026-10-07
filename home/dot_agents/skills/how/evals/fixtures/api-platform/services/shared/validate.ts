export type FieldErrors = Record<string, string>;

export function parseJson(body: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(body);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function requireString(input: Record<string, unknown>, field: string, errors: FieldErrors, max = 200): void {
  const v = input[field];
  if (typeof v !== "string" || v.length === 0) errors[field] = "required";
  else if (v.length > max) errors[field] = `must be at most ${max} characters`;
}

export function requirePositiveInt(input: Record<string, unknown>, field: string, errors: FieldErrors): void {
  const v = input[field];
  if (!Number.isInteger(v) || (v as number) <= 0) errors[field] = "must be a positive integer";
}

export function invalid(errors: FieldErrors) {
  return { status: 422, json: { error: "validation failed", fields: errors } };
}
