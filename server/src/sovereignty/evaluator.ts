import { SOVEREIGNTY_DIMENSIONS, SOVEREIGNTY_MATURITY_LEVELS } from './types'
import type {
  AchievedLevels,
  AIComponentNode,
  ApplicationNode,
  BusinessCapabilityChain,
  BusinessProcessChain,
  DataObjectChain,
  Finding,
  InfrastructureNode,
  RequirementLevels,
  SovereigntyAnalysis,
  SovereigntyMaturityLevel,
  SovereigntyRootType,
  SovereigntyStatus,
  SupportChain,
  ViolatingElementType,
} from './types'

interface ClassifiableNode {
  readonly id: string
  readonly name: string
  readonly type: ViolatingElementType
  readonly achieved: AchievedLevels
}

function maturityIndex(level: SovereigntyMaturityLevel): number {
  return SOVEREIGNTY_MATURITY_LEVELS.indexOf(level)
}

/**
 * Classifies a single support-chain node against the root's requirements,
 * producing one finding per dimension where the node is not GREEN. Missing
 * achieved values are always GREY (SOV-03), even when no requirement is set
 * for that dimension — GREY must never silently read as compliant-by-default.
 * A requirement that IS set and violated (`actual < required`) is RED.
 * Otherwise no finding is produced (implicit GREEN).
 *
 * Shared by `analyzeBusinessCapability` and `analyzeDataObject` (Task 2) so
 * detail views, diagram markers, and the Temporal rollup never see two
 * diverging classifiers (RESEARCH.md Anti-Pattern 3).
 */
export function classifyNode(
  node: ClassifiableNode,
  required: RequirementLevels,
  chainPath: readonly string[]
): Finding[] {
  const findings: Finding[] = []
  const fullPath = [...chainPath, node.id]

  for (const dimension of SOVEREIGNTY_DIMENSIONS) {
    const requiredLevel = required[dimension]
    const actualLevel = node.achieved[dimension]

    if (actualLevel === null) {
      findings.push({
        violatingElementId: node.id,
        violatingElementType: node.type,
        violatingElementName: node.name,
        dimension,
        status: 'GREY',
        requiredLevel,
        actualLevel: null,
        chainPath: fullPath,
      })
      continue
    }

    if (requiredLevel !== null && maturityIndex(actualLevel) < maturityIndex(requiredLevel)) {
      findings.push({
        violatingElementId: node.id,
        violatingElementType: node.type,
        violatingElementName: node.name,
        dimension,
        status: 'RED',
        requiredLevel,
        actualLevel,
        chainPath: fullPath,
      })
    }
  }

  return findings
}

/**
 * Classifies a BusinessCapability's own required levels against one direct
 * parent's required levels (02.3 D-01/D-02/D-06) — a required-vs-required
 * tree-consistency check, distinct from `classifyNode`'s achieved-vs-required
 * comparison. Diverges from `classifyNode` in two ways: (1) EITHER side being
 * `null` excludes the dimension entirely (no finding, not even GREY) per
 * D-03/D-04 — a missing child requirement is never treated as "weakest"; (2)
 * only a weaker child level than the parent produces a finding, always
 * YELLOW (a structural requirement-tree contradiction, not an achieved-value
 * violation). Each parent edge is classified independently (D-02) — callers
 * loop over every entry in `parentRequiredLevels` and concatenate results,
 * never collapsing multiple parents into one "worst of" finding.
 *
 * Also reports `hasRealComparison` (03-CONTEXT.md D-01/D-02): true when at
 * least one dimension reached the maturity comparison (both sides non-null),
 * whether or not it then produced a finding — this is the "was anything
 * genuinely compared" signal `markers.ts` needs to distinguish GREEN
 * (compared and consistent) from GREY (nothing to compare), since both cases
 * otherwise produce zero findings and are indistinguishable downstream.
 */
