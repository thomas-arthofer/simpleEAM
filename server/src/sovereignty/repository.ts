import type { Session } from 'neo4j-driver'
import type {
  ApplicationNode,
  BusinessCapabilityChain,
  InfrastructureNode,
  RequirementLevels,
  SovereigntyMaturityLevel,
} from './types'

interface CapabilityChainRow {
  capabilityId: string | null
  reqStrategicAutonomy: string | null
  reqResilience: string | null
  reqSecurity: string | null
  reqControl: string | null
  appId: string | null
  appName: string | null
  appStrategicAutonomy: string | null
  appResilience: string | null
  appSecurity: string | null
  appControl: string | null
  infraId: string | null
  infraName: string | null
  infraStrategicAutonomy: string | null
  infraResilience: string | null
  infraSecurity: string | null
  infraControl: string | null
}

function toMaturityLevel(value: string | null | undefined): SovereigntyMaturityLevel | null {
  return (value as SovereigntyMaturityLevel | null | undefined) ?? null
}

/**
 * Loads a BusinessCapability's own sovereignty requirements plus a single hop
 * of supporting Applications and the Infrastructure each is directly hosted
 * on (no multi-parent, no composite `components` walk, no AIComponent — see
 * Task 2 for the full-chain expansion).
 *
 * The `$isAdmin OR c.id IN $companyIds` filter mirrors the `@authorization`
 * filter block every other type in schema.graphql already has, since this
 * custom resolver bypasses that directive entirely. This is defense-in-depth
 * only — the resolver performs the authoritative JWT company/role check
 * before this function is ever called (T-02-01).
 *
 * Returns `null` when the capability does not exist or is not owned by a
 * company in `companyIds` (and the caller is not admin).
 */
export async function loadBusinessCapabilityChain(
  session: Session,
  companyIds: readonly string[],
  isAdmin: boolean,
  capabilityId: string
): Promise<BusinessCapabilityChain | null> {
  const result = await session.run(
    `
    MATCH (cap:BusinessCapability {id: $capabilityId})-[:OWNED_BY]->(c:Company)
    WHERE $isAdmin OR c.id IN $companyIds
    WITH DISTINCT cap
    OPTIONAL MATCH (cap)<-[:SUPPORTS]-(app:Application)
    OPTIONAL MATCH (app)-[:HOSTED_ON]->(infra:Infrastructure)
    RETURN
      cap.id AS capabilityId,
      cap.sovereigntyReqStrategicAutonomy AS reqStrategicAutonomy,
      cap.sovereigntyReqResilience AS reqResilience,
      cap.sovereigntyReqSecurity AS reqSecurity,
      cap.sovereigntyReqControl AS reqControl,
      app.id AS appId,
      app.name AS appName,
      app.sovereigntyAchStrategicAutonomy AS appStrategicAutonomy,
      app.sovereigntyAchResilience AS appResilience,
      app.sovereigntyAchSecurity AS appSecurity,
      app.sovereigntyAchControl AS appControl,
      infra.id AS infraId,
      infra.name AS infraName,
      infra.sovereigntyAchStrategicAutonomy AS infraStrategicAutonomy,
      infra.sovereigntyAchResilience AS infraResilience,
      infra.sovereigntyAchSecurity AS infraSecurity,
      infra.sovereigntyAchControl AS infraControl
    `,
    { capabilityId, companyIds: [...companyIds], isAdmin }
  )

  if (result.records.length === 0) {
    return null
  }

  const rows = result.records.map(record => record.toObject() as CapabilityChainRow)
  const first = rows[0]
  if (!first.capabilityId) {
    return null
  }

  const required: RequirementLevels = {
    strategicAutonomy: toMaturityLevel(first.reqStrategicAutonomy),
    resilience: toMaturityLevel(first.reqResilience),
    security: toMaturityLevel(first.reqSecurity),
    control: toMaturityLevel(first.reqControl),
  }

  const applications = new Map<string, ApplicationNode>()
  const infrastructureByApp = new Map<string, Map<string, InfrastructureNode>>()

  for (const row of rows) {
    if (!row.appId) continue

    if (!applications.has(row.appId)) {
      applications.set(row.appId, {
        id: row.appId,
        name: row.appName ?? row.appId,
        type: 'application',
        achieved: {
          strategicAutonomy: toMaturityLevel(row.appStrategicAutonomy),
          resilience: toMaturityLevel(row.appResilience),
          security: toMaturityLevel(row.appSecurity),
          control: toMaturityLevel(row.appControl),
        },
        hostedOn: [],
      })
      infrastructureByApp.set(row.appId, new Map())
    }

    if (row.infraId) {
      const infraMap = infrastructureByApp.get(row.appId)!
      if (!infraMap.has(row.infraId)) {
        infraMap.set(row.infraId, {
          id: row.infraId,
          name: row.infraName ?? row.infraId,
          type: 'infrastructure',
          achieved: {
            strategicAutonomy: toMaturityLevel(row.infraStrategicAutonomy),
            resilience: toMaturityLevel(row.infraResilience),
            security: toMaturityLevel(row.infraSecurity),
            control: toMaturityLevel(row.infraControl),
          },
        })
      }
    }
  }

  const supportingApplications: ApplicationNode[] = Array.from(applications.values()).map(app => ({
    ...app,
    hostedOn: Array.from(infrastructureByApp.get(app.id)?.values() ?? []),
  }))

  return {
    rootId: first.capabilityId,
    rootType: 'businessCapability',
    required,
    supportingApplications,
  }
}
