---
phase: 05-rework-chain-colors
plan: 01
status: complete
executed_at: 2026-09-01
files_modified:
  - server/src/sovereignty/types.ts
  - server/src/sovereignty/repository.ts
  - server/src/sovereignty/evaluator.ts
  - server/src/sovereignty/__tests__/fixtures.ts
  - server/src/sovereignty/__tests__/evaluator.test.ts
  - server/src/sovereignty/__tests__/evaluator.cycles.test.ts
tests: 70/70 passing (sovereignty suite)
---

# Summary — Plan 05-01 (Tracer)

Tracer slice proving Phase 5's chain-premise math end-to-end for
`BusinessCapability` on one sovereignty dimension (`security`), before the
full 4-dimension expansion + retirement pass in Plan B.

## What landed

### 1. `BusinessCapabilityChain.effectiveRequiredLevels: RequirementLevels`

- New readonly field on `BusinessCapabilityChain` (types.ts).
- Populated by the repository only for the analysis root; nested
  `childCapabilities` carry a null-quadruple (Plan B threads descendant
  effective-Req through the evaluator, not the repository).

### 2. Variable-length ancestor walk + TS-side max fold

- `fetchBusinessCapabilityChain` (repository.ts) now emits an additional
  `OPTIONAL MATCH (cap)-[:HAS_PARENT*0..]->(ancestor:BusinessCapability)-[:OWNED_BY]->(ancestorCompany:Company) WHERE $isAdmin OR ancestorCompany.id IN $companyIds`
  block (gated on `isRoot`, same as the existing parent-required match).
- Result collected as `ancestorRequiredRows` — includes the root itself at
  distance 0 so the fold reduces to `chain.required` for a lone root.
- TS-side fold in `foldEffectiveRequiredLevels` picks the max-per-dimension
  using the shared `maturityIndexOrDefault` (exported from evaluator.ts —
  sole ordinal source of truth). Null rows contribute `-1` and never win.
- Defensive T-05-02 cap: `ANCESTOR_FOLD_MAX_ROWS = 100` — log-warns and
  truncates on overflow. Neo4j per-edge uniqueness already bounds cyclic
  expansion; this is the belt-and-braces layer.
- The one-hop `parent`/`parentRequiredRows` block is untouched — Plan B owns
  the D-06 retirement of parent-consistency.

### 3. `classifyNode` deviation math

- Old rule: `actual < required → RED, else no finding`.
- New rule: `deviation = maturityIndex(required) − maturityIndex(actual)`
  - `deviation === 1` → **YELLOW**
  - `deviation >= 2` → **RED**
  - `deviation <= 0` → no finding
  - `actual === null` → GREY (unchanged)
  - `required === null` → no finding (unchanged)
- No literal scale bound (`4`) anywhere in the deviation branch — the ordinal
  check goes through `maturityIndex` only (D-02 scale-independence).

### 4. Effective-Req threading (BC root only)

- `collectOwnFindings` accepts an optional `requiredOverride`. When set, the
  root's downstream walkers (`walkApplication` / `walkInfrastructure` /
  `walkAIComponent`) classify against the override; otherwise they use
  `chain.required` (unchanged for DataObject / BusinessProcess).
- `analyzeCapabilitySubtree` accepts an optional `requiredOverride`. Only the
  root call receives one; recursion into `childCapabilities` intentionally
  drops it — nested BCs keep their own `chain.required` (Plan B threads
  proper descendant effective-Req).
- `analyzeBusinessCapability` prefers `chain.effectiveRequiredLevels` when it
  carries any dimension, otherwise falls back to `chain.required`. The
  fallback keeps hand-authored fixtures working (they don't need to hand-fold
  ancestors); production paths always populate via the repository.

### 5. Tracer fixture + describe block

- `ancestorStricterOneStepFixture(leafSecurity)` factory in fixtures.ts —
  root req `MEDIUM`, `effectiveRequiredLevels.security = HIGH` (mimicking a
  single stricter ancestor + root fold), one supporting Application
  parameterised by `leafSecurity`. Non-security dims on the leaf stay
  `VERY_HIGH` so only the security dim ever exercises the deviation math.
