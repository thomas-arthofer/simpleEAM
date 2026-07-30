# Phase 2: Canonical Sovereignty Evaluation & UX Diagnostics - Research

**Researched:** 2026-07-30
**Domain:** Backend-owned graph chain evaluation (Neo4j/GraphQL) + React/MUI diagnostics UI + Excalidraw diagram markers
**Confidence:** HIGH (codebase-verified architecture and schema; MEDIUM on exact `@neo4j/graphql` custom-resolver wiring details, which are CITED from official docs but not yet used anywhere in this codebase)

## Summary

This phase has no missing domain knowledge to discover — the milestone-level research (`ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md`) and the interactively-confirmed `02-CONTEXT.md` (D-01..D-10) already freeze the semantic contract. What remained to verify for planning is **how the existing codebase is actually wired**, because the plan must slot a brand-new backend capability into a server that currently has **zero custom GraphQL resolvers** — it is 100% auto-generated CRUD from `@neo4j/graphql` 7.1.1 reading `server/src/graphql/schema.graphql` directly into `Neo4jGraphQL({ typeDefs, driver, features })`. There is no `resolvers` argument anywhere today, no `@cypher` directive usage, and no service-layer module in `server/src/` at all. This is the single largest new-pattern risk for the plan: introducing custom resolvers/`@cypher` fields is well-documented by Neo4j but unprecedented in this repository, so the plan should budget a Wave 0 spike to prove the wiring (schema merge or `@cypher` query field) before building the full evaluation engine on top of it.

The second key finding is that the client-side inheritance logic to be deleted (`client/src/components/sovereignty/utils.ts`) and the Temporal batch formula (`ai-server/temporal/sovereignty/activities.ts`) are both small, self-contained, and already structurally mirror the traversal shape the canonical engine needs (visited-set stack traversal, `hostedOn`/`parentInfrastructure`/`components` walks) — so the "delete and replace" work is bounded and low-risk, not a rewrite of unknown scope. The diagram side (SUX-03/04) has **no existing status-marker precedent** to reuse structurally, but it does have a directly reusable icon-binding mechanism (`boundElements` + `createIconElement`, already used for element-type icons) and a reusable color-mutation precedent (`markMissingElements` in `databaseSyncUtils.ts`, which already mutates `strokeColor`/`strokeWidth` on synced elements) — both are good templates for fill/ring marker rendering.

**Primary recommendation:** Build one `server/src/sovereignty/` module (repository + evaluator, no dependency on GraphQL request context) exposed to GraphQL via `@graphql-tools/schema` mergeSchemas over `neoSchema` (already a server dependency, unused today) rather than via `@cypher` directives, because the evaluation logic is imperative TypeScript (classification, chain-walk, dedup), not a single Cypher projection — prove this wiring in a throwaway Wave 0 spike before committing task breakdown to it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-element explicit sovereignty read (own `sovereigntyAch*`) | API / Backend | Database / Storage | Fields already exist on nodes; no inheritance may occur, so this must be a direct read, not a client aggregation |
| Chain traversal (BusinessCapability/DataObject → Application/AIComponent → Infrastructure, multi-parent, composite apps) | API / Backend | Database / Storage | Graph-shaped problem; Cypher/driver-level traversal with cycle-safe visited-set, not GraphQL nested-query composition in the client |
| Finding classification (RED/YELLOW/GREY/GREEN) | API / Backend | — | Pure business logic over resolved chain data; must be identical for detail reads, background recompute, and markers (SOV-05) |
| Company-level rollup fields (`expectedSovereigntyScore` etc.) | API / Backend (Temporal-triggered) | — | `ai-server` Temporal workflow keeps the *trigger* role but must call into the same backend evaluation module (D-06), not its own formula |
| Element detail sovereignty panel | Frontend Server (SSR)/Client | API / Backend | Next.js client component renders a DTO fetched via Apollo; zero client-side recomputation (Anti-Pattern 1) |
| Diagram fill/ring markers | Browser / Client | API / Backend | Excalidraw canvas is browser-only; it must render a batch marker DTO fetched once per visible diagram, not recompute per element |
| Feature-flag gating of markers | Browser / Client | — | Reuses existing `featureFlags.Sovereignty` client-side flag (D-09); no new backend gating needed |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

- **D-01:** Multi-parent infrastructure is evaluated as **all edges independently** — every `hostedOn`/`parentInfrastructure` target must independently satisfy the requirement; a violation on any edge produces its own named finding (the specific Infrastructure id), never a "worst of several" pick.
- **D-02:** Composite/container applications are evaluated as **two independent things**: the container's own `sovereigntyAch*` fields are chain-checked like any entity (GREY if empty, never hidden), AND each component application is independently chain-checked too. The old `buildEffectiveApplication()` "hide container values" behavior is removed entirely.
- **D-03:** Cycle safety uses a **visited-node-id-per-path** guard (reusing the existing `visitedApplicationIds`-style stack pattern) that silently stops re-descending into an already-visited node. **No user-facing "cycle detected" finding type** is introduced this phase.
- **D-04:** BusinessProcess sovereignty requirements remain **out of scope** for the Phase 2 chain (deferred to v2 per `SOVX-02`). Only `BusinessCapability` and `DataObject` are requirement roots.
- **D-05:** Root-to-chain aggregation uses the two-marker model: a RED finding anywhere below a node sets that node's **ring** (downstream-affected) marker; only the node that actually owns the violating rating gets the **fill** (self) marker. A BusinessCapability can never get a fill marker (it has no achieved rating of its own).
- **D-06:** `Company.expectedSovereigntyScore`, `achievedSovereigntyScore`, `sovereigntyGap`, `sovereigntyScorePercent`, `sovereigntyScoreStatus` are **kept as fields** (no schema change) but recomputed from the new canonical engine. The Temporal workflow keeps its async batch/rollup trigger role but calls into the same canonical evaluation module instead of its own formula in `ai-server/temporal/sovereignty/activities.ts::computeSovereigntyScores`.
- **D-07:** `client/src/components/sovereignty/utils.ts` (`resolveInheritedValue`, `buildEffectiveApplication`, `buildEffectiveInfrastructure`, `computeAggregatedAchievedScore`) is **deleted outright**, replaced by rendering the backend's canonical DTO.
- **D-08:** Achieved leaf entities are **Application, AIComponent, and Infrastructure only**. **Suppliers are out of scope** for chain traversal in Phase 2 (explicitly logged as a deferred backlog item, not silently dropped — see STATE.md Deferred Items).
- **D-09:** Diagram marker visibility is gated by the **existing `featureFlags.Sovereignty` company-level flag** (same pattern as `AicomponentForm.tsx`), not a new per-diagram toggle.
- **D-10:** **No inventory/coverage dashboard UI** is built in Phase 2 (`SOVX-03` stays v2). The canonical per-element status must be queryable (config/query-level capability), but no dedicated UI screen, list, or dashboard component is built.

