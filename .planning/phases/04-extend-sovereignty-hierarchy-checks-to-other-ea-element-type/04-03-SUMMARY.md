---
phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type
plan: 03
subsystem: client
tags: [typescript, nextjs, mui, apollo, sovereignty, business-process, excalidraw]

# Dependency graph
requires:
  - phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type
    plan: 02
    provides: analyzeBusinessProcess three-valued parent-consistency selfStatus, markers.ts selfViolatingIds fix, companyRollup BusinessProcess inclusion
provides:
  - SovereigntyProcessView.tsx — Processes tab on /sovereignty listing BusinessProcesses with per-item self/downstream StatusChip and findings panel
  - SovereigntyEntityDialog.tsx businessprocess branch reusing BusinessProcessForm/GET_BUSINESS_PROCESSES/UPDATE_BUSINESS_PROCESS
  - BusinessProcess diagram-marker eligibility (isMarkerRoot allow-list, DiagramElement.customData.elementType union)
affects: [sovereignty, business-process, client-ui, diagrams]

tech-stack:
  added: []
  patterns:
    - 'SovereigntyProcessView.tsx is a structural copy of SovereigntyDataView.tsx (04-RESEARCH.md Pattern 4) — same GET_SOVEREIGNTY_ANALYSIS query unchanged, only the list query and two i18n-driven labels differ'
    - 'sovereigntyMarkers.ts and databaseSyncUtils.ts each declare their own structurally-identical (unexported) DiagramElement interface — extending customData.elementType requires updating both in lockstep or tsc fails with "two different types with this name exist, but they are unrelated"'

key-files:
  created:
    - client/src/components/sovereignty/SovereigntyProcessView.tsx
  modified:
    - client/src/graphql/sovereigntyDetail.ts
    - client/src/components/sovereignty/types.ts
    - client/src/app/[lang]/sovereignty/page.tsx
    - client/messages/de.json
    - client/messages/en.json
    - client/src/components/sovereignty/SovereigntyEntityDialog.tsx
    - client/src/components/diagrams/utils/sovereigntyMarkers.ts
    - client/src/components/diagrams/utils/databaseSyncUtils.ts

key-decisions:
  - "No deviations from the plan's intended UI/wiring shape. One unplanned but Rule-3-mandated fix: client/src/components/diagrams/utils/databaseSyncUtils.ts declares its own structurally-parallel (unexported) DiagramElement interface with the same customData.elementType union as sovereigntyMarkers.ts's DiagramElement — extending only sovereigntyMarkers.ts's union broke tsc (TS2719, 'two different types with this name exist, but they are unrelated') at three call sites where the two modules' arrays cross a function boundary. Added 'businessProcess' to databaseSyncUtils.ts's union too, one line, to restore structural compatibility — no logic change."
  - "Staged databaseSyncUtils.ts's commit with git add -p to include only the elementType union line; a separate, unrelated pre-existing uncommitted formatting reflow of a syncSovereigntyMarkers call in the same file (present in the working tree before this plan started) was deliberately left unstaged/uncommitted, out of this plan's scope."

requirements-completed: [D-01, D-04]

coverage:
  - id: D1
    description: 'A user can see a list of BusinessProcesses on the /sovereignty page with a per-process self/downstream StatusChip and a findings panel, in a new third tab alongside the existing Capabilities/Data tabs'
    requirement: 'D-01'
    verification:
      - kind: other
        ref: 'manual review: SovereigntyProcessView.tsx structural copy of SovereigntyDataView.tsx wired into page.tsx as a third Tab; cd client && yarn tsc --noEmit clean'
        status: pass
    human_judgment: true
  - id: D2
    description: "Clicking a BusinessProcess chip or a finding's violating-element chip (when it names a BusinessProcess) opens the existing SovereigntyEntityDialog in edit mode using the already-existing BusinessProcessForm/GET_BUSINESS_PROCESSES/UPDATE_BUSINESS_PROCESS — no new form is built"
    requirement: 'D-01'
    verification:
      - kind: other
        ref: 'manual review: SovereigntyEntityDialog.tsx businessprocess case in fetch switch, hasCurrentData check, handleBusinessProcessSubmit, and BusinessProcessForm render branch — no new form/mutation created'
        status: pass
    human_judgment: true
  - id: D3
    description: "A BusinessProcess diagram element on an Excalidraw canvas, with featureFlags.Sovereignty enabled, gets the same fill/ring two-marker treatment as a BusinessCapability/DataObject element — it is not silently skipped by isMarkerRoot's allow-list"
    requirement: 'D-04'
    verification:
      - kind: other
        ref: "manual review: sovereigntyMarkers.ts isMarkerRoot extended with '|| element.customData?.elementType === \\'businessProcess\\''; DiagramElement.customData.elementType union (both sovereigntyMarkers.ts and databaseSyncUtils.ts) extended with 'businessProcess'"
        status: pass
    human_judgment: true

