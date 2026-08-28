#!/usr/bin/env node
// Source: https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/scripts/check-plan.mjs
//
// Checks a plan against the skeleton in playbooks/multi-phase-plan.md.
//
// Two modes. Program mode is the default and checks a multi-PR program: the
// program checklist, one section per PR, the close section, and the appendices.
// `--single` checks a one-PR plan, which is what playbooks/one-shot.md writes.
// Single mode keeps the evidence boxes, the verification rule, and the
// punctuation rules, and drops the program ceremony that one PR does not need.
import fs from "node:fs";
import process from "node:process";

const RULE =
	"Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.";
const LANES = "lanes at the PR head";
const SUB_BLOCKS = [
	"Depends on.",
	"Files.",
	"Build.",
	"You see.",
	"Verify, unit.",
	"Verify, live.",
	"Verify, perf.",
	"Review gate.",
	"Merge.",
];
// One PR does not need a dependency line, a perf budget, or an operator gate.
const SINGLE_OPTIONAL = ["Depends on.", "Verify, perf.", "Review gate."];
const PROGRAM_H3 = ["Arm the program", "Spawn owners", "PR mechanics", "Verdict and merge", "Boot recipe"];
const PROGRAM_MARKERS = ["/loop", "git show origin/main:", /30[- ]minute/, "status message"];
const HOW_TO_READ_MARKERS = [
	"One box is one unit of work",
	"names the evidence",
	"Check a box only when its evidence exists",
	RULE,
];
const PERF_ITEMS = ["Metric.", "Probe.", "Baseline.", "Rule."];
const MIN_LANES_SINGLE = 3;
const LANES_PROGRAM = 10;
const BOX = /^\s*- \[[ x]\] (.*)$/;

const args = process.argv.slice(2);
const single = args.includes("--single");
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
	console.error("Usage: node check-plan.mjs [--single] <plan.md>");
	process.exit(2);
}

const raw = fs.readFileSync(file, "utf8").split(/\r?\n/);
const problems = [];
const fail = (line, message) => problems.push(`${file}:${line}: ${message}`);

let start = 0;
if (raw[0] === "---") {
	start = raw.indexOf("---", 1) + 1;
}

const lines = [];
let fence = false;
for (let i = start; i < raw.length; i++) {
	const text = raw[i];
	const n = i + 1;
	if (/^```/.test(text)) fence = !fence;
	lines.push({ n, text, code: fence });
	if (fence) continue;
	const prose = text
		.replace(/`[^`]*`/g, "`")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\]\([^)]*\)/g, "]");
	if (/[–—]/.test(prose)) fail(n, "long dash");
	if (/[‘’“”]/.test(prose)) fail(n, "curly quote");
	if (/: \S/.test(prose)) fail(n, "mid-sentence colon");
}

const h2 = (l) => (!l.code && l.text.startsWith("## ") ? l.text.slice(3).trim() : null);
const sections = [];
for (const l of lines) {
	const title = h2(l);
	if (title !== null) sections.push({ title, n: l.n, body: [] });
	else if (sections.length) sections.at(-1).body.push(l);
}
const find = (title) => sections.find((s) => s.title === title);
const bodyText = (s) => s.body.map((l) => l.text).join("\n");
const boxes = (ls) => ls.filter((l) => !l.code && BOX.test(l.text)).map((l) => ({ n: l.n, text: l.text.match(BOX)[1] }));
const hasBlock = (s, name) => s.body.some((l) => !l.code && l.text.startsWith(`**${name}**`));

const h1 = lines.findIndex((l) => !l.code && l.text.startsWith("# "));
if (h1 === -1) fail(1, "no H1 title");
const howToRead = find("How to read this");
if (!howToRead) fail(1, 'no "## How to read this" section');
if (h1 !== -1 && howToRead) {
	const intro = lines.slice(h1 + 1).filter((l) => l.n < howToRead.n && l.text.trim() !== "");
	if (intro.length >= 10) fail(lines[h1].n, `intro is ${intro.length} lines, under ten required`);
	const markers = single ? HOW_TO_READ_MARKERS : [...HOW_TO_READ_MARKERS, "playbooks/"];
	for (const marker of markers) {
		if (!bodyText(howToRead).includes(marker)) fail(howToRead.n, `How to read this lacks "${marker}"`);
	}
}

let prSections = [];
let program = null;
let close = null;

if (single) {
	prSections = sections.filter((s) => hasBlock(s, "Files."));
	if (prSections.length !== 1) {
		fail(1, `${prSections.length} PR sections, single mode requires exactly one`);
	}
} else {
	program = find("Program checklist");
	if (!program) fail(1, 'no "## Program checklist" section');
	else {
		const h3s = program.body.filter((l) => !l.code && l.text.startsWith("### ")).map((l) => l.text.slice(4).trim());
		let cursor = 0;
		for (const name of PROGRAM_H3) {
			const at = h3s.findIndex((t, i) => i >= cursor && t.startsWith(name));
			if (at === -1) fail(program.n, `Program checklist lacks "### ${name}" in order`);
			else cursor = at + 1;
		}
		for (const marker of PROGRAM_MARKERS) {
			const ok = marker instanceof RegExp ? marker.test(bodyText(program)) : bodyText(program).includes(marker);
			if (!ok) fail(program.n, `Program checklist lacks "${marker}"`);
		}
	}

	close = find("Close the program");
	if (!close) fail(1, 'no "## Close the program" section');
	const programIndex = sections.indexOf(program);
	const closeIndex = sections.indexOf(close);
	prSections = programIndex === -1 || closeIndex === -1 ? [] : sections.slice(programIndex + 1, closeIndex);
	if (prSections.length === 0) fail(1, "no PR sections between Program checklist and Close the program");
}