### the agent's Discretion

- Exact GraphQL type/field names for the new analysis queries (`sovereigntyAnalysis`, `sovereigntyMarkers`, `sovereigntyImpacts` are suggested shapes in ARCHITECTURE.md, not locked).
- Internal repository/service module boundaries within `server/src/` (file layout), as long as one canonical module owns evaluation and is the only thing UI and Temporal call into.

### Deferred Ideas (OUT OF SCOPE)

- Supplier participation in chain traversal (D-08) — logged as a deferred backlog item for a future milestone.
- Inventory/coverage dashboard for newly-grey elements (`SOVX-03`) — v2/organizational concern; only the config/query-level capability exists this phase.
- Weighted sovereignty scoring (`sovereigntyReqWeight` field usage) — deferred to v2 (`SOVX-04`).
- Business-process sovereignty requirements in the chain — deferred to v2 (`SOVX-02`).
- Blast-radius/portfolio prioritization — deferred to v2 (`SOVX-01`).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOV-01 | Each relevant application or infrastructure element is evaluated using its own explicit sovereignty achievement attributes instead of inherited achievement values | Confirmed exact fields (`sovereigntyAch*`) and existing inheritance code to delete (`utils.ts`); see Standard Stack / Don't Hand-Roll |
| SOV-02 | The system detects sovereignty violations along dependency chains by comparing higher-level requirements to lower-level achieved values per dimension | See Architecture Patterns → Pattern 1/2, Code Examples → chain traversal |
| SOV-03 | The system classifies missing sovereignty evaluations as a visible gray or unknown state instead of compliant-by-default | See Common Pitfalls (Pitfall: silent fallback), classification table in Architecture Patterns |
| SOV-04 | The system returns explainable sovereignty findings naming violating element, dimension, required value, actual value, and chain context | See Canonical Sovereignty Analysis Model (inherited from ARCHITECTURE.md `Finding` shape), Code Examples |
| SOV-05 | Sovereignty calculation logic is consistent across backend evaluation, background recomputation, and user-visible diagnostics | See D-06 wiring: Temporal calls the same module; see Component Responsibilities |
| SUX-01 | Element view shows whether that element's sovereignty rating satisfies relevant higher-level requirements | See Detail View integration point, `SovereigntyEntityDialog.tsx` current structure to replace |
| SUX-02 | Element view distinguishes cause vs. downstream-affected | See two-marker model (D-05), `selfStatus`/`downstreamStatus` DTO shape |
| SUX-03 | Diagram can optionally display sovereignty status markers | See Diagram Marker Flow, `featureFlags.Sovereignty` gating (D-09), existing icon-binding pattern |
| SUX-04 | Diagram markers distinguish local violations from downstream impact via separate visual states | See fill (self) vs. ring (downstream) marker pattern, existing `markMissingElements` color-mutation precedent |

