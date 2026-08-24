# Type system reference

Companion to `SKILL.md`. Read the section you need.

- [Annotate, or let inference work](#annotate-or-let-inference-work)
- [`interface` vs `type`](#interface-vs-type)
- [Unions and intersections](#unions-and-intersections)
- [Literal and template literal types](#literal-and-template-literal-types)
- [Narrowing](#narrowing)
- [Type guards](#type-guards)
- [Assertion functions](#assertion-functions)
- [`satisfies`](#satisfies)
- [`any`, `unknown`, `never`, `void`](#any-unknown-never-void)
- [`readonly` and `as const`](#readonly-and-as-const)
- [Function types and overloads](#function-types-and-overloads)
- [Variance, and the method loophole](#variance-and-the-method-loophole)
- [Instead of `enum`](#instead-of-enum)

## Annotate, or let inference work

Annotate what other code depends on. Let inference handle the rest.

```ts
// Annotate: the exported signature is a contract, and inference would leak internals
export function findUser(id: UserId): Promise<User | undefined> { ... }

// Don't annotate: the annotation adds nothing and drifts
const count: number = items.length;
const names: string[] = users.map((u) => u.name);
```

Return-type annotations on exported functions are worth the keystrokes: they stop an accidental widening
(a refactor that starts returning `any` from a helper is caught at the function, not at its callers), and
they make the compiler check the body against your intent instead of inferring your mistake.

Inside a function, prefer inference. An annotation on every local is noise that goes stale.

One exception worth knowing: annotate an empty array or an accumulator, because inference gives you
`never[]` or `{}`.

```ts
const errors: string[] = [];        // without the annotation: never[]
```

## `interface` vs `type`

The practical difference is small, so **follow the file you are editing**. When you are choosing fresh:

| Use | For |
|---|---|
| `interface` | Object shapes a consumer may need to augment (declaration merging), class contracts (`implements`), public API surfaces |
| `type` | Unions, intersections, mapped types, conditional types, tuples, function types, anything not a plain object |

```ts
interface User {
  id: UserId;
  email: string;
}

type UserRole = "viewer" | "editor" | "admin";
type UserWithRole = User & { role: UserRole };
```

`interface` supports declaration merging, which is a feature for a library extension point and a hazard
everywhere else — two declarations of the same name silently combine. `type` errors on the duplicate,
which is usually what you want.

## Unions and intersections

```ts
type Id = string | number;                    // one of
type Employee = Person & { employeeId: string };  // all of
```

A union of object types is only useful if you can tell the members apart. That is what a discriminant is
for — see `SKILL.md`. Without one you end up with `in` checks scattered across the codebase, each of them
a place a new variant can be missed.

Intersecting two object types with conflicting property types gives you `never` for that property, not an
error at the declaration. The failure surfaces at the assignment, far from the cause.

## Literal and template literal types

Literal types turn a string parameter into a closed set the compiler checks and the editor completes.

```ts
type Status = "pending" | "approved" | "rejected";
type Port = 80 | 443 | 8080;

function setStatus(s: Status) { ... }
setStatus("aproved");   // caught at compile time, not in a support ticket
```

Template literal types compose them:

```ts
type Method = "get" | "post";
type Route = `/api/${string}`;
type Endpoint = `${Uppercase<Method>} ${Route}`;   // "GET /api/users" | "POST /api/..."

type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickHandler = EventName<"click">;            // "onClick"
```

`Uppercase`, `Lowercase`, `Capitalize`, and `Uncapitalize` are built in. They are useful for deriving one
naming convention from another (a snake_case wire format from a camelCase model, say) without writing the
second list by hand — and a derived list cannot drift.

Do not go further than the problem needs. A template literal type that parses a URL is impressive and
unmaintainable. Parse the URL at runtime and return a typed object.

## Narrowing

The hierarchy from `SKILL.md`, with the syntax for each rung.

**1. Discriminant.** The compiler does the work, and exhaustiveness is checkable.

```ts
switch (shape.kind) {
  case "circle": return Math.PI * shape.radius ** 2;   // radius exists here
  case "rect":   return shape.width * shape.height;
}
```

**2. `in`.** Narrows to the union members that declare the key.

```ts
if ("radius" in shape) return Math.PI * shape.radius ** 2;
```

**3. `typeof` and `instanceof`.** For primitives and class instances.

```ts
function fmt(v: string | number | Date): string {
  if (typeof v === "string") return v.trim();
  if (v instanceof Date) return v.toISOString();
  return v.toFixed(2);
}
```

`typeof null === "object"` — the JavaScript wart the compiler cannot save you from. Check `!== null`
explicitly before treating a value as an object.

**4. Truthiness and equality.** Cheap and effective, with one trap:

```ts
if (count) { ... }        // excludes 0 and "" as well as null/undefined
if (count != null) { ... }  // excludes only null and undefined — usually what you meant
```

**5. Discriminated returns.** `Array.isArray`, `Number.isInteger`, and friends carry predicate signatures.

Since TypeScript 5.5, a function that plainly returns a boolean expression gets an inferred type
predicate, so a small helper narrows without an explicit `x is T`:

```ts
const isDefined = <T,>(x: T | undefined) => x !== undefined;
const defined = values.filter(isDefined);   // T[], no annotation needed
```

## Type guards

Write one when the rungs above cannot express the check. It must actually verify the claim: a guard whose
body does not prove its signature is worse than `as`, because the lie now has a trustworthy name and
propagates to every caller.

```ts
// Honest
function isCircle(s: Shape): s is Extract<Shape, { kind: "circle" }> {
  return s.kind === "circle";
}

// A lie. Compiles, narrows, and is wrong for `{}`.
function isUser(v: unknown): v is User {
  return typeof v === "object";
}
```

For validating unknown input, prefer a schema library over a hand-written guard. A hand-written guard for
a ten-field object is ten chances to forget a field, and nothing checks it against the type.

```ts
// Do this instead of a hand-rolled `isUser`
const UserSchema = z.object({ id: z.string().uuid(), email: z.string().email() });
type User = z.infer<typeof UserSchema>;
```

Name guards `isX` or `hasX`. Anything else reads as a normal predicate and the narrowing surprises the
reader.

## Assertion functions

An assertion signature narrows for the rest of the scope instead of inside a block. Useful for invariants
and preconditions.

```ts
function assertDefined<T>(v: T | null | undefined, label: string): asserts v is T {
  if (v == null) throw new Error(`${label} is required`);
}

const user = users.get(id);
assertDefined(user, "user");
user.email;     // narrowed from here on
```

Two constraints the compiler enforces loosely and you must respect: an assertion function must be
annotated explicitly (inference will not produce an `asserts` signature), and it must be called on a
`const` or `readonly` binding for the narrowing to survive.

Prefer strengthening the input type over asserting at the top of a function. An `assertDefined` on the
first line of a function usually means the parameter should not have been optional.

## `satisfies`

`satisfies` checks a value against a type without widening it to that type.

```ts
type Config = Record<string, string | number>;

const a = { theme: "dark", cols: 3 } as Config;
a.theme;              // string | number — the literal is gone, and `a.missing` also type-checks

const b = { theme: "dark", cols: 3 } satisfies Config;
b.theme;              // "dark" — literal preserved, and `b.missing` is an error
```

Where it earns its place:

```ts
// Route table: keys stay literal, so a typo in a lookup is caught
const routes = {
  home: "/",
  user: "/users/:id",
} satisfies Record<string, `/${string}`>;

type RouteName = keyof typeof routes;   // "home" | "user", derived not duplicated
```

Rule of thumb: `satisfies` when you want the check *and* the specific type; a plain annotation when you
want the general type; `as` almost never.

## `any`, `unknown`, `never`, `void`

```ts
let a: any;        // opts out of checking, transitively, for everything derived from it
let u: unknown;    // accepts anything, permits nothing until narrowed
```

`unknown` is the correct type for external input. The compiler then forces the narrowing you were going
to skip.

```ts
function handle(input: unknown) {
  input.foo;                                  // error, correctly
  if (typeof input === "object" && input !== null && "foo" in input) {
    input.foo;                                // allowed
  }
}
```

`never` is the empty type: no value has it. Two everyday uses:

```ts
function fail(msg: string): never { throw new Error(msg); }   // never returns

default: {
  const _exhaustive: never = value;   // errors if `value` can still be something
}
```

`never` also disappears from unions (`string | never` is `string`), which is what makes `Exclude` and
conditional-type filtering work.

`void` means "the return value is not meaningful", not "returns undefined". That distinction matters at
callbacks: a `() => void` parameter accepts a function that returns something, which is why
`arr.forEach(async () => ...)` compiles and then drops your rejections. See the async section of
`SKILL.md`.

## `readonly` and `as const`

```ts
function total(items: readonly Item[]): number { ... }   // cannot sort/push the caller's array
```

`readonly` on a parameter is a cheap, honest signal: this function does not mutate what you gave it.
It also prevents the classic bug where an in-place `.sort()` reorders data the caller still needs.

`readonly` is shallow. `readonly User[]` still lets you write `users[0].email = "..."`. Use
`ReadonlyArray<Readonly<User>>` or a deep-readonly type when it matters, and do not pretend otherwise.

```ts
const STATUSES = ["pending", "approved"] as const;
type Status = (typeof STATUSES)[number];        // "pending" | "approved"
```

That pattern gives you one list usable at both runtime (iterate it, render it) and type level. Two
parallel declarations — an array and a union — drift.

## Function types and overloads

Prefer a union parameter with narrowing over overloads. Overloads are a separate declaration surface: the
implementation signature is not checked against them the way you would hope, so they can lie.

```ts
// Prefer
function parse(input: string | Buffer): Doc {
  const text = typeof input === "string" ? input : input.toString("utf8");
  ...
}
```

Reach for overloads when the return type genuinely depends on the argument type and a conditional type
would be worse to read:

```ts
function query(sql: string, one: true): Promise<Row>;
function query(sql: string, one?: false): Promise<Row[]>;
function query(sql: string, one = false): Promise<Row | Row[]> { ... }
```

Order overloads most specific first — resolution picks the first match, not the best one.

## Variance, and the method loophole

You rarely need the vocabulary, but you do need the one rule it produces.

A function that **returns** `T` is substitutable where a function returning a supertype is expected — a
`() => Dog` works as a `() => Animal`. A function that **takes** `T` goes the other way: a handler that
accepts any `Animal` is safe where an `Animal`-specific handler is wanted, but a handler that needs a
`Dog` is not, because it will be handed cats. `strictFunctionTypes` is the flag that checks this, and it
is on under `strict`.

Except it is not checked for methods:

```ts
const takesDog = (d: Dog): void => { void d.breed; };

// Property syntax — checked. This is an error, correctly.
const a: { handle: (x: Animal) => void } = { handle: takesDog };

// Method syntax — the same unsound assignment, accepted silently.
const b: { handle(x: Animal): void } = { handle: takesDog };
```

Method parameters stay bivariant on purpose: `Array<T>` methods would be unusable otherwise. But the
loophole applies to *every* method declaration, including your own callbacks, and it survives
`strict: true`.

So: **declare callbacks and handlers with property syntax.** It costs one character and buys the check.

```ts
// Do
interface Store { onChange: (next: State) => void }

// Don't — the parameter type is now unchecked
interface Store { onChange(next: State): void }
```

Keep method syntax for actual methods on classes and interfaces meant to be implemented, where you want
the bivariance and overload merging. The distinction is only about function-valued *properties*.

The other hole is mutable properties, and it goes the opposite way from what you might expect. A sound
type system would treat `Box<T>` as invariant; TypeScript checks properties covariantly and accepts the
assignment, which means the write that follows is unchecked:

```ts
interface Box<T> { value: T }

const asAnimal: Box<Animal> = dogBox;      // accepted — properties are covariant
asAnimal.value = someAnimal;               // accepted — a plain Animal is now in a Box<Dog>
const breed: string = dogBox.value.breed;  // typed string, undefined at runtime
```

No flag turns that off. Marking the field `readonly` does not change assignability — it was already
allowed — but it blocks the write that makes it unsound, which is the part you can control. So a generic
container that is only ever read should say so.

## Instead of `enum`

```ts
// Don't. Emits runtime code, is nominally typed, and cannot be erased by a
// type-stripping runtime (so `erasableSyntaxOnly` rejects it).
enum Status { Pending = "pending", Approved = "approved" }

// Do. Same ergonomics, zero runtime cost beyond the object you asked for.
const Status = {
  Pending: "pending",
  Approved: "approved",
} as const;
type Status = (typeof Status)[keyof typeof Status];
```

If you only need the values and never the named constants, the literal union alone is enough — do not
build the object for nothing.

Numeric `enum`s are worse still: they accept any `number` at assignment in older TypeScript versions, and
their reverse mapping puts values in the object that were never declared.
