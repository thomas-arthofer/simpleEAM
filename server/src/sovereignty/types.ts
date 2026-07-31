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

/** Achieved-leaf entity types in scope for chain traversal (D-08 — no Supplier). */
export type ViolatingElementType = 'application' | 'aiComponent' | 'infrastructure'

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

/** Requirement roots in Phase 2 scope (D-04 — BusinessProcess is out of scope). */
export type SovereigntyRootType = 'businessCapability' | 'dataObject'

/**
 * Canonical analysis result for a requirement root. `selfStatus` is always
 * GREY for a root — a BusinessCapability/DataObject owns no achieved rating
 * of its own and can never be the cause of a violation, only affected by one
 * (D-05).
 */
export interface SovereigntyAnalysis {
  readonly rootId: string
  readonly rootType: SovereigntyRootType
  readonly findings: readonly Finding[]
  readonly selfStatus: SovereigntyStatus
  readonly downstreamStatus: SovereigntyStatus
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
}

/**
 * A DataObject's own requirements plus the Applications that use it or serve
 * as one of its data sources, and the AIComponents trained with it (D-08 —
 * Application/AIComponent/Infrastructure only, no Supplier).
 */
export interface DataObjectChain extends SupportChain {
  readonly rootType: 'dataObject'
}
