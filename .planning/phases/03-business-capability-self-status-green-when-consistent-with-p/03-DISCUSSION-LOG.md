# Phase 3: BusinessCapability self-status GREEN for parent-consistent requirements - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-07
**Phase:** 03-business-capability-self-status-green-when-consistent-with-p
**Areas discussed:** Nothing-compared vs compared-and-clean threshold, Full-chain-GREEN visual treatment, Positive-confirmation surfacing

---

## Nothing-compared vs compared-and-clean threshold

**Q1: A capability HAS a parent, but every dimension is excluded from comparison (null on one/both sides for all 4) — nothing was actually checked. What should selfStatus be?**

| Option | Description | Selected |
|--------|-------------|----------|
| GREEN | Vacuously consistent — no contradiction was found, so treat it the same as any other "no violation" case. | |
| GREY | Nothing was genuinely compared — reserve GREEN for cases where at least one dimension was actually checked and passed. Matches the "genuinely nothing to compare" bucket the roadmap describes for true roots. | ✓ |

**User's choice:** GREY

**Q2: Multi-parent case: parent A has zero comparable dimensions (all null), parent B has 2 comparable dimensions and both are consistent. Is this capability GREEN or GREY overall?**

| Option | Description | Selected |
|--------|-------------|----------|
| Any parent with ≥1 real comparison → GREEN | As long as ANY parent yields at least one real (non-excluded) dimension comparison somewhere, and none of them contradict, the capability is GREEN overall — even if other parents had zero comparable dimensions. | ✓ |
| All parents must have ≥1 real comparison | Only GREEN if EVERY parent yields at least one comparable dimension (and none contradict). If even one parent has zero comparable dimensions, treat the whole thing as GREY. | |

**User's choice:** Any parent with ≥1 real comparison → GREEN
**Notes:** Net rule: YELLOW (any contradiction) beats GREEN (any real comparison passed) beats GREY (nothing ever genuinely compared).

---

## Full-chain-GREEN visual treatment

**Q: When a capability's selfStatus AND downstreamStatus are both GREEN, how should the diagram render it?**

| Option | Description | Selected |
|--------|-------------|----------|
| Render like any other combo (fill=self, ring=downstream, both green) | Same rendering path as every other selfStatus/downstreamStatus combo — fill ellipse colored by selfStatus, ring colored by downstreamStatus. When both happen to be GREEN, it naturally reads as "all green" with zero special-case code. | ✓ |
| Distinct unified "fully clean" marker | When both are independently GREEN, collapse to a single unified marker/indicator distinct from the normal two-shape fill+ring rendering. | |

**User's choice:** Render like any other combo (fill=self, ring=downstream, both green)
**Notes:** Confirms the roadmap's "special case to design" is satisfied by getting the GREEN self computation right (D-01/D-02), not by adding new marker-rendering logic.

---

## Positive-confirmation surfacing

**Q: Should a verified-consistent GREEN self-status surface anywhere in the findings list / detail view, or stay purely implicit via marker color?**

| Option | Description | Selected |
|--------|-------------|----------|
| Purely implicit (marker color only) | GREEN self-status is purely a marker-color computation (fill ellipse turns green). No new entry appears in the findings/details list — exactly like today's silent "no finding = compliant" behavior, just now distinguishable from GREY at the marker level. | ✓ |
| Explicit positive entry in findings/detail view | Add an explicit positive entry (e.g. "✓ Consistent with parent requirements") to the findings/detail view when a capability is verified GREEN. | |

**User's choice:** Purely implicit (marker color only)

---

## the agent's Discretion

- Exact wiring of "at least one real comparison happened and passed" through `evaluator.ts`/`markers.ts` (new intermediate flag vs. derived from existing data).
- Restructuring `projectMarkers`'s unconditional GREY-self backfill loop to allow the GREEN exception without weakening the GREY-forever guarantee for true hierarchy roots.
- Updating `markers.test.ts`'s existing "always GREY-self" assertions to allow both the 02.3 YELLOW exception and this phase's GREEN exception.

## Deferred Ideas

None — discussion stayed within phase scope.