duration: ~20 minutes
completed: 2026-08-10
status: complete
---

# Phase 4 Plan 3: BusinessProcess client sovereignty UI wiring Summary

**Gives BusinessProcess the same client-side sovereignty surfaces BusinessCapability/DataObject already have: a new "Processes" tab on `/sovereignty` (`SovereigntyProcessView.tsx`, a structural copy of `SovereigntyDataView.tsx`), a `SovereigntyEntityDialog` branch reusing the already-existing `BusinessProcessForm`/`UPDATE_BUSINESS_PROCESS`, and diagram-marker eligibility (`isMarkerRoot` allow-list extension) — pure client wiring, zero server-side files touched.**

## Performance

- **Duration:** ~20 minutes
- **Tasks:** 3/3 tasks complete. Task 3 (manual-verification checkpoint) was deferred at execution time (a code-execution agent cannot browser-verify) and was approved by the user in a follow-up session on 2026-08-10 after rebuilding/recreating the `server`/`client` Docker images (both are build-only, no source bind mount) so the running stack actually served this phase's code. User explicitly confirmed sub-checks 1 ("Processes" tab present) and 3 (finding chip opens the entity dialog) by name; sub-checks 2, 4, and 5 (findings panel rendering, live diagram fill/ring markers, YELLOW parent-contradiction consistency) were covered by the blanket "approved" resume signal without individual callouts.
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments

