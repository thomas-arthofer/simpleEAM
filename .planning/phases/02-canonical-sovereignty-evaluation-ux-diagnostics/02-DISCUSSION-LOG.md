# Phase 2: Canonical Sovereignty Evaluation & UX Diagnostics - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30 (initial autonomous session) / 2026-07-30 (interactive re-discussion)
**Phase:** 2-Canonical Sovereignty Evaluation & UX Diagnostics
**Areas discussed:** Chain traversal rules, Legacy score fields, Evaluation scope (entity types), Diagram marker + rollout visibility

---

## Session 1 note (autonomous draft)

The initial gray-area selection question (`vscode_askQuestions`, header "Discuss") was answered with:

> "The user is not available to respond and will review your work later. Work autonomously and make good decisions."

No areas were explicitly selected. Per this instruction, all 4 identified gray areas were discussed and decided autonomously, each grounded in existing research artifacts (`.planning/research/ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md`), `eam-konzept.md`, `REQUIREMENTS.md`, and direct code inspection. All were flagged `[AGENT ASSUMPTION]` in CONTEXT.md pending user review.

## Session 2 note (interactive re-discussion, this session)

The user explicitly asked to redo discuss-phase for Phase 2 "but ask me anything again" — i.e., actually ask real questions this time instead of the agent deciding autonomously. All 4 previously-flagged areas were re-selected and walked through interactively. Every one of the agent's original autonomous picks (D-01 through D-09) was independently confirmed by the user. D-10 (dashboard) changed during discussion: the user first asked for a "minimal coverage view," which was flagged as conflicting with `SOVX-03`'s explicit v2 deferral in REQUIREMENTS.md; after that trade-off was surfaced, the user clarified "no UI, just config" — i.e., no dashboard is built, the canonical per-element status is just queryable. The user also asked, for D-08 (Suppliers out of scope), that this be explicitly logged as a deferred backlog item rather than silently dropped — see Deferred Ideas below.

---

## Chain traversal rules

**Multi-parent infrastructure:**

| Option | Description | Selected |
|--------|-------------|----------|
| Pick one representative parent (old behavior) | For multi-parent infrastructure, pick "first with values" like the current client util | |
| Evaluate all parents/edges independently | Every hosting/parent edge is its own chain node; any violating edge produces a named finding | ✓ (user-confirmed) |
| Worst-case aggregate across parents | Take the minimum achieved value across all parents as a single synthetic value | |

**Composite/container applications:**

| Option | Description | Selected |
|--------|-------------|----------|
| Both checked independently, no hiding | Container's own rating is chain-checked (GREY if empty, never hidden); components also independently checked | ✓ (user-confirmed) |
| Container inherits from components (old) | If container has no own values, silently inherit/aggregate from components | |

**Cycle handling:**

| Option | Description | Selected |
|--------|-------------|----------|
| Silent visited-set guard, no new finding type | Reuses existing `visitedApplicationIds`-style pattern; stops re-descending, no user-facing cycle finding | ✓ (user-confirmed) |
| Surface an explicit cycle-detected finding | Adds a distinct finding type when a cycle is hit | |

**Agent's original choice (session 1), independently reconfirmed by user (session 2):** Evaluate all edges independently (D-01); composite applications keep their own rating AND their components are separately checked, no hiding (D-02); cycle-safe via visited-set traversal, no new finding type (D-03); BusinessProcess stays out of scope, confirmed not new (D-04); RED-anywhere-below sets ring, only owning node gets fill (D-05).
**Notes:** Directly addresses Pitfall 5/6 (no silent fallback/representative-picking) and Anti-Pattern 1 (hiding container app values) from `ARCHITECTURE.md`/`PITFALLS.md`.

---

## Legacy score fields

| Option | Description | Selected |
|--------|-------------|----------|
| Deprecate the Company-level scalar fields | Stop populating them, mark unused | |
| Keep fields, recompute via new canonical engine | Same fields, same schema, but single source of truth | ✓ (user-confirmed) |
| Leave Temporal formula untouched | Accept the two diverging implementations | |

**Client-side duplicate (`sovereignty/utils.ts`):**

