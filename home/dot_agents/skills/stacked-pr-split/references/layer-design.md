# Designing the layers

Read this before writing `plan.json`. Deciding *where* the boundaries go is the part no script can do for you — everything downstream is mechanical.

## Contents

- [Size targets](#size-targets)
- [Strategies, in priority order](#strategies-in-priority-order)
- [Self-containment: definitions need callers](#self-containment-definitions-need-callers)
- [Finding the dependency edges](#finding-the-dependency-edges)
- [Linearizing a DAG](#linearizing-a-dag)
- [When a file straddles two layers](#when-a-file-straddles-two-layers)
- [PR body template](#pr-body-template)

## Size targets

Measured in **reviewer-weighted lines**: `source + (tests / 2)`, generated content excluded. `analyze-split.sh` computes this.

| Change type | Target |
|---|---|
| Bug fix / config | < 100 |
| New feature | 200–400 |
| Refactor | 300–500 |
| **Default** | **~300** |
| Hard cap | 600 |
| Don't bother splitting below | 200 |

These are heuristics from correlational data — SmartBear/Cisco's 2,500-review study, LinearB's 2025 analysis of 6.1M PRs (elite teams average under 219 lines/PR), Graphite's finding that 50-line PRs merge ~40% faster than 250-line ones. The mechanism is attention, not line count: past roughly 400 lines, reviewers stop reasoning about design and start pattern-matching for syntax problems.

So treat the numbers as a prompt to think, not a rule to satisfy. A cohesive 450-line layer beats an incoherent 280 + 170 split, and the hard cap exists because *nothing* survives review well past 600.

## Strategies, in priority order

### 1. Extract pure refactors to the bottom

Renames, file moves, interface extractions, and mechanical reformatting. Often 20–30% of a large diff at near-zero defect risk. As layer 1 it approves quickly and makes every layer above it smaller and legible — reviewers can see the actual behavior change instead of hunting for it inside a wall of moved code.

### 2. Split by architectural layer

The common case for a full-stack change. Bottom-up: schema/migrations → shared types → repository/data access → service/core logic → API/handlers → UI → integration tests. Bundle each layer's unit tests *with* that layer.

### 3. Split by vertical slice

Independently shippable sub-features, each touching all layers. Hardest to find and the highest review quality, because each PR is a complete, working, evaluable change with no forward references. Prefer it when the work genuinely decomposes this way.

### 4. Feature-flag the incomplete states

If the user needs layers to merge independently before the whole feature is ready, gate the feature behind a flag so each layer is independently mergeable while staying dark in production. This is what makes partial stack merges safe.

## Self-containment: definitions need callers

A reviewer cannot evaluate an API they can't see used. Ship every new definition with at least one usage, in this order of preference:

1. **A real production caller** — ideal.
2. **A contract or integration test** — acceptable when the real caller genuinely lives in a later layer, or when including it would blow the 600-line cap, or when the layer *is* a public API and the test *is* the contract.
3. **A unit test only** — last resort. A unit test can pass against a badly designed API.

Concretely: new function → a real call site; new type → a construction site; new module → the import wiring; new endpoint → a client or a contract test; **rename → every call site in the same layer**.

**Layer-boundary exception.** When splitting by architectural layer, it is legitimate for a layer's only callers to be its tests, because the real caller is one layer up. This is a real tradeoff, not a defect — but say so explicitly in the PR body's "Intentionally missing" section and link forward to the layer that consumes it. Undocumented, reviewers reasonably read it as dead code.

**Monorepo rename exception.** When a rename has an unmanageable number of call sites, ship a compatibility shim in the bottom layer and migrate callers over follow-up PRs rather than forcing one enormous layer.

Prefer a self-contained 450-line layer over splitting it into 280 + 170. Past the 600 cap, split anyway and document the dangling definition.

## Finding the dependency edges

Work from the file list in `analyze-split.sh` output. For each new or changed symbol, find who uses it *within the diff*:

```bash
# What new top-level symbols does this layer introduce?
git diff "$MERGE_BASE" "$SOURCE" -- <file> | grep -E '^\+.*(func|class|def|type|interface|const|export) '

# Who references a given symbol, restricted to files in the diff?
git diff --name-only --no-renames "$MERGE_BASE" "$SOURCE" \
  | xargs grep -ln '<SymbolName>' 2>/dev/null
```

Also check the cheap structural signals: new imports added to a file tell you what it now depends on; a new migration file implies every file touching that table sits above it; a new config key implies its readers sit above the layer that defines it.

Watch for **dependency cycles** between two files (each references the other). They cannot be separated — put them in the same layer. This is the most common reason a plan won't split as finely as the budget suggests, and it is worth stating out loud when you present the plan.

## Linearizing a DAG

A GitHub stack is **strictly linear** — one parent, one child, no branching. So an independent pair of chunks still has to be ordered. Rules of thumb:

- Fewer dependents → lower. Foundations first.
- Higher-risk, more-discussed changes → lower, so they get reviewed earliest and their feedback propagates up once.
- Changes that are *independently mergeable* → lower, so the bottom of the stack can start landing while the top is still under review.
- Genuinely unrelated work → **a different stack**. Don't pad a stack with a drive-by fix; one stack should tell one coherent story.

## When a file straddles two layers

`build-stack.sh` assigns files to layers by path, and rejects a plan that assigns one file twice. When a single file carries changes belonging to two different layers — say `router.go` gets layer-1 wiring *and* a layer-3 route — you have four options, in order of preference:

1. **Move the boundary.** Put both concerns in the same layer. Usually the right answer; the file is telling you the concerns are coupled.
2. **Assign the whole file to the higher layer**, if the lower layer doesn't need it to be coherent.
3. **Split the file** as part of the change (extract the layer-3 route into its own file). This is a real code change, so raise it with the user rather than doing it silently.
4. **Accept a coarser stack** with fewer, larger layers.

Do not duplicate the file across layers — the losslessness gate exists to catch exactly that, and it will fail.

## PR body template

Put this in each layer's `body` field. `gh stack submit --auto` turns the commit body into the PR body, so this is how it gets there.

```markdown
## Stack position

1 schema → 2 core → **3 api (this PR)** → 4 ui

Review bottom-up. Depends on #415, #416.

## What this layer does

Adds the `/auth/session` endpoints on top of the session store from #416.

## Intentionally missing

- No UI yet — the sign-in form lands in #418.
- Callers here are contract tests only; the real caller is in #418
  (layer-boundary self-containment exception).

## Full change

Compare `auth/4-ui` against `main` for the complete feature.
```

The "Intentionally missing" section is not optional politeness. Without it, reviewers file every deliberate forward reference as a defect, and you spend the review cycle explaining the split instead of discussing the code.
