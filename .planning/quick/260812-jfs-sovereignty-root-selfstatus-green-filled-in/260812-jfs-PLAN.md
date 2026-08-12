---
quick_id: 260812-jfs
status: complete
---

# Quick Task: Root BusinessCapability/BusinessProcess ring green once filled in

## Description

In the sovereignty diagram markers, a BusinessCapability/BusinessProcess with
no parent at all (a true hierarchy root) always resolved `selfStatus` to
GREY, forever — even once its own required sovereignty levels were fully
filled in. Elsewhere in the app, grey means "not filled in yet", so a fully
configured hierarchy root looked permanently unassessed.

## Change

A true hierarchy root (no parent to compare against) is internally
consistent by definition — nothing to contradict. `analyzeBusinessCapability`
and `analyzeBusinessProcess` now resolve `selfStatus` (and the
`comparedCapabilityIds` markers.ts derives its own GREEN/GREY resolution
from) to GREEN once the root's own required levels are filled in
(`hasAnyRequirement`), GREY only while genuinely nothing is filled in. RED/
YELLOW remain impossible for a parent-less root (no parent, nothing to
contradict).

## Files touched

- `server/src/sovereignty/evaluator.ts` — `hasAnyRequirement` helper,
  `rootIsFilledIn`/`rootHasRealComparison` in both analyzer functions.
- `server/src/sovereignty/markers.ts` / `types.ts`, `server/src/graphql/schema.graphql` — doc comments updated to match.
- `server/src/sovereignty/__tests__/{evaluator,markers}.test.ts`, `fixtures.ts` —
  updated expectations for the revised rule; added `rootNoParentUnfilledFixture`
  / `businessProcessNoParentUnfilledFixture` to keep the genuine
  "no parent, nothing filled in" GREY case covered.
- `eam-konzept.md` — added a short "Ausnahme Hierarchie-Wurzel" note to §3.

## Verification

`yarn jest src/sovereignty` (server package): 66/66 passing, including 4 new
regression tests for the revised rule. `yarn tsc --noEmit`: no errors.
