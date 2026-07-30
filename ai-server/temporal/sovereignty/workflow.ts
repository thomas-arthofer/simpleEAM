import { proxyActivities } from '@temporalio/workflow'
import type { SovereigntyScoreWorkflowInput, SovereigntyScores } from '../../src/types/agents'

type SovereigntyActivities = {
  computeSovereigntyScores: (input: {
    companyId: string
    accessToken: string
  }) => Promise<SovereigntyScores>
  updateCompanySovereigntyScores: (input: {
    companyId: string
    scores: SovereigntyScores
    accessToken: string
  }) => Promise<void>
  markSovereigntyCalculating: (input: { companyId: string; accessToken: string }) => Promise<void>
  markSovereigntyError: (input: { companyId: string; accessToken: string }) => Promise<void>
}

const {
  computeSovereigntyScores,
  updateCompanySovereigntyScores,
  markSovereigntyCalculating,
  markSovereigntyError,
} = proxyActivities<SovereigntyActivities>({
  startToCloseTimeout: '5 minutes',
  retry: { maximumAttempts: 3 },
})

export async function sovereigntyScoreWorkflow(
  input: SovereigntyScoreWorkflowInput
): Promise<void> {
  await markSovereigntyCalculating({ companyId: input.companyId, accessToken: input.accessToken })

  try {
    const scores = await computeSovereigntyScores({
      companyId: input.companyId,
      accessToken: input.accessToken,
    })
    await updateCompanySovereigntyScores({
      companyId: input.companyId,
      scores,
      accessToken: input.accessToken,
    })
  } catch (error) {
    try {
      await markSovereigntyError({ companyId: input.companyId, accessToken: input.accessToken })
    } catch {
      // best-effort — don't swallow original error
    }
    throw error
  }
}
