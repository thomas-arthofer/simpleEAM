---
quick_id: 260812-jtq
status: complete
---

# Quick Task 260812-jtq: Sovereignty chain shows raw UUIDs instead of readable names

## Problem

The Sovereignty tab's finding "Chain: ..." breadcrumb (`SovereigntyCapabilityView.tsx`,
`SovereigntyDataView.tsx`, `SovereigntyProcessView.tsx`) renders `finding.chainPath`
(an array of raw Neo4j element ids) joined with " → ". Only `violatingElementName`
(the last hop) is human-readable; every other hop in the chain is an unreadable UUID.

Additionally, `businessCapability`/`businessProcess` parent-vs-own contradiction
findings (`classifyCapabilityAgainstParent` in `evaluator.ts`) set
`violatingElementName: chain.rootId` — i.e. even the "readable" name is a raw id
for that finding type.

## Decision

Include entity class in the chain label (`"<Type>: <Name>"`, e.g.
`Infrastructure: Schlechtes DC`) since a chain can cross multiple entity types
and the name alone can be ambiguous. Reuse the existing
`sovereigntyDetail.entityTypes` i18n map (already defined in `de.json`/`en.json`)
for the class label — no new translation keys needed for the type name itself.

## Approach

1. `server/src/sovereignty/types.ts` — add optional `name` to `SupportChain`
   (covers `BusinessCapabilityChain`/`DataObjectChain`/`BusinessProcessChain`)
   and to `parentRequiredLevels` entries.
2. `server/src/sovereignty/repository.ts` — fetch `.name` for BusinessCapability/
   DataObject/BusinessProcess roots and their `parentRequiredLevels` parents.
3. `server/src/sovereignty/evaluator.ts` — `classifyCapabilityAgainstParent` uses
   `chain.name ?? chain.rootId` for `violatingElementName` (fixes the
   contradiction-finding readability bug too).
4. New `server/src/sovereignty/chainLabels.ts` — `collectChainLabels()` walks the
   already-fetched chain tree (no extra Neo4j round-trip) into an
   `id -> {name, type}` map covering every node that can appear in a
   `chainPath` (root, nested capabilities, parents, applications, infra,
   AI components).
5. `server/src/graphql/schema.graphql` — add `SovereigntyChainNode { id, name,
   type }` and a `chainNodes: [SovereigntyChainNode!]!` field on
   `SovereigntyFinding`. `chainPath` (raw ids) stays for backward compat.
6. `server/src/sovereignty/graphql/resolvers.ts` — build the label map via
   `collectChainLabels()` after `loadFullSupportChain()` and populate
   `chainNodes` on every finding in `sovereigntyAnalysis`.
7. `client/src/graphql/sovereigntyDetail.ts` — request `chainNodes { id name
   type }` in `GET_SOVEREIGNTY_ANALYSIS`.
8. `client/src/components/sovereignty/{SovereigntyCapabilityView,
   SovereigntyDataView,SovereigntyProcessView}.tsx` — render `chainNodes` as
   `"<t(entityTypes.X)>: <name>"` joined by " → " instead of raw
   `chainPath.join(' → ')`.

## Verification

- `yarn workspace server test sovereignty` (or equivalent jest run) still green
  — existing fixtures have no `name` field, fall back to `rootId`, so no test
  data updates required.
- `yarn tsc --noEmit` (server + client) passes.
