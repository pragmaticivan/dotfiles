# Structured Data (schema.org / JSON-LD)

Machines and AI engines parse JSON-LD to understand entities and relationships. Rich results lift CTR (Rotten Tomatoes +25%, Nestlé +82%) and feed AI answer extraction.

## Rules
- **Use JSON-LD** in `<script type="application/ld+json">` — easiest to maintain, doesn't interleave with text.
- Mark up **only visible, accurate** content. Never blank pages just to hold schema.
- Include **all required properties** for the type or it won't qualify as a rich result.
- Validate: schema.org validator + Google Rich Results Test on the deployed URL.
- One graph per page is fine — use `@graph` to combine Organization + WebSite + page type.

## Type → use case

| Type | Use on |
|------|--------|
| `Organization` | Homepage / global. name, url, logo, sameAs[] |
| `WebSite` | Homepage. + `potentialAction` SearchAction |
| `Article` / `BlogPosting` / `NewsArticle` | Blog, news, editorial |
| `TechArticle` | Technical guides |
| `FAQPage` | Q&A pages (powerful for AEO — direct Q/A pairs) |
| `HowTo` | Step-by-step tutorials |
| `Product` / `Offer` / `AggregateRating` | Product/pricing pages |
| `SoftwareApplication` / `SoftwareSourceCode` | Apps, tools, repos |
| `APIReference` | API docs |
| `BreadcrumbList` | Navigation hierarchy |
| `Person` | Author bios + credentials |
| `Course` / `Event` / `LocalBusiness` | as applicable |

## High-AEO-value priorities
1. `Organization` + `sameAs` → entity grounding (Wikipedia, Wikidata, GitHub, LinkedIn, Crunchbase).
2. `FAQPage` → direct question→answer pairs are gold for answer engines.
3. `Article` with `author` (Person + credentials) + `datePublished`/`dateModified` → authority + freshness.
4. `Product`/`SoftwareApplication` with rating + offers → comparison queries.

## Templates
- `assets/schema-organization.jsonld`
- `assets/schema-faqpage.jsonld`
- `assets/schema-article.jsonld`

Adapt placeholders; keep values in sync with on-page text.
