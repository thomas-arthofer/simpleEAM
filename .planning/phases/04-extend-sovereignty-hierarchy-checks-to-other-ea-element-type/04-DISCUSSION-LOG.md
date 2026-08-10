# Phase 4: Extend sovereignty hierarchy checks to other EA element types - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type
**Areas discussed:** Scope (BusinessProcess vs Supplier), BusinessProcess chain wiring, BusinessProcess parent-consistency check, Supplier findings without a diagram element

---

## Scope: BusinessProcess vs Supplier vs both

| Option | Description | Selected |
|--------|-------------|----------|
| BusinessProcess only | Diagrammable today, explicitly named gap in eam-konzept.md §6, tracked by SOVX-02 | ✓ |
| Both BusinessProcess and Supplier | Full closure of both Phase-2-deferred items in one phase | |
| Supplier only | Unusual — Supplier has no diagram UI today | |
| You decide | Agent picks based on technical cleanliness/risk | |

**User's choice:** BusinessProcess only
**Notes:** Supplier stays deferred, re-confirmed later in the "Supplier" area below.

---

## BusinessProcess chain wiring

| Option | Description | Selected |
|--------|-------------|----------|
| New independent requirement root only | Mirrors analyzeDataObject/analyzeSupportChain — own /sovereignty analysis independent of any BusinessCapability | ✓ |
| Inserted into BusinessCapability's existing chain only | BusinessCapability's downstreamStatus rolls up through supportedByBusinessProcesses | |
| Both | Independently viewable AND rolled into any referencing BusinessCapability | |
| You decide | Agent picks smaller/lower-risk change | |

**User's choice:** New independent requirement root only
**Notes:** `BusinessCapability.supportedByBusinessProcesses` is explicitly NOT wired into `analyzeCapabilitySubtree` this phase (D-03).

---

## BusinessProcess parent-consistency check

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — full parent tree-consistency check | Mirrors 02.3/03 exactly: YELLOW on contradiction, null-exclusion, independent-per-parent-edge, three-valued GREEN/YELLOW/GREY selfStatus | ✓ |
| No — achieved-chain only, defer parent-consistency | Only wire supportedByApplications findings this phase; treat parentProcess tree-consistency as a separate follow-up phase | |
| You decide | Agent picks based on effort/risk vs. value | |

**User's choice:** Yes — full parent tree-consistency check
**Notes:** BusinessProcess gets the complete 02.3+03 treatment (YELLOW contradiction finding + three-valued selfStatus), not a reduced version.

---

## Supplier findings without a diagram element

| Option | Description | Selected |
|--------|-------------|----------|
| Just re-confirm deferred, no new decision | Keep in Deferred Ideas as-is (already logged in Phase 2's D-08) — no work this phase | ✓ |
| Pre-decide the eventual wiring approach anyway | Record now that findings should collapse onto the referencing Application/Infra/AIComponent marker | |

**User's choice:** Just re-confirm deferred, no new decision
**Notes:** Since scope was already narrowed to BusinessProcess only, this area became a re-confirmation rather than a new decision.

---

## the agent's Discretion

- Exact repository/GraphQL fetch shape for BusinessProcess's upward `parentProcess` required levels.
- Whether BusinessProcess needs its own dedicated detail-view route/query or reuses an existing generic pattern.
- Diagram marker gating mechanism for BusinessProcess (reuse existing `featureFlags.Sovereignty` vs. new mechanism).
- Whether `classifyCapabilityAgainstParent` is generalized into a shared classifier or duplicated for BusinessProcess.

## Deferred Ideas

- Supplier chain traversal (Phase 2 D-08) — stays deferred, not diagrammable today.
- BusinessCapability ↔ BusinessProcess chain nesting (`supportedByBusinessProcesses`) — explicitly rejected as in-scope this phase.
- Blast-radius/portfolio prioritization (SOVX-01) and weighted scoring (SOVX-04) — unchanged v2 deferrals.
