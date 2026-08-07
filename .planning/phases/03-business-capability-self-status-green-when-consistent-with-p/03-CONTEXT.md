# Phase 3: BusinessCapability self-status GREEN for parent-consistent requirements - Context

**Gathered:** 2026-08-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend Phase 02.3's required-vs-required parent/child tree-consistency check so a `BusinessCapability`'s `selfStatus` becomes three-valued instead of two-valued: **GREEN** when its own required level was explicitly, meaningfully compared against at least one parent and found consistent; **YELLOW** on contradiction (02.3's existing behavior, unchanged); **GREY** only when there is genuinely nothing to compare (no parent at all — the true root of the whole capability hierarchy, permanently GREY by definition). This is a `markers.ts`/`evaluator.ts` change to the selfStatus computation and its GREY-backfill — no new UI rendering logic, no new Finding type, no new findings-list entries.

</domain>

<decisions>
## Implementation Decisions

### GREEN Threshold ("nothing compared" vs "compared and clean")

- **D-01:** A capability with a parent but where every one of the 4 sovereignty dimensions is excluded from comparison (null on the parent side, the child side, or both — per 02.3 D-03/D-04) has had **nothing genuinely compared**. This resolves to **GREY**, not GREEN — GREEN requires at least one dimension to have actually been checked (both sides non-null) and found consistent. A vacuous "no contradiction found because nothing was comparable" must not read the same as a verified-consistent capability.
- **D-02:** Multi-parent case (carries D-02 from Phase 2/02.3 forward): each parent edge is still evaluated independently. If **any** parent yields at least one real (non-excluded) dimension comparison that is consistent, and no parent produces a YELLOW contradiction, the capability is **GREEN** overall — even if one or more *other* parents had zero comparable dimensions. GREEN is not blocked by an individual parent contributing nothing to compare; it only requires that somewhere, something was actually checked and passed.
- **Net effect:** selfStatus resolution order per capability is: any parent-comparison YELLOW finding → **YELLOW**; else at least one real (non-excluded) dimension compared against any parent → **GREEN**; else (no parent at all, or a parent exists but every dimension was excluded on every parent) → **GREY**.

### Full-Chain-GREEN Rendering

- **D-03:** When a capability's `selfStatus` and `downstreamStatus` are both independently GREEN, the diagram renders it exactly like every other status combination — fill ellipse colored by `selfStatus`, ring colored by `downstreamStatus`, both happening to be green. **No special-case visual collapsing, no unified single-marker treatment.** The roadmap's "special case to design" language is satisfied structurally by D-01/D-02 (making sure the GREEN self computation isn't clobbered by the old unconditional-GREY backfill) — it does not require new marker/rendering logic in `markers.ts` beyond that.

### Positive-Confirmation Surfacing

- **D-04:** A verified-consistent GREEN `selfStatus` stays **purely implicit** — communicated only via the marker fill color. No new entry is added to the findings list or detail view confirming "consistent with parent requirements." This mirrors today's existing silent "no finding = compliant" behavior; GREEN is just now distinguishable from GREY at the marker level, not a new user-facing message.

### the agent's Discretion

- Exact wiring of D-01's "at least one real comparison happened and passed" signal through `evaluator.ts`/`markers.ts` (e.g., whether this needs a new intermediate flag alongside `Finding[]`, or can be derived purely from existing data — the set of dimensions classifyCapabilityAgainstParent actually evaluated per parent vs. skipped) is left to research/planning.
- How `projectMarkers`'s existing unconditional `selfStatus: 'GREY'` backfill loop (for capabilities with zero findings) is restructured to allow the GREEN exception, without weakening the existing GREY-forever guarantee for true hierarchy roots, is an implementation detail for planning.
- Updating `markers.test.ts`'s existing "every capability always GREY-self" assertions to allow both the 02.3 YELLOW exception and this phase's new GREEN exception is left to planning/execution.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 02.3 foundations (this phase directly extends its D-05/D-06)

- `.planning/phases/02.3-business-capability-requirement-chain-consistency-compare-pa/02.3-CONTEXT.md` — D-01 (root's own upward parent-required fetch), D-02 (multi-parent "flagged if below ANY parent" — this phase's GREEN mirrors this same independent-per-parent evaluation), D-03/D-04 (null-required exclusion semantics — directly determines this phase's "nothing compared" threshold), D-05 (capability fill colored YELLOW on self-violation — this phase extends the same conditional to GREEN), D-06 (Finding shape reuse).
- `.planning/phases/02.3-business-capability-requirement-chain-consistency-compare-pa/02.3-01-SUMMARY.md` and `02.3-02-SUMMARY.md` — implementation record: `classifyCapabilityAgainstParent` (root-only tracer), then extended to every child against its in-subtree immediate parent (descendant half) plus the real Neo4j upward fetch (`isRoot` param in `fetchBusinessCapabilityChain`) populating `parentRequiredLevels` for the analysis root.

### Phase 2 sovereignty foundations (original D-05 baseline)

- `.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-CONTEXT.md` — original D-05 (selfStatus always GREY for capability/DataObject — the invariant both 02.3 and this phase carve narrow exceptions into), D-11 (nested capability rollup — every `childCapabilities` id in `capabilityIds` needs the same three-valued treatment, not just the analysis root).
- `.planning/research/ARCHITECTURE.md` §"Suggested Build Order" — traversal/regression-test anticipated categories.

### Existing code this phase extends (not replaces)

- `server/src/sovereignty/evaluator.ts` — `classifyCapabilityAgainstParent` (produces the YELLOW findings this phase's GREEN threshold sits alongside), `aggregateDownstreamStatus`.
- `server/src/sovereignty/markers.ts` — `projectMarkers`: the `isCapability ? 'GREY' : ...` unconditional branch and the zero-finding GREY-self backfill loop are the two places that must become three-valued; `worseStatus`/`STATUS_RANK`/`DEFAULT_MARKER` are reused unchanged.
- `server/src/sovereignty/types.ts` — `Finding`, `ViolatingElementType` (already includes `'businessCapability'` from 02.3 D-06 — no schema change needed here).
- `server/src/sovereignty/__tests__/markers.test.ts` — existing "every capability (root and nested) always GREY-self" assertions need updating to allow both the 02.3 YELLOW exception and this phase's GREEN exception without weakening the general rule.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `classifyCapabilityAgainstParent` (evaluator.ts) already produces the per-dimension, per-parent YELLOW findings this phase's GREEN/GREY split sits on top of — no new classifier needed, only the "did anything get compared at all" signal needs surfacing.
- `worseStatus`/`STATUS_RANK`/`DEFAULT_MARKER` (markers.ts) already rank GREEN < GREY < YELLOW < RED and default to GREEN/GREEN for zero-finding elements — this phase reuses them unchanged; only the capability-specific override branch changes.

### Established Patterns

- Per-parent independent evaluation (D-02, Phase 2/02.3): no "worst of all parents" collapsing — this phase's GREEN threshold (`any parent with ≥1 real comparison, none contradicting`) follows the same independent-edge philosophy.
- One classifier, reused everywhere (02-RESEARCH.md Anti-Pattern 3): this phase changes only the selfStatus *aggregation* in `markers.ts`, not the underlying `Finding[]` production — detail view, diagram markers, and any other consumer stay on the same pipeline.

### Integration Points

- `projectMarkers`'s `isCapability` branch and its zero-finding backfill loop (`markers.ts`) are the only two places needing new logic — both already identified precisely by file/function name in 02.3-CONTEXT.md and confirmed still current by direct code read during this discussion.

</code_context>

<specifics>
## Specific Ideas

No new UI mockups or wording requested. User confirmed: (1) GREEN/GREEN renders with the existing two-shape fill+ring mechanism, no unified marker; (2) GREEN stays implicit, no new findings-list text; (3) the "nothing compared" edge case must fall back to GREY, not GREEN, to avoid a vacuous compliance signal.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-business-capability-self-status-green-when-consistent-with-p*
*Context gathered: 2026-08-07*