export function classifyCapabilityAgainstParent(
  chain: BusinessCapabilityChain,
  parentEntry: { readonly id: string; readonly required: RequirementLevels },
  chainPathPrefix: readonly string[]
): { readonly findings: Finding[]; readonly hasRealComparison: boolean } {
  const findings: Finding[] = []
  let hasRealComparison = false

  for (const dimension of SOVEREIGNTY_DIMENSIONS) {
    const parentRequired = parentEntry.required[dimension]
    const childRequired = chain.required[dimension]

    if (parentRequired === null || childRequired === null) continue

    hasRealComparison = true

    if (maturityIndex(childRequired) < maturityIndex(parentRequired)) {
      findings.push({
        violatingElementId: chain.rootId,
        violatingElementType: 'businessCapability',
        violatingElementName: chain.rootId,
        dimension,
        status: 'YELLOW',
        requiredLevel: parentRequired,
        actualLevel: childRequired,
        chainPath: [...chainPathPrefix, parentEntry.id, chain.rootId],
      })
    }
  }

  return { findings, hasRealComparison }
}

function aggregateDownstreamStatus(findings: readonly Finding[]): SovereigntyStatus {
  if (findings.some(f => f.status === 'RED')) return 'RED'
  if (findings.some(f => f.status === 'YELLOW')) return 'YELLOW'
  if (findings.some(f => f.status === 'GREY')) return 'GREY'
  return 'GREEN'
}

/**
 * Recursively walks an Infrastructure and its `parentInfrastructure` edges.
 * `visited` is the set of element ids already on the current traversal path
 * (D-03): re-entering one of them stops silently (no finding, no recursion),
 * which is what makes a cyclic `parentInfrastructure` graph terminate. Each
 * child edge recurses with its own copy of the path-visited set so a
 * violation on one parent edge never suppresses or merges with a sibling
 * edge's result (D-01).
 */
function walkInfrastructure(
  infra: InfrastructureNode,
  required: RequirementLevels,
  chainPath: readonly string[],
  visited: ReadonlySet<string>
): Finding[] {
  if (visited.has(infra.id)) return []

  const pathVisited = new Set(visited)
  pathVisited.add(infra.id)
  const nextPath = [...chainPath, infra.id]

  const findings = classifyNode(infra, required, chainPath)

  for (const parent of infra.parentInfrastructure) {
    findings.push(...walkInfrastructure(parent, required, nextPath, pathVisited))
  }

  return findings
}

/**
 * Recursively walks an Application, its `hostedOn` Infrastructure, and its
 * `components` (D-02: the container's own classification always happens
 * before — and independently of — descending into components, so a
 * composite Application is never hidden behind fully-compliant components).
 * Same cycle-safe visited-set contract as `walkInfrastructure` (D-03).
 */
function walkApplication(
  app: ApplicationNode,
  required: RequirementLevels,
  chainPath: readonly string[],
  visited: ReadonlySet<string>
): Finding[] {
  if (visited.has(app.id)) return []

  const pathVisited = new Set(visited)
  pathVisited.add(app.id)
  const nextPath = [...chainPath, app.id]

  const findings = classifyNode(app, required, chainPath)

  for (const infra of app.hostedOn) {
    findings.push(...walkInfrastructure(infra, required, nextPath, pathVisited))
  }
  for (const component of app.components) {
    findings.push(...walkApplication(component, required, nextPath, pathVisited))
  }

  return findings
}

/**
 * Recursively walks an AIComponent and the Infrastructure it is hosted on.
 * Same cycle-safe visited-set contract as `walkInfrastructure` (D-03).
 */
function walkAIComponent(
  aiComponent: AIComponentNode,
  required: RequirementLevels,
  chainPath: readonly string[],
  visited: ReadonlySet<string>
): Finding[] {
  if (visited.has(aiComponent.id)) return []

  const pathVisited = new Set(visited)
  pathVisited.add(aiComponent.id)
  const nextPath = [...chainPath, aiComponent.id]

  const findings = classifyNode(aiComponent, required, chainPath)

  for (const infra of aiComponent.hostedOn) {
    findings.push(...walkInfrastructure(infra, required, nextPath, pathVisited))
  }

  return findings
}

/**
 * Walks only a `SupportChain`'s own direct supporting Applications/
 * AIComponents (not any nested capability children) against its own
 * `required` levels. Every top-level supporting entity starts its own fresh
 * visited-set branch (D-01) seeded only with the root id, so multi-parent/
 * composite/AIComponent edges are always evaluated independently of one
 * another.
 */
