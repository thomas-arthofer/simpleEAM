---
phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type
plan: 02
subsystem: api
tags: [typescript, jest, sovereignty, graph-evaluation, neo4j, graphql]

# Dependency graph
requires:
  - phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type
    plan: 01
    provides: BusinessProcess as a SovereigntyRootType with achieved-chain-only evaluation, loadBusinessProcessSupportChain, resolver dispatch
provides:
  - Generalized classifyCapabilityAgainstParent (violatingElementType param, default-preserving) reused by both BusinessCapability and BusinessProcess
  - analyzeBusinessProcess three-valued GREEN/YELLOW/GREY selfStatus against parentProcess (D-04)
  - loadBusinessProcessSupportChain real HAS_PARENT_PROCESS-OUT company-scoped Neo4j fetch
  - markers.ts selfViolatingIds fix (capabilityIds-membership, generalizes beyond the hardcoded 'businessCapability' string)
  - companyRollup.ts BusinessProcess inclusion for SOV-05 cross-surface consistency
affects: [sovereignty, business-process, graphql-api]

tech-stack:
  added: []
  patterns:
    - 'classifyCapabilityAgainstParent generalized via a defaulted violatingElementType param + a loosened structural {rootId, required} first-param type, instead of a duplicate classifyProcessAgainstParent'
    - 'markers.ts selfViolatingIds derives from capabilityIds membership (Pattern 3) instead of an enumerated ViolatingElementType string allow-list — extensible to future requirement-root types without another code change'

key-files:
  created: []
  modified:
    - server/src/sovereignty/types.ts
    - server/src/sovereignty/evaluator.ts
    - server/src/sovereignty/repository.ts
    - server/src/sovereignty/markers.ts
    - server/src/sovereignty/companyRollup.ts
    - server/src/sovereignty/__tests__/fixtures.ts
    - server/src/sovereignty/__tests__/evaluator.test.ts
    - server/src/sovereignty/__tests__/markers.test.ts
    - server/src/sovereignty/__tests__/companyRollup.test.ts

key-decisions:
  - "No deviations from plan — all three tasks (generalize classifyCapabilityAgainstParent + wire BusinessProcess parent-consistency; fix markers.ts's selfViolatingIds hardcoded-string bug with an explicit RED→GREEN regression test; extend companyRollup.ts for BusinessProcess) executed exactly as written, each as one atomic commit."
  - "Task 2's regression test was run BEFORE the fix and observed failing (received 'GREEN' instead of expected 'YELLOW'), proving the hardcoded-string bug was real and reproducible, then the fix was applied and the same test flipped to passing — the TDD RED→GREEN cycle the plan required for the critical fix."

requirements-completed: [D-04, D-05]

coverage:
  - id: D1
    description: "A BusinessProcess whose own required level for a dimension is weaker than any of its parentProcess's required levels for the same dimension produces a YELLOW Finding with violatingElementType='businessProcess', mirroring BusinessCapability's treatment exactly (D-04)"
    requirement: 'D-04'
    verification:
      - kind: unit
        ref: 'server/src/sovereignty/__tests__/evaluator.test.ts#analyzeBusinessProcess — parentProcess required-vs-required consistency (D-04), Test 6'
        status: pass
    human_judgment: false
  - id: D2
    description: "analyzeBusinessProcess's selfStatus is three-valued: YELLOW on contradiction, GREEN when at least one dimension was genuinely compared and consistent, GREY only when nothing is comparable"
    requirement: 'D-04'
    verification:
      - kind: unit
        ref: 'server/src/sovereignty/__tests__/evaluator.test.ts#analyzeBusinessProcess — parentProcess required-vs-required consistency (D-04), Tests 7-9'
        status: pass
    human_judgment: false
  - id: D3
    description: "Multi-parent parentProcess edges are evaluated independently (D-02 precedent) — a BusinessProcess below only ONE of two parents' required levels gets exactly one finding"
    requirement: 'D-04'
    verification:
      - kind: unit
        ref: 'server/src/sovereignty/__tests__/evaluator.test.ts#analyzeBusinessProcess — parentProcess required-vs-required consistency (D-04), Test 10'
        status: pass
    human_judgment: false
  - id: D4
    description: "CRITICAL FIX: a BusinessProcess's genuine YELLOW parent-contradiction finding is not silently swallowed to GREEN/GREY by markers.ts's selfViolatingIds precompute"
    requirement: 'D-04'
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/markers.test.ts#gives a BusinessProcess YELLOW selfStatus when its own required level contradicts its parentProcess (D-04 critical fix) — observed failing (GREEN) before the fix, passing (YELLOW) after"
        status: pass
    human_judgment: false
  - id: D5
    description: "No BusinessCapability↔BusinessProcess wiring introduced anywhere — analyzeCapabilitySubtree/collectOwnFindings/BusinessCapabilityChain untouched (D-03); no Supplier-related code added (D-05)"
    requirement: 'D-05'
    verification:
      - kind: other
        ref: "manual review + grep for 'supportedByBusinessProcesses'/'Supplier' across server/src/sovereignty/ — only pre-existing deferral doc comments match, no new wiring"
        status: pass
    human_judgment: false
  - id: D6
    description: "companyRollup.ts includes BusinessProcess ids in its owned-entity scan and folds their achieved/required scores into the same min/max company-wide computation as BusinessCapability/DataObject (SOV-05 cross-surface consistency)"
    requirement: 'D-04'
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/companyRollup.test.ts#includes a BusinessProcess's achieved/required scores in the company-wide rollup (Test B)"
        status: pass
    human_judgment: false

