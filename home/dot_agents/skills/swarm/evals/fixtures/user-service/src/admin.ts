import { getUserByID } from "./users.ts";

export function describeUser(id: string): string {
  const user = getUserByID(id);
  return user ? `${user.name} <${user.email}>` : `unknown user ${id}`;
}
