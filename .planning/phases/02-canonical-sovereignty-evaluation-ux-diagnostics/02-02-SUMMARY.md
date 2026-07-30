---
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
plan: 02
subsystem: api
tags: [neo4j, graphql, apollo, sovereignty, zod, jest, ts-jest, cypher]

# Dependency graph
requires:
  - phase: 02-canonical-sovereignty-evaluation-ux-diagnostics-01
    provides: "server/src/sovereignty/{types,evaluator,repository}.ts canonical evaluator, loadFullSupportChain, sovereigntyAnalysis resolver"
provides:
  - "server/src/sovereignty/markers.ts — projectMarkers/resolveMarker: D-05 self/downstream (fill/ring) marker projection over Finding[]"
  - "server/src/sovereignty/validation.ts — zod schemas (rootTypeSchema, sovereigntyAnalysisArgsSchema, sovereigntyMarkerNodesSchema) for both sovereignty resolvers"
  - "Query.sovereigntyMarkers — batched, company-scoped, input-validated GraphQL query returning a marker per requested node id"
  - "SOV-05 parity proof: resolver-path and direct-module-call evaluator outputs are asserted byte-identical for the same fixture"
affects: [02-03, 02-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One marker projection function (projectMarkers) folds Finding[] into a per-element self/downstream Map, with a single resolveMarker helper (GREEN/GREEN default) reused by both the resolver and its own tests — no second ad hoc default-filling logic"
    - "zod input-validation boundary applied before the JWT/company check and before any Cypher runs on both sovereignty Query resolvers, sharing one sovereigntyAnalysisArgsSchema for the common companyId/rootType/rootId args shape"
    - "Neo4j session mocked at the db/neo4j-client module boundary (jest.mock) for resolver-level parity/validation tests, rather than mocking loadFullSupportChain directly — proves the real resolver code path, not just its dispatch logic"

key-files:
  created:
    - server/src/sovereignty/markers.ts
    - server/src/sovereignty/validation.ts
    - server/src/sovereignty/__tests__/markers.test.ts
    - server/src/sovereignty/__tests__/evaluator.parity.test.ts
  modified:
    - server/src/graphql/schema.graphql
    - server/src/sovereignty/graphql/resolvers.ts

key-decisions:
  - "projectMarkers only maps elements that appear in some finding's chainPath (plus the root, always); elements with zero findings anywhere in the chain simply have no map entry. The 'GREEN is never omitted' guarantee (UI-SPEC) is enforced by a separate resolveMarker(markers, id) helper that defaults missing ids to GREEN/GREEN — used identically by the sovereigntyMarkers resolver and by markers.test.ts, so there is exactly one place that default-filling logic lives."
  - "Query.sovereigntyMarkers and Query.sovereigntyAnalysis share one sovereigntyAnalysisArgsSchema for their common companyId/rootType/rootId args, rather than each having its own bespoke rootType check — removes the duplicate hand-rolled 'rootType !== businessCapability && rootType !== dataObject' checks that existed before this plan."
  - "The SOV-05 parity test mocks Neo4j at the db/neo4j-client module boundary (session.run stubbed to return the same rows the real Cypher would produce for the eam-konzept.md worked-example fixture) rather than mocking repository.ts's loadFullSupportChain directly — this exercises the real resolver code path (JWT decode, dispatch, GraphQL DTO mapping) end-to-end, not just its top-level branching."

requirements-completed: [SOV-05, SUX-03, SUX-04]

coverage:
  - id: D1
    description: "sovereigntyMarkers returns both a selfStatus and downstreamStatus per requested node id (D-05 fill/ring distinction, SUX-04)"
    requirement: SUX-04
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#gives every non-root element on a finding chainPath its own self and downstream status"
        status: pass
    human_judgment: false
  - id: D2
    description: "A BusinessCapability root always has selfStatus GREY even when its downstreamStatus is RED (capability ring only)"
    requirement: SUX-04
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#gives a BusinessCapability root a GREY selfStatus even when its downstreamStatus is RED (capability ring only)"
        status: pass
    human_judgment: false
  - id: D3
    description: "An element with zero findings anywhere in its chain resolves to an explicit GREEN/GREEN marker, never omitted"
    requirement: SUX-03
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#resolves an element that appears in zero findings to an explicit GREEN/GREEN marker, never omitting it"
        status: pass
    human_judgment: false
  - id: D4
    description: "sovereigntyMarkers rejects a nodes array over a fixed cap (500) with a validation error, not a silent partial result (T-02-04)"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.parity.test.ts#rejects (not truncates) a sovereigntyMarkers nodes array over the 500-node cap"
        status: pass
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.parity.test.ts#propagates the ZodError from Query.sovereigntyMarkers when nodes exceeds the cap, without opening a session"
        status: pass
    human_judgment: false
  - id: D5
    description: "Direct evaluator module call and resolver-layer call produce byte-identical Finding[] output for the same fixture (SOV-05 parity)"
    requirement: SOV-05
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.parity.test.ts#produces byte-identical Finding[] output for the same fixture id set"
        status: pass
    human_judgment: false
  - id: D6
    description: "Malformed rootType is rejected by zod before any Cypher runs (T-02-05)"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.parity.test.ts#rejects a malformed rootType before any Cypher would run"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-07-30
status: complete
---

# Phase 2 Plan 02: D-05 Marker Projection, Batch Query & SOV-05 Parity Summary

**Added a batched `sovereigntyMarkers` GraphQL query that projects 02-01's canonical `Finding[]` output into a per-element self/downstream status pair, hardened both sovereignty resolvers with a shared zod input-validation boundary (500-node batch cap), and proved the resolver path and direct module call agree byte-for-byte.**

## Performance

- **Completed:** 2026-07-30
- **Tasks:** 2/2 completed
- **Files modified/created:** 6 (2 new source files, 2 new test files, 2 modified files)

## Accomplishments

- Implemented `projectMarkers`/`resolveMarker` in `server/src/sovereignty/markers.ts`, aggregating 02-01's `Finding[]` into a self/downstream marker map with zero new classification logic — the D-05 two-marker (fill/ring) model consumers (diagram layer, plan 02-05) can now call one batch query instead of re-deriving self/downstream status ad hoc.
- Added `Query.sovereigntyMarkers(companyId, rootType, rootId, nodes)` to `schema.graphql` and `resolvers.ts`, reusing the exact same JWT company-scoping check and `loadFullSupportChain` loader `sovereigntyAnalysis` already uses — markers and detail analysis always see identical chain data from a single loader.
- Hardened both sovereignty resolvers with `server/src/sovereignty/validation.ts`: a shared `sovereigntyAnalysisArgsSchema` (companyId/rootType/rootId) and a `sovereigntyMarkerNodesSchema` capped at 500 entries, parsed before the JWT check and before any Cypher executes — closes the unbounded-batch DoS/Information-Disclosure threat (T-02-04) and the Cypher-injection-via-unvalidated-string threat (T-02-05) named in `02-RESEARCH.md`.
- Proved SOV-05 parity for the GraphQL call site: `evaluator.parity.test.ts` mocks Neo4j at the `db/neo4j-client` module boundary, runs the real `Query.sovereigntyAnalysis` resolver against stubbed rows matching the `redChainFixture` worked example, and asserts its output is identical to calling `analyzeBusinessCapability` directly.
- 19/19 Jest tests passing across all four `sovereignty/__tests__/*.test.ts` suites; `yarn tsc --noEmit` clean across the whole `server/` project.

## Task Commits

Each task was committed atomically:

1. **Task 1: Marker projection module and batch GraphQL query** - `fcc9ce0` (feat)
2. **Task 2: Input validation hardening and resolver/module parity proof** - `79dc099` (feat)

_Note: this SUMMARY/state-update commit will be recorded separately as the plan metadata commit._

## Files Created/Modified

- `server/src/sovereignty/markers.ts` - `projectMarkers(analysis)` and `resolveMarker(markers, id)`: D-05 self/downstream marker projection over `Finding[]`, with `DEFAULT_MARKER` (GREEN/GREEN) as the single "never omit" fallback
- `server/src/sovereignty/validation.ts` - `rootTypeSchema`, `sovereigntyAnalysisArgsSchema`, `sovereigntyMarkerNodesSchema` (max 500) — zod schemas shared by both sovereignty resolvers
- `server/src/graphql/schema.graphql` - additive `SovereigntyMarker` type, `SovereigntyMarkerNodeInput` input, `extend type Query { sovereigntyMarkers(...) }`
- `server/src/sovereignty/graphql/resolvers.ts` - added `Query.sovereigntyMarkers`; both resolvers now parse args through `validation.ts`'s schemas before the JWT check and before any Cypher runs
- `server/src/sovereignty/__tests__/markers.test.ts` - covers all three `<behavior>` cases: capability-ring-only GREY-self, non-root self+downstream widening, and the GREEN-default-for-zero-findings case
- `server/src/sovereignty/__tests__/evaluator.parity.test.ts` - SOV-05 resolver/module parity proof plus T-02-04/T-02-05 validation-boundary rejection tests (oversized batch, malformed rootType, cap-boundary acceptance, no-session-opened-on-rejection)

## Decisions Made

- **`projectMarkers` omits elements with zero findings; `resolveMarker` is the single default-fill point.** Rather than have `projectMarkers` itself enumerate every node in the chain (which it cannot do — its only input is the flat `analysis.findings`, not the full chain object), compliant elements simply have no map entry. `resolveMarker(markers, id)` — used identically by the `sovereigntyMarkers` resolver and directly exercised in `markers.test.ts` — is the one place the GREEN/GREEN default lives, avoiding a second ad hoc "fill missing" implementation in the resolver.
- **Shared `sovereigntyAnalysisArgsSchema` for both resolvers' common args.** Rather than duplicating a `rootType !== 'businessCapability' && rootType !== 'dataObject'` check in both `Query.sovereigntyAnalysis` and `Query.sovereigntyMarkers` (as `sovereigntyAnalysis` had before this plan), both resolvers now parse their shared `companyId`/`rootType`/`rootId` args through one schema. `sovereigntyMarkers`'s `nodes` array is validated separately via `sovereigntyMarkerNodesSchema`.
- **Parity test mocks Neo4j at the module boundary, not `loadFullSupportChain` directly.** Mocking `../../db/neo4j-client`'s default export and stubbing `session.run` to return the exact rows the real Cypher queries would produce for the `redChainFixture` worked example exercises the actual resolver code path end-to-end (JWT decode, zod validation, dispatch, GraphQL DTO mapping) — a stronger SOV-05 proof than mocking the repository loader itself, which would only prove the dispatch line, not the whole call site.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added explicit validation-boundary rejection tests for T-02-04/T-02-05**
- **Found during:** Task 2, while verifying the plan's overall `<verification>` clause ("oversized `sovereigntyMarkers` requests are rejected with a validation error")
- **Issue:** The plan's Task 2 `<verify>` command only runs `evaluator.parity.test.ts` for the SOV-05 parity assertion; it did not itself demand a standalone test proving the 500-node cap and malformed-`rootType` rejection actually fire at the resolver boundary (as opposed to trusting zod's `.max()` semantics by inspection).
- **Fix:** Added four tests to `evaluator.parity.test.ts` (same file the plan already designates as a Task 2 artifact): rejecting a 501-node array, accepting exactly 500 (cap-boundary correctness), rejecting a malformed `rootType`, and asserting `Query.sovereigntyMarkers` throws before `neo4jDriver.session()` is ever called for an oversized batch.
- **Files modified:** `server/src/sovereignty/__tests__/evaluator.parity.test.ts`
- **Commit:** `79dc099` (part of Task 2 commit)

### Human Verification

No live GraphQL Playground / Docker+Neo4j verification was performed in this environment (Docker/Neo4j not running locally during this session), consistent with 02-01-SUMMARY.md's documented limitation. All verification in this plan is unit-level (Jest against fixtures and a stubbed Neo4j session module). The plan's `<verify>` steps that assume a running stack should be re-run against a live environment before this feature is considered fully field-verified.

## Self-Check: PASSED

All 6 claimed files verified present on disk (markers.ts, validation.ts, markers.test.ts, evaluator.parity.test.ts, plus modified schema.graphql/resolvers.ts). Both task commits (`fcc9ce0`, `79dc099`) verified present in git history. Full `sovereignty` Jest suite: 19/19 passing. `yarn tsc --noEmit`: clean.
