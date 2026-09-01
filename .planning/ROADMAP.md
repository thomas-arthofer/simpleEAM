# Roadmap: simpleEAM Brownfield Stabilization and Sovereignty Refactor

## Overview

This milestone restores trust in the platform in two ordered phases. Phase 1 makes the supported Docker Compose and Kubernetes paths reproducible and explicit from the repository state. Phase 2 replaces inherited sovereignty scoring with explicit chain-based evaluation and exposes the same explainable findings in element details and diagrams.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Setup Stabilization & Deployment Clarity** - Make the supported Docker and Kubernetes paths reproducible and explicit. (completed 2026-07-27)
- [x] **Phase 01.1: eam.example.com local domain setup** - Restore local Traefik/CA/DNS routing and verify end-to-end Keycloak login. (completed 2026-07-27, INSERTED)
- [x] **Phase 2: Canonical Sovereignty Evaluation & UX Diagnostics** - Deliver explicit chain-based sovereignty findings across backend, detail views, and diagrams. (completed 2026-08-07)

## Phase Details

### Phase 1: Setup Stabilization & Deployment Clarity

**Goal**: Developers and operators can start, verify, and understand the supported local and Kubernetes deployment paths without hidden routing or cluster assumptions.
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05
**Success Criteria** (what must be TRUE):

1. A developer can follow the documented default local path from a clean clone and reach a usable baseline stack without router-level DNS hacks.
2. The local setup documentation clearly separates the supported localhost-first path from any optional Traefik or HTTPS parity path.
3. An operator can identify required environment variables, optional services, and the exact checks that prove the stack is usable after startup.
4. An operator can read the Kubernetes docs and know the required external dependencies, network assumptions, storage expectations, and rollout order before running Helm commands.
   **Plans**: TBD
   **Mode:** mvp

### Phase 01.1: eam.example.com local domain setup: analyze and restore the eam.example.com hostname routing from the previous local setup so the Docker Compose stack runs under eam.example.com (INSERTED)

**Goal:** Restore `https://eam.example.com` local routing, most importantly Keycloak-backed SSO login, so it works end-to-end again. Narrow restoration only — Phase 1's localhost-first Supported Path stays the unchanged default.
**Requirements**: TBD (urgent inserted phase; tracked as `GOAL-01.1` in plan/validation artifacts)
**Depends on:** Phase 1
**Plans:** 1/1 plans complete

Plans:

- [x] 01.1-PLAN.md — Restore local Traefik routing with network aliases (root-cause DNS fix), restore Optional Path documentation with login caveat, verify end-to-end Keycloak login (completed 2026-07-27)

### Phase 2: Canonical Sovereignty Evaluation & UX Diagnostics

**Goal**: Architects can trust sovereignty assessments because each relevant element is judged from explicit evidence and the same explainable findings appear in detail views and diagrams.
**Depends on**: Phase 1
**Requirements**: SOV-01, SOV-02, SOV-03, SOV-04, SOV-05, SUX-01, SUX-02, SUX-03, SUX-04
**Success Criteria** (what must be TRUE):

1. When a user inspects a relevant element, the system evaluates that element from its own explicit sovereignty achievement values instead of inherited achieved values.
2. The system shows sovereignty breaks along dependency chains with explainable findings that name the violating element, affected dimension, required value, actual value, and chain context.
3. Missing sovereignty evaluations remain visible as a gray or unknown state rather than appearing compliant by default.
4. In an element detail view, a user can tell whether the current element is the cause of a sovereignty issue or is affected by a weaker element elsewhere in the chain.
5. When diagram markers are enabled, added elements show canonical sovereignty status markers that distinguish local violations from downstream impact.
   **Plans**: 5/5 plans executed

- [x] 02-01-PLAN.md
- [x] 02-02-PLAN.md
- [x] 02-03-PLAN.md
- [x] 02-04-PLAN.md
- [x] 02-05-PLAN.md
      **Mode:** mvp
      **UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2

| Phase                                                | Plans Complete | Status   | Completed  |
| ---------------------------------------------------- | -------------- | -------- | ---------- |
| 1. Setup Stabilization & Deployment Clarity          | 1/1            | Complete | 2026-07-27 |
| 2. Canonical Sovereignty Evaluation & UX Diagnostics | 5/5            | Complete | 2026-08-07 |

## Backlog (Accepted Blockers)

- Phase 1: Helm-dependent Kubernetes runtime verification remains open and accepted into backlog.
  - Required follow-up gates: `helm status <release> -n <namespace>`, `kubectl wait --for=condition=Ready ...`, `curl -fsS <GRAPHQL_HEALTH_URL>`.

### Phase 02.3: Business capability requirement-chain consistency: compare parent vs child BusinessCapability required levels along HAS_PARENT edges, flag inconsistencies (child requirement below parent) as a self-status finding (YELLOW), extending D-05 to allow a capability to be its own violation source for requirement-tree contradictions (INSERTED)

