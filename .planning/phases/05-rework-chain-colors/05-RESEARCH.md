# Phase 5: Rework Chain Colors — Research

**Date:** 2026-08-31
**Consumes:** [05-CONTEXT.md](.planning/phases/05-rework-chain-colors/05-CONTEXT.md) (D-01..D-06)
**Produced for:** `gsd-planner` (Phase 5)

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — One aggregated chain color per element, worst-of-4-sovereignty-dimensions. (reversible)
- **D-02** — For each dim `d`: `deviation[d] = max(0, effective-Req[d] − min-Achieved-in-chain[d])`. Thresholds `0→GREEN`, `1→YELLOW`, `≥2→RED`. GREY only when data is insufficient AND no provable violation exists elsewhere. Provable violation on any dim dominates data gaps on other dims. Thresholds must not hardcode `4` (scale-independent).
- **D-03** — Rule applies uniformly to `BusinessCapability`, `DataObject`, `BusinessProcess`. Downstream `Application`/`Infrastructure`/`AIComponent` keep the per-element two-marker shape; their color values come from the new premise math. (reversible)
- **D-04** — `fill` = "this element itself fulfils the chain premise". `ring` = worst chain-color strictly below. Both channels compute via chain-premise math; channel roles unchanged. (costly to reverse)
- **D-05** — `effective-Req[d] = max` of the root's own required level and every ancestor's required level along its parent hierarchy (BC `HAS_PARENT`, BP `HAS_PARENT_PROCESS`; DO has no parent). The standalone parent-vs-own YELLOW signal from Phase 02.3 D-05 / Phase 3 D-01 / Phase 4 D-04 goes away as a distinct diagram signal. (costly to reverse)

### the agent's Discretion

- **D-06** — Disposition of `classifyCapabilityAgainstParent` findings (retain / retire / repurpose) — resolved in §5.
- Repository shape for the ancestor fetch (materialise `effectiveRequiredLevels` vs. raw `ancestorRequiredLevels`) — resolved in §1.
- Where the collapse-to-worst-dimension happens (evaluator vs `projectMarkers`) — resolved in §2 / §3.
- Test-fixture churn strategy — resolved in §6.
- Client detail-view text — resolved in §7.

### Deferred Ideas (OUT OF SCOPE)

- No new marker channel, no new UI mockup.
- No new `SOVEREIGNTY_STATUSES` enum value.
- `BusinessCapability` ↔ `BusinessProcess` chain nesting stays out of scope (Phase 4 D-03).
- Supplier stays deferred (Phase 4 D-05).
- Blast-radius prioritisation, weighting, portfolio analytics (deferred to v2).

</user_constraints>

## Project Constraints (from copilot-instructions.md)

- Yarn only, never npm.
- Generic code must be reused; no parallel classifier per surface (evaluator/markers/rollup share the same `Finding[]` pipeline — 02-RESEARCH.md Anti-Pattern 3).
- GraphQL codegen: [`client/codegen.ts`](client/codegen.ts) consumes the running server schema; if schema changes, the client must run `yarn codegen`. (Phase 5 changes no schema — see §8.)

## Executive Summary

- **Repository (D-05 fetch shape):** materialise a new `effectiveRequiredLevels: RequirementLevels` field on `BusinessCapabilityChain` and `BusinessProcessChain` by extending the existing `isRoot`-gated ancestor fetch to a variable-length upward walk (`HAS_PARENT*0..` / `HAS_PARENT_PROCESS*0..`), and folding max-per-dimension in Cypher. The current one-hop `parentRequiredLevels` field is retired (or kept temporarily for D-06 explanation). `DataObjectChain` needs **no** repository change — `effective-Req` equals its own `required`.
- **Deviation math:** relocate the RED/YELLOW/GREY per-dimension verdict into `classifyNode` (which today emits only GREY and RED). Threshold: `0→no finding (GREEN)`, `1-step→YELLOW`, `≥2-step→RED`. The existing walker pipeline (`walkApplication` / `walkInfrastructure` / `walkAIComponent` — unchanged) produces per-leaf findings; `worseStatus` folds them into the element's fill via the SAME shape `projectMarkers` already uses. No new "min-Achieved aggregate" data structure needed — the min emerges from `worseStatus`-folding.
- **`projectMarkers` scope:** delete the three-valued `selfStatus` machinery (`selfViolatingIds`, `comparedCapabilityIds`, the capability GREEN-backfill loop). Every element (including nested BCs and requirement roots) resolves fill from findings alone via `worseStatus`. The new selfStatus for a root/BC equals worst-of-dim over its OWN premise verdict; for a downstream leaf equals its own achieved-vs-`effective-Req` verdict.
- **D-06 recommendation:** **Option (a) — retire `classifyCapabilityAgainstParent` entirely** from `SovereigntyAnalysis.findings`. Its intent is fully absorbed into effective-Req; keeping its outputs as informational findings distorts the semantics of the RED/YELLOW/GREY status vocabulary. A future "explain why effective-Req is X" panel is an additive extension.
- **Test churn:** the parent-vs-child contradiction test blocks in `evaluator.test.ts` (Test A–N) and every corresponding `markers.test.ts` assertion are the largest single-file rewrite. Roughly **60% of assertions change values**, ~10 fixtures rewire from "parent contradiction fixture" to "ancestor-stricter fixture", and 4 new fixtures cover the deviation boundary cases and precedence rule.
- **Task decomposition:** natural **3-plan tracer split** — Plan A tracer (BC, one dim, end-to-end); Plan B expansion (BC full + BP + DO parity, precedence rule, D-06 disposition, `companyRollup` YELLOW handling, full test rewire); Plan C polish (client detail-view text i18n).

## 1. Ancestor-Chain Fetch Design

### 1.1 The gap between current shape and D-05

Today's shape ([`repository.ts` lines 253-410 for BC](server/src/sovereignty/repository.ts#L253-L410)) fetches **one hop up** only, via an `isRoot`-gated OPTIONAL MATCH:

```cypher
OPTIONAL MATCH (cap)-[:HAS_PARENT]->(parent:BusinessCapability)-[:OWNED_BY]->(parentCompany:Company)
WHERE parent IS NULL OR $isAdmin OR parentCompany.id IN $companyIds
...
collect(DISTINCT parent { .id, .name, .sovereigntyReqStrategicAutonomy, .sovereigntyReqResilience,
                          .sovereigntyReqSecurity, .sovereigntyReqControl }) AS parentRequiredRows
```

