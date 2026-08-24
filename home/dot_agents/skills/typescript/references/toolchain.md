# Toolchain reference

Companion to `SKILL.md`. Read the section you need.

- [tsconfig flags, explained](#tsconfig-flags-explained)
- [Options TypeScript 7 removed](#options-typescript-7-removed)
- [Which config for which target](#which-config-for-which-target)
- [Project references](#project-references)
- [Biome](#biome)
- [Rules that catch real bugs](#rules-that-catch-real-bugs)
- [Vitest](#vitest)
- [Testing types](#testing-types)
- [Vite](#vite)
- [pnpm](#pnpm)
- [Formatting](#formatting)
- [When the type check gets slow](#when-the-type-check-gets-slow)
- [Scripts and CI](#scripts-and-ci)
- [Publishing a library](#publishing-a-library)

Start from `assets/tsconfig.strict.json` and `assets/biome.jsonc` on a new project. On an existing
project, read what is there first and change nothing that was not the task.

## tsconfig flags, explained

`strict: true` turns on the group that matters most: `noImplicitAny`, `strictNullChecks`,
`strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`,
`strictBuiltinIteratorReturn`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`. Never list
these individually — the group grows between releases (`strictBuiltinIteratorReturn` joined in 5.6) and an
explicit list silently misses the new member.

`tsc --init` is a good starting point rather than a stub. It writes `strict`,
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`,
`noUncheckedSideEffectImports`, `moduleDetection: "force"`, and `skipLibCheck`, with the rest commented
out. Run it and delete what does not apply.

Beyond `strict`:

| Flag | What it buys | Cost |
|---|---|---|
| `noUncheckedIndexedAccess` | `arr[i]` and `rec[key]` become `T \| undefined`. Removes the largest single source of runtime `undefined`. | Loud. Hundreds of errors in a mature codebase. Adopt in its own commit. |
| `exactOptionalPropertyTypes` | `{ a?: string }` stops accepting an explicit `a: undefined`, which `"a" in obj` reports as present. | Friction with libraries that spread `undefined` into options objects. |
| `noImplicitOverride` | A renamed base method no longer silently orphans the subclass override. | Requires the `override` keyword on every override. Mechanical. |
| `noFallthroughCasesInSwitch` | A missing `break` reads as intentional to everyone but the compiler. | None worth mentioning. |
| `noPropertyAccessFromIndexSignature` | Forces `obj["key"]` for index-signature access, so a real property and an arbitrary key look different. | Noisy on config objects. Optional. |
| `noUncheckedSideEffectImports` | A bare `import "./thing"` for a module that does not resolve becomes an error instead of being ignored. | Needs a `.d.ts` shim for the CSS-import-in-TS pattern. |
| `moduleDetection: "force"` | Every file is a module, so a file with no import is not a script sharing the global scope. | None worth mentioning on new code. |
| `verbatimModuleSyntax` | Import elision becomes explicit: type-only imports must say `import type`, side-effect imports survive. | Requires a pass over existing imports. Do it during an ESM migration, not after. |
| `isolatedModules` | Rejects code a single-file transpiler (esbuild, SWC, Babel) cannot handle correctly. | Bans `const enum` re-export and a few ambient patterns. |
| `erasableSyntaxOnly` (5.8+) | Bans `enum`, `namespace`, and constructor parameter properties, so the code runs under a type-stripping runtime such as recent Node. | Incompatible with NestJS, which needs `emitDecoratorMetadata`. |
| `noEmit` | The type check does not write output. Correct for anything bundled by Vite, esbuild, or SWC. | None. |
| `skipLibCheck` | Skips type checking inside `node_modules`. Large compile-time win. | Hides a genuine conflict between two libraries' types. Keep it on anyway; the alternative is unusable. |

`declaration: true` and `declarationMap: true` matter for a published library and nothing else. Turning
them on in an app costs build time for output nobody reads.

`incremental: true` with a `tsBuildInfoFile` outside `dist` makes the second `tsc --noEmit` several times
faster. Free.

## Options TypeScript 7 removed

TypeScript 7 is the native (Go) port of the compiler, and it dropped long-deprecated options. A config
carrying one of these fails to load after the upgrade — a config error, not a type error, so nothing
builds at all.

| Removed | Replacement |
|---|---|
| `baseUrl` | None needed. `paths` resolves relative to the tsconfig on its own (4.4+), so delete `baseUrl` and leave `paths`. For the old catch-all behaviour, `"paths": { "*": ["./*"] }`. |
| `target: "ES5"` / `"ES3"` | `ES2015` at the oldest. If you genuinely must ship ES5, downlevel with a bundler, not with `tsc`. |
| `importsNotUsedAsValues` | `verbatimModuleSyntax` |
| `preserveValueImports` | `verbatimModuleSyntax` |
| `suppressImplicitAnyIndexErrors` | Fix the index access, or `@ts-expect-error` with a reason |

`experimentalDecorators` and `emitDecoratorMetadata` survive, so NestJS and TypeORM still work.

`scripts/ts-audit.mjs` reports these, because a project that still sets them is one upgrade away from a
red build and nobody has noticed.

## Which config for which target

The differences that actually matter, rather than a full config per target:

**Bundled front end** (Vite, Next): `"moduleResolution": "bundler"`, `"module": "ESNext"`,
`"noEmit": true`, `"lib": ["ES2023", "DOM", "DOM.Iterable"]`, `"jsx": "react-jsx"`. The bundler emits;
`tsc` only checks. `DOM.Iterable` is what makes `for (const el of nodeList)` type-check.

**Node service**: `"module": "NodeNext"`, `"moduleResolution": "nodenext"`, `"lib": ["ES2023"]`,
`"types": ["node"]`, and `"outDir": "./dist"` if `tsc` is the build. `nodenext` is the only setting that
models Node's real dual CJS/ESM resolution, including the required file extensions on relative imports.

**Published library**: the Node service settings plus `"declaration": true`, `"declarationMap": true`, and
`"isolatedDeclarations": true` (5.5+) if the build is not `tsc` — it guarantees every export has an
inferable type, which is what lets a fast tool emit correct `.d.ts` files.

**Monorepo**: one `tsconfig.base.json` holding the strictness flags, one thin `tsconfig.json` per package
that extends it. Add project references only when the type check gets slow enough to measure — see below.

Keep `include` narrow (`["src"]`) and let a separate `tsconfig.test.json` cover the tests. A single config
covering both puts test-only globals in the app's type environment.

## Project references

References let `tsc` treat each package as a separately-cached unit, so touching one leaf does not
re-check the whole graph. Reach for them when the monorepo's type check is slow enough that you have
measured it — they add real configuration weight, and `extends` alone covers most repos.

```jsonc
// tsconfig.json at the root — a solution file. No sources of its own.
{ "files": [], "references": [{ "path": "./packages/shared" }, { "path": "./packages/api" }] }
```

```jsonc
// packages/shared/tsconfig.json — every referenced package
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,      // required; enables the .tsbuildinfo cache
    "declaration": true,    // consumers read the emitted .d.ts, not your source
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

```jsonc
// packages/api/tsconfig.json — a consumer names what it depends on
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "composite": true },
  "references": [{ "path": "../shared" }], "include": ["src"] }
```

The parts that trip people up:

- **Build with `tsc -b`, not `tsc`.** Only build mode walks the reference graph and rebuilds stale
  projects in order. Plain `tsc -p` on the root does nothing useful, because the root has `"files": []`.
- **`composite` forces `declaration`,** so a referenced package emits `.d.ts` whether you wanted output or
  not. A package that only ever gets bundled still pays for the emit.
- **Consumers see the built `.d.ts`, not the source.** So a stale `dist` shows up as a type error in a
  package you did not touch. That is the cost of the caching, and `tsc -b --watch` is what makes it
  bearable in development.
- **References are not module resolution.** They tell `tsc` about build order; the runtime still needs
  workspace linking (pnpm workspaces) or a `paths` entry.

## Biome

Biome is one Rust binary that lints and formats. Choosing it means there is no ESLint, no Prettier, and
no `eslint-config-prettier` reconciling the two — the reason people reach for it is that the whole
category of config-fighting-config disappears, and it runs fast enough to be a pre-commit hook.

```bash
pnpm add -D --save-exact @biomejs/biome
pnpm biome check --write .     # format + lint + organize imports, in one pass
```

Start from `assets/biome.jsonc`. Three things about it are worth knowing before you write your own.

**Use the `.jsonc` extension.** Biome reads comments in `biome.jsonc`. A comment in `biome.json` makes
Biome fall back to its defaults **without reporting an error** — severities revert, nursery rules switch
off, and the formatter goes back to tabs. Nothing tells you. A config that silently does not apply is
worse than one that fails, so pick the extension that cannot do that.

**Biome does not replace `tsc`.** It has its own type inference, not a type checker. `tsc --noEmit`
remains the thing that proves your types. Biome's job is the class of bug `tsc` does not model — a
floating promise above all.

**Ignore patterns come from `.gitignore`** when `vcs.useIgnoreFile` is on, so there is one list instead of
two. The catch: with that setting and no ignore file, Biome exits with a configuration error rather than a
warning, which surprises people on a fresh repo.

Biome 2 renamed a few things that older examples still use. `include`/`ignore` became one `includes` list
where a `!` prefix excludes, and top-level `organizeImports` became an assist action at
`assist.actions.source.organizeImports`.

Coming from ESLint and Prettier, let Biome do the translation instead of hand-porting:

```bash
biome migrate eslint --write
biome migrate prettier --write
```

It maps the rules it has equivalents for and leaves the rest, so read the result — the diff is the honest
report of what Biome does not cover.

## Rules that catch real bugs

Biome's recommended set is decent. These are the additions worth making explicit, with the group each
belongs to (the group is part of the config path, so getting it wrong means the rule silently does not
apply):

| Rule | Group | Why |
|---|---|---|
| `noFloatingPromises` | `nursery` | An unawaited promise swallows its rejection, so the failure vanishes. The highest-value rule here. |
| `noMisusedPromises` | `nursery` | An `async` callback passed where `() => void` is expected — an event handler, a `forEach`. The rejection goes nowhere. |
| `useExhaustiveSwitchCases` | `nursery` | The linter's version of the `never` default arm. |
| `noUnnecessaryConditions` | `suspicious` | A check the types prove is always true. Either the check is dead or the type is wrong. |
| `noExplicitAny` | `suspicious` | Defaults to a warning. Make it an error on a new project. |
| `noTsIgnore` | `suspicious` | Pushes you to `@ts-expect-error`, which expires when the error does. |
| `noNonNullAssertion` | `style` | Defaults to a warning. |
| `noEnum` | `style` | An `enum` emits runtime code, is nominally typed, and blocks type-stripping runtimes. |
| `useImportType` | `style` | Keeps type-only imports out of the runtime graph. Pairs with `verbatimModuleSyntax`. |

### The type-aware rules, and their real limits

The first four need type information, and Biome's inference is its own — not `tsc`'s. Two consequences
that decide how much you can lean on it:

- **They are still `nursery` as of Biome 2.5**, so they are opt-in by name and their behaviour can change
  between minor versions. Install with `--save-exact` and pin the version, or a patch bump silently
  changes what CI rejects.
- **A `types` domain does not enable them.** Setting `"domains": { "types": "all" }` looks like it should
  and does not — the nursery rules stay off. Name each rule under `nursery`. This is the mistake worth
  checking for, because the config looks stricter than it is.

What the inference does and does not reach, measured on Biome 2.5:

| Case | Caught |
|---|---|
| Floating promise from a function in the same file | yes |
| Floating promise from a function imported from another file in the project | yes |
| `async` callback passed inline where `() => void` is expected | yes |
| `async` function passed by reference where `() => void` is expected | yes |
| Promise used as a condition (`if (isReady())`) | yes |
| `async` handler passed to a DOM API typed by `lib.dom.d.ts` (`el.addEventListener("click", save)`) | **no** |

The last row is the honest limit: inference over your own source is solid, inference that depends on
library declaration files is not there yet. So the `addEventListener` and Express-middleware cases —
exactly where an unhandled rejection hurts most — are still on you and the reviewer. Say `void save()` at
those call sites deliberately rather than assuming the linter is watching.

If your project's tolerance for unhandled rejections is zero and it is full of framework callbacks,
typescript-eslint's `no-misused-promises` still covers more. That is the tradeoff Biome asks you to
accept in exchange for one fast binary and no config reconciliation.
## Vitest

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,             // import from "vitest" — explicit beats ambient
    environment: "node",        // "jsdom" or "happy-dom" for component tests
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
    typecheck: { enabled: true },
  },
});
```

`globals: false` is worth the extra import line: it keeps `describe` and `expect` out of the global type
environment, so nothing in `src/` can accidentally reference a test global and still compile.

Vitest handles TypeScript and ESM natively, which removes the transform configuration that makes a Jest
setup fragile. On an existing Jest project, leave it — a migration is its own task.

Mock only what you cannot run. An in-memory store or a real temporary SQLite database tests the query you
actually ship; a mocked repository tests your mock. Reach for a mock at the true edges: a paid third-party
API, a clock, a random source.

## Testing types

A type is behaviour, so assert it rather than hoping.

```ts
import { expectTypeOf, assertType } from "vitest";

expectTypeOf(parseUser).returns.toEqualTypeOf<User>();
expectTypeOf<CreateUserInput>().not.toHaveProperty("id");

// @ts-expect-error a plain string must not pass where a UserId is required
cancelOrder(orderId, "not-an-id");
```

The `@ts-expect-error` form is the strongest test of a branded type or an overload: it fails the build if
the bad call ever starts compiling, which is exactly the regression you are guarding against.

`typecheck: { enabled: true }` is what makes `expectTypeOf` failures fail the test run rather than being
silently discarded.

## Vite

```ts
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: { sourcemap: true },
});
```

`vite-tsconfig-paths` makes `tsconfig.json` the single owner of the path aliases. Hand-writing
`resolve.alias` as well means two mappings that drift, and the failure is a build that type-checks and
then cannot resolve a module at runtime.

Vite strips types with esbuild and **does not type-check**. `tsc --noEmit` must run separately, in the
`build` script and in CI. A green `vite build` says nothing about types.

`import.meta.env` needs a declaration for custom variables, or every read is `any`:

```ts
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
```

Only `VITE_`-prefixed variables reach the client bundle. That prefix is a security boundary — anything
inside it ships to the browser, so a secret with a `VITE_` name is a published secret.

## pnpm

Use `pnpm` when choosing fresh: a content-addressed store makes installs fast and disk use small, and its
strict `node_modules` layout refuses to resolve a package you did not declare. That strictness is the real
benefit — npm's flat tree lets a transitive dependency satisfy your import, and the build breaks the day
that dependency moves.

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

Use `pnpm add -w` for a root dependency and `--filter <pkg>` to target one workspace package. `pnpm -r`
runs a script across all of them.

Commit the lockfile. Use `pnpm install --frozen-lockfile` in CI so a stale lockfile fails the build
instead of quietly resolving something else.

## Formatting

Biome formats, so there is no Prettier. That is most of the appeal: one binary, one config file, and no
`eslint-config-prettier` layer whose job is to stop two tools from undoing each other's work.

One default worth overriding deliberately: **Biome indents with tabs.** Set `formatter.indentStyle`
explicitly either way. Left implicit, the first person whose editor disagrees produces a whole-file diff
and buries the real change.

```jsonc
"formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 }
```

The values do not matter. Having one committed file that decides them does.

`biome check --write` formats, lints with safe fixes, and sorts imports in one pass, which is what makes
it viable as a pre-commit hook rather than a CI-only step.

## When the type check gets slow

"Simplify the expensive type" is only actionable once you know which one it is. `tsc` will tell you.

```bash
tsc --noEmit --extendedDiagnostics     # where the time goes, and how many types were made
tsc --noEmit --generateTrace .trace    # per-file, per-type timing
npx @typescript/analyze-trace .trace   # ranks the hot spots from that trace
tsc --noEmit --explainFiles            # why a file is in the program at all
```

Read `--extendedDiagnostics` first, because it costs nothing and usually answers the question:

- **`Instantiations` in the millions** — a generic or conditional type is being expanded far more than you
  think. This is the number that correlates with an unusable editor. Find it with the trace.
- **`Files` far larger than your source tree** — you are pulling in type packages you do not use. `types`
  in tsconfig, or `--explainFiles`, will show who dragged them in.
- **`Check time` dominating** — real type work. **`Parse time` dominating** — too many files, not too many
  types, and `include` is probably too wide.

Two structural fixes before you start deleting types: narrow `include`, and set `"types": []` so ambient
`@types` packages are opt-in rather than everything in `node_modules/@types`.

`type-coverage` gives a single percentage of expressions with a non-`any` type, and
`type-coverage --at-least 95` gates it in CI, which is a useful ratchet during a migration. One caveat
worth knowing before you add it: it drives the old compiler API, so it **crashes on TypeScript 7** and
needs the 5.x line. `scripts/ts-audit.mjs` in this skill covers similar ground by counting escape hatches
directly, with no compiler-API dependency.

## Scripts and CI

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "fix": "biome check --write .",
    "test": "vitest run",
    "build": "tsc --noEmit && vite build",
    "check": "pnpm typecheck && pnpm lint && pnpm test"
  }
}
```

In CI, `biome ci .` instead of `biome check .` — same checks, but it never writes and its output is shaped
for a CI log.

All three gates check different things, and none subsumes another: `tsc` proves shapes, Biome proves
formatting plus the type-aware invariants `tsc` does not model (floating promises above all), tests prove
behaviour. Run all three before claiming a change works. Biome being fast is not a reason to skip `tsc` —
they do not overlap.

Run them in that order locally — `tsc` is the fastest to fail and gives the clearest message.

## Publishing a library

```json
{
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "files": ["dist"],
  "sideEffects": false
}
```

Points that break consumers when they are wrong:

- **`types` must come first** in an `exports` entry. Condition order is significant, and a later `types`
  is ignored.
- **`exports` replaces `main`** and makes deep imports fail unless you list them. That is the feature: the
  subpaths you list are your public API, and everything else stops being one.
- **`sideEffects: false`** lets bundlers tree-shake. It is a lie if any module mutates global state at
  import time, and the resulting bug is invisible until a consumer's production build drops the module.
- **Ship a `.d.ts` generated by your build**, not a hand-written one. A hand-written declaration drifts
  from the implementation and nothing checks it.
- Check the published surface with `attw` (`are-the-types-wrong`) and `publint` before the first release.
  Both catch resolution mistakes that only appear in a consumer's project.
