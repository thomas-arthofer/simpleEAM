# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## nested-bc-sov-inheritance — nested BusinessCapability children didn't roll up into ancestor sovereignty status
- **Date:** 2026-07-31
- **Error patterns:** dependency chain GREEN when it should be RED, sovereignty rollup, nested business case, BC parent-child, silent incorrect rollup, no exceptions
- **Root cause(s):** `loadBusinessCapabilitySupportChain` (repository.ts) only fetched a BusinessCapability's own direct `SUPPORTS` edges (Applications/AIComponents) and never followed the `HAS_PARENT` self-relationship to nested child BusinessCapabilities; `analyzeBusinessCapability` (evaluator.ts) had no concept of child capabilities to recurse into, so a violation inside a child/grandchild BC's own support chain never reached an ancestor's `downstreamStatus` — only depth-1 direct connections were visible to the rollup.
- **Fix:** Added `childCapabilities` to `BusinessCapabilityChain`; `repository.ts` recursively fetches `HAS_PARENT` children (cycle-safe, memoized via existing NodeCache/inFlight); `evaluator.ts`'s `analyzeBusinessCapability` recursively walks `childCapabilities` via new `analyzeCapabilitySubtree`, evaluating each child against its own requirements and rolling findings (re-prefixed `chainPath`) up into every ancestor — worst-of-entire-subtree rollup (RED > YELLOW > GREY > GREEN), mirroring the pre-existing `walkInfrastructure`/`parentInfrastructure` recursive pattern.
- **Files changed:** server/src/sovereignty/types.ts, server/src/sovereignty/evaluator.ts, server/src/sovereignty/repository.ts, server/src/sovereignty/markers.ts, server/src/sovereignty/companyRollup.ts, server/src/sovereignty/__tests__/fixtures.ts, server/src/sovereignty/__tests__/evaluator.test.ts, server/src/sovereignty/__tests__/evaluator.parity.test.ts, server/src/sovereignty/__tests__/companyRollup.test.ts
- **Why not caught:** No gate existed for this class. Phase 2 (canonical sovereignty evaluation) scoped chain traversal decisions (D-01..D-10) to Application/Infrastructure/AIComponent nesting only — BusinessCapability-to-BusinessCapability (`HAS_PARENT`) self-nesting was never designed for, tested, or reviewed, even though the schema (`HAS_PARENT`) and UI (nested "Business Case" hierarchy) already supported creating such structures.
- **Recurrence guard:** Regression test `server/src/sovereignty/__tests__/evaluator.test.ts` — "rolls up a violation nested 2 levels down inside a child BusinessCapability to the ancestor (D-11, nested-bc-sov-inheritance)" — reproduces the exact reported topology (gemeinsamer max → TEST → schlechte app) and asserts `downstreamStatus: 'RED'` on the root. Additionally, any future root-type added to the sovereignty module with a self-referential parent/child relationship should be checked against this same worst-of-entire-subtree contract before being considered complete.
---
