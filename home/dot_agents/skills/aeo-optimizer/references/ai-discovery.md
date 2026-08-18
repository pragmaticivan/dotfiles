# AI Discovery Endpoints

Beyond llms.txt: declarative files that let AI systems fetch structured facts/actions without scraping HTML. Emerging conventions — cheap to add, high upside.

## Files

### `/.well-known/ai.txt`
AI-usage disclosure + pointer file (sibling to robots.txt). States policy for AI use and links to your AI resources.
```
# ai.txt — AI usage policy & resources for {{Site}}
Contact: ai@{{domain}}
Policy: https://{{domain}}/ai-policy
Summary: https://{{domain}}/ai/summary.json
FAQ: https://{{domain}}/ai/faq.json
LLMs: https://{{domain}}/llms.txt
Training: allow   # or: disallow
```
See `assets/ai.txt.template`.

### `/ai/summary.json`
Declarative machine summary of what the site/product is — name, category, description, key entities, canonical URLs. See `assets/ai-summary.json`.

### `/ai/faq.json`
Structured Q&A endpoint mirroring your FAQPage schema — direct question→answer pairs an agent can ingest wholesale. See `assets/ai-faq.json`.

### `/ai/service.json` (apps/APIs)
Service description: capabilities, endpoints, auth, pricing, actions. Bridges to OpenAPI/MCP.

## WebMCP / potentialAction (actionable sites)
Make the page not just readable but *operable* by agents:
- **schema.org `potentialAction`** on entities → declares actions (SearchAction, OrderAction, ReserveAction) an agent can trigger.
- **Chrome WebMCP** (`registerTool()`): register in-page tools with names, descriptions, typed args so a browser agent can act. Audit for tool attributes + typed schemas.
- For backend products, ship a real **MCP server** (see `playbook-api.md`) — the strongest form of agent actionability.

## Audit checks
- `.well-known/ai.txt` returns 200 and parses.
- `/ai/summary.json` valid JSON, entity data matches on-page + Organization schema.
- `/ai/faq.json` present on FAQ-heavy sites, mirrors FAQPage.
- If site has user actions: `potentialAction` present, or WebMCP tools registered.

## Caveat
These are conventions, not universal standards — treat as additive to the proven trio (robots.txt + llms.txt + JSON-LD), not replacements. Don't over-invest if the fundamentals score low.
