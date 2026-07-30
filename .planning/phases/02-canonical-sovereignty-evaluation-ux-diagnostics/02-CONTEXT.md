# Phase 2: Canonical Sovereignty Evaluation & UX Diagnostics - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase replaces the two diverging, inheritance-based sovereignty calculations (client-side `client/src/components/sovereignty/utils.ts` and the `ai-server` Temporal workflow in `ai-server/temporal/sovereignty/activities.ts`) with a single backend-owned canonical sovereignty analysis capability. That capability evaluates each relevant Application, AI Component, and Infrastructure element from its own explicit achieved ratings only (no inherited/fallback values), traverses the dependency chain from business requirement (BusinessCapability, DataObject) down to technical foundation, classifies findings as RED/YELLOW/GREY/GREEN, and exposes the same canonical result to element detail views and diagram markers. No data model expansion — this works entirely on existing `sovereigntyReq*`/`sovereigntyAch*` fields.

</domain>

<note>
## How this context was gathered

This context was first drafted autonomously on 2026-07-30 (the user was unavailable for that session) and every gray area was flagged `[AGENT ASSUMPTION]` for later review. The user then re-ran discuss-phase on 2026-07-30 specifically to review and confirm those assumptions interactively. All 4 areas (Chain traversal rules, Legacy score fields, Evaluation scope, Diagram markers + rollout visibility) were re-discussed with real user answers; decisions below are now user-confirmed, not agent assumptions, except where noted. See `02-DISCUSSION-LOG.md` for the full Q&A trail of both sessions.
</note>

<decisions>
## Implementation Decisions

### Chain traversal rules
- **D-01 [USER-CONFIRMED 2026-07-30]:** Multi-parent infrastructure (an Application/AIComponent `hostedOn` more than one Infrastructure, or an Infrastructure with more than one `parentInfrastructure`) is evaluated as **all edges independently**, not by picking a representative parent. Every hosting target the element depends on must itself satisfy the requirement; a violation on *any* hosting edge produces its own named finding (the specific Infrastructure id, not "the worst of several"). — **Reversibility:** costly — changes the shape of `Finding.chainPath` and any UI that assumes a single hosting parent per node; revisiting later means re-deriving findings and re-testing fixtures with multi-parent test data.
- **D-02 [USER-CONFIRMED 2026-07-30]:** Composite/container applications (`components: [Application!]` via `HAS_PARENT_APPLICATION`) are evaluated as **two independent things**: (1) the container application's own `sovereigntyAch*` fields are chain-checked like any other achieved entity — if empty, the container itself is GREY, it is never hidden or suppressed as the old `buildEffectiveApplication()` does today; (2) each component application is *also* independently chain-checked against the same upstream requirement. This removes the "container inherits from components, so hide the container's own values" anti-pattern flagged in `ARCHITECTURE.md` Anti-Pattern 1.
- **D-03 [USER-CONFIRMED 2026-07-30]:** Cycle safety: traversal tracks visited node ids per path (reusing the existing `visitedApplicationIds`-style pattern already in `client/src/components/sovereignty/utils.ts`) and silently stops re-descending into an already-visited node. No user-facing "cycle detected" finding type is introduced this phase — no evidence of real cycles in the current data, and this is a defensive-only concern, not a business requirement.
- **D-04 [AGENT ASSUMPTION]:** BusinessProcess sovereignty requirements remain **out of scope** for the Phase 2 chain (confirmed, not a new decision — `SOVX-02` explicitly defers this to v2 in REQUIREMENTS.md). Only `BusinessCapability` and `DataObject` are requirement roots in Phase 2.
- **D-05 [AGENT ASSUMPTION]:** Root-to-chain aggregation for the two-marker model (already locked in PROJECT.md Key Decisions / STATE.md): a RED finding anywhere below a node sets that node's **ring** (downstream-affected) marker; only the node that actually owns the violating rating gets the **fill** (self) marker. A BusinessCapability can never get a fill marker — it has no achieved rating of its own, only requirements — consistent with `eam-konzept.md` §3.

### Legacy score fields (Company-level rollup)
- **D-06 [USER-CONFIRMED 2026-07-30]:** `Company.expectedSovereigntyScore`, `achievedSovereigntyScore`, `sovereigntyGap`, `sovereigntyScorePercent`, `sovereigntyScoreStatus` are **kept as fields** (no schema change) but their computation is **redefined to be derived from the new canonical engine** instead of the separate ad hoc formula in `ai-server/temporal/sovereignty/activities.ts::computeSovereigntyScores`. The Temporal workflow keeps its role as the async batch/company-rollup trigger, but internally calls the same canonical evaluation module the backend uses for detail/marker queries, rather than re-implementing `maturityScore`/aggregation itself. This is required to satisfy **SOV-05** ("consistent across backend evaluation, background recomputation, and user-visible diagnostics") without duplicating logic a third time.
- **D-07 [USER-CONFIRMED 2026-07-30]:** The client-side duplicate (`client/src/components/sovereignty/utils.ts`: `resolveInheritedValue`, `buildEffectiveApplication`, `buildEffectiveInfrastructure`, `computeAggregatedAchievedScore`) is **deleted outright** as part of this phase per `PITFALLS.md` Pitfall 5 ("delete or quarantine inheritance helpers... instead of leaving them callable"), replaced by rendering the backend's canonical DTO. User explicitly chose "delete outright" over "quarantine (keep file, remove call sites)."

