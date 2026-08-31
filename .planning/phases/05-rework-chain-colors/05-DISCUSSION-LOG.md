# Phase 5: Rework Chain Colors - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-31
**Phase:** 05-rework-chain-colors
**Areas discussed:** Per-dimension vs aggregated chain color, Definition of "deviation ≤ 1 step" (YELLOW vs RED), Element-type scope, Fill+ring two-marker model, Interaction with Phase 02.3/03 parent-consistency YELLOW

---

## Selection of Gray Areas

| Option | Description | Selected |
|--------|-------------|----------|
| Per-dimension vs aggregated chain color | 4 sovereignty dimensions each colored separately, or worst-of aggregated? | ✓ |
| Definition of "deviation ≤ 1 step" (YELLOW vs RED) | Scale interpretation, per-dim vs worst-dim aggregation, threshold math | ✓ |
| Element-type scope | Which roots + downstream markers get re-coloured | ✓ |
| Fate of the two-marker (fill + ring) model | Collapse, keep, or drop | ✓ |
| Interaction with Phase 02.3/03 YELLOW selfStatus | Absorb, keep off-diagram, add channel, drop | ✓ |
| Enum/schema migration path | Add ORANGE, rename YELLOW, or UI-layer remap | (skipped — resolved by clarification) |
| Other — freeform | | (used to clarify color naming) |

**User's freeform:** "Orange/Yellow was a mixup. It should stay 'yellow'."

**Notes:** The freeform clarification resolved the enum-migration question inline —
the intermediate color stays YELLOW in the code enum (`SOVEREIGNTY_STATUSES` unchanged),
only the *semantic* of YELLOW shifts from "parent-vs-own contradiction" to
"chain deviation ≤ 1 step". No schema change needed.

---

## Area 1 — Per-dimension vs aggregated chain color

| Option | Description | Selected |
|--------|-------------|----------|
| One aggregated chain color per element | Diagram: worst-of-4-dimensions per element. Detail view still lists dimensions separately. | ✓ |
| Per-dimension: 4 colors per element on the diagram | 2×2 grid or 4-wedge ring; needs new UI design | |
| Aggregated on diagram, per-dimension colored in detail view | Marker worst-of; per-dimension color grid in detail panel | |

**User's choice:** One aggregated chain color per element.
**Notes:** Preserves current diagram marker density (fill + ring per element) and
reuses the existing marker slots — no new UI mockup required.

---

## Area 2 — Deviation math (YELLOW vs RED)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — worst-dimension deviation, 0/1/≥2 thresholds | `deviation[d] = max(0, Req[d] − min-Achieved[d])`, element color = worst dim | ✓ |
| Same thresholds but per-dimension — re-open Area 1 | Conflicts with Area 1 aggregation choice | |
| Different aggregation rule (sum, count-of-broken, etc.) | Non-worst-dimension aggregation | |
| Different thresholds | Non 0/1/≥2 mapping | |

**User's choice:** Worst-dimension deviation, 0 → GREEN, 1 → YELLOW, ≥2 → RED,
incomplete-data + no proven violation → GREY.
**Notes:** Precedence rule from NOTES.md preserved — a provable violation on any
dimension dominates data gaps on other dimensions.

---

## Area 3 — Element-type scope

| Option | Description | Selected |
|--------|-------------|----------|
| All 3 roots + downstream keep per-element markers | Uniform across BC/DO/BP; App/Infra/AIComponent markers unchanged in shape, recomputed color values | ✓ |
| BC-only this phase, DO/BP unchanged | Narrower, safer | |
| All 3 roots; downstream inherits chain color (single marker) | Downstream loses own marker; inherits worst chain color | |

**User's choice:** All 3 requirement roots (BC/DO/BP) reworked; downstream
Application / Infrastructure / AIComponent keep their existing per-element
two-marker mechanism.
**Notes:** Uniform pattern minimizes special cases in `projectMarkers` and
preserves the existing detail-view / diagram consumer contract for downstream
elements.

