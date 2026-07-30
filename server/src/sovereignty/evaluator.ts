import { SOVEREIGNTY_DIMENSIONS, SOVEREIGNTY_MATURITY_LEVELS } from './types'
import type {
  AchievedLevels,
  AIComponentNode,
  ApplicationNode,
  BusinessCapabilityChain,
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
 * Shared analysis walk for any requirement root shape (`SupportChain`):
 * `analyzeBusinessCapability` and `analyzeDataObject` both delegate here so
 * detail views, diagram markers, and the Temporal rollup never see two
 * diverging traversal implementations (RESEARCH.md Anti-Pattern 3). Every
 * top-level supporting entity starts its own fresh visited-set branch (D-01)
 * seeded only with the root id, so multi-parent/composite/AIComponent edges
 * are always evaluated independently of one another.
 */
function analyzeSupportChain(chain: SupportChain, rootType: SovereigntyRootType): SovereigntyAnalysis {
  const findings: Finding[] = []

  for (const app of chain.supportingApplications) {
    findings.push(...walkApplication(app, chain.required, [chain.rootId], new Set([chain.rootId])))
  }
  for (const aiComponent of chain.supportingAIComponents) {
    findings.push(
      ...walkAIComponent(aiComponent, chain.required, [chain.rootId], new Set([chain.rootId]))
    )
  }

  return {
    rootId: chain.rootId,
    rootType,
    findings,
    selfStatus: 'GREY',
    downstreamStatus: aggregateDownstreamStatus(findings),
  }
}

/**
 * Analyzes a BusinessCapability's full support chain: supporting Applications
 * (with their composite `components` and multi-parent `hostedOn`
 * Infrastructure) and supporting AIComponents. `selfStatus` is always GREY
 * (D-05) — a BusinessCapability owns no achieved rating of its own.
 */
export function analyzeBusinessCapability(chain: BusinessCapabilityChain): SovereigntyAnalysis {
  return analyzeSupportChain(chain, 'businessCapability')
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