</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Yarn only** — never `npm install`/`npm run`; all package management and scripts in this phase (server, client, ai-server) must use `yarn`.
- **Additive GraphQL schema-first** — `server/src/graphql/schema.graphql` stays the source of truth; new sovereignty queries must be added, not folded into existing CRUD types. After any schema change: restart GraphQL server, then `cd client && yarn codegen` (against the **live** endpoint, not a static file — Neo4j GraphQL Library generates runtime-only query/filter types that aren't in the static schema).
- **Prefer generated types** from `client/src/gql/generated.ts` over hand-rolled client types once codegen has run against the new queries.
- **Entity component pattern**: any new sovereignty-detail UI work should keep page.tsx thin, with logic in `components/<feature>/`.
- **TypeScript strictness**: interfaces over type aliases (except unions), no enums (use `as const` unions) — note the existing `MATURITY_LEVELS`/`REQ_DIMS` arrays in this codebase already follow this convention; the new evaluator module should too.
- **No hand-rolled Tanstack Form/Table changes required** — this phase's UI work is a read-only diagnostics panel and diagram overlay, not a new form; those conventions are secondary to Table Stakes here.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@neo4j/graphql` | 7.1.1 (already installed) [VERIFIED: codebase `server/package.json`] | Auto-generated CRUD schema + JWT authorization; hosts the new analysis queries alongside it | Already the sole GraphQL layer in this server; no alternative needed |
| `neo4j-driver` | ^5.13.0 (already installed) [VERIFIED: codebase] | Direct Cypher execution for the sovereignty repository/traversal adapter | The evaluation service needs a raw session, not GraphQL-nested-query composition, to do variable-depth chain walks efficiently |
| `@graphql-tools/schema` | ^10.0.25 (already installed, currently unused) [VERIFIED: codebase `server/package.json`] | `mergeSchemas`/`makeExecutableSchema` to combine the Neo4j-generated schema with a hand-written sovereignty analysis schema + resolvers | Already a dependency — no new package needed; this is the standard way to bolt custom resolvers onto an `@neo4j/graphql` server per Neo4j's own custom-logic docs pattern of passing a `resolvers` map into `Neo4jGraphQL({ typeDefs, resolvers, driver })` |
| `graphql-tools` | ^9.0.18 (already installed) [VERIFIED: codebase] | Alternative/complementary schema-stitching utilities, already present | Confirms schema merge tooling is already on the dependency tree |
| `zod` | ^4.3.6 (already installed) [VERIFIED: codebase] | Input validation for the new query's root-type/root-id arguments if desired | Already used elsewhere in `server/src`; keeps validation consistent with project convention |
| `jest` + `ts-jest` | ^29.7.0 / ^29.1.1 (already installed, **unconfigured** — no `jest.config.*` or test files exist in `server/`) [VERIFIED: codebase] | Unit tests for chain traversal, classification, cycle-safety, marker mapping | `npm test`/`yarn test` script exists (`"test": "jest"`) but will fail today with no config/tests — this is a Wave 0 gap, not a new dependency |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@apollo/client` (client, already installed) | current | Fetch the new `sovereigntyAnalysis`/`sovereigntyMarkers` queries from Next.js components | Detail dialogs and diagram marker batch loader |
| Existing `graphqlRequest` helper (`ai-server/src/graphql/client.ts`) | n/a | Temporal activities call the new canonical query/mutation via this same client wrapper instead of re-implementing scoring | Keeps D-06 wiring consistent with how `ai-server` already talks to the GraphQL server |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@graphql-tools/schema` mergeSchemas + plain resolvers | `@cypher` directive on `Query` fields (native `@neo4j/graphql` feature) | `@cypher` is simpler for pure data-shape queries, but the evaluation logic here is imperative (loop over chain nodes, classify per-dimension, build `Finding[]`, dedupe multi-parent findings) — awkward to express as one Cypher `RETURN`. Use `@cypher` only for simple supporting lookups (e.g., "does this Infrastructure have children"), not for the full analysis payload. |
| Raw driver session in a hand-written resolver | `@neo4j/graphql`'s internal `executionContext`/OGM | The OGM (`@neo4j/graphql-ogm`) is not currently installed and would be a new dependency; a plain driver session (already imported as `neo4jDriver` in `server/src/db/neo4j-client.ts`) is zero-new-dependency and matches ARCHITECTURE.md's "repository/traversal adapter" pattern. |
| Synchronous on-demand evaluation | Persisted snapshot/cache table | ARCHITECTURE.md explicitly recommends starting with on-demand analysis and deferring persisted snapshots "only after behavior stabilizes" — do not add caching infrastructure this phase. |

**Installation:** No new packages required — `@neo4j/graphql`, `neo4j-driver`, `@graphql-tools/schema`, `graphql-tools`, `zod`, `jest`, `ts-jest` are all already present in `server/package.json`. Only a `server/jest.config.js` (or `jest` key in `package.json`) needs to be added; this is configuration, not a new dependency.

**Version verification:** All versions above were read directly from `server/package.json` in this repository — no registry lookup needed since nothing new is installed. [VERIFIED: codebase `server/package.json`]

## Package Legitimacy Audit

**Not applicable — this phase installs no new external packages.** Every library needed for the canonical evaluation service, GraphQL wiring, and testing already exists in `server/package.json`, `client/package.json`, or `ai-server/package.json`. If planning later decides to add a graph-traversal helper library (e.g., an APOC-style helper), re-run this audit at that time — note that **APOC is already available in the Neo4j container** (`db/plugins/apoc.jar` present; Neo4j 5.26 per `compose.yml`) [VERIFIED: codebase `db/plugins/`, `compose.yml`], so APOC procedures (e.g. `apoc.path.expandConfig` for advanced cycle-safe traversal) are usable without any package installation if hand-written Cypher proves insufficient — but plain Cypher with an application-level visited-set (matching D-03) is expected to be sufficient and simpler to test.

## Architecture Patterns

### System Architecture Diagram

```text
┌─────────────────────────────┐        ┌──────────────────────────────┐
│ Next.js client               │        │ ai-server Temporal workflow   │
│  - Element detail dialogs    │        │  - sovereignty/workflow.ts    │
│    (SUX-01/02)                │        │  - sovereignty/activities.ts  │
│  - Diagram canvas markers     │        │    (company rollup trigger)   │
│    (SUX-03/04)                │        └──────────────┬───────────────┘
└──────────────┬───────────────┘                       │
               │ GraphQL query                          │ GraphQL query/mutation
               │ sovereigntyAnalysis(rootType, rootId)   │ (same canonical query,
               │ sovereigntyMarkers(nodes: [...])        │  or a batch variant)
               ▼                                          ▼
        ┌─────────────────────────────────────────────────────┐
        │ GraphQL server (Apollo + @neo4j/graphql, merged      │
        │ schema via @graphql-tools/schema)                    │
        │  - Existing auto-generated CRUD (unchanged)          │
        │  - NEW: sovereigntyAnalysis / sovereigntyMarkers      │
        │    query fields → custom resolvers                   │
        └───────────────────────┬───────────────────────────────┘
                                 │ calls into (plain TS, no GraphQL context)
                                 ▼
        ┌─────────────────────────────────────────────────────┐
        │ server/src/sovereignty/ (NEW canonical module)       │
        │  1. repository.ts  — Cypher/driver reads:             │
        │     load requirement root + full support/host chain   │
        │  2. evaluator.ts   — per-dimension compare, classify   │
        │     RED/YELLOW/GREY/GREEN, cycle-safe visited-set      │
        │  3. markers.ts     — projects Finding[] into           │
        │     {selfStatus, downstreamStatus} per node             │
        └───────────────────────┬───────────────────────────────┘
                                 │ Cypher via neo4jDriver session
                                 ▼
                         ┌───────────────┐
                         │    Neo4j       │
                         │ (existing      │
                         │  sovereigntyReq*/
                         │  sovereigntyAch*
                         │  fields, no      │
                         │  schema change)  │
                         └───────────────┘
```

A reader can trace SUX-01 end-to-end: client opens a detail dialog → issues `sovereigntyAnalysis` query → merged-schema resolver calls the canonical module → repository loads the chain via Cypher → evaluator classifies findings with no inheritance → DTO returned → dialog renders it directly. The same canonical module is the only entry point for the Temporal rollup (SOV-05) and the diagram marker batch query (SUX-03/04) — no second implementation exists anywhere in this diagram.

### Recommended Project Structure

```
server/src/sovereignty/
├── types.ts              # SovereigntyAnalysis, Finding, Marker, DimensionEvaluation shapes
├── repository.ts         # Cypher queries: loadRequirementRoot, loadSupportChain (per D-01/D-02/D-08 scope)
├── evaluator.ts          # classify(), compareChain(), cycle-safe traversal (D-03)
├── markers.ts            # projectMarkers(): Finding[] -> {selfStatus, downstreamStatus} per node id
├── graphql/
│   ├── typeDefs.ts       # extend type Query { sovereigntyAnalysis(...) sovereigntyMarkers(...) }
│   └── resolvers.ts      # thin resolvers calling evaluator.ts, no business logic here
└── __tests__/
    ├── evaluator.test.ts       # RED/YELLOW/GREY/GREEN fixtures from eam-konzept.md examples
    ├── evaluator.cycles.test.ts
    └── markers.test.ts
server/jest.config.js      # NEW — ts-jest preset, currently missing entirely
```

### Pattern 1: Backend-Owned Sovereignty Engine (from `.planning/research/ARCHITECTURE.md`)

**What:** A single service module in `server/src/sovereignty/` owns chain traversal, classification, and result assembly. UI and Temporal only ever call this module (directly in-process for Temporal via a shared package, or via GraphQL for the client).
**When to use:** Every consumer — detail dialogs, diagram markers, company rollups.
**Example shape** [CITED: `.planning/research/ARCHITECTURE.md`]:
```typescript
interface SovereigntyAnalysisInput {
  companyId: string
  rootType: 'businessCapability' | 'dataObject' | 'application' | 'aiComponent' | 'infrastructure'
  rootId: string
}

interface SovereigntyAnalysisService {
  analyzeRoot(input: SovereigntyAnalysisInput): Promise<SovereigntyAnalysis>
  analyzeMarkers(input: { companyId: string; nodes: Array<{ id: string; type: string }> }): Promise<SovereigntyMarker[]>
}
```

### Pattern 2: Merging a hand-written analysis schema onto `@neo4j/graphql`'s generated schema

**What:** Neo4j's own custom-logic docs show two ways to add non-CRUD behavior: (a) `@cypher` directive for data-shape-only fields, and (b) a plain `resolvers` object passed straight into `new Neo4jGraphQL({ typeDefs, resolvers, driver })` for JS/TS-computed fields [CITED: neo4j.com/docs/graphql/current/custom-resolvers/]. Because this server already keeps `typeDefs` in a single `schema.graphql` file consumed by `Neo4jGraphQL`, the cleanest additive path (matching the "keep CRUD schema unchanged" brownfield constraint) is:
1. Add `extend type Query { sovereigntyAnalysis(...): SovereigntyAnalysis! sovereigntyMarkers(...): [SovereigntyMarker!]! }` plus the new output types to `schema.graphql` (or a second typeDefs string merged in) — additive only, no existing type touched.
2. Pass a `resolvers` map into the existing `new Neo4jGraphQL({ typeDefs, driver, resolvers, features })` call in `server/src/graphql/schema.ts`, where `Query.sovereigntyAnalysis` / `Query.sovereigntyMarkers` resolvers call `server/src/sovereignty/evaluator.ts` directly using `neo4jDriver` for their own Cypher reads (bypassing `@neo4j/graphql`'s query translation entirely for these two fields).
**When to use:** For the full analysis/marker payloads (imperative classification logic).
**Why not `@cypher` for these two fields:** `@cypher` requires the Cypher statement to return a value shape matching the GraphQL type directly [CITED: neo4j.com/docs/graphql/current/custom-resolvers/ — "Object types... all fields of the type must be available in the Cypher return value"] — awkward for multi-step classification with per-dimension RED/YELLOW/GREY/GREEN logic and D-01's "every hosting edge produces its own finding" fan-out. Reserve `@cypher` for narrow supporting lookups only, if any are needed.
**Confidence:** MEDIUM — the `resolvers` + `Neo4jGraphQL` combination is CITED from official Neo4j docs and is a documented, supported feature of the installed `@neo4j/graphql` 7.1.1, but has **zero precedent in this codebase** (no existing custom resolver of any kind exists today). Budget a Wave 0 spike (one trivial `sovereigntyPing: String` custom-resolver field, end-to-end through codegen) to de-risk this before building the full evaluator on top of it.

### Pattern 3: Repository and Traversal Separation

**What:** Keep graph loading (`repository.ts`) separate from evaluation logic (`evaluator.ts`).
**When to use:** Any time relationship/schema details might evolve (e.g., if Suppliers are added to scope in a future milestone per the deferred backlog item) without rewriting classification rules.
**Why:** [CITED: `.planning/research/ARCHITECTURE.md` Pattern 2] "Brownfield graph traversal queries will evolve while the evaluation rules must stay testable."

### Pattern 4: Cycle-safe chain traversal (adapting the existing client pattern)

**What:** The existing `collectAchievedDependencyTree()` in `client/src/components/sovereignty/utils.ts` already implements a stack-based, visited-id-guarded traversal over `application.components` — this exact *shape* (not the inheritance/hiding logic inside it, which is deleted per D-07) is the right cycle-safety pattern to port into the backend evaluator (D-03). [VERIFIED: codebase `client/src/components/sovereignty/utils.ts` lines defining `visitedApplicationIds`/`applicationStack`]
**Backend Cypher equivalent** — because D-01 requires evaluating *every* hosting/parent edge independently (not a single path), prefer application-level (TypeScript) recursive/stack traversal over a single variable-length Cypher path pattern, since Cypher's `MATCH p = (a)-[:HOSTED_ON*1..N]->(i)` with cycle protection is harder to combine with "emit one finding per edge, not per path" semantics. A reasonable repository query loads one hop at a time and the evaluator's TS-level visited-set drives how many hops to request next — mirroring the existing client pattern exactly, just server-side and without the inheritance step.
```typescript
// server/src/sovereignty/evaluator.ts — cycle-safe multi-edge traversal, no inheritance
function evaluateInfrastructureChain(
  infra: InfrastructureNode,
  requiredByDimension: Record<Dimension, MaturityLevel>,
  visited: Set<string>,
  chainPath: string[]
): Finding[] {
  if (visited.has(infra.id)) return [] // D-03: silently stop, no cycle finding
  visited.add(infra.id)

  const findings = compareOwnAchieved(infra, requiredByDimension, chainPath) // GREY if missing, RED if violated

  // D-01: every parent edge independently, no "pick one" or "worst of"
  for (const parent of infra.parentInfrastructure ?? []) {
    findings.push(
      ...evaluateInfrastructureChain(parent, requiredByDimension, new Set(visited), [...chainPath, infra.id])
    )
  }
  return findings
}
```

### Pattern 5: Diagram marker projection as a read model (SUX-03/04)

**What:** Diagram canvas consumes a compact `{ selfStatus, downstreamStatus }` marker DTO per `customData.databaseId`, never recomputes chain logic client-side.
**Existing reusable mechanics** [VERIFIED: codebase]:
- `client/src/components/diagrams/utils/databaseSyncUtils.ts` → `markMissingElements()` already demonstrates the exact mutation shape needed: it maps over `DiagramElement[]`, matches on `customData.databaseId`, and conditionally overwrites `strokeColor`/`strokeWidth`/`customData` — a new `applySovereigntyMarkers(elements, markerByDatabaseId)` function should follow this identical shape (self-status → `backgroundColor`/fill, downstream-status → `strokeColor`/ring width or a bound icon), called from the same diagram-open sync path as `markMissingElements`.
- `client/src/components/diagrams/utils/excalidrawLibraryUtils.ts` → `createIconElement()` + `boundElements: [{ type: 'text', id: textId }]` already shows how a small overlay element gets bound to a main rectangle at element-creation time — this is the template for adding a second small bound "marker" element/icon distinct from the type icon, if a two-color ring+fill can't be expressed purely via `strokeColor`+`backgroundColor` on the existing rectangle.
**Batch fetch:** One GraphQL round-trip per visible diagram open (`sovereigntyMarkers(nodes: [{id, type}, ...])`), keyed off `extractDatabaseElements()` (already exists in `databaseSyncUtils.ts` for the sync flow) — reuse it to build the node list instead of writing a new extraction function.
**Gating:** `if (!featureFlags.Sovereignty) return elements` unchanged — matches D-09 exactly, same flag already read in `AicomponentForm.tsx`.

### Anti-Patterns to Avoid

- **Recomputing sovereignty in the client** [CITED: ARCHITECTURE.md Anti-Pattern 1] — the entire reason `client/src/components/sovereignty/utils.ts` is being deleted (D-07), not quarantined.
- **Encoding inheritance as a fallback convenience** [CITED: ARCHITECTURE.md Anti-Pattern 2] — `resolveInheritedValue`/`buildEffectiveInfrastructure`/`buildEffectiveApplication` in the current `utils.ts` are the literal code being removed; do not port their *behavior*, only their traversal *shape* (Pattern 4 above).
- **Separate rules for detail views and diagram markers** [CITED: ARCHITECTURE.md Anti-Pattern 3] — `sovereigntyMarkers` must be a thin projection over the same `evaluator.ts` output as `sovereigntyAnalysis`, never a second classifier.
- **Silent fallback scoring for missing values** [CITED: PITFALLS.md Pitfall 6] — verified concretely: the Temporal `computeSovereigntyScores` in `ai-server/temporal/sovereignty/activities.ts` today does `MATURITY_SCORE[val] ?? null` and then **filters out nulls before averaging** (`.filter((s): s is number => s !== null)`), which silently drops missing-value entities from the aggregate instead of surfacing them as GREY — this exact pattern must not be reused in the new canonical engine; missing values must produce an explicit GREY finding, not be dropped from the calculation.
- **Two diverging formulas** [CITED: PITFALLS.md Pitfall 5, `eam-konzept.md` §6] — confirmed concretely in code: `client/src/components/sovereignty/utils.ts::computeAggregatedAchievedScore` (worst-case min across explicit entities) and `ai-server/temporal/sovereignty/activities.ts::computeSovereigntyScores` (`expectedSovereigntyScore = max(reqScores)`, `achievedSovereigntyScore = min(achScores)`, gap = expected − achieved) are two different, independently-filtered aggregations over overlapping but not identical entity sets (client scopes to a specific root's dependency tree; Temporal scopes to the whole company) — this is the exact "two voneinander abweichende Berechnungslogiken" the concept doc flags, and D-06/D-07 jointly retire both in favor of one module.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Adding a non-CRUD GraphQL query to an `@neo4j/graphql` server | A second standalone GraphQL server/gateway, or bypassing Apollo entirely | `@graphql-tools/schema` (already installed) to merge a hand-written `resolvers` map into the same `new Neo4jGraphQL({ typeDefs, driver, resolvers })` call already in `server/src/graphql/schema.ts` | Documented, supported `@neo4j/graphql` extension point [CITED: neo4j.com/docs/graphql/current/custom-resolvers/]; zero new infrastructure |
| Cycle detection in graph traversal | A custom graph library or new npm dependency | Plain `Set<string>` visited-ids per traversal path (already proven in `client/src/components/sovereignty/utils.ts`) — or APOC's `apoc.path.expandConfig` (already installed in the Neo4j container, `db/plugins/apoc.jar`) if the traversal needs to move fully into Cypher later | The pattern already exists and works; no cycles are known in current data (D-03), so the simplest guard is correct at this scale |
| Maturity-level ↔ numeric ordering | A new enum/ranking library | The existing `MATURITY_LEVELS = ['NONE','LOW','MEDIUM','HIGH','VERY_HIGH']` ordering convention (mirrored in both `utils.ts` and `activities.ts` today) | Already the established, tested-by-usage convention across two implementations; the canonical module should be the *third and only remaining* place this ordering is encoded |
| GraphQL type generation for new queries | Hand-written client TypeScript types | `yarn codegen` against the **live** dev GraphQL endpoint after adding the new schema fields | Explicit project convention (`docs/README` / copilot-instructions): Neo4j GraphQL Library generates runtime-only types not present in the static schema file |

**Key insight:** Every piece of "custom" machinery this phase needs (schema merging, cycle-safe traversal, maturity ordering) already has a proven-in-this-repo template to adapt — the actual net-new work is deleting two divergent implementations and writing one correct one behind an unprecedented (but well-documented) resolver-wiring seam.

## Common Pitfalls

### Pitfall 1: Partial inheritance removal (client deleted, Temporal formula untouched)

**What goes wrong:** Someone deletes `utils.ts` (D-07) and wires the detail view to a new canonical query, but leaves `ai-server/temporal/sovereignty/activities.ts::computeSovereigntyScores` calling its own `MATURITY_SCORE`/min/max formula — SOV-05 ("consistent across... backend evaluation, background recomputation, and user-visible diagnostics") silently fails even though the UI looks fixed.
**Why it happens:** The Temporal code lives in a different package (`ai-server/`) with its own GraphQL client wrapper (`graphqlRequest`), so it's easy to treat as "someone else's problem" during a `server/`-focused refactor.
**How to avoid:** Make D-06 an explicit task: replace `computeSovereigntyScores`'s body with a call to the new `sovereigntyAnalysis`/company-rollup query via the existing `graphqlRequest` helper, and delete `MATURITY_SCORE`/`REQ_DIMS`/`ACH_DIMS`/the two `fetchSovereignty*Entities` functions once the new query supplies equivalent data. Add a parity test comparing old vs. new Company rollup fields on the same fixture company before removing the old code path.
**Warning signs:** `ai-server/temporal/sovereignty/activities.ts` still imports `MATURITY_SCORE` after the phase is "done."

### Pitfall 2: Silent fallback scoring surviving inside the new engine

**What goes wrong:** The new evaluator technically supports GREY, but somewhere a `?? 0` or `.filter(s => s !== null)` (exactly as seen today in `activities.ts`) causes missing values to be dropped from aggregation rather than surfaced.
**Why it happens:** It is the path of least resistance when porting numeric-averaging code — both existing implementations already do this.
**How to avoid:** Add a fixture-based unit test asserting: an entity with zero `sovereigntyAch*` fields set produces a `GREY` finding, is never silently excluded from a `Company`-level count, and never causes the root's status to read as `GREEN` by omission.
**Warning signs:** `hasAnySovereigntyAchs()`-style guards (already exists in `utils.ts`, reusable as a pure predicate) missing from a new code path.

### Pitfall 3: `@neo4j/graphql` custom-resolver wiring breaks existing authorization/JWT flow

**What goes wrong:** The new `sovereigntyAnalysis`/`sovereigntyMarkers` fields bypass the `@authorization` directive validation that every existing type in `schema.graphql` uses (JWT roles + `company_ids` scoping), leaking cross-company sovereignty data.
**Why it happens:** Custom resolvers registered via the `resolvers` option execute outside the declarative `@authorization` directive pipeline that `@neo4j/graphql` applies to its own generated fields — this is a genuinely new attack surface for this codebase, which today relies entirely on schema directives for authz.
**How to avoid:** The custom resolver must explicitly re-derive the caller's `company_ids`/roles from `context.token`/`context.jwt` (same source the existing directives read: `$jwt.company_ids`) and scope the underlying Cypher `WHERE` clause accordingly, exactly mirroring the `filter` blocks already on every type (e.g., `BusinessCapability`'s `{ node: { company: { some: { id_IN: "$jwt.company_ids" } } } }`). Treat this as a required V4 Access Control control, not an optional hardening step — see Security Domain below.
**Warning signs:** A resolver that accepts `rootId` and queries without any company-scoping `WHERE` clause.

### Pitfall 4: Rewriting `@cypher` object-return shape doesn't match `SovereigntyAnalysis` type incrementally

**What goes wrong:** If any part of the analysis payload IS implemented via `@cypher` (e.g., a narrow "does this infra have a parent" lookup), the Cypher `RETURN` must supply every field of the referenced GraphQL type or the query throws at request time [CITED: neo4j.com/docs/graphql/current/custom-resolvers/].
**How to avoid:** Prefer plain resolvers with explicit TypeScript object construction (Pattern 2) over `@cypher`-typed object returns for anything beyond a single scalar/simple lookup, so the shape is compiler-checked instead of discovered at GraphQL request time.

### Pitfall 5: Migration blast radius surprise at rollout

**What goes wrong:** Turning off inheritance turns a large fraction of Applications/Infrastructure grey at once (expected per `eam-konzept.md` §5, and explicitly *not* something to hide per D-10/Deferred Ideas), but if the plan doesn't budget verification against realistic seed data volume, the "mostly grey" result is discovered late and looks like a regression.
**How to avoid:** As part of Wave 0/verification, run the new evaluator against the actual seeded dataset (`db/import`/`db/data`) and record the grey/red/yellow/green counts as a baseline expectation in the plan's verification section — not as a new dashboard (D-10 explicitly forbids that), just as a one-time sanity check logged in the plan.

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration-of-identifiers phase. It is a logic-replacement phase over the *same* field names, node labels, and relationship types (no schema change per PROJECT.md constraint). There is no OS-registered state, no external service config, and no secrets/env vars tied to sovereignty naming. The one "migration-shaped" concern (existing achieved values that were only ever true because of inheritance, now becoming grey) is a **data/semantic** concern already addressed by D-10/Deferred Ideas ("visible missing ratings are part of the intended trust model" — REQUIREMENTS.md Out of Scope), not a runtime-state category from this checklist. Confirmed via direct inspection: **no stored data, live service config, OS-registered state, secrets, or build artifacts reference sovereignty-specific identifiers that would need renaming or migrating.**

## Code Examples

### Current client-side traversal shape to port (cycle-safety only, not inheritance) — `client/src/components/sovereignty/utils.ts`
```typescript
// VERIFIED pattern already in this repo — port the stack/visited-set shape,
// delete the resolveInheritedValue/buildEffectiveApplication/buildEffectiveInfrastructure calls (D-07)
const visitedApplicationIds = new Set<string>()
const applicationStack = rootApplications.map(app => app.id)
while (applicationStack.length > 0) {
  const applicationId = applicationStack.pop()
  if (!applicationId || visitedApplicationIds.has(applicationId)) continue
  visitedApplicationIds.add(applicationId)
  // ... D-02: do NOT call buildEffectiveApplication() to hide container values;
  // chain-check the container's own fields AND push each component onto the stack
}
```

### Current Temporal formula to retire (D-06) — `ai-server/temporal/sovereignty/activities.ts`
```typescript
// This drops missing values from the average instead of surfacing GREY — do not port this logic.
const achScores = input.achEntities
  .map(e => extractEntityScore(e, ACH_DIMS))
  .filter((s): s is number => s !== null) // <-- silent-fallback anti-pattern (Pitfall 2)
const achievedSovereigntyScore = achScores.length > 0 ? Math.min(...achScores) : null
```
Replace `computeSovereigntyScores` with a call into the canonical module's company-rollup output (D-06) via the existing `graphqlRequest` wrapper already used in this file.

### Wiring shape for the new query (illustrative, not prescriptive on exact names — the agent's discretion per CONTEXT.md)
```typescript
// server/src/graphql/schema.ts — additive change only
import { makeExecutableSchema } from '@graphql-tools/schema'
import { mergeSchemas } from '@graphql-tools/schema' // or graphql-tools equivalent already installed
import { sovereigntyTypeDefs } from '../sovereignty/graphql/typeDefs'
import { sovereigntyResolvers } from '../sovereignty/graphql/resolvers'

export const getSchema = async () => {
  const neo4jGeneratedSchema = await neoSchema.getSchema()
  return mergeSchemas({
    schemas: [neo4jGeneratedSchema],
    typeDefs: sovereigntyTypeDefs,
    resolvers: sovereigntyResolvers, // resolvers call server/src/sovereignty/evaluator.ts directly
  })
}
```
**Confidence: MEDIUM** — the individual pieces (`@neo4j/graphql` generated schema object, `@graphql-tools/schema` mergeSchemas) are each independently documented/CITED, but this exact combination is unverified in this codebase; treat as the Wave 0 spike target.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Inherited achieved values (infra hierarchy + composite app hiding) | Explicit per-element evaluation, chain-compared | This phase | Root cause of the entire milestone; see `eam-konzept.md` |
| Worst-score-only aggregate number | Full finding list, per-dimension, per-chain-node | This phase | Matches ARCHITECTURE.md "should have" competitive feature |
| Two independent scoring formulas (client util + Temporal activity) | One canonical module called by both | This phase (D-06/D-07) | Directly required by SOV-05 |

**Deprecated/outdated:** `client/src/components/sovereignty/utils.ts`'s exported inheritance helpers are deprecated as of this phase and slated for outright deletion (D-07) — do not add new callers to them during transition.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@graphql-tools/schema`'s `mergeSchemas` (rather than passing a `resolvers` object directly into `new Neo4jGraphQL({...})`) is the best merge mechanism for this codebase | Architecture Patterns → Pattern 2, Code Examples | Low — both are documented, supported paths; if the direct `resolvers` argument into `Neo4jGraphQL` proves simpler during the Wave 0 spike, swap to it; the underlying evaluator module (`server/src/sovereignty/evaluator.ts`) is unaffected either way |
| A2 | Application-level (TypeScript) recursive traversal is preferable to a single Cypher variable-length path for D-01's "every edge independently" requirement | Architecture Patterns → Pattern 4 | Medium — if performance testing during planning/execution shows large fan-out chains are slow with N+1 Cypher calls, a single Cypher query returning `collect(path)` with post-processing may be needed instead; this would still fit inside `repository.ts` without changing `evaluator.ts`'s classification contract |
| A3 | No real cycles exist in current seed/production data (inherited from D-03, itself already user-confirmed) | Common Pitfalls, Runtime State Inventory | Low — D-03 is a locked decision, but if Wave 0 verification against real data finds an actual cycle, the "silently stop" behavior should still be validated to not silently misclassify (it should just under-count, never mis-attribute a finding) |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Exact merge mechanism for custom resolvers onto `@neo4j/graphql`'s generated schema**
   - What we know: Neo4j officially supports a `resolvers` argument directly on `new Neo4jGraphQL({...})` for custom/computed fields [CITED], and `@graphql-tools/schema`/`graphql-tools` are already installed for schema-merging.
   - What's unclear: Whether the simplest path is (a) passing `resolvers` straight into the existing `Neo4jGraphQL` constructor call with `extend type Query { ... }` added to `schema.graphql`, or (b) a separate merged schema via `@graphql-tools/schema`. Both are viable; (a) is likely simpler since it needs zero new merge-library calls.
   - Recommendation: Wave 0 spike — add one trivial custom query field end-to-end (schema → resolver → codegen → client fetch) using approach (a) first; fall back to (b) only if (a) proves awkward for the object-type return shape needed.

2. **Company-level rollup scoping under D-06**
   - What we know: The Temporal workflow computes scores per company by fetching ALL requirement/achieved entities company-wide (`fetchSovereigntyReqEntities`/`fetchSovereigntyAchEntities` in `activities.ts`), not per-chain.
   - What's unclear: Whether the canonical module's "analyze one root" contract needs a distinct "analyze whole company" entry point (batch-analyze every BusinessCapability + DataObject root and aggregate), or whether the Temporal workflow should just call `sovereigntyAnalysis` once per root and aggregate client-side (in `ai-server`) using the shared classification but company-side aggregation code.
   - Recommendation: Planner should decide during task breakdown whether `server/src/sovereignty/` exposes a `analyzeCompany(companyId)` batch function reused by both a GraphQL rollup query and the Temporal activity, to avoid a third aggregation implementation appearing in `ai-server` itself.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neo4j | All chain traversal reads | ✓ | 5.26 (compose.yml) [VERIFIED: codebase] | — |
| APOC plugin | Optional advanced traversal (not required for D-03's simple visited-set approach) | ✓ | `db/plugins/apoc.jar` present [VERIFIED: codebase] | Plain Cypher + app-level visited-set (recommended default) |
| `@neo4j/graphql` | GraphQL schema generation | ✓ | 7.1.1 [VERIFIED: codebase] | — |
| jest/ts-jest | Wave 0 test infrastructure | ✓ installed, ✗ configured (no `jest.config.*`, no test files) [VERIFIED: codebase] | 29.7.0 / 29.1.1 | Must add config — see Validation Architecture Wave 0 Gaps |
| `yarn codegen` against live GraphQL endpoint | Client type generation for new queries | ✓ (documented project workflow) | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Jest configuration is missing but has a trivial fallback (add `server/jest.config.js` with `ts-jest` preset) — tracked as a Wave 0 gap, not a blocker.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + ts-jest 29.1.1 (server) [VERIFIED: `server/package.json` devDependencies] |
| Config file | **none — see Wave 0** (no `jest.config.*` found anywhere in `server/`) [VERIFIED: file search] |
| Quick run command | `cd server && yarn test -- --testPathPattern=sovereignty` (after Wave 0 config exists) |
| Full suite command | `cd server && yarn test` |

Client and `ai-server` have no test runner configured at all [VERIFIED: `client/package.json`/`ai-server/package.json` have no `test` script matches found] — this phase's automated verification should be scoped to the `server/src/sovereignty/` module (pure TypeScript, no React/Excalidraw rendering assertions expected); UI/diagram behavior should be verified manually per the phase's `UI hint: yes` designation, consistent with `gsd-verify-work`'s conversational UAT approach for UI-flagged phases.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOV-01 | Element with no achieved fields is never treated as compliant via inheritance | unit | `yarn test -- evaluator.test.ts -t "no inheritance"` | ❌ Wave 0 |
| SOV-02 | Required HIGH vs. achieved LOW on a dependency produces a RED finding naming the exact node | unit | `yarn test -- evaluator.test.ts -t "chain violation"` | ❌ Wave 0 |
| SOV-03 | Entity with zero `sovereigntyAch*` fields set produces GREY, not GREEN-by-default | unit | `yarn test -- evaluator.test.ts -t "grey"` | ❌ Wave 0 |
| SOV-04 | A `Finding` includes violating element id, dimension, required value, actual value, chain path | unit | `yarn test -- evaluator.test.ts -t "finding shape"` | ❌ Wave 0 |
| SOV-05 | Same fixture chain yields identical findings whether invoked via GraphQL resolver path or Temporal-style direct module call | unit/integration | `yarn test -- evaluator.parity.test.ts` | ❌ Wave 0 |
| D-01 | Multi-parent infrastructure with one violating parent produces exactly one finding naming that parent, not a "worst of" synthetic value | unit | `yarn test -- evaluator.test.ts -t "multi-parent"` | ❌ Wave 0 |
| D-02 | Composite application: container's own GREY status is never hidden even when components have values | unit | `yarn test -- evaluator.test.ts -t "composite container"` | ❌ Wave 0 |
| D-03 | A cyclic parentInfrastructure/components graph terminates traversal without throwing or infinite-looping | unit | `yarn test -- evaluator.cycles.test.ts` | ❌ Wave 0 |
| SUX-02/D-05 | A BusinessCapability with a RED finding below it gets ring-only marker, never a fill marker | unit | `yarn test -- markers.test.ts -t "capability ring only"` | ❌ Wave 0 |
| SUX-03/SUX-04 | Diagram marker rendering | manual (UI hint: yes) | conversational UAT via `/gsd-verify-work` | n/a |

### Sampling Rate

- **Per task commit:** `cd server && yarn test -- --testPathPattern=sovereignty`
- **Per wave merge:** `cd server && yarn test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus manual UI walkthrough of detail view + diagram markers (UI hint: yes)

### Wave 0 Gaps

- [ ] `server/jest.config.js` — ts-jest preset, `testMatch` covering `src/sovereignty/__tests__/**/*.test.ts`; no config exists today.
- [ ] `server/src/sovereignty/__tests__/fixtures.ts` — freeze the `eam-konzept.md` §3 worked example (Billing capability / VM-web-03) plus multi-parent and composite-app fixtures as reusable test data, per PITFALLS.md Pitfall 9's recommendation to "freeze fixture examples... and use them as acceptance tests."
- [ ] Confirm whether `client/` needs a lightweight test runner addition for the deletion of `utils.ts` (D-07) — likely not, since no existing client tests reference it (verify via search during planning), but the deletion itself should be a dedicated, easily-revertible commit.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged) | Existing Keycloak/JWT flow untouched |
| V3 Session Management | no (unchanged) | — |
| V4 Access Control | **yes** | New custom resolvers must re-derive `$jwt.company_ids`/roles scoping identical to the existing `@authorization` directive pattern on every entity type — see Common Pitfalls Pitfall 3 |
| V5 Input Validation | yes | Validate `rootType`/`rootId` arguments (e.g., with `zod`, already a server dependency) before constructing Cypher `WHERE` clauses, to avoid malformed/oversized batch marker requests |
| V6 Cryptography | no | Not applicable — no new secrets or crypto in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-company data leak via a custom resolver that bypasses `@neo4j/graphql`'s declarative `@authorization` directive | Information Disclosure / Elevation of Privilege | Custom resolver must explicitly filter every Cypher query by `company_ids` extracted from the same JWT claim path (`realm_access.roles`, `company_ids`) already used by existing `@authorization` blocks — treat this as the single most important review item for this phase's server code (see Pitfall 3) |
| Unbounded batch marker query (`sovereigntyMarkers(nodes: [...])`) used to enumerate/scrape entity ids across companies | Denial of Service / Information Disclosure | Validate the `nodes` input list length and that every requested id resolves to an entity owned by the caller's company before evaluating; reject (not silently filter) out-of-scope ids |
| Cypher injection via unvalidated `rootId`/`rootType` string interpolation | Tampering | Use parameterized Cypher (`$rootId`) exclusively — the existing `neo4jDriver` session API already supports parameters; never string-concatenate ids into a Cypher statement |

## Sources

### Primary (HIGH confidence)

- `server/src/graphql/schema.graphql` — full sovereignty field inventory (`sovereigntyReq*`, `sovereigntyAch*`), relationship names (`HOSTED_ON`, `HAS_PARENT_INFRASTRUCTURE`, `HAS_PARENT_APPLICATION`, `SUPPORTS`, `USED_BY`, Supplier relationships), `@authorization` pattern for JWT/company scoping [VERIFIED via direct read]
- `server/src/graphql/schema.ts`, `server/src/index.ts` — confirmed zero custom resolvers exist today; server is 100% auto-generated `@neo4j/graphql` CRUD via Apollo Server [VERIFIED via direct read]
- `server/package.json` — confirmed exact installed versions of `@neo4j/graphql`, `neo4j-driver`, `@graphql-tools/schema`, `graphql-tools`, `zod`, `jest`, `ts-jest`; confirmed no jest config exists [VERIFIED]
- `client/src/components/sovereignty/utils.ts` — full current inheritance/aggregation implementation to be deleted (D-07), including the reusable cycle-safe traversal shape [VERIFIED via direct read]
- `ai-server/temporal/sovereignty/activities.ts` — full current Temporal batch formula to be retired (D-06), including the concrete silent-fallback null-filtering behavior [VERIFIED via direct read]
- `client/src/graphql/sovereigntyDetail.ts` — current raw-entity detail queries to be replaced by canonical analysis queries [VERIFIED via direct read]
- `client/src/components/diagrams/utils/databaseSyncUtils.ts`, `excalidrawLibraryUtils.ts` — existing `customData.databaseId`/`elementType` linkage, `markMissingElements` color-mutation precedent, `createIconElement`/`boundElements` icon-binding precedent [VERIFIED via direct read]
- `client/src/lib/feature-definitions.ts`, usages in `AicomponentForm.tsx` etc. — confirmed `featureFlags.Sovereignty` gating pattern (D-09) [VERIFIED via direct read]
- `db/plugins/apoc.jar`, `compose.yml` — confirmed APOC plugin present, Neo4j 5.26 [VERIFIED via direct read]
- `.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-CONTEXT.md`, `02-DISCUSSION-LOG.md` — locked D-01..D-10 decisions [VERIFIED via direct read]
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` — phase requirements, deferred items, prior blockers [VERIFIED via direct read]
- `eam-konzept.md` — source concept document, RED/YELLOW/GREY/GREEN taxonomy, two-marker model, worked example [VERIFIED via direct read]
- `.planning/research/ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md` — milestone-level architecture/pitfalls research already completed for this milestone [VERIFIED via direct read]

### Secondary (MEDIUM confidence)

- Neo4j GraphQL Library v7 official docs, "Custom logic" page (`@cypher`, `@customResolver`, `resolvers` argument to `Neo4jGraphQL`) — fetched live 2026-07-30 [CITED: https://neo4j.com/docs/graphql/current/custom-resolvers/]. Confirms the `resolvers` option and `@cypher`/`@customResolver` directives are the two supported extension points, but exact interaction with this repo's `@authorization` JWT pipeline is not documented in the fetched excerpt and should be verified in the Wave 0 spike.

### Tertiary (LOW confidence)

- None — no WebSearch-only, unverified claims are made in this document. Everything either cites the fetched Neo4j docs page or was directly verified by reading this repository's code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already installed and versions read directly from `package.json` files; zero new dependencies.
- Architecture: HIGH for the semantic contract (locked by user-confirmed D-01..D-10 and prior milestone research); MEDIUM for the exact custom-resolver wiring mechanics (documented but unprecedented in this codebase — flagged as a Wave 0 spike).
- Pitfalls: HIGH — concretely re-verified against the actual current implementations (both diverging formulas read and compared line-by-line), not just inherited from the milestone-level PITFALLS.md.

**Research date:** 2026-07-30
**Valid until:** 30 days (stable brownfield stack; re-verify `@neo4j/graphql` custom-resolver wiring choice immediately if the Wave 0 spike reveals a different preferred mechanism before the rest of the phase is planned in detail)
