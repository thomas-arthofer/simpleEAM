---
quick_id: 260812-jtq
status: complete
---

# Quick Task 260812-jtq: Sovereignty chain shows raw UUIDs instead of readable names

## What changed

The Sovereignty tab's finding "Chain: ..." breadcrumb now shows
`<EntityType>: <Name>` for every hop instead of raw Neo4j UUIDs, e.g.:

`Business Capability: Wichtiger Businesscase → Application: Buchhaltungs-App → Infrastructure: Schlechtes DC`

### Server

- `server/src/sovereignty/types.ts` — `SupportChain` (and thus
  `BusinessCapabilityChain`/`DataObjectChain`/`BusinessProcessChain`) and
  `parentRequiredLevels` entries gained an optional `name` field.
- `server/src/sovereignty/repository.ts` — now fetches `.name` for
  BusinessCapability/DataObject/BusinessProcess roots and their
  `parentRequiredLevels` parent entries.
- `server/src/sovereignty/evaluator.ts` — `classifyCapabilityAgainstParent`
  now sets `violatingElementName: chain.name ?? chain.rootId` instead of
  always using the raw `chain.rootId` (fixes the same UUID-leak bug for
  BusinessCapability/BusinessProcess parent-vs-own contradiction findings).
- New `server/src/sovereignty/chainLabels.ts` — `collectChainLabels()` builds
  an `id -> {name, type}` map by walking the already-fetched chain tree (no
  extra Neo4j round-trip).
- `server/src/graphql/schema.graphql` — added `SovereigntyChainNode { id,
  name, type }` and a `chainNodes: [SovereigntyChainNode!]!` field on
  `SovereigntyFinding` (the raw `chainPath: [String!]!` field is kept for
  backward compatibility).
- `server/src/sovereignty/graphql/resolvers.ts` — `sovereigntyAnalysis`
  builds the label map via `collectChainLabels()` and populates
  `chainNodes` on every finding.
- `server/src/sovereignty/__tests__/evaluator.parity.test.ts` — updated the
  byte-identical parity assertion to strip the new additive `chainNodes`
  field before comparing (documented as intentional, mirroring the existing
  `dimension` enum normalization).

### Client

- `client/src/graphql/sovereigntyDetail.ts` — `GET_SOVEREIGNTY_ANALYSIS` now
  requests `chainNodes { id name type }`.
- `client/src/components/sovereignty/{SovereigntyCapabilityView,
  SovereigntyDataView,SovereigntyProcessView}.tsx` — render `chainNodes`
  (mapped through a `CHAIN_NODE_TYPE_I18N_KEY` table into the existing
  `sovereigntyDetail.entityTypes` i18n strings) instead of raw
  `chainPath.join(' → ')`. No new translation keys were needed.

## Decision made on the user's open question

Included the entity class in the chain label (`"<Type>: <Name>"`) rather than
name-only, since a chain routinely crosses multiple entity types
(BusinessCapability → Application → Infrastructure) and the class
disambiguates otherwise-similar names.

## Verification

- `yarn tsc --noEmit` — server: pass, client: pass.
- `yarn jest src/sovereignty` (server) — 5 suites / 66 tests pass, including
  the updated parity test.
- `yarn eslint` on all touched client files — no errors.
- Formatted all touched files with the repo's `prettier` (via `yarn dlx`).
- Existing test fixtures required no changes (`name` is optional, falls back
  to the old `rootId`/id behavior when absent).

## Manual UAT still needed

Not yet verified against a running stack/browser — recommend opening the
Sovereignty tab for a capability with a multi-hop violation chain and
confirming the "Kette: ..." line now shows readable `Type: Name` steps.
