import { SOVEREIGNTY_DIMENSIONS, SOVEREIGNTY_MATURITY_LEVELS } from './types'
import type {
  AchievedLevels,
  BusinessCapabilityChain,
  Finding,
  RequirementLevels,
  SovereigntyAnalysis,
  SovereigntyMaturityLevel,
  SovereigntyStatus,
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
 * Analyzes a BusinessCapability's single hop of supporting Applications and
 * the Infrastructure they are directly hosted on. `selfStatus` is always GREY
 * (D-05) — a BusinessCapability owns no achieved rating of its own.
 */
export function analyzeBusinessCapability(chain: BusinessCapabilityChain): SovereigntyAnalysis {
  const findings: Finding[] = []

  for (const app of chain.supportingApplications) {
    findings.push(...classifyNode(app, chain.required, [chain.rootId]))
    for (const infra of app.hostedOn) {
      findings.push(...classifyNode(infra, chain.required, [chain.rootId, app.id]))
    }
  }

  return {
    rootId: chain.rootId,
    rootType: 'businessCapability',
    findings,
    selfStatus: 'GREY',
    downstreamStatus: aggregateDownstreamStatus(findings),
  }
}
