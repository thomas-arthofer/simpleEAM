/**
 * Canonical sovereignty evaluation types shared by the evaluator, repository,
 * and GraphQL resolver layers. See eam-konzept.md §3 for the RED/YELLOW/GREY/
 * GREEN taxonomy and .planning/phases/02-canonical-sovereignty-evaluation-ux-diagnostics/02-CONTEXT.md
 * for the traversal decisions (D-01..D-10) these types encode.
 */

export const SOVEREIGNTY_DIMENSIONS = [
  'strategicAutonomy',
  'resilience',
  'security',
  'control',
] as const
export type SovereigntyDimension = (typeof SOVEREIGNTY_DIMENSIONS)[number]

export const SOVEREIGNTY_STATUSES = ['RED', 'YELLOW', 'GREY', 'GREEN'] as const
export type SovereigntyStatus = (typeof SOVEREIGNTY_STATUSES)[number]

export const SOVEREIGNTY_MATURITY_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const
export type SovereigntyMaturityLevel = (typeof SOVEREIGNTY_MATURITY_LEVELS)[number]

/** Achieved-leaf entity types in scope for chain traversal (D-08 — no Supplier).
 * `'businessCapability'` (02.3 D-06) and `'businessProcess'` (Phase 4 D-04) are
 * the two exceptions: each names a requirement root as the violating element in
 * a parent-vs-child required-level contradiction finding, not an achieved-value
 * violation. */
export type ViolatingElementType =
  'application' | 'aiComponent' | 'infrastructure' | 'businessCapability' | 'businessProcess'

/**
 * A single sovereignty violation: names the violating element, dimension,
 * required/actual maturity, and the chain path from the requirement root down
 * to the violating element (SOV-04).
 */
export interface Finding {
  readonly violatingElementId: string
  readonly violatingElementType: ViolatingElementType
  readonly violatingElementName: string
  readonly dimension: SovereigntyDimension
  readonly status: SovereigntyStatus
  readonly requiredLevel: SovereigntyMaturityLevel | null
  readonly actualLevel: SovereigntyMaturityLevel | null
  readonly chainPath: readonly string[]
}

/**
 * Requirement roots. `'businessProcess'` was added in Phase 4 (D-01/D-02),
 * superseding Phase 2's D-04 deferral of BusinessProcess.
 */
export type SovereigntyRootType = 'businessCapability' | 'dataObject' | 'businessProcess'

/**
 * Canonical analysis result for a requirement root. A BusinessCapability/
 * DataObject owns no achieved rating of its own and can never be the cause
 * of a violation, only affected by one (D-05). `selfStatus` is GREEN once a
 * real parent comparison passed, or — for a true hierarchy root with no
 * parent at all — once its own required levels are simply filled in
 * (nothing to contradict without a parent); YELLOW on a parent-vs-own
 * contradiction; GREY only when genuinely nothing is comparable and nothing
 * is filled in.
 *
 * `capabilityIds` lists every BusinessCapability id that is part of this
 * analysis's own subtree — the root itself plus, recursively, every nested
 * `childCapabilities` id (D-11/D-05). Every nested (non-root) id among these
 * still resolves via its own real parent comparison only (the "filled in"
 * exception above applies only to the analysis's own top-level root, which
 * has no in-scope parent to compare against) — this is what lets
 * `projectMarkers` force GREY on a nested capability appearing mid-chain in
 * an ancestor's findings whenever it has no real comparison of its own. For
 * a DataObject analysis (no nesting), this is always exactly `[rootId]`.
 */
export interface SovereigntyAnalysis {
  readonly rootId: string
  readonly rootType: SovereigntyRootType
  readonly findings: readonly Finding[]
  readonly selfStatus: SovereigntyStatus
  readonly downstreamStatus: SovereigntyStatus
  readonly capabilityIds: readonly string[]
  /**
   * The subset of `capabilityIds` that had at least one real (non-excluded —
   * both parent and child sides non-null) dimension compared against at
   * least one parent, regardless of whether that comparison passed or
   * contradicted (03-CONTEXT.md D-01/D-02). Consumed only by `markers.ts` to
   * distinguish "genuinely nothing to compare" (GREY) from "compared and
   * found consistent" (GREEN) — never exposed via GraphQL.
   */
  readonly comparedCapabilityIds: readonly string[]
}

export interface RequirementLevels {
  readonly strategicAutonomy: SovereigntyMaturityLevel | null
  readonly resilience: SovereigntyMaturityLevel | null
  readonly security: SovereigntyMaturityLevel | null
  readonly control: SovereigntyMaturityLevel | null
}

