---
phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type
plan: 01
subsystem: api
tags: [typescript, jest, sovereignty, graph-evaluation, neo4j, graphql]

# Dependency graph
requires:
  - phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
    provides: analyzeSupportChain/analyzeDataObject/classifyNode/walkApplication canonical evaluator, loadFullSupportChain dispatcher, rootTypeSchema validation boundary
provides:
  - BusinessProcess as a third independent SovereigntyRootType with achieved-chain-only evaluation (analyzeBusinessProcess)
  - loadBusinessProcessSupportChain real Neo4j fetch, tenant-scoped identically to loadDataObjectSupportChain
  - sovereigntyAnalysis/sovereigntyMarkers GraphQL resolver dispatch for rootType 'businessProcess'
affects: [sovereignty, business-process, graphql-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'BusinessProcess achieved-chain evaluation is a byte-for-byte structural copy of analyzeDataObject/loadDataObjectSupportChain — one classifier (analyzeSupportChain), reused everywhere, no new leaf-node walker'

key-files:
  created: []
  modified:
    - server/src/sovereignty/types.ts
    - server/src/sovereignty/evaluator.ts
    - server/src/sovereignty/repository.ts
    - server/src/sovereignty/validation.ts
    - server/src/sovereignty/graphql/resolvers.ts
    - server/src/sovereignty/__tests__/fixtures.ts
    - server/src/sovereignty/__tests__/evaluator.test.ts

key-decisions:
  - "No deviations from plan — Task 1 (fixture-through-evaluator tracer) and Task 2 (real Neo4j fetch + resolver dispatch) executed exactly as written, each as one atomic commit."

requirements-completed: [SOVX-02, D-01, D-02]

coverage:
  - id: D1
    description: "BusinessProcess is a new independent SovereigntyRootType ('businessProcess'), analyzed via analyzeBusinessProcess which delegates to analyzeSupportChain/classifyNode/walkApplication unchanged — no new leaf-node walker written"
    requirement: 'D-02'
    verification:
      - kind: unit
        ref: 'server/src/sovereignty/__tests__/evaluator.test.ts#analyzeBusinessProcess'
        status: pass
    human_judgment: false
  - id: D2
    description: "A BusinessProcess whose own sovereigntyReq* required level exceeds the achieved level of one of its supportedByApplications (or hostedOn/components subtree) produces a RED Finding identical in shape to analyzeDataObject's equivalent case"
    requirement: 'SOVX-02'
    verification:
      - kind: unit
        ref: 'server/src/sovereignty/__tests__/evaluator.test.ts#analyzeBusinessProcess — produces exactly one RED finding when a supporting Application achieves the requirement but its hostedOn Infrastructure does not'
        status: pass
    human_judgment: false
  - id: D3
    description: "A real GraphQL sovereigntyAnalysis(rootType: 'businessProcess', ...)/sovereigntyMarkers(rootType: 'businessProcess', ...) query resolves via loadFullSupportChain's new dispatch branch and analyzeBusinessProcess, not a parallel code path"
    requirement: 'SOVX-02'
    verification:
      - kind: other
        ref: 'manual review: repository.ts loadFullSupportChain 3-way dispatch, resolvers.ts sovereigntyAnalysis/sovereigntyMarkers 3-way ternary — both route businessProcess to analyzeBusinessProcess exclusively'
        status: pass
    human_judgment: false
  - id: D4
    description: "sovereigntyAnalysisArgsSchema's rootType validation accepts 'businessProcess' before any Cypher runs (T-02-05 boundary check)"
    requirement: 'D-01'
    verification:
      - kind: other
        ref: "server/src/sovereignty/validation.ts rootTypeSchema = z.enum(['businessCapability', 'dataObject', 'businessProcess'])"
        status: pass
    human_judgment: false

duration: ~25 minutes
completed: 2026-08-10
status: complete
---

# Phase 4 Plan 1: BusinessProcess sovereignty backend tracer Summary

**Stands up `BusinessProcess` as a third, independent `SovereigntyRootType` with achieved-chain-only evaluation (own `sovereigntyReq*` vs. `supportedByApplications`), proven from a hand-built fixture through `analyzeBusinessProcess` to a real Neo4j Cypher fetch and the `sovereigntyAnalysis`/`sovereigntyMarkers` GraphQL resolver dispatch — no parent-consistency logic yet (Wave 2/04-02 scope).**

## Performance

- **Duration:** ~25 minutes
- **Tasks:** 2/2 completed
- **Files modified:** 7

## Accomplishments

- `SovereigntyRootType` extended to `'businessCapability' | 'dataObject' | 'businessProcess'`; new `BusinessProcessChain` interface added (achieved-chain shape only, `parentRequiredLevels` deferred to Plan 04-02).
- `analyzeBusinessProcess` added as a one-line delegate to `analyzeSupportChain(chain, 'businessProcess')`, mirroring `analyzeDataObject` exactly — no new leaf-node walker, no changes to `classifyNode`/`walkApplication`/`walkInfrastructure`/`walkAIComponent`/`collectOwnFindings`.
- Three new fixtures (`businessProcessRedFixture`, `businessProcessGreyFixture`, `businessProcessGreenFixture`) and a new `analyzeBusinessProcess` test suite (5 tests: RED, GREY, GREEN, always-GREY-self, rootType/capabilityIds/comparedCapabilityIds shape) — all passing.
- `loadBusinessProcessSupportChain` added to `repository.ts`, fetching a BusinessProcess's own `sovereigntyReq*` fields and its `SUPPORTS`-IN `Application`s via the identical `$isAdmin OR c.id IN $companyIds` tenant-scoping WHERE clause every other sovereignty fetch uses; `supportingAIComponents` is always `[]` (no AIComponent relation exists on `BusinessProcess` in schema.graphql).
- `loadFullSupportChain`'s two-way dispatch became three-way (`businessCapability` / `businessProcess` / `dataObject` fallback), with its return type widened to include `BusinessProcessChain`.
- `rootTypeSchema` (validation.ts) extended to accept `'businessProcess'` at the boundary, before any Cypher runs.
- Both `sovereigntyAnalysis` and `sovereigntyMarkers` GraphQL resolvers' rootType ternaries extended to three-way dispatch, routing a `businessProcess` chain to `analyzeBusinessProcess` and never to `analyzeDataObject` (which would silently mis-tag the returned `rootType`).

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end tracer — BusinessProcess achieved-chain classification on a hand-built fixture** - `82574c7` (feat)
2. **Task 2: Wire BusinessProcess achieved-chain to real Neo4j data and the GraphQL resolver dispatch** - `29706d7` (feat)

## Files Created/Modified

- `server/src/sovereignty/types.ts` - `SovereigntyRootType += 'businessProcess'`; new `BusinessProcessChain` interface (achieved-chain shape only)
- `server/src/sovereignty/evaluator.ts` - New `analyzeBusinessProcess` one-liner delegate; `BusinessProcessChain` import added
- `server/src/sovereignty/repository.ts` - New `loadBusinessProcessSupportChain`; `loadFullSupportChain` three-way dispatch; return type widened
- `server/src/sovereignty/validation.ts` - `rootTypeSchema` enum `+= 'businessProcess'`
- `server/src/sovereignty/graphql/resolvers.ts` - `analyzeBusinessProcess` import added; both resolver ternaries widened to three-way dispatch
- `server/src/sovereignty/__tests__/fixtures.ts` - `businessProcessRedFixture`/`businessProcessGreyFixture`/`businessProcessGreenFixture` added
- `server/src/sovereignty/__tests__/evaluator.test.ts` - New `describe('analyzeBusinessProcess', ...)` suite (5 tests)

## Decisions Made

None beyond what the plan specified — every action, behavior, and acceptance criterion was implemented verbatim.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Test Results

- `cd server && yarn tsc --noEmit` — clean (both tasks).
- `cd server && yarn jest src/sovereignty/__tests__/evaluator.test.ts` — 32/32 passed (Task 1 verify).
- `cd server && yarn jest src/sovereignty/__tests__/` (full suite: evaluator, markers, evaluator.cycles, companyRollup, evaluator.parity) — 52/52 passed, 5/5 suites (Task 2 verify) — no BusinessCapability/DataObject regression from the dispatch-signature widening.

## Next Phase Readiness

- `SovereigntyRootType`/`BusinessProcessChain` type additions and the `loadBusinessProcessSupportChain`/resolver dispatch wiring are the entry points Plan 04-02 (Wave 2) builds its parent-consistency extension (`parentProcess`/`childProcesses`, D-04) on top of.
- Zero changes made to `markers.ts`, `companyRollup.ts`, `analyzeCapabilitySubtree`/`collectOwnFindings`/`classifyCapabilityAgainstParent` (D-03 — BusinessCapability's downstream chain stays unwired from BusinessProcess), or any client file — confirmed by manual review, all deferred to Plan 04-02/04-03 as scoped.
- No Supplier-related code was added (D-05) — confirmed by manual review.
- No blockers for Plan 04-02.

---

_Phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type_
_Completed: 2026-08-10_

## Self-Check: PASSED

All 7 modified source/test files verified present on disk. Both task commits (`82574c7`, `29706d7`) verified present in `git log --all`.
