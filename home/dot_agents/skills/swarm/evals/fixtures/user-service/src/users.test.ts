import { test } from "node:test";
import assert from "node:assert/strict";
import { getUserByID } from "./users.ts";
import { handleGetUser } from "./routes.ts";
import { describeUser } from "./admin.ts";

test("getUserByID returns a known user", () => {
  assert.equal(getUserByID("u1")?.name, "Ada");
});

test("route returns 404 for a missing user", () => {
  assert.equal(handleGetUser({ id: "nope" }).status, 404);
});

test("admin describes a user", () => {
  assert.equal(describeUser("u2"), "Linus <linus@example.com>");
});
