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
- [ ] **Phase 2: Canonical Sovereignty Evaluation & UX Diagnostics** - Deliver explicit chain-based sovereignty findings across backend, detail views, and diagrams.

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
**Plans:** 1 plan

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

| Phase                                                | Plans Complete | Status      | Completed  |
| ---------------------------------------------------- | -------------- | ----------- | ---------- |
| 1. Setup Stabilization & Deployment Clarity          | 1/1            | Complete    | 2026-07-27 |
| 2. Canonical Sovereignty Evaluation & UX Diagnostics | 5/5 | In Progress|  |

## Backlog (Accepted Blockers)

- Phase 1: Helm-dependent Kubernetes runtime verification remains open and accepted into backlog.
  - Required follow-up gates: `helm status <release> -n <namespace>`, `kubectl wait --for=condition=Ready ...`, `curl -fsS <GRAPHQL_HEALTH_URL>`.

### Phase 02.1: Fix diagram sovereignty marker sync gaps: F5 reload bypasses sovereignty sync entirely (localStorage scene-restore path in DiagramState.ts never calls syncDiagramOnOpen/syncSovereigntyMarkers, unlike handleOpenDiagram), and marker ellipses do not update in realtime when the user drags a main element (positions are computed once at sync time, not live-bound to the element) (INSERTED)

**Goal:** A raw browser F5/full-page reload restores sovereignty markers identically to opening the diagram via the Open dialog, and dragging a single main element keeps its fill/ring markers visually attached in real time instead of leaving them behind.
**Requirements**: SOV-RELOAD-SYNC, SOV-MARKER-DRAG (urgent bugfix; not tracked in REQUIREMENTS.md)
**Depends on:** Phase 2
**Plans:** 2 plans

Plans:

- [ ] 02.1-01-PLAN.md — Run the full syncDiagramOnOpen pipeline on F5/full-page-reload scene restore (D-01)
- [ ] 02.1-02-PLAN.md — Live-reposition marker ellipses in place on every onChange during a drag (D-02/D-03/D-04)
