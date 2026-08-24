#!/usr/bin/env node
//
// ts-audit — report a TypeScript project's strictness gaps and escape-hatch
// density. Node only, no dependencies, read-only.
//
//   node ts-audit.mjs [project-dir]        # defaults to the current directory
//
// Why this exists: "is this codebase strict?" and "how much `any` is in here?"
// are questions worth answering with a measurement instead of a guess. The
// answer decides whether adding types to a module is a 20-minute job or a
// migration.
//
// The flag report is exact — it resolves the `extends` chain. The escape-hatch
// counts are heuristic: comments and string literals are stripped first, but a
// regex is not a parser. Treat them as a magnitude, not a total.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, basename } from "node:path";

const root = resolve(process.argv[2] ?? ".");

const STRICT_GROUP = [
  "noImplicitAny",
  "strictNullChecks",
  "strictFunctionTypes",
  "strictBindCallApply",
  "strictPropertyInitialization",
  "strictBuiltinIteratorReturn",
  "noImplicitThis",
  "useUnknownInCatchVariables",
  "alwaysStrict",
];

const BEYOND_STRICT = [
  ["noUncheckedIndexedAccess", "arr[i] becomes T | undefined"],
  ["exactOptionalPropertyTypes", "a?: string stops accepting an explicit undefined"],
  ["noImplicitOverride", "a renamed base method cannot orphan an override"],
  ["noFallthroughCasesInSwitch", "a missing break is an error, not a shrug"],
  ["noImplicitReturns", "every code path returns a value"],
  ["noUncheckedSideEffectImports", "a bare import of a missing module is an error"],
  ["verbatimModuleSyntax", "import elision is explicit"],
  ["isolatedModules", "single-file transpilers stay correct"],
  ["noUnusedLocals", "dead locals fail the build"],
  ["noUnusedParameters", "dead parameters fail the build"],
];

// Options TypeScript 7 removed. A config carrying one of these fails the build
// on an upgrade, so it is worth reporting even though it is not a strictness gap.
const REMOVED = [
  ["baseUrl", 'removed in TS 7 — `paths` resolves relative to the tsconfig without it'],
  ["importsNotUsedAsValues", "removed — use `verbatimModuleSyntax`"],
  ["preserveValueImports", "removed — use `verbatimModuleSyntax`"],
  ["suppressImplicitAnyIndexErrors", "removed — fix the index access or use `// @ts-expect-error`"],
];

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  "coverage",
  ".git",
  ".turbo",
  ".output",
]);

const SOURCE_EXT = /\.(ts|tsx|mts|cts)$/;
const TEST_FILE = /(\.|-)(test|spec)\.[cm]?tsx?$/;

// --- tsconfig -------------------------------------------------------------

// JSON with comments and trailing commas. Reuse the source stripper, then drop
// the trailing commas the JSON parser rejects.
function parseJsonc(text) {
  return JSON.parse(stripCommentsAndStrings(text, { keepStrings: true }).replace(/,(\s*[}\]])/g, "$1"));
}

// A config this script could not read makes every flag below read as "off",
// which would be a lie. Track it and say so.
let unreadable = 0;

// Resolves `extends` depth-first so a base config's flags are visible, with the
// nearer config winning. Returns { options, chain }.
function loadTsconfig(file, seen = new Set()) {
  const abs = resolve(file);
  if (seen.has(abs)) return { options: {}, chain: [] };
  seen.add(abs);

  let raw;
  try {
    raw = parseJsonc(readFileSync(abs, "utf8"));
  } catch (e) {
    console.error(`  ! cannot parse ${relative(root, abs)}: ${e.message}`);
    unreadable++;
    return { options: {}, chain: [abs] };
  }

  let options = {};
  let chain = [];

  for (const parent of [raw.extends].flat().filter((v) => typeof v === "string")) {
    const target = resolveExtends(parent, dirname(abs));
    if (target === null) {
      console.error(`  ! cannot resolve extends "${parent}" from ${relative(root, abs)}`);
      continue;
    }
    const base = loadTsconfig(target, seen);
    options = { ...options, ...base.options };
    chain = [...chain, ...base.chain];
  }

  return {
    options: { ...options, ...(raw.compilerOptions ?? {}) },
    chain: [...chain, abs],
  };
}