function collectOwnFindings(chain: SupportChain): Finding[] {
  const findings: Finding[] = []

  for (const app of chain.supportingApplications) {
    findings.push(...walkApplication(app, chain.required, [chain.rootId], new Set([chain.rootId])))
  }
  for (const aiComponent of chain.supportingAIComponents) {
    findings.push(
      ...walkAIComponent(aiComponent, chain.required, [chain.rootId], new Set([chain.rootId]))
    )
  }

  return findings
}

/**
 * Shared analysis walk for any requirement root shape (`SupportChain`):
 * `analyzeDataObject` delegates here directly (a DataObject has no nested
 * children); `analyzeBusinessCapability` builds on `collectOwnFindings` plus
 * `walkChildCapabilities` below so detail views, diagram markers, and the
 * Temporal rollup never see two diverging traversal implementations
 * (RESEARCH.md Anti-Pattern 3).
 */
function analyzeSupportChain(
  chain: SupportChain,
  rootType: SovereigntyRootType
): SovereigntyAnalysis {
  const findings = collectOwnFindings(chain)

  return {
    rootId: chain.rootId,
    rootType,
    findings,
    selfStatus: 'GREY',
    downstreamStatus: aggregateDownstreamStatus(findings),
    capabilityIds: [chain.rootId],
    comparedCapabilityIds: [],
  }
}

/**
 * Recursively rolls up nested BusinessCapability children's (`HAS_PARENT`,
 * D-11) own findings into their ancestor, so a violation found only inside a
 * child/grandchild capability's own support chain still makes every
 * ancestor's `downstreamStatus` reflect it (worst-of-entire-subtree, per
 * user-confirmed expectation in nested-bc-sov-inheritance debug session).
 * Each nested finding's `chainPath` is re-prefixed with every ancestor id it
 * passed through on the way back up, so the displayed chain always starts at
 * the capability the caller asked about, not at the deepest descendant.
 *
 * Cycle-safe via the same per-branch visited-set contract as every other
 * walker in this module (D-03): each child gets its own copy of the
 * ancestor-visited set, so a capability re-entered on its own HAS_PARENT path
 * stops silently instead of recursing forever, while a capability shared by
 * two different parents (diamond shape) is still evaluated independently on
 * each path (D-01).
 */
interface CapabilitySubtreeResult {
  readonly findings: Finding[]
  readonly capabilityIds: string[]
  readonly comparedCapabilityIds: string[]
}

function analyzeCapabilitySubtree(
  chain: BusinessCapabilityChain,
  visited: ReadonlySet<string>
): CapabilitySubtreeResult {
  if (visited.has(chain.rootId))
    return { findings: [], capabilityIds: [], comparedCapabilityIds: [] }

  const pathVisited = new Set(visited)
  pathVisited.add(chain.rootId)

  const ownFindings = collectOwnFindings(chain)

  const descendantFindings: Finding[] = []
  const capabilityIds: string[] = [chain.rootId]
  const comparedCapabilityIds: string[] = []
  for (const child of chain.childCapabilities) {
    // D-03 cycle-safety: a `childCapabilities` entry that re-enters an
    // already-visited ancestor (including `chain` itself, an immediate
    // self-loop) must stop completely silently — no recursion AND no
    // contradiction finding. `analyzeCapabilitySubtree` below already no-ops
    // for this case (returns `{ findings: [], capabilityIds: [] }`) via its
    // own `pathVisited.has(child.rootId)` check, but the descendant-vs-parent
    // classifier is a flat call, not a recursive one, so it needs the same
    // guard explicitly here or it would still emit a spurious finding
    // comparing the cyclic node against this "parent" on the re-entrant edge.
    if (pathVisited.has(child.rootId)) continue

    const nested = analyzeCapabilitySubtree(child, pathVisited)
    for (const finding of nested.findings) {
      descendantFindings.push({ ...finding, chainPath: [chain.rootId, ...finding.chainPath] })
    }
    capabilityIds.push(...nested.capabilityIds)
    comparedCapabilityIds.push(...nested.comparedCapabilityIds)

    // Descendant-vs-immediate-parent contradiction (02.3 D-01 second half):
    // the parent (`chain`) is already in scope at this recursion level, so no
    // new fetch or traversal is needed — piggybacks on the existing walk.
    // Pushed directly (NOT re-prefixed like `nested.findings` above):
    // `classifyCapabilityAgainstParent` already produces the correct
    // `[chain.rootId, child.rootId]` chainPath for this level, and
    // re-prefixing again here would double-prepend `chain.rootId`.
    const { findings: parentCheckFindings, hasRealComparison } = classifyCapabilityAgainstParent(
      child,
      { id: chain.rootId, required: chain.required },
      []
    )
    descendantFindings.push(...parentCheckFindings)
    if (hasRealComparison) comparedCapabilityIds.push(child.rootId)
  }

  return {
    findings: [...ownFindings, ...descendantFindings],
    capabilityIds,
    comparedCapabilityIds,
  }
}

