---
status: resolved
trigger: 'Verschachtelte businesscases erhalten die vererbung nicht.'
created: 2026-07-31
updated: 2026-07-31
---

# Debug Session: nested-bc-sov-inheritance

## Symptoms

**Trigger (verbatim, user-supplied — treat as data):**

> Verschachtelte businesscases erhalten die vererbung nicht.
>
> BC: TEST
> This element: GREY
> Dependency chain: RED
> Strategic Autonomy
> required: VERY_HIGH → actual: LOW
> Chain: 87642e57-8aeb-4cd2-8ca5-2ac60b30c2f1 → 2eae3a8e-9df6-4444-96c2-368bc2e4886f
> Resilience / Security / Control: required: – → actual: – (same chain)
>
> BC "Wichtiger Businesscase"
> This element: GREY
> Dependency chain: GREEN
> No violations found
>
> BC "gemeinsamer max"
> This element: GREY
> Dependency chain: GREEN
> No violations found
>
> Expected: "gemeinsamer max" (parent of both "TEST" and "Wichtiger Businesscase") should be RED because one of its downlines (TEST) is RED via a low-sovereignty app.

**Diagram structure (from attached screenshot):**

```
                gemeinsamer max (parent, GREY/GREEN)
                 /                          \
          TEST (GREY/RED)         Wichtiger Businesscase (GREY/GREEN)
              |                              |
      schlechte app (LOW sov, red ring)   gute app (green ring)
```

- **Expected behavior:** Dependency-chain status must be the worst status (RED > GREY > GREEN) found anywhere across the ENTIRE descendant subtree, not just direct children. "gemeinsamer max" → "TEST" → "schlechte app" is a 2-level-deep chain and should propagate RED up to "gemeinsamer max".
- **Actual behavior:** "gemeinsamer max" shows dependency chain GREEN, ignoring the RED chain that exists two levels down through "TEST".
- **Error messages:** None — silent incorrect rollup, no exceptions/errors.
- **Timeline:** Not sure if this ever worked for 2+ level nesting.
- **Reproduction:** User confirmed — if the low-sovereignty app is connected DIRECTLY to the parent BC ("gemeinsamer max"), it correctly turns RED. The bug only manifests when the low-sovereignty app is nested behind an intermediate BusinessCapability/BusinessCase (i.e., traversal depth > 1). This strongly suggests the sovereignty chain evaluator/rollup is only considering one hop (direct children) instead of recursively traversing the full dependency graph.

## Current Focus

hypothesis: The sovereignty chain/dependency-chain evaluator (canonical sovereigntyAnalysis evaluator per PROJECT.md Phase 2 decisions) traverses only direct child relationships (depth 1) when computing a parent's "dependency chain" status/rollup, instead of recursively walking the full descendant subtree — so violations found only at depth ≥2 never propagate to ancestors beyond the immediate parent.
test: Locate the sovereignty chain traversal/rollup logic (likely in ai-server or server sovereignty evaluator, search for "sovereigntyAnalysis", "dependency chain", "chain" traversal, rollup/worst-status merge logic) and inspect whether it recurses through nested BusinessCapability/BusinessCase children or only iterates immediate relationships.
expecting: Find a traversal function that stops after one level, or that only aggregates direct `SERVICED_BY`/child edges without recursing into children's own dependency chains.
reasoning_checkpoint: null
tdd_checkpoint: null
next_action: gather initial evidence — locate and read the sovereignty chain/rollup evaluator code

## Evidence

- timestamp: 2026-07-31T00:00:00Z
  action: "Read server/src/sovereignty/evaluator.ts (analyzeSupportChain, analyzeBusinessCapability, analyzeDataObject)"
  finding: "analyzeSupportChain only iterates chain.supportingApplications/supportingAIComponents — no code path recurses into a BusinessCapability's own children/nested BusinessCapabilities at all. No `childCapabilities` concept existed anywhere in the sovereignty module."

- timestamp: 2026-07-31T00:05:00Z
  action: "Read server/src/graphql/schema.graphql BusinessCapability type"
  finding: "BusinessCapability has a real self-relationship: `parents: [BusinessCapability!]! @relationship(type: \"HAS_PARENT\", direction: OUT)` and `children: [BusinessCapability!]! @relationship(type: \"HAS_PARENT\", direction: IN)` — the UI's nested 'Business Case' hierarchy the user showed in the screenshot ('gemeinsamer max' → 'TEST' / 'Wichtiger Businesscase') is exactly this relationship. ('BusinessCase' in the UI/nav maps to the BusinessCapability entity — see client/src/app/[lang]/page.tsx businessCases nav key.)"

- timestamp: 2026-07-31T00:10:00Z
  action: "Read server/src/sovereignty/repository.ts loadBusinessCapabilitySupportChain Cypher query"
  finding: "The query was: MATCH (cap:BusinessCapability {id: $rootId})-[:OWNED_BY]->(c:Company) ... OPTIONAL MATCH (cap)<-[:SUPPORTS]-(app:Application) / (aiComponent:AIComponent) — it fetches ONLY the requirement root's own direct SUPPORTS edges. It never traverses `HAS_PARENT` to pull in a child capability's own supporting Applications/AIComponents. This is the exact single-hop behavior the user's reproduction isolated (direct app connection turns the BC RED; nesting the app behind an intermediate BC does not)."

