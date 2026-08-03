---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02.2
current_phase_name: 'Sovereignty marker lifecycle: auto-add on drop, delete with element, non-selectable'
status: human_needed
stopped_at: G-02.2-3/4/5/6 all closed — UAT tests 3 and 6 (auto-add-on-drop, duplicate/copy-paste) still need a live re-verification pass before Phase 02.2 can be marked fully complete
last_updated: '2026-08-03T00:30:00.000Z'
last_activity: 2026-08-03
last_activity_desc: User re-verified context-menu Delete (UAT test 5) against the rebuilt Docker client — confirmed working. G-02.2-5 closed. All 4 original UAT gaps (G-02.2-3/4/5/6) are now closed; only UAT tests 3 and 6 still need a live re-verification pass (their fixes are code-complete via Plan 02.2-03 but not yet re-tested live) before Phase 02.2 can be marked fully complete.
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 13
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-22)

**Core value:** Enterprise architecture data and sovereignty assessments must be trustworthy enough that operators can reproduce the platform and explain exactly where architectural obligations are or are not met.
**Current focus:** Phase 02.2 — G-02.2-3/4/5/6 all closed; UAT tests 3 and 6 still need a live re-verification pass before Phase 02.3 can be planned

## Current Position

Phase: 02.2 — Sovereignty marker lifecycle: auto-add on drop, delete with element, non-selectable — 4/4 plans executed (01, 02, and gap-closure 03, 04); ALL 4 gaps (G-02.2-3/4/5/6) CLOSED
Plan: 02.2-04 complete (4/4 plans in phase; Phase 02.2 fully executed at code level, including both gap-closure plans triggered by the initial UAT run)
Status: Initial 02.2-UAT.md run found 4 failing gaps (G-02.2-3/4/5/6). Plan 02.2-03 fixed the D-02 diff-detection race (closing G-02.2-3/6 at code level) and added suppressOnChangeRef wiring to FullCustomContextMenu (closing G-02.2-5, live-reconfirmed 2026-08-03). Plan 02.2-04 added live instrumentation for G-02.2-4 and, after fixing a stale Docker client image, confirmed native keyboard delete already works correctly (closed, no separate code change needed). Remaining: UAT tests 3 (auto-add-on-drop) and 6 (duplicate/copy-paste) still need a live re-verification pass against current code — their fixes are code-complete via Plan 02.2-03 but not yet re-tested live. Do NOT advance to Phase 02.3 planning until those are confirmed.
Last activity: 2026-08-03 — User re-verified context-menu Delete (UAT test 5) live against the rebuilt Docker client; confirmed working. G-02.2-5 closed.

Progress: [██████████] 100% (13/13 plans complete across phases)

Progress: [██████████] 100% (13/13 plans complete across phases)

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: 0 min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 01    | 1     | -     | -        |
| 2     | 0     | 0 min | 0 min    |
| 02.1  | 2     | -     | -        |

**Recent Trend:**

- Last 5 plans: none
- Trend: Stable

**Per-Plan Metrics:**

| Plan           | Duration | Tasks   | Files   |
| -------------- | -------- | ------- | ------- |
| Phase 2 P03    | 45min    | 3 tasks | 6 files |
| Phase 2 P04    | n/a      | 2 tasks | 7 files |
| Phase 2 P05    | 35min    | 2 tasks | 4 files |
| Phase 02.1 P01 | 15min    | 1 tasks | 1 files |
| Phase 02.1 P02 | 20min    | 1 tasks | 2 files |
| Phase 02.2 P01 | ~15min   | 3 tasks | 2 files |
| Phase 02.2 P02 | ~10min   | 2 tasks | 2 files |
| Phase 02.2 P03 | ~15min   | 2 tasks | 3 files |
| Phase 02.2 P04 | ~20min   | 3 tasks | 2 files |

## Quick Tasks Completed