export interface AchievedLevels {
  readonly strategicAutonomy: SovereigntyMaturityLevel | null
  readonly resilience: SovereigntyMaturityLevel | null
  readonly security: SovereigntyMaturityLevel | null
  readonly control: SovereigntyMaturityLevel | null
}

/**
 * Infrastructure supports multiple parents (D-01): every `parentInfrastructure`
 * edge is walked independently by the evaluator, never collapsed into a single
 * "worst of" result. `parentInfrastructure` may cycle back to an ancestor id in
 * pathological data (D-03) — the evaluator's visited-set guard, not this type,
 * is what makes that safe to traverse.
 */
export interface InfrastructureNode {
  readonly id: string
  readonly name: string
  readonly type: 'infrastructure'
  readonly achieved: AchievedLevels
  readonly parentInfrastructure: readonly InfrastructureNode[]
}

/**
 * Composite Applications (D-02): a container's own achieved values are always
 * classified independently of its `components`, and the container is never
 * hidden even when every component is fully compliant.
 */
export interface ApplicationNode {
  readonly id: string
  readonly name: string
  readonly type: 'application'
  readonly achieved: AchievedLevels
  readonly hostedOn: readonly InfrastructureNode[]
  readonly components: readonly ApplicationNode[]
}

export interface AIComponentNode {
  readonly id: string
  readonly name: string
  readonly type: 'aiComponent'
  readonly achieved: AchievedLevels
  readonly hostedOn: readonly InfrastructureNode[]
}

/**
 * Shape shared by every requirement root (BusinessCapability, DataObject):
 * its own requirements plus the Application/AIComponent entities it directly
 * supports. `analyzeBusinessCapability` and `analyzeDataObject` both walk
 * this same shape through the same classifier (RESEARCH.md Anti-Pattern 3).
 */
export interface SupportChain {
  readonly rootId: string
  /**
   * Optional so existing test fixtures (which never render a root's own
   * name) keep compiling unchanged; `evaluator.ts`/`chainLabels.ts` both
   * fall back to `rootId` when absent. The repository always populates this
   * for real data (SOV-04 chain readability) — a raw id name is a
   * missing-data fallback, never the intended production display.
   */
  readonly name?: string
  readonly required: RequirementLevels
  readonly supportingApplications: readonly ApplicationNode[]
  readonly supportingAIComponents: readonly AIComponentNode[]
}

/**
 * A BusinessCapability's nested children (`HAS_PARENT` incoming edges, e.g.
 * a "Business Case" that is a sub-case of another) each carry their own
 * `SupportChain` — own requirements, own supporting Applications/AIComponents,
 * and (recursively) their own `childCapabilities` — so a violation found only
 * inside a descendant's own support chain still rolls up into every ancestor's
 * `downstreamStatus` (worst-of-entire-subtree, D-11).
 */
export interface BusinessCapabilityChain extends SupportChain {
  readonly rootType: 'businessCapability'
  readonly childCapabilities: readonly BusinessCapabilityChain[]
  /**
   * Direct parents' (`HAS_PARENT` outgoing) own required levels only — never
   * their full support chains (02.3 D-01). Populated by the repository only
   * for the analysis root; nested `childCapabilities` always carry `[]` here
   * since their in-scope parent is the ancestor already present in the walk.
   */
  readonly parentRequiredLevels: readonly {
    readonly id: string
    readonly name?: string
    readonly required: RequirementLevels
  }[]
}

/**
 * A DataObject's own requirements plus the Applications that use it or serve
 * as one of its data sources, and the AIComponents trained with it (D-08 —
 * Application/AIComponent/Infrastructure only, no Supplier).
 */
export interface DataObjectChain extends SupportChain {
  readonly rootType: 'dataObject'
}

/**
 * A BusinessProcess's own requirements plus the Applications it is
 * directly supported by (D-02 — flat, DataObject-shaped: no nested
 * childProcesses achieved-chain walk, unlike BusinessCapability's
 * childCapabilities rollup). BusinessProcess has no direct AIComponent
 * relationship in schema.graphql, so `supportingAIComponents` is always
 * `[]`.
 */
export interface BusinessProcessChain extends SupportChain {
  readonly rootType: 'businessProcess'
  /**
   * Direct parents' (`HAS_PARENT_PROCESS`-OUT) own required levels only —
   * never their full support chains (D-04, mirrors `BusinessCapabilityChain
   * .parentRequiredLevels` verbatim). Root-only: every BusinessProcess is
   * independently analyzed as its own root — there is no nested achieved-chain
   * subtree to distinguish "root" from "descendant" for, unlike
   * BusinessCapability, so this is always populated by the repository for
   * every fetch, not gated by an `isRoot` parameter.
   */
  readonly parentRequiredLevels: readonly {
    readonly id: string
    readonly name?: string
    readonly required: RequirementLevels
  }[]
}
