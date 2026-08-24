# Generics reference

Companion to `SKILL.md`. Read the section you need.

- [When a generic is the right tool](#when-a-generic-is-the-right-tool)
- [Constraints and defaults](#constraints-and-defaults)
- [`const` type parameters](#const-type-parameters)
- [Utility types](#utility-types)
- [Mapped types](#mapped-types)
- [Key remapping](#key-remapping)
- [Conditional types and `infer`](#conditional-types-and-infer)
- [Variadic tuples](#variadic-tuples)
- [Knowing when to stop](#knowing-when-to-stop)

## When a generic is the right tool

A type parameter exists to **relate** two positions in a signature. If it appears once, it is doing
nothing a plain type would not do.

```ts
// Pointless: T appears once, so this is `(x: unknown) => void`
function log<T>(x: T): void { console.log(x); }

// Earns it: the return type is tied to the argument type
function first<T>(items: T[]): T | undefined { return items[0]; }

// Earns it: two positions, related
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
```

Add the type parameter at the second caller, when you know what varies. Adding it at the first is a guess,
and the guess usually names the wrong axis of variation.

## Constraints and defaults

```ts
interface HasLength { length: number }

function longest<T extends HasLength>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("hi", "there");   // ok
longest(1, 2);            // error: number has no length
```

`keyof` constraints are what make property access safe:

```ts
function pick<T, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>;
}

pick(user, ["id", "email"]);   // { id: ...; email: ... }
pick(user, ["emial"]);         // error: not a key of User
```

Defaults keep a generic out of the caller's way when the common case is one type:

```ts
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
}
```

Prefer a default of `unknown` over `any`, so an un-parameterized use still forces narrowing.

## `const` type parameters

TypeScript 5.0+. `const T` infers the literal types from an argument without the caller writing
`as const`, which removes a papercut from list-shaped APIs.

```ts
function pickOne<const T extends readonly string[]>(opts: T): T[number] { ... }

pickOne(["a", "b"]);   // returns "a" | "b", not string
```

Without `const`, the caller has to remember `["a", "b"] as const` at every call site, and forgetting it
degrades the result to `string` silently.

## Utility types

Reach for these before declaring a new interface. A derived type cannot drift from its source; a
hand-written twin will.

| Type | Purpose |
|---|---|
| `Partial<T>` | All properties optional — patch and update inputs |
| `Required<T>` | All properties required — a resolved config from an optional one |
| `Readonly<T>` | All properties readonly (shallow) |
| `Pick<T, K>` | Keep the named properties |
| `Omit<T, K>` | Drop the named properties — `Omit<User, "passwordHash">` for an API response |
| `Record<K, V>` | Object with typed keys and values |
| `Exclude<T, U>` / `Extract<T, U>` | Filter a union |
| `NonNullable<T>` | Drop `null` and `undefined` |
| `ReturnType<F>` / `Parameters<F>` | Derive from an existing function |
| `Awaited<T>` | Unwrap a promise, recursively |
| `NoInfer<T>` | Block inference from this position (TS 5.4+), so another position decides |

```ts
type CreateUserInput = Omit<User, "id" | "createdAt">;   // one source of truth
type UpdateUserInput = Partial<CreateUserInput>;
type PublicUser = Omit<User, "passwordHash" | "resetToken">;
```

`Omit` on a sensitive field is a documentation habit worth adopting: the day someone adds `ssn` to
`User`, an `Omit`-based response type leaks it, while a `Pick`-based one does not. Prefer `Pick` for
anything that crosses a trust boundary — allowlists fail closed, denylists fail open.

## Mapped types

```ts
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };        // strips optionality
```

The `-` prefix removes a modifier; `+` (implicit) adds one. `-?` is how `Required` is built.

A deep variant, useful for config and frozen state:

```ts
type DeepReadonly<T> = T extends (infer E)[]
  ? readonly DeepReadonly<E>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

Watch the recursion depth. A deep mapped type over a large generated schema is a measurable compile-time
cost, and the errors it produces are unreadable. If a type slows the editor, that is data — simplify it.

## Key remapping

The `as` clause in a mapped type renames keys.

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person { name: string; age: number }
type PersonGetters = Getters<Person>;   // { getName: () => string; getAge: () => number }
```

Mapping a key to `never` removes it, which is how you filter by value type:

```ts
type StringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
```

## Conditional types and `infer`

```ts
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type Unwrap<T> = T extends Promise<infer R> ? R : T;

type A = ElementOf<string[]>;      // string
type B = Unwrap<Promise<User>>;    // User
```

Conditional types over a naked type parameter **distribute** across unions, which is the behaviour behind
`Exclude`:

```ts
type ToArray<T> = T extends unknown ? T[] : never;
type X = ToArray<string | number>;      // string[] | number[]

// Wrap the parameter in a tuple to switch distribution off
type ToArrayAll<T> = [T] extends [unknown] ? T[] : never;
type Y = ToArrayAll<string | number>;   // (string | number)[]
```

Knowing that distinction saves an hour the first time a conditional type "mysteriously" returns a union.

A practical pattern — deriving handler types from a schema:

```ts
type Handler<T> = T extends { kind: infer K; payload: infer P }
  ? (kind: K, payload: P) => void
  : never;
```

## Variadic tuples

Tuples with spreads encode structural facts the type system can then enforce, which is the mechanism
behind constructive modeling in `SKILL.md`.

```ts
type NonEmpty<T> = [T, ...T[]];
type Pairs<T> = [T, T][];
type WithId<T extends unknown[]> = [id: string, ...rest: T];

const isNonEmpty = <T,>(a: readonly T[]): a is [T, ...T[]] => a.length > 0;
```

`NonEmpty<T>` is the single highest-value one: it turns "the caller must check for empty" from a comment
into a compile error, and it deletes the `!` at the use site.

```ts
// Before: partiality smuggled past the compiler
function newest(sessions: Session[]): Session { return sessions.at(0)!; }

// After: the empty case lands at the call site, which is the only place that knows what empty means
function newest(sessions: NonEmpty<Session>): Session { return sessions[0]; }
```

Named tuple members (`[id: string, ...rest: T]`) cost nothing and make the editor hint readable.

## Knowing when to stop

Type-level programming is genuinely powerful and its failure mode is expensive: a clever type produces
error messages no one can act on, slows the language server for everyone in the repo, and hides the
business logic behind puzzle-solving.

Signals to back off:

- The error message is longer than the function
- You are testing the type by hovering rather than by reasoning
- Recursion depth is doing real work (`Prettify`, deep path strings, arithmetic)
- A runtime function plus a simple return type would give the same guarantee

The strongest simplification is usually to move the constraint to runtime and parse: `z.infer` gives a
precise type from a schema without a single conditional type, and the schema also validates.
