# Monitoring (ongoing AEO)

AEO isn't one-shot — score, track, and defend against regression/decay.

## Citation tracking
Measure whether AI engines actually cite you:
- Query real engines with your customers' actual questions.
- Record per query: brand mentioned? domain cited as source? which competitors cited?
- Snapshot answers over time → trend of visibility and competitor gaps.
- Prioritize content for high-intent questions where competitors are cited but you aren't.
- **Test across 7+ engines** — ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews, plus **DeepSeek** and **Grok** (different indexes → different citations).

## Buyer-intent prompt set
Don't test random questions — build a structured prompt set covering the buyer journey, then run it across all engines:
- **Category / awareness:** "What is the best {{category}} tool?", "Top {{category}} software 2026".
- **Comparison:** "{{Brand}} vs {{Competitor}}", "{{Competitor}} alternatives", "Is {{Brand}} better than {{Competitor}}?".
- **Evaluation:** "Best {{category}} for {{use case / segment}}", "{{Brand}} pricing", "Is {{Brand}} worth it?".
- **Troubleshooting / how-to:** "How do I {{job}} with {{Brand}}?".
Generate ~15 prompts spanning these stages. Track per prompt × engine: mentioned / cited / sentiment / position. This is the ground-truth AEO metric — everything else is a proxy for winning these.

## Competitive coverage & share of voice
- **Share of voice** — across the prompt set × engines, % of answers that mention/cite you vs each competitor. The headline visibility number.
- **Coverage gaps** — comparison/"alternatives" queries where competitors appear and you don't → highest-priority content (build the comparison/alternatives page, see `content-strategy.md`).
- **Sentiment & position** — how engines describe you and whether you lead or trail in the answer.

## Per-platform citation profile
Engines weight signals differently — track readiness per platform:
- **ChatGPT / OAI-Search** — Bing-index + freshness + structured facts.
- **Perplexity** — heavy real-time crawl + explicit citations; direct answers + sources matter most.
- **Google AI Overviews** — traditional SEO + schema + E-E-A-T.
- **Gemini** — Google-Extended access + entity grounding.
Flag any platform whose required signals you're missing.

## Content decay / evergreen
Content loses citations as it ages. Predict and refresh:
- Decay types: **temporal** ("in 2024"), **statistical** (stats go stale), **version** (v3 docs), **event**, **price**.
- Score each page's evergreen-ness 0–100; schedule refresh for high-decay pages.
- Keep `dateModified` honest on every refresh (freshness is a top citation signal).

## Drift & coherence
- **Semantic drift** — signals degrading vs a saved snapshot (schema removed, llms.txt stale, links rotted).
- **Coherence** — cross-page terminology/entity consistency; contradictions erode trust.
- Re-audit periodically; compare score to last snapshot.

## CI/CD gating (for repos you control)
Treat AEO like a test:
- Run the scoring audit on deploy; **fail the build if score drops below a threshold** (e.g. 70) or regresses vs baseline.
- Persist snapshots; alert on drift.
- Emit machine formats (JSON/SARIF/JUnit) for pipeline integration where tooling supports it.

## Server-log crawler evidence
Parse access logs for AI bot user-agents (see `ai-crawlers.md`, 27 bots) to confirm engines are actually fetching you and which pages — ground truth that access works.
