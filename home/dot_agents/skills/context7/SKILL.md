---
name: context7
description: 'Fetch current library documentation through the Context7 REST API. Use for "how do I use X library", an unfamiliar framework API, or a version-specific migration question.'
allowed-tools: Bash(python:*)
---

# Context7 Documentation Lookup Skill

Fetch current library documentation, API references, and code examples without MCP context overhead.

Run every command from this skill's directory. The script uses only the Python standard library.

## Workflow

### Step 1: Find the library ID

Skip the search when you know the ID:

- React: `/reactjs/react.dev`
- Next.js: `/vercel/next.js`
- Prisma: `/prisma/web`
- Supabase: `/supabase/supabase`
- Express: `/expressjs/express`

Otherwise search, then pick the result whose name and description match the user's library:

```bash
python3 scripts/context7.py search "next.js"
```

```txt
ID: /vercel/next.js
Name: Next.js
Snippets: 5304 | Score: 90
```

### Step 2: Fetch documentation

```bash
python3 scripts/context7.py docs "<library-id>" "[topic]" "[mode]"
```

- `topic`: optional focus area, such as `hooks`, `routing`, or `authentication`.
- `mode`: `code` (default) for API references and examples, `info` for conceptual guides.

```bash
python3 scripts/context7.py docs "/vercel/next.js" "middleware authentication"
python3 scripts/context7.py docs "/vercel/next.js" "app router" info
```

For a specific version, append a Context7 version tag to the ID, such as `/vercel/next.js/v13.5.11`. A tag such as `/14` returns 404. When no tag matches, put the version in the topic: `"middleware in Next.js 14"`.

### Step 3: Answer from the docs

Verify the documentation matches the user's version before you answer. Then give version-specific answers with the official code patterns, the correct API signatures, and any caveats or deprecations. Cite the source URL when the docs include one.

## Recovery

1. **Empty or irrelevant results.** Try a broader topic (`hooks` instead of `useEffect cleanup`), switch between `code` and `info`, or confirm the ID with a fresh search.
2. **Library not found or HTTP 301.** The ID moved or is wrong. Search with alternative names (`nextjs`, `next.js`, `vercel next`) and check the `/org/project` format.
3. **Rate limited.** Tell the user that a free `CONTEXT7_API_KEY` from [context7.com/dashboard](https://context7.com/dashboard) raises the limit. Fall back to general knowledge and say so.
4. **Network error.** Check connectivity with `python3 scripts/context7.py search "react"`.

---

> **License:** MIT License
> **Author:** Arvind Menon
> **Based on:** Context7 REST API by Upstash
