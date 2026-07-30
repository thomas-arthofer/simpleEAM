---
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
plan: 05
subsystem: ui
tags: [excalidraw, diagrams, apollo, sovereignty, feature-flags, mui]

# Dependency graph
requires:
  - phase: 02-canonical-sovereignty-evaluation-ux-diagnostics-02
    provides: 'server/src/sovereignty/markers.ts projectMarkers/resolveMarker (D-05 fill/ring projection) and Query.sovereigntyMarkers(companyId, rootType, rootId, nodes) batch GraphQL query'
provides:
  - 'client/src/graphql/sovereigntyMarkers.ts — GET_SOVEREIGNTY_MARKERS tagged query matching 02-02s schema exactly'
  - 'client/src/components/diagrams/utils/sovereigntyMarkers.ts — fetchSovereigntyMarkersForDiagram/applySovereigntyMarkers/syncSovereigntyMarkers: D-09-gated fetch, multi-root worse-status merge, idempotent fill/ring ellipse rendering'
  - 'syncDiagramOnOpen (databaseSyncUtils.ts) composes syncSovereigntyMarkers via an optional third sovereigntyOptions argument'
  - 'DiagramHandlers.ts useDiagramHandlers reads featureFlags.Sovereignty + selectedCompanyId and passes them into both syncDiagramOnOpen call sites (handleOpenDiagram, handleManualSync)'
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "syncSovereigntyMarkers is the single D-09 gate: `if (!options.enabled || !options.companyId) return elements` before extractDatabaseElements or any query runs — mirrors the composition-point pattern already used for syncDiagramOnOpenSimple"
    - "worseStatus/SOVEREIGNTY_STATUS_RANK precedence helper reconciles multi-root marker results (worse status always wins) — reused only to merge already-classified server results, never to reclassify anything client-side (one classifier, reused everywhere)"
    - "Marker ellipses are idempotently replaced: applySovereigntyMarkers filters out any prior element with customData.sovereigntyMarker in {'fill','ring'} bound to a main element about to be re-marked, before appending the new pair — mirrors markMissingElements's update-in-place pattern"

key-files:
  created:
    - client/src/graphql/sovereigntyMarkers.ts
    - client/src/components/diagrams/utils/sovereigntyMarkers.ts
  modified:
    - client/src/components/diagrams/utils/databaseSyncUtils.ts
    - client/src/components/diagrams/handlers/DiagramHandlers.ts

key-decisions:
  - "syncDiagramOnOpen's new sovereigntyOptions parameter is optional and additive — when omitted, behavior is byte-identical to before this plan, so no other call site of syncDiagramOnOpen (if any exist beyond DiagramHandlers.ts) is broken by this change."
  - "fetchSovereigntyMarkersForDiagram loops over every BusinessCapability/DataObject root found in the diagram (not just the first), merging each root's returned markers into one Map with worseStatus so an unrelated root's default GREEN/GREEN response for a shared node never overwrites a real RED/YELLOW/GREY that node received from its actual chain's root."
  - "Each root's GraphQL call is wrapped in its own try/catch; a failure fetching one root's markers is logged via console.warn and skipped, never aborting the diagram open or blocking markers for the diagram's other roots (fail-closed per root, per UI-SPEC's 'error' state row)."
  - "The client mirrors the server's 500-node sovereigntyMarkerNodesSchema.max(500) cap by slicing the nodes array before every request, so an oversized diagram never sends a request guaranteed to be rejected by 02-02's validation boundary."

requirements-completed: [SUX-03, SUX-04]