D-05 requires `max` over the ENTIRE ancestor path per dimension. A single-hop fetch is insufficient — a chain BC → parent → grandparent where grandparent requires HIGH resilience but parent requires only MEDIUM currently misses the grandparent constraint.

### 1.2 Recommended shape

Materialise `effectiveRequiredLevels: RequirementLevels` on `BusinessCapabilityChain` and `BusinessProcessChain` — pre-folded max-per-dimension, computed in Cypher via a variable-length path traversal:

```cypher
// BusinessCapability — extended fetch
MATCH (cap:BusinessCapability {id: $rootId})-[:OWNED_BY]->(c:Company)
WHERE $isAdmin OR c.id IN $companyIds
WITH DISTINCT cap
// D-05 ancestor walk (root-only, per-branch cycle safety — see §1.4)
OPTIONAL MATCH ancestorPath = (cap)-[:HAS_PARENT*0..]->(ancestor:BusinessCapability)
  -[:OWNED_BY]->(ancestorCompany:Company)
WHERE $isAdmin OR ancestorCompany.id IN $companyIds
WITH cap,
     collect(DISTINCT ancestor) AS ancestors
// Fold max-per-dimension over ancestors + cap itself
// (Neo4j apoc.coll.max exists; a plain UNWIND + max aggregation works without apoc)
...
```

**Why "effective-Req" over "ancestor list"**:

- The evaluator only needs the folded max; storing the raw ancestor list forces every consumer (evaluator, `chainLabels`, tests) to re-fold it. Anti-Pattern 3 says "one classifier, reused everywhere" — the fold is a classification step, do it once at the boundary.
- If D-06 goes with option (c) later (repurpose `classifyCapabilityAgainstParent` as an explanation panel), we can layer an ADDITIVE `ancestorRequiredLevels: { id, name, required }[]` field alongside `effectiveRequiredLevels` at that point — the change is compatible.

**Type shape** ([`types.ts`](server/src/sovereignty/types.ts) update):

```ts
export interface BusinessCapabilityChain extends SupportChain {
  readonly rootType: 'businessCapability'
  readonly childCapabilities: readonly BusinessCapabilityChain[]
  /**
   * D-05: max-per-dimension over this element's own required PLUS every
   * ancestor's required along the HAS_PARENT hierarchy. Populated by the
   * repository for the analysis root only; nested `childCapabilities`
   * always carry `null`-quadruple `RequirementLevels` here (they receive
   * their effective-Req through the recursive evaluator walk instead —
   * see §2).
   */
  readonly effectiveRequiredLevels: RequirementLevels
  // parentRequiredLevels: RETIRED in Phase 5 (D-06 option a)
}
```

Same for `BusinessProcessChain` (via `HAS_PARENT_PROCESS*0..`). `DataObjectChain` needs **no change** — `effective-Req = required`; the evaluator can trivially treat DO's `chain.required` as its effective-Req.

### 1.3 Cypher extension — quoted current code + delta

Current one-hop for BC ([`repository.ts` line ~292](server/src/sovereignty/repository.ts)):

```cypher
OPTIONAL MATCH (cap)-[:HAS_PARENT]->(parent:BusinessCapability)-[:OWNED_BY]->(parentCompany:Company)
WHERE parent IS NULL OR $isAdmin OR parentCompany.id IN $companyIds
```

Phase 5 replacement:

```cypher
OPTIONAL MATCH (cap)-[:HAS_PARENT*0..]->(ancestor:BusinessCapability)-[:OWNED_BY]->(ancestorCompany:Company)
WHERE $isAdmin OR ancestorCompany.id IN $companyIds
```

Then in the RETURN clause, fold via UNWIND per dimension:

```cypher
WITH cap, collect(DISTINCT ancestor) AS ancestors
UNWIND ancestors AS a
WITH cap, ancestors,
     max(coalesce(sovIndex(a.sovereigntyReqStrategicAutonomy), -1)) AS maxSA,
     max(coalesce(sovIndex(a.sovereigntyReqResilience), -1)) AS maxR,
     max(coalesce(sovIndex(a.sovereigntyReqSecurity), -1)) AS maxSec,
     max(coalesce(sovIndex(a.sovereigntyReqControl), -1)) AS maxC
RETURN ..., sovLevel(maxSA) AS effReqSA, ...
```

Neo4j has no built-in enum ordering for the `NONE/LOW/MEDIUM/HIGH/VERY_HIGH` strings. Two options:

