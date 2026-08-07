---
phase: 03-business-capability-self-status-green-when-consistent-with-p
plan: 01
subsystem: api
tags: [typescript, jest, sovereignty, graph-evaluation, neo4j]

# Dependency graph
requires:
  - phase: 02.3-business-capability-requirement-chain-consistency-compare-pa
    provides: classifyCapabilityAgainstParent parent/child required-level contradiction check (YELLOW), rootParentContradictionFixture / rootParentNoContradictionFixture fixtures
provides:
  - Three-valued BusinessCapability selfStatus (GREEN/YELLOW/GREY) in both analyzeBusinessCapability's own return value and projectMarkers()'s diagram markers
  - comparedCapabilityIds signal on SovereigntyAnalysis distinguishing "genuinely nothing compared" from "compared and consistent"
affects: [sovereignty, diagrams, business-capability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GREEN eligibility threaded as an additive boolean signal (hasRealComparison) alongside existing Finding[] returns, avoiding a second traversal"
    - "Detail-page selfStatus and diagram marker selfStatus computed from the exact same underlying data (parentContradictionFindings/rootHasRealComparison) to guarantee the two surfaces never disagree"

key-files:
  created: []
  modified:
    - server/src/sovereignty/types.ts
    - server/src/sovereignty/evaluator.ts
    - server/src/sovereignty/markers.ts
    - server/src/sovereignty/__tests__/fixtures.ts
    - server/src/sovereignty/__tests__/evaluator.test.ts
    - server/src/sovereignty/__tests__/markers.test.ts

key-decisions:
  - "Split the originally-combined edit into two atomic commits matching the plan's Task 1 / Task 2 boundaries (see Deviations) by temporarily reverting Task 2's fixture/test additions, verifying Task 1 stood alone, committing, then reapplying Task 2 and verifying/committing again."
  - "YELLOW-over-GREEN precedence required no new precedence logic — it falls out of the existing isCapabilitySelfViolation-checked-first ternary ordering in markers.ts, confirmed by the diamondSharedCapabilityFixture regression test."

patterns-established:
  - "Additive, non-GraphQL-exposed evaluator fields (comparedCapabilityIds) are the sanctioned way to thread new internal signals between evaluator.ts and markers.ts without touching schema.graphql or resolvers.ts."

requirements-completed: [D-01, D-02, D-03, D-04]

coverage:
  - id: D1
    description: "analyzeBusinessCapability's own selfStatus resolves GREEN/YELLOW/GREY (no hardcoded 'GREY' literal) and matches projectMarkers()'s SovereigntyMarker.selfStatus for the same root capability (rootParentNoContradictionFixture=GREEN, rootParentContradictionFixture=YELLOW, rootParentAllExcludedFixture=GREY)"
    requirement: "D-01"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/evaluator.test.ts#analyzeBusinessCapability — comparedCapabilityIds / three-valued selfStatus"
        status: pass
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#resolves GREEN when parentRequiredLevels is populated and produces no contradiction — a genuine comparison passed (Test F, D-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "GREY stays distinct for both 'no parent at all' and 'parent present but every dimension excluded' buckets"
    requirement: "D-01"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#stays GREY when a parent is present but every dimension is excluded from comparison (genuinely nothing compared)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Descendant capability (not just analysis root) resolves GREEN when its own required level is genuinely compared and consistent against its immediate parent"
    requirement: "D-01"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#resolves GREEN for a descendant whose own required level was genuinely compared against its immediate parent and found consistent (D-01 descendant half)"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-02 multi-parent: GREEN overall when one parent contributes zero comparable dimensions but another contributes a real, consistent one"
    requirement: "D-02"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#D-02: resolves GREEN overall when one parent contributes zero comparable dimensions but another contributes a real, consistent one"
        status: pass
    human_judgment: false
  - id: D5
    description: "YELLOW precedence over GREEN holds unchanged (diamond fixture) and D-04 no new Finding entries are produced for the GREEN case; D-03 zero GraphQL/schema/client changes"
    requirement: "D-03,D-04"
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#keeps a diamond-shared capability's genuine YELLOW self-violation even when a later finding block also passes through it (Test N, CR-01)"
        status: pass
      - kind: other
        ref: "manual review: server/src/graphql/schema.graphql, server/src/sovereignty/graphql/resolvers.ts, and all client rendering files untouched by this plan"
        status: pass
    human_judgment: false

duration: unknown (session resumed after context compaction; original start time not preserved)
completed: 2026-08-07
status: complete
---

# Phase 3 Plan 1: Business Capability selfStatus GREEN-when-consistent Summary

**Threads a `comparedCapabilityIds`/`hasRealComparison` signal from `evaluator.ts` through to `markers.ts` and `analyzeBusinessCapability`'s own return value, making `BusinessCapability.selfStatus` three-valued (GREEN/YELLOW/GREY) instead of two-valued, and fixes the hardcoded `selfStatus: 'GREY'` blocker so the `/sovereignty` detail page and the diagram markers never disagree.**

## Performance

- **Duration:** unknown — this execution resumed from a compacted conversation; the original `PLAN_START_TIME` was not preserved across the compaction boundary. All implementation work (both tasks) was already functionally complete at resume time; this session's work was verification (tsc/jest), splitting the combined edits into two atomic per-task commits, and documentation.
- **Tasks:** 2/2 completed
- **Files modified:** 6

## Accomplishments

- `SovereigntyAnalysis` gained an additive `comparedCapabilityIds: readonly string[]` field (never exposed via GraphQL) marking which capability ids had at least one real, non-excluded dimension compared against a parent.
- `classifyCapabilityAgainstParent` now returns `{ findings, hasRealComparison }`; both call sites (`analyzeCapabilitySubtree`'s descendant loop, `analyzeBusinessCapability`'s parent loop) wire the new signal through.
- `analyzeBusinessCapability`'s own `selfStatus` field — previously hardcoded to `'GREY'` — is now computed as YELLOW (any parent contradiction) > GREEN (real comparison, no contradiction) > GREY (nothing compared), closing the blocker where the `/sovereignty` detail page and the diagram's `SovereigntyMarker` could show contradicting colors for the same capability.
- `markers.ts`'s `projectMarkers` resolves GREEN in both the findings-loop ternary and the zero-finding backfill loop via a new `comparedIds` Set, mirroring the existing `selfViolatingIds` pattern.
- Proven end-to-end on the root-only case (Task 1, tracer) and generalized via fixture/test-only expansion to a descendant capability and D-02 multi-parent composition (Task 2), with no additional evaluator/markers code changes needed.
- Existing YELLOW-precedence (diamond fixture) and GREY-invariant (no-parent, nested-subtree) regressions verified unchanged and explicitly annotated.

## Task Commits

Each task was committed atomically:

1. **Task 1: Thread the "real comparison happened" signal end-to-end — root-only GREEN detection** - `b101f26` (feat)
2. **Task 2: Expand to descendant recursion + D-02 multi-parent GREEN composition, with precedence regression coverage** - `664373c` (test)

_Note: both tasks are TDD-tagged; per plan design, tests and source changes for Task 1 were authored together (types/evaluator/markers source + their exercising tests) and committed as one `feat` commit, and Task 2 is fixture/test-only (no source changes) per its own `<action>` instructions, committed as one `test` commit._

## Files Created/Modified

- `server/src/sovereignty/types.ts` - Added `comparedCapabilityIds: readonly string[]` to `SovereigntyAnalysis`
- `server/src/sovereignty/evaluator.ts` - `classifyCapabilityAgainstParent` returns `{ findings, hasRealComparison }`; `CapabilitySubtreeResult`/`analyzeCapabilitySubtree`/`analyzeBusinessCapability`/`analyzeSupportChain` wire `comparedCapabilityIds` through; `analyzeBusinessCapability`'s hardcoded `selfStatus: 'GREY'` replaced with computed YELLOW/GREEN/GREY value
- `server/src/sovereignty/markers.ts` - New `comparedIds` Set resolves GREEN in the findings-loop ternary and the zero-finding backfill loop
- `server/src/sovereignty/__tests__/fixtures.ts` - Added `rootParentAllExcludedFixture`, `nestedCapabilityGreenFixture`, `multiParentOneEmptyOneConsistentFixture`
- `server/src/sovereignty/__tests__/evaluator.test.ts` - New `selfStatus`/`comparedCapabilityIds` assertions on existing Test A/C, new describe block covering all 5 GREEN/GREY/YELLOW/descendant/multi-parent cases
- `server/src/sovereignty/__tests__/markers.test.ts` - Test F flipped GREY→GREEN with rewritten docstring; new all-excluded GREY test; new descendant-GREEN and multi-parent-GREEN tests; clarifying comments added to the existing nested-GREY (D-05/D-11) and diamond (Test N, CR-01) precedence-regression tests

## Decisions Made

- Split what had been implemented as one combined edit pass into two atomic per-task commits by temporarily removing Task 2's fixture/test additions, verifying Task 1 alone type-checks and passes its own test scope (34 tests), committing, then reapplying Task 2's additions, verifying the full suite (47 tests across 5 suites), and committing again — preserving the plan's intended commit granularity without redoing any implementation work.
- No source-code changes were needed for Task 2 (fixture/test-only), confirmed by running the full suite with zero modifications to `evaluator.ts`/`markers.ts` beyond Task 1's commit.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' `<action>`, `<behavior>`, and `<acceptance_criteria>` sections were followed verbatim; no bugs, missing functionality, or architectural changes were encountered.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `server/src/sovereignty/evaluator.ts`, `server/src/sovereignty/markers.ts`, and their test suites are fully green (`yarn tsc --noEmit` clean; `yarn jest src/sovereignty/__tests__/` — 5 suites, 47 tests passed).
- No GraphQL schema, resolver, or client rendering changes were needed (D-03) — the `/sovereignty` detail page and diagram markers already render all 4 `SovereigntyStatus` values generically.
- No blockers for subsequent Phase 3 plans, if any.

---
*Phase: 03-business-capability-self-status-green-when-consistent-with-p*
*Completed: 2026-08-07*

## Self-Check: PASSED

All 6 modified source/test files verified present on disk. Both task commits (`b101f26`, `664373c`) verified present in `git log --all`.

