# AI Crawlers, robots.txt, sitemap

AI engines can't cite what they can't fetch. Decide which bots to allow, then make access easy.

## Three tiers of AI bot
Classify every bot before writing rules — the AEO impact differs sharply:
- **Search / answer bots** — build the index engines cite from. **Allowing these is the whole point of AEO.**
- **User-agent (live-fetch) bots** — fetch on a user's action to answer/verify in real time. Allow for citation.
- **Training bots** — crawl for model pre-training. **Policy choice**: allowing grows future model knowledge of your brand; blocking protects content.

| Bot user-agent | Operator | Tier |
|----------------|----------|------|
| `OAI-SearchBot` | OpenAI | Search |
| `ChatGPT-User` | OpenAI | User-agent |
| `GPTBot` | OpenAI | Training |
| `PerplexityBot` | Perplexity | Search |
| `Perplexity-User` | Perplexity | User-agent |
| `ClaudeBot` | Anthropic | Training |
| `Claude-Web` / `Claude-User` | Anthropic | User-agent |
| `Googlebot` | Google | Search (feeds AI Overviews) |
| `Google-Extended` | Google | Training opt-in token (controls Gemini use of Googlebot data; not a crawler) |
| `Applebot` / `Applebot-Extended` | Apple | Search / Training |
| `Bytespider` | ByteDance | Training |
| `CCBot` | Common Crawl | Training (open dataset, feeds many models) |
| `Amazonbot`, `Meta-ExternalAgent`, `cohere-ai`, `Diffbot`, `Timpibot`, `YouBot`, `DuckAssistBot`, `PetalBot` | various | Search/Training |

(~27 named AI crawlers exist across these operators; the above are the high-impact ones. Match user-agents case-insensitively.)

## robots.txt strategy
- To **maximize AEO**: allow all **search** + **user-agent** bots — these surface citations. Never block them silently.
- **Training** bots are a deliberate tradeoff — present it to the user, don't decide unilaterally.
- Always reference the sitemap.
- Blocking everything kills AEO. Confirm intent before any `Disallow: /` for an AI bot.

## CDN / WAF blocking (common silent killer)
robots.txt can say "allow" while the edge blocks the bot anyway:
- Cloudflare "Block AI bots" / Bot Fight Mode, Akamai, Vercel firewall, Fastly rules often drop GPTBot/ClaudeBot/PerplexityBot by default.
- Check edge/WAF config, not just robots.txt. Test by fetching as the bot user-agent.
- Reconcile: if robots allows but requests 403/429, the CDN is the real gate.

See `assets/robots.txt.snippet`.

## Sitemap
- `sitemap.xml` with `<lastmod>` accurate (freshness signal).
- Split large sites into sitemap index.
- Reference in robots.txt: `Sitemap: https://site/sitemap.xml`.

## Rendering
- Many AI crawlers **don't execute JS**. Server-render or pre-render content meant to be cited.
- Ensure critical text is in initial HTML, not hydrated client-side only.
- Fast TTFB; avoid bot rate-limiting that drops crawlers.