### Evaluation scope (entity types)
- **D-08 [USER-CONFIRMED 2026-07-30]:** Achieved leaf entities in the Phase 2 chain are **Application, AIComponent, and Infrastructure only** — matching the literal wording of SOV-01 ("application or infrastructure element"). **Suppliers are out of scope** for chain traversal in Phase 2, even though the schema shows real `PROVIDED_BY` / `SUPPORTED_BY` / `MAINTAINED_BY` / `HOSTED_BY` / `DEVELOPED_BY` / `MANUFACTURED_BY` relationships from Application/Infrastructure to Supplier and Suppliers already carry their own `sovereigntyAch*` fields. Rationale: requirements text names only application/infrastructure, ARCHITECTURE.md's documented data flow does not route through suppliers, and pulling suppliers into chain traversal now would widen the migration blast radius (Pitfall 7) beyond what was scoped. User confirmed this explicitly after being shown the trade-off (Suppliers are structurally one hop away and could plausibly represent "the technical foundation") and additionally asked for it to be logged as an explicit deferred backlog item (see Deferred Ideas below) rather than silently dropped.

### Diagram markers + rollout visibility
- **D-09 [USER-CONFIRMED 2026-07-30]:** The "optional" marker display required by SUX-03 is gated by the **existing `featureFlags.Sovereignty` company-level flag** already used in `client/src/components/aicomponents/AicomponentForm.tsx` (`const isSovereigntyEnabled = featureFlags.Sovereignty`), not a new per-diagram toggle. Reuses an established pattern instead of introducing a second gating mechanism.
- **D-10 [USER-CONFIRMED 2026-07-30]:** No inventory/coverage **dashboard UI** is built in Phase 2. `SOVX-03` ("portfolio-level trend or coverage analytics") stays v2/deferred per REQUIREMENTS.md and STATE.md Deferred Items. Phase 2 satisfies SOV-03's "grey must stay visible" requirement one element at a time (detail view + diagram marker). User initially asked for a "minimal coverage view" but, after the SOVX-03 scope conflict was flagged, confirmed "no UI, just config" — meaning the canonical evaluation module returning per-element status is sufficient (query/config-level capability); no dedicated UI screen, list, or dashboard component is built this phase. Backfill prioritization (`eam-konzept.md` §5, §7) remains an organizational follow-up, not an engineering deliverable.

### the agent's Discretion
- Exact GraphQL type/field names for the new analysis queries (`sovereigntyAnalysis`, `sovereigntyMarkers`, `sovereigntyImpacts` are suggested shapes in ARCHITECTURE.md, not locked).
- Internal repository/service module boundaries within `server/src/` (file layout), as long as one canonical module owns evaluation and is the only thing UI and Temporal call into.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Concept & Requirements
- `eam-konzept.md` — Source concept document: no-inheritance principle, RED/YELLOW/GREY/GREEN taxonomy, two-marker (fill/ring) diagram model, known existing weaknesses (duplicate calc logic, unused weight field, business-process requirements not evaluated).
- `.planning/ROADMAP.md` § Phase 2 — Goal and 5 success criteria for this phase.
- `.planning/REQUIREMENTS.md` — SOV-01..05, SUX-01..04 (v1, in scope) and SOVX-01..04 (v2, explicitly deferred).
- `.planning/PROJECT.md` — Brownfield/no-schema-expansion constraint; Key Decisions table.
- `.planning/STATE.md` — Current blockers/concerns note: "Phase 2 still needs a frozen semantic contract for traversal rules, cycle handling, and legacy field reconciliation" (addressed by D-01..D-07 above).

### Research (already completed for this milestone)
- `.planning/research/ARCHITECTURE.md` — Recommended backend-owned analysis service architecture, canonical `SovereigntyAnalysis`/`Finding`/`Marker` shapes, data flow for detail/diagram/rollup consumers, suggested build order, anti-patterns.
- `.planning/research/SUMMARY.md` — Milestone-level synthesis; Phase 2 internal sequence recommendation (semantic contract → canonical evaluator → migration inventory → detail diagnostics → diagram markers).
- `.planning/research/PITFALLS.md` Pitfalls 5-9 — Partial inheritance removal, silent fallback scoring, migration blast radius, markers-without-explanations, undefined traversal semantics before coding.
- `.planning/research/FEATURES.md` — Table-stakes vs deferred feature framing for this milestone.