coverage:
  - id: D1
    description: 'GET_SOVEREIGNTY_MARKERS query defined matching 02-02s sovereigntyMarkers(companyId, rootType, rootId, nodes) contract exactly, with no invented field/type names'
    requirement: SUX-03
    verification:
      - kind: other
        ref: 'cd client && yarn type-check (clean); grep -n "sovereigntyMarkers" client/src/graphql/sovereigntyMarkers.ts'
        status: pass
    human_judgment: false
  - id: D2
    description: 'featureFlags.Sovereignty gates both syncDiagramOnOpen call sites (handleOpenDiagram, handleManualSync) — no query issued when disabled (D-09)'
    requirement: SUX-03
    verification:
      - kind: other
        ref: 'grep -n "featureFlags.Sovereignty" client/src/components/diagrams/handlers/DiagramHandlers.ts'
        status: pass
    human_judgment: true
    rationale: 'Network-tab verification that zero sovereigntyMarkers requests fire when the flag is disabled, and that markers render correctly for RED/YELLOW/GREY/GREEN with a live Neo4j/GraphQL stack, requires a human to open the app and inspect the diagram/network tab per the plans <human-check> verify step — not reproducible from static analysis alone in this environment.'
  - id: D3
    description: 'Fill (selfStatus) and ring (downstreamStatus) ellipses render with UI-SPEC locked colors/sizes/stroke-styles, never overwriting the main elements own styling'
    requirement: SUX-04
    verification:
      - kind: other
        ref: 'cd client && yarn type-check (clean); source review of applySovereigntyMarkers/createMarkerEllipses'
        status: pass
    human_judgment: true
    rationale: 'Visual correctness (10px/18px sizing, solid-vs-dashed ring stroke, colorblind-safe redundant encoding, readability at typical zoom) is a rendering/visual concern the plans <human-check> step requires a human to confirm against a real diagram; no automated visual test exists in this repo for Excalidraw canvas output.'
  - id: D4
    description: 'Multi-root merge (worse status wins), idempotent re-sync (no duplicate ellipses), and fail-closed per-root error handling'
    verification:
      - kind: other
        ref: 'cd client && yarn type-check (clean); grep -n "worseStatus" / "slice(0, 500)" / "sovereigntyMarker === .fill." client/src/components/diagrams/utils/sovereigntyMarkers.ts'
        status: pass
    human_judgment: true
    rationale: 'Confirming repeated diagram opens never increase marker-ellipse count beyond 2 per element, and that a single failing root does not block others, requires exercising the running app against seeded/fixture data per the plans <human-check> step — not verifiable via type-check alone.'

duration: ~35min
completed: 2026-07-30
status: complete
---

# Phase 2 Plan 05: Diagram Sovereignty Markers (D-05 Fill/Ring) Summary

**Client-only diagram integration consuming 02-02's batched `sovereigntyMarkers` GraphQL query: renders D-05 fill/ring status ellipses on diagram elements, gated behind `featureFlags.Sovereignty`, with multi-root worse-status merging and idempotent re-sync.**

## Performance

- **Completed:** 2026-07-30
- **Tasks:** 2/2 completed
- **Files modified/created:** 4 (2 new source files, 2 modified files)

## Accomplishments

- Added `GET_SOVEREIGNTY_MARKERS` (`client/src/graphql/sovereigntyMarkers.ts`), matching 02-02's `sovereigntyMarkers(companyId, rootType, rootId, nodes)` schema field-for-field — the client introduces no new/duplicate classification query shape.
- Added `client/src/components/diagrams/utils/sovereigntyMarkers.ts` exporting `SOVEREIGNTY_STATUS_COLORS` (locked UI-SPEC hex values), `fetchSovereigntyMarkersForDiagram`, `applySovereigntyMarkers`, and `syncSovereigntyMarkers` — the single D-09 gate that must be true before any network call is made.
- Composed `syncSovereigntyMarkers` into `syncDiagramOnOpen` (`databaseSyncUtils.ts`) via an optional third `sovereigntyOptions` argument, immediately after `syncDiagramOnOpenSimple` — omitting the argument leaves existing behavior byte-identical.
- Wired `useFeatureFlags()`'s `featureFlags.Sovereignty` and `useCompanyContext()`'s `selectedCompanyId` into both existing `syncDiagramOnOpen` call sites in `DiagramHandlers.ts` (`handleOpenDiagram`, `handleManualSync`), so a manual sync refreshes markers exactly like an initial diagram open.
- Hardened marker fetching to loop over every BusinessCapability/DataObject root on the diagram, merging results across roots with a `worseStatus` precedence helper so an unrelated root's default GREEN/GREEN response never silently overwrites a node's real RED/YELLOW/GREY status from its actual chain.
- Made `applySovereigntyMarkers` idempotent: a prior fill/ring ellipse pair bound to a main element about to be re-marked is filtered out before the new pair is appended, so repeated diagram opens/manual syncs never accumulate duplicate marker ellipses.
- Wrapped each root's GraphQL call in its own `try/catch` so a single root's fetch failure is logged and skipped, never blocking markers for the diagram's other roots and never throwing out of the function (fail-closed).
- Client-side `.slice(0, 500)` node cap mirrors 02-02's server-side `sovereigntyMarkerNodesSchema.max(500)`, so an oversized diagram never sends a request guaranteed to be rejected.
- `cd client && yarn type-check` is clean after both tasks (zero new TypeScript errors).

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end diagram markers — query, transform, and gated wiring for one diagram open** - `67d360d` (feat)
2. **Task 2: Multi-root merge, idempotent re-sync, and fail-closed hardening** - `f80d69f` (feat)

