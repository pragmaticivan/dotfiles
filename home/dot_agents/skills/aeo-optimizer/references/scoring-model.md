# AEO Scoring Model (0–100)

The audit engine. Score each category, sum to 100, map to a band. Weights reflect research: **infrastructure (crawl + entry points + schema) dominates** because unparseable content can't be cited regardless of wording.

## Weights & bands

| # | Category | Max | Focus |
|---|----------|-----|-------|
| 1 | Crawl access | 18 | AI bots allowed (3 tiers), no CDN block, JS-render safe, sitemap fresh |
| 2 | AI entry points | 16 | llms.txt (H1+blockquote+sections+depth), llms-full.txt, .md mirrors |
| 3 | Structured data | 16 | Organization, WebSite+SearchAction, FAQPage, Article, ≥5 props/type, valid |
| 4 | Citability | 14 | Answer-first, citations, stats, RAG-chunk readiness, no negative signals |
| 5 | Content structure | 12 | Question headings, semantic HTML, lists/tables, multimodal text layers |
| 6 | Authority & entity | 10 | E-E-A-T, author+credentials, sameAs links, off-domain presence, competitive coverage, coherence |
| 7 | Freshness & signals | 8 | dateModified accurate, lang attr, RSS/Atom, low decay risk |
| 8 | AI discovery & actionability | 6 | .well-known/ai.txt, /ai/summary.json, /ai/faq.json, OpenAPI/MCP/WebMCP |

**Bands:** 0–35 Critical · 36–67 Foundation · 68–85 Good · 86–100 Excellent.

## Per-category checks (⭐ = highest leverage within category)

### 1. Crawl access (18)
- ⭐ robots.txt does not block wanted AI bots (see `ai-crawlers.md`, 3 tiers).
- ⭐ Content in initial server-rendered HTML (AI crawlers often skip JS).
- No CDN/WAF (Cloudflare/Akamai/Vercel) blocking GPTBot/ClaudeBot/PerplexityBot.
- sitemap.xml present, fresh `lastmod`, referenced in robots.txt.
- No stray `noindex`/`nofollow`/auth wall on citable pages; fast TTFB.

### 2. AI entry points (16)
- ⭐ `/llms.txt` at root, valid (H1 + blockquote + H2 sections + links).
- `/llms-full.txt` for one-shot ingestion.
- `.md` mirrors of key HTML pages, linked from llms.txt.
- Clean URL→content mapping (no hash-router-only content).

### 3. Structured data (16)
- ⭐ `Organization` (+ `sameAs`) and `WebSite` (+ `SearchAction`) globally.
- ⭐ Content-type schema per page: FAQPage / Article / HowTo / Product / SoftwareApplication / APIReference / TechArticle.
- BreadcrumbList; Person author with credentials.
- Entity richness: ≥5 meaningful props per type; JSON-LD valid; visible content only.

### 4. Citability (14) — see `citability.md`
- ⭐ Direct, self-contained answer under each heading (+115% when sourced).
- Citations to high-authority sources; statistical density (+40%).
- RAG-chunk ready: sections open with definitions, clean heading boundaries.
- Zero negative signals (hidden text, keyword stuffing, thin content, popups, no author).
- No prompt-injection / manipulation patterns.

### 5. Content structure (12) — see `content-patterns.md`
- Question-shaped headings; semantic HTML (`<article>/<section>/<table>/<dl>`).
- Lists/tables for scannable facts; short quotable paragraphs.
- Descriptive title + meta description; TL;DR on long pages.
- Multimodal: image alt, captions, transcripts, VideoObject/AudioObject (text layers on charts).

### 6. Authority & entity (10)
- ⭐ `sameAs` → Wikipedia, Wikidata, Crunchbase, GitHub, LinkedIn, social (entity grounding).
- ⭐ Off-domain presence accurate on category directories/reviews (G2, Capterra, Trustpilot, Product Hunt, Gartner…). See `citability.md`.
- Competitive coverage: comparison/"alternatives" pages exist for key rivals. See `content-strategy.md`, `monitoring.md`.
- Consistent naming everywhere; cross-page terminology coherence.
- Visible author + bio/credentials; disambiguation + glossary.
- Proof pages present (FAQ, pricing, case studies, docs). See `content-strategy.md`.

### 7. Freshness & signals (8)
- ⭐ Accurate `dateModified` + visible "Updated Mon YYYY".
- `<html lang>`, RSS/Atom feed, dated changelog.
- Low content-decay risk (evergreen framing; no stale stats/versions/prices). See `monitoring.md`.

### 8. AI discovery & actionability (6) — see `ai-discovery.md`, `playbook-api.md`
- `.well-known/ai.txt` present; `/ai/summary.json`, `/ai/faq.json`, `/ai/service.json` where relevant.
- WebMCP `registerTool()` / schema.org `potentialAction` for actionable sites.
- Apps/APIs: current OpenAPI, stable URLs, consider MCP server.

## Output format
Emit:
1. Per-check table: `| # | Category | Check | Status | Evidence | Pts (x/max) |`
2. Category subtotals + **Total /100 + Band**.
3. One paragraph: top 3 highest-impact gaps and expected lift.
