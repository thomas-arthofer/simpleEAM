# Phase 4: Extend sovereignty hierarchy checks to other EA element types - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the chain-based sovereignty evaluation to `BusinessProcess`, the one deferred candidate scoped into this phase. A `BusinessProcess` becomes a full requirement root — mirroring `DataObject`'s own-chain evaluation against its `supportedByApplications`/AIComponents AND `BusinessCapability`'s full 02.3/03 parent-tree-consistency treatment against its own `parentProcess` hierarchy (three-valued GREEN/YELLOW/GREY selfStatus). `Supplier` (Phase 2 `D-08`) stays out of scope and remains a deferred backlog item, unchanged. No wiring is added between `BusinessCapability.supportedByBusinessProcesses` and `BusinessProcess` — the two requirement roots stay independent, not nested.

</domain>

<decisions>
## Implementation Decisions

### Scope: which deferred element type

- **D-01:** Phase 4 implements **BusinessProcess only**. `Supplier` (Phase 2 `D-08`, `SOVX-01` blast-radius work) stays deferred — not silently dropped, but not re-opened this phase either. Rationale: BusinessProcess is diagrammable today (has an icon + library entry, unlike Supplier), is explicitly named as a known gap in `eam-konzept.md` §6 ("Die auf Geschäftsprozessen erfassten Anforderungen fließen derzeit in keine Auswertung ein"), and is tracked by `SOVX-02` in REQUIREMENTS.md v2.

### BusinessProcess chain wiring

- **D-02:** `BusinessProcess` is a **new independent `SovereigntyRootType`**, added alongside `'businessCapability'` and `'dataObject'`. It gets its own `analyzeBusinessProcess` entry point mirroring `analyzeDataObject`/`analyzeSupportChain` exactly: own `sovereigntyReq*` fields as the `required` set, achieved-chain findings collected from `supportedByApplications` (walked via the existing `walkApplication`, reusing `hostedOn`/`components` recursion unchanged). No new leaf-node walker is needed — `Application`/`Infrastructure`/`AIComponent` traversal logic (`walkApplication`/`walkInfrastructure`/`walkAIComponent`) is reused as-is.
- **D-03:** `BusinessCapability.supportedByBusinessProcesses` is explicitly **not** wired into `analyzeCapabilitySubtree`/`collectOwnFindings` this phase. A BusinessCapability's downstream chain still only walks its direct `supportedByApplications`/`supportedByAIComponents` (Phase 2 scope, unchanged) — a BusinessProcess's own findings do not roll up into any BusinessCapability's `downstreamStatus`. BusinessProcess is a sibling requirement root, viewable and evaluated entirely on its own, not a hop inside BusinessCapability's chain. — **Reversibility:** costly — inserting this wiring later means changing `analyzeCapabilitySubtree`'s recursion shape and re-deriving/re-testing every BusinessCapability fixture that has a `supportedByBusinessProcesses` edge.

### BusinessProcess parent-consistency check

- **D-04:** Phase 4 also extends the 02.3/03 parent-vs-own-required-level tree-consistency check to `BusinessProcess.parentProcess`/`childProcesses` (`HAS_PARENT_PROCESS`), mirroring `BusinessCapability`'s treatment exactly:
  - A `BusinessProcess` whose own required level is weaker than any `parentProcess`'s required level for the same dimension gets a **YELLOW** self-status finding naming the child process as the violation source (mirrors `classifyCapabilityAgainstParent`/02.3 D-01/D-05/D-06 — reuses the `Finding` shape, `violatingElementType` gains `'businessProcess'`).
  - Null-either-side excludes the dimension entirely (02.3 D-03/D-04, unchanged rule).
  - Multi-parent handling is independent-per-edge (02.3 D-02): flagged if below **any** `parentProcess`'s required level, not required to be below all.
  - `selfStatus` is three-valued per Phase 3's D-01/D-02: YELLOW on any parent contradiction; GREEN when no contradiction but at least one real (non-excluded) dimension was actually compared against a `parentProcess`; GREY only when genuinely nothing was comparable (no `parentProcess` at all, or every dimension excluded on every parent) — same "nothing compared" vs "compared and clean" distinction Phase 3 built for BusinessCapability.
  - Same cycle-safe per-branch visited-set contract (Phase 2 D-03) applies to the `parentProcess`/`childProcesses` walk.