- `GET_SOVEREIGNTY_BUSINESS_PROCESSES_LIST` added to `sovereigntyDetail.ts`, mirroring `GET_SOVEREIGNTY_DATA_OBJECTS_LIST` exactly (`businessProcesses(where: $where) { id name }`).
- `SovereigntyProcessView.tsx` created as a structural copy of `SovereigntyDataView.tsx`: `BusinessProcessListItem`/`BusinessProcessAnalysisCard`/`SovereigntyProcessViewProps` naming, `rootType: 'businessProcess'` on the per-item `GET_SOVEREIGNTY_ANALYSIS` call (unchanged query), `onEntityClick({ ..., type: 'businessprocess' })`, `data?.businessProcesses`. `VIOLATING_ELEMENT_TYPE_MAP` in the new file includes the plan-mandated `businessProcess: 'businessprocess'` completeness entry (4 keys total, vs. `SovereigntyDataView.tsx`'s pre-existing 3).
- `EntityType` union (`types.ts`) extended with `'businessprocess'` (6th member).
- `/sovereignty` page.tsx: `ViewType` extended to `'capabilities' | 'data' | 'processes'`; third `<Tab value="processes" label={t('processView')} />` added; `{activeView === 'processes' && <SovereigntyProcessView onEntityClick={setSelectedEntity} />}` conditional render added.
- i18n: `processView`, `entityTypes.businessprocess`, `noBusinessProcesses` added to both `de.json` and `en.json`'s `sovereigntyDetail` block.
- `SovereigntyEntityDialog.tsx`: `useLazyQuery(GET_BUSINESS_PROCESSES)`/`useMutation(UPDATE_BUSINESS_PROCESS)` pair added; `case 'businessprocess':` fetch branch added to the `useEffect` switch, fetching via `{ where: { id: { eq: entity.id } } }` (mirrors the `dataobject` case's where-filter shape, confirmed against `GET_BUSINESS_PROCESSES`'s actual `$where: BusinessProcessWhere` argument — not a bare-`id` argument like Application/Infrastructure); `entity.type === 'businessprocess'` added to `hasCurrentData`/`isLoading`/`isUpdating`; `handleBusinessProcessSubmit` added mirroring `handleDataObjectSubmit`'s shape, using the array-wrapped `relArr` relationship helper (matching the existing array-wrapped relationship-update convention used by `handleUpdateBusinessProcessSubmit` in `business-processes/page.tsx`); final render branch renders `<BusinessProcessForm mode="edit" data={businessProcessData} onSubmit={handleBusinessProcessSubmit} ... />` — no new form or mutation created.
- `sovereigntyMarkers.ts`: `DiagramElement.customData.elementType` union extended with `'businessProcess'` (8th member); `isMarkerRoot` extended with `|| element.customData?.elementType === 'businessProcess'`.
- **Unplanned Rule-3 fix:** `databaseSyncUtils.ts` declares its own structurally-parallel (unexported) `DiagramElement` interface with the identical `customData.elementType` union — extending only `sovereigntyMarkers.ts`'s union broke `tsc` (`TS2719: Two different types with this name exist, but they are unrelated`) at 3 call sites where arrays cross the module boundary (`hasAnyMarkerRoot`/`fetchSovereigntyMarkersForDiagram`/`syncDiagramOnOpen`). Added `'businessProcess'` to `databaseSyncUtils.ts`'s union too — one line, no logic change, required to keep the two modules structurally compatible (their existing comment convention explicitly calls out they must stay "kept in sync").

## Task Commits

Each non-checkpoint task was committed atomically:

1. **Task 1: SovereigntyProcessView + third "Processes" tab on the /sovereignty page** - `6ed24c5` (feat)
2. **Task 2: SovereigntyEntityDialog BusinessProcess branch + diagram marker eligibility** - `7a0e4a4` (feat)

## Files Created/Modified

- `client/src/graphql/sovereigntyDetail.ts` - new `GET_SOVEREIGNTY_BUSINESS_PROCESSES_LIST` query
- `client/src/components/sovereignty/SovereigntyProcessView.tsx` - new file, structural copy of `SovereigntyDataView.tsx`
- `client/src/components/sovereignty/types.ts` - `EntityType += 'businessprocess'`
- `client/src/app/[lang]/sovereignty/page.tsx` - `ViewType += 'processes'`, third Tab, conditional `SovereigntyProcessView` render
- `client/messages/de.json` / `client/messages/en.json` - `processView`/`entityTypes.businessprocess`/`noBusinessProcesses` keys
- `client/src/components/sovereignty/SovereigntyEntityDialog.tsx` - `businessprocess` fetch/submit/render branch
- `client/src/components/diagrams/utils/sovereigntyMarkers.ts` - `DiagramElement.customData.elementType` union + `isMarkerRoot` allow-list extended
- `client/src/components/diagrams/utils/databaseSyncUtils.ts` - parallel `DiagramElement.customData.elementType` union extended (Rule 3 fix, one line)

## Decisions Made

- The `businessProcess: 'businessprocess'` entry in the new file's `VIOLATING_ELEMENT_TYPE_MAP` was included exactly as the plan specified (trivial completeness fix for a BusinessProcess's own YELLOW self-violation finding-row chip; the entity-name chip already provides an equivalent working click-to-edit path, so this was non-blocking polish, not a functional gap).
- `handleBusinessProcessSubmit`'s relationship fields (`owners`, `parentProcess`, `supportsCapabilities`, `supportedByApplications`, `partOfArchitectures`, `depictedInDiagrams`) use the array-wrapped `relArr` helper, matching both `handleDataObjectSubmit`'s shape in this same dialog file and `business-processes/page.tsx`'s existing `handleUpdateBusinessProcessSubmit` disconnect/connect pattern for `UPDATE_BUSINESS_PROCESS` — confirmed by reading that page's mutation-input builder before writing the handler.
- `GET_BUSINESS_PROCESSES`'s single-entity fetch uses `{ where: { id: { eq: entity.id } } }` (confirmed from the query's actual `$where: BusinessProcessWhere` signature), matching the `dataobject` case's shape rather than the bare-`id`-argument shape used by `application`/`infrastructure`/`aicomponent`/`capability`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `databaseSyncUtils.ts`'s parallel `DiagramElement` type needed the same union extension**

- **Found during:** Task 2, `yarn tsc --noEmit` verify step
- **Issue:** `sovereigntyMarkers.ts` and `databaseSyncUtils.ts` each declare their own (unexported, structurally-identical) `DiagramElement` interface. Adding `'businessProcess'` to only `sovereigntyMarkers.ts`'s `customData.elementType` union caused `tsc` errors (`TS2719`) at 3 call sites in `databaseSyncUtils.ts` where a `DiagramElement[]` value crosses into a `sovereigntyMarkers.ts` function signature — TypeScript treats the two same-named-but-differently-declared interfaces as incompatible once their structural shapes diverge.
- **Fix:** Added `'businessProcess'` to `databaseSyncUtils.ts`'s own `DiagramElement.customData.elementType` union (one line), restoring structural equivalence. No behavior change — this file was not in the plan's `<files>` list, but the plan's own read_first note on `sovereigntyMarkers.ts` explicitly documents these two files' `DiagramElement` types as "kept in sync."
- **Files modified:** `client/src/components/diagrams/utils/databaseSyncUtils.ts`
- **Commit:** `7a0e4a4`

