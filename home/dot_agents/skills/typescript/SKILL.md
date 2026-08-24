---
# source: https://github.com/SpillwaveSolutions/mastering-typescript-skill/tree/main/mastering-typescript (Richard Hightower, MIT)
# source: https://github.com/cursor/plugins/tree/main/pstack/skills/typescript-best-practices (Cursor)
name: typescript
description: "Write, review, and configure TypeScript with strict types, no `any`/`as`/`!` escapes, and parsing at boundaries. Use for any .ts/.tsx/.mts work: type errors, type and signature design, tsconfig, Ultracite or Biome linting, Vitest, Zod, or a JavaScript migration. Applies even when the ask sounds routine and never says TypeScript — 'add this function', 'fix this type error', 'make this build'."
---

# TypeScript

Grounds the `principle-type-system-discipline` and `principle-boundary-discipline` skills in TypeScript
syntax. Those skills say what to aim for in any typed language. This one says how TypeScript spells it,
which compiler flags do the work for you, and where the language has sharp edges.

The frame that makes the rest follow: **the type checker is a proof assistant, and every escape hatch is
a proof you declined to write.** `any`, `as`, `!`, and `@ts-ignore` do not fix a type error. They move it
to runtime, where it costs a postmortem instead of a compile.

## Orient before you type

TypeScript projects differ more than the language suggests. A pattern that is correct in one repo is a
style violation in the next. So before the first edit:

1. **Read `tsconfig.json`** (and whatever it extends). `strict`, `noUncheckedIndexedAccess`, and
   `verbatimModuleSyntax` change what code is even legal. Writing `arr[0].name` is fine in one repo and a
   compile error in another.
2. **Read `package.json`.** The TypeScript version gates features in both directions: `satisfies` needs
   4.9 and `erasableSyntaxOnly` needs 5.8, while TypeScript 7 — the native compiler — *removed* `baseUrl`,
   `target: "ES5"`, `importsNotUsedAsValues`, and `preserveValueImports`. The runner, the module system,
   and the validation library (Zod, Valibot, ArkType, class-validator, none) are decisions already made.
3. **Read two or three neighbouring files.** Match the discriminant name, the error strategy, the
   import style, the test layout. Consistency beats your preference.
