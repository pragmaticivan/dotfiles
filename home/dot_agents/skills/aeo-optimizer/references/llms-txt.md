# llms.txt

A standardized markdown file at site root (`/llms.txt`) that gives LLMs a curated, concise map of a site at inference time. Solves: context windows can't hold whole sites, and HTML→text is lossy. See https://llmstxt.org.

## Format

Strict ordering, all markdown:

1. **H1** — project/site name. *Only required element.*
2. **Blockquote** — short summary with key context.
3. Optional prose/lists — extra detail, no headings.
4. **H2 sections** — curated link lists: `- [Title](url): note`.
5. An H2 named `## Optional` — secondary links that can be dropped when context is tight.

```markdown
# Project Name

> One-sentence description of what this is and who it's for.

Key things to know before reading the docs.

## Docs

- [Quickstart](https://site/quickstart.md): Get running in 5 min
- [API Reference](https://site/api.md): All endpoints

## Examples

- [Tutorials](https://site/tutorials.md): End-to-end guides

## Optional

- [Changelog](https://site/changelog.md): Release history
```

## llms.txt vs llms-full.txt
- `llms.txt` — index/map (links + descriptions). Small.
- `llms-full.txt` — entire docs concatenated as clean markdown for one-shot ingestion. Large; generate from source.

## Generation rules
- Link to `.md` versions of pages when they exist (cleaner for LLMs).
- Keep descriptions factual and short.
- Order links by importance.
- Use absolute URLs (agents may fetch out of context).
- Regenerate on content change — stale llms.txt is worse than none.

## Framework support
- Docusaurus: `docusaurus-plugin-llms`.
- Nextra / VitePress / Mintlify: built-in or plugin `.md` export + llms.txt.
- Mintlify auto-serves `/llms.txt` and `/llms-full.txt`.
- Static sites: generate in build step from the page manifest.

See `assets/llms.txt.template`.
