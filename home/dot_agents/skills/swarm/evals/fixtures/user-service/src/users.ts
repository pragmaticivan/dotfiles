export type User = { id: string; name: string; email: string };

const users: Map<string, User> = new Map([
  ["u1", { id: "u1", name: "Ada", email: "ada@example.com" }],
  ["u2", { id: "u2", name: "Linus", email: "linus@example.com" }],
]);

export function getUserByID(id: string): User | undefined {
  return users.get(id);
}

export function getUserByEmail(email: string): User | undefined {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  return undefined;
}
