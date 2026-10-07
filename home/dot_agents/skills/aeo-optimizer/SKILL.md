---
name: aeo-optimizer
description: "Audits and improves Answer Engine Optimization so AI answer engines can find, parse, and cite a project. Use for AEO, GEO, llms.txt, ai.txt, AI visibility, or when ChatGPT, Perplexity, or Claude does not cite a site, docs, or API."
---

# AEO Optimizer (master)

Make a project legible, trustworthy, and citable to AI answer engines and autonomous agents, so models can **find it, parse it, trust it, cite it, and act on it**.

## Workflow

Run phases in order. Track the phases in a to-do list for anything beyond a single page.

### Phase 0 — Detect project type
Classify before auditing — the playbook differs:
- **Docs / knowledge base** (mkdocs, docusaurus, nextra, sphinx, vitepress, mintlify) → `references/playbook-docs.md`
- **Marketing / content / SaaS site** (Next.js, Astro, WordPress, blog) → `references/playbook-web.md`
- **API / SDK / library repo** (OpenAPI, README, package manifest) → `references/playbook-api.md`

Detect via config files (`mkdocs.yml`, `docusaurus.config.*`, `astro.config.*`, `next.config.*`), `package.json`, `openapi.*`, `docs/`, `README.md`, deployed URL if given. Ask only if ambiguous. Open the reply with the result, even when the user asked for something narrower:

`Project type: <type> (<high|medium|low> confidence). Evidence: <file, or the user's words>. Playbook: <file>.`

### Phase 1 — Audit & score
Score against `references/scoring-model.md` — a weighted **0–100** score across 8 categories with a band. For each check record **status**, **evidence** (`file:line`, URL, or "user report"), and **points**, per the scoring rules there. Categories:
1. Crawl access (18) — robots.txt, 3-tier AI bots, CDN blocking, JS-render, sitemap → `references/ai-crawlers.md`
2. AI entry points (16) — `llms.txt`/`llms-full.txt`, `.md` mirrors → `references/llms-txt.md`
3. Structured data (16) — JSON-LD coverage & validity → `references/structured-data.md`
4. Citability (14) — direct answers, citations, stats, RAG-chunk readiness, negative signals, trust → `references/citability.md`
5. Content structure (12) — question-headings, semantic HTML, lists/tables, multimodal → `references/content-patterns.md`
6. Authority & entity (10) — E-E-A-T, sameAs grounding, off-domain presence
7. Freshness & signals (8) — dateModified, lang, feeds, decay → `references/monitoring.md`
8. AI discovery & actionability (6) — `.well-known/ai.txt`, `/ai/*.json`, WebMCP, OpenAPI/MCP → `references/ai-discovery.md`, `references/playbook-api.md`

Emit the output format in `scoring-model.md` before any fix.

### Phase 2 — Prioritize
Rank findings by **impact ÷ effort**. Lead with high-leverage, low-effort wins (usually: crawl access, `llms.txt`, JSON-LD on key pages, direct-answer restructuring, `ai.txt`). Group: Quick wins / Structural / Ongoing. Present plan; get go-ahead before large edits.

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

Fix each failure, then repeat the check until it passes.

## Core principles (the "why")
1. **Infrastructure first.** Crawl access + parseable structure outweigh prose (C-SEO Bench 2025, AutoGEO). If crawlers can't fetch and parse you, wording doesn't matter.
2. **Curated > raw.** Hand models clean entry points (`llms.txt`, `.md` mirrors, `/ai/*.json`) not HTML cruft.
3. **Answer first.** Direct answer immediately under a question-shaped heading; details below.
4. **Chunk-friendly.** Self-contained sections with definition openings — engines retrieve by chunk (RAG), not whole page.
5. **Be citable.** Cite sources (+115%), add stats (+40%) per KDD 2024 GEO, show authors/dates, original data. Never fabricate. This applies to your own replies too: quote research figures only as the references give them, and do not promise ranking or citation outcomes.
6. **One source of truth.** Consistent facts/entities across properties; contradiction erodes trust.
7. **Fresh wins.** Most AI citations come from recently updated content — keep `dateModified` real; watch decay.
8. **Agent-actionable.** Apps/APIs: stable URLs, OpenAPI, MCP/WebMCP.
9. **No manipulation.** No hidden text, prompt injection, keyword stuffing — engines penalize and it's a trust risk.

## Templates (`assets/`)
`llms.txt.template` · `robots.txt.snippet` · `ai.txt.template` · `ai-summary.json` · `ai-faq.json` · `schema-organization.jsonld` · `schema-faqpage.jsonld` · `schema-article.jsonld`