function resolveExtends(spec, from) {
  const candidates = spec.startsWith(".")
    ? [resolve(from, spec), resolve(from, `${spec}.json`)]
    : [
        join(root, "node_modules", spec),
        join(root, "node_modules", `${spec}.json`),
        join(root, "node_modules", spec, "tsconfig.json"),
      ];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

// --- source scanning ------------------------------------------------------

// Removes comments and (unless asked to keep them) string and template
// literal bodies, so counting `any` does not count the word in a sentence.
// A single pass over the characters — a regex cannot do this correctly.
function stripCommentsAndStrings(src, { keepStrings = false } = {}) {
  let out = "";
  let i = 0;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let body = c;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") {
          body += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        body += src[i];
        i++;
      }
      i++;
      out += keepStrings ? body + quote : quote + quote;
      continue;
    }
    out += c;
    i++;
  }

  return out;
}

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, files);
    } else if (SOURCE_EXT.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

const HATCHES = [
  ["any", /\bany\b/g, "opts out of checking, transitively"],
  ["as (cast)", /\bas\s+(?!const\b)[A-Za-z_$][\w$<>[\].]*/g, "a claim the compiler did not check"],
  ["! (non-null)", /[\w$)\]]!(?![=])/g, "asserts a fact you may not have established"],
  ["@ts-ignore", /@ts-ignore/g, "never expires — prefer @ts-expect-error"],
  ["@ts-expect-error", /@ts-expect-error/g, "expires when the error does; give a reason"],
  ["biome-ignore", /biome-ignore/g, "check each one has a reason comment"],
];

// Doc comments over this many content lines do not get read, and go stale
// invisibly because nothing checks them. The length is usually a symptom: a type
// too loose to state its own contract, or a function doing too much.
const DOC_BUDGET = 3;

// Finds /** */ blocks and counts their prose lines, ignoring the delimiters and
// blank ` *` separators. Counting content rather than raw height is the honest
// measure — a blank line is not what makes a comment unreadable.
function docComments(raw) {
  const found = [];
  const lines = raw.split("\n");
  let start = -1;
  let content = 0;

  for (const [i, line] of lines.entries()) {
    const text = line.trim();
    if (start === -1) {
      if (text.startsWith("/**")) {
        start = i;
        content = text.replace(/^\/\*\*+/, "").replace(/\*\/$/, "").trim() === "" ? 0 : 1;
        if (text.endsWith("*/")) {
          found.push({ line: start + 1, content });
          start = -1;
        }
      }
      continue;
    }
    // Strip the closing delimiter before the leading asterisks, or a bare `*/`
    // line leaves a `/` behind and counts as prose.
    const body = text.replace(/\*\/\s*$/, "").replace(/^\*+/, "").trim();
    if (body !== "") content++;
    if (text.endsWith("*/")) {
      found.push({ line: start + 1, content });
      start = -1;
    }
  }
  return found;
}

function scan(files) {
  const totals = new Map(HATCHES.map(([name]) => [name, { src: 0, test: 0, worst: null }]));
  const docs = { total: 0, over: 0, worst: null };
  let srcFiles = 0;
  let testFiles = 0;
  let lines = 0;

  for (const file of files) {
    const isTest = TEST_FILE.test(basename(file));
    isTest ? testFiles++ : srcFiles++;

    const raw = readFileSync(file, "utf8");
    lines += raw.split("\n").length;
    // Suppression comments live in comments, so count them before stripping.
    const stripped = stripCommentsAndStrings(raw);

    for (const [name, re] of HATCHES) {
      const target = name.startsWith("@ts-") || name === "biome-ignore" ? raw : stripped;
      const n = (target.match(re) ?? []).length;
      if (n === 0) continue;

      const t = totals.get(name);
      t[isTest ? "test" : "src"] += n;
      if (!isTest && (t.worst === null || n > t.worst.n)) t.worst = { file, n };
    }

    for (const doc of docComments(raw)) {
      docs.total++;
      if (doc.content <= DOC_BUDGET) continue;
      docs.over++;
      if (docs.worst === null || doc.content > docs.worst.content) {
        docs.worst = { file, line: doc.line, content: doc.content };
      }
    }
  }

  return { totals, docs, srcFiles, testFiles, lines };
}

