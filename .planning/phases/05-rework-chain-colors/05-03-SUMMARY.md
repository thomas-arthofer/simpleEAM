---
phase: 05-rework-chain-colors
plan: 03
status: complete
executed_at: 2026-09-01
files_modified:
  - client/messages/de.json
  - client/messages/en.json
  - client/src/components/sovereignty/SovereigntyCapabilityView.tsx
  - client/src/components/sovereignty/SovereigntyDataView.tsx
  - client/src/components/sovereignty/SovereigntyProcessView.tsx
verification: yarn build clean; DE/EN key parity + all new keys present
---

# Summary — Plan 05-03 (Client polish)

Text-only polish for the Phase 5 chain-premise semantics. The three
sovereignty detail-view renderers now dispatch the finding-row copy on
`finding.status`, and both locale files carry the new per-status keys plus
the updated `greyEmptyBody` copy.

## What landed

### 1. New i18n keys (DE + EN)

- `sovereigntyDetail.findingRowYellow` — "1-step deviation" copy.
- `sovereigntyDetail.findingRowRed` — "deviation of 2 or more steps" copy.
- `sovereigntyDetail.findingRowGrey` — "achieved value unknown (data gap)" copy.
- `sovereigntyDetail.greyEmptyBody` — replaced pre-Phase-5 copy with the
  D-05 semantics: "Keine Daten vorhanden und kein Verstoß festgestellt." /
  "No data available and no violation detected."

The pre-existing `findingRow` key was intentionally kept (unchanged copy)
as a safety-net fallback for any future `SovereigntyStatus` value that
falls outside YELLOW/RED/GREY. All new keys use the same `{required}` /
`{actual}` placeholders as `findingRow` so the render sites can reuse the
same argument bag.

### 2. Dispatched finding-row rendering in three view components

`SovereigntyCapabilityView.tsx`, `SovereigntyDataView.tsx`, and
`SovereigntyProcessView.tsx` each replaced the single
`t('findingRow', ...)` call with a nested-ternary dispatch on
`finding.status` selecting between `findingRowYellow` / `findingRowRed` /
`findingRowGrey` / `findingRow` (fallback). No structural JSX change; no
new component, hook, or GraphQL query.

## Verification

| Check                                                                        | Result       |
| ---------------------------------------------------------------------------- | ------------ |
| `cd client && yarn build`                                                    | exit 0       |
| DE + EN carry `findingRowYellow`, `findingRowRed`, `findingRowGrey`          | 4/4 present  |
| DE + EN `greyEmptyBody` copy reflects "no data / no violation"               | present      |
| `sovereigntyDetail` key set identical between DE and EN                      | parity OK    |
| Each view file references all 3 new keys                                     | 3/3 files    |

## Not done (out of scope)

- Server work — landed in Plans 05-01 and 05-02.
- Marker overlay changes — Plan B rewrote `projectMarkers`; this plan touches
  only detail-view text.
- No GraphQL query, mutation, or codegen output touched.
