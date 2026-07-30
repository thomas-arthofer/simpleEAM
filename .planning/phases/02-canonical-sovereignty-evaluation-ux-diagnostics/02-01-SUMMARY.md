---
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
plan: 01
subsystem: api
tags: [neo4j, graphql, apollo, sovereignty, jest, ts-jest, cypher, temporal, evaluator]

# Dependency graph
requires:
  - phase: 01-setup-stabilization
    provides: reproducible local runtime (Docker/Neo4j/GraphQL wiring) needed to validate schema composition
provides:
  - "server/src/sovereignty/{types,evaluator,repository}.ts — canonical, GraphQL-independent sovereignty evaluation engine"
  - "server/src/sovereignty/graphql/resolvers.ts — sovereigntyAnalysis(companyId, rootType, rootId) resolver wired onto the existing @neo4j/graphql schema"
  - "Full-chain traversal: multi-parent Infrastructure (D-01), composite Application containers (D-02), cycle-safe recursion (D-03), DataObject root support (D-08)"
  - "server/jest.config.js + ts-jest test harness for server/"
affects: [02-02, 02-03, 02-04, 02-05]

# Tech tracking
tech-stack:
  added: [jest@29.7.0, ts-jest@29.1.1]
  patterns:
    - "Pure evaluator (no DB/GraphQL dependency) consumed identically by resolvers, batch projection (02-02), and Temporal rollup (02-03)"
    - "Cycle-safe recursive graph walk via a per-branch (not global) visited Set, copied once per node and passed down to children — silent stop on re-entry, no synthetic cycle-detected finding"
    - "Repository-layer per-fetch node cache + in-flight guard (fetchInfrastructure/fetchApplication/fetchAIComponent) to memoize nodes across a single chain load and safely materialize cyclic DB data into a JS object graph"
    - "type Query { ... } (not extend type Query) required for the first custom Query field added to a @neo4j/graphql schema with no other explicit Query block in its SDL"

key-files:
  created:
    - server/jest.config.js
    - server/src/sovereignty/types.ts
    - server/src/sovereignty/repository.ts
    - server/src/sovereignty/evaluator.ts
    - server/src/sovereignty/graphql/resolvers.ts
    - server/src/sovereignty/__tests__/fixtures.ts
    - server/src/sovereignty/__tests__/evaluator.test.ts
    - server/src/sovereignty/__tests__/evaluator.cycles.test.ts
  modified:
    - server/src/graphql/schema.ts
    - server/src/graphql/schema.graphql

key-decisions:
  - "Custom Query fields on a @neo4j/graphql schema with no other explicit Query type must use `type Query { ... }`, never `extend type Query { ... }` — the extension-only pattern crashes the library's SDL validator before schema composition runs (see Deviations)."
  - "Cycle safety uses a per-path visited Set (fresh at each top-level entry point), not a single global dedup set, so genuinely independent branches (e.g. two hosting edges from different roots) are never silently merged or skipped."
  - "loadBusinessCapabilityChain (Task 1's single-hop entry point) was kept as a thin delegate to loadFullSupportChain rather than deleted, per the plan's explicit allowance, avoiding duplicated Cypher/shape logic."

patterns-established:
  - "Repository per-fetch NodeCache + inFlight Set pattern for safely materializing potentially-cyclic graph data from Neo4j into a JS object graph without infinite recursion."
  - "analyzeSupportChain(chain, rootType) as the single shared entry point behind both analyzeBusinessCapability and analyzeDataObject, keeping root-type-specific logic to a one-line delegate."

requirements-completed: [SOV-01, SOV-02, SOV-03, SOV-04, SOV-05]

coverage:
  - id: D1
    description: "Elements with no sovereigntyAch* value for a dimension classify GREY for that dimension, never GREEN-by-default (SOV-03)"
    requirement: SOV-03
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.test.ts#classifies an entity with no achieved values as GREY, never GREEN by omission"
        status: pass
    human_judgment: false
  - id: D2
    description: "A chain node whose achieved level is below the propagated requirement classifies RED for that dimension, with full finding detail (violating element id/type/name, dimension, required/actual level, chain path) (SOV-02, SOV-04)"
    requirement: SOV-02
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.test.ts#produces exactly one RED finding for the eam-konzept.md worked example"
        status: pass
    human_judgment: false
  - id: D3
    description: "Multi-parent Infrastructure produces one independent RED finding per violating hosting edge, never a single worst-of synthetic finding (D-01)"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.test.ts#produces one independent finding per parentInfrastructure edge, never a single \"worst of\" finding (D-01)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Composite Application containers are never hidden behind fully-compliant components (D-02)"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.test.ts#never hides a composite Application container behind fully-compliant components (D-02)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A cyclic parentInfrastructure/components graph terminates traversal without throwing or looping infinitely, and never double-counts a re-entered node (D-03)"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.cycles.test.ts#terminates within 1 second and returns a finite findings array for a cyclic components graph"
        status: pass
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.cycles.test.ts#classifies both nodes of the cycle exactly once each (no infinite re-entry)"
        status: pass
    human_judgment: false
  - id: D6
    description: "DataObject roots are supported as a second chain type (D-08), walking usedByApplications/dataSources/usedForTrainingAI via the same evaluator logic as BusinessCapability"
    requirement: SOV-05
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.test.ts#walks usedByApplications and classifies against the DataObject requirement (D-08)"
        status: pass
    human_judgment: false
  - id: D7
    description: "sovereigntyAnalysis GraphQL resolver dispatches on rootType (businessCapability | dataObject) via loadFullSupportChain, replacing Task 1's single-hop, single-rootType resolver"
    requirement: SOV-05
    verification:
      - kind: other
        ref: "grep verify: resolvers.ts references loadFullSupportChain and no longer references loadBusinessCapabilityChain"
        status: pass
    human_judgment: false

