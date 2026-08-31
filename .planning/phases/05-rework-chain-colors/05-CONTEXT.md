# Phase 5: Rework Chain Colors - Context

**Gathered:** 2026-08-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Redefine the sovereignty marker color computation so that a requirement-root chain
(`BusinessCapability` → `Applications`/`AIComponents` → `Infrastructure`,
`DataObject` → `Applications`/`AIComponents` → `Infrastructure`, and
`BusinessProcess` → `Applications`/`AIComponents` → `Infrastructure`) is scored
against a single **chain premise**:

> For each sovereignty dimension `d`:
> `effective-Req[d] ≤ min-Achieved-in-chain[d]`
> where `effective-Req[d] = max` of the root element's own required level and every
> ancestor's required level along the root's parent hierarchy (BC parent-tree,
> BP parent-tree; DataObject has no parent hierarchy today).

An element's chain color is the worst-of-four-dimensions verdict:

| Color  | Meaning                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| GREEN  | Data complete AND premise holds on every dimension (deviation = 0)                                         |
| YELLOW | Provable premise violation with worst-dimension deviation of exactly 1 step on the sovereignty scale (0–4) |
| RED    | Provable premise violation with worst-dimension deviation ≥ 2 steps                                        |
| GREY   | Insufficient data (some required or achieved missing) AND no provable violation on any dimension           |

Precedence: a provable violation on any dimension **dominates** data gaps on
other dimensions — YELLOW/RED can be assigned before the chain is fully
populated. GREEN is only assigned once every dimension has enough data to
evaluate.

The two-marker rendering shape is preserved: `fill` = "this element itself
fulfils the chain premise", `ring` = worst chain-color found strictly below
this element (blast radius). Only the color-computation rule changes; the
`selfStatus` / `downstreamStatus` channels keep their meanings.

Element-type scope: all three requirement-root types
(`BusinessCapability`, `DataObject`, `BusinessProcess`) get the new
color rule uniformly. Downstream `Application` / `Infrastructure` /
`AIComponent` markers keep their existing per-element two-marker mechanism, but
the color values that flow into them are recomputed via the new chain-premise
math (they surface as `fill` when they are the min-achieved that breaks a
chain, and as `ring` up-propagation via `worseStatus`).

The `SOVEREIGNTY_STATUSES` GraphQL enum stays exactly
`['RED', 'YELLOW', 'GREY', 'GREEN']` — no new value added. Only the _semantic_
of `YELLOW` shifts (from "parent-vs-own required contradiction" to
"chain deviation of exactly 1 step").

</domain>

<decisions>
## Implementation Decisions

### Chain color aggregation across dimensions

- **D-01:** One aggregated chain color per element, computed as the
  worst-of-4-sovereignty-dimensions. Each dimension is evaluated independently;
  the element's marker color is the worst status any single dimension produces.
  Detail views may still surface per-dimension breakdowns via findings, but the
  diagram marker itself is one color per element. — **Reversibility:** reversible
  (aggregation happens in a single collapse step in `markers.ts`; per-dimension
  rendering can be layered on later without changing findings shape).

### Deviation math (YELLOW vs RED thresholds)

- **D-02:** For each dimension `d`, `deviation[d] = max(0, effective-Req[d] − min-Achieved-in-chain[d])`
  where `min-Achieved-in-chain[d]` is the minimum of the `sovereigntyAch*[d]` values
  observed at any leaf downstream node reachable from the root through the
  chain-traversal rules the current evaluator already applies
  (`walkApplication` / `walkInfrastructure` / `walkAIComponent`, unchanged).
  The element's chain color follows the worst-dimension deviation:
  `0 → GREEN`, `1 → YELLOW`, `≥ 2 → RED`. Incomplete data (some `effective-Req[d]`
  or `min-Achieved-in-chain[d]` is null) with no provable violation on any other
  dimension → GREY. Provable violation on any dimension dominates data gaps on
  other dimensions (violation wins over GREY).
- **Sovereignty scale assumption:** integer scale, currently 0–4 in
  `types.ts` `RequirementLevels`. A future rescale would only change the
  meaning of "1 step" (thresholds stay `0/1/≥2`), so decisions D-02/D-04 do not
  hardcode "4" anywhere.

### Element-type scope

- **D-03:** The new chain color applies uniformly to all three requirement-root
  types: `BusinessCapability`, `DataObject`, `BusinessProcess`. `Application`,
  `Infrastructure`, and `AIComponent` are downstream (they have `sovereigntyAch*`
  but no `sovereigntyReq*`), and they keep their existing per-element
  `SovereigntyMarker` two-marker shape — the color values that flow into their
  `fill` and `ring` are computed via the new chain-premise rule. No new marker
  channel, no new marker element type. — **Reversibility:** reversible for
  DO/BP (uniform pattern, one branch in `projectMarkers`); reversible for
  downstream elements as well since the `Finding[]`/`SovereigntyAnalysis` shape
  is unchanged.

