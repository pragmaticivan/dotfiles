---
name: aeo-optimizer
description: "Master skill to audit, score, and improve a project's Answer Engine Optimization (AEO) / Generative Engine Optimization (GEO) so AI agents and answer engines (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews) can discover, parse, trust, cite, and act on its content. Use whenever the user mentions AEO, GEO, LLMO, AI SEO, llms.txt, ai.txt, 'getting cited by AI', 'optimize for ChatGPT/Perplexity', 'AI visibility', citation tracking, making a site/docs/repo 'AI-readable' or 'agent-friendly', or wants to improve how AI tools find and represent their project — even if they don't say 'AEO' explicitly. Works on websites, docs sites, marketing pages, SaaS apps, APIs, and code repos. Produces a 0–100 score, prioritized fixes, and generated artifacts."
---

# AEO Optimizer (master)

Make a project legible, trustworthy, and citable to AI answer engines and autonomous agents. AEO is to answer engines what SEO is to search results: structure content so models can **find it, parse it, trust it, cite it, and act on it**.

Grounded in research: KDD 2024 *GEO* (Cite Sources +115%, Statistics +40%), AutoGEO (ICLR 2026), C-SEO Bench (2025) — headline finding: **infrastructure (crawl access, llms.txt, schema) beats prose tweaks; if crawlers can't fetch and parse you, wording doesn't matter.**

## When to use

Trigger on: "improve AEO/GEO", "optimize for ChatGPT/Perplexity/Claude/AI Overviews", "add llms.txt/ai.txt", "make my docs AI-readable", "why isn't AI citing us", "track AI citations", "agent-friendly site/API", or any request to make a project discoverable/usable by AI.

## Workflow

Run phases in order. Use TaskCreate for anything beyond a single page.

### Phase 0 — Detect project type
Classify before auditing — the playbook differs:
- **Docs / knowledge base** (mkdocs, docusaurus, nextra, sphinx, vitepress, mintlify) → `references/playbook-docs.md`
- **Marketing / content / SaaS site** (Next.js, Astro, WordPress, blog) → `references/playbook-web.md`
- **API / SDK / library repo** (OpenAPI, README, package manifest) → `references/playbook-api.md`

Detect via config files (`mkdocs.yml`, `docusaurus.config.*`, `astro.config.*`, `next.config.*`), `package.json`, `openapi.*`, `docs/`, `README.md`, deployed URL if given. State detected type + confidence. Ask only if ambiguous.

### Phase 1 — Audit & score
Evaluate against `references/scoring-model.md` — a weighted **0–100** score across 8 categories with band (Critical/Foundation/Good/Excellent). For each check record **status** (pass/partial/fail/N-A), **evidence** (`file:line` or URL), **weight**. Cover:
1. Crawl access — robots.txt, 3-tier AI bots, CDN blocking, JS-render, sitemap → `references/ai-crawlers.md`
2. AI entry points — `llms.txt`/`llms-full.txt`, `.md` mirrors → `references/llms-txt.md`
3. AI discovery — `.well-known/ai.txt`, `/ai/summary.json`, `/ai/faq.json`, WebMCP/`potentialAction` → `references/ai-discovery.md`
4. Structured data — JSON-LD coverage & validity → `references/structured-data.md`
5. Citability — direct answers, citations, stats, RAG-chunk readiness, negative signals, trust → `references/citability.md`
6. Content structure — question-headings, semantic HTML, lists/tables, multimodal → `references/content-patterns.md`
7. Authority / entity / freshness — E-E-A-T, sameAs grounding, dateModified, decay
8. Agent actionability (apps/APIs) — OpenAPI, MCP, stable URLs → `references/playbook-api.md`

Output a scored table + the 0–100 total + band. Not prose.

### Phase 2 — Prioritize
Rank findings by **impact ÷ effort**. Lead with high-leverage, low-effort wins (usually: crawl access, `llms.txt`, JSON-LD on key pages, direct-answer restructuring, `ai.txt`). Group: Quick wins / Structural / Ongoing. Present plan; get go-ahead before large edits (user's "think before coding" rule).

### Phase 3 — Content strategy (optional, when growing coverage)
If the goal is *new* AI visibility (not just fixing existing pages), run the research→content pipeline in `references/content-strategy.md`: GEO-prompt research → topical-authority architecture → answer-first drafting. Rule: **SEO keyword = short phrase; GEO prompt = complete user question.**

### Phase 4 — Implement
Apply approved changes; match project style + framework idioms. Use templates in `assets/`. Never fabricate data — every stat/claim needs a real source (`references/citability.md`). After generating schema/`llms.txt`/`ai.txt`, validate (Phase 6).

### Phase 5 — Monitor (optional, ongoing)
Set up citation tracking, drift/decay detection, and CI score-gating per `references/monitoring.md`.

### Phase 6 — Verify
- JSON-LD: required props present, valid types; user runs Rich Results Test / schema.org validator on deployed URL.
- `llms.txt`/`ai.txt`/`/ai/*.json`: valid syntax, links resolve, follow specs.
- robots.txt: intended AI bots allowed, sitemap referenced, not CDN-blocked.
- List what only the user can verify post-deploy (live crawl, real citation checks).

## Core principles (the "why")
1. **Infrastructure first.** Crawl access + parseable structure outweigh prose. Fix fetch/parse before wording.
2. **Curated > raw.** Hand models clean entry points (`llms.txt`, `.md` mirrors, `/ai/*.json`) not HTML cruft.
3. **Answer first.** Direct answer immediately under a question-shaped heading; details below.
4. **Chunk-friendly.** Self-contained sections with definition openings — engines retrieve by chunk (RAG), not whole page.
5. **Be citable.** Cite sources (+115%), add stats (+40%), show authors/dates, original data. Never fabricate.
6. **One source of truth.** Consistent facts/entities across properties; contradiction erodes trust.
7. **Fresh wins.** Most AI citations come from recently updated content — keep `dateModified` real; watch decay.
8. **Agent-actionable.** Apps/APIs: stable URLs, OpenAPI, MCP/WebMCP.
9. **No manipulation.** No hidden text, prompt injection, keyword stuffing — engines penalize and it's a trust risk.

## Reference files
- `references/scoring-model.md` — weighted 0–100 rubric, 8 categories, bands (**the audit engine**)
- `references/llms-txt.md` — llms.txt / llms-full.txt spec + generation
- `references/ai-discovery.md` — ai.txt, /ai/*.json endpoints, WebMCP
- `references/structured-data.md` — schema.org/JSON-LD per content type
- `references/ai-crawlers.md` — 27 bots in 3 tiers, robots.txt, CDN/JS-render checks
- `references/citability.md` — research-backed lifts, RAG chunks, negative signals, trust stack, no-fabrication
- `references/content-patterns.md` — answer-first, semantic HTML, multimodal
- `references/content-strategy.md` — GEO-prompt research → topical authority → drafting
- `references/monitoring.md` — citation tracking, drift/decay, CI gating, per-platform profiles
- `references/playbook-docs.md` / `playbook-web.md` / `playbook-api.md` — per-type guides

## Templates (`assets/`)
`llms.txt.template` · `robots.txt.snippet` · `ai.txt.template` · `ai-summary.json` · `ai-faq.json` · `schema-organization.jsonld` · `schema-faqpage.jsonld` · `schema-article.jsonld`
