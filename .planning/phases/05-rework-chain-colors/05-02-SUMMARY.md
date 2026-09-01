---
phase: 05-rework-chain-colors
plan: 02
status: complete
executed_at: 2026-09-01
files_modified:
  - server/src/sovereignty/types.ts
  - server/src/sovereignty/repository.ts
  - server/src/sovereignty/evaluator.ts
  - server/src/sovereignty/markers.ts
  - server/src/sovereignty/companyRollup.ts
  - server/src/sovereignty/chainLabels.ts
  - server/src/sovereignty/__tests__/fixtures.ts
  - server/src/sovereignty/__tests__/evaluator.test.ts
  - server/src/sovereignty/__tests__/markers.test.ts
  - server/src/sovereignty/__tests__/companyRollup.test.ts
tests: 45/45 passing (sovereignty suite), full server suite green
---

# Summary — Plan 05-02 (Expansion + D-06 Retirement)

Land the Phase 5 chain-premise semantics uniformly across
BusinessCapability / DataObject / BusinessProcess, retire the pre-Phase-5
parent-consistency machinery (D-06 Option a — user-confirmed), rewrite
`projectMarkers` to a single findings-fold, fix the `companyRollup` YELLOW
silent-drop bug, and rewire the sovereignty test suite.

## What landed

### 1. Uniform `effectiveRequiredLevels` across all three root chain types

- `BusinessProcessChain.effectiveRequiredLevels: RequirementLevels` — new
  field.
- `DataObjectChain.effectiveRequiredLevels: RequirementLevels` — new field,
  set to `chain.required` verbatim at load time (uniform shape; DO has no
  ancestor concept).
- `SovereigntyAnalysis.comparedCapabilityIds` — deleted (D-06 retirement).

### 2. Repository: BP ancestor walk + DO uniform effectiveReq

- `fetchBusinessProcessChain` (repository.ts): replaced the one-hop
  `HAS_PARENT_PROCESS` fetch with a variable-length
  `HAS_PARENT_PROCESS*0..` walk filtered by
  `ancestorCompany.id IN $companyIds` (mirrors BC's Plan A pattern; T-05-03
  multi-tenancy re-verified). Folds `effectiveRequiredLevels` via the shared
  `foldEffectiveRequiredLevels` helper.
- `loadDataObjectSupportChain` (repository.ts): sets
  `effectiveRequiredLevels: required` on the returned chain.
- BC + BP `parentRequiredLevels` fetches / TS folds — deleted.

### 3. Evaluator: `maxByDimension` + `parentEffectiveReq` threading

- New exported helper `maxByDimension(a, b): RequirementLevels` in
  `evaluator.ts` — per-dim max via `maturityIndex`; reused semantics
  from repository's `foldEffectiveRequiredLevels` but on a per-pair basis
  for descendant recursion (no need for a whole rows array).
- `analyzeCapabilitySubtree` refactored: takes a `parentEffectiveReq`
  parameter, computes each level's own
  `effectiveReq = maxByDimension(chain.required, parentEffectiveReq)`,
  passes that into `walkApplication/Infrastructure/AIComponent` AND to the
  recursive descendant calls. Descendants therefore see the strictest
  requirement anywhere along their full ancestor chain (D-05).
- `classifyCapabilityAgainstParent` — deleted.

### 4. `classifyNode` deviation math (already all-dim from Plan A)

Plan A's `classifyNode` change is already dimension-agnostic (loops all
four `SOVEREIGNTY_DIMENSIONS`), so no additional code change was needed
here to satisfy Task 1's "all four dimensions" requirement. Plan B's
contribution: descendant threading + the new fixtures/tests that exercise
each dim.

### 5. Design A: nested-BC premise finding synthesis

`analyzeCapabilitySubtree` now synthesises one Finding per nested BC whose
subtree carries a real deviation (RED/YELLOW/GREY):

```ts
if (worstStatusOf(nested.findings) !== null) {
  descendantFindings.push({
    violatingElementId: child.rootId,
    violatingElementType: 'businessCapability',
    ...
    status: worst-of-dim over subtree,
    chainPath: [chain.rootId, child.rootId],
  })
}
```

This gives `projectMarkers` everything it needs to produce nested-BC fill
via the single unified findings-fold, without special-case
per-capability GREEN-backfill or self-violation-set machinery.

### 6. `projectMarkers` rewrite (RESEARCH §3.3)

Whole file rewritten as a single unified findings-fold:

```ts
markers.set(analysis.rootId, {
  selfStatus: analysis.selfStatus,     // GREEN if own req filled in else GREY
  downstreamStatus: analysis.downstreamStatus,
})
for (const finding of analysis.findings) {
  for (const id of finding.chainPath) {
    const current = markers.get(id) ?? DEFAULT_MARKER
    markers.set(id, {
      selfStatus: id === finding.violatingElementId
        ? worseStatus(current.selfStatus, finding.status)
        : current.selfStatus,
      downstreamStatus: worseStatus(current.downstreamStatus, finding.status),
    })
  }
}
```

`STATUS_RANK`, `worseStatus`, `DEFAULT_MARKER`, and `resolveMarker` are
unchanged. Data-gap dominance (D-02: YELLOW/RED beats GREY on the same
element) falls out automatically from the STATUS_RANK ordering.

### 7. `companyRollup` YELLOW fix (RESEARCH §8)

`pushAchievedScores` in `companyRollup.ts` used to have only RED and GREY
branches — since the Phase 5 evaluator now emits YELLOW for 1-step
deviations, those findings were being silently dropped from the rollup
(hiding degraded companies as fully-compliant). Added a YELLOW branch that
contributes `MATURITY_SCORE[finding.actualLevel]` alongside RED. A new
regression test (`YELLOW findings contribute their actualLevel to
achievedSovereigntyScore (Phase 5)`) asserts a YELLOW-only company yields
a non-null degraded score.