// --- biome ----------------------------------------------------------------

// The type-aware rules are the reason to run a linter on top of tsc, and they
// are nursery, so they are off unless named individually. A `types` domain does
// not turn them on, which makes a config look stricter than it is.
const TYPE_AWARE = ["noFloatingPromises", "noMisusedPromises", "useExhaustiveSwitchCases"];

function reportBiome() {
  const jsonc = join(root, "biome.jsonc");
  const json = join(root, "biome.json");
  const file = existsSync(jsonc) ? jsonc : existsSync(json) ? json : null;

  const stale = ["eslint.config.js", "eslint.config.mjs", ".eslintrc.json", ".prettierrc"].filter((f) =>
    existsSync(join(root, f)),
  );

  if (file === null) {
    if (stale.length > 0) console.log(`biome         absent; still carrying ${stale.join(", ")}\n`);
    return;
  }

  const raw = readFileSync(file, "utf8");
  console.log(`biome         ${basename(file)}`);

  // A comment in biome.json makes Biome fall back to defaults and say nothing,
  // so the whole config below is decorative. This is the loudest thing here.
  if (file === json && /^\s*(\/\/|\/\*)/m.test(raw)) {
    console.log("  !! this file has comments, and Biome silently ignores a commented biome.json.");
    console.log("     Nothing in it is applying. Rename it to biome.jsonc.");
  }

  let cfg;
  try {
    cfg = parseJsonc(raw);
  } catch (e) {
    console.log(`  ! cannot parse: ${e.message}\n`);
    return;
  }

  const nursery = cfg.linter?.rules?.nursery ?? {};
  const off = TYPE_AWARE.filter((r) => nursery[r] === undefined || nursery[r] === "off");
  console.log(
    off.length === 0
      ? "  type-aware rules: all enabled"
      : `  type-aware rules OFF: ${off.join(", ")} — name them under linter.rules.nursery`,
  );

  if (cfg.linter?.domains?.types !== undefined && off.length > 0) {
    console.log('  note: a "types" domain does not enable the nursery rules. Name each rule.');
  }
  if (cfg.formatter?.indentStyle === undefined) {
    console.log("  formatter.indentStyle is unset — Biome defaults to tabs. Say which you want.");
  }
  if (stale.length > 0) {
    console.log(`  leftover config from the old toolchain: ${stale.join(", ")}`);
  }
  console.log("");
}

// --- report ---------------------------------------------------------------

