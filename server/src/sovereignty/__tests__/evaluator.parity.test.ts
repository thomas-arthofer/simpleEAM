import { ZodError } from 'zod'
import { analyzeBusinessCapability } from '../evaluator'
import { sovereigntyResolvers } from '../graphql/resolvers'
import { sovereigntyAnalysisArgsSchema, sovereigntyMarkerNodesSchema } from '../validation'
import { redChainFixture } from './fixtures'
import neo4jDriver from '../../db/neo4j-client'

jest.mock('../../db/neo4j-client', () => ({
  __esModule: true,
  default: { session: jest.fn() },
}))

/**
 * Reverse of resolvers.ts's DIMENSION_ENUM_MAP — used only to normalize the
 * GraphQL DTO's dimension enum back to the internal camelCase key so this
 * test can assert the two Finding[] outputs are byte-identical, not that the
 * GraphQL wrapper format happens to match the internal type shape.
 */
const DIMENSION_REVERSE_MAP: Record<string, string> = {
  STRATEGIC_AUTONOMY: 'strategicAutonomy',
  RESILIENCE: 'resilience',
  SECURITY: 'security',
  CONTROL: 'control',
}

/**
 * A row-shaped stub matching exactly what `redChainFixture` (the
 * eam-konzept.md worked example) would look like coming back from Neo4j,
 * keyed by the id each of repository.ts's `session.run` calls is made with
 * (`rootId`/`appId`/`infraId`/`aiComponentId` — every id is unique in this
 * fixture, so a single lookup table is enough).
 */
const FIXTURE_ROWS: Record<string, Record<string, unknown>> = {
  'cap-abrechnung': {
    id: 'cap-abrechnung',
    reqStrategicAutonomy: 'MEDIUM',
    reqResilience: 'HIGH',
    reqSecurity: 'MEDIUM',
    reqControl: 'MEDIUM',
    appIds: ['app-billing'],
    aiComponentIds: [],
    childIds: [],
  },
  'app-billing': {
    id: 'app-billing',
    name: 'Billing',
    strategicAutonomy: 'MEDIUM',
    resilience: 'HIGH',
    security: 'MEDIUM',
    control: 'MEDIUM',
    infraIds: ['infra-vm-web-03'],
    componentIds: [],
  },
  'infra-vm-web-03': {
    id: 'infra-vm-web-03',
    name: 'VM-web-03',
    strategicAutonomy: 'MEDIUM',
    resilience: 'LOW',
    security: 'MEDIUM',
    control: 'MEDIUM',
    parentIds: [],
  },
}

function createStubSession() {
  return {
    run: jest.fn(async (_query: string, params: Record<string, unknown>) => {
      const id = (params.rootId ?? params.appId ?? params.infraId ?? params.aiComponentId) as
        string | undefined
      const row = id ? FIXTURE_ROWS[id] : undefined
      if (!row) return { records: [] }
      return { records: [{ toObject: () => row }] }
    }),
    close: jest.fn(async () => undefined),
  }
}

function makeToken(companyIds: string[]): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({ company_ids: companyIds, realm_access: { roles: [] } })
  ).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('SOV-05: resolver path vs direct module call parity', () => {
  it('produces byte-identical Finding[] output for the same fixture id set', async () => {
    const directResult = analyzeBusinessCapability(redChainFixture)

    const stubSession = createStubSession()
    ;(neo4jDriver.session as jest.Mock).mockReturnValue(stubSession)

    const resolverResult = (await sovereigntyResolvers.Query.sovereigntyAnalysis(
      null,
      { companyId: 'company-x', rootType: 'businessCapability', rootId: 'cap-abrechnung' },
      { token: makeToken(['company-x']) }
    )) as {
      rootId: string
      rootType: string
      selfStatus: string
      downstreamStatus: string
      findings: Array<Record<string, unknown> & { dimension: string }>
    }

    const normalizedResolverFindings = resolverResult.findings.map(finding => {
      // `chainNodes` (SOV-04 chain readability) is an additive GraphQL-only
      // enrichment computed from `chainPath` + `collectChainLabels` — it has
      // no counterpart on the internal `Finding` type, so it is stripped
      // before the byte-identical comparison below, exactly like the
      // `dimension` enum normalization above.
      const { chainNodes: _chainNodes, ...rest } = finding
      return {
        ...rest,
        dimension: DIMENSION_REVERSE_MAP[finding.dimension],
      }
    })

    expect(resolverResult.rootId).toEqual(directResult.rootId)
    expect(resolverResult.rootType).toEqual(directResult.rootType)
    expect(resolverResult.selfStatus).toEqual(directResult.selfStatus)
    expect(resolverResult.downstreamStatus).toEqual(directResult.downstreamStatus)
    expect(normalizedResolverFindings).toEqual(directResult.findings)
  })
})

describe('T-02-04 / T-02-05: input validation at the resolver boundary', () => {
  it('rejects (not truncates) a sovereigntyMarkers nodes array over the 500-node cap', () => {
    const oversized = Array.from({ length: 501 }, (_, i) => ({
      id: `node-${i}`,
      type: 'application',
    }))

    expect(() => sovereigntyMarkerNodesSchema.parse(oversized)).toThrow(ZodError)
  })

  it('accepts exactly 500 nodes (the cap boundary itself is valid)', () => {
    const atCap = Array.from({ length: 500 }, (_, i) => ({ id: `node-${i}`, type: 'application' }))

    expect(sovereigntyMarkerNodesSchema.parse(atCap)).toHaveLength(500)
  })

  it('rejects a malformed rootType before any Cypher would run', () => {
    expect(() =>
      sovereigntyAnalysisArgsSchema.parse({
        companyId: 'company-x',
        rootType: 'notARealRootType',
        rootId: 'cap-abrechnung',
      })
    ).toThrow(ZodError)
  })

  it('propagates the ZodError from Query.sovereigntyMarkers when nodes exceeds the cap, without opening a session', async () => {
    const sessionFactory = jest.fn()
    ;(neo4jDriver.session as jest.Mock).mockImplementation(sessionFactory)

    const oversized = Array.from({ length: 501 }, (_, i) => ({
      id: `node-${i}`,
      type: 'application',
    }))

    await expect(
      sovereigntyResolvers.Query.sovereigntyMarkers(
        null,
        {
          companyId: 'company-x',
          rootType: 'businessCapability',
          rootId: 'cap-abrechnung',
          nodes: oversized,
        },
        { token: makeToken(['company-x']) }
      )
    ).rejects.toThrow(ZodError)

    expect(sessionFactory).not.toHaveBeenCalled()
  })
})
