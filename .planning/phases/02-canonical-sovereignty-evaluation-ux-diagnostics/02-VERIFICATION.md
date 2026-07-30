---
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
verified: 2026-07-30T12:30:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open the GraphQL Playground (or the running client) against a live Docker/Neo4j stack and run sovereigntyAnalysis(companyId, rootType: \"businessCapability\", rootId) for a seeded BusinessCapability with a known RED chain violation."
    expected: "A non-error SovereigntyAnalysis response is returned with selfStatus: GREY, downstreamStatus: RED, and a findings[] entry naming the violating Application/Infrastructure, its dimension, requiredLevel, actualLevel, and chainPath."
    why_human: "No Docker/Neo4j stack was running during execution of 02-01/02-02; schema/resolver reachability was proven only via neoSchema.getSchema() introspection, not a live query. This is a documented limitation in 02-01-SUMMARY.md and 02-02-SUMMARY.md, not a skipped requirement."
  - test: "Open /sovereignty in the running app, select a company with a RED-classified capability and a GREY-classified DataObject, and visually confirm the self/downstream status chips, the scrollable findings list (required→actual, chain path), and the distinct GREEN vs GREY empty-state copy render as specified in 02-UI-SPEC.md."
    expected: "Self chip is always grey for capability/dataobject roots; downstream chip and finding rows use the exact RED/YELLOW/GREY/GREEN colors and copy strings; GREEN and GREY empty states are visually distinct, never blank."
    why_human: "React/MUI rendering correctness against live data is explicitly flagged human_judgment: true in 02-03-SUMMARY.md; no automated UI test exists for this view (server-only Jest scope per 02-VALIDATION.md)."
  - test: "Trigger sovereigntyScoreWorkflow against a live Temporal worker with a seeded company and confirm Company.sovereigntyScoreStatus transitions CALCULATING → IDLE, with the 4 score fields matching a manual sovereigntyCompanyRollup query for the same company."
    expected: "Workflow completes without error; rollup scores from the Temporal path and the direct GraphQL query are identical."
    why_human: "No live Temporal worker/Neo4j instance was available during execution of 02-04. This is explicitly recorded as an open item in .planning/WINDOWS.md (id 1, unrun-verify, status: open)."
  - test: "With featureFlags.Sovereignty enabled, open a diagram containing a BusinessCapability connected to an Application/Infrastructure element with a known RED finding. Confirm fill (10px, selfStatus) and ring (18px, downstreamStatus, dashed for YELLOW/solid for RED) ellipses render at the correct colors without altering the main element's own styling. Disable the flag and reopen; confirm zero sovereigntyMarkers network calls and zero rendered marker ellipses. Reopen twice with the flag enabled and confirm marker count stays at exactly 2 ellipses per element (no duplication)."
    expected: "Markers render/disappear correctly per flag state; colors/stroke-styles match UI-SPEC; no duplicate ellipses on repeated sync; main element styling untouched."
    why_human: "Excalidraw canvas rendering correctness is explicitly flagged human_judgment: true in 02-05-SUMMARY.md; no automated visual test exists for diagram marker output."
---

# Phase 02: Canonical Sovereignty Evaluation & UX Diagnostics Verification Report

**Phase Goal:** Architects can trust sovereignty assessments because each relevant element is judged from explicit evidence and the same explainable findings appear in detail views and diagrams.
**Verified:** 2026-07-30
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Phase 2 Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Element inspected is evaluated from its own explicit sovereignty achievement values, not inherited values | ✓ VERIFIED | `server/src/sovereignty/evaluator.ts`'s `classifyNode` reads only `node.achieved[dimension]` per-node, never an inherited/effective value. `client/src/components/sovereignty/utils.ts` (the old `resolveInheritedValue`/`buildEffectiveApplication`/`buildEffectiveInfrastructure`/`computeAggregatedAchievedScore` module) is deleted; `grep` confirms zero remaining repo-wide references to those exports. 21/21 Jest tests pass including the explicit "no inheritance" GREY case. |
| 2 | Sovereignty breaks along dependency chains are shown as explainable findings naming violating element, dimension, required value, actual value, and chain context | ✓ VERIFIED | `Finding` type carries `violatingElementId/Type/Name`, `dimension`, `status`, `requiredLevel`, `actualLevel`, `chainPath`. `evaluator.test.ts` asserts the exact `eam-konzept.md` worked example (VM-web-03/resilience/HIGH/LOW). Client `FindingsPanel` renders `required: {value} → actual: {value}` and `Chain: {chainPath}` per row (verified in `SovereigntyCapabilityView.tsx` source). |
| 3 | Missing sovereignty evaluations remain visible as gray/unknown rather than compliant by default | ✓ VERIFIED | `classifyNode`: `actualLevel === null` always produces a `GREY` finding, independent of whether a requirement is even set — never silently treated as GREEN. Unit-tested (`evaluator.test.ts`, `companyRollup.test.ts` GREY-not-dropped case). Client renders a distinct GREY empty-state copy, never merged with the GREEN empty state. |
| 4 | In an element detail view, a user can tell whether the current element is the cause of a sovereignty issue or affected by a weaker element elsewhere in the chain | ✓ VERIFIED (code-complete; visual correctness unverified — see Human Verification) | `SovereigntyCapabilityView.tsx`/`SovereigntyDataView.tsx` render two `StatusChip`s per root: self (`selfStatus`, always GREY for BusinessCapability/DataObject roots per D-05) and downstream (`downstreamStatus`, worst finding in the chain). Each finding row itself represents the node whose own achieved value violates the requirement (the "cause"). `yarn tsc --noEmit` clean; live rendering not exercised (no Docker/Neo4j stack running during execution — same limitation across 02-01/02-02/02-03). |
| 5 | When diagram markers are enabled, added elements show canonical sovereignty status markers distinguishing local violations from downstream impact | ✓ VERIFIED (code-complete; visual correctness unverified — see Human Verification) | `client/src/components/diagrams/utils/sovereigntyMarkers.ts` implements fill (10px, `selfStatus`) + ring (18px, `downstreamStatus`, dashed-for-YELLOW/solid-for-RED) ellipses via `applySovereigntyMarkers`, gated by `featureFlags.Sovereignty` (`syncSovereigntyMarkers`'s single D-09 gate, confirmed wired into both `syncDiagramOnOpen` call sites in `DiagramHandlers.ts`). Never mutates the main element's own `strokeColor`/`backgroundColor`/`strokeWidth` (confirmed by source read — `createMarkerEllipses` only sets properties on the two new ellipse objects). `yarn type-check` clean; live canvas rendering not exercised. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified; visual/live-stack confirmation for truths 4 and 5, plus the Temporal rollup, is deferred to human verification below — this is a documented, accepted environment limitation, not a code gap).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/src/sovereignty/{types,evaluator,repository}.ts` | Canonical GraphQL-independent evaluation engine | ✓ VERIFIED | Present, substantive, exercised by 21 passing Jest tests. |
| `server/src/sovereignty/graphql/resolvers.ts` | `sovereigntyAnalysis`/`sovereigntyMarkers`/`sovereigntyCompanyRollup` resolvers | ✓ VERIFIED | All three present; each validates args via `validation.ts` zod schemas, checks JWT company scoping before querying Neo4j. |
| `server/src/graphql/schema.graphql` additions | `SovereigntyStatus`/`SovereigntyFinding`/`SovereigntyAnalysis`/`SovereigntyMarker`/`SovereigntyCompanyRollup` types + 3 Query fields | ✓ VERIFIED | Confirmed present at lines 2213-2323; first custom field correctly uses `type Query { ... }` (no prior explicit Query block), subsequent fields use `extend type Query { ... }`. |
| `server/src/sovereignty/markers.ts` | D-05 self/downstream marker projection | ✓ VERIFIED | `projectMarkers`/`resolveMarker`, folds `Finding[]` with no new classification logic (reuses `evaluator.ts` output only). |
| `server/src/sovereignty/companyRollup.ts` | Canonical company-level rollup, GREY counted not dropped | ✓ VERIFIED | `pushAchievedScores` pushes `MATURITY_SCORE.NONE` for GREY findings instead of filtering them out; unit-tested. |
| `client/src/components/sovereignty/{SovereigntyCapabilityView,SovereigntyDataView}.tsx` | Canonical findings rendering | ✓ VERIFIED | Both query `GET_SOVEREIGNTY_ANALYSIS`; render self/downstream chips, scrollable (maxHeight 320) findings list, GREEN/GREY empty states with exact UI-SPEC copy. |
| `client/src/components/sovereignty/utils.ts` | Deleted (D-07) | ✓ VERIFIED (absence confirmed) | File does not exist; `grep` across `client/src/components/sovereignty/**` and repo-wide for its exported symbol names returns zero matches. |
| `client/src/graphql/sovereigntyMarkers.ts` + `client/src/components/diagrams/utils/sovereigntyMarkers.ts` | Diagram marker query + fetch/transform/gate pipeline | ✓ VERIFIED | `GET_SOVEREIGNTY_MARKERS` matches server contract field-for-field; `fetchSovereigntyMarkersForDiagram`/`applySovereigntyMarkers`/`syncSovereigntyMarkers` implement multi-root merge (`worseStatus`), 500-node cap, idempotent replacement, and the D-09 gate. |
| `ai-server/temporal/sovereignty/{activities,workflow}.ts` | Delegates to canonical `sovereigntyCompanyRollup`, no standalone formula | ✓ VERIFIED | `grep` for `MATURITY_SCORE|REQ_DIMS|ACH_DIMS|fetchSovereigntyReqEntities|fetchSovereigntyAchEntities` returns only one doc-comment mention (describing what was retired), zero code references. `cd ai-server && yarn tsc --noEmit` clean. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `server/src/graphql/schema.ts` | `server/src/sovereignty/graphql/resolvers.ts` | `Neo4jGraphQL({ ..., resolvers: sovereigntyResolvers })` | ✓ WIRED | Confirmed in source; additive, `features` property preserved. |
| `sovereigntyMarkers` resolver | `loadFullSupportChain` | Same loader `sovereigntyAnalysis` uses | ✓ WIRED | Confirmed — no second ad hoc loader exists. |
| `ai-server/temporal/sovereignty/activities.ts` | `sovereigntyCompanyRollup` (GraphQL) | `graphqlRequest` | ✓ WIRED | `computeSovereigntyScores` delegates via `graphqlRequest`; confirmed by grep + clean `tsc`. |
| `SovereigntyCapabilityView.tsx`/`SovereigntyDataView.tsx` | `GET_SOVEREIGNTY_ANALYSIS` | Apollo `useQuery` | ✓ WIRED | Confirmed in source; no remaining calls into deleted `utils.ts`. |
| `DiagramHandlers.ts` (`handleOpenDiagram`, `handleManualSync`) | `syncDiagramOnOpen(..., { enabled: featureFlags.Sovereignty, companyId: selectedCompanyId })` | Direct call | ✓ WIRED | Confirmed at both call sites via grep; `databaseSyncUtils.ts`'s `syncDiagramOnOpen` composes `syncSovereigntyMarkers` when the option is provided. |
| `evaluator.ts` classification | GraphQL resolver path | SOV-05 parity | ✓ WIRED | `evaluator.parity.test.ts` asserts byte-identical `Finding[]` output between direct module call and mocked-Neo4j resolver call — passing. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full sovereignty Jest suite passes | `cd server && yarn jest --testPathPattern=sovereignty` | 5 suites, 21/21 tests passed | ✓ PASS |
| Server TypeScript compiles cleanly | `cd server && yarn tsc --noEmit` | No output (clean) | ✓ PASS |
| ai-server TypeScript compiles cleanly | `cd ai-server && yarn tsc --noEmit` | No output (clean) | ✓ PASS |
| Client TypeScript compiles cleanly | `cd client && yarn tsc --noEmit -p tsconfig.json` | No output (clean) | ✓ PASS |
| Legacy inheritance module fully retired | `grep -r "from './utils'" client/src/components/sovereignty/**` | 0 matches | ✓ PASS |
| Legacy Temporal formula fully retired | `grep -rE "MATURITY_SCORE\|REQ_DIMS\|ACH_DIMS\|fetchSovereigntyReqEntities\|fetchSovereigntyAchEntities" ai-server/` | 1 doc-comment match only | ✓ PASS |
| Live GraphQL Playground query against seeded data | n/a — no Docker/Neo4j stack running | not run | ? SKIP (routed to human verification) |
| Live Temporal workflow trigger | n/a — no Temporal worker running | not run | ? SKIP (routed to human verification; recorded in WINDOWS.md) |
| Live diagram/UI visual walkthrough | n/a — requires running app + seeded data | not run | ? SKIP (routed to human verification) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SOV-01 | 02-01 | Explicit per-element evaluation, no inheritance | ✓ SATISFIED | `classifyNode` reads only `node.achieved`; legacy inheritance helpers deleted. |
| SOV-02 | 02-01 | Chain violation detection (required vs. achieved) | ✓ SATISFIED | RED finding logic + worked-example test. |
| SOV-03 | 02-01 | Missing evaluations classified GREY, never compliant-by-default | ✓ SATISFIED | GREY branch in `classifyNode`; GREY counted (not dropped) in company rollup. |
| SOV-04 | 02-01 | Explainable findings (violating element/dimension/required/actual/chain) | ✓ SATISFIED | `Finding` shape + tests + UI rendering. |
| SOV-05 | 02-01/02-02/02-04 | Consistent evaluation across backend, background recompute, and diagnostics | ✓ SATISFIED | `evaluator.parity.test.ts` (resolver vs. module parity); `companyRollup.ts` derives from the same evaluator; Temporal delegates via `graphqlRequest`. Live Temporal end-to-end run still outstanding (WINDOWS.md #1). |
| SUX-01 | 02-03 | Detail view shows self-vs-requirement satisfaction | ✓ SATISFIED (code); visual confirmation pending | Self/downstream chips + findings list implemented; live rendering unverified. |
| SUX-02 | 02-03 | Distinguishes cause vs. affected-by-downstream | ✓ SATISFIED (code); visual confirmation pending | Self (always GREY for roots) vs. downstream chip distinction implemented per D-05. |
| SUX-03 | 02-05 | Optional diagram sovereignty markers | ✓ SATISFIED (code); visual confirmation pending | Feature-flag-gated marker fetch/render pipeline implemented; live canvas rendering unverified. |
| SUX-04 | 02-05 | Markers distinguish local vs. downstream impact via separate visual states | ✓ SATISFIED (code); visual confirmation pending | Fill (self) vs. ring (downstream) with solid/dashed stroke redundant encoding implemented. |

No orphaned requirements — all 9 map to a plan's `requirements` frontmatter and to a ROADMAP success criterion.

### Anti-Patterns Found

None found in files modified by this phase. No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` markers, no stub returns (`return null`/`return {}`/empty handlers), no hardcoded-empty props flowing to rendering in the reviewed sovereignty source files. The one documented deviation (custom Query fields requiring `type Query` vs. `extend type Query`) is a library-behavior fix, not a stub.

### Human Verification Required

1. **Live GraphQL query against seeded data** — Test: run `sovereigntyAnalysis` for a real seeded BusinessCapability with a known chain violation on a running Docker/Neo4j stack. Expected: non-error response with correct selfStatus/downstreamStatus/findings. Why human: no live stack was running during 02-01/02-02 execution; schema reachability was proven only via `neoSchema.getSchema()` introspection.
2. **Detail view visual walkthrough** — Test: open `/sovereignty`, inspect a RED capability and a GREY DataObject. Expected: correct chip colors, findings list content, and distinct empty-state copy per 02-UI-SPEC.md. Why human: React/MUI rendering correctness explicitly flagged `human_judgment: true` in 02-03-SUMMARY.md.
3. **Temporal workflow live trigger** — Test: trigger `sovereigntyScoreWorkflow` for a seeded company against a live Temporal worker. Expected: `CALCULATING → IDLE` transition with scores matching a manual `sovereigntyCompanyRollup` query. Why human: recorded as an **open** item in `.planning/WINDOWS.md` (id 1); no Temporal worker/Neo4j instance was available during 02-04 execution.
4. **Diagram marker visual walkthrough** — Test: enable `featureFlags.Sovereignty`, open a diagram with a known RED chain; confirm fill/ring ellipse colors, stroke styles, no main-element style mutation, flag-off produces zero network calls/zero markers, and repeated opens never duplicate ellipses. Why human: Excalidraw canvas rendering explicitly flagged `human_judgment: true` in 02-05-SUMMARY.md.

### Gaps Summary

No blocking gaps. All 5 ROADMAP success criteria and all 9 mapped requirements (SOV-01..05, SUX-01..04) are implemented, unit-tested (21/21 passing across 5 Jest suites), and compile cleanly across `server`, `ai-server`, and `client` (all `tsc`/`type-check` runs clean). The legacy inheritance-based client helper and the legacy Temporal scoring formula are both fully retired with zero remaining references. All three sovereignty resolvers share one canonical evaluator, and resolver/module parity is explicitly proven by a passing test (`evaluator.parity.test.ts`).

The only outstanding items are **environment-limited, previously documented, human-judgment verifications** — no Docker/Neo4j/Temporal stack was running during any of the 5 plans' execution sessions. These were consistently disclosed across all 5 SUMMARY.md files (not concealed) and one is already tracked as an open item in `.planning/WINDOWS.md`. Per the request's guidance, these are treated as accepted/known gaps rather than automatic failures, but they are flagged here and route the overall status to `human_needed` rather than `passed`, because live-stack/visual behavior has genuinely never been exercised end-to-end.

**Minor process note (non-blocking):** `.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-VALIDATION.md` frontmatter still shows `status: draft`, `nyquist_compliant: false`, and an empty Approval sign-off — this validation-strategy document was never updated to reflect the actual executed test suite (it still lists `TBD`/`⬜ pending` placeholders from initial planning, even though the corresponding Jest tests were in fact written and pass). This is a documentation/process gap, not a code gap, and does not affect the functional verdict above.
