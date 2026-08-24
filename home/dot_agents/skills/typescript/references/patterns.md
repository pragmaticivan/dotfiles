# Application patterns reference

Companion to `SKILL.md`. Read the section you need.

- [Result and typed errors](#result-and-typed-errors)
- [Branded types](#branded-types)
- [Schema validation with Zod](#schema-validation-with-zod)
- [Typed configuration](#typed-configuration)
- [Trust boundaries and response shapes](#trust-boundaries-and-response-shapes)
- [Project layout](#project-layout)
- [Path aliases](#path-aliases)
- [Barrel files: the cost](#barrel-files-the-cost)
- [Migrating JavaScript to TypeScript](#migrating-javascript-to-typescript)
- [Migrating CommonJS to ESM](#migrating-commonjs-to-esm)

## Result and typed errors

```ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T,>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E,>(error: E): Result<never, E> => ({ ok: false, error });
```

Use it for failures the caller is expected to handle. The type makes the unhappy path impossible to
forget, which is what you want for a case that happens every day.

```ts
async function findUser(id: UserId): Promise<Result<User, "not_found" | "db_unavailable">> {
  ...
}

const result = await findUser(id);
if (!result.ok) {
  return respond(result.error === "not_found" ? 404 : 503);
}
result.value.email;   // narrowed
```

A literal union for `E` beats a string: the caller can `switch` on it exhaustively, and a new failure mode
breaks the build at every handler instead of falling through a generic 500.

Throw for broken invariants and misconfiguration. Threading a `Result` through twelve frames where no
frame can recover adds noise and hides the one place that actually handles it.

Typed error classes, when you do throw:

```ts
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly cause?: unknown,
  ) {
    super(message, { cause });
    this.name = new.target.name;    // survives subclassing, unlike a literal
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`, "NOT_FOUND", 404);
  }
}
```

Two details that bite: set `name` from `new.target.name` so subclasses report themselves correctly, and
pass `{ cause }` so the original stack survives — a re-thrown error without `cause` costs you the actual
failure site.

`instanceof` on a custom Error is unreliable across realms (worker boundaries, bundled duplicates of the
same class, `target: ES5` output). Discriminate on `code` when the error crosses a boundary.

In `catch`, the variable is `unknown`. Narrow it:

```ts
try { ... } catch (e) {
  const message = e instanceof Error ? e.message : String(e);
}
```

## Branded types

Two `string` parameters that mean different things are a swap waiting to happen, and the compiler cannot
see it.

```ts
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };

export function toUserId(raw: string): UserId {
  if (!UUID_RE.test(raw)) throw new AppError(`bad user id: ${raw}`, "BAD_ID", 400);
  return raw as UserId;    // the one earned cast: validation just ran
}

function cancelOrder(order: OrderId, actor: UserId) { ... }
cancelOrder(userId, orderId);   // now a compile error
```

Match the `readonly __brand: "X"` shape rather than inventing a convention, so brands from different
modules read the same. Past a handful of brands, factor the shape into one helper so it cannot drift:

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
```

Brand deliberately, not reflexively. Brand an identifier that could be confused with another identifier,
or a value carrying a validated invariant (`Email`, `PositiveInt`, `SanitizedHtml`). Do not brand a
`durationMs` that nothing else could be mistaken for — the ceremony buys no safety.

The cast inside the constructor is the point: exactly one place holds the `as`, and it sits directly below
the check that earns it. Everything downstream is honest.

## Schema validation with Zod

```ts
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["viewer", "editor", "admin"]),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;   // derived, cannot drift
```

The schema is the source of truth for both the runtime check and the type. Writing an `interface User`
next to this schema creates two truths that both compile while disagreeing.

`parse` vs `safeParse`:

```ts
// parse: a bad value means the program is broken. Fail loudly, at boot.
export const env = EnvSchema.parse(process.env);

// safeParse: a bad value is an expected outcome you must report to a user.
const parsed = CreateUserSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(422).json({
    error: { code: "VALIDATION_ERROR", message: "Invalid user", details: parsed.error.flatten() },
  });
}
const user = await service.create(parsed.data);   // typed and trusted from here
```

Where schemas belong: HTTP handlers, message-queue consumers, webhook receivers, third-party API
responses, config and environment loading, `localStorage` and persisted JSON, and anything from
`postMessage` or IPC.

Where they do not: between two internal functions that share a type. Re-validating there says the types
in between are not trusted, which means they are decoration.

Derive related shapes from the base schema rather than declaring siblings:

```ts
export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });
export const UpdateUserSchema = CreateUserSchema.partial();
```

Sanitization is a transform, so the type says it happened:

```ts
const SafeHtml = z.string().transform((s) => DOMPurify.sanitize(s));
```

Persisted JSON deserves a version field and a `try`/`catch` around the parse — the stored blob was written
by an older version of your code, which is a different trust problem from a network payload.

## Typed configuration

```ts
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
```

`process.env` values are all `string | undefined`, so `z.coerce.number()` is doing real work — without it
`PORT` is the string `"3000"` and `port + 1` is `"30001"`.

Failing at startup rather than at first use is the whole point. A missing `JWT_SECRET` should stop the
deploy, not produce a 500 for the first user who logs in.

Never log the parsed config wholesale — it now holds secrets in a conveniently typed object.

## Trust boundaries and response shapes

```ts
interface User {
  id: UserId;
  email: string;
  passwordHash: string;
  resetToken: string | null;
}

// Allowlist. Adding a sensitive field to `User` cannot leak it.
type PublicUser = Pick<User, "id" | "email">;

// Denylist. Adding `ssn` to `User` leaks it silently.
type PublicUser = Omit<User, "passwordHash" | "resetToken">;
```

Prefer `Pick` on anything crossing a trust boundary: an allowlist fails closed, a denylist fails open.
The failure mode is a data leak introduced by an unrelated commit that nobody reviewed as a security
change.

Types alone do not redact. A `PublicUser`-typed variable that came from `res.json(user)` still serializes
every field, because the type erased at compile time. Write the mapping function and return its result.

```ts
const toPublicUser = ({ id, email }: User): PublicUser => ({ id, email });
```

## Project layout

Group by feature, not by technical kind. `features/users/` keeps everything one change touches together;
`services/`, `types/`, `controllers/` spreads a single feature across four directories, so every change is
a four-file diff and every directory is a merge-conflict hotspot.

```
src/
├── features/
│   └── users/
│       ├── index.ts             # the module's public surface
│       ├── user.schema.ts       # Zod schemas + inferred types
│       ├── user.service.ts      # business logic
│       ├── user.repository.ts   # data access (internal, not exported)
│       └── user.controller.ts   # HTTP boundary — parses input
├── shared/
│   ├── result.ts
│   └── errors.ts
├── infrastructure/              # db, cache, logging clients
└── config/
    └── env.ts
```

The rule that gives this structure its value: **a feature's `index.ts` is its contract.** Export the
service and the types; do not export the repository. If another feature imports
`users/user.repository.ts` directly, the boundary is gone and the two features are one.

## Barrel files: the cost

A feature's `index.ts` re-exporting its public surface is worth it — that is the module boundary. A
project-wide `src/index.ts` that re-exports everything is not, and the costs are easy to miss:

- **Circular imports.** Two features that both import from the root barrel now depend on each other
  through it. The failure is a runtime `undefined` at module-init time, far from the cause.
- **Everything loads.** Importing one helper through a barrel pulls in every module the barrel names, and
  their side effects with them. In a test suite that is measurable startup cost per file.
- **Tree-shaking gets harder.** A bundler can often see through it, but any module with side effects in
  the chain defeats that, and `sideEffects: false` in `package.json` is a claim you may not be able to
  honour.

Rule of thumb: one barrel per feature, exporting that feature's contract. No barrel above that. Deep
imports within your own feature are fine — the boundary exists for other features, not for you.

## Path aliases

```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

No `baseUrl`. `paths` resolves relative to the tsconfig on its own since TypeScript 4.4, and TypeScript 7
removed `baseUrl` outright — a config that still sets it fails to load after the upgrade.

`tsc` resolves aliases for type checking only. The runtime — Node, Vite, Vitest, Jest — needs its own
mapping, or the build type-checks and then fails to start. Configure both, and keep them in sync:

- Vite and Vitest: `resolve.alias`, or the `vite-tsconfig-paths` plugin so one file owns the mapping
- Jest: `moduleNameMapper`
- Plain Node: subpath imports in `package.json` (`"imports": { "#*": "./src/*" }`) work at runtime with no
  extra tooling, which makes them the lower-risk choice for a Node service

One alias is usually enough. Four (`@features/*`, `@shared/*`, `@config/*`, `@/*`) mostly generate
bikeshedding about which to use.

## Migrating JavaScript to TypeScript

Incremental, one reviewable commit at a time.

1. Add TypeScript and a `tsconfig.json` with `allowJs: true`, `checkJs: false`, `strict: true`. Existing
   `.js` files keep working; new `.ts` files are strict from birth.
2. Add `typecheck` to CI immediately, even when it passes trivially. A check added later never catches the
   regressions from the migration itself.
3. Convert **leaf modules first** — a file with no local imports has no type surface to negotiate. Utility
   and constants files are the cheapest wins and unblock everything above them.
4. Per file: rename, fix the errors the compiler reports, run the tests. Do not refactor in the same
   commit. A rename plus a refactor is a diff nobody can review.
5. `any` at the seams is acceptable and temporary. `any` in the domain model is the thing you were trying
   to escape. Track the seams with a `// TODO(ts-migration)` marker you can grep.
6. Turn on one strict flag at a time, each in its own commit. `noUncheckedIndexedAccess` in particular
   will produce hundreds of errors in a mature codebase.

JSDoc buys type checking in a file you are not ready to rename — useful for a large module you want
covered before touching:

```js
/**
 * @param {string} name
 * @param {number} age
 * @returns {import("./types").User}
 */
function createUser(name, age) { ... }
```

Flip `checkJs: true` per file with `// @ts-check` at the top, so the noise arrives on your schedule.

## Migrating CommonJS to ESM

```json
{
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }
}
```

The parts that actually break:

- **Relative imports need file extensions** under Node ESM: `./user.js`, not `./user`. In TypeScript
  source you still write `.js`, because that is what the emitted file resolves to.
- **`__dirname` and `__filename` do not exist.** Use `import.meta.dirname` (Node 20.11+) or
  `fileURLToPath(import.meta.url)`.
- **`require` of an ESM-only package fails.** Node 22.12+ can `require()` a synchronous ESM graph, but
  do not rely on it in a library that supports older runtimes.
- **JSON imports need an attribute**: `import pkg from "./package.json" with { type: "json" }`.
- **`verbatimModuleSyntax`** makes import elision explicit, so a type-only import must say `import type`.
  Turn it on during the migration, not after — it surfaces the ambiguous imports while you are already
  looking at them.

Test runners are the usual sticking point. Vitest handles ESM natively; Jest needs
`--experimental-vm-modules` or a transform. Decide before converting, not after CI turns red.