### Current (to-be-replaced) implementation
- `client/src/components/sovereignty/utils.ts` — Client-side inheritance + worst-case aggregation logic to be deleted/quarantined (D-07).
- `client/src/graphql/sovereigntyDetail.ts` — Current raw-entity detail query to be replaced by a canonical analysis query.
- `ai-server/temporal/sovereignty/activities.ts` and `ai-server/temporal/sovereignty/workflow.ts` — Company-level batch rollup with its own diverging formula (D-06).
- `server/src/graphql/schema.graphql` — Existing `sovereigntyReq*`/`sovereigntyAch*` fields on BusinessCapability, DataObject, Application, AIComponent, Infrastructure, Supplier; existing relationships (`HOSTED_ON`, `HAS_PARENT_APPLICATION`, `USED_BY`, `SUPPORTS`, `PROVIDED_BY`/`SUPPORTED_BY`/`MAINTAINED_BY`/`HOSTED_BY`/`DEVELOPED_BY`/`MANUFACTURED_BY` for suppliers).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/lib/feature-definitions.ts` (`'Sovereignty'` flag) + `featureFlags.Sovereignty` usage in `AicomponentForm.tsx`/`SupplierForm.tsx` — existing gating pattern to reuse for diagram marker visibility (D-09).
- `client/src/components/diagrams/utils/databaseSyncUtils.ts` — existing `customData.databaseId` / `customData.elementType` linkage diagram elements already carry; marker batch query should key off this, per ARCHITECTURE.md's Diagram Marker Flow.
- Existing `visitedApplicationIds`/stack-based traversal in `collectAchievedDependencyTree` (`client/src/components/sovereignty/utils.ts`) — the cycle-safety *pattern* is reusable even though the surrounding inheritance logic is being replaced (D-03).

### Established Patterns
- Yarn-only workflow repo-wide.
- Additive-GraphQL preference for this brownfield system (existing CRUD schema/types must stay stable) — new sovereignty analysis queries should be added, not folded into existing entity types.
- `server/src/` is the correct home for the new canonical evaluation service per ARCHITECTURE.md's component boundary table (Sovereignty analysis service, Sovereignty repository/query adapter, GraphQL sovereignty API).

### Integration Points
- Detail views: wherever BusinessCapability/DataObject/Application/AIComponent/Infrastructure detail dialogs currently read raw `sovereigntyReq*`/`sovereigntyAch*` fields directly, they must switch to consuming the canonical analysis DTO (SUX-01, SUX-02).
- Diagram renderer: marker fill/ring rendering consumes a batch marker query keyed by `customData.databaseId`/`elementType` (SUX-03, SUX-04).
- `ai-server` Temporal workflow: must call into the same canonical module server-side rather than keep its own formula (SOV-05, D-06).

</code_context>

<specifics>
## Specific Ideas

- RED/YELLOW/GREY/GREEN taxonomy and fill/ring two-marker model are already fully specified in `eam-konzept.md` — treat as locked design, not a gray area.
- No data model/schema expansion for this phase — everything works on existing fields (explicit constraint in PROJECT.md).

</specifics>

<deferred>
## Deferred Ideas

- **Supplier participation in chain traversal** (D-08) — explicitly confirmed out of scope for Phase 2 by the user on 2026-07-30, with an explicit request that it be logged as a deferred backlog item for a future milestone (not silently dropped) since Suppliers do have real relationships (`PROVIDED_BY`/`HOSTED_BY`/`SUPPORTED_BY`/`MAINTAINED_BY`/`DEVELOPED_BY`/`MANUFACTURED_BY`) and their own achieved ratings.
- Inventory/coverage dashboard for newly-grey elements after inheritance removal — organizational/v2 concern (`SOVX-03`), not Phase 2 engineering scope. User confirmed no UI is built this phase; only the config/query-level capability (canonical per-element status) exists.
- Weighted sovereignty scoring (`sovereigntyReqWeight` field usage) — explicitly deferred to v2 per `SOVX-04` and `ARCHITECTURE.md` Brownfield Migration Notes.
- Business-process sovereignty requirements in the chain — deferred to v2 per `SOVX-02`.
- Blast-radius/portfolio prioritization — deferred to v2 per `SOVX-01`.

</deferred>

---

*Phase: 2-Canonical Sovereignty Evaluation & UX Diagnostics*
*Context gathered: 2026-07-30 (initial autonomous draft); re-confirmed interactively with user 2026-07-30*
