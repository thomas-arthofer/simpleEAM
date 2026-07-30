# Phase 2: Canonical Sovereignty Evaluation & UX Diagnostics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 2-Canonical Sovereignty Evaluation & UX Diagnostics
**Areas discussed:** Chain traversal rules, Legacy score fields, Evaluation scope (entity types), Diagram marker + rollout visibility

---

## Session note

The initial gray-area selection question (`vscode_askQuestions`, header "Discuss") was answered with:

> "The user is not available to respond and will review your work later. Work autonomously and make good decisions."

No areas were explicitly selected. Per this instruction, all 4 identified gray areas were discussed and decided autonomously below, each grounded in existing research artifacts (`.planning/research/ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md`), `eam-konzept.md`, `REQUIREMENTS.md`, and direct code inspection. All are flagged `[AGENT ASSUMPTION]` in CONTEXT.md for later user review.

---

## Chain traversal rules

| Option | Description | Selected |
|--------|-------------|----------|
| Pick one representative parent (old behavior) | For multi-parent infrastructure, pick "first with values" like the current client util | |
| Evaluate all parents/edges independently | Every hosting/parent edge is its own chain node; any violating edge produces a named finding | ✓ |
| Worst-case aggregate across parents | Take the minimum achieved value across all parents as a single synthetic value | |

**Agent's choice:** Evaluate all edges independently (D-01); composite applications keep their own rating AND their components are separately checked, no hiding (D-02); cycle-safe via visited-set traversal, no new finding type (D-03); BusinessProcess stays out of scope, confirmed not new (D-04); RED-anywhere-below sets ring, only owning node gets fill (D-05).
**Notes:** Directly addresses Pitfall 5/6 (no silent fallback/representative-picking) and Anti-Pattern 1 (hiding container app values) from `ARCHITECTURE.md`/`PITFALLS.md`.

---

## Legacy score fields

| Option | Description | Selected |
|--------|-------------|----------|
| Deprecate the Company-level scalar fields | Stop populating them, mark unused | |
| Keep fields, recompute via new canonical engine | Same fields, same schema, but single source of truth | ✓ |
| Leave Temporal formula untouched | Accept the two diverging implementations | |

**Agent's choice:** Keep fields, redefine computation to call the same canonical module the backend uses elsewhere (D-06); delete/quarantine the client-side duplicate logic in `sovereignty/utils.ts` (D-07).
**Notes:** Required by SOV-05's explicit consistency requirement; avoids a third diverging implementation; no schema change needed.

---

## Evaluation scope (entity types)

| Option | Description | Selected |
|--------|-------------|----------|
| Include Suppliers in chain traversal | Suppliers are one hop from Application/Infrastructure via real relationships and carry sovereigntyAch* fields | |
| Suppliers out of scope for Phase 2 | Only Application, AIComponent, Infrastructure are achieved leaf nodes | ✓ (flagged for confirmation) |

**Agent's choice:** Suppliers out of scope for Phase 2 chain traversal (D-08).
**Notes:** SOV-01 wording names only "application or infrastructure element"; ARCHITECTURE.md's documented data flow doesn't route through suppliers. This is the one area explicitly flagged for user confirmation in CONTEXT.md — reasonable people could decide the other way since the relationships (`PROVIDED_BY`, `HOSTED_BY`, etc.) do exist in the schema.

---

## Diagram marker + rollout visibility

| Option | Description | Selected |
|--------|-------------|----------|
| New per-diagram toggle | Introduce a new setting scoped to each diagram | |
| Reuse existing `featureFlags.Sovereignty` | Same company-level flag already gating sovereignty fields in AicomponentForm/SupplierForm | ✓ |
| Always-on markers | No toggle at all | |

**Agent's choice:** Reuse `featureFlags.Sovereignty` (D-09); no inventory/coverage dashboard built this phase — grey visibility delivered per-element via detail view + marker, not portfolio rollup (D-10).
**Notes:** Portfolio/coverage analytics is `SOVX-03`, explicitly v2 per REQUIREMENTS.md and STATE.md Deferred Items.

---

## the agent's Discretion

- Exact GraphQL analysis query/type names (`sovereigntyAnalysis`, `sovereigntyMarkers`, `sovereigntyImpacts` are suggestions from ARCHITECTURE.md, not locked).
- Internal `server/src/` module/file layout for the canonical evaluation service.

## Deferred Ideas

- Supplier chain participation (flagged, not deferred outright — needs explicit confirmation).
- Inventory/coverage dashboard for newly-grey elements (deferred to v2, `SOVX-03`).
- Weighted sovereignty scoring (deferred to v2, `SOVX-04`).
- Business-process sovereignty requirements in canonical chain (deferred to v2, `SOVX-02`).
- Blast-radius/portfolio prioritization (deferred to v2, `SOVX-01`).
