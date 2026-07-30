---
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
plan: 03
subsystem: ui
tags: [sovereignty, graphql, apollo-client, next-intl, material-ui, findings-ui]

# Dependency graph
requires:
  - phase: 02-canonical-sovereignty-evaluation-ux-diagnostics-01
    provides: server-side canonical `sovereigntyAnalysis` GraphQL query and evaluator (self/downstream status, findings with dimension/status/requiredLevel/actualLevel/chainPath)
provides:
  - Rewritten SovereigntyCapabilityView and SovereigntyDataView rendering canonical findings instead of inherited scores
  - New GET_SOVEREIGNTY_ANALYSIS / GET_SOVEREIGNTY_CAPABILITIES_LIST / GET_SOVEREIGNTY_DATA_OBJECTS_LIST GraphQL operations
  - Retirement of the inheritance-based sovereignty/utils.ts helper module (no remaining consumers repo-wide)
  - sovereigntyDetail translation keys for self/downstream labels, GREEN/GREY empty states, finding rows, chain context, and finding dimensions
affects: [sovereignty-ux, sovereignty-diagnostics, sovereignty-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-level query structure: a lightweight list query (id+name) enumerates roots, then one GET_SOVEREIGNTY_ANALYSIS query per root (per-card useQuery) fetches canonical findings — avoids a single oversized tree query."
    - "Server enum casing (aiComponent) translated to client EntityType casing (aicomponent) via a local VIOLATING_ELEMENT_TYPE_MAP in each view."

key-files:
  created: []
  modified:
    - client/src/graphql/sovereigntyDetail.ts
    - client/src/components/sovereignty/SovereigntyCapabilityView.tsx
    - client/src/components/sovereignty/SovereigntyDataView.tsx
    - client/messages/de.json
    - client/messages/en.json
  deleted:
    - client/src/components/sovereignty/utils.ts

key-decisions:
  - "Duplicated StatusChip/FindingsPanel/STATUS_COLORS/VIOLATING_ELEMENT_TYPE_MAP inline in both view files rather than extracting a shared component, to stay strictly within the plan's declared files_modified scope."
  - "Added GET_SOVEREIGNTY_CAPABILITIES_LIST and GET_SOVEREIGNTY_DATA_OBJECTS_LIST (id+name only) to sovereigntyDetail.ts as lightweight root-enumeration queries, separate from existing capability.ts/dataObject.ts list queries which were out of scope for this plan."
  - "Typed the `t` translation function passed into FindingsPanel as a plain `(key: string, values?) => string` callable instead of `ReturnType<typeof useTranslations>`, because the latter caused a TS2589 'excessively deep type instantiation' error when used as a prop type; cast at the call site."

requirements-completed: [SUX-01, SUX-02]

coverage:
  - id: D1
    description: "BusinessCapability sovereignty detail shows own explicit chain findings (self/downstream status + findings list) instead of an inherited/aggregated score."
    requirement: "SUX-01"
    verification:
      - kind: unit
        ref: "yarn tsc --noEmit -p tsconfig.json"
        status: pass
    human_judgment: true
    rationale: "Visual rendering of findings, colors, and empty-state copy requires a human to view the running UI against real Neo4j data; no automated UI test exists for this view."
  - id: D2
    description: "DataObject sovereignty detail mirrors the same explainable findings shape as BusinessCapability."
    requirement: "SUX-01"
    verification:
      - kind: unit
        ref: "yarn tsc --noEmit -p tsconfig.json"
        status: pass
    human_judgment: true
    rationale: "Same as D1 — requires visual verification against live data."
  - id: D3
    description: "Self vs. downstream status visually distinguished via two StatusChip components (selfStatusLabel / downstreamStatusLabel)."
    requirement: "SUX-02"
    verification:
      - kind: unit
        ref: "yarn tsc --noEmit -p tsconfig.json"
        status: pass
    human_judgment: true
    rationale: "Visual distinction requires human review of rendered chip colors/labels."
  - id: D4
    description: "GREEN/GREY empty states render exact required copy in both locales; finding rows render 'required: {value} → actual: {value}' plus chain context line."
    verification:
      - kind: unit
        ref: "grep-verified exact string match against de.json/en.json and must_haves.truths copy"
        status: pass
    human_judgment: false
  - id: D5
    description: "client/src/components/sovereignty/utils.ts deleted; no remaining repo-wide imports of its exports."
    requirement: "SUX-01"
    verification:
      - kind: unit
        ref: "test ! -f client/src/components/sovereignty/utils.ts (Task 1 verify command)"
        status: pass
      - kind: unit
        ref: "grep_search repo-wide for formatSovereigntyScore|hasAnySovereigntyReqs|hasAnySovereigntyAchs|collectAchievedDependencyTree|computeAggregatedAchievedScore|MATURITY_LEVELS"
        status: pass
    human_judgment: false
  - id: D6
    description: "Findings list is capped to a scrollable Box (maxHeight: 320, overflowY: auto), not an unbounded page-stretching list."
    verification:
      - kind: unit
        ref: "code inspection of FindingsPanel in both view files (sx maxHeight: 320, overflowY: 'auto')"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-07-30
status: complete
---

# Phase 02 Plan 03: Rewrite Sovereignty Detail Views on Canonical Findings Summary

**Both SovereigntyCapabilityView and SovereigntyDataView now query the server's canonical `sovereigntyAnalysis` field and render explainable self/downstream findings instead of a single inherited score, and the retired inheritance-based `utils.ts` helper is deleted with zero remaining consumers.**

## Performance

- **Duration:** 45min
- **Started:** 2026-07-30
- **Completed:** 2026-07-30
- **Tasks:** 3/3
- **Files modified:** 6 (4 modified, 1 deleted, 2 locale files modified)

## Accomplishments

- Replaced `GET_SOVEREIGNTY_CAPABILITY_DETAIL`/`GET_SOVEREIGNTY_DATA_DETAIL` (raw entity-tree queries) with `GET_SOVEREIGNTY_ANALYSIS` (canonical per-root findings) plus two lightweight list queries (`GET_SOVEREIGNTY_CAPABILITIES_LIST`, `GET_SOVEREIGNTY_DATA_OBJECTS_LIST`).
- Rewrote `SovereigntyCapabilityView.tsx` and `SovereigntyDataView.tsx` to render self/downstream `StatusChip`s and a scrollable `FindingsPanel` with GREEN/GREY empty states and per-finding required/actual/chain-context rows.
- Deleted `client/src/components/sovereignty/utils.ts` (the last consumer of the legacy inheritance-based score model) and confirmed no remaining repo-wide references to its exports.
- Added all required `sovereigntyDetail` translation keys (self/downstream labels, empty states, finding row, chain context, dimensions) verbatim from the UI-SPEC copywriting contract to both `de.json` and `en.json`.
- `yarn tsc --noEmit -p tsconfig.json` passes cleanly across the whole client project after the rewrite.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace canonical query, delete legacy utils.ts, add locale strings** - `a871bbb` (feat)
2. **Task 2: Rewrite SovereigntyCapabilityView.tsx on canonical findings** - `12edc57` (feat)
3. **Task 3: Rewrite SovereigntyDataView.tsx on canonical findings** - `5b3ae90` (feat)

**Plan metadata:** _(pending — recorded after this SUMMARY commit)_

## Files Created/Modified

- `client/src/graphql/sovereigntyDetail.ts` - Replaced legacy detail queries with `GET_SOVEREIGNTY_ANALYSIS`, `GET_SOVEREIGNTY_CAPABILITIES_LIST`, `GET_SOVEREIGNTY_DATA_OBJECTS_LIST`.
- `client/src/components/sovereignty/SovereigntyCapabilityView.tsx` - Full rewrite: per-capability canonical analysis cards with self/downstream chips and findings panel.
- `client/src/components/sovereignty/SovereigntyDataView.tsx` - Full rewrite mirroring the capability view for DataObject roots.
- `client/src/components/sovereignty/utils.ts` - Deleted (legacy inheritance-based score helper, fully retired).
- `client/messages/de.json` / `client/messages/en.json` - Added `sovereigntyDetail.{selfStatusLabel,downstreamStatusLabel,greenEmptyHeading,greenEmptyBody,greyEmptyHeading,greyEmptyBody,findingRow,chainContext,loadError,dimensions.*}`.

## Decisions Made

- Kept old now-unused locale keys (`expectedScore`, `achievedScore`, `gap`, `weight`, `associatedElements`, `noAssociatedElements`, `noSovereigntyData`, `entityTypes.*`) in place rather than deleting them — the plan did not require their removal and leaving them is lower risk than a broader locale-file cleanup.
- Did not attempt a live `yarn codegen` run against the running server container: the container was built prior to the 02-01/02-02 commits and GraphQL introspection is disabled under the project's `NODE_ENV=production` setting, matching the same constraint documented in 02-01-SUMMARY.md and 02-02-SUMMARY.md. Instead, query field/type names (`businessCapabilities`, `dataObjects`, `sovereigntyAnalysis`, `BusinessCapabilityWhere`, `DataObjectWhere`) were cross-checked directly against `server/src/graphql/schema.graphql`'s `type BusinessCapability`/`type DataObject`/`type Query { sovereigntyAnalysis(...) }` declarations, and full-project `yarn tsc --noEmit` was run as the primary verification gate.
- Typed the `t` prop passed into each view's `FindingsPanel` as a plain callable (`(key: string, values?: Record<string, string | number>) => string`) instead of `ReturnType<typeof useTranslations>`, which triggered a TS2589 "excessively deep type instantiation" compiler error; the actual `t` function is cast at the call site.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2589 excessively deep type instantiation from `ReturnType<typeof useTranslations>` prop type**
- **Found during:** Task 2/3 verification (`yarn tsc --noEmit`)
- **Issue:** Declaring `t: ReturnType<typeof useTranslations>` as a component prop type caused the TypeScript compiler to fail with "Type instantiation is excessively deep and possibly infinite" due to next-intl's deeply recursive `Translator`/`NamespacedMessageKeys` generic types.
- **Fix:** Changed the prop type to a simple `(key: string, values?: Record<string, string | number>) => string` signature and cast the actual `t` function to that type at the `<FindingsPanel t={...} />` call site in both view files.
- **Files modified:** `client/src/components/sovereignty/SovereigntyCapabilityView.tsx`, `client/src/components/sovereignty/SovereigntyDataView.tsx`
- **Commit:** `12edc57`, `5b3ae90` (part of each task's commit)

**2. [Rule 3 - Blocking] Installed missing client dependencies before running verification**
- **Found during:** Task 2/3 verification setup
- **Issue:** `client/node_modules` did not exist in this environment, so `yarn tsc` failed with "Couldn't find the node_modules state file."
- **Fix:** Ran `yarn install` in `client/` (yarn-only, no npm used). Install succeeded with only pre-existing peer-dependency warnings (React 19 vs. `@radix-ui/react-tabs`/Excalidraw peer ranges), unrelated to this plan's changes.
- **Files modified:** None (dependency install only, no source changes).
- **Commit:** N/A (environment setup, not a source change).

### Known Environment Limitation

Live `yarn codegen` against the running GraphQL server was not performed: the `server` container (built ~2 days prior to this session) predates the 02-01/02-02 commits that introduce `sovereigntyAnalysis`/`sovereigntyMarkers`, and the project's `.env` sets `NODE_ENV=production`, which disables introspection in `server/src/index.ts`. Rebuilding the server image and temporarily toggling introspection was considered but deferred as an unnecessarily invasive change to shared infrastructure for a client-only plan; instead, all query field/argument/type names were manually cross-checked against `server/src/graphql/schema.graphql`, and `yarn tsc --noEmit` was used as the compile-time verification gate. This mirrors the identical limitation documented in `02-01-SUMMARY.md` and `02-02-SUMMARY.md`.

## Self-Check: PASSED

- FOUND: `client/src/graphql/sovereigntyDetail.ts`
- FOUND: `client/src/components/sovereignty/SovereigntyCapabilityView.tsx`
- FOUND: `client/src/components/sovereignty/SovereigntyDataView.tsx`
- FOUND: `client/messages/de.json`
- FOUND: `client/messages/en.json`
- MISSING (expected — deleted intentionally): `client/src/components/sovereignty/utils.ts`
- FOUND commit `a871bbb` in `git log --oneline`
- FOUND commit `12edc57` in `git log --oneline`
- FOUND commit `5b3ae90` in `git log --oneline`