### Two-marker channel semantics

- **D-04:** `fill` = "this element itself fulfils the chain premise" (the
  element's own local chain-color w.r.t. its personal role in the chain — for a
  root it's the whole chain rooted at this element; for a downstream element
  it's whether _this_ element is the min-Achieved breaking a chain it sits in).
  `ring` = the worst chain-color from anywhere strictly below this element in
  the graph (blast radius; enables the "red ring, green fill" reading — "I am
  fine but something below me is broken"). Both channels compute using the
  Areas 1/2 chain-premise math; only the color rule changes, the channels'
  self-vs-blast-radius roles do not. — **Reversibility:** costly — collapsing
  the two channels into one, or reordering their meanings, later would require
  re-teaching every consumer (detail view, diagram overlay, markers.test.ts,
  Company rollup) that reads `SovereigntyMarker.selfStatus` vs
  `SovereigntyMarker.downstreamStatus` today.

### Parent-consistency signal (Phase 02.3 / Phase 3 / Phase 4 D-04)

- **D-05:** The Phase 02.3/03/4 required-vs-required parent-consistency check is
  **absorbed into the chain math** by using `effective-Req[d]` =
  `max` of the root's own required level and every ancestor's required level
  along its parent hierarchy (`HAS_PARENT` for `BusinessCapability`,
  `HAS_PARENT_PROCESS` for `BusinessProcess`; `DataObject` has no parent
  hierarchy today, so `effective-Req` = own required). A child that
  under-requests can no longer silently pass — the ancestor's stricter
  requirement still governs the premise. The standalone parent-vs-own YELLOW
  marker signal from Phase 02.3 D-05 / Phase 3 D-01 / Phase 4 D-04 goes away
  as a distinct diagram signal. — **Reversibility:** costly — removes the
  three-valued `selfStatus` distinction between "parent-consistent GREEN" and
  "chain-fulfilling GREEN" for BCs and BPs; restoring the separate signal would
  need a new marker channel (badge/glyph) or a re-split of `selfStatus`
  meanings.
- **D-06:** Whether the underlying `classifyCapabilityAgainstParent` finding
  entries (and its BP counterpart) stay in `SovereigntyAnalysis.findings` for
  the detail-view findings list, get retired entirely, or get repurposed into
  a per-dimension explanation of _why_ `effective-Req` is what it is, is left
  to research/planning. The functional replacement — folding the strictest
  ancestor requirement into the chain premise — must exist regardless. — **Reversibility:** reversible.

### the agent's Discretion

- Exact repository/GraphQL shape for fetching the ancestor chain of required
  levels for BC and BP: a new upward-walk resembling
  `fetchBusinessCapabilityChain`'s `isRoot`-gated `HAS_PARENT` fetch (Phase
  02.3 D-01), extended to compute `effective-Req[d]` per dimension across the
  ancestor set. Cycle safety follows the per-branch visited-set contract
  established in Phase 2 D-03 and reused since.
- Whether `effective-Req` is materialised as a new field on
  `BusinessCapabilityChain` / `BusinessProcessChain` (parallel to
  `parentRequiredLevels` from Phase 02.3), or computed inline inside
  `analyzeCapabilitySubtree` / `analyzeBusinessProcess` / `analyzeDataObject`,
  is a code-shape choice for planning.
- Removal or repurposing of `classifyCapabilityAgainstParent` (and its BP
  counterpart from Phase 4 D-04) — including whether to keep those findings in
  the flat `findings` array for the detail view — is deferred to planning per
  D-06. The only hard constraint is that the diagram marker no longer promotes
  parent-vs-own YELLOW as a distinct signal.
- Test-fixture churn: `markers.test.ts`, evaluator tests, Company rollup tests,
  and detail-view tests all encode today's `selfStatus` / `downstreamStatus`
  semantics. Which files are updated in place vs. rewritten is left to
  planning, but the entire test suite must go green under the new rule.
- Client-side detail view (`SovereigntyCapabilityView.tsx`,
  `SovereigntyDataView.tsx`, `SovereigntyProcessView.tsx`) rendering changes
  (e.g. how the YELLOW/RED distinction is explained textually) are left to
  planning — no new UI mockup was requested; existing rendering primitives are
  expected to be reused.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 5 raw input

- `.planning/phases/05-rework-chain-colors/NOTES.md` — original user
  "Zielbild" table, evaluation-order rules, and the five open points that
  drove the discussion.

### Sovereignty foundations (behavior this phase modifies, not replaces)

- `.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-CONTEXT.md` —
  D-01/D-03 (independent-edge evaluation, cycle-safe per-branch visited-set
  contract), D-05 (two-marker projection: `fill = selfStatus`, `ring = downstreamStatus`),
  D-11 (nested capability rollup — every id in `capabilityIds` gets its own
  marker; this phase preserves that shape).
- `.planning/phases/02.3-business-capability-requirement-chain-consistency-compare-pa/02.3-CONTEXT.md` —
  D-01 (root's own upward parent-required fetch — the pattern D-05's `effective-Req`
  computation extends), D-02 (multi-parent independent-per-edge — this phase's
  `max` across ancestors preserves the "flagged if below ANY parent" spirit
  inside the chain premise), D-03/D-04 (null-exclusion semantics — carried
  into deviation math via the "missing → GREY unless dominated" rule).
- `.planning/phases/03-business-capability-self-status-green-when-consistent-with-p/03-CONTEXT.md` —
  D-01/D-02 (three-valued `selfStatus` GREEN/YELLOW/GREY, `hasRealComparison`
  signal). Phase 5 D-05 collapses this three-valued distinction back into
  chain math; the "compared and clean" vs "nothing compared" nuance is
  replaced by "premise fulfilled with complete data" vs "premise not evaluable
  due to missing data".
- `.planning/phases/04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type/04-CONTEXT.md` —
  D-02 (`BusinessProcess` as a third `SovereigntyRootType` mirroring
  `analyzeDataObject`/`analyzeSupportChain`), D-04 (BP parent-consistency
  treatment mirroring 02.3/03 — absorbed into chain math per this phase's
  D-05), D-03 (BC↔BP chain nesting stays out of scope — unchanged here).
- `eam-konzept.md` §3 ("Zwei Marker je Element"), §6 (Anzumerken — data gaps
  and status semantics).

### Existing code this phase rewrites (target files)

- `server/src/sovereignty/markers.ts` — `STATUS_RANK`, `worseStatus`,
  `DEFAULT_MARKER`, `projectMarkers` (the `isCapability` branch, the
  `selfViolatingIds` promotion, and the `capabilityIds` GREEN-backfill loop).
  Ranking function stays `GREEN < GREY < YELLOW < RED`; the promotion rules
  that drive `selfStatus` / `downstreamStatus` are what change.
- `server/src/sovereignty/evaluator.ts` — `analyzeCapabilitySubtree`,
  `analyzeDataObject`, `analyzeBusinessProcess`, `analyzeSupportChain`,
  `walkApplication` / `walkInfrastructure` / `walkAIComponent`,
  `classifyCapabilityAgainstParent` (removal / repurposing per D-06).
- `server/src/sovereignty/repository.ts` — `fetchBusinessCapabilityChain`
  (the `isRoot`-gated upward `HAS_PARENT` fetch pattern from 02.3 D-01 that
  this phase extends), `fetchBusinessProcessChain` (Phase 4 counterpart),
  `fetchDataObjectChain` — likely need to surface an `ancestorRequiredLevels`
  or `effective-Req` shape per D-05, exact repository API left to planning.
- `server/src/sovereignty/types.ts` — `SovereigntyStatus`,
  `SOVEREIGNTY_STATUSES`, `SovereigntyMarker`, `Finding`, `RequirementLevels`,
  `SovereigntyRootType`, `ViolatingElementType`, `BusinessCapabilityChain`
  (its `parentRequiredLevels` field from Phase 02.3 D-01), and the BP/DO
  counterparts. Doc comments referencing today's RED/YELLOW/GREY/GREEN taxonomy
  (`types.ts` lines 3–4; `markers.ts` lines 4–5, 31–33, 47–52, etc.) must be
  rewritten to the chain-premise semantics.
- `server/src/sovereignty/chainLabels.ts` and `companyRollup.ts` — consumer
  code; must stay green under the new marker semantics (Phase 2 D-05 rollup
  contract preserved).
- `server/src/sovereignty/graphql/resolvers.ts` — no schema change expected
  (enum unchanged, marker shape unchanged), but the resolver still returns
  the reworked marker payload; regression coverage required.
- `server/src/graphql/schema.graphql` — `SovereigntyFinding` /
  `SovereigntyMarker` types; no schema-level change expected under D-04 + D-05
  (enum stays 4-valued, marker shape stays two-channel), but planning must
  confirm.
- `server/src/sovereignty/__tests__/markers.test.ts`,
  `server/src/sovereignty/__tests__/evaluator*.test.ts` (all fixtures) — need
  new coverage for the chain-premise rule (worst-dimension deviation
  thresholds, incomplete-data vs violation precedence, `effective-Req`
  ancestor propagation, `ring = worst-of-below` under the new rule) and
  removal of the three-valued `selfStatus` GREEN/YELLOW/GREY parent-consistency
  assertions per D-05.

### Client-side downstream consumers

- `client/src/components/sovereignty/SovereigntyCapabilityView.tsx`,
  `client/src/components/sovereignty/SovereigntyDataView.tsx`,
  `client/src/components/sovereignty/SovereigntyProcessView.tsx` — detail-view
  renderers that consume `SovereigntyAnalysis.findings` and marker fill/ring.
  Under the new rule, the _findings list_ text may need updating (esp. if
  D-06 retires parent-consistency finding entries), but no structural UI
  change was requested.
- `client/src/components/diagrams/**` — marker overlay renders `fill` +
  `ring` today; unchanged rendering primitives, only the color values change.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `worseStatus` / `STATUS_RANK` / `DEFAULT_MARKER` (`markers.ts`) — ranking
  `GREEN < GREY < YELLOW < RED` stays correct under the new taxonomy; the
  monotone up-propagation of `ring` via `worseStatus` still delivers the
  blast-radius reading D-04 requires.
- `walkApplication` / `walkInfrastructure` / `walkAIComponent` (`evaluator.ts`) —
  reused verbatim to visit downstream nodes and collect their `sovereigntyAch*`
  values into `min-Achieved-in-chain` computation; no new leaf walker needed.
- `fetchBusinessCapabilityChain`'s `isRoot`-gated upward `HAS_PARENT` fetch
  pattern (Phase 02.3 D-01) — the exact shape D-05's `effective-Req`
  computation extends, now returning the ancestor's per-dimension required
  levels for every dimension rather than just marking a `parentRequiredLevels`
  array for a single-level comparison.

### Established Patterns

- One classifier, reused everywhere (02-RESEARCH.md Anti-Pattern 3): the new
  chain-color computation must be a single function whose output feeds both
  the detail view and the diagram marker via the same `Finding[]` /
  `SovereigntyMarker` pipeline. No parallel branch for diagram-only or
  detail-view-only color logic.
- Per-branch visited-set cycle safety (Phase 2 D-03) — the ancestor walk that
  computes `effective-Req` must follow the identical contract.
- Deferred-not-dropped backlog logging — parent-consistency findings, if
  retired per D-06, become a documented removal rather than a silent drop.

### Integration Points

- `SovereigntyAnalysis.findings` (flat array, single downstream shape) already
  drives both the detail view and diagram markers — the new chain-color
  computation lives on top of this pipeline, not beside it.
- `featureFlags.Sovereignty` (Phase 2 D-09) still gates the whole marker
  overlay — no change to gating.
- Company-level rollup (`companyRollup.ts`, Phase 2 D-05) computes its
  aggregate from the same marker output; no separate rollup rule needed.

</code_context>

<specifics>
## Specific Ideas

- The user's `Max(BC-Requirement)` in NOTES.md is now definitively read as
  `max over the requirement-root's own required level AND every ancestor's
required level` per dimension (D-05). This resolves an ambiguity in the raw
  NOTES.md formula.
- The intermediate color must stay called **YELLOW** in code (the enum value
  is unchanged). "Orange" in NOTES.md was a UI-color / naming mixup and does
  not become a new status. The UI palette that renders YELLOW may or may not
  look amber/orange — that is a rendering detail, not a status-taxonomy
  change.
- "Red outside, green inside" is the canonical explanatory example for the
  fill/ring split — the target reading is _"this element is fine locally
  (green fill) but a downstream element is breaking a chain (red ring)"_.

</specifics>

<deferred>
## Deferred Ideas

- **Per-dimension diagram rendering.** Rejected in Area 1 (aggregated worst-of
  chosen). If future architects want per-dimension markers (2×2 grid, wedge
  ring, etc.), that becomes its own phase with a UI mockup.
- **New GraphQL enum value / marker channel for parent-consistency.** Rejected
  in Area 5 (absorbed into chain math). A future "surface parent-consistency
  separately from chain fulfillment" phase would need to reintroduce it — most
  naturally as a badge/glyph next to the marker, not a fifth enum value.
- **BusinessCapability ↔ BusinessProcess chain nesting**
  (`supportedByBusinessProcesses`) — still out of scope, unchanged from
  Phase 4 D-03.
- **Supplier chain traversal** — still deferred exactly as logged in Phase 2
  D-08 and re-confirmed in Phase 4 D-05.
- **Blast-radius prioritization / weighted scoring** (SOVX-01, SOVX-04) — v2
  deferrals, not touched by this discussion.

</deferred>

---

_Phase: 05-rework-chain-colors_
_Context gathered: 2026-08-31_
