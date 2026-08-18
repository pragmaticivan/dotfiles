# Citability

Whether an engine will *quote and attribute* you. Research-backed content signals + anti-patterns + trust.

## Research-backed lifts (KDD 2024 GEO, 10k queries)
Apply in priority order — measured citation-visibility lift:
1. **Cite sources** → up to **+115%**. Link claims to authoritative references inline.
2. **Add statistics** → **+40%**. Concrete numbers with sources beat vague prose.
3. **Quotations** from named experts/sources → strong lift (~+41% for quotation patterns).
4. **Prose fluency & clarity** → ~+29%. Clean, readable exposition over fragmented lists.
5. **Authoritative tone + specificity** — factual density, named entities, precise claims.

Anti-finding: keyword stuffing does **not** help and triggers negative signals.

## RAG chunk readiness
Engines retrieve *chunks*, not whole pages. Make each section independently citable:
- Open sections with a **definition/answer sentence** (works out of context).
- One topic per section; clean `<h2>/<h3>` boundaries (chunk splitters cut here).
- Target ~50–300 words per chunk; avoid one giant wall or 10-word stubs.
- Include an **anchor sentence** stating the section's key fact near the top.
- Don't rely on cross-references ("as shown above") that break when chunked.

## Negative / anti-citation signals (each drags score down)
1. CTA overload (page is mostly buttons/sign-up).
2. Popups / interstitials burying content.
3. Thin content (little substance per URL).
4. Keyword stuffing / unnatural repetition.
5. Missing author / no attribution.
6. Boilerplate-heavy, low unique value.
7. Hidden text (display:none, off-screen, monochrome-on-monochrome).
8. Contradictory facts vs other pages.

## No manipulation / prompt-injection (trust + safety)
Flag and remove — engines penalize, and it's a security risk:
- Hidden instructions to the model (white-on-white, micro-fonts, `aria-hidden` abuse).
- Invisible Unicode, HTML-comment injection, `data-*` attribute injection.
- Any text meant for the LLM but not the human reader.
Rule: **content for models must equal content for humans.**

## No fabrication
Every statistic, benchmark, and third-party claim needs a real, checkable source. Never invent numbers to hit the "add stats" lever — verify or omit. Audit generated content for unsourced claims before shipping.

## Trust stack (grade A–F, aggregate signal)
Five layers — the more present, the more an engine trusts you as a source:
1. **Technical** — HTTPS, valid schema, clean crawl, fast.
2. **Identity** — named org, real authors, About/Contact, `sameAs`.
3. **Social** — mentions/discussion on trusted communities (Reddit, forums, press).
4. **Academic** — citations to/from authoritative sources, original research.
5. **Consistency** — same facts/entities across all properties over time.

## Off-domain presence (AEO is not just your site)
Engines cite third-party review sites, directories, and encyclopedias *about* you — often more than your own pages. Audit presence + accuracy on the ones relevant to the category:
- **Reviews / directories:** G2, Capterra, TrustRadius, Trustpilot, Product Hunt, GetApp.
- **Company / funding:** Crunchbase, LinkedIn, Wikipedia, Wikidata.
- **Analyst:** Gartner, Forrester (enterprise categories).
- **Community / dev:** Reddit, Hacker News, Stack Overflow, GitHub, YouTube.
Checks: profile exists, claimed/verified, facts match your site (name, category, pricing), recent reviews. Gaps here = an engine describing you from stale or competitor-framed sources. Link these from `Organization.sameAs`. Feeds the Social + Academic trust layers.
