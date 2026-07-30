import type { Session } from 'neo4j-driver'
import { loadFullSupportChain } from './repository'
import { analyzeBusinessCapability, analyzeDataObject } from './evaluator'
import { SOVEREIGNTY_DIMENSIONS } from './types'
import type { Finding, RequirementLevels, SovereigntyMaturityLevel } from './types'

/**
 * Same 1-5 numeric scale as the retired `ai-server` MATURITY_SCORE map
 * (Task 2) — GREY/null-achieved maps to NONE's value (1) rather than being
 * dropped, so an entirely-GREY chain still pulls the company rollup's
 * achieved score down instead of being silently excluded (SOV-05 / D-06).
 */
const MATURITY_SCORE: Record<SovereigntyMaturityLevel, number> = {
  NONE: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  VERY_HIGH: 5,
}

export interface CompanyRollup {
  readonly expectedSovereigntyScore: number | null
  readonly achievedSovereigntyScore: number | null
  readonly sovereigntyGap: number | null
  readonly sovereigntyScorePercent: number | null
}

interface OwnedIds {
  readonly capabilityIds: readonly string[]
  readonly dataObjectIds: readonly string[]
}

async function loadOwnedIds(session: Session, companyId: string): Promise<OwnedIds> {
  const result = await session.run(
    `
    MATCH (c:Company {id: $companyId})
    OPTIONAL MATCH (c)<-[:OWNED_BY]-(cap:BusinessCapability)
    OPTIONAL MATCH (c)<-[:OWNED_BY]-(obj:DataObject)
    RETURN collect(DISTINCT cap.id) AS capabilityIds, collect(DISTINCT obj.id) AS dataObjectIds
    `,
    { companyId }
  )

  if (result.records.length === 0) return { capabilityIds: [], dataObjectIds: [] }

  const row = result.records[0].toObject() as {
    capabilityIds: (string | null)[]
    dataObjectIds: (string | null)[]
  }

  return {
    capabilityIds: row.capabilityIds.filter((id): id is string => Boolean(id)),
    dataObjectIds: row.dataObjectIds.filter((id): id is string => Boolean(id)),
  }
}

function pushRequiredScores(required: RequirementLevels, scores: number[]): void {
  for (const dimension of SOVEREIGNTY_DIMENSIONS) {
    const level = required[dimension]
    if (level !== null) scores.push(MATURITY_SCORE[level])
  }
}

/**
 * Findings are the canonical evaluator's own classification of every
 * non-GREEN dimension (RED = violated requirement, GREY = no achieved value
 * anywhere — see evaluator.ts's `classifyNode`). RED findings contribute
 * their actual achieved level; GREY findings contribute NONE's score (1)
 * rather than being skipped — the change from the retired formula's
 * `.filter((s): s is number => s !== null)` step that silently dropped
 * fully-GREY entities from the achieved array (must_haves truth #3).
 */
function pushAchievedScores(findings: readonly Finding[], scores: number[]): void {
  for (const finding of findings) {
    if (finding.status === 'RED' && finding.actualLevel !== null) {
      scores.push(MATURITY_SCORE[finding.actualLevel])
    } else if (finding.status === 'GREY') {
      scores.push(MATURITY_SCORE.NONE)
    }
  }
}

/**
 * Company-level sovereignty rollup (SOV-05): batches 02-01's canonical
 * evaluator (`analyzeBusinessCapability`/`analyzeDataObject`) across every
 * BusinessCapability/DataObject the company owns, replacing the retired
 * `ai-server` MATURITY_SCORE-averaging formula that queried entities
 * directly via separate GraphQL calls and silently dropped fully-GREY
 * entities from the achieved array. `expectedSovereigntyScore`/
 * `achievedSovereigntyScore` (and the gap/percent derived from them) are
 * `null` only when the company has zero graded requirement/achieved data
 * anywhere — mirrors the retired formula's null-when-empty behavior, not a
 * new invented default (D-06).
 */
export async function analyzeCompanyRollup(
  session: Session,
  companyId: string
): Promise<CompanyRollup> {
  const { capabilityIds, dataObjectIds } = await loadOwnedIds(session, companyId)

  const requiredScores: number[] = []
  const achievedScores: number[] = []

  for (const capabilityId of capabilityIds) {
    const chain = await loadFullSupportChain(
      session,
      [companyId],
      false,
      'businessCapability',
      capabilityId
    )
    if (!chain) continue
    pushRequiredScores(chain.required, requiredScores)
    if (chain.rootType === 'businessCapability') {
      const analysis = analyzeBusinessCapability(chain)
      pushAchievedScores(analysis.findings, achievedScores)
    }
  }

  for (const dataObjectId of dataObjectIds) {
    const chain = await loadFullSupportChain(session, [companyId], false, 'dataObject', dataObjectId)
    if (!chain) continue
    pushRequiredScores(chain.required, requiredScores)
    if (chain.rootType === 'dataObject') {
      const analysis = analyzeDataObject(chain)
      pushAchievedScores(analysis.findings, achievedScores)
    }
  }

  const expectedSovereigntyScore = requiredScores.length > 0 ? Math.max(...requiredScores) : null
  const achievedSovereigntyScore = achievedScores.length > 0 ? Math.min(...achievedScores) : null
  const sovereigntyGap =
    expectedSovereigntyScore !== null && achievedSovereigntyScore !== null
      ? expectedSovereigntyScore - achievedSovereigntyScore
      : null
  const sovereigntyScorePercent =
    expectedSovereigntyScore !== null &&
    achievedSovereigntyScore !== null &&
    expectedSovereigntyScore > 0
      ? (achievedSovereigntyScore / expectedSovereigntyScore) * 100
      : null

  return {
    expectedSovereigntyScore,
    achievedSovereigntyScore,
    sovereigntyGap,
    sovereigntyScorePercent,
  }
}
