---
quick_id: 260812-jfs
status: complete
---

# Summary: Root BusinessCapability/BusinessProcess ring green once filled in

Implemented directly (no separate planner/executor subagent hop — the fix
and its full test ripple were small enough to do inline and verify with the
existing sovereignty test suite).

## What changed

`analyzeBusinessCapability`/`analyzeBusinessProcess` in
`server/src/sovereignty/evaluator.ts`: a true hierarchy root (no parent at
all, `parentRequiredLevels: []`) now resolves `selfStatus` GREEN as soon as
its own required levels are filled in (`hasAnyRequirement`), instead of
staying GREY forever. `comparedCapabilityIds` (the same signal
`markers.ts::projectMarkers` independently derives its diagram-marker
GREEN/GREY resolution from) was updated identically, so the `/sovereignty`
detail page and the diagram ring never disagree. RED/YELLOW remain
impossible for a parent-less root (nothing to contradict without a parent).

DataObject was left untouched (out of scope — no parent concept in its
model at all, still hardcoded GREY per the original eam-konzept.md "innen
neutral" design).

## Test changes

- `redChainFixture`/`greenChainFixture` (BC) and
  `businessProcessRedFixture`/`GreyFixture`/`GreenFixture` (BP) all have a
  non-null required level and no parent — their expected `selfStatus`
  flipped from GREY to GREEN in `evaluator.test.ts`/`markers.test.ts`.
- Added `rootNoParentUnfilledFixture` / `businessProcessNoParentUnfilledFixture`
  (no parent, required all null) to `fixtures.ts` to keep a genuine
  "no parent, nothing filled in" GREY regression test in place.
- Updated stale doc comments in `fixtures.ts`/`markers.ts`/`types.ts`/
  `schema.graphql` that described the old "root always GREY" invariant.
- Added a short "Ausnahme Hierarchie-Wurzel" clarification to
  `eam-konzept.md` §3, since the worked example there previously implied a
  BusinessCapability's core marker never turns green.

## Verification

- `yarn jest src/sovereignty --no-coverage` (server): 5 suites / 66 tests
  passing (4 new).
- `yarn tsc --noEmit` (server): no errors.
- Not manually verified in the running diagram UI (client dev server not
  started this session) — the fix is server-side evaluation logic consumed
  unchanged by the existing client marker-rendering code
  (`client/src/components/diagrams/utils/sovereigntyMarkers.ts` colors
  whatever `selfStatus`/`downstreamStatus` the server returns), so no client
  changes were needed.

## Status

complete
