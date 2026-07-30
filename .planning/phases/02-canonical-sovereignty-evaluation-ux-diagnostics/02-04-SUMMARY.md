---
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
plan: 04
subsystem: api
tags: [neo4j, graphql, temporal, sovereignty, zod, jest, ts-jest]

# Dependency graph
requires:
  - phase: 02-canonical-sovereignty-evaluation-ux-diagnostics-01
    provides: "server/src/sovereignty/{types,evaluator,repository}.ts canonical evaluator, loadFullSupportChain, analyzeBusinessCapability/analyzeDataObject"
  - phase: 02-canonical-sovereignty-evaluation-ux-diagnostics-02
    provides: "server/src/sovereignty/validation.ts shared arg-validation pattern, JWT company-scoping check pattern used by sovereigntyMarkers/sovereigntyAnalysis"
provides:
  - "server/src/sovereignty/companyRollup.ts — analyzeCompanyRollup(session, companyId): batches analyzeBusinessCapability/analyzeDataObject across every BusinessCapability/DataObject a company owns, aggregating via Math.max(required)/Math.min(achieved) with GREY mapped to NONE's score (not excluded)"
  - "Query.sovereigntyCompanyRollup — company-scoped, JWT-validated GraphQL query returning expectedSovereigntyScore/achievedSovereigntyScore/sovereigntyGap/sovereigntyScorePercent"
  - "ai-server/temporal/sovereignty/activities.ts computeSovereigntyScores delegates to sovereigntyCompanyRollup via graphqlRequest — retires the standalone MATURITY_SCORE-averaging formula"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Company-level rollup derives strictly from the canonical evaluator's Finding[] output (analyzeBusinessCapability/analyzeDataObject), never a parallel tree-walk or averaging formula — SOV-05's 'one evaluator, every call site' now covers the Temporal path"
    - "GREY findings (status === 'GREY') are mapped to MATURITY_SCORE.NONE (1) and pushed into the achieved-scores array rather than filtered out — an entirely-ungraded chain pulls the company rollup's achieved score down instead of being invisible"
    - "Temporal activity computeSovereigntyScores is now a thin GraphQL delegation (graphqlRequest against sovereigntyCompanyRollup) instead of owning its own scoring logic — mirrors the existing graphqlRequest usage pattern already used elsewhere in ai-server"

key-files:
  created:
    - server/src/sovereignty/companyRollup.ts
    - server/src/sovereignty/__tests__/companyRollup.test.ts
  modified:
    - server/src/graphql/schema.graphql
    - server/src/sovereignty/graphql/resolvers.ts
    - server/src/sovereignty/validation.ts
    - ai-server/temporal/sovereignty/activities.ts
    - ai-server/temporal/sovereignty/workflow.ts

key-decisions:
  - "analyzeCompanyRollup derives required/achieved scores from the canonical evaluator's Finding[] (via analyzeBusinessCapability/analyzeDataObject), not from a separate chain-walk — this satisfies SOV-05 literally (every call site invokes the same evaluator functions) and avoids maintaining a second scoring implementation."
  - "GREY findings map to MATURITY_SCORE.NONE (1) and are pushed into achievedScores, matching the plan's must_haves truth that a fully-GREY chain must count toward (and lower) the rollup instead of being dropped before Math.min."
  - "sovereigntyCompanyRollupArgsSchema added to validation.ts (a file not explicitly listed in the plan's files_modified front-matter) to keep the same zod-boundary-before-JWT-check pattern used by sovereigntyAnalysis/sovereigntyMarkers — documented here as a minor Rule 2 addition (missing input validation would otherwise be a correctness/security gap on the new resolver)."
  - "ai-server/temporal/sovereignty/activities.ts: fetchAllPages/SOVEREIGNTY_BATCH_SIZE were removed entirely (not just MATURITY_SCORE/REQ_DIMS/ACH_DIMS/the two fetch functions) because grep confirmed they were unused anywhere else in the file after the entity-fetch functions were deleted — leaving them would be dead code with no other caller."

requirements-completed: [SOV-05]

status: complete

metrics:
  duration: "~1 session (continuation from prior context)"
  tasks-completed: 2
  tasks-total: 2
  files-created: 2
  files-modified: 5