**Goal:** When a BusinessCapability's own required sovereignty level is weaker than any of its parent BusinessCapabilities' required levels for the same dimension, the system emits a YELLOW self-status finding (`violatingElementType: 'businessCapability'`) that names the child as the violation source. Applies to both the analysis root against its direct parents (D-01) and to descendants against their in-scope parent during subtree recursion. Null-either-side excludes the dimension entirely (D-03/D-04). Multi-parent handling is independent-per-edge (D-02). Reuses the existing `Finding` shape (D-06) and narrowly excepts markers.ts's unconditional GREY-self invariant for this one case (D-05).
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06 (derived from 02.3-CONTEXT.md decisions; no REQUIREMENTS.md entry for this urgent inserted phase)
**Depends on:** Phase 2
**Plans:** 2 plans

Plans:
**Wave 1**

- [x] 02.3-01-PLAN.md — Wave 1 tracer: root-vs-own-parents YELLOW finding end-to-end (types, evaluator classifyCapabilityAgainstParent, markers conditional GREY, fixture + tests) — D-01 root half, D-03, D-04, D-05, D-06

**Wave 2** _(blocked on Wave 1 completion)_

- [x] 02.3-02-PLAN.md — Wave 2 expansion: descendant-vs-parent in analyzeCapabilitySubtree recursion, D-02 multi-parent independent-edge iteration, Neo4j Cypher OUT-direction HAS_PARENT fetch populating parentRequiredLevels on root only

**Status: COMPLETE** — both plans executed, verified (37 sovereignty tests pass, `yarn tsc --noEmit` clean), committed, and summarized (02.3-01-SUMMARY.md, 02.3-02-SUMMARY.md).

### Phase 02.2: Sovereignty marker lifecycle: auto-add on drop, delete with element, non-selectable (INSERTED)