- timestamp: 2026-07-31T00:15:00Z
  action: "Read .planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-CONTEXT.md and 02-RESEARCH.md for any decision covering BusinessCapability-to-BusinessCapability (HAS_PARENT) traversal"
  finding: "No decision (D-01..D-10) or research note addresses nested BusinessCapability/BusinessCase parent-child rollup at all — Phase 2 scoped chain traversal to Application/AIComponent/Infrastructure nesting only (D-08 explicitly excludes Supplier, but says nothing about BusinessCapability self-nesting). This is a genuine scope gap, not a regression of previously-working code — matches the user's own uncertainty ('not sure if this ever worked for 2+ level nesting')."

- timestamp: 2026-07-31T00:30:00Z
  action: "Implemented fix: added `childCapabilities: readonly BusinessCapabilityChain[]` to BusinessCapabilityChain (types.ts); repository.ts's loadBusinessCapabilitySupportChain now also `OPTIONAL MATCH (cap)<-[:HAS_PARENT]-(child:BusinessCapability)` and recursively fetches each child's own full chain (cycle-safe via existing NodeCache/inFlight memoization, extended with a `capabilities` map); evaluator.ts's analyzeBusinessCapability now recurses into childCapabilities via a new analyzeCapabilitySubtree, evaluating each child against ITS OWN requirements and re-prefixing each nested finding's chainPath with every ancestor id on the way back up (per-branch visited-set, same D-01/D-03 cycle-safety contract as the existing Infrastructure/Application walkers)."
  finding: "Added a regression fixture (nestedCapabilitySubtreeFixture) reproducing the exact reported topology (gemeinsamer max → TEST → schlechte app RED; gemeinsamer max → Wichtiger Businesscase → gute app GREEN) plus a test in evaluator.test.ts. Also had to add `childIds: []` to two existing stubbed Neo4j rows in evaluator.parity.test.ts / companyRollup.test.ts (their fixture rows didn't have the new column). Ran `yarn jest` (full server suite) and `yarn tsc --noEmit`: 22/22 tests pass, zero type errors."

- timestamp: 2026-07-31T01:00:00Z
  action: "User post-fix follow-up: reported that infrastructure hierarchy rollup already worked pre-fix — placing a good server inside a bad DataCenter correctly passes the bad status through."
  finding: "Verified in evaluator.ts: `walkInfrastructure` already recurses through `parentInfrastructure` regardless of depth and was NOT touched by this fix — it predates and is independent of the BusinessCapability change. This confirms the bug was scoped specifically to BusinessCapability-to-BusinessCapability (`HAS_PARENT`) nesting; `analyzeCapabilitySubtree`/`childCapabilities` now mirrors that same pre-existing recursive worst-status-rollup pattern. No additional gap found; fix scope confirmed sufficient, no further code change needed."

## Eliminated

- hypothesis: "Regression in a previously-working multi-level rollup"
  reason: "No test, decision doc (D-01..D-10), or code path anywhere in server/src/sovereignty ever handled BusinessCapability-to-BusinessCapability (`HAS_PARENT`) nesting for sovereignty chain traversal — Phase 2 scoped chain traversal to Application/Infrastructure/AIComponent nesting only. This was a scope gap in the original design, not a regression."

## Resolution

root_cause: The sovereignty chain evaluator/loader only ever traversed a BusinessCapability's own direct `SUPPORTS` edges (Applications/AIComponents) — `server/src/sovereignty/repository.ts`'s `loadBusinessCapabilitySupportChain` Cypher query never followed the `HAS_PARENT` self-relationship to a capability's own `children` (nested BusinessCapabilities/"Business Cases"), and `evaluator.ts`'s `analyzeBusinessCapability` had no concept of nested children to recurse into at all. So a violation that existed only inside a child/grandchild BusinessCapability's own support chain never reached an ancestor's `downstreamStatus` — only depth-1 direct app/AI-component connections were ever visible to the rollup.
fix: Added `childCapabilities` to `BusinessCapabilityChain` (types.ts); `repository.ts` now also fetches each capability's `HAS_PARENT` children recursively (cycle-safe, memoized); `evaluator.ts`'s `analyzeBusinessCapability` now recursively walks `childCapabilities` via `analyzeCapabilitySubtree`, evaluating each child against its own requirements and rolling its findings (with re-prefixed chainPath) up into every ancestor, so `downstreamStatus` reflects the worst status (RED > YELLOW > GREY > GREEN) anywhere in the entire descendant subtree, not just depth-1.
verification: "yarn jest (full server suite): 22/22 passed, including new regression test 'rolls up a violation nested 2 levels down inside a child BusinessCapability to the ancestor (D-11, nested-bc-sov-inheritance)' which reproduces the exact reported topology. yarn tsc --noEmit: zero errors. Deployed 2026-07-31 via `docker compose build server && docker compose up -d server` (image rebuilt, container recreated, /health returned 200). User-confirmed live retest of the exact reported topology ('gemeinsamer max' -> 'TEST' -> 'schlechte app') passed: parent now correctly rolls up to RED."
files_changed: server/src/sovereignty/types.ts, server/src/sovereignty/evaluator.ts, server/src/sovereignty/repository.ts, server/src/sovereignty/**tests**/fixtures.ts, server/src/sovereignty/**tests**/evaluator.test.ts, server/src/sovereignty/**tests**/evaluator.parity.test.ts, server/src/sovereignty/**tests**/companyRollup.test.ts