/**
 * Analyzes a BusinessCapability's full support chain: its own direct
 * supporting Applications (with their composite `components` and
 * multi-parent `hostedOn` Infrastructure) and AIComponents, PLUS — recursively
 * — every nested child BusinessCapability's own support chain (D-11), each
 * evaluated against that child's own requirements. `selfStatus` is
 * three-valued (03-CONTEXT.md D-01/D-02): YELLOW if any parent-vs-own
 * required-level contradiction was found, GREEN if no contradiction but at
 * least one real (non-excluded) dimension was compared against a parent,
 * GREY only when there is genuinely nothing to compare (no parent at all, or
 * every dimension excluded on every parent).
 */
export function analyzeBusinessCapability(chain: BusinessCapabilityChain): SovereigntyAnalysis {
  const {
    findings,
    capabilityIds,
    comparedCapabilityIds: nestedComparedIds,
  } = analyzeCapabilitySubtree(chain, new Set())

  const parentResults = chain.parentRequiredLevels.map(parentEntry =>
    classifyCapabilityAgainstParent(chain, parentEntry, [])
  )
  const parentContradictionFindings = parentResults.flatMap(r => r.findings)
  const rootHasRealComparison = parentResults.some(r => r.hasRealComparison)
  const combinedFindings = [...findings, ...parentContradictionFindings]
  const comparedCapabilityIds = rootHasRealComparison
    ? [...nestedComparedIds, chain.rootId]
    : nestedComparedIds

  // Blocker fix: this is the SAME data markers.ts independently derives its
  // own GREEN/GREY resolution from (via comparedCapabilityIds) — computing
  // selfStatus here from it, instead of a hardcoded 'GREY' literal, is what
  // keeps the `/sovereignty` detail page (this function's own selfStatus)
  // and the diagram markers (projectMarkers()'s SovereigntyMarker.selfStatus)
  // from ever disagreeing about the same capability.
  const selfStatus: SovereigntyStatus =
    parentContradictionFindings.length > 0 ? 'YELLOW' : rootHasRealComparison ? 'GREEN' : 'GREY'

  return {
    rootId: chain.rootId,
    rootType: 'businessCapability',
    findings: combinedFindings,
    selfStatus,
    downstreamStatus: aggregateDownstreamStatus(combinedFindings),
    capabilityIds,
    comparedCapabilityIds,
  }
}

/**
 * Analyzes a DataObject's full support chain: Applications that use it or
 * serve as one of its data sources, and AIComponents trained with it (D-08).
 * Shares `classifyNode`/`analyzeSupportChain` with `analyzeBusinessCapability`
 * so both root types are classified identically.
 */
export function analyzeDataObject(chain: DataObjectChain): SovereigntyAnalysis {
  return analyzeSupportChain(chain, 'dataObject')
}

/**
 * Analyzes a BusinessProcess's achieved-chain: own requirements vs. the
 * Applications it is directly supported by (D-02). Shares
 * `analyzeSupportChain`/`classifyNode`/`walkApplication` with
 * `analyzeBusinessCapability`/`analyzeDataObject` — no new leaf-node
 * walker is needed. Parent-consistency (`parentProcess`, D-04) lands in
 * a follow-up phase-4 plan.
 */
export function analyzeBusinessProcess(chain: BusinessProcessChain): SovereigntyAnalysis {
  return analyzeSupportChain(chain, 'businessProcess')
}