---

## Area 4 — Fill + ring two-marker model (revised after user correction)

**Initial round — user rejected all three offered options and reframed the semantics:**

| Option (initial) | Description | Selected |
|--------|-------------|----------|
| Keep two markers: ring = chain color, fill = parent-consistency | Preserves Phase 02.3/03 selfStatus in fill; ring becomes chain color | (rejected) |
| Single collapsed marker (worst-of chain + parent-consistency) | One color per root, drives detail view | (rejected) |
| Single fill = chain color; drop ring/parent-consistency from marker | Simplest; parent-consistency only in detail view | (rejected) |

**User's correction:** "chain / fill semantics should stay the same. Fill: This
element fulfils the chain. Ring: something from below the chain is causing this
item to e.g. be 'red outside, green inside'."

**Revised framing (confirmed by user):**

| Option (revised) | Description | Selected |
|--------|-------------|----------|
| Fill = "this element fulfils the chain premise"; ring = worst chain-color from below | Both channels compute using the new chain-premise math; roles (self vs blast-radius) unchanged | ✓ |
| Almost — clarify freeform | | |

**User's choice:** Fill = per-element chain-fulfilment; ring = worst chain-color
from strictly below. Both channels use the new Areas 1/2 math, only the
color-computation rule changes, the fill/ring roles do not.
**Notes:** The parent-consistency YELLOW that today lives in `selfStatus` no
longer fits in this reframed fill — it's a required-vs-required signal, not a
required-vs-achieved signal. Area 5 resolves where it goes.

---

## Area 5 — Interaction with Phase 02.3/03 parent-consistency YELLOW

| Option | Description | Selected |
|--------|-------------|----------|
| Absorb into chain math: use strictest-required-across-parent-hierarchy as effective requirement | `effective-Req[d] = max` over root + all ancestors per dimension; parent-consistency naturally folded in | ✓ |
| Keep as detail-view-only finding, off the diagram | `classifyCapabilityAgainstParent` findings persist in list; marker drops the signal | |
| Add a third visual channel (badge next to marker) | Preserves signal visually with new UI element | |
| Drop parent-consistency check entirely | Simplest; removes real work from Phase 02.3/03/4 | |

**User's choice:** Absorb into chain math via strictest-required-across-parent-hierarchy.
**Notes:** Elegantly makes NOTES.md's `Max(BC-Requirement)` formula unambiguous
(max is over root's own req PLUS every ancestor per dimension). A child that
under-requests can no longer silently pass — parent's stricter req still
governs the chain. Whether the underlying finding entries stay in the flat
findings list for the detail view or get retired entirely is left to planning
(D-06).

---

## the agent's Discretion

Recorded in CONTEXT.md `<decisions>` under "the agent's Discretion":

- Exact repository/GraphQL shape for the ancestor-required upward walk.
- Whether `effective-Req` becomes a new materialized field on
  `BusinessCapabilityChain` / `BusinessProcessChain` or is computed inline.
- Removal or repurposing of `classifyCapabilityAgainstParent` and its BP
  counterpart (D-06).
- Test-fixture rewrite strategy for `markers.test.ts` and evaluator tests.
- Detail-view textual explanations for the YELLOW/RED distinction (no new UI
  mockup requested).

## Deferred Ideas

- Per-dimension diagram rendering — rejected in Area 1.
- New GraphQL enum value or third marker channel for parent-consistency —
  rejected in Area 5.
- BusinessCapability ↔ BusinessProcess chain nesting
  (`supportedByBusinessProcesses`) — still out of scope per Phase 4 D-03.
- Supplier chain traversal — still deferred per Phase 2 D-08 / Phase 4 D-05.
- Blast-radius prioritization / weighted scoring (SOVX-01, SOVX-04) — v2
  deferrals, untouched.