const expected = single ? SUB_BLOCKS.filter((s) => !SINGLE_OPTIONAL.includes(s)) : SUB_BLOCKS;
const boxedBlocks = ["Files.", "Build.", "You see.", "Verify, unit.", "Merge."];

const report = [];
for (const pr of prSections) {
	const heads = [];
	for (const l of pr.body) {
		if (l.code) continue;
		const m = l.text.match(/^\*\*([^*]+)\*\*(.*)$/);
		if (m && SUB_BLOCKS.includes(m[1])) heads.push({ name: m[1], n: l.n, rest: m[2].trim(), lines: [] });
		else if (heads.length) heads.at(-1).lines.push(l);
	}
	const names = heads.map((h) => h.name);
	// Whichever blocks are present must sit in the canonical order, and every
	// required block must be present.
	const order = SUB_BLOCKS.filter((s) => names.includes(s));
	if (names.join("|") !== order.join("|")) {
		fail(pr.n, `${pr.title}: sub-blocks are [${names.join(", ")}], out of canonical order`);
	}
	for (const name of expected) {
		if (!names.includes(name)) fail(pr.n, `${pr.title}: no **${name}** block`);
	}

	const block = (name) => heads.find((h) => h.name === name);
	const counts = {};
	for (const h of heads) counts[h.name] = boxes(h.lines).length;

	const depends = block("Depends on.");
	if (depends && depends.rest === "") fail(depends.n, `${pr.title}: Depends on names nothing`);
	for (const name of boxedBlocks) {
		const b = block(name);
		if (b && boxes(b.lines).length === 0) fail(b.n, `${pr.title}: ${name} has no box`);
	}
	for (const name of ["Verify, unit.", "Verify, live.", "Verify, perf."]) {
		const b = block(name);
		if (b && !b.rest.startsWith(RULE)) fail(b.n, `${pr.title}: ${name} does not open with the rule`);
	}

	const live = block("Verify, live.");
	if (live) {
		if (!live.rest.includes(LANES)) fail(live.n, `${pr.title}: Verify, live lacks "${LANES}"`);
		const lanes = boxes(live.lines).map((b) => ({ ...b, m: b.text.match(/^Lane (\d+)\. /) }));
		const numbers = lanes.filter((b) => b.m).map((b) => Number(b.m[1])).sort((a, b) => a - b);
		const wanted = single
			? Array.from({ length: Math.max(numbers.length, MIN_LANES_SINGLE) }, (_, i) => i + 1)
			: Array.from({ length: LANES_PROGRAM }, (_, i) => i + 1);
		if (numbers.join(",") !== wanted.join(",")) {
			const need = single ? `at least ${MIN_LANES_SINGLE}, numbered from 1 with no gap` : "1 to 10";
			fail(live.n, `${pr.title}: lanes are [${numbers.join(",")}], expected ${need}`);
		}
		for (const lane of lanes) {
			if (!lane.m) fail(lane.n, `${pr.title}: live box is not a lane`);
			else if (!/Save `[^`]+`/.test(lane.text)) fail(lane.n, `${pr.title}: lane ${lane.m[1]} names no evidence file`);
			else if (!lane.text.includes("Pass when")) fail(lane.n, `${pr.title}: lane ${lane.m[1]} has no pass predicate`);
		}
	}

	const perf = block("Verify, perf.");
	if (perf) {
		const items = boxes(perf.lines).map((b) => b.text.split(" ")[0]);
		if (items.join("|") !== PERF_ITEMS.join("|")) fail(perf.n, `${pr.title}: perf boxes are [${items.join(", ")}], expected [${PERF_ITEMS.join(", ")}]`);
	}

	const gate = block("Review gate.");
	if (gate) {
		const gateBoxes = boxes(gate.lines);
		if (gate.rest.startsWith("None.")) {
			if (gateBoxes.length) fail(gate.n, `${pr.title}: Review gate says None but has boxes`);
		} else {
			const text = gate.lines.map((l) => l.text).join("\n");
			if (gateBoxes.length === 0) fail(gate.n, `${pr.title}: Review gate has no box`);
			for (const word of ["screenshot", "video", "operator"]) {
				if (!text.includes(word)) fail(gate.n, `${pr.title}: Review gate lacks "${word}"`);
			}
		}
	}

	const total = boxes(pr.body).length;
	const cells = expected.filter((s) => s !== "Depends on.").map((s) => `${s.replace(/[ ,.]+/g, "-").replace(/-$/, "").toLowerCase()}=${counts[s] ?? 0}`);
	report.push(`${pr.title}  boxes=${total}  ${cells.join(" ")}`);
}

if (!single && close) {
	const tail = sections.slice(sections.indexOf(close) + 1);
	for (const s of tail) {
		if (!s.title.startsWith("Appendix")) fail(s.n, `"## ${s.title}" after Close the program is not an appendix`);
	}
	if (!tail.some((s) => s.title.includes("Prototype evidence"))) fail(close.n, 'no "## Appendix ... Prototype evidence" section');
}

for (const line of report) console.log(line);
console.log(`${prSections.length} PR section${prSections.length === 1 ? "" : "s"}, ${problems.length} problems`);
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