coverage:
  - id: D1
    description: "A company with 2 BusinessCapabilities (one with a RED finding) and 1 entirely-GREY DataObject includes the GREY chain's contribution in achievedSovereigntyScore rather than excluding it"
    requirement: SOV-05
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/companyRollup.test.ts#counts an entirely-GREY DataObject chain toward achievedSovereigntyScore instead of excluding it"
        status: pass
    human_judgment: false
  - id: D2
    description: "expectedSovereigntyScore/achievedSovereigntyScore/sovereigntyGap/sovereigntyScorePercent are all null when the company owns zero graded BusinessCapabilities/DataObjects"
    requirement: SOV-05
    verification:
      - kind: unit
        ref: "server/src/sovereignty/__tests__/companyRollup.test.ts#returns all-null scores when the company owns zero graded BusinessCapabilities/DataObjects"
        status: pass
    human_judgment: false
  - id: D3
    description: "ai-server/temporal/sovereignty/activities.ts contains no MATURITY_SCORE/REQ_DIMS/ACH_DIMS/fetchSovereigntyReqEntities/fetchSovereigntyAchEntities identifiers; computeSovereigntyScores delegates to sovereigntyCompanyRollup via graphqlRequest"
    requirement: SOV-05
    verification:
      - kind: unit
        ref: "grep confirms zero remaining code references to the retired identifiers (one prose mention in a doc comment describing what was retired); cd ai-server && yarn tsc --noEmit passes"
        status: pass
    human_judgment: false
  - id: D4
    description: "sovereigntyScoreWorkflow still transitions CALCULATING → IDLE/ERROR correctly with the rewired single-call computeSovereigntyScores"
    requirement: SOV-05
    verification:
      - kind: manual
        ref: "plan's <human-check>: trigger the sovereigntyScoreWorkflow against a live Temporal worker + seeded company and confirm the status transition and score values"
        status: not-run
    human_judgment: true

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - missing critical functionality] Added `sovereigntyCompanyRollupArgsSchema` to `validation.ts`**
- **Found during:** Task 1
- **Issue:** `validation.ts` was not in the plan's `files_modified` list, but the new `sovereigntyCompanyRollup` resolver needed the same zod-validate-before-JWT-check boundary (T-02-05 pattern) already applied to `sovereigntyAnalysis`/`sovereigntyMarkers`. Omitting it would leave the new query without the input-validation boundary the rest of the module enforces.
- **Fix:** Added `sovereigntyCompanyRollupArgsSchema = z.object({ companyId: z.string().trim().min(1) })` and wired it into the resolver.
- **Files modified:** `server/src/sovereignty/validation.ts`, `server/src/sovereignty/graphql/resolvers.ts`
- **Commit:** 8cc7fcc

**2. [Rule 1 - dead code cleanup] Removed `fetchAllPages`/`SOVEREIGNTY_BATCH_SIZE` from `activities.ts`**
- **Found during:** Task 2
- **Issue:** The plan's action text names `MATURITY_SCORE`/`REQ_DIMS`/`ACH_DIMS`/`fetchSovereigntyReqEntities`/`fetchSovereigntyAchEntities` explicitly, but `fetchAllPages` and `SOVEREIGNTY_BATCH_SIZE` were only used by the two deleted fetch functions. Leaving them in would be unreachable dead code.
- **Fix:** Deleted both alongside the explicitly-named identifiers; confirmed via grep that nothing else in `ai-server/` references them.
- **Files modified:** `ai-server/temporal/sovereignty/activities.ts`
- **Commit:** c4df817

## Outstanding / Deferred

- The plan's `<human-check>` verify item ("Trigger the sovereignty Temporal workflow for a seeded company... confirm CALCULATING → IDLE and score values") was **not run** — it requires a live Temporal worker, a running Neo4j instance, and a seeded company, none of which are part of this execution session's automated environment. All automated verification (`yarn jest --testPathPattern=sovereignty/__tests__/companyRollup`, `cd ai-server && yarn tsc --noEmit`) passed. Recorded in `.planning/WINDOWS.md` as an unrun-verify item.

## Self-Check: PASSED

- FOUND: server/src/sovereignty/companyRollup.ts
- FOUND: server/src/sovereignty/__tests__/companyRollup.test.ts
- FOUND: server/src/graphql/schema.graphql (modified)
- FOUND: server/src/sovereignty/graphql/resolvers.ts (modified)
- FOUND: server/src/sovereignty/validation.ts (modified)
- FOUND: ai-server/temporal/sovereignty/activities.ts (modified)
- FOUND: ai-server/temporal/sovereignty/workflow.ts (modified)
- FOUND commit: 8cc7fcc
- FOUND commit: c4df817