- New describe block **"Phase 5 tracer: BC ancestor-stricter deviation
  (security)"** in evaluator.test.ts with 4 it-cases:
  - leaf `MEDIUM` → 1 YELLOW (deviation = 1)
  - leaf `LOW` → 1 RED (deviation = 2)
  - leaf `HIGH` → no finding, downstream GREEN
  - leaf `null` → 1 GREY

## Pre-existing test adjustments

Two pre-existing tests that were literal deviation-1 cases against
`classifyNode`'s old strict-inequality rule were updated to reflect the new
YELLOW semantics. These are the only pre-existing behavior deltas — the
underlying test intents (walker produces a violation finding on the security
dim; classification shared with BC) are preserved.

- `evaluator.test.ts` → `analyzeDataObject` block: two assertions on
  `dataObjectChainFixture` (required HIGH vs achieved MEDIUM = 1-step
  deviation) changed from RED to YELLOW.
- `evaluator.cycles.test.ts` → `bRed` → `bYellow` (app-cycle-b: required
  MEDIUM vs achieved LOW = 1-step deviation) — same adjustment.

Plan B will rewrite the full test suite for uniform 4-dim coverage; these
two touchpoints are the minimum needed to keep Plan A's suite green.

## Fixture type-check migration

Added `effectiveRequiredLevels: requirementLevels()` to every hand-authored
`BusinessCapabilityChain` literal in fixtures.ts (33 sites, mechanical
sed insertion). Existing evaluator behavior is preserved via the
`hasAnyRequirement` fallback in `analyzeBusinessCapability` — a null-quadruple
`effectiveRequiredLevels` falls through to `chain.required`, so hand-authored
fixtures work exactly as before without needing to hand-fold ancestors.

## Verification

| Check                                                                    | Result           |
| ------------------------------------------------------------------------ | ---------------- |
| `cd server && yarn tsc --noEmit`                                         | exit 0           |
| `cd server && yarn jest src/sovereignty`                                 | 70/70 passing    |
| `grep "readonly effectiveRequiredLevels: RequirementLevels" types.ts`    | 1 hit            |
| `grep 'HAS_PARENT\*0\.\.' repository.ts`                                 | ≥ 1 hit          |
| `grep 'ancestorCompany.id IN $companyIds' repository.ts`                 | ≥ 1 hit          |
| `grep -c 'maturityIndex' repository.ts`                                  | 5 (≥ 1)          |
| `grep -c 'parentRequiredLevels' types.ts` (Plan B owns retirement)       | 3 (≥ 1)          |
| `grep -c 'maturityIndex' evaluator.ts`                                   | 8 (≥ 2)          |
| No literal `4` in `classifyNode` region (non-comment lines)              | 0 hits           |
| `grep -c 'ancestorStricterOneStepFixture' fixtures.ts`                   | 1 hit            |

## Not done in this plan (Plan B / C scope)

- 4-dim aggregation, BP + DO parity (`effectiveRequiredLevels` on
  `BusinessProcessChain` + `DataObjectChain`)
- D-06 hard retirement of `classifyCapabilityAgainstParent`,
  `parentRequiredLevels`, `comparedCapabilityIds`, `selfViolatingIds`
- `projectMarkers` rewrite (single findings-fold, drop
  three-valued `selfStatus` machinery)
- `companyRollup` YELLOW-drop bug fix
- Client-side i18n / detail-view copy (Plan C)

## Threat mitigations verified

- **T-05-01 (Tampering, Cypher)**: no user input concatenated into the new
  Cypher fragment — only `$companyIds` / `$isAdmin` placeholders.
- **T-05-02 (DoS, variable-length walk)**: Neo4j per-edge uniqueness +
  `ANCESTOR_FOLD_MAX_ROWS = 100` defensive cap with `console.warn`.
- **T-05-03 (Info disclosure, multi-tenant)**: `ancestorCompany.id IN
  $companyIds` filter on the extended `OPTIONAL MATCH` silently excludes
  cross-tenant ancestor rows from the fold.
- **T-05-04 (Rollup YELLOW-drop)**: not this plan — Plan B closes it.