### 8. `chainLabels.ts` cleanup

Removed the block that walked `parentRequiredLevels` to seed labels for
parent nodes — no longer applicable after the D-06 retirement.

### 9. Test suite rewrite

**Deleted (retired describe blocks):**
- `analyzeBusinessCapability — parent-vs-child required-level contradiction`
- `analyzeBusinessCapability — comparedCapabilityIds / three-valued selfStatus`
- `analyzeBusinessProcess — parentProcess required-vs-required consistency`

**Updated (surviving tests):**
- BC `nestedCapabilitySubtreeFixture` test: split assertions between the
  leaf RED finding on `app-schlechte-app` and the new synthesised premise
  finding on `cap-test` (both status RED, both expected).
- DO `dataObjectChainFixture` selfStatus: GREY → GREEN (Phase 5 D-06
  uniform seed rule: root has required filled in → GREEN).
- `markers.test.ts`: rewritten from scratch — kept the DEFAULT_MARKER,
  compliant-element, GREY-leaf, and root-seed tests; added Design A
  synthesised premise finding test, precedence test, downstream YELLOW/RED
  fill tests.

**Added (Plan B new fixtures + tests):**
- `deviationOneStepFixture`, `deviationTwoStepFixture`,
  `deviationBoundaryFixture`, `precedenceViolationOverGapFixture`,
  `ancestorMaxWinsFixture` in `fixtures.ts`.
- `Phase 5: deviation math (all four dimensions)` describe block with 4
  it-cases (1-step→YELLOW, 2-step→RED, boundary NONE-vs-VERY_HIGH→RED,
  precedence RED-beats-GREY).
- `Phase 5: ancestor-stricter propagation via analyzeCapabilitySubtree`
  describe block verifying the `maxByDimension` fold makes a child BC's
  App classify against the ancestor's stricter effective-Req.
- `YELLOW findings contribute their actualLevel to achievedSovereigntyScore
  (Phase 5)` case in companyRollup.test.ts.

### 10. Fixture cleanup

- Mechanical removal of all `parentRequiredLevels: [...]` blocks from
  `fixtures.ts` (Python multi-line scanner — 43 sites, both single-line
  `[]` and multi-line array literals with nested `{ id, required }`).
- Removed 15+ unused fixture imports from `evaluator.test.ts`.

## Verification

| Check                                                                     | Result       |
| ------------------------------------------------------------------------- | ------------ |
| `cd server && yarn tsc --noEmit`                                          | exit 0       |
| `cd server && yarn jest src/sovereignty`                                  | 45/45 pass   |
| `cd server && yarn jest` (full server suite)                              | all pass     |
| `grep -rn 'classifyCapabilityAgainstParent' server/src`                   | 0 hits       |
| `grep -rn 'parentRequiredLevels' server/src`                              | 0 hits       |
| `grep -rn 'comparedCapabilityIds' server/src`                             | 0 hits       |
| `grep -rn 'selfViolatingIds' server/src`                                  | 0 hits       |
| BC + BP + DO have `readonly effectiveRequiredLevels: RequirementLevels`   | 3 hits       |
| `HAS_PARENT_PROCESS*0..` present                                          | 2 hits       |
| `ancestorCompany.id IN $companyIds` present (BC + BP)                     | 4 hits       |
| `maxByDimension` used                                                     | 3 hits       |
| `SOVEREIGNTY_STATUSES` stays `['RED', 'YELLOW', 'GREY', 'GREEN']`         | 1 hit        |
| `projectMarkers` uses none of the retired machinery                       | 0 hits       |
| `pushAchievedScores` has YELLOW branch                                    | 1 hit        |

## Behavior deltas from pre-Phase-5

- Every deviation-1 case that used to be RED is now YELLOW (BC, DO, BP).
  Existing tests that asserted specific RED values were updated to YELLOW.
- Every root's selfStatus is now uniformly `GREEN` (if own required is
  filled in) or `GREY` (if not) — DataObject's used-to-always-be-GREY
  selfStatus is now GREEN when required is set.
- Nested BCs with failing subtrees show real RED/YELLOW fill markers via
  the synthesised premise findings (was always GREY / GREEN-by-omission
  pre-Phase-5).
- YELLOW findings now contribute to `companyRollup.achievedSovereigntyScore`
  (were silently dropped pre-Phase-5).

## Not done in this plan (Plan C scope)

- Client-side i18n copy in `messages/{de,en}.json`.
- Detail-view `findingRowYellow` / `findingRowRed` / `findingRowGrey`
  dispatch in the three `SovereigntyXView.tsx` components.
- `greyEmptyBody` copy update to "no data available and no violation
  detected".

## Threat mitigations verified

- **T-05-01 (Tampering, Cypher)**: BP ancestor walk uses only `$companyIds`
  and `$isAdmin` placeholders — no user input concatenated into Cypher.
- **T-05-02 (DoS, variable-length walks)**: BC + BP both go through
  `foldEffectiveRequiredLevels` with the same `ANCESTOR_FOLD_MAX_ROWS = 100`
  cap and `console.warn` on overflow.
- **T-05-03 (Info disclosure, multi-tenant)**:
  `ancestorCompany.id IN $companyIds` filter present on BOTH BC and BP
  ancestor walks; cross-tenant ancestor rows silently excluded.
- **T-05-04 (Rollup YELLOW-drop)**: closed — YELLOW branch added to
  `pushAchievedScores` with regression test coverage.
