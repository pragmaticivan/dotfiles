# Toolchain reference

Companion to `SKILL.md`. Read the section you need.

- [tsconfig flags, explained](#tsconfig-flags-explained)
- [Options TypeScript 7 removed](#options-typescript-7-removed)
- [Which config for which target](#which-config-for-which-target)
- [Project references](#project-references)
- [Ultracite](#ultracite)
- [The rules Ultracite leaves out](#the-rules-ultracite-leaves-out)
- [Vitest](#vitest)
- [Testing types](#testing-types)
- [Vite](#vite)
- [pnpm](#pnpm)
- [Formatting](#formatting)
- [When the type check gets slow](#when-the-type-check-gets-slow)
- [Scripts and CI](#scripts-and-ci)
- [Publishing a library](#publishing-a-library)

Start from `assets/tsconfig.strict.json` and `assets/biome.jsonc` on a new project, or run
`ultracite init` and let it write the lint config. On an existing project, read what is there first and
change nothing that was not the task.

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

## Ultracite

Ultracite is the linting entry point. It is a preset over Biome, and Biome is one Rust binary that lints
and formats. The stack has no ESLint, no Prettier, and no `eslint-config-prettier` reconciling the two.
Ultracite adds the part a bare Biome config makes you write by hand: about 365 rules already set to
error, the formatter, the ignore globs, the import sorting, and a framework preset per framework.

```bash
pnpm add -D --save-exact ultracite @biomejs/biome
pnpm ultracite init          # writes biome.jsonc, and detects your frameworks
```

| Command | Does |
|---|---|
| `ultracite check` | Lints and checks formatting. Writes nothing. This is the CI gate. |
| `ultracite fix` | Applies safe fixes. `--unsafe` allows fixes that can change behaviour. |
| `ultracite doctor` | Reports a broken setup — a missing binary, a config that does not extend the preset, a leftover Prettier config. |
| `ultracite init` | Sets the project up. `--type-aware` adds the project-graph preset, and `--linter biome` picks the provider. |

Start from `assets/biome.jsonc`. It extends two presets, and it adds only what the presets leave out.

```jsonc
{ "extends": ["ultracite/biome/core", "ultracite/biome/type-aware"] }
```

**Install Ultracite as a dev dependency.** Biome resolves `extends` from the project `node_modules`, so
an `npx ultracite` call alone leaves a config that cannot load its own preset. Ultracite detects this one
and says so, which is the rare failure that explains itself.

**Call the CLI through a package script.** `ultracite check` spawns `biome` from `PATH`. A package script
puts `node_modules/.bin` on `PATH` and a bare shell call does not, so the direct call dies with `ENOENT`
on a project that has no global Biome.

**Ultracite does not replace `tsc`.** Biome has its own inference, not a type checker. `tsc --noEmit`
remains the thing that proves your types. The linter's job is the class of bug `tsc` does not model — a
floating promise above all.

**Use the `.jsonc` extension.** Biome reads comments in `biome.jsonc`. A comment in `biome.json` makes
Biome fall back to its defaults **without reporting an error** — severities revert and the formatter goes
back to tabs. Nothing tells you. A config that silently does not apply is worse than one that fails.

**Commit a `.gitignore` before the first run.** `core` sets `vcs.useIgnoreFile`, which is what keeps the
ignore list in one file instead of two. With that on and no ignore file present, Biome exits with a
configuration error rather than a warning, and nothing lints at all. It surprises people on a fresh repo,
and adopting the preset is what turns it on.

### The presets

`core` is the base. It already sets every rule this skill argues for: `noExplicitAny`, `noTsIgnore`,
`noUnnecessaryConditions`, `noNonNullAssertion`, `noEnum`, `useImportType`, and `noUnusedVariables`. Do
not restate them — a hand-written list of 30 rules on top of `core` is 30 lines that change nothing.

`type-aware` adds the rules that need the project graph: `noImportCycles`, `noUndeclaredDependencies`,
`noUnresolvedImports`, `noPrivateImports`, `noDeprecatedImports`, and `useArraySortCompare`.

Then one preset per framework the project actually has — `react`, `nestjs`, `vitest`, `next`, `vue`,
`svelte`, `solid`, `angular`, `astro`, `qwik`, `remix`, `tanstack`, `jest`.

**Read the `nestjs` preset before adding it.** It turns `noEnum`, `noUselessConstructor`,
`noStaticOnlyClass`, and `noParameterProperties` **off**, because a decorator-driven framework needs all
four. That is the right call for NestJS, and it also means a NestJS project silently loses the "no `enum`"
rule this skill recommends elsewhere. Know which rules your presets switch off.

To change one rule, override it by name — do not fork the preset:

```jsonc
{
  "extends": ["ultracite/biome/core"],
  "linter": { "rules": { "a11y": { "useButtonType": "off" } } }
}
```

## The rules Ultracite leaves out

Three rules are the highest-value thing a linter adds on top of `tsc`, and **no Ultracite preset enables
any of them** — not even `type-aware`. Ultracite avoids `nursery` rules on purpose
([ultracite#457](https://github.com/haydenbleasel/ultracite/issues/457)). Name them yourself:

```jsonc
"linter": {
  "rules": {
    "nursery": {
      "noFloatingPromises": "error",
      "noMisusedPromises": "error",
      "useExhaustiveSwitchCases": "error"
    }
  }
}
```

| Rule | Why |
|---|---|
| `noFloatingPromises` | An unawaited promise swallows its rejection, so the failure vanishes. The highest-value rule here. |
| `noMisusedPromises` | An `async` callback passed where `() => void` is expected — an event handler, a `forEach`. The rejection goes nowhere. |
| `useExhaustiveSwitchCases` | The linter's version of the `never` default arm. Keep the `never` binding in the code too, because it survives a config change. |

This is the gap worth checking on any Ultracite project: the config looks comprehensive at 365 rules, and
the three that catch unhandled rejections are still off.

### The type-aware rules, and their real limits

These three need type information, and Biome's inference is its own — not `tsc`'s. Two consequences that
decide how much you can lean on it:

- **They are `nursery` as of Biome 2.5**, so their behaviour can change between minor versions. Install
  with `--save-exact` and pin the version, or a patch bump silently changes what CI rejects.
- **A `types` domain does not enable them.** Setting `"domains": { "types": "all" }` looks like it should
  and does not. Neither does `ultracite/biome/type-aware`, whose name suggests it would. Name each rule
  under `nursery`.

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
typescript-eslint's `no-misused-promises` still covers more. That is the tradeoff this stack asks you to
accept in exchange for one fast binary and no config reconciliation.

### Migrating an existing project

`ultracite init` does the migration. It detects an existing ESLint, Prettier, or bare Biome setup, offers
to remove the configs it replaces, and rewrites `biome.jsonc` to extend the preset. It also detects your
frameworks from `package.json` and adds the matching presets.

Read the resulting diff rather than trusting it. A hand-tuned ESLint rule with no Biome equivalent is
dropped silently, and that diff is the honest report of what moving to this stack costs you.

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

`ultracite/biome/core` already decides the format: spaces, width 2, line width 80, LF endings, semicolons
always, double-quoted JSX. A bare Biome config defaults to **tabs**, so a project that adopts Ultracite
gets this settled instead of arguing about it. Take the preset's answer. The values do not matter, and
having one committed file that decides them does.

Override a format setting only for a reason you can say out loud:

```jsonc
"formatter": { "lineWidth": 100 }
```

`ultracite fix` formats, lints with safe fixes, and sorts imports in one pass, which is what makes it
viable as a pre-commit hook rather than a CI-only step. Ultracite writes the hook for you during `init`,
and it runs `ultracite fix` through `lint-staged`.

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
    "lint": "ultracite check",
    "fix": "ultracite fix",
    "test": "vitest run",
    "build": "tsc --noEmit && vite build",
    "check": "pnpm typecheck && pnpm lint && pnpm test"
  }
}
```

Route every call through a script like this. `ultracite check` spawns `biome` from `PATH`, and a package
script is what puts `node_modules/.bin` there. In a monorepo, define `check` and `fix` at the root and
register them in `turbo.json` as `//#check` and `//#fix`, with `cache: false` on the fix task.

All three gates check different things, and none subsumes another: `tsc` proves shapes, Ultracite proves
formatting plus the invariants `tsc` does not model (floating promises above all), tests prove behaviour.
Run all three before claiming a change works. Ultracite being fast is not a reason to skip `tsc` — they do
not overlap.

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
