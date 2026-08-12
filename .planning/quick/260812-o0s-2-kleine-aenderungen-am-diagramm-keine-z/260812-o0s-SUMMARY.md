---
phase: quick-260812-o0s
plan: 01
subsystem: diagrams
tags: [excalidraw, diagram-editor, infrastructure, text-normalization]

provides:
  - "detectNewElements normalizes new-element text (no embedded newlines/extra whitespace saved to DB)"
  - "wrapTextForExcalidraw no longer manually inserts line breaks into any diagram label"
  - "getInfrastructureDisplayName shared helper prefixes Infrastructure element labels with their Infrastructure Type"
  - "Library drag-in, canvas-creation-from-template, and DB-name sync (import + open) all apply the Infrastructure Type prefix consistently"
affects: [diagrams, infrastructure]

tech-stack:
  added: []
  patterns:
    - "Single shared display-name helper (getInfrastructureDisplayName) reused across creation and sync call sites instead of duplicated prefix logic"

key-files:
  created: []
  modified:
    - client/src/components/diagrams/utils/newElementsUtils.ts
    - client/src/components/diagrams/utils/architectureElements.ts
    - client/src/components/diagrams/utils/databaseSyncUtils.ts

key-decisions:
  - "wrapTextForExcalidraw kept its full 4-arg signature (with unused params prefixed _) rather than being removed, since 3 call sites still depend on its return value/signature shape."
  - "originalDatabaseName in databaseSyncUtils.ts intentionally continues storing the raw, unprefixed name — the Infrastructure Type prefix is a display-only concern and must never be written back to the DB name field."

requirements-completed:
  - DIAG-NOWRAP-01
  - DIAG-INFRA-PREFIX-01

duration: 15min
completed: 2026-08-12
status: complete
---

# Quick Task 260812-o0s: Diagram no-wrap + Infrastructure Type prefix Summary

**Removed the diagram editor's custom line-wrap logic and added a single shared `getInfrastructureDisplayName()` helper that prefixes every Infrastructure element's canvas label with its Infrastructure Type, applied consistently across creation and DB-sync paths.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3/3 completed
- **Files modified:** 3

## Accomplishments

- `detectNewElements` (newElementsUtils.ts) now builds `trimmedText` via `normalizeText()` instead of `.trim()`, so a newly created element's saved database `name` never contains an embedded newline or extra internal whitespace.
- `wrapTextForExcalidraw` (architectureElements.ts) no longer splits text into multiple `\n`-joined lines — it simply trims and returns the text as-is, across all 3 of its call sites (library drag-in, canvas creation, rename-sync). The now-dead `measureTextWidth`/`createMeasurementCanvas` helpers were removed.
- New exported `getInfrastructureDisplayName()` in architectureElements.ts computes `"${InfrastructureTypeLabel} - ${name}"` for `elementType === 'infrastructure'` elements (bare name otherwise), and is used by both `createLibraryItemFromDatabaseElement` and `createCanvasElementsFromTemplate`.
- `databaseSyncUtils.ts` imports and reuses the same helper in both `validateAndSyncElementsForImport` and `syncDiagramOnOpenSimple`, applying the prefix to `elementName`/`lastSyncedName`/the displayed canvas text on import and on-open sync, while `originalDatabaseName` keeps storing the raw unprefixed name.

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize new-element text before it reaches the create mutation (DIAG-NOWRAP-01)** - `296b24c` (fix)
2. **Task 2: Disable custom line-wrapping and add the Infrastructure Type prefix helper (DIAG-NOWRAP-01, DIAG-INFRA-PREFIX-01)** - `df68f56` (fix)
3. **Task 3: Apply the Infrastructure Type prefix during DB-name sync (DIAG-INFRA-PREFIX-01)** - `10030a3` (fix)

_Docs artifacts (this SUMMARY, STATE.md) are committed separately by the orchestrator, not part of these code commits._

## Files Created/Modified

- `client/src/components/diagrams/utils/newElementsUtils.ts` - `detectNewElements` uses `normalizeText()` instead of `.trim()` for `trimmedText`
- `client/src/components/diagrams/utils/architectureElements.ts` - `wrapTextForExcalidraw` no longer wraps text into multiple lines; removed dead `measureTextWidth`/`createMeasurementCanvas`; added exported `getInfrastructureDisplayName()`; applied in `createLibraryItemFromDatabaseElement` and `createCanvasElementsFromTemplate`
- `client/src/components/diagrams/utils/databaseSyncUtils.ts` - imports and applies `getInfrastructureDisplayName()` in `validateAndSyncElementsForImport` and `syncDiagramOnOpenSimple`; `originalDatabaseName` unchanged (still raw)

## Decisions Made

- Kept `wrapTextForExcalidraw`'s full 4-parameter signature (with unused params prefixed `_maxWidth`/`_fontSize`/`_fontFamily`) rather than changing its call sites, since 3 call sites pass all 4 args and rely on downstream height/position math that already handles single-line (no `\n`) strings correctly.
- `originalDatabaseName` deliberately continues to store the raw, unprefixed database name in both sync functions — this preserves the hyphen-artifact-preservation logic (`prepareTextForDatabase`) and ensures the Infrastructure Type prefix is never written back into the entity's actual database `name` field (per plan's threat model T-quick260812o0s-02 mitigation).

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Task 1 `<verify>`: passed (import + `normalizeText(text)` present, no `text.trim()` remains for `trimmedText`).
- Task 2 `<verify>`: passed (`getInfrastructureDisplayName` exported, `referenceName,` used at both call sites, no `lines.join`/`measureTextWidth` remain, `yarn type-check` exit 0).
- Task 3 `<verify>`: passed (`getInfrastructureDisplayName` imported and used in both functions, `originalDatabaseName` still raw, `yarn type-check` exit 0).
- Full-plan `<verification>`: `yarn type-check` exit 0; `yarn lint --quiet` on all 3 touched files exit 0.
- Manual smoke check (drag-in label prefix / multi-line typed text persisting without `\n`) was not performed — requires a running stack and is called out in the plan as non-automatable.

## Self-Check: PASSED

- FOUND: client/src/components/diagrams/utils/newElementsUtils.ts
- FOUND: client/src/components/diagrams/utils/architectureElements.ts
- FOUND: client/src/components/diagrams/utils/databaseSyncUtils.ts
- FOUND commit: 296b24c
- FOUND commit: df68f56
- FOUND commit: 10030a3
