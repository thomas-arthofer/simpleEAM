---
status: testing
phase: 02-canonical-sovereignty-evaluation-ux-diagnostics
source: [02-VERIFICATION.md]
started: 2026-07-30T12:35:00.000Z
updated: 2026-07-30T12:35:00.000Z
---

## Current Test

number: 1
name: Live GraphQL sovereigntyAnalysis query against seeded RED-chain data
expected: |
  A non-error SovereigntyAnalysis response is returned with selfStatus: GREY,
  downstreamStatus: RED, and a findings[] entry naming the violating
  Application/Infrastructure, its dimension, requiredLevel, actualLevel, and chainPath.
awaiting: user response

## Tests

### 1. Live GraphQL sovereigntyAnalysis query against seeded RED-chain data
expected: Open the GraphQL Playground (or the running client) against a live Docker/Neo4j stack and run `sovereigntyAnalysis(companyId, rootType: "businessCapability", rootId)` for a seeded BusinessCapability with a known RED chain violation. A non-error SovereigntyAnalysis response is returned with `selfStatus: GREY`, `downstreamStatus: RED`, and a `findings[]` entry naming the violating Application/Infrastructure, its dimension, requiredLevel, actualLevel, and chainPath.
result: [pending]

### 2. Sovereignty detail view visual rendering
expected: Open `/sovereignty` in the running app, select a company with a RED-classified capability and a GREY-classified DataObject, and visually confirm the self/downstream status chips, the scrollable findings list (required→actual, chain path), and the distinct GREEN vs GREY empty-state copy render as specified in 02-UI-SPEC.md. Self chip is always grey for capability/dataobject roots; downstream chip and finding rows use the exact RED/YELLOW/GREY/GREEN colors and copy strings; GREEN and GREY empty states are visually distinct, never blank.
result: [pending]

### 3. Live Temporal sovereignty rollup workflow parity
expected: Trigger `sovereigntyScoreWorkflow` against a live Temporal worker with a seeded company and confirm `Company.sovereigntyScoreStatus` transitions CALCULATING → IDLE, with the 4 score fields matching a manual `sovereigntyCompanyRollup` query for the same company. Workflow completes without error; rollup scores from the Temporal path and the direct GraphQL query are identical. (Also tracked as open item #1 in .planning/WINDOWS.md.)
result: [pending]

### 4. Diagram sovereignty markers (fill/ring, flag gating, idempotent re-sync)
expected: With `featureFlags.Sovereignty` enabled, open a diagram containing a BusinessCapability connected to an Application/Infrastructure element with a known RED finding. Confirm fill (10px, selfStatus) and ring (18px, downstreamStatus, dashed for YELLOW/solid for RED) ellipses render at the correct colors without altering the main element's own styling. Disable the flag and reopen; confirm zero sovereigntyMarkers network calls and zero rendered marker ellipses. Reopen twice with the flag enabled and confirm marker count stays at exactly 2 ellipses per element (no duplication).
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