duration: ~30 minutes
completed: 2026-08-10
status: complete
---

# Phase 4 Plan 2: BusinessProcess parent-consistency, critical markers.ts fix, and company rollup Summary

**Extends `analyzeBusinessProcess` with a three-valued GREEN/YELLOW/GREY `selfStatus` against `parentProcess` (D-04) by generalizing the existing `classifyCapabilityAgainstParent` rather than duplicating it; fixes the critical `markers.ts` `selfViolatingIds` hardcoded-string bug that would have silently swallowed every BusinessProcess YELLOW self-violation into GREEN/GREY; extends `companyRollup.ts` to fold BusinessProcess into the company-wide SOV-05 score.**

## Performance

- **Duration:** ~30 minutes
- **Tasks:** 3/3 completed
- **Files modified:** 9

## Accomplishments

- `ViolatingElementType` extended with `'businessProcess'` (5th member); `BusinessProcessChain` gained `parentRequiredLevels` (mirrors `BusinessCapabilityChain`'s field type verbatim, documented as root-only since BusinessProcess has no nested achieved-chain subtree).
- `classifyCapabilityAgainstParent`'s signature generalized: first parameter loosened to the minimal structural `{ rootId, required }` shape (both `BusinessCapabilityChain` and `BusinessProcessChain` satisfy it structurally, no cast needed); a new `violatingElementType: ViolatingElementType = 'businessCapability'` parameter added, defaulting to preserve both existing call sites (`analyzeCapabilitySubtree`'s descendant loop, `analyzeBusinessCapability`'s root parent loop) unchanged.
- `analyzeBusinessProcess` rewritten from a one-line delegate into a ~15-line composition of `analyzeSupportChain` + one `classifyCapabilityAgainstParent(..., 'businessProcess')` call per `parentRequiredLevels` entry — mirrors `analyzeBusinessCapability`'s root-parent half exactly, without the `analyzeCapabilitySubtree` nested-descendant half (no `childProcesses` recursion — D-02 established BusinessProcess is flat).
- `loadBusinessProcessSupportChain` extended with a company-scoped `OPTIONAL MATCH (proc)-[:HAS_PARENT_PROCESS]->(parent:BusinessProcess)-[:OWNED_BY]->(parentCompany:Company)` clause (mirrors `fetchBusinessCapabilityChain`'s T-02.3-04 parent guard verbatim, `collect(DISTINCT ...)` to avoid Cartesian-product row multiplication), decoding `parentRequiredRows` into `parentRequiredLevels`.
- **Critical fix:** `markers.ts`'s `selfViolatingIds` precompute changed from `f.violatingElementType === 'businessCapability'` (hardcoded string, silently excluded every other requirement-root type) to `capabilityIds.has(f.violatingElementId)` (Option B from 04-RESEARCH.md — derives self-violation membership from the same `capabilityIds` set every other branch in the file already keys off). The regression test was run BEFORE the fix and observed failing (`'GREEN'` instead of `'YELLOW'`), confirming the bug was real, then flipped to passing after the fix.
- `companyRollup.ts`'s `OwnedIds` interface gained `businessProcessIds`; `loadOwnedIds`'s Cypher extended with a third `OPTIONAL MATCH (c)<-[:OWNED_BY]-(proc:BusinessProcess)` + `collect(DISTINCT proc.id)`; `analyzeCompanyRollup` gained a third loop mirroring the existing BusinessCapability/DataObject loops, calling `analyzeBusinessProcess` and folding its findings into the same `pushRequiredScores`/`pushAchievedScores` min/max computation.
- 4 new BusinessProcess parent-consistency fixtures (`businessProcessParentContradictionFixture`, `businessProcessParentNoContradictionFixture`, `businessProcessParentAllExcludedFixture`, `businessProcessMultiParentFixture`) added to `fixtures.ts`; the 3 pre-existing BusinessProcess fixtures updated with `parentRequiredLevels: []` to satisfy the type's new required field.
- 6 new tests in `evaluator.test.ts` (Tests 6-11: YELLOW contradiction, GREEN compared-and-consistent, GREY no-parent, GREY all-excluded, multi-parent independence, null-either-side exclusion) plus 3 new tests in `markers.test.ts` (the critical YELLOW regression, GREEN, GREY) plus 1 new test in `companyRollup.test.ts` (BusinessProcess folded into the rollup).

## Task Commits

Each task was committed atomically:

1. **Task 1: Generalize classifyCapabilityAgainstParent and wire BusinessProcess parent-consistency (three-valued selfStatus)** - `2f16dfd` (feat)
2. **Task 2: CRITICAL FIX — generalize markers.ts's selfViolatingIds filter** - `57a3933` (fix)
3. **Task 3: Include BusinessProcess in the company-wide sovereignty rollup (SOV-05)** - `d1048cd` (feat)

## Files Created/Modified

- `server/src/sovereignty/types.ts` - `ViolatingElementType += 'businessProcess'`; `BusinessProcessChain` gains `parentRequiredLevels`
- `server/src/sovereignty/evaluator.ts` - `classifyCapabilityAgainstParent` generalized (loosened first param, new defaulted `violatingElementType` param); `analyzeBusinessProcess` rewritten as a three-valued composition
- `server/src/sovereignty/repository.ts` - `loadBusinessProcessSupportChain` extended with the company-scoped `HAS_PARENT_PROCESS`-OUT fetch
- `server/src/sovereignty/markers.ts` - `selfViolatingIds` filter generalized from a hardcoded string check to `capabilityIds` membership (the critical fix)
- `server/src/sovereignty/companyRollup.ts` - `OwnedIds` += `businessProcessIds`; `loadOwnedIds`/`analyzeCompanyRollup` extended with a third BusinessProcess loop
- `server/src/sovereignty/__tests__/fixtures.ts` - 4 new BusinessProcess parent-consistency fixtures; 3 pre-existing BusinessProcess fixtures updated with `parentRequiredLevels: []`
- `server/src/sovereignty/__tests__/evaluator.test.ts` - New `describe` block with Tests 6-11
- `server/src/sovereignty/__tests__/markers.test.ts` - 3 new tests, including the critical regression test
- `server/src/sovereignty/__tests__/companyRollup.test.ts` - `company-2` fixture + 1 new test

## Decisions Made

None beyond what the plan specified — every action, behavior, and acceptance criterion was implemented verbatim. The one stale test-title comment left over from Plan 04-01 (`'always resolves selfStatus to GREY (no parent-consistency check yet — lands in Plan 04-02)'`) was reworded to reflect that the parent-consistency check now exists but these specific fixtures still resolve GREY (no parent) — a documentation-only change, not a behavior change.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Test Results

- `cd server && yarn tsc --noEmit` — clean (all three tasks).
- `cd server && yarn jest src/sovereignty/__tests__/evaluator.test.ts` — 38/38 passed (Task 1 verify).
- **Task 2 TDD RED→GREEN:** the critical regression test was run before the fix and observed **failing** (`Expected: "YELLOW", Received: "GREEN"`), confirming the hardcoded-string bug was real; after the fix, `cd server && yarn jest src/sovereignty/__tests__/markers.test.ts src/sovereignty/__tests__/evaluator.test.ts` — 52/52 passed.
- `cd server && yarn jest src/sovereignty/__tests__/` (full suite: evaluator, markers, evaluator.cycles, companyRollup, evaluator.parity) — **62/62 passed, 5/5 suites** — zero BusinessCapability/DataObject regressions from the `classifyCapabilityAgainstParent` generalization or the `markers.ts`/`companyRollup.ts` changes.

## Next Phase Readiness

- `classifyCapabilityAgainstParent` is generalized, not duplicated — no `classifyProcessAgainstParent` exists anywhere in the codebase.
- The critical `markers.ts` bug is fixed and explicitly regression-tested (not just implicitly covered by a passing suite).
- `companyRollup.ts` includes BusinessProcess for SOV-05 cross-surface consistency.
- D-03 (`analyzeCapabilitySubtree`/`collectOwnFindings`/`BusinessCapabilityChain` untouched, no `supportedByBusinessProcesses` wiring) and D-05 (no Supplier work) confirmed via manual review and grep — no violations.
- No blockers for Plan 04-03 (or any remaining Wave 3 work in this phase).

---

_Phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type_
_Completed: 2026-08-10_

## Self-Check: PASSED

All 9 modified source/test files verified present on disk. All three task commits (`2f16dfd`, `57a3933`, `d1048cd`) verified present in `git log --all`.
