# Content Patterns for AEO

How to write so answer engines extract and cite you.

## Answer-first structure
- Heading = the question, phrased as users ask AI ("What is X?", "How do I Y?", "X vs Y").
- **First sentence after the heading is the complete answer** (40–60 words, self-contained, quotable).
- Then expand: details, steps, caveats.
- Engines lift the lead paragraph — bury the answer and you lose the citation.

## Scannable formatting
- Bulleted lists for parallel facts.
- Numbered lists for sequences/steps (maps to `HowTo`).
- Tables for comparisons and specs (engines parse cells into structured facts).
- Bold the key term in each bullet.
- Short paragraphs (2–4 sentences); one idea each.

## Semantic HTML
- `<article>`, `<section>`, `<header>`, `<nav>`, `<h1>`–`<h3>` hierarchy (one `<h1>`).
- `<table>` for tabular data, `<dl>` for definitions, `<ol>`/`<ul>` for lists.
- Descriptive `alt` text; transcripts for media (text is what gets parsed).
- Avoid `<div>`-only layouts and content locked in images/canvas.

## Page-level
- Unique descriptive `<title>` and meta description.
- TL;DR / summary box at top of long pages.
- FAQ section near the end (pair with `FAQPage` schema).
- Stable, readable URLs (`/guides/auth` not `/p?id=92`).
- Internal links with descriptive anchor text → entity relationships.

## Authority signals
- Cite high-authority sources (.edu, .gov, standards bodies, primary docs).
- Include original stats, quotes, first-hand data — these drive ~40% citation lift.
- Named author + credentials + bio.
- Visible "Last updated" date; keep it true.

## Entity clarity
- State plainly: what it is, its category, who it's for, alternatives.
- Use consistent names for product/brand/features across all pages.
- Add a glossary for domain terms; link first mentions.

## Multimodal (text layers)
Engines parse text, not pixels. Every non-text asset needs a text equivalent:
- Descriptive `alt` on images; captions stating the takeaway.
- **Charts/graphs**: ship a text summary + HTML `<table>` of the data + JSON-LD, not just an SVG/PNG.
- Video/audio: transcripts + `VideoObject`/`AudioObject` schema.
- Data in images (screenshots of tables, infographics) → also provide as real HTML/markdown.

## Chunk-friendly (RAG)
See `citability.md`. Each `<h2>/<h3>` section should open with a definition/answer sentence and stand alone — engines retrieve by chunk, not whole page. Avoid "as shown above" cross-refs that break out of context.

## Anti-patterns
- Answer hidden after long preamble.
- Facts only inside images/screenshots/video with no text.
- Keyword-stuffing (engines favor semantic relevance, not density).
- Contradictory facts across pages (erodes trust signal).
- Walls of prose with no structure.