| Option | Description | Selected |
|--------|-------------|----------|
| Delete outright | Remove the file's inheritance/aggregation helpers entirely | ✓ (user-confirmed) |
| Quarantine (keep file, remove call sites) | Keep file but mark deprecated, stop calling it from UI | |

**Agent's original choice (session 1), reconfirmed by user (session 2):** Keep fields, redefine computation to call the same canonical module the backend uses elsewhere (D-06); delete (not just quarantine) the client-side duplicate logic in `sovereignty/utils.ts` (D-07) — user explicitly picked "delete outright."
**Notes:** Required by SOV-05's explicit consistency requirement; avoids a third diverging implementation; no schema change needed.

---

## Evaluation scope (entity types)

| Option | Description | Selected |
|--------|-------------|----------|
| Include Suppliers in chain traversal | Suppliers are one hop from Application/Infrastructure via real relationships and carry sovereigntyAch* fields | |
| Suppliers out of scope for Phase 2 | Only Application, AIComponent, Infrastructure are achieved leaf nodes | ✓ (user-confirmed) |
| You decide | Leave to agent discretion | |

**Follow-up — log as backlog item?**

| Option | Selected |
|--------|----------|
| Yes, log as deferred backlog item | ✓ (user-confirmed) |
| No, just note as out-of-scope | |

**Agent's original choice (session 1), independently reconfirmed by user (session 2):** Suppliers out of scope for Phase 2 chain traversal (D-08). User additionally asked this be logged as an explicit deferred backlog item (not just a passing note) — see Deferred Ideas.
**Notes:** SOV-01 wording names only "application or infrastructure element"; ARCHITECTURE.md's documented data flow doesn't route through suppliers. This was the one area explicitly flagged for user confirmation in the session-1 CONTEXT.md — reasonable people could decide the other way since the relationships (`PROVIDED_BY`, `HOSTED_BY`, etc.) do exist in the schema. The user reviewed the trade-off directly and chose to keep the exclusion.

---

## Diagram marker + rollout visibility

**Marker gating:**

| Option | Description | Selected |
|--------|-------------|----------|
| New per-diagram toggle | Introduce a new setting scoped to each diagram | |
| Reuse existing `featureFlags.Sovereignty` | Same company-level flag already gating sovereignty fields in AicomponentForm/SupplierForm | ✓ (user-confirmed) |
| Always-on markers | No toggle at all | |

**Coverage/dashboard:**

| Option | Description | Selected |
|--------|-------------|----------|
| No dashboard this phase | Grey visibility per-element only (detail view + marker); SOVX-03 stays v2 | |
| Build a minimal coverage view now | User's first answer — flagged as conflicting with SOVX-03's explicit v2 deferral | (superseded) |
| Minimal GREY-elements list only / No UI, just config | After trade-off was surfaced, user clarified: no dashboard UI at all — canonical per-element status just needs to be queryable, nothing rendered | ✓ (user-confirmed, final) |

**Agent's original choice (session 1):** Reuse `featureFlags.Sovereignty` (D-09) — reconfirmed by user. No dashboard built this phase (D-10) — user initially asked for a "minimal coverage view," but after being shown the SOVX-03 conflict, confirmed "no UI, just config," landing back on the original no-dashboard decision.
**Notes:** Portfolio/coverage analytics is `SOVX-03`, explicitly v2 per REQUIREMENTS.md and STATE.md Deferred Items.

---

## the agent's Discretion

- Exact GraphQL analysis query/type names (`sovereigntyAnalysis`, `sovereigntyMarkers`, `sovereigntyImpacts` are suggestions from ARCHITECTURE.md, not locked).
- Internal `server/src/` module/file layout for the canonical evaluation service.

## Deferred Ideas

- Supplier chain participation — confirmed out of scope for Phase 2 by the user; explicitly logged as a deferred backlog item for a future milestone (not silently dropped).
- Inventory/coverage dashboard for newly-grey elements — deferred to v2 (`SOVX-03`); user confirmed no UI is built this phase.
- Weighted sovereignty scoring (deferred to v2, `SOVX-04`).
- Business-process sovereignty requirements in canonical chain (deferred to v2, `SOVX-02`).
- Blast-radius/portfolio prioritization (deferred to v2, `SOVX-01`).
