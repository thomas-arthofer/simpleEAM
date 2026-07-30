import { graphqlRequest } from '../../src/graphql/client'
import type { SovereigntyScores } from '../../src/types/agents'

// ─────────────────────────────────────────────
// Activities
// ─────────────────────────────────────────────

/**
 * Delegates to the canonical `sovereigntyCompanyRollup` GraphQL query
 * (server/src/sovereignty/companyRollup.ts) instead of computing scores
 * itself — this retires the standalone MATURITY_SCORE-averaging formula
 * (SOV-05: one evaluator, every call site, including Temporal). The
 * resolver's shape already matches `SovereigntyScores`, so the response is
 * returned as-is.
 */
export async function computeSovereigntyScores(input: {
  readonly companyId: string
  readonly accessToken: string
}): Promise<SovereigntyScores> {
  const data = await graphqlRequest<{ sovereigntyCompanyRollup: SovereigntyScores }>({
    query: `
      query CompanyRollup($companyId: ID!) {
        sovereigntyCompanyRollup(companyId: $companyId) {
          expectedSovereigntyScore
          achievedSovereigntyScore
          sovereigntyGap
          sovereigntyScorePercent
        }
      }
    `,
    variables: { companyId: input.companyId },
    accessToken: input.accessToken,
  })

  return data.sovereigntyCompanyRollup
}

export async function updateCompanySovereigntyScores(input: {
  readonly companyId: string
  readonly scores: SovereigntyScores
  readonly accessToken: string
}): Promise<void> {
  await graphqlRequest({
    query: `
      mutation UpdateSovereigntyScores($id: ID!, $update: CompanyUpdateInput!) {
        updateCompanies(where: { id: { eq: $id } }, update: $update) { companies { id } }
      }
    `,
    variables: {
      id: input.companyId,
      update: {
        expectedSovereigntyScore: { set: input.scores.expectedSovereigntyScore },
        achievedSovereigntyScore: { set: input.scores.achievedSovereigntyScore },
        sovereigntyGap: { set: input.scores.sovereigntyGap },
        sovereigntyScorePercent: { set: input.scores.sovereigntyScorePercent },
        sovereigntyScoreStatus: { set: 'IDLE' },
      },
    },
    accessToken: input.accessToken,
  })
}

export async function markSovereigntyCalculating(input: {
  readonly companyId: string
  readonly accessToken: string
}): Promise<void> {
  await graphqlRequest({
    query: `
      mutation MarkSovereigntyCalculating($id: ID!, $update: CompanyUpdateInput!) {
        updateCompanies(where: { id: { eq: $id } }, update: $update) { companies { id } }
      }
    `,
    variables: { id: input.companyId, update: { sovereigntyScoreStatus: { set: 'CALCULATING' } } },
    accessToken: input.accessToken,
  })
}

export async function markSovereigntyError(input: {
  readonly companyId: string
  readonly accessToken: string
}): Promise<void> {
  await graphqlRequest({
    query: `
      mutation MarkSovereigntyError($id: ID!, $update: CompanyUpdateInput!) {
        updateCompanies(where: { id: { eq: $id } }, update: $update) { companies { id } }
      }
    `,
    variables: { id: input.companyId, update: { sovereigntyScoreStatus: { set: 'ERROR' } } },
    accessToken: input.accessToken,
  })
}
