# Playbook: Marketing / Content / SaaS Sites

Frameworks: Next.js, Astro, Remix, SvelteKit, WordPress, Webflow.

## Highest-leverage moves
1. **Server-render / pre-render** content meant to be cited. AI crawlers often skip JS. Use SSG/SSR/ISR; avoid client-only content.
2. **JSON-LD per page type:** `Organization` + `WebSite` globally; `Article`/`BlogPosting` on posts; `Product`/`SoftwareApplication` + `Offer` + `AggregateRating` on product/pricing; `FAQPage` on FAQ; `BreadcrumbList` sitewide. See `structured-data.md`.
3. **`Organization.sameAs`** → Wikipedia, Wikidata, Crunchbase, LinkedIn, GitHub, X. Grounds the brand entity.
4. **Answer-first blog/landing copy.** Question H2s + direct answers + tables/lists. See `content-patterns.md`.
5. **`llms.txt`** mapping key pages (product, docs, pricing, about, top posts).

## Content site (blog)
- Question-based article titles and H2s.
- Author bios + `Person` schema with credentials.
- Original data, cite sources, "Updated" dates + `dateModified`.
- FAQ block + `FAQPage` schema on cornerstone posts.
- Internal links with descriptive anchors → topic clusters.

## SaaS product pages
- Clear "what it is / who it's for / category / alternatives" statement (comparison-query bait).
- Pricing as a real `<table>` with `Offer` schema.
- Comparison and "vs competitor" pages (engines surface these for evaluative queries).
- Integrations/feature pages individually addressable and schema'd.

## Technical
- robots.txt allows AI search bots; sitemap with accurate `lastmod`.
- Fast TTFB, Core Web Vitals (also a crawl-budget signal).
- Canonical tags; no duplicate/contradictory product facts across pages.
- Open Graph / meta description per page.

## Verify
- View-source shows content in initial HTML (not JS-only).
- Validate Organization + one page-type schema.
- llms.txt + sitemap + robots.txt present and consistent.