**Goal:** Sovereignty markers stay correctly synced through the full element lifecycle on a diagram, not just at open/reload time (Phase 02.1's scope). Specifically: (1) dragging a new main element onto the canvas from the library automatically gets fill/ring markers applied immediately, without requiring a manual Ctrl+R resync; (2) deleting a main element instantly removes its associated marker ellipses in the same change, instead of leaving orphaned markers behind; (3) research whether marker ellipses are robustly tied to their main element across other lifecycle events not yet covered (e.g. copy/paste, duplicate, undo/redo of a delete, group operations), and confirm/fix that marker ellipses themselves are excluded from direct selection (not independently selectable/draggable/deletable by the user) — surface any additional gaps found during research as findings, not just the two items explicitly named here.
**Requirements**: SOV-MARKER-AUTOADD, SOV-MARKER-DELETE (urgent bugfix; not tracked in REQUIREMENTS.md)
**Depends on:** Phase 02.1
**Plans:** 2/4 plans complete (2 gap-closure plans added after UAT found 4 gaps — see 02.2-UAT.md)

Plans:

- [x] 02.2-01-PLAN.md — `locked: true` non-selectability (D-04), diff-based auto-add-on-drop (D-02), live isDeleted-aware orphan-marker cleanup with explicit captureUpdate (D-01/D-03) — all wired into ExcalidrawWrapper.tsx's handleChange
- [x] 02.2-02-PLAN.md — Atomic marker cleanup in the context-menu Delete path (FullCustomContextMenu.tsx) + D-01 lifecycle-gap triage (verify duplicate/copy/paste free coverage, log the one confirmed non-trivial handleDuplicate gap to backlog)
- [ ] 02.2-03-PLAN.md — Gap closure: retry-safe D-02 diff-detection ref commit (G-02.2-3, G-02.2-6) + suppressOnChangeRef wiring into FullCustomContextMenu (G-02.2-5, G-02.2-6)
- [ ] 02.2-04-PLAN.md — Gap closure: live-instrumentation investigation for G-02.2-4 (native keyboard delete) — diagnose-only, blocking human checkpoint, follow-up fix plan required

### Phase 02.1: Fix diagram sovereignty marker sync gaps: F5 reload bypasses sovereignty sync entirely (localStorage scene-restore path in DiagramState.ts never calls syncDiagramOnOpen/syncSovereigntyMarkers, unlike handleOpenDiagram), and marker ellipses do not update in realtime when the user drags a main element (positions are computed once at sync time, not live-bound to the element) (INSERTED)

**Goal:** A raw browser F5/full-page reload restores sovereignty markers identically to opening the diagram via the Open dialog, and dragging a single main element keeps its fill/ring markers visually attached in real time instead of leaving them behind.
**Requirements**: SOV-RELOAD-SYNC, SOV-MARKER-DRAG (urgent bugfix; not tracked in REQUIREMENTS.md)
**Depends on:** Phase 2
**Plans:** 2/2 plans complete

Plans:

- [x] 02.1-01-PLAN.md — Run the full syncDiagramOnOpen pipeline on F5/full-page-reload scene restore (D-01)
- [x] 02.1-02-PLAN.md — Live-reposition marker ellipses in place on every onChange during a drag (D-02/D-03/D-04)

### Phase 3: BusinessCapability self-status GREEN for parent-consistent requirements

**Goal:** Extend Phase 02.3's required-level tree-consistency check so a `BusinessCapability`'s self-status is three-valued instead of two-valued: GREEN when its own required level is explicitly checked and consistent with its parent(s) (currently indistinguishable from the "nothing to compare" case), YELLOW on contradiction (existing 02.3 behavior, unchanged), GREY only when there is genuinely nothing to compare (no parent present — the root of the whole capability hierarchy is inherently GREY, permanently, since it has no parent by definition). Benefit: on a diagram, self-fill and downstream-ring together become unambiguous — e.g. a capability with GREEN fill + RED ring instantly reads as "my own requirement chain is fine, the problem is downstream," instead of today's ambiguous GREY fill + RED ring.

Special case to design: when the _entire_ chain from a node downward is green (its own self-status is GREEN AND its downstream status is also GREEN — nothing below violates anything), the two-marker projection should render as GREEN/GREEN. Otherwise the existing combinations apply (e.g. GREY self/GREY downstream when nothing is comparable or wrong, or GREY self/RED downstream when the root has no parent but something below is broken).

Multi-parent handling (D-02 from Phase 2/02.3) carries over unchanged: GREEN requires consistency with **all** parents, not just the strictest one.
**Requirements**: D-01, D-02, D-03, D-04 (03-CONTEXT.md; extends 02.3's D-01/D-02/D-03/D-04/D-05/D-06)
**Depends on:** Phase 02.3
**Plans:** 1/1 plans complete

Plans:

- [x] 03-01-PLAN.md — Thread the "real comparison happened" signal from `evaluator.ts` through `markers.ts` so `projectMarkers()` resolves GREEN/YELLOW/GREY for root, descendant, and D-02 multi-parent cases

### Phase 4: Extend sovereignty hierarchy checks to other EA element types

**Goal:** `BusinessProcess` becomes a full sovereignty requirement root: a new independent `SovereigntyRootType` mirroring `analyzeDataObject`'s achieved-chain evaluation against its `supportedByApplications` (D-02), plus the full 02.3/03 three-valued GREEN/YELLOW/GREY parent-consistency check against its own `parentProcess` hierarchy (D-04), evaluated entirely on its own — not nested inside any `BusinessCapability`'s chain (D-03). `Supplier` (Phase 2 D-08) stays deferred, unchanged (D-01/D-05).
**Requirements**: SOVX-02, D-01, D-02, D-03, D-04, D-05 (04-CONTEXT.md decisions; SOVX-02 tracked in REQUIREMENTS.md)
**Depends on:** Phase 3
**Plans:** 3/3 plans complete

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Wave 1 tracer: BusinessProcess achieved-chain evaluation end-to-end (types, analyzeBusinessProcess, real Neo4j fetch, GraphQL rootType dispatch) — D-01, D-02

**Wave 2** _(blocked on Wave 1 completion)_

- [x] 04-02-PLAN.md — Wave 2 expansion: parent-consistency against parentProcess (generalized classifyCapabilityAgainstParent, three-valued selfStatus), the critical markers.ts selfViolatingIds bug fix, companyRollup.ts BusinessProcess inclusion — D-04, D-05

**Wave 3** _(blocked on Wave 2 completion)_

- [x] 04-03-PLAN.md — Wave 3 client wiring: SovereigntyProcessView + third /sovereignty tab, entity-edit dialog branch, diagram marker eligibility — D-01, D-04

### Phase 5: Rework Chain Colors

**Goal:** Redefine the sovereignty marker color computation so each requirement-root chain (BusinessCapability / DataObject / BusinessProcess) is scored against a single chain premise `effective-Req[d] ≤ min-Achieved-in-chain[d]`, where `effective-Req[d] = max` of the root's own required and every ancestor's required. Aggregate worst-of-4-dimensions to one color per element (GREEN/YELLOW/RED/GREY, with provable violation dominating data gaps). Absorb the Phase 02.3 / 03 / 04 parent-consistency signal into `effective-Req` and retire `classifyCapabilityAgainstParent` (D-06 Option a). No GraphQL schema change; only the `YELLOW` semantic shifts.
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06 (CONTEXT-driven; no REQUIREMENTS.md IDs)
**Depends on:** Phase 4
**Plans:** 3 plans

Plans:
**Wave 1**

- [ ] 05-01-PLAN.md — Wave 1 tracer: BC single-dimension chain-premise end-to-end (types + repository ancestor walk + classifyNode deviation math) — D-01, D-02, D-03, D-05

**Wave 2** _(blocked on Wave 1 completion)_

- [ ] 05-02-PLAN.md — Wave 2 expansion: 4-dim aggregation, BP + DO parity, projectMarkers rewrite, D-06 retirement, companyRollup YELLOW fix, full test rewire — D-01, D-02, D-03, D-04, D-05, D-06

**Wave 3** _(blocked on Wave 2 completion)_

- [ ] 05-03-PLAN.md — Wave 3 polish: client detail-view findingRow dispatch + DE/EN i18n copy — D-04

### Phase 6: Diagramm: Add all related

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 5
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 6 to break down)