function readJsonIfPresent(file) {
  try {
    return parseJsonc(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function main() {
  console.log(`\nts-audit — ${root}\n`);

  const pkg = readJsonIfPresent(join(root, "package.json"));
  if (pkg !== null) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const named = ["typescript", "@biomejs/biome", "vitest", "jest", "zod", "react", "@nestjs/core"]
      .filter((d) => deps[d] !== undefined)
      .map((d) => `${d}@${deps[d]}`);
    console.log(`package.json  type: ${pkg.type ?? "commonjs"}`);
    if (named.length > 0) console.log(`              ${named.join("  ")}`);
    console.log("");
  }

  reportBiome();

  const configPath = join(root, "tsconfig.json");
  if (!existsSync(configPath)) {
    console.log("No tsconfig.json at the project root. Nothing to audit.\n");
    return;
  }

  const { options, chain } = loadTsconfig(configPath);
  console.log(`config chain  ${chain.map((c) => relative(root, c) || basename(c)).join(" <- ")}\n`);

  if (unreadable > 0) {
    console.log(
      `!! ${unreadable} config file(s) in the chain did not parse. Every flag below reads as\n` +
        "   off because this script could not see it, not because the project turned it off.\n" +
        "   Read the config by hand, or fix its syntax and run again.\n",
    );
  }

  const strict = options.strict === true;
  console.log(`strict        ${strict ? "on" : "OFF"}`);
  if (!strict && unreadable === 0) {
    const set = STRICT_GROUP.filter((f) => options[f] === true);
    console.log(
      set.length > 0
        ? `              ${set.length}/${STRICT_GROUP.length} members set by hand: ${set.join(", ")}`
        : "              nothing from the strict group is set — this project is unchecked",
    );
    console.log("              set `strict: true` rather than listing members; the group grows.");
  }
  const overrides = STRICT_GROUP.filter((f) => options[f] === false);
  if (strict && overrides.length > 0) {
    console.log(`              turned back off: ${overrides.join(", ")}`);
  }
  console.log("");

  const gaps = [];
  console.log("beyond strict");
  for (const [flag, why] of BEYOND_STRICT) {
    const on = options[flag] === true;
    if (!on) gaps.push(flag);
    console.log(`  ${on ? "on " : "off"}  ${flag.padEnd(28)} ${why}`);
  }
  console.log("");

  const removed = REMOVED.filter(([flag]) => options[flag] !== undefined);
  const oldTarget = /^es[35]$/i.test(String(options.target ?? ""));
  if (removed.length > 0 || oldTarget) {
    console.log("removed options (these fail the build on a TypeScript 7 upgrade)");
    for (const [flag, why] of removed) console.log(`  ${flag.padEnd(30)} ${why}`);
    if (oldTarget) console.log(`  ${`target: ${options.target}`.padEnd(30)} removed in TS 7`);
    console.log("");
  }

  const files = walk(root);
  if (files.length === 0) {
    console.log("No TypeScript source files found outside the skipped directories.\n");
    return;
  }

  const { totals, docs, srcFiles, testFiles, lines } = scan(files);
  console.log(`source        ${srcFiles} src + ${testFiles} test files, ${lines} lines\n`);

  console.log("escape hatches (heuristic; comments and strings stripped)");
  const perKLoc = (n) => (lines === 0 ? "0" : ((n / lines) * 1000).toFixed(1));
  for (const [name, , why] of HATCHES) {
    const t = totals.get(name);
    const total = t.src + t.test;
    const worst =
      t.worst === null ? "" : `  worst: ${relative(root, t.worst.file)} (${t.worst.n})`;
    console.log(
      `  ${String(total).padStart(5)}  ${name.padEnd(18)} ` +
        `src ${String(t.src).padStart(5)}  test ${String(t.test).padStart(4)}  ` +
        `${perKLoc(t.src).padStart(5)}/kloc  ${why}${worst}`,
    );
  }
  console.log("");

  console.log(`doc comments  ${docs.total} total, ${docs.over} over ${DOC_BUDGET} prose lines`);
  if (docs.worst !== null) {
    console.log(
      `  worst: ${relative(root, docs.worst.file)}:${docs.worst.line} (${docs.worst.content} lines)`,
    );
    console.log("  Read the length as a diagnosis, not a style nit: a loose type, a function doing too");
    console.log("  much, or a subsystem model in the wrong container. Do not just truncate it.");
  }
  console.log("");

  console.log("what to do with this");
  let step = 0;
  const advise = (text, continuation) => {
    console.log(`  ${++step}. ${text}`);
    if (continuation) console.log(`     ${continuation}`);
  };
  if (!strict) {
    advise("`strict: true` first. Everything else is noise until it is on.");
  } else if (gaps.length > 0) {
    advise(
      `${gaps.length} flag(s) available: ${gaps.join(", ")}.`,
      "Adopt one per commit. noUncheckedIndexedAccess is the loudest and the most useful.",
    );
  } else {
    advise("Compiler flags are already as tight as this report checks.");
  }
  const anySrc = totals.get("any").src;
  const asSrc = totals.get("as (cast)").src;
  advise(`${anySrc} \`any\` and ${asSrc} \`as\` in src. Each one is a place the compiler was told to stop looking.`);
  if (docs.over > 0) {
    advise(
      `${docs.over} doc comment(s) past ${DOC_BUDGET} lines. Move each surviving fact into a type, a name,` +
        " a test, or a linked doc.",
    );
  }
  advise("Do not change a compiler flag unless that was the task. Report the gap instead.");
  console.log("");
}

main();