Otherwise: plan executed exactly as written.

## Issues Encountered

- The working tree already contained pre-existing, unrelated uncommitted modifications to several files outside this plan's scope (e.g. a formatting-only reflow of a `syncSovereigntyMarkers(...)` call in `databaseSyncUtils.ts`, and unstaged edits to `client/src/graphql/sovereigntyMarkers.ts`, `SovereigntyCapabilityView.tsx`, `DiagramEditor.tsx`, `DiagramHandlers.ts`, etc.) that were present in the working directory before this plan started executing. These were deliberately left untouched and unstaged — `git add -p` was used on `databaseSyncUtils.ts` to stage only the one line this plan's Rule 3 fix required, leaving the pre-existing unrelated formatting hunk uncommitted. No file outside this plan's declared `<files>` list (plus the one Rule-3 addition) was modified.

## User Setup Required

None — no external service configuration required.

## Test Results

- `cd client && yarn tsc --noEmit` — clean after both Task 1 and Task 2 (Task 2 required the `databaseSyncUtils.ts` Rule-3 fix before it passed).
- No test commands were specified by the plan beyond `yarn tsc --noEmit`; no client-side test suite run was requested by 04-03-PLAN.md.

## Manual-Verification Checkpoint (Task 3) — APPROVED

Task 3 (`type="checkpoint:human-verify"`, `gate="blocking"`) required a live browser session against real data. It was intentionally not attempted during automated execution — out of scope for a code-execution agent — and remained open until this follow-up session. Before verification, the `server`/`client` Docker containers were rebuilt and recreated (both are build-only images with no source bind mount, so the previously running containers predated this phase's code). Verification steps required (from the plan):

1. With `featureFlags.Sovereignty` enabled for the test company, open `/sovereignty` and confirm a "Processes" tab appears alongside "Capabilities"/"Data". — **Confirmed by user.**
2. Click into the Processes tab: confirm at least one BusinessProcess with a configured `sovereigntyReq*` value and a supporting Application renders a self/downstream StatusChip pair and (if non-compliant) a findings panel. — Covered by the user's blanket approval; not individually called out.
3. Click a finding's violating-element chip or the BusinessProcess's own name chip — confirm the entity dialog opens with the correct BusinessProcess data pre-filled, and a save round-trips via `UPDATE_BUSINESS_PROCESS` without error. — **Confirmed by user** ("chip opens the dialog").
4. Open a diagram containing at least one BusinessProcess element; force a resync (Ctrl+R or reload); confirm the BusinessProcess element gets an inner fill ellipse and outer ring ellipse rendered, matching a BusinessCapability element's marker treatment on the same canvas. — Covered by the user's blanket approval; not individually called out.
5. Confirm a BusinessProcess with a `parentProcess` whose required level is stricter than its own renders a YELLOW self-fill (not GREY) on both the diagram marker and the `/sovereignty` Processes tab's StatusChip, for the exact same BusinessProcess. — Covered by the user's blanket approval; not individually called out.

**Resume signal received:** "process view is there. chip opens the dialog. approved" (2026-08-10).

## Next Phase Readiness

- All client-side wiring for BusinessProcess sovereignty surfaces (list/detail view, entity-edit dialog, diagram marker eligibility) is in place and `tsc`-clean.
- Zero server-side files touched by this plan — confirmed by `git diff --cached --stat` on both task commits (`6ed24c5`, `7a0e4a4`), both scoped entirely to `client/`.
- No BusinessCapability↔BusinessProcess chain-nesting UI was introduced (D-03) and no Supplier UI was introduced (D-05) — confirmed by manual review of all changed files.
- Task 3's manual-verification checkpoint is approved (see above). Phase 4 is complete.

---

_Phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type_
_Completed: 2026-08-10_

## Self-Check: PASSED

All 8 created/modified files verified present on disk with expected content. Both task commits (`6ed24c5`, `7a0e4a4`) verified present in `git log --oneline --all`.