| ID         | Description                                           | Date       | Status   | Commit  |
| ---------- | ----------------------------------------------------- | ---------- | -------- | ------- |
| 260731-et9 | Default arrow type to elbow in Add Related dialog     | 2026-07-31 | complete | e7bd5e8 |
| 260803-cny | Cap json-file logging (50m×5) on all compose services | 2026-08-03 | complete | eb5414e |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1: Setup stabilization precedes sovereignty work because runtime reproducibility is required for later verification.
- Phase 2: Sovereignty evaluation will use explicit per-element evidence with chain-based findings rather than inherited achieved values.
- Phase 2: Detail views and diagram markers must consume the same canonical sovereignty result.
- Phase 2: sovereignty detail views rewritten to query canonical sovereigntyAnalysis; legacy inheritance-based utils.ts deleted with zero remaining consumers.
- Phase 2: company-level sovereignty rollup (Temporal's last consumer) now derives from the same canonical evaluator as detail views/markers; GREY chains count toward (lower) the achieved score instead of being filtered out — SOV-05 complete.
- Phase 2: diagram sovereignty markers (fill/ring) now consume the same canonical sovereigntyMarkers query as detail views, gated behind featureFlags.Sovereignty, with worse-status merging across multiple BusinessCapability/DataObject roots on one diagram.
- [Phase 02.1]: D-01 implemented — F5/full-page reload scene restore now runs the full syncDiagramOnOpen pipeline (name/missing-element sync + syncSovereigntyMarkers), identical to handleOpenDiagram, instead of a markers-only shortcut.
- [Phase ?]: D-02/D-03/D-04 implemented: sovereignty marker ellipses live-reposition in place on every onChange during a drag, scoped only to main elements with an existing complete fill/ring pair.
- [Phase ?]: 02.2-01: locked:true on marker ellipses (D-04); diff-based auto-add-on-drop (D-02); live isDeleted-aware orphan cleanup with captureUpdate:IMMEDIATELY, two-tier undo (D-01/D-03)
- [Phase 02.2]: 02.2-02 (final plan of Phase 02.2): atomic marker cleanup added to FullCustomContextMenu.handleDelete (single updateScene, single Ctrl+Z restore, contrasting Plan 01's two-tier native-keyboard path); D-01 lifecycle-gap triage confirmed duplicate/copy/paste free coverage and logged handleDuplicate's id/groupIds remapping gap as accepted backlog
- [Phase 02.2]: 02.2-03 (gap-closure, G-02.2-3/5/6): previouslySeenMainElementIdsRef is no longer marked "seen" until a sync attempt confirms a marker applied or hasAnyMarkerRoot() confirms none possible, fixing a mark-before-confirm race; FullCustomContextMenu.handleDelete/handleDuplicate/handlePaste now set suppressOnChangeRef before updateScene(), matching every other call site
- [Phase 02.2]: 02.2-04 (gap-closure, G-02.2-4): live browser instrumentation confirmed G-02.2-4 was already resolved by 02.2-03's fix — no separate root cause or code change existed. First test attempt gave a false "no logs" negative because the nextgen-eam-client Docker container (no source bind-mount) was running a stale pre-Phase-02.2 image; rebuilding+force-recreating it resolved the false negative.

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1 must define one supported localhost-first runtime path and keep any Traefik or HTTPS parity flow explicitly optional.
- Phase 2 still needs a frozen semantic contract for traversal rules, cycle handling, and legacy field reconciliation during phase planning.

### Roadmap Evolution

- Phase 01.1 inserted after Phase 1: eam.example.com local domain setup: analyze and restore the eam.example.com hostname routing from the previous local setup so the Docker Compose stack runs under eam.example.com (URGENT)
- Phase 2.1 inserted after Phase 2: Two sovereignty-marker UAT findings: (1) F5 full-page reload restores the diagram via DiagramState.ts's localStorage scene-restore path, which never calls syncDiagramOnOpen/syncSovereigntyMarkers -- markers only appear via handleOpenDiagram (cross-page nav) or manual Ctrl+R sync; (2) marker fill/ring ellipses are positioned once at sync time and do not live-track a main element being dragged afterward. (URGENT)
- Phase 02.2 inserted after Phase 2: Sovereignty marker lifecycle: auto-add on drop, delete with element, non-selectable (URGENT)
- Phase 02.3 inserted after Phase 2: Business capability requirement-chain consistency (parent vs child required levels, YELLOW status, extends D-05) (URGENT)

## Deferred Items

| Category              | Item                                                                                                                                                                                                                                                                                                                                                                                    | Status           | Deferred At |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------- |
| Sovereignty Expansion | Blast-radius prioritization, business-process scope expansion, weighting, and portfolio analytics                                                                                                                                                                                                                                                                                       | Deferred to v2   | 2026-07-22  |
| Runtime Tooling       | Helm-dependent K8s runtime verification gate for Phase 01 (`helm status`, `kubectl wait`, endpoint check)                                                                                                                                                                                                                                                                               | Accepted backlog | 2026-07-27  |
| Diagram Lifecycle     | `handleDuplicate` (FullCustomContextMenu.tsx) builds duplicate element ids via string concatenation instead of `generateElementId()` and does not remap `groupIds`/`boundElements`/`containerId` — a latent grouping bug independent of sovereignty markers, confirmed non-trivial (would require extracting/reusing `createLibraryItemFromDatabaseElement`'s id/group remapping logic) | Accepted backlog | 2026-07-31  |

## Session Continuity

Last session: 2026-08-03T00:00:00.000Z
Stopped at: Completed 02.2-04-PLAN.md — G-02.2-3/4/6 closed; G-02.2-5 and UAT tests 3/5/6 still need a manual re-verification pass against current code before Phase 02.3 can be planned
Resume file: .planning/phases/02.2-sovereignty-marker-lifecycle-auto-add-on-drop-delete-with-el/02.2-UAT.md
