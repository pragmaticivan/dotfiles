# Content Strategy (research → architecture → drafting)

For *growing* AI visibility with new content, not just fixing existing pages. Pipeline adapted from GTM-engineering practice.

## Golden rule
**SEO keyword = short search phrase. GEO prompt = complete user question.**
Optimize pages for the actual questions people type into ChatGPT/Perplexity, not just head terms.

## Pipeline

### 1. Brand & entity DNA
Capture positioning, category, audience, competitors, voice → the entity facts every page must state consistently. Feeds `sameAs` and Organization schema.

### 2. GEO-prompt research
Find the real questions users ask AI about the category:
- Autocomplete, People Also Ask, related searches, "vs"/"alternatives"/"best X for Y" patterns.
- Full-question form: "What's the best X for Y?", "How do I do Z with X?", "Is X better than W?".
- Classify by intent: informational / comparative / transactional / troubleshooting.
- Output a prompt-target list (question, intent, priority, target page).

### 3. Community mining
Reddit/forums/Discord/Stack Overflow surface authentic language + pain points + citation-worthy threads. Extract real phrasing users use → mirror it in headings/answers. Also a Social-trust and backlink/mention source.

### 4. Topical authority architecture
Cluster targets into **pillar + supporting pages** (hub-and-spoke):
- One pillar page per core topic (broad, definitive, heavily interlinked).
- Supporting pages answer specific sub-questions, link up to pillar.
- Dense internal linking with descriptive anchors → entity/topic graph.
- Depth (breadth of entity coverage) + interlinking density = authority signal.
Output a content architecture: page priority, URL, page type, target prompt, schema type.

### 5. Draft answer-first content
Per page (see `content-patterns.md` + `citability.md`):
- Question-shaped H1/H2; direct self-contained answer first.
- Sourced stats, expert quotes, original data (the citability levers).
- Lists/tables, RAG-friendly chunks, matching JSON-LD.
- Author + credentials + real dates.

### 6. Audit before publish
- No fabricated stats/claims — every one sourced.
- Facts consistent with the rest of the site (single source of truth).
- Entity naming consistent; schema matches visible text.

## Proof-page presence (content signals engines look for)
Engines expect certain page types as trust/decision signals. Audit which exist and are linked from nav + sitemap + llms.txt:
- **FAQ** (+ FAQPage schema) · **Pricing** (real table + Offer schema) · **Docs** · **Case studies / customers** · **Reviews / testimonials** (+ Review schema) · **Comparison / "vs" / alternatives** · **About** (org + team) · **Contact** · **Blog / resources** · **Changelog**.
Missing high-value pages (pricing, comparison, FAQ, case studies) are common citation gaps. Each becomes a prioritized content task.

## Off-site (earn trust + mentions)
- Brand mentions on trusted communities/press feed Social + Academic trust layers and future model training.
- Comparison / "alternatives" pages capture evaluative AI queries.
- Charts/visuals need **text layers** (summary, HTML table, structured data) — pixels alone aren't parseable.