duration: ~35min (this session, continuing from a prior session's Task 1 work)
completed: 2026-07-30
status: complete
---

# Phase 2 Plan 01: Canonical Sovereignty Evaluation Tracer + Full Chain Semantics Summary

**Built the single canonical, GraphQL-independent sovereignty evaluation engine — with cycle-safe multi-parent/composite traversal and DataObject root support — and wired it onto the existing `@neo4j/graphql` server as the codebase's first custom resolver.**

## Performance

- **Completed:** 2026-07-30
- **Tasks:** 2/2 completed
- **Files modified/created:** 10 (2 modified schema files, 3 new/modified core module files, 1 new/modified resolver file, 4 test/fixture files)

## Accomplishments

- Established `server/src/sovereignty/` as the single source of truth for RED/YELLOW/GREY/GREEN sovereignty classification, replacing the two diverging legacy implementations (client-side inheritance, ai-server Temporal formula — retired in later plans 02-03/02-04).
- Proved the first-ever custom-resolver path through the `@neo4j/graphql`-generated schema end-to-end (`sovereigntyAnalysis` query), including discovering and fixing a real library-level SDL validation bug in the process.
- Implemented full chain semantics: multi-parent Infrastructure independence (D-01), composite Application container visibility (D-02), cycle-safe recursive traversal (D-03), and DataObject as a second supported root type (D-08).
- 10/10 Jest tests passing across `evaluator.test.ts` and the new `evaluator.cycles.test.ts`; `yarn tsc --noEmit` clean across the whole `server/` project.

## Task Commits

Each task was committed atomically:

1. **Task 1: Canonical sovereignty evaluation tracer — schema through GraphQL** - `5ce5830` (feat)
2. **Task 2: Full chain semantics — multi-parent, composite apps, cycle safety, DataObject root** - `2c413c5` (feat)

_Note: this SUMMARY/state-update commit will be recorded separately as the plan metadata commit._

## Files Created/Modified

- `server/jest.config.js` - ts-jest test harness config for `server/` (Task 1)
- `server/src/sovereignty/types.ts` - canonical shared types: dimensions, statuses, maturity levels, `Finding`, `RequirementLevels`/`AchievedLevels`, `InfrastructureNode`/`ApplicationNode`/`AIComponentNode`, `SupportChain` base + `BusinessCapabilityChain`/`DataObjectChain`
- `server/src/sovereignty/evaluator.ts` - pure classification + cycle-safe recursive walkers (`walkInfrastructure`/`walkApplication`/`walkAIComponent`), shared `analyzeSupportChain` entry point, `analyzeBusinessCapability`/`analyzeDataObject`
- `server/src/sovereignty/repository.ts` - Cypher/driver data-loading layer; `loadFullSupportChain` with per-fetch `NodeCache` + in-flight cycle guard replacing Task 1's single-hop query; `loadBusinessCapabilityChain` retained as a thin delegate
- `server/src/sovereignty/graphql/resolvers.ts` - `sovereigntyAnalysis` resolver, now dispatching on `rootType` via `loadFullSupportChain`
- `server/src/graphql/schema.ts` - wires `sovereigntyResolvers` into the `Neo4jGraphQL` constructor (Task 1, unchanged since)
- `server/src/graphql/schema.graphql` - added `SovereigntyStatus`/`SovereigntyDimensionEnum` enums, `SovereigntyFinding`/`SovereigntyAnalysis` types, and `type Query { sovereigntyAnalysis(...): SovereigntyAnalysis! }` (see Deviations for the `extend type Query` → `type Query` fix)
- `server/src/sovereignty/__tests__/fixtures.ts` - shared test fixtures, including new multi-parent, composite, cyclic, DataObject, and partial-achieved fixtures
- `server/src/sovereignty/__tests__/evaluator.test.ts` - unit tests for all classification/traversal behaviors
- `server/src/sovereignty/__tests__/evaluator.cycles.test.ts` - dedicated cycle-safety test (termination + exactly-once classification)

## Decisions Made

- **`type Query` vs `extend type Query`**: When a `@neo4j/graphql` SDL has no explicit `type Query { ... }` block anywhere (Query is entirely auto-generated by the library), a custom Query field must be declared as `type Query { ... }`, not `extend type Query { ... }`. The extension-only pattern crashes the library's own SDL validator (see Deviations for full root cause).
- **Cycle safety via per-branch visited Set**: Each top-level supporting entity gets its own fresh `Set([rootId])`, and each node passes one shared copy of its visited set down to all its children — this satisfies both cycle safety (D-03) and multi-parent branch independence (D-01) with a single mechanism.
- **`loadBusinessCapabilityChain` kept as a delegate**: rather than deleted, it now calls `loadFullSupportChain(..., 'businessCapability', ...)` internally — avoids duplicating Cypher/shape logic, and the plan explicitly permitted this.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Yarn Berry tooling bootstrap required**
- **Found during:** Task 1 setup
- **Issue:** `.yarn/releases/yarn-4.9.1.cjs` was missing from the repo (gitignored, never locally generated), so `yarn` commands failed entirely; `server/node_modules` was also missing.
- **Fix:** Copied corepack's cached Yarn bundle (`~/.cache/node/corepack/v1/yarn/4.9.1/yarn.js`) into `.yarn/releases/yarn-4.9.1.cjs`; ran `cd server && yarn install` (653 packages).
- **Files modified:** None committed — `.yarn/*` is gitignored (`.gitignore` line 25); this is a local-environment-only fix.
- **Commit:** N/A (not committed, gitignored)

**2. [Rule 1 - Bug] `@neo4j/graphql` SDL validator crash on extension-only Query type**
- **Found during:** Task 1, while verifying the schema builds with the new `sovereigntyAnalysis` field
- **Issue:** `extend type Query { sovereigntyAnalysis(...) }` with no other `type Query { ... }` block anywhere in the SDL causes `TypeError: Cannot read properties of undefined (reading 'kind')` inside `@neo4j/graphql`'s `buildTypeMapWithExtensions` (`Neo4jValidationContext.js`) — an extension-only type-map entry has `definition: undefined` since `@neo4j/graphql` auto-generates the base `Query` type at schema-composition time, after SDL validation runs.
- **Fix:** Changed `extend type Query { ... }` to `type Query { ... }` in `server/src/graphql/schema.graphql`.
- **Files modified:** `server/src/graphql/schema.graphql`
- **Verification:** Confirmed via a temporary script importing the real `neoSchema` and calling `.getSchema()` — schema now builds and exposes `sovereigntyAnalysis` with return type `SovereigntyAnalysis!` (script deleted after use, not a deliverable).
- **Commit:** `5ce5830` (part of Task 1 commit)

**3. [Rule 1 - Bug] Readonly-array cast errors in repository.ts and fixtures.ts**
- **Found during:** Task 2, `yarn tsc --noEmit`
- **Issue:** Mutating a `readonly ApplicationNode[]`/`readonly InfrastructureNode[]` field after construction (needed to attach children after they're fetched/cached, breaking recursive cycles) requires a double cast; a direct `as { field: T[] }` cast fails because the readonly and mutable array types don't sufficiently overlap.
- **Fix:** Changed casts to go through `unknown` first (`as unknown as { field: T[] }`) in both `repository.ts`'s three fetch helpers and `fixtures.ts`'s cyclic fixture builder.
- **Files modified:** `server/src/sovereignty/repository.ts`, `server/src/sovereignty/__tests__/fixtures.ts`
- **Verification:** `yarn tsc --noEmit` clean.
- **Committed in:** `2c413c5` (part of Task 2 commit)

### Human Verification

No live GraphQL Playground / Docker+Neo4j verification was performed in this environment (Docker/Neo4j not running locally during this session). The closest achievable substitute — building the real `neoSchema` via `neoSchema.getSchema()` and confirming `sovereigntyAnalysis` is present with the correct signature — was used instead to validate schema/resolver reachability without a live database. This is a documented limitation, not a skipped requirement: the plan's `<verify>` steps that require a running stack should be re-run against a live environment before this feature is considered fully field-verified.

## Self-Check: PASSED

All 11 claimed files verified present on disk (jest.config.js, types.ts, repository.ts, evaluator.ts, resolvers.ts, schema.ts, schema.graphql, fixtures.ts, evaluator.test.ts, evaluator.cycles.test.ts, this SUMMARY.md). Both task commits (`5ce5830`, `2c413c5`) verified present in git history.

