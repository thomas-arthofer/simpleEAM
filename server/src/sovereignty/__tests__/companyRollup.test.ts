import neo4jDriver from '../../db/neo4j-client'
import { analyzeCompanyRollup } from '../companyRollup'

jest.mock('../../db/neo4j-client', () => ({
  __esModule: true,
  default: { session: jest.fn() },
}))

/**
 * Fixture rows for `company-1`: 2 BusinessCapabilities (`cap-1` with a RED
 * resilience finding, `cap-2` fully unowned-of-data/no-op) and 1 DataObject
 * (`do-grey`) whose only supporting Application has every achieved dimension
 * unset (entirely GREY chain, no achieved values anywhere) — the exact
 * `<behavior>` case from 02-04-PLAN.md Task 1: the GREY chain must still
 * count toward `achievedSovereigntyScore` instead of being filtered out.
 */
const OWNED_IDS: Record<string, { capabilityIds: string[]; dataObjectIds: string[] }> = {
  'company-1': { capabilityIds: ['cap-1', 'cap-2'], dataObjectIds: ['do-grey'] },
  'company-empty': { capabilityIds: [], dataObjectIds: [] },
}

const CHAIN_ROWS: Record<string, Record<string, unknown>> = {
  'cap-1': {
    id: 'cap-1',
    reqStrategicAutonomy: null,
    reqResilience: 'HIGH',
    reqSecurity: null,
    reqControl: null,
    appIds: ['app-1'],
    aiComponentIds: [],
    childIds: [],
  },
  'cap-2': {
    id: 'cap-2',
    reqStrategicAutonomy: null,
    reqResilience: null,
    reqSecurity: null,
    reqControl: null,
    appIds: [],
    aiComponentIds: [],
    childIds: [],
  },
  'do-grey': {
    id: 'do-grey',
    reqStrategicAutonomy: null,
    reqResilience: null,
    reqSecurity: null,
    reqControl: 'LOW',
    usedByAppIds: ['app-grey'],
    sourceAppIds: [],
    aiComponentIds: [],
  },
}

const NODE_ROWS: Record<string, Record<string, unknown>> = {
  'app-1': {
    id: 'app-1',
    name: 'App One',
    strategicAutonomy: 'MEDIUM',
    resilience: 'LOW',
    security: 'MEDIUM',
    control: 'MEDIUM',
    infraIds: [],
    componentIds: [],
  },
  'app-grey': {
    id: 'app-grey',
    name: 'Unassessed App',
    strategicAutonomy: null,
    resilience: null,
    security: null,
    control: null,
    infraIds: [],
    componentIds: [],
  },
}

function createStubSession() {
  return {
    run: jest.fn(async (_query: string, params: Record<string, unknown>) => {
      if ('rootId' in params) {
        const row = CHAIN_ROWS[params.rootId as string]
        return row ? { records: [{ toObject: () => row }] } : { records: [] }
      }
      if ('appId' in params || 'infraId' in params || 'aiComponentId' in params) {
        const id = (params.appId ?? params.infraId ?? params.aiComponentId) as string
        const row = NODE_ROWS[id]
        return row ? { records: [{ toObject: () => row }] } : { records: [] }
      }
      if ('companyId' in params) {
        const owned = OWNED_IDS[params.companyId as string] ?? {
          capabilityIds: [],
          dataObjectIds: [],
        }
        return { records: [{ toObject: () => owned }] }
      }
      return { records: [] }
    }),
    close: jest.fn(async () => undefined),
  }
}

describe('analyzeCompanyRollup', () => {
  it('counts an entirely-GREY DataObject chain toward achievedSovereigntyScore instead of excluding it', async () => {
    const stubSession = createStubSession()
    ;(neo4jDriver.session as jest.Mock).mockReturnValue(stubSession)

    const result = await analyzeCompanyRollup(stubSession as never, 'company-1')

    // requiredScores: cap-1 resilience=HIGH(4), do-grey control=LOW(2) -> max=4
    expect(result.expectedSovereigntyScore).toBe(4)
    // achievedScores: cap-1's app-1 RED resilience finding (LOW=2) plus
    // do-grey's app-grey 4 GREY findings all mapped to NONE(1) -> min=1.
    // If GREY had been filtered out (the retired formula's behavior) this
    // would be 2, not 1 — asserting 1 proves the GREY chain is counted.
    expect(result.achievedSovereigntyScore).toBe(1)
    expect(result.sovereigntyGap).toBe(3)
    expect(result.sovereigntyScorePercent).toBe(25)
  })

  it('returns all-null scores when the company owns zero graded BusinessCapabilities/DataObjects', async () => {
    const stubSession = createStubSession()
    ;(neo4jDriver.session as jest.Mock).mockReturnValue(stubSession)

    const result = await analyzeCompanyRollup(stubSession as never, 'company-empty')

    expect(result.expectedSovereigntyScore).toBeNull()
    expect(result.achievedSovereigntyScore).toBeNull()
    expect(result.sovereigntyGap).toBeNull()
    expect(result.sovereigntyScorePercent).toBeNull()
  })
})