### Supplier (confirmed out of scope, no new decision)

- **D-05:** `Supplier` chain traversal stays exactly as deferred in Phase 2's `D-08` — no new decision made this phase, no implementation. Re-confirmed, not re-opened.

### the agent's Discretion

- Exact repository/GraphQL fetch shape for a `BusinessProcess`'s own upward `parentProcess` required levels (mirrors `fetchBusinessCapabilityChain`'s `isRoot` upward-fetch parameter from 02.3, adapted to `HAS_PARENT_PROCESS`) is left to research/planning.
- Whether `BusinessProcess` needs its own dedicated `/sovereignty`-style detail-view route/query, or reuses an existing generic pattern shared with `DataObject`'s equivalent surface, is an implementation detail for planning.
- Diagram marker gating for `BusinessProcess` (reuse of the existing `featureFlags.Sovereignty` company-level flag per Phase 2 D-09, vs. anything new) is left to planning — no new gating mechanism was requested.
- Exact `SovereigntyMarker`/`projectMarkers` wiring so `BusinessProcess` nodes on diagrams get the same fill/ring two-marker treatment as `BusinessCapability` (self always excluded from RED per D-05-style rule, since BusinessProcess also owns no achieved rating of its own — only requirements) is left to research/planning to confirm against `types.ts`'s existing `SovereigntyRootType`/`ViolatingElementType` shapes.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 sovereignty foundations (the deferral this phase reopens)

- `.planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-CONTEXT.md` — `D-04` (BusinessProcess explicitly out of scope for Phase 2, tied to `SOVX-02` — this phase implements what D-04 deferred), `D-08` (Supplier explicitly out of scope, logged as a deferred backlog item — stays deferred per this phase's D-05), `D-01`/`D-03` (independent-edge evaluation, cycle-safe visited-set contract — this phase's BusinessProcess walk must follow the same contract), `D-05` (selfStatus-always-GREY-for-requirement-roots baseline that 02.3/03/this-phase carve narrow exceptions into).
- `.planning/phases/02.3-business-capability-requirement-chain-consistency-compare-pa/02.3-CONTEXT.md` — `D-01` (root-vs-own-parents check shape), `D-02` (multi-parent independent-per-edge), `D-03`/`D-04` (null-exclusion semantics), `D-05` (colored self-fill exception for tree-contradiction), `D-06` (Finding shape reuse, `violatingElementType` extension pattern) — this phase's D-04 mirrors all of these for `BusinessProcess`.
- `.planning/phases/03-business-capability-self-status-green-when-consistent-with-p/03-CONTEXT.md` — `D-01`/`D-02` (GREEN-threshold "nothing compared" vs "compared and clean" distinction, `hasRealComparison` signal) — this phase's three-valued BusinessProcess selfStatus mirrors this exactly.
- `eam-konzept.md` §3 ("Zwei Marker je Element"), §6 ("Anzumerken" — explicitly names the BusinessProcess gap this phase closes).

### Existing code this phase extends (not replaces)

