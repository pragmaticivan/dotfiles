# Playbook: APIs / SDKs / Libraries / Repos

Goal: agents can **understand AND act**. Two audiences — engines that cite, agents that execute.

## Repo / README (entity + discovery)
1. **First screen of README answers:** what it is, what problem it solves, install, 60-second quickstart, minimal working example. This is the agent's answer-first paragraph.
2. Badges, language, license, links to docs/site (entity grounding).
3. `SoftwareSourceCode` / `SoftwareApplication` JSON-LD on the project site; consistent name everywhere.
4. `sameAs` linking repo ↔ docs ↔ package registry ↔ org.
5. Clear semantic versioning + dated CHANGELOG.

## API (machine-actionable)
1. ⭐ **Publish OpenAPI** (`openapi.json`/`.yaml`), current, with descriptions, examples, and auth documented. This is the single biggest agent-actionability win.
2. Stable, predictable, RESTful URLs; reads don't need client-side state.
3. Deterministic responses; machine-readable errors (codes + messages + types).
4. Documented, scriptable auth (API keys/OAuth) with examples.
5. Rate-limit headers and docs.
6. `APIReference` schema on API docs pages.

## MCP (first-class agent access)
- Consider shipping an **MCP server** so agents call the product directly as tools.
- Good when: the product has actions an agent would take (query data, create resources, run jobs).
- Expose read + write tools with clear names, descriptions, and typed schemas; stable tool IDs.
- Document install/connect steps. An MCP server turns "AI knows about you" into "AI can use you."

## SDK
- Typed signatures, docstrings, runnable examples per public function.
- Generated API reference site (TypeDoc, Sphinx, rustdoc) — link from llms.txt.
- Quickstart that copy-pastes to working code.

## llms.txt for dev projects
- Link: README, quickstart, full API reference `.md`, examples, changelog.
- Provide `llms-full.txt` concatenating core docs for one-shot agent ingestion.

## Verify
- OpenAPI validates (e.g. against the OpenAPI schema) and matches live endpoints.
- README quickstart actually runs.
- If MCP added: tools list and a sample call succeed.
