# Playbook: Docs Sites / Knowledge Bases

Frameworks: Docusaurus, MkDocs (Material), Nextra, VitePress, Sphinx, Mintlify, GitBook.

## Highest-leverage moves
1. **Ship `llms.txt` + `llms-full.txt`.** Docs are the canonical AEO case. See `llms-txt.md`.
   - Docusaurus: `docusaurus-plugin-llms`.
   - Mintlify: auto-served — verify enabled.
   - MkDocs/VitePress: build-step generator from nav/manifest.
2. **Serve `.md` mirrors** of each page (most frameworks: append `.md` or use raw source). Link these from llms.txt.
3. **Answer-first pages.** Each page opens with a one-paragraph definition/answer. Question-shaped H1.
4. **`TechArticle` + `FAQPage` + `BreadcrumbList` JSON-LD** per page. `SoftwareApplication`/`APIReference` for product/API docs.
5. **Versioning clarity.** Mark current vs legacy; canonical-link current. AI must not cite deprecated docs as current.

## Structure
- Consistent nav hierarchy (maps to breadcrumbs).
- Per-page: TL;DR → concept → steps → examples → FAQ.
- Code blocks with language tags and copy-paste-complete examples.
- A `/glossary` page defining domain terms.
- Search action schema if site search exists.

## Freshness & trust
- Show "Last updated" (most doc themes support git-based dates).
- Changelog/release notes, dated.
- Link to source repo (authority + entity grounding).

## Crawl
- Static-rendered (most doc tools already are) — good for JS-blind crawlers.
- robots.txt allowing AI search bots + sitemap (themes usually auto-generate sitemap).

## Verify
- `llms.txt` links resolve; `.md` mirrors load.
- Validate one page's JSON-LD.
- Confirm sitemap includes all doc pages.