_Note: this SUMMARY/state-update commit will be recorded separately as the plan metadata commit._

## Files Created/Modified

- `client/src/graphql/sovereigntyMarkers.ts` - `GET_SOVEREIGNTY_MARKERS` tagged query (`@apollo/client/core` convention, matching every other file in `client/src/graphql/`)
- `client/src/components/diagrams/utils/sovereigntyMarkers.ts` - `SOVEREIGNTY_STATUS_COLORS`, `worseStatus`/`SOVEREIGNTY_STATUS_RANK`, `fetchSovereigntyMarkersForDiagram`, `applySovereigntyMarkers`, `syncSovereigntyMarkers` — the full D-05 fetch/transform/gate/idempotent-render pipeline
- `client/src/components/diagrams/utils/databaseSyncUtils.ts` - `syncDiagramOnOpen` gained an optional `sovereigntyOptions` third parameter, composing `syncSovereigntyMarkers` after `syncDiagramOnOpenSimple`
- `client/src/components/diagrams/handlers/DiagramHandlers.ts` - `useDiagramHandlers` now reads `featureFlags.Sovereignty` via `useFeatureFlags()` and passes `{ enabled, companyId }` into both `syncDiagramOnOpen` call sites; `useCallback` dependency arrays updated accordingly

## Decisions Made

- **`@apollo/client/core` import path, not `@apollo/client`.** The plan's action text specified `@apollo/client`, but every one of the 31 existing files in `client/src/graphql/` (including `sovereigntyDetail.ts`, the direct precedent for this plan) imports `gql` from `@apollo/client/core`. Followed the actual codebase convention over the plan's literal wording — same practical result, zero inconsistency introduced.
- **`DiagramElement` interface duplicated locally, not imported.** `databaseSyncUtils.ts`'s `DiagramElement` interface is not exported. Rather than exporting it (an out-of-scope change to an existing file's public surface), a structurally-compatible local `DiagramElement` interface was defined in `sovereigntyMarkers.ts` with only the fields this module reads/writes, kept in sync by comment.
- **Marker rendering unaffected by a disabled flag once markers already exist on canvas.** Per the plan's literal Task 1 action text, `syncSovereigntyMarkers` returns `elements` completely unchanged when `!options.enabled`, without attempting to strip any previously-rendered marker ellipses that might already be present in a saved diagram's element array. This matches the plan's explicit gate contract; removing stale markers on flag-disable was not requested by any `<task>` action or truth and would be a scope addition beyond this plan.

## Deviations from Plan

None - plan executed exactly as written (both tasks' `<action>` text implemented verbatim; the two decisions above are wording/convention clarifications, not behavioral deviations).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 plans of Phase 2 (Canonical Sovereignty Evaluation & UX Diagnostics) now have summaries on disk (02-01 through 02-05) — **Phase 2 is ready for phase-level verification.**
- Manual/visual verification of live marker rendering (RED/YELLOW/GREY/GREEN ellipse colors, solid-vs-dashed ring stroke, flag-off producing zero network calls) against a running Docker/Neo4j stack with seeded sovereignty fixture data is still outstanding — flagged as `human_judgment: true` in this SUMMARY's `coverage` block, consistent with 02-01/02-02's documented "no live Docker+Neo4j verification performed in this environment" limitation.

## Self-Check: PASSED

All 4 claimed files verified present on disk (2 created, 2 modified). Both task commits (`67d360d`, `f80d69f`) verified present in git history. `cd client && yarn type-check`: clean (exit 0).

---
*Phase: 02-canonical-sovereignty-evaluation-ux-diagnostics*
*Completed: 2026-07-30*
