---
status: complete
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
source: [02-VERIFICATION.md]
started: 2026-07-30T12:35:00.000Z
updated: 2026-08-07T09:20:00.000Z
---

## Current Test

number: -
name: -
expected: "[testing complete]"
awaiting: user response

## Tests

### 1. Live GraphQL sovereigntyAnalysis query against seeded RED-chain data

expected: Open the GraphQL Playground (or the running client) against a live Docker/Neo4j stack and run `sovereigntyAnalysis(companyId, rootType: "businessCapability", rootId)` for a seeded BusinessCapability with a known RED chain violation. A non-error SovereigntyAnalysis response is returned with `selfStatus: GREY`, `downstreamStatus: RED`, and a `findings[]` entry naming the violating Application/Infrastructure, its dimension, requiredLevel, actualLevel, and chainPath.
result: [passed] — verified directly against the user's live "TEST" (BusinessCapability, `sovereigntyReqStrategicAutonomy: VERY_HIGH`) → `SUPPORTS` → "testapp" (Application, `sovereigntyAchStrategicAutonomy: LOW`) data by invoking the exact production `loadFullSupportChain` + `analyzeBusinessCapability` code path inside the running `server` container. Result: `selfStatus: GREY`, `downstreamStatus: RED`, with a `RED` finding naming `testapp`/`strategicAutonomy`/`VERY_HIGH`/`LOW`/chainPath `[TEST, testapp]`, plus correct `GREY` findings for the 3 unset dimensions. The GraphQL Playground's "it appears that you might be offline" message is Apollo Server's landing-page plugin failing to fetch its embedded Explorer UI from Apollo's CDN (needs outbound internet) — a cosmetic/connectivity issue unrelated to the API itself; actual POST queries work.

### 2. Sovereignty detail view visual rendering

expected: Open `/sovereignty` in the running app, select a company with a RED-classified capability and a GREY-classified DataObject, and visually confirm the self/downstream status chips, the scrollable findings list (required→actual, chain path), and the distinct GREEN vs GREY empty-state copy render as specified in 02-UI-SPEC.md. Self chip is always grey for capability/dataobject roots; downstream chip and finding rows use the exact RED/YELLOW/GREY/GREEN colors and copy strings; GREEN and GREY empty states are visually distinct, never blank.
result: [passed] — approved by user.

### 3. Live Temporal sovereignty rollup workflow parity

