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
result: [blocked] — untested, connection problems reported. Server-side curl checks (localhost:4000/graphql, https://api.example.com/graphql) both returned HTTP 400 to a bare GET, which is the expected Apollo response for a non-POST request — so the server itself is reachable from the host. Need specifics from user: which URL, what error (timeout, CORS, cert warning, auth failure)?

### 2. Sovereignty detail view visual rendering

expected: Open `/sovereignty` in the running app, select a company with a RED-classified capability and a GREY-classified DataObject, and visually confirm the self/downstream status chips, the scrollable findings list (required→actual, chain path), and the distinct GREEN vs GREY empty-state copy render as specified in 02-UI-SPEC.md. Self chip is always grey for capability/dataobject roots; downstream chip and finding rows use the exact RED/YELLOW/GREY/GREEN colors and copy strings; GREEN and GREY empty states are visually distinct, never blank.
result: [passed] — approved by user.

### 3. Live Temporal sovereignty rollup workflow parity

expected: Trigger `sovereigntyScoreWorkflow` against a live Temporal worker with a seeded company and confirm `Company.sovereigntyScoreStatus` transitions CALCULATING → IDLE, with the 4 score fields matching a manual `sovereigntyCompanyRollup` query for the same company. Workflow completes without error; rollup scores from the Temporal path and the direct GraphQL query are identical. (Also tracked as open item #1 in .planning/WINDOWS.md.)
result: [blocked] — connection issues reported. Server-side checks (localhost:8088 and https://temporal.example.com Temporal UI) both returned HTTP 200. Need specifics from user: which connection failed (Temporal UI, worker-to-server GraphQL callback, ai-worker-to-temporal), and the exact error message.

### 4. Diagram sovereignty markers (fill/ring, flag gating, idempotent re-sync)

expected: With `featureFlags.Sovereignty` enabled, open a diagram containing a BusinessCapability connected to an Application/Infrastructure element with a known RED finding. Confirm fill (10px, selfStatus) and ring (18px, downstreamStatus, dashed for YELLOW/solid for RED) ellipses render at the correct colors without altering the main element's own styling. Disable the flag and reopen; confirm zero sovereigntyMarkers network calls and zero rendered marker ellipses. Reopen twice with the flag enabled and confirm marker count stays at exactly 2 ellipses per element (no duplication).
result: [issue] — no markers rendered. Likely cause: `featureFlags.Sovereignty` is a **per-company** flag (`client/src/lib/company-features.ts`'s `buildDefaultFeatureFlags()`) that defaults to `false` for every company unless explicitly enabled via the Company's Feature Management tab. If the test company never had this flag turned on, `syncDiagramOnOpen`'s D-09 gate (`DiagramHandlers.ts`) correctly makes zero `sovereigntyMarkers` calls and renders nothing — this would be correct gating behavior, not a bug. Needs re-test: enable Sovereignty in the test company's feature flags, reopen the diagram, and confirm markers appear.

## Summary

total: 4
passed: 1
issues: 1
pending: 0
skipped: 0
blocked: 2

## Gaps

- Items 1 and 3: reported connection problems, but root cause not yet identified — awaiting exact error/URL from user to diagnose further.
- Item 4: no markers rendered — most likely explained by the per-company `featureFlags.Sovereignty` flag being off by default; needs re-test with the flag explicitly enabled before concluding it's a real defect.