- `server/src/sovereignty/evaluator.ts` — `analyzeDataObject`/`analyzeSupportChain` (the pattern D-02's `analyzeBusinessProcess` mirrors), `classifyCapabilityAgainstParent` (the pattern D-04's BusinessProcess-parent classifier mirrors — likely needs a parallel or generalized function, not a BusinessCapability-only one), `walkApplication`/`walkInfrastructure`/`walkAIComponent` (reused unchanged for BusinessProcess's achieved-chain walk).
- `server/src/sovereignty/types.ts` — `SovereigntyRootType` (`'businessCapability' | 'dataObject'` today — needs `'businessProcess'` added per D-02), `ViolatingElementType` (needs `'businessProcess'` added per D-04, alongside 02.3's existing `'businessCapability'` addition), `Finding`, `RequirementLevels`.
- `server/src/sovereignty/repository.ts` — `fetchBusinessCapabilityChain` (the `isRoot`-param upward-fetch pattern from 02.3 D-01 to mirror for BusinessProcess's `parentProcess`), needs a new `fetchBusinessProcessChain` (or equivalent) fetching `supportedByApplications`/AIComponents and `parentProcess` required levels.
- `server/src/sovereignty/markers.ts` — `projectMarkers`: currently branches on `isCapability` for the GREY-self-unless-exception rule; needs a parallel `isBusinessProcess` (or generalized "requirement-root-type") branch.
- `server/src/graphql/schema.graphql` — `BusinessProcess.sovereigntyReq*` fields (lines ~128-136), `parentProcess`/`childProcesses` (`HAS_PARENT_PROCESS`, lines ~143-144), `supportedByApplications` (`SUPPORTS` IN, line 146), `SovereigntyFinding.violatingElementType: String!` (loose string — no schema change needed for the new value).
- `server/src/sovereignty/__tests__/markers.test.ts` and `evaluator` test fixtures — need new BusinessProcess fixtures/assertions mirroring the existing DataObject and BusinessCapability parent-consistency test suites.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `analyzeSupportChain`/`analyzeDataObject` (evaluator.ts) is the exact template for D-02's BusinessProcess own-chain evaluation — no new achieved-leaf walker needed, only a new `SovereigntyRootType` entry and repository fetch.
- `classifyCapabilityAgainstParent` (evaluator.ts) is the exact template for D-04's BusinessProcess parent-consistency classifier — likely worth generalizing into a shared "classifyRequirementRootAgainstParent" rather than duplicating a near-identical function, but that generalization decision is left to planning (agent's discretion).
- `worseStatus`/`STATUS_RANK`/`DEFAULT_MARKER` (markers.ts) reused unchanged.

### Established Patterns

- One classifier, reused everywhere (02-RESEARCH.md Anti-Pattern 3): BusinessProcess's achieved-chain findings and parent-consistency findings must flow through the same `Finding[]` → `projectMarkers` → detail view / diagram marker pipeline as every other finding, not a separate parallel check.
- Per-branch visited-set cycle safety (Phase 2 D-03): BusinessProcess's `parentProcess` walk must follow the identical cycle-safety contract as `analyzeCapabilitySubtree`'s `HAS_PARENT` walk.
- Deferred-not-dropped backlog logging (Phase 2 D-08 precedent): Supplier stays logged as deferred, the same treatment this phase gives it.

### Integration Points

- `BusinessProcess` already has a diagram icon (`client/src/components/icons/BusinessProcessIcon.tsx`) and library entry (`client/src/graphql/library.ts`) — no new diagram-element-type UI work is needed to give it a marker home, unlike Supplier.
- `SovereigntyAnalysis.findings` (flat array, already consumed by both detail view and diagram markers) needs no new top-level field — BusinessProcess findings are new entries in the same array.

</code_context>

<specifics>
## Specific Ideas

No new UI mockups or wording requested. User confirmed: (1) BusinessProcess only this phase, Supplier stays deferred; (2) BusinessProcess is a sibling requirement root, not nested inside BusinessCapability's chain; (3) BusinessProcess gets the full 02.3/03 parent-consistency treatment (three-valued selfStatus), not just achieved-chain participation.

</specifics>

<deferred>
## Deferred Ideas

- **Supplier chain traversal** — stays deferred exactly as logged in Phase 2's `D-08` (own `sovereigntyAch*` fields, real `PROVIDED_BY`/`SUPPORTED_BY`/`MAINTAINED_BY`/`HOSTED_BY`/`DEVELOPED_BY`/`MANUFACTURED_BY` relationships from Application/AIComponent/Infrastructure). Not diagrammable today (no icon, no library entry) — a future phase would need to decide whether findings collapse onto the referencing Application/Infra/AIComponent marker or Supplier becomes a first-class diagrammable element type first.
- **BusinessCapability ↔ BusinessProcess chain nesting** (`supportedByBusinessProcesses`) — explicitly rejected as in-scope this phase (D-03); could be a future phase if a user wants a BusinessProcess violation to visibly affect an owning BusinessCapability's downstream ring.
- Blast-radius/portfolio prioritization (`SOVX-01`) and weighted scoring (`SOVX-04`) — unchanged v2 deferrals from REQUIREMENTS.md, not touched by this discussion.

</deferred>

---

*Phase: 04-extend-sovereignty-hierarchy-checks-to-other-ea-element-type*
*Context gathered: 2026-08-10*
