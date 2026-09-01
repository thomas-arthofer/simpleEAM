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
 *
 * `company-2` (Phase 4 04-02 Task 3): 1 fully-compliant BusinessCapability
 * (`cap-compliant-2`) plus 1 BusinessProcess (`proc-red`) with a RED
 * resilience violation — proves `analyzeCompanyRollup`'s achieved score
 * reflects the BusinessProcess's violation, not just BusinessCapability/
 * DataObject's.
 */
const OWNED_IDS: Record<
  string,
  { capabilityIds: string[]; dataObjectIds: string[]; businessProcessIds: string[] }
> = {
  'company-1': {
    capabilityIds: ['cap-1', 'cap-2'],
    dataObjectIds: ['do-grey'],
    businessProcessIds: [],
  },
  'company-2': {
    capabilityIds: ['cap-compliant-2'],
    dataObjectIds: [],
    businessProcessIds: ['proc-red'],
  },
  'company-3': {
    capabilityIds: ['cap-yellow'],
    dataObjectIds: [],
    businessProcessIds: [],
  },
  'company-empty': { capabilityIds: [], dataObjectIds: [], businessProcessIds: [] },
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
  'cap-compliant-2': {
    id: 'cap-compliant-2',
    reqStrategicAutonomy: null,
    reqResilience: null,
    reqSecurity: null,
    reqControl: 'HIGH',
    appIds: ['app-compliant-2'],
    aiComponentIds: [],
    childIds: [],
  },
  'proc-red': {
    id: 'proc-red',
    reqStrategicAutonomy: null,
    reqResilience: 'HIGH',
    reqSecurity: null,
    reqControl: null,
    appIds: ['app-proc-red'],
  },
  'cap-yellow': {
    id: 'cap-yellow',
    reqStrategicAutonomy: null,
    reqResilience: 'HIGH',
    reqSecurity: null,
    reqControl: null,
    appIds: ['app-yellow'],
    aiComponentIds: [],
    childIds: [],
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
  'app-compliant-2': {
    id: 'app-compliant-2',
    name: 'Compliant App 2',
    strategicAutonomy: 'HIGH',
    resilience: 'HIGH',
    security: 'HIGH',
    control: 'HIGH',
    infraIds: [],
    componentIds: [],
  },
  'app-proc-red': {
    id: 'app-proc-red',
    name: 'Process App Red',
    strategicAutonomy: 'HIGH',
    resilience: 'LOW',
    security: 'HIGH',
    control: 'HIGH',
    infraIds: [],
    componentIds: [],
  },
  'app-yellow': {
    id: 'app-yellow',
    name: 'Yellow App',
    strategicAutonomy: 'HIGH',
    // Req HIGH vs achieved MEDIUM → deviation 1 → YELLOW under Phase 5 D-02.
    resilience: 'MEDIUM',
    security: 'HIGH',
    control: 'HIGH',
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
          businessProcessIds: [],
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

  it('returns all-null scores when the company owns zero graded BusinessCapabilities/DataObjects/BusinessProcesses', async () => {
    const stubSession = createStubSession()
    ;(neo4jDriver.session as jest.Mock).mockReturnValue(stubSession)

    const result = await analyzeCompanyRollup(stubSession as never, 'company-empty')

    expect(result.expectedSovereigntyScore).toBeNull()
    expect(result.achievedSovereigntyScore).toBeNull()
    expect(result.sovereigntyGap).toBeNull()
    expect(result.sovereigntyScorePercent).toBeNull()
  })

  // Phase 4 04-02 Task 3 (SOV-05 cross-surface consistency): `company-2` owns
  // one fully-compliant BusinessCapability (contributes zero achieved-score
  // entries) and one BusinessProcess with a RED resilience violation. The
  // combined achievedSovereigntyScore must reflect the BusinessProcess's RED
  // finding — proving `analyzeCompanyRollup` folds BusinessProcess into the
  // same min/max computation as BusinessCapability/DataObject, not excluding
  // it.
  it("includes a BusinessProcess's achieved/required scores in the company-wide rollup (Test B)", async () => {
    const stubSession = createStubSession()
    ;(neo4jDriver.session as jest.Mock).mockReturnValue(stubSession)

    const result = await analyzeCompanyRollup(stubSession as never, 'company-2')

    // requiredScores: cap-compliant-2 control=HIGH(4), proc-red resilience=HIGH(4) -> max=4
    expect(result.expectedSovereigntyScore).toBe(4)
    // achievedScores: cap-compliant-2 is fully compliant (contributes
    // nothing); proc-red's app-proc-red RED resilience finding (LOW=2) is the
    // only entry -> min=2. If BusinessProcess were excluded from the rollup,
    // achievedScores would be empty and this would resolve null instead.
    expect(result.achievedSovereigntyScore).toBe(2)
    expect(result.sovereigntyGap).toBe(2)
    expect(result.sovereigntyScorePercent).toBe(50)
  })

  // Phase 5 D-02 / RESEARCH §8: pre-Phase-5 pushAchievedScores had only RED
  // and GREY branches — the evaluator now emits YELLOW for 1-step
  // deviations, and without the added YELLOW branch here those findings
  // would silently drop out, hiding degraded companies as fully-compliant.
  it('YELLOW findings contribute their actualLevel to achievedSovereigntyScore (Phase 5)', async () => {
    const stubSession = createStubSession()
    ;(neo4jDriver.session as jest.Mock).mockReturnValue(stubSession)

    const result = await analyzeCompanyRollup(stubSession as never, 'company-3')

    // requiredScores: cap-yellow resilience=HIGH(4) → max=4
    expect(result.expectedSovereigntyScore).toBe(4)
    // achievedScores: app-yellow's resilience MEDIUM=3 (YELLOW: 1-step
    // deviation from HIGH). Under the pre-Phase-5 rollup this YELLOW
    // finding was silently dropped and the score resolved null — asserting
    // 3 here proves the YELLOW branch of pushAchievedScores exists and
    // contributes to the rollup.
    expect(result.achievedSovereigntyScore).toBe(3)
    expect(result.sovereigntyGap).toBe(1)
    expect(result.sovereigntyScorePercent).toBe(75)
  })
})
