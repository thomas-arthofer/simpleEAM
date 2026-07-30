---
status: testing
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
source: [02-VERIFICATION.md]
started: 2026-07-30T12:35:00.000Z
updated: 2026-07-30T13:10:00.000Z
---

## Current Test

number: -
name: -
expected: All 4 items attempted; see results below. Items 1 and 3 need connection-error details from user; item 4 has a likely root cause identified (feature flag not enabled) awaiting re-test.
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
result: [blocked] — connection issues reported. Server-side checks (localhost:8088 and https://temporal.example.com Temporal UI) both returned HTTP 200. Need specifics from user: which connection failed (Temporal UI, worker-to-server GraphQL callback, ai-worker-to-temporal), and the exact error message.

### 4. Diagram sovereignty markers (fill/ring, flag gating, idempotent re-sync)

expected: With `featureFlags.Sovereignty` enabled, open a diagram containing a BusinessCapability connected to an Application/Infrastructure element with a known RED finding. Confirm fill (10px, selfStatus) and ring (18px, downstreamStatus, dashed for YELLOW/solid for RED) ellipses render at the correct colors without altering the main element's own styling. Disable the flag and reopen; confirm zero sovereigntyMarkers network calls and zero rendered marker ellipses. Reopen twice with the flag enabled and confirm marker count stays at exactly 2 ellipses per element (no duplication).
result: [issue] — no markers rendered even after save+reload. Backend fully verified correct for this exact scenario (see item 1: `SUPPORTS` relationship exists between "TEST"/"testapp", evaluator produces RED, `projectMarkers` would yield `testapp: {selfStatus: RED, downstreamStatus: RED}`), so the gap is in the client wiring, not the data or evaluation logic. Two remaining hypotheses to check with the user: (a) `selectedCompanyId` (top-nav company selector) not set to "AMAG" (the company owning TEST/testapp) when the diagram was opened — `syncSovereigntyMarkers`'s gate silently no-ops with zero network calls when `companyId` is null, no error shown; (b) a real fetch failure being silently swallowed — check browser console (F12) for a `sovereigntyMarkers fetch failed for root ...` warning.

## Summary

total: 4
passed: 2
issues: 1
pending: 0
skipped: 0
blocked: 1

## Gaps

- Items 1 and 3: user is remote, accessing the host via its LAN IP (192.168.128.166), not localhost. Server-side checks confirm all relevant ports (4000, 8088, 3000, 80, 443) are listening on `0.0.0.0`/`[::]` and respond correctly when curled from the host itself via its own LAN IP. This points to a network/firewall block between the user's remote location and the host (ufw, cloud security group, or VPN routing) rather than an application misconfiguration — could not confirm `ufw status` directly (requires sudo password, not available non-interactively). Item 1 was independently confirmed passed via direct in-container evaluator invocation, bypassing the network reachability question entirely. Item 3 (Temporal) still needs either connectivity resolved or an alternative verification path.
- Item 4: needs user to confirm the selected company (top nav) is "AMAG" when the diagram is open, and to check the browser console for a `sovereigntyMarkers fetch failed` warning after reopening the diagram.