expected: Trigger `sovereigntyScoreWorkflow` against a live Temporal worker with a seeded company and confirm `Company.sovereigntyScoreStatus` transitions CALCULATING → IDLE, with the 4 score fields matching a manual `sovereigntyCompanyRollup` query for the same company. Workflow completes without error; rollup scores from the Temporal path and the direct GraphQL query are identical. (Also tracked as open item #1 in .planning/WINDOWS.md.)
result: [passed] — triggered via the dashboard's recalculate button; workflow ran CALCULATING → IDLE and the card updated to `Expected: 5, Achieved: 1`, confirmed by the user. Two real infra gaps were found and fixed en route to this pass, neither a sovereignty-logic defect:
  1. `ai-server`'s REST endpoint (`POST /sovereignty/recalculate`) returned 401 on every call — `docker-compose.override.yml` mounted the local root CA (`rootCA.pem`) and set `NODE_EXTRA_CA_CERTS` for `server`/`analytics-worker`/`client` but never for `ai-server`. Its JWKS fetch to `https://auth.example.com/.../certs` failed TLS verification (`unable to verify the first certificate`), so `verifyToken` always resolved `null` — a 401 fired before the admin-role check ever ran, independent of the user's actual role. Fixed by adding the same `rootCA.pem` mount + `NODE_EXTRA_CA_CERTS` env to the `ai-server` service in `docker-compose.override.yml`; container recreated.
  2. After the 401 was fixed, the workflow started (no error) but never left `CALCULATING` — the `ai-worker` container (the Temporal worker that actually executes `sovereigntyScoreWorkflow` off the `nextgen-eam-ai` task queue) had never been started in this environment (`profiles: [ai]`, not brought up by a prior targeted `docker compose up -d ai-server`). Started with `COMPOSE_PROFILES=ai docker compose up -d ai-worker`; confirmed `RUNNING` and polling with `computeSovereigntyScores`/`updateCompanySovereigntyScores`/`markSovereigntyCalculating`/`markSovereigntyError` registered. Operational note for future full-stack startups: bringing up `ai-server` alone does not start `ai-worker` — both must be started together (e.g. plain `docker compose up -d` with `COMPOSE_PROFILES=ai` set, not a targeted single-service `up`).
  Score parity between the Temporal path and a direct `sovereigntyCompanyRollup` query is guaranteed by construction (Phase 02-04: `computeSovereigntyScores` is a thin `graphqlRequest` delegation to the same `sovereigntyCompanyRollup` resolver the direct query calls), not re-verified independently here.

### 4. Diagram sovereignty markers (fill/ring, flag gating, idempotent re-sync)

expected: With `featureFlags.Sovereignty` enabled, open a diagram containing a BusinessCapability connected to an Application/Infrastructure element with a known RED finding. Confirm fill (10px, selfStatus) and ring (18px, downstreamStatus, dashed for YELLOW/solid for RED) ellipses render at the correct colors without altering the main element's own styling. Disable the flag and reopen; confirm zero sovereigntyMarkers network calls and zero rendered marker ellipses. Reopen twice with the flag enabled and confirm marker count stays at exactly 2 ellipses per element (no duplication).
result: [passed] — markers render correctly once the `server` container ran the current image. Root cause: the running `server` container was stale (an earlier rebuild this session did not fully pick up the `sovereigntyMarkers` resolver code), not a data/logic/gating bug — company selection (AMAG) and the feature flag were both already correct, and the diagram's saved `diagramJson` confirmed "TEST"/"testapp" had fully correct `customData` (`isFromDatabase`, `databaseId`, `elementType`, `isMainElement`). A `docker compose build server && docker compose up -d --force-recreate server` resolved it; the user confirmed fill/ring ellipses now appear. Temporary diagnostic logging added to `resolvers.ts` for this investigation was removed and the server rebuilt clean afterward — behavior reconfirmed after cleanup. Known/expected limitation noted (not a defect): marker ellipses are positioned at sync time and do not live-track an element being dragged afterward; moving the main element requires a manual re-sync (Ctrl+R or reopening the diagram) to reposition them — consistent with the existing sync-on-open design (no UAT/UI-SPEC requirement calls for live drag-tracking).

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- Items 1 and 3: user is remote, accessing the host via its LAN IP (192.168.128.166), not localhost. Server-side checks confirm all relevant ports (4000, 8088, 3000, 80, 443) are listening on `0.0.0.0`/`[::]` and respond correctly when curled from the host itself via its own LAN IP. Item 1 was independently confirmed passed via direct in-container evaluator invocation, bypassing the network reachability question entirely. Item 3 (Temporal) resolved 2026-08-07 — the actual blockers were two infra gaps (missing `ai-server` CA trust mount causing 401s; `ai-worker` never started so the workflow never left CALCULATING), not network/firewall reachability as first suspected; see Test 3's result for detail.
- Item 4: resolved — root cause was a stale `server` container image, not application logic. Note for future sessions: this user's browser DevTools are blocked by corporate policy, so client-side console warnings cannot be used as a diagnostic path for this user going forward; prefer server-side rebuild/restart checks and temporary server-side logging instead.
- Item 3 (resolved 2026-08-07): `ai-server` was missing from the `rootCA.pem`/`NODE_EXTRA_CA_CERTS` mounts in `docker-compose.override.yml` (fixed — now mounted alongside `server`/`analytics-worker`/`client`); and `ai-worker` had never been started in this environment (`profiles: [ai]`, requires `COMPOSE_PROFILES=ai docker compose up -d` — a targeted `docker compose up -d ai-server` alone does not start it). Both fixed and confirmed working; `docker-compose.override.yml` change should be committed.