1. **Fold in Cypher via a CASE mapping** — requires inline `CASE x WHEN 'NONE' THEN 0 WHEN 'LOW' THEN 1 ...` blocks (`sovIndex`/`sovLevel` above are pseudocode). Verbose but no code duplication risk since the mapping matches `SOVEREIGNTY_MATURITY_LEVELS` order in [`types.ts` line 20](server/src/sovereignty/types.ts#L20).
2. **Return ancestor levels, fold in TypeScript** — return `collect(ancestor.sovereigntyReq*)`, plus `cap`'s own, then compute max in `fetchBusinessCapabilityChain` using `maturityIndex` (already exists at [`evaluator.ts` line 27](server/src/sovereignty/evaluator.ts#L27)).

**Recommendation: Option 2** (TS-side fold). Rationale: `maturityIndex` is the single source of truth for the ordinal mapping; duplicating it into Cypher (Option 1) creates a divergence-risk surface (Phase 4 04-02 found a similar hardcoded-vs-derived divergence bug in `markers.ts`). Cost of Option 2 is one extra pass over a tiny array per fetch — negligible.

### 1.4 Cycle-safety contract (Phase 2 D-03 preserved)

`HAS_PARENT*0..` on a graph with pathological cycles (BC A → B → A) would return infinite paths. Neo4j's traversal engine handles this via its default "no revisit within a single path" semantic (Cypher's variable-length path is uniqueness-per-edge, not per-node — but this is documented as safe against cycles because Neo4j's implementation rejects re-visiting a relationship within a single expansion).

**Concretely safe:** using `[:HAS_PARENT*0..]` in a single OPTIONAL MATCH is bounded even under cyclic data — the engine emits every simple path from `cap` to reachable ancestors and stops at each cycle. Verify empirically during Plan A tracer via [`capabilityCycleFixture`](server/src/sovereignty/__tests__/fixtures.ts) (a `childCapabilities` cycle) reformulated for HAS_PARENT — it must still yield finite `effectiveRequiredLevels` in bounded time.

**In-evaluator contract:** the existing per-branch visited-set contract in `analyzeCapabilitySubtree` ([`evaluator.ts` lines 300-345](server/src/sovereignty/evaluator.ts#L300-L345)) still applies for the DOWNWARD `childCapabilities` walk — nothing changes there. The upward ancestor walk moves entirely into repository/Cypher, replacing today's in-TS `classifyCapabilityAgainstParent` iteration.

### 1.5 Multi-tenancy

The current `parentCompany.id IN $companyIds` filter (T-02.3-04) applies unchanged to `ancestorCompany`. A cross-tenant ancestor is silently excluded from the max fold — same behavior contract.

## 2. Deviation Math Implementation Shape

### 2.1 Where per-dim deviation is computed

**Relocate deviation into `classifyNode`** ([`evaluator.ts` line 44](server/src/sovereignty/evaluator.ts#L44)). Today's classifier emits only two verdicts:

| Today                                               | Phase 5                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `achieved === null` → GREY finding                  | Same (GREY finding)                                            |
| `achieved < required` → RED finding                 | **Compute deviation index; RED if ≥2 steps, YELLOW if 1 step** |
| `achieved ≥ required` → no finding (implicit GREEN) | Same                                                           |

The `deviation` is computed on the `SOVEREIGNTY_MATURITY_LEVELS` scale using existing `maturityIndex` — no hardcoded "4":

```ts
const deviation = maturityIndex(requiredLevel) - maturityIndex(actualLevel)
if (deviation >= 2) status = 'RED'
else if (deviation === 1) status = 'YELLOW'
else return // no finding (satisfied)
```

**Where `effective-Req` enters the pipeline:** the callers of `classifyNode` (walkers + `collectOwnFindings`) currently pass `chain.required`. Phase 5 changes this to pass `chain.effectiveRequiredLevels` (materialised on `chain` by the repository per §1). For DO, `chain.required` and `effective-Req` coincide — call sites can either duplicate `chain.effectiveRequiredLevels = chain.required` (uniform shape) or dispatch on `rootType`. Recommend the uniform shape: assign `effectiveRequiredLevels := required` for DO in `loadDataObjectSupportChain`, so all downstream code uses one field. This avoids introducing a new `getEffectiveRequired(chain)` helper.

### 2.2 "min-Achieved-in-chain" is emergent, not stored

The prose in CONTEXT.md talks about "min-Achieved-in-chain[d]", but the existing walker + `worseStatus` fold already implements this implicitly:

- Each leaf produces one finding per non-satisfied dim.
- `projectMarkers` folds findings via `worseStatus` for the ring / downstream status.
- The "min-Achieved" per dim is just "the worst finding per dim from any leaf reachable through the chain".

**No new aggregate data structure is needed.** The migration path is purely: (a) `classifyNode` outputs YELLOW where it previously output implicit-GREEN, (b) the fold pipeline unchanged.

### 2.3 Nested BCs (D-11): effective-Req propagates down

`analyzeCapabilitySubtree` ([`evaluator.ts` lines 300-370](server/src/sovereignty/evaluator.ts#L300-L370)) recursively walks `childCapabilities`. Under D-05, a nested BC's effective-Req = `max(parent.effective-Req, ownRequired)`. The evaluator needs to thread this down:

```ts
function analyzeCapabilitySubtree(
  chain: BusinessCapabilityChain,
  parentEffectiveReq: RequirementLevels, // NEW parameter
  visited: ReadonlySet<string>
): CapabilitySubtreeResult {
  const effectiveReq = maxByDimension(chain.required, parentEffectiveReq)
  // ... walk chain's own supporting Apps/AI against effectiveReq
  // ... recurse childCapabilities with effectiveReq as their parentEffectiveReq
}
```

For the analysis root, `parentEffectiveReq` is the repository-fetched `chain.effectiveRequiredLevels` (which already includes chain.required folded with ancestors); for descendants, we fold with the ancestor context threaded through the walk. The one-hop `parentRequiredLevels` field the repository populates today for nested children is `[]` — Phase 5 makes this correct-by-construction (no per-nested-child re-fetch; the walk carries the constraint).

### 2.4 Downstream leaf (Application/Infrastructure/AIComponent) markers

**Fill** for a downstream leaf X in chain rooted at R: for each dim d, `deviation[d] = max(0, effective-Req_R[d] - achieved_X[d])`; element color = worst-of-dim. This is **exactly what the reworked `classifyNode` produces** — its findings for X naturally become X's fill via existing `worseStatus`-fold in `projectMarkers`.

**Ring** for X: worst chain-color from anywhere strictly below X. Same as today's `downstreamStatus` logic (worseStatus over findings whose `chainPath` contains X below its position). No new "which leaf caused the deviation" lookup needed — the existing chainPath-membership fold already answers this.

## 3. `projectMarkers` Rewrite Plan

### 3.1 STATUS_RANK and worseStatus — unchanged

The ranking `GREEN < GREY < YELLOW < RED` remains monotone under the new semantics:

- YELLOW = provable violation, small deviation.
- RED = provable violation, large deviation.
- GREY = data gap without provable violation.
- GREEN = premise fulfilled with complete data.

D-02's precedence rule ("provable violation on any dim dominates data gaps on other dims") maps directly onto `worseStatus`: `worseStatus(GREY, YELLOW) = YELLOW`, `worseStatus(GREY, RED) = RED`. ✓ Confirmed against [`markers.ts` lines 22-37](server/src/sovereignty/markers.ts#L22-L37) — no code change to `STATUS_RANK` or `worseStatus`.

### 3.2 Branches that DIE (delete)

Three chunks of `projectMarkers` ([`markers.ts` lines 63-190](server/src/sovereignty/markers.ts#L63-L190)) exist only to encode the three-valued parent-consistency `selfStatus` that D-05 absorbs:

1. **`selfViolatingIds` computation** (lines 76-98):

   ```ts
   const selfViolatingIds = new Set(
     analysis.findings
       .filter(f => capabilityIds.has(f.violatingElementId))
       .map(f => f.violatingElementId)
   )
   ```

   Under D-05, requirement roots never appear as `violatingElementId` in findings (their premise is evaluated against `effective-Req` at chain-classification time; no self-finding is emitted). **DELETE.**

2. **`comparedIds` GREEN-eligibility signal** (line 108, plus the entire `SovereigntyAnalysis.comparedCapabilityIds` field it consumes):

   ```ts
   const comparedIds = new Set(analysis.comparedCapabilityIds)
   ```

   Under D-05, the "compared and consistent" vs "nothing to compare" distinction dies — GREEN eligibility is now "premise fulfilled with complete data". **DELETE.**

3. **`isCapabilitySelfViolation` ternary** (lines 141-155):

   ```ts
   selfStatus: isCapabilitySelfViolation
     ? isViolatingElement
       ? worseStatus(current.selfStatus, finding.status)
       : current.selfStatus
     : isCapability
       ? comparedIds.has(id)
         ? 'GREEN'
         : 'GREY'
       : isViolatingElement
         ? worseStatus(current.selfStatus, finding.status)
         : current.selfStatus
   ```

   Collapses to the simple non-capability branch: `isViolatingElement ? worseStatus(...) : current.selfStatus`. **SIMPLIFY.**

4. **`capabilityIds` GREEN-backfill loop** (lines 173-190):
   ```ts
   for (const id of capabilityIds) {
     const current = ensure(id)
     if (selfViolatingIds.has(id)) continue
     markers.set(id, {
       selfStatus: comparedIds.has(id) ? 'GREEN' : 'GREY',
       downstreamStatus: current.downstreamStatus,
     })
   }
   ```
   Replaced by the general finding-fold loop (nested BCs get their fill from findings just like any other element — they are no longer the "always GREY" exception). **DELETE.**

### 3.3 What replaces this

A single unified fold over `analysis.findings`, one branch:

```ts
export function projectMarkers(analysis: SovereigntyAnalysis): Map<string, SovereigntyMarker> {
  const markers = new Map<string, SovereigntyMarker>()

  // Root always exists in the map (never omitted)
  markers.set(analysis.rootId, {
    selfStatus: analysis.selfStatus, // fill for the root = whole-chain premise
    downstreamStatus: analysis.downstreamStatus,
  })

  for (const finding of analysis.findings) {
    for (const id of finding.chainPath) {
      const current = markers.get(id) ?? DEFAULT_MARKER
      const isViolatingElement = id === finding.violatingElementId
      markers.set(id, {
        selfStatus: isViolatingElement
          ? worseStatus(current.selfStatus, finding.status)
          : current.selfStatus,
        downstreamStatus: worseStatus(current.downstreamStatus, finding.status),
      })
    }
  }

  return markers
}
```

Nested BCs derive their own selfStatus from findings where they ARE the violating element — but under D-05 no BC-vs-BC contradiction findings are emitted (no `classifyCapabilityAgainstParent`), so a BC's selfStatus reflects only what its OWN sub-chain premise says. That value must come from the evaluator's per-BC analysis: `analysis.perCapabilityStatus?: Map<id, SovereigntyStatus>` or (cleaner) synthesise findings where the BC is the violating element when its subtree's `min-Achieved-in-subtree < effective-Req_BC`. See §3.4.

### 3.4 How a nested BC gets its fill

Two viable designs:

**Design (A): Synthesise per-BC premise findings.** When `analyzeCapabilitySubtree` folds nested findings, additionally emit for each nested BC a `Finding` with `violatingElementId = nestedBC.rootId`, `violatingElementType = 'businessCapability'`, `status = worst-of-dim over its subtree deviation`. `projectMarkers` picks this up naturally via the `isViolatingElement` branch. **Pros:** minimal `projectMarkers` change; symmetric with Applications/Infra. **Cons:** BC now appears as a "violating element" in findings that are actually its premise verdict — semantically distinct from a leaf violation. Detail-view UI would need to distinguish.

**Design (B): Add `perCapabilityStatus: Map<id, SovereigntyStatus>` to `SovereigntyAnalysis`.** Evaluator computes and populates; `projectMarkers` reads and overrides fill for each id in the map. **Pros:** cleaner semantics — findings stay "leaf violations only". **Cons:** new field on `SovereigntyAnalysis`, must thread through the resolver (`toGraphQLAnalysis`), one more surface to test.

**Recommendation: Design (A)**. Rationale: a nested BC being the `violatingElementId` of a premise-verdict finding is EXACTLY what the current code already does for `classifyCapabilityAgainstParent` findings — the semantics are preserved but the trigger shifts from "parent contradiction" to "own subtree fails premise". `Finding` shape is unchanged. Detail-view: today already renders BC as `violatingElementType: 'businessCapability'`; the new finding just carries a different `chainPath` (subtree instead of parent-child pair) and a different meaning conveyed via i18n copy.

### 3.5 Downstream App/Infra/AI marker `fill`

CONTEXT.md D-04 says these "surface as fill when they are the min-Achieved that breaks a chain, and as ring up-propagation via worseStatus". Concretely: fill = per-dim `deviation` verdict against **effective-Req of the root that reached them**. This is exactly the reworked `classifyNode` output for each leaf — no additional "which leaf broke the chain" lookup is required, because `classifyNode` runs once per leaf per walk-path and produces the leaf's findings directly.

## 4. Precedence Rule Mechanization

Per-dimension decision procedure (produced by reworked `classifyNode`):

```
for each dim d:
  if effective-Req[d] is null:
    → no finding for d (nothing to require; not a data gap either)
  else if achieved[d] is null:
    → GREY finding for d
  else:
    deviation = maturityIndex(effective-Req[d]) - maturityIndex(achieved[d])
    if deviation >= 2:  → RED finding for d
    elif deviation == 1: → YELLOW finding for d
    else:                → no finding for d (satisfied → contributes GREEN via absence)
```

Per-element color = worst over findings for that element via `worseStatus`, using rank `GREEN(0) < GREY(1) < YELLOW(2) < RED(3)`. Because `worseStatus(GREY, YELLOW) = YELLOW` and `worseStatus(GREY, RED) = RED`, **data-gap dominance falls out of the ranking automatically** — a dim in violation always outranks a dim with missing data. ✓ Matches CONTEXT.md D-02 exactly.

Ring = worseStatus over findings whose `chainPath` contains this element below its position. Same rule.

**One edge case worth noting for the planner (not a rule change, an interaction test):** if effective-Req[d] is null (never required anywhere in the ancestor chain) and achieved[d] is also null, no finding is produced for that dim. That's correct — an unrequested unstated dim contributes GREEN via absence. Testing this is a new fixture — see §6.

## 5. D-06 Recommendation: `classifyCapabilityAgainstParent` Disposition

### Options

| #       | Option                                                                                                                                                                                                                                                                                    | Pros                                                                                                                                                                                                                                                                                                                           | Cons                                                                                                                                                                                                                                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a)** | **Remove entirely** — delete `classifyCapabilityAgainstParent`; remove its two call sites in `analyzeBusinessCapability` and `analyzeBusinessProcess` and the descendant-vs-parent call in `analyzeCapabilitySubtree`; drop `parentRequiredLevels` from types + repository                | Smallest post-Phase-5 surface. No dead code. `Finding[]` retains its single meaning ("premise violation of a chain element"). `Finding.violatingElementType` no longer needs the two exceptional values `'businessCapability'` / `'businessProcess'` — could revert to leaf-only types (04-CONTEXT.md D-04 exception unwinds). | Loses "why is effective-Req X" traceability from the detail view. Users lose a diagnostic surface. Slightly larger delete diff.                                                                                                                                                                                      |
| **(b)** | **Keep as-is** in `findings` (informational only, ignored by marker projection)                                                                                                                                                                                                           | Zero-diff evaluator; detail-view untouched.                                                                                                                                                                                                                                                                                    | Semantic confusion: findings now mix "premise violations" (drives marker color) and "structural parent hints" (no marker impact). Requires explicit `markers.ts` filter to ignore the informational ones — reintroduces the exact "isViolatingElement type check" pattern Phase 4 04-02 fixed. High regression risk. |
| **(c)** | **Repurpose as `effectiveRequirementSources` field** — retire the YELLOW findings; add a new additive field to `SovereigntyAnalysis`: `readonly effectiveRequirementSources: { dimension, level, sourceElementId, sourceElementName }[]` explaining per-dim WHERE effective-Req came from | Preserves traceability. Cleanest UX: "Resilience required HIGH because ancestor X requires HIGH".                                                                                                                                                                                                                              | Additive scope creep — new field, new resolver work, new detail-view rendering, new i18n. Not required by any P5 D-01..D-05 decision.                                                                                                                                                                                |

### Recommendation

**Option (a): remove entirely.**

Rationale:

1. **YAGNI / Nyquist:** D-05 is functionally complete without any of these findings. Nothing in D-01..D-05 requires the "why" trace. If users demand it later, option (c) is the ADDITIVE follow-up — non-blocking, non-regressive.
2. **Findings' semantic clarity:** the existing `Finding` type ([`types.ts` line 33](server/src/sovereignty/types.ts#L33)) is documented as "one violation, one dimension, one violating element". Option (b) makes findings polysemous. Phase 2's Anti-Pattern 3 warns exactly against this.
3. **Delete surface:** deleting `classifyCapabilityAgainstParent` also removes the special-case `violatingElementType === 'businessCapability' | 'businessProcess'` handling that has already caused one critical bug (Phase 4 04-02 `selfViolatingIds` filter regression). Fewer branches, less bug surface.
4. **The detail-view chain-node rendering is already sufficient:** `SovereigntyFinding.chainNodes` (SOV-04, `chainLabels.ts`) already shows the ancestor path for any finding. A YELLOW ancestor-stricter finding would just be a redundant version of that chain rendering.

Deprecation path: `parentRequiredLevels` field on `BusinessCapabilityChain` / `BusinessProcessChain` is retired at the same time. If the planner prefers a two-step approach (retire in Plan B, delete field in follow-up), the intermediate state is safe — the field simply becomes unused.

## 6. Test-Fixture Churn Map

Line counts and file structure verified against actual files ([`wc -l server/src/sovereignty/__tests__/*.ts`](server/src/sovereignty/__tests__/) — 969 fixtures, 583 evaluator tests, 210 markers tests, 213 companyRollup tests, 176 parity, 43 cycles).

| File                                                                                                                                 | Action                                            | Scope estimate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`server/src/sovereignty/__tests__/fixtures.ts`](server/src/sovereignty/__tests__/fixtures.ts)                                       | **Update in place + add ~5 new fixtures**         | Rename `rootParentContradictionFixture` → `ancestorStricterFixture` (or delete). Same for BP counterparts. `descendantParentContradictionFixture` retires (D-05 removes the descendant-vs-parent classifier). Adds: `deviationOneStepFixture` (HIGH req, MEDIUM ach → YELLOW), `deviationTwoStepFixture` (HIGH req, LOW ach → RED), `deviationBoundaryFixture` (NONE-vs-VERY_HIGH ≥2), `precedenceViolationOverGapFixture` (one dim RED, one dim GREY → RED wins), `ancestorMaxWinsFixture` (BC requires MEDIUM, grandparent requires HIGH → effective HIGH used against leaf). Keep unchanged: `cyclicApplicationFixture`, `compositeApplicationFixture`, `multiParentInfrastructureFixture`, `partialAchievedFixture`, `dataObjectChainFixture`, `nestedCapabilitySubtreeFixture`. |
| [`server/src/sovereignty/__tests__/evaluator.test.ts`](server/src/sovereignty/__tests__/evaluator.test.ts)                           | **Rewrite 3 describe blocks; keep 2 unchanged**   | KEEP: "analyzeBusinessCapability" achieved-chain basics (redChain/greyChain/greenChain), "analyzeDataObject" basics, "compositeApplication"/"multiParent"/"partialAchieved" tests, cycle tests. REWRITE: "parent-vs-child required-level contradiction" (Test A–N) → convert to "effective-Req ancestor propagation" cases. RETIRE: "comparedCapabilityIds / three-valued selfStatus" describe block (that field is deleted). REWRITE: "analyzeBusinessProcess" — selfStatus tests: today asserts GREEN when own req filled in AND parent consistent; Phase 5 asserts GREEN when whole-chain premise holds. Roughly ~40 assertions change values, ~30 stay identical.                                                                                                                |
| [`server/src/sovereignty/__tests__/markers.test.ts`](server/src/sovereignty/__tests__/markers.test.ts)                               | **Rewrite 10 of ~15 tests**                       | The "GREY-self forever for nested BCs" invariant DIES (nested BCs now get real fill). The Test E / F / N (parent-consistency selfStatus tests) DIE. The tests for `resolveMarker`/`DEFAULT_MARKER` stay. Add new: "downstream App inherits YELLOW fill when its achieved is 1 step below effective-Req of its root", "downstream Infra inherits RED fill at ≥2 step deviation", "ring propagates worst-of-below unchanged". Precedence regression test ("YELLOW beats GREY on same element") STAYS as-is — value-change only.                                                                                                                                                                                                                                                        |
| [`server/src/sovereignty/__tests__/companyRollup.test.ts`](server/src/sovereignty/__tests__/companyRollup.test.ts)                   | **Update in place — assertion values change**     | `pushAchievedScores` today skips YELLOW findings ([`companyRollup.ts` line 86](server/src/sovereignty/companyRollup.ts#L86)); Phase 5's evaluator now emits YELLOW findings for 1-step deviations. This is a **hidden bug** the planner must fix in the rollup: YELLOW findings must contribute their `actualLevel` to `achievedScores` too, otherwise the rollup silently ignores them. Test "counts an entirely-GREY DataObject chain toward achievedSovereigntyScore" numeric values re-verify; new test case for a company with a 1-step-deviation YELLOW finding.                                                                                                                                                                                                               |
| [`server/src/sovereignty/__tests__/evaluator.parity.test.ts`](server/src/sovereignty/__tests__/evaluator.parity.test.ts)             | **Update in place — assertion values change**     | `redChainFixture`'s expected findings still stand (RED at infra-vm-web-03, resilience). Byte-identical parity check preserved. If `SovereigntyAnalysis.comparedCapabilityIds` is dropped from the type (D-06 option a), the resolver DTO shape drops it too — parity assertion continues to work as long as both direct and resolver call ignore that field.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [`server/src/sovereignty/__tests__/evaluator.cycles.test.ts`](server/src/sovereignty/__tests__/evaluator.cycles.test.ts)             | **Update in place — assertion values may change** | `bFindings` count logic assumes today's classifier — if `classifyNode` now emits YELLOW for 1-step deviations, `app-cycle-b`'s security LOW-vs-MEDIUM (was 1 step) shifts from RED to YELLOW. Assertion value update, semantic behavior unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [`client/src/components/sovereignty/SovereigntyCapabilityView.tsx`](client/src/components/sovereignty/SovereigntyCapabilityView.tsx) | **No structural change; text only**               | See §7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [`client/src/components/sovereignty/SovereigntyDataView.tsx`](client/src/components/sovereignty/SovereigntyDataView.tsx)             | **No structural change; text only**               | See §7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [`client/src/components/sovereignty/SovereigntyProcessView.tsx`](client/src/components/sovereignty/SovereigntyProcessView.tsx)       | **No structural change; text only**               | See §7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [`client/messages/de.json`](client/messages/de.json), [`client/messages/en.json`](client/messages/en.json)                           | **Update `sovereigntyDetail` group**              | New/updated keys for `greenEmptyBody`, `greyEmptyBody`, `findingRow`, and add YELLOW/RED distinction copy ("deviation of 1 step" vs "deviation of ≥2 steps"). See §7 for exact keys.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## 7. Client Detail-View Impact

Structural check on the three views ([`SovereigntyCapabilityView.tsx` lines 88-103](client/src/components/sovereignty/SovereigntyCapabilityView.tsx#L88-L103)):

```tsx
if (analysis.downstreamStatus === 'GREEN') {
  return <Alert severity="success">...</Alert>
}
if (analysis.downstreamStatus === 'GREY' && analysis.findings.length === 0) {
  return <Alert severity="info">...</Alert>
}
```

Both branches keep working under new semantics — GREEN downstream still means "premise holds", GREY-empty still means "no data / no findings". **No structural JSX or query change required.** Confirmed by inspecting all three views — they render identically-shaped `SovereigntyAnalysis`.

**Text changes (i18n only):**

- `greyEmptyBody` — update copy from "no comparison could be made" to "no data available and no violation detected".
- Findings row copy — the message `findingRow` currently just prints `required` vs `actual`. New YELLOW findings need an explanation of "1-step deviation"; RED needs "≥2-step". Options: (a) new i18n keys per status; (b) inline the deviation delta in the copy. Recommend (a): `findingRowYellow`, `findingRowRed`, `findingRowGrey`, dispatched from the `finding.status` at render time. Small render change.

**No new UI channel is needed.** The `StatusChip` component's `selfStatusLabel` / `downstreamStatusLabel` labels are semantics-neutral ("Self" / "Downstream" translated); they continue to work.

## 8. Migration / Rollout Risk

**Storage-at-rest audit:**

- **Neo4j:** stores only raw `sovereigntyReq*` / `sovereigntyAch*` maturity levels on entity nodes. NO status enum values, NO computed premise verdicts. Verified via [`repository.ts`](server/src/sovereignty/repository.ts) — every Cypher query fetches raw levels and computes status at read time. **No data migration.**
- **Cached / materialised columns:** none. `companyRollup.ts` runs the full evaluator on every request (no memoization visible in `companyRollup.ts` — verified by full-file read).
- **Temporal / cron:** the retired Temporal `sovereigntyScoreWorkflow` now delegates to `sovereigntyCompanyRollup` (Phase 2 D-05). No stale precomputed values in Temporal. Confirmed by absence of `MATURITY_SCORE` references elsewhere.
- **Client-side cache:** Apollo Client fetch-policy is `cache-and-network` — refetch on mount. No persistent cache. Marker overlay uses `sovereigntyMarkers` query; refetches on diagram sync. No stale UI risk beyond a single fetch cycle.

**Schema changes (GraphQL):**

- [`server/src/graphql/schema.graphql` lines 2213-2320](server/src/graphql/schema.graphql#L2213-L2320) — verified:
  - `enum SovereigntyStatus { RED YELLOW GREY GREEN }` — **unchanged**.
  - `type SovereigntyMarker { nodeId, selfStatus, downstreamStatus }` — **unchanged**.
  - `type SovereigntyFinding { ..., status, chainPath, chainNodes }` — **unchanged** field-wise; `status` value distribution shifts (YELLOW now common on achieved-chain findings, previously YELLOW appeared only on parent-vs-child contradictions).
  - `type SovereigntyAnalysis { rootId, rootType, findings, selfStatus, downstreamStatus }` — **unchanged**.
- **`comparedCapabilityIds` is internal** (see [`types.ts` docstring line 83](server/src/sovereignty/types.ts#L83): "never exposed via GraphQL"). Removing it from the TS type has no schema/client impact.
- **No `yarn codegen` breakage** on client side because SovereigntyStatus enum values are unchanged.

**One rollup-behavior risk requiring an explicit fix:**

[`companyRollup.ts` `pushAchievedScores` (line 82-93)](server/src/sovereignty/companyRollup.ts#L82-L93) handles `RED` and `GREY` findings only:

```ts
if (finding.status === 'RED' && finding.actualLevel !== null) {
  scores.push(MATURITY_SCORE[finding.actualLevel])
} else if (finding.status === 'GREY') {
  scores.push(MATURITY_SCORE.NONE)
}
```

Under Phase 5, `classifyNode` will emit `YELLOW` findings for 1-step deviations that this branch **silently drops** — a company with only YELLOW findings would produce `achievedSovereigntyScore = null` instead of a real degraded score. **The planner MUST include a task to add a YELLOW branch to `pushAchievedScores`** (contribute `finding.actualLevel`, same as RED). Add a regression test in [`companyRollup.test.ts`](server/src/sovereignty/__tests__/companyRollup.test.ts) for a YELLOW-only company.

## Validation Architecture

Nyquist validation gate is **enabled** (`workflow.nyquist_validation: true` in `.planning/config.json`). Post-phase, the test surfaces below must exist.

### Test Framework

| Property           | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| Framework          | Jest (existing) — [`server/jest.config.js`](server/jest.config.js)   |
| Config file        | `server/jest.config.js`                                              |
| Quick run command  | `cd server && yarn jest src/sovereignty --testPathPattern=<file> -x` |
| Full suite command | `cd server && yarn jest src/sovereignty`                             |

### Phase Requirement → Test Map

Phase 5 has no REQUIREMENTS.md IDs; the acceptance criteria come from CONTEXT.md D-01..D-05.

| CTX ID        | Behavior                                                                               | Test Type   | Automated Command                                       | File                                                                      |
| ------------- | -------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| D-01          | Worst-of-4-dim aggregation per element                                                 | unit        | `yarn jest markers.test.ts -t "worst-of-dim"`           | 🆕 new case in `markers.test.ts`                                          |
| D-02          | Deviation-1 → YELLOW; deviation-≥2 → RED; scale-independent                            | unit        | `yarn jest evaluator.test.ts -t "deviation"`            | 🆕 new cases against `deviationOneStepFixture`, `deviationTwoStepFixture` |
| D-02          | Data-gap dominance: any RED/YELLOW beats any GREY                                      | unit        | `yarn jest markers.test.ts -t "precedence"`             | 🆕 uses `precedenceViolationOverGapFixture`                               |
| D-03          | Rule applies uniformly to BC/DO/BP                                                     | unit        | `yarn jest evaluator.test.ts -t "uniform"`              | 🆕 parallel cases per rootType                                            |
| D-04          | Downstream leaf fill = its own deviation vs effective-Req; ring = worseStatus of below | unit        | `yarn jest markers.test.ts -t "downstream leaf"`        | 🆕 new cases                                                              |
| D-05          | Effective-Req = max over ancestor chain — multi-level BC                               | unit        | `yarn jest evaluator.test.ts -t "ancestor max"`         | 🆕 `ancestorMaxWinsFixture`                                               |
| D-05          | Effective-Req = max over ancestor chain — multi-level BP via HAS_PARENT_PROCESS        | unit        | `yarn jest evaluator.test.ts -t "process ancestor max"` | 🆕 BP counterpart fixture                                                 |
| D-05          | DataObject: effective-Req = own required (no parent)                                   | unit        | `yarn jest evaluator.test.ts -t "dataObject"`           | ✅ existing `dataObjectChainFixture` — assertion value changes            |
| Integration   | Repository → evaluator → markers → resolver end-to-end chain-premise                   | integration | `yarn jest evaluator.parity.test.ts`                    | ✅ existing — assertion values update                                     |
| Integration   | Cycle safety preserved under new ancestor walk                                         | integration | `yarn jest evaluator.cycles.test.ts`                    | ✅ existing — assertion values update                                     |
| Companyrollup | YELLOW findings contribute to achievedSovereigntyScore                                 | unit        | `yarn jest companyRollup.test.ts -t "YELLOW"`           | 🆕 new test in `companyRollup.test.ts`                                    |

### Sampling Rate

- **Per task commit:** `cd server && yarn jest src/sovereignty --testPathPattern=<changed-file> -x`
- **Per wave merge:** `cd server && yarn jest src/sovereignty`
- **Phase gate:** full suite green before `/gsd-verify-work`.

### Wave 0 Gaps

None — all test files exist. Wave 0 is fixture-rewire only; no new file creation is required at Wave 0 (new test cases attach to existing describe blocks).

## Security Domain

`security_enforcement` is not explicitly configured in `.planning/config.json`; treating as **enabled** per default.

### Applicable ASVS Categories

| ASVS Category         | Applies                                                                           | Standard Control                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | no (phase touches evaluator internals; auth already applied at resolver boundary) | —                                                                                                                                              |
| V3 Session Management | no                                                                                | —                                                                                                                                              |
| V4 Access Control     | yes (repository ancestor walk crosses tenant boundary)                            | `parentCompany.id IN $companyIds` filter preserved on the new `HAS_PARENT*0..` walk (mirrors T-02.3-04)                                        |
| V5 Input Validation   | yes                                                                               | existing `sovereigntyAnalysisArgsSchema` / `sovereigntyMarkerNodesSchema` at [`validation.ts`](server/src/sovereignty/validation.ts) unchanged |
| V6 Cryptography       | no                                                                                | —                                                                                                                                              |

### Known Threat Patterns for this Phase

| Pattern                                                   | STRIDE                 | Standard Mitigation                                                                                                                                                                                                 |
| --------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-tenant ancestor leak via `HAS_PARENT*0..`           | Information Disclosure | Repeat T-02.3-04 tenant filter on `ancestorCompany.id`. Regression test: an ancestor owned by another company must be silently excluded from the max fold — assert effective-Req reflects only in-tenant ancestors. |
| Unbounded ancestor walk consumes memory / CPU             | Denial of Service      | Neo4j's variable-length path traversal is bounded to simple paths; realistic BC hierarchies never exceed ~10 levels. No per-request cap added; a synthetic pathological fixture (10K-node chain) is out of scope.   |
| Cyclic `HAS_PARENT` creates infinite loop in TS-side fold | DoS                    | TS-side `maturityIndex` fold operates on the `collect(DISTINCT ancestor)` output (a Set) — cannot loop.                                                                                                             |

## 10. Task Decomposition Hint

### Recommended split (3 plans, TRACER_MODE)

**Plan A — Tracer: BC single-dimension end-to-end deviation math**

Scope:

- Extend [`types.ts`](server/src/sovereignty/types.ts) to add `effectiveRequiredLevels: RequirementLevels` on `BusinessCapabilityChain`.
- Extend [`fetchBusinessCapabilityChain`](server/src/sovereignty/repository.ts) with the variable-length `HAS_PARENT*0..` walk (TS-side max fold).
- Rework `classifyNode` in [`evaluator.ts`](server/src/sovereignty/evaluator.ts) to emit YELLOW at 1-step deviation, RED at ≥2 (single dimension end-to-end — `security` chosen for parity with Phase 02.3's tracer dimension).
- Thread `effectiveRequiredLevels` through `analyzeSupportChain` / `walkApplication` for BC only.
- One new fixture: `ancestorStricterOneStepFixture` — BC with an ancestor requiring HIGH, own req MEDIUM, a leaf achieving MEDIUM → premise holds via `max(HIGH, MEDIUM) = HIGH`, leaf achieved MEDIUM → 1 step deviation → YELLOW finding.
- One new test in `evaluator.test.ts` asserting YELLOW finding on that fixture.
- No `projectMarkers` change yet; no `classifyCapabilityAgainstParent` removal yet.

Success signal: yarn tsc clean, the single new tracer test passes, existing tests still compile (parent-vs-child findings coexist temporarily as intermediate state).

**Plan B — Expansion: 4-dimension aggregation, BP + DO parity, D-06 removal, precedence, rollup fix, full test rewire**

Scope:

- Extend deviation math to all 4 dimensions.
- Rewrite `projectMarkers` per §3 (delete `selfViolatingIds`, `comparedIds`, backfill loop).
- Extend BP fetch with `HAS_PARENT_PROCESS*0..` variable-length walk; add `effectiveRequiredLevels` to `BusinessProcessChain`.
- Set `effectiveRequiredLevels := required` for DO in `loadDataObjectSupportChain` (uniform shape).
- **D-06 option (a):** delete `classifyCapabilityAgainstParent`, its call sites in `analyzeBusinessCapability` / `analyzeBusinessProcess` / `analyzeCapabilitySubtree`, `parentRequiredLevels` from types + repository, `comparedCapabilityIds` from `SovereigntyAnalysis`.
- **Rollup fix:** add YELLOW branch to `pushAchievedScores` in [`companyRollup.ts`](server/src/sovereignty/companyRollup.ts).
- **Test rewire:** the full churn per §6.
- Design (A) per §3.4: synthesise per-BC premise findings in `analyzeCapabilitySubtree` so nested BCs get fill from findings.

Success signal: full sovereignty suite green (unit + parity + cycles + rollup).

**Plan C — Polish: client detail-view text updates**

Scope:

- Update `sovereigntyDetail` i18n keys in `messages/de.json` + `messages/en.json`.
- Add `findingRowYellow` / `findingRowRed` / `findingRowGrey` dispatch in the three `SovereigntyXView.tsx` renderers.
- No structural JSX change; no query change.

Success signal: `client && yarn build` clean; smoke test of the /sovereignty detail page shows updated copy.

### Why this split (not 2, not 4)

- Plan A is a genuine tracer: it EXERCISES the whole stack (types → repo → evaluator → tests) for one dim, proving the ancestor walk works end-to-end before scaling. Any surprises around Cypher variable-length path performance or TS-side max fold surface here, before we've rewired every fixture.
- Plan B carries the bulk of the churn — including the risky pieces (D-06 removal, per-BC premise synthesis, rollup fix) — but only after Plan A validated the ancestor mechanism.
- Plan C is optional / low-risk; the planner could fold it into Plan B if translator work is trivial. Recommend keeping separate because a client rebuild is a distinct verification loop from the server suite.

Aligns with the project's default TRACER_MODE (Phase 02.3 and Phase 4 both used the same tracer-then-expansion split successfully).

## Contradictions Found

**None.** Every CONTEXT.md decision is supported by the current code shape:

- D-04 two-channel `SovereigntyMarker`: verified stable ([`markers.ts` line 10](server/src/sovereignty/markers.ts#L10), [`schema.graphql` line 2290](server/src/graphql/schema.graphql#L2290)).
- D-05 absorption of parent-consistency into chain math: no code depends on `classifyCapabilityAgainstParent`'s output outside `analyzeBusinessCapability` / `analyzeBusinessProcess` / `projectMarkers`. Safe to remove.
- Cycle-safety contract: preserved by moving the ancestor walk into Neo4j (Cypher variable-length path is cycle-safe by uniqueness-per-edge).
- No schema change needed: confirmed by direct read of `schema.graphql` lines 2213-2320.

One **minor caveat** for the planner (not a contradiction):

> `companyRollup.ts`'s `pushAchievedScores` silently drops YELLOW findings today. Under Phase 5 that's a bug that must be fixed in Plan B (not a research contradiction, but easy to miss during test rewire — flagged in §6 and §8).

## RESEARCH COMPLETE
