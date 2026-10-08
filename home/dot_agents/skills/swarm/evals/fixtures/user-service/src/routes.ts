import { getUserByID } from "./users.ts";

export function handleGetUser(params: { id: string }): { status: number; body: unknown } {
  const user = getUserByID(params.id);
  if (!user) return { status: 404, body: { error: "not found" } };
  return { status: 200, body: user };
}