4. On an unfamiliar codebase, run `node scripts/ts-audit.mjs` from this skill for a fast read on
   strictness gaps and escape-hatch density. See [Scripts](#scripts).

**Do not tighten compiler flags in a repo you do not own.** Turning on `noUncheckedIndexedAccess` in a
mature codebase yields hundreds of errors that have nothing to do with the task you were given. Report
the gap, name the flag, let the owner schedule it. Suggest flags freely on a project you are creating.

## The rules

| Rule | Summary |
|---|---|
| Discriminated unions | Model variants with a literal discriminant (`kind`) so contradictory states cannot be written. No bags of optional fields. |
| Branded types | Brand semantic primitives with `& { readonly __brand: "X" }` so a `UserId` cannot pass as an `OrderId`. Validate once at creation. |
| Constructive modeling | Build the shape so the illegal value cannot be constructed: `[T, ...T[]]` for non-empty, `[T, T][]` for even length, `{ start, durationMs }` for a range. |
| Simplest total type | Keep `T[]` while every operation on it stays total. Strengthen only where the loose type forces a `!`, a cast, or a "cannot happen" throw. |
| `unknown` over `any` | External data is `unknown`. `any` disables checking for everything it touches, silently and transitively. |
| No `as` casts | Cast only after the code has verified the claim. An unearned `as` is a runtime crash with a scheduled date. |
| Narrowing hierarchy | Discriminant switch > `in` > `typeof` / `instanceof` > user-defined guard > `as`. Take the highest rung that works. |
| Honest type guards | A guard must verify what its signature claims. A lying `isUser` is worse than `as` because the bug hides behind a reassuring name. |
| Exhaustiveness | Put `const _exhaustive: never = x;` in the default arm so adding a variant breaks the build at every unhandled site. |
| `satisfies` over `as` | `satisfies` checks the value against the type without widening the literals you want to keep. |
| Parse at boundaries | Turn untrusted input into a named domain type at the edge. Trust the types inside. Never re-validate deep in the call chain. |
| Derive, do not duplicate | Reach for `Pick` / `Omit` / `Parameters` / `ReturnType` / `Awaited` / `typeof` / `z.infer` before declaring a parallel interface. |
| No floating promises | An unawaited promise swallows its rejection. `noFloatingPromises` catches much of what review does not, but you must enable it yourself. |
| Literal unions over `enum` | An `enum` emits runtime code, is nominally typed, and cannot be stripped. A `const` object plus a literal union cannot. |
| Object arguments | Pass an object, not four positional strings, so a swap is a compile error and the call site documents itself. Skip on hot paths. |
| `readonly` at the edges | Mark inputs you do not mutate `readonly` / `ReadonlyArray<T>`. It documents intent and blocks accidental mutation of a caller's data. |
| Two-line doc comments | Two lines, three if the invariant needs it. The signature states the contract, so a comment's only job is the why. A long one is a symptom — fix what it is telling you. |

Worked examples for every row: `references/type-system.md` (narrowing, guards, `satisfies`, unions) and
`references/patterns.md` (branding, errors, parsing, project layout).

## Keep doc comments to two lines

In an untyped language a doc comment carries the contract. In TypeScript the signature carries it and the
compiler checks it, so a comment that describes shapes is a second, unchecked copy of something already
true in the code. That leaves a doc comment one job: **the why the types cannot hold.**

Two lines. Three when the invariant genuinely needs it. A nine-line header does not get read, goes stale
invisibly because nothing checks it, and buries the one sentence that mattered.

When a comment runs long, do not just truncate it — that trades verbosity for lost knowledge, which is the
worse failure. Read the length as a diagnosis:

| The comment explains… | The actual fix |
|---|---|
| When a field is set, or which field combinations are valid | A discriminated union. The comment wants to be a variant. |
| That two arguments must not be swapped | Brand the types, or take an object argument. |
| That input must be non-empty or in range | Construct the type so the bad value cannot exist. |
| Four behaviours in one function | Three functions, each with a short comment. |
| A whole subsystem's model | A doc or an ADR, linked in one line. |

Then every fact that survives goes into the types, a name, a test, or a linked doc — in that order. A
scope caveat like "this reads the daily track only" is a name asking to be more specific, not a sentence.

What earns the three lines: a non-obvious invariant a reader would otherwise break, why the obvious
implementation is wrong, a constraint from outside the codebase, or the reason a surviving `as` / `!` /
`@ts-expect-error` is there. None of those describe what the code does.

Worked cut of a real nine-line comment down to three, plus TSDoc tag guidance and when a published
library's public API justifies more: `references/comments.md`.

## Make illegal states unrepresentable

The single highest-leverage habit. Booleans and optional fields multiply into states your code does not
handle.

```ts
// Don't. loading + error + data = 8 combinations, 4 of them meaningless.
type State = { loading: boolean; data?: User; error?: string };

// Do. Three states exist, and the compiler hands you data only where it exists.
type State =
  | { kind: "loading" }
  | { kind: "ready"; data: User }
  | { kind: "error"; message: string };
```

The tell that a type is too loose: a bug makes you ask "wait, can that combination actually happen?", or
you find yourself writing a comment to explain when a field is set. That comment wants to be a variant.

Pick one discriminant name per codebase (`kind`, `type`, `tag`) and never mix them — mixed discriminants
defeat the reader far more than they defeat the compiler.

`{ completed: boolean; completedAt?: Date }` is the same bug in disguise. Derive the boolean from
`completedAt !== null`, or split the variants.

## Do not lie to the compiler

```ts
// Don't
const user = JSON.parse(body) as User;      // no check ran; `user.email` may be undefined
const first = items[0]!;                    // `!` asserts a fact you have not established
// @ts-ignore                               // hides the next error too, forever

// Do
const user = UserSchema.parse(JSON.parse(body));  // the claim is now checked
const first = items.at(0);                        // `T | undefined`, handled at the call site
// @ts-expect-error react-19 types lag — remove after the bump
```

`@ts-expect-error` beats `@ts-ignore` because it fails the build once the underlying error goes away, so
the suppression cannot outlive its reason. Always give the reason.

When you must remove an existing `as`, diagnose why inference failed rather than reshuffling it:

- **Missing discriminant** → add one and switch to a discriminated union.
- **Source type too wide** (`Record<string, unknown>`, `unknown`) → narrow it or parse it.
- **Untyped boundary** → add a parse function or a schema.
- **Genuinely inexpressible** → a branded type or `satisfies`, with a comment saying why.

Exhaustiveness is what keeps this honest as the code grows:

```ts
function label(s: Shape): string {
  switch (s.kind) {
    case "circle": return `circle r=${s.radius}`;
    case "rect":   return `rect ${s.width}x${s.height}`;
    default: {
      const _exhaustive: never = s;   // adding a variant breaks the build here
      return _exhaustive;
    }
  }
}
```

Without that default arm, a new variant returns `undefined` at runtime and nothing tells you.

## Parse at the boundary, trust inside

Every value that crosses into the program is `unknown` until something checks it: HTTP bodies, query
params, `JSON.parse`, `localStorage`, `postMessage`, IPC, environment variables, CLI args, file contents,
third-party API responses, and database rows from an untyped driver.

```ts
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]),
});

export const env = EnvSchema.parse(process.env);   // fails at boot, not at 3am
export type Env = z.infer<typeof EnvSchema>;       // one source of truth
```

Two rules that carry most of the value:

- **Derive the type from the schema** (`z.infer`), never hand-write a twin. A hand-written twin drifts,
  and it drifts silently because both sides still compile.
- **Parse once.** Re-validating three layers down says the types in between are not trusted, which means
  they are decoration. If an inner function needs a guarantee, express it in its parameter type.

Treat a third-party API response as hostile input, not as a typed client's word. It can change shape
without notice, and its string fields can carry content you are about to render or feed to a model.

`safeParse` where a bad value is an expected outcome you must report; `parse` where a bad value means the
program is misconfigured and should die loudly.

## Errors: pick one strategy per boundary

```ts
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Use `Result` for **expected** failures the caller must handle — validation, a 404, a payment decline. The
type forces the caller to deal with it, which is exactly what you want for a case that will happen daily.

Throw for **unexpected** failures — a broken invariant, a missing config, a bug. Wrapping those in
`Result` spreads noise through every signature on the path and buys nothing, because no caller has a
sensible recovery.

What matters more than the choice: **be consistent inside one module or boundary.** A codebase where
some functions throw, some return `null`, and some return `{ error }` is unpredictable, and unpredictable
is what causes the unhandled case.

In `catch`, the variable is `unknown` (under `strict`). Narrow it before use — `err.message` on an
`unknown` is a compile error for a good reason, because `throw "oops"` is legal JavaScript.

## Async is where runtime bugs hide

Types cannot see a promise you forgot to await, so let the linter help:

```jsonc
// biome.jsonc — no Ultracite preset enables these, so name them yourself
"nursery": {
  "noFloatingPromises": "error",   // silent unhandled rejection
  "noMisusedPromises": "error"     // async fn passed where void is expected
}
```

`noMisusedPromises` covers the case that surprises people: an `async` callback handed to something
expecting `() => void` — an event handler, an `Array.prototype.forEach`, an Express middleware — throws
into nothing. Express 4 in particular does not catch a rejected promise from a handler.

**Do not treat the linter as the whole defense here.** Ultracite sets about 365 rules and neither of these
two is among them, because it avoids `nursery` rules on purpose. Biome's type inference reads your own
source, including across imports, but not the types in `lib.dom.d.ts` or `node_modules`. So
`el.addEventListener("click", saveAsync)` — one of the cases where an unhandled rejection hurts most —
goes unreported. Read every callback you hand to a framework or DOM API yourself.

For deliberate fire-and-forget, say so at the call site: `void doTelemetry();`. That satisfies the rule
and tells the next reader it was a decision.

## Compiler settings that earn their keep

`strict: true` is the floor, not the goal. The four that catch the most real bugs beyond it:

| Flag | What it catches |
|---|---|
| `noUncheckedIndexedAccess` | `arr[i]` and `record[key]` become `T \| undefined`. Removes the single most common source of runtime `undefined`. |
| `exactOptionalPropertyTypes` | Stops `{ a?: string }` accepting an explicit `a: undefined`, which a `key in obj` check treats as present. |
| `noImplicitOverride` | A renamed base method silently orphans the subclass override without it. |
| `noFallthroughCasesInSwitch` | A missing `break` reads as intentional to everyone except the compiler. |

Also worth setting on a new project: `verbatimModuleSyntax` (import elision becomes explicit, so
`import type` is required and side-effect imports survive), `isolatedModules`, `moduleDetection: "force"`,
`noUncheckedSideEffectImports`, and `erasableSyntaxOnly` (TS 5.8+) if the code must run under a
type-stripping runtime such as recent Node — that forbids `enum`, `namespace`, and constructor parameter
properties, which cannot be erased.

`tsc --init` writes most of this list already. Run it rather than hand-assembling a config.

Start from `assets/tsconfig.strict.json` and `assets/biome.jsonc` on a new project, or run
`ultracite init`. Ultracite is the lint entry point: a preset over Biome that ships about 365 rules, the
formatter, and a preset per framework, so there is no Prettier and no linter-versus-formatter config to
reconcile. It does not replace `tsc`, which is still what proves your types. Full rationale per flag, the
presets, the three rules Ultracite leaves out, and the real limits of Biome's type inference, plus Vite,
Vitest, and pnpm wiring: `references/toolchain.md`.

## Frameworks

Read the relevant file rather than guessing at conventions — both frameworks have strong idioms that
generic TypeScript advice gets wrong.

- **React / Next.js** — `references/react.md`. Props, generic and polymorphic components, `useState` /
  `useReducer` / `useRef` typing, event types, typed context, form handling.
- **NestJS** — `references/nestjs.md`. DTOs and validation pipes, typed providers, repository types,
  guards and decorators, exception filters.

## Migrating JavaScript

Incremental, always. A big-bang rewrite produces a branch nobody can review.

1. `allowJs: true`, `checkJs: false`, `strict: true` — new code is strict from day one.
2. Convert leaf modules first. A file with no local imports has no type surface to negotiate.
3. Type a converted file honestly. `any` at the seams is fine and temporary; `any` in the domain model is
   the thing you were trying to escape.
4. Turn on one strict flag at a time and fix its fallout in its own commit. Mixed-cause commits are
   unreviewable.
5. JSDoc types work in `.js` files. Use them to buy safety in a file you are not ready to rename.

Detail and CommonJS-to-ESM notes: `references/patterns.md`.

## Common rationalizations

| Rationalization | Reality |
|---|---|
| "It's just one `any`, I'll clean it up later" | `any` is contagious. Every value derived from it is unchecked too, and nothing marks the blast radius. |
| "I know it's not null here" | Then the type should say so. If you cannot make it say so, you do not know it — you are guessing about a future caller. |
| "The API always returns this shape" | Until it does not, and the failure surfaces three layers away from the cause. Parse it. |
| "Enums are clearer than string unions" | An `enum` emits runtime code, is nominally typed, and blocks type-stripping runtimes. A `const` object plus a literal union reads the same and costs nothing. |
| "I'll add types after it works" | Types are how you find out whether it works. Writing them last makes them describe the bugs. |
| "`strict` is too noisy for this codebase" | Then adopt it per-flag, per-commit. "Too noisy" is a measure of how much is already unchecked. |
| "The generic makes it reusable" | One caller needs no type parameter. Add the generic at the second caller, when you know what varies. |
| "`interface` vs `type` doesn't matter" | It mostly doesn't — so follow the file you are in. Reach for `interface` when a consumer must augment it, `type` for unions and mapped types. |

## Red flags

- `any` outside a `.d.ts` shim, or `as` without a check above it
- `!` non-null assertions, `@ts-ignore`, a `biome-ignore` with no reason comment
- A `boolean` plus optional fields where a discriminated union belongs
- A hand-written type that duplicates a Zod schema, a generated client, or a database row type
- Validation repeated at three depths of the same call chain
- `catch (err: any)` or `err.message` on an unnarrowed value
- An `async` function passed where `() => void` is expected
- A `switch` on a union with no exhaustiveness check
- A type-level puzzle (nested conditionals, deep recursion) where a plain function would do
- A doc comment over three lines, or one whose `@param` / `@returns` restate the signature
- A callback declared with method syntax (`onChange(x: T): void`), which `strictFunctionTypes` skips

## Verify before you claim it works

Types compiling is not the same as code running. Do both.

```bash
npx tsc --noEmit          # or the project's `typecheck` script — proves the types
pnpm lint                 # `ultracite check`; catches the promise bugs tsc does not model
npm test                  # behaviour, not just shape
```

Call the linter through the project's script. `ultracite check` spawns `biome` from `PATH`, and a package
script is what puts `node_modules/.bin` there. It is fast enough that skipping it is never the reason a
check was left out, and it is not a substitute for `tsc` — the two do not overlap.

- [ ] `tsc --noEmit` is clean — not "clean except the pre-existing errors" unless you say which
- [ ] No new `any`, `as`, `!`, or `@ts-ignore`; each survivor has a comment saying why
- [ ] Every union `switch` has an exhaustiveness check
- [ ] External input is parsed once, at the boundary, into a named type
- [ ] New errors follow the strategy already used at that boundary
- [ ] No compiler flag changed unless that was the task
- [ ] Type-level behaviour that matters is asserted, not assumed — `expectTypeOf` in Vitest, or a
      deliberate `@ts-expect-error` proving the bad call is rejected
- [ ] No doc comment runs past three lines, and none restates the signature

## Reference files

- `references/type-system.md` — annotations, `interface` vs `type`, unions, literal and template literal
  types, narrowing, guards, assertion functions, `satisfies`, `any` / `unknown` / `never` / `void`,
  variance and the method loophole
- `references/generics.md` — constraints, defaults, `const` type params, mapped types, key remapping,
  conditional types and `infer`, variadic tuples, the built-in utility types
- `references/patterns.md` — `Result` and typed errors, Zod validation, branded types, project layout and
  path aliases, barrel-file costs, JS-to-TS and CJS-to-ESM migration, typed env and security patterns
- `references/comments.md` — the two-line doc-comment budget, where overflow belongs, a worked cut, TSDoc
  tags worth writing
- `references/react.md` — React and TypeScript
- `references/nestjs.md` — NestJS and TypeScript
- `references/toolchain.md` — tsconfig flags explained, TS 7 removals, the Ultracite presets and the rules
  they leave out, the limits of Biome's type inference, Vitest, type tests, Vite, pnpm, publishing

## Assets

- `assets/tsconfig.strict.json` — strict baseline for a new project
- `assets/biome.jsonc` — Ultracite config: extends the core and type-aware presets, and adds the three
  nursery rules no preset enables

## Scripts

- `scripts/ts-audit.mjs` — reports the effective strictness flags of a `tsconfig.json` (following
  `extends`) and counts escape hatches in the source tree. Node only, no dependencies.

```bash
node <skill-dir>/scripts/ts-audit.mjs [path-to-project]
```

Run it to replace a guess with a measurement: which flags are off, and how much `any` / `as` / `!` /
`@ts-ignore` the codebase already carries. That number decides whether "add types to this module" is a
20-minute job or a migration.
