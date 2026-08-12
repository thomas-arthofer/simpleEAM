import type { Session } from 'neo4j-driver'
import type {
  AIComponentNode,
  ApplicationNode,
  BusinessCapabilityChain,
  BusinessProcessChain,
  DataObjectChain,
  InfrastructureNode,
  RequirementLevels,
  SovereigntyMaturityLevel,
  SovereigntyRootType,
} from './types'

function toMaturityLevel(value: string | null | undefined): SovereigntyMaturityLevel | null {
  return (value as SovereigntyMaturityLevel | null | undefined) ?? null
}

function nonNullIds(ids: readonly (string | null)[]): string[] {
  return ids.filter((id): id is string => Boolean(id))
}

interface AchievedRow {
  id: string
  name: string | null
  strategicAutonomy: string | null
  resilience: string | null
  security: string | null
  control: string | null
}

/**
 * Per-fetch memoization: once a node has been built for a given id, every
 * further reference to that id (e.g. a diamond-shaped multi-parent edge)
 * reuses the same object rather than re-querying Neo4j. `inFlight` guards
 * against genuine cycles in the underlying graph data (a Infrastructure that
 * is its own transitive parent, etc.) — while an id is `inFlight` a repeat
 * visit to it stops immediately instead of recursing forever (T-02-03 /
 * D-03). This is a build-time guard only; the evaluator applies its own
 * independent, per-path visited-set guard when it later walks the returned
 * (possibly cyclic) object graph.
 */
interface NodeCache {
  readonly applications: Map<string, ApplicationNode>
  readonly infrastructures: Map<string, InfrastructureNode>
  readonly aiComponents: Map<string, AIComponentNode>
  readonly capabilities: Map<string, BusinessCapabilityChain>
}

function createNodeCache(): NodeCache {
  return {
    applications: new Map(),
    infrastructures: new Map(),
    aiComponents: new Map(),
    capabilities: new Map(),
  }
}

async function fetchInfrastructure(
  session: Session,
  infraId: string,
  cache: NodeCache,
  inFlight: Set<string>
): Promise<InfrastructureNode | null> {
  const cached = cache.infrastructures.get(infraId)
  if (cached) return cached
  if (inFlight.has(infraId)) return null
  inFlight.add(infraId)

  const result = await session.run(
    `
    MATCH (infra:Infrastructure {id: $infraId})
    OPTIONAL MATCH (infra)-[:HAS_PARENT_INFRASTRUCTURE]->(parent:Infrastructure)
    RETURN
      infra.id AS id,
      infra.name AS name,
      infra.sovereigntyAchStrategicAutonomy AS strategicAutonomy,
      infra.sovereigntyAchResilience AS resilience,
      infra.sovereigntyAchSecurity AS security,
      infra.sovereigntyAchControl AS control,
      collect(DISTINCT parent.id) AS parentIds
    `,
    { infraId }
  )

  if (result.records.length === 0) {
    inFlight.delete(infraId)
    return null
  }

  const row = result.records[0].toObject() as AchievedRow & { parentIds: (string | null)[] }

  const node: InfrastructureNode = {
    id: row.id,
    name: row.name ?? row.id,
    type: 'infrastructure',
    achieved: {
      strategicAutonomy: toMaturityLevel(row.strategicAutonomy),
      resilience: toMaturityLevel(row.resilience),
      security: toMaturityLevel(row.security),
      control: toMaturityLevel(row.control),
    },
    parentInfrastructure: [],
  }
  cache.infrastructures.set(infraId, node)

  const parentInfrastructure: InfrastructureNode[] = []
  for (const parentId of nonNullIds(row.parentIds)) {
    const parent = await fetchInfrastructure(session, parentId, cache, inFlight)
    if (parent) parentInfrastructure.push(parent)
  }
  ;(node as unknown as { parentInfrastructure: InfrastructureNode[] }).parentInfrastructure =
    parentInfrastructure

  inFlight.delete(infraId)
  return node
}

async function fetchAIComponent(
  session: Session,
  aiComponentId: string,
  cache: NodeCache,
  inFlight: Set<string>
): Promise<AIComponentNode | null> {
  const cached = cache.aiComponents.get(aiComponentId)
  if (cached) return cached
  if (inFlight.has(aiComponentId)) return null
  inFlight.add(aiComponentId)

  const result = await session.run(
    `
    MATCH (ai:AIComponent {id: $aiComponentId})
    OPTIONAL MATCH (ai)-[:HOSTED_ON]->(infra:Infrastructure)
    RETURN
      ai.id AS id,
      ai.name AS name,
      ai.sovereigntyAchStrategicAutonomy AS strategicAutonomy,
      ai.sovereigntyAchResilience AS resilience,
      ai.sovereigntyAchSecurity AS security,
      ai.sovereigntyAchControl AS control,
      collect(DISTINCT infra.id) AS infraIds
    `,
    { aiComponentId }
  )

  if (result.records.length === 0) {
    inFlight.delete(aiComponentId)
    return null
  }

  const row = result.records[0].toObject() as AchievedRow & { infraIds: (string | null)[] }

  const node: AIComponentNode = {
    id: row.id,
    name: row.name ?? row.id,
    type: 'aiComponent',
    achieved: {
      strategicAutonomy: toMaturityLevel(row.strategicAutonomy),
      resilience: toMaturityLevel(row.resilience),
      security: toMaturityLevel(row.security),
      control: toMaturityLevel(row.control),
    },
    hostedOn: [],
  }
  cache.aiComponents.set(aiComponentId, node)

  const hostedOn: InfrastructureNode[] = []
  for (const infraId of nonNullIds(row.infraIds)) {
    const infra = await fetchInfrastructure(session, infraId, cache, inFlight)
    if (infra) hostedOn.push(infra)
  }
  ;(node as unknown as { hostedOn: InfrastructureNode[] }).hostedOn = hostedOn

  inFlight.delete(aiComponentId)
  return node
}

async function fetchApplication(
  session: Session,
  appId: string,
  cache: NodeCache,
  inFlight: Set<string>
): Promise<ApplicationNode | null> {
  const cached = cache.applications.get(appId)
  if (cached) return cached
  if (inFlight.has(appId)) return null
  inFlight.add(appId)

  const result = await session.run(
    `
    MATCH (app:Application {id: $appId})
    OPTIONAL MATCH (app)-[:HOSTED_ON]->(infra:Infrastructure)
    OPTIONAL MATCH (app)<-[:HAS_PARENT_APPLICATION]-(component:Application)
    RETURN
      app.id AS id,
      app.name AS name,
      app.sovereigntyAchStrategicAutonomy AS strategicAutonomy,
      app.sovereigntyAchResilience AS resilience,
      app.sovereigntyAchSecurity AS security,
      app.sovereigntyAchControl AS control,
      collect(DISTINCT infra.id) AS infraIds,
      collect(DISTINCT component.id) AS componentIds
    `,
    { appId }
  )

  if (result.records.length === 0) {
    inFlight.delete(appId)
    return null
  }

  const row = result.records[0].toObject() as AchievedRow & {
    infraIds: (string | null)[]
    componentIds: (string | null)[]
  }

  const node: ApplicationNode = {
    id: row.id,
    name: row.name ?? row.id,
    type: 'application',
    achieved: {
      strategicAutonomy: toMaturityLevel(row.strategicAutonomy),
      resilience: toMaturityLevel(row.resilience),
      security: toMaturityLevel(row.security),
      control: toMaturityLevel(row.control),
    },
    hostedOn: [],
    components: [],
  }
  cache.applications.set(appId, node)

  const hostedOn: InfrastructureNode[] = []
  for (const infraId of nonNullIds(row.infraIds)) {
    const infra = await fetchInfrastructure(session, infraId, cache, inFlight)
    if (infra) hostedOn.push(infra)
  }
  const components: ApplicationNode[] = []
  for (const componentId of nonNullIds(row.componentIds)) {
    const component = await fetchApplication(session, componentId, cache, inFlight)
    if (component) components.push(component)
  }
  ;(node as unknown as { hostedOn: InfrastructureNode[] }).hostedOn = hostedOn
  ;(node as unknown as { components: ApplicationNode[] }).components = components

  inFlight.delete(appId)
  return node
}

/**
 * Loads a BusinessCapability's own requirements plus its full support chain:
 * supporting Applications (recursively expanded through `components` and
 * `hostedOn`, including multi-parent `parentInfrastructure`), supporting
 * AIComponents, and — recursively — every nested child BusinessCapability
 * (`HAS_PARENT` incoming edges, D-11), each with its own full support chain.
 * Returns `null` when the capability does not exist or is not owned by a
 * company in `companyIds` (and the caller is not admin).
 *
 * Shares `cache`/`inFlight` with the top-level `loadBusinessCapabilitySupportChain`
 * call (and with every nested child fetch) so a capability/Application/
 * Infrastructure/AIComponent referenced from multiple places in the subtree is
 * only queried once (same per-fetch memoization contract as
 * `fetchApplication`/`fetchInfrastructure`/`fetchAIComponent`).
 *
 * `isRoot` (02.3 D-01 root-only scoping): only `true` for the very first call
 * from `loadBusinessCapabilitySupportChain`. It gates the Cypher's direct
 * `HAS_PARENT`-OUT match — recursive calls for `childCapabilities` always
 * pass `false` (the default), so a nested capability's own parents (which,
 * for a subtree recursion, would just be the current node and would cause
 * confusing double-counting) are never fetched; descendant-vs-parent
 * contradictions for nested capabilities are instead classified in
 * `evaluator.ts`'s `analyzeCapabilitySubtree` using the already-in-scope
 * parent from the recursive walk itself.
 */
async function fetchBusinessCapabilityChain(
  session: Session,
  companyIds: readonly string[],
  isAdmin: boolean,
  rootId: string,
  cache: NodeCache,
  inFlight: Set<string>,
  isRoot = false
): Promise<BusinessCapabilityChain | null> {
  const cached = cache.capabilities.get(rootId)
  if (cached) return cached
  if (inFlight.has(rootId)) return null
  inFlight.add(rootId)

  // T-02.3-04: the parent match is scoped to the caller's own company
  // (or admin) exactly like the root's own `OWNED_BY` check above, so a
  // parent belonging to a different tenant is silently excluded rather than
  // leaking its required levels into `parentRequiredRows`.
  const parentMatchClause = isRoot
    ? `
    OPTIONAL MATCH (cap)-[:HAS_PARENT]->(parent:BusinessCapability)-[:OWNED_BY]->(parentCompany:Company)
    WHERE parent IS NULL OR $isAdmin OR parentCompany.id IN $companyIds`
    : ''
  const parentReturnClause = isRoot
    ? `collect(DISTINCT parent { .id, .name, .sovereigntyReqStrategicAutonomy, .sovereigntyReqResilience, .sovereigntyReqSecurity, .sovereigntyReqControl }) AS parentRequiredRows`
    : '[] AS parentRequiredRows'

  const result = await session.run(
    `
    MATCH (cap:BusinessCapability {id: $rootId})-[:OWNED_BY]->(c:Company)
    WHERE $isAdmin OR c.id IN $companyIds
    WITH DISTINCT cap
    OPTIONAL MATCH (cap)<-[:SUPPORTS]-(app:Application)
    OPTIONAL MATCH (cap)<-[:SUPPORTS]-(aiComponent:AIComponent)
    OPTIONAL MATCH (cap)<-[:HAS_PARENT]-(child:BusinessCapability)
    ${parentMatchClause}
    RETURN
      cap.id AS id,
      cap.name AS name,
      cap.sovereigntyReqStrategicAutonomy AS reqStrategicAutonomy,
      cap.sovereigntyReqResilience AS reqResilience,
      cap.sovereigntyReqSecurity AS reqSecurity,
      cap.sovereigntyReqControl AS reqControl,
      collect(DISTINCT app.id) AS appIds,
      collect(DISTINCT aiComponent.id) AS aiComponentIds,
      collect(DISTINCT child.id) AS childIds,
      ${parentReturnClause}
    `,
    { rootId, companyIds: [...companyIds], isAdmin }
  )

  if (result.records.length === 0) {
    inFlight.delete(rootId)
    return null
  }

  const row = result.records[0].toObject() as {
    id: string | null
    name: string | null
    reqStrategicAutonomy: string | null
    reqResilience: string | null
    reqSecurity: string | null
    reqControl: string | null
    appIds: (string | null)[]
    aiComponentIds: (string | null)[]
    childIds: (string | null)[]
    parentRequiredRows: {
      id: string | null
      name: string | null
      sovereigntyReqStrategicAutonomy: string | null
      sovereigntyReqResilience: string | null
      sovereigntyReqSecurity: string | null
      sovereigntyReqControl: string | null
    }[]
  }
  if (!row.id) {
    inFlight.delete(rootId)
    return null
  }

  const required: RequirementLevels = {
    strategicAutonomy: toMaturityLevel(row.reqStrategicAutonomy),
    resilience: toMaturityLevel(row.reqResilience),
    security: toMaturityLevel(row.reqSecurity),
    control: toMaturityLevel(row.reqControl),
  }

  const supportingApplications: ApplicationNode[] = []
  for (const appId of nonNullIds(row.appIds)) {
    const app = await fetchApplication(session, appId, cache, inFlight)
    if (app) supportingApplications.push(app)
  }

  const supportingAIComponents: AIComponentNode[] = []
  for (const aiComponentId of nonNullIds(row.aiComponentIds)) {
    const aiComponent = await fetchAIComponent(session, aiComponentId, cache, inFlight)
    if (aiComponent) supportingAIComponents.push(aiComponent)
  }

  const childCapabilities: BusinessCapabilityChain[] = []
  for (const childId of nonNullIds(row.childIds)) {
    const child = await fetchBusinessCapabilityChain(
      session,
      companyIds,
      isAdmin,
      childId,
      cache,
      inFlight
    )
    if (child) childCapabilities.push(child)
  }

  const parentRequiredLevels = (row.parentRequiredRows ?? [])
    .filter((parentRow): parentRow is typeof parentRow & { id: string } => Boolean(parentRow?.id))
    .map(parentRow => ({
      id: parentRow.id,
      name: parentRow.name ?? parentRow.id,
      required: {
        strategicAutonomy: toMaturityLevel(parentRow.sovereigntyReqStrategicAutonomy),
        resilience: toMaturityLevel(parentRow.sovereigntyReqResilience),
        security: toMaturityLevel(parentRow.sovereigntyReqSecurity),
        control: toMaturityLevel(parentRow.sovereigntyReqControl),
      },
    }))

  const node: BusinessCapabilityChain = {
    rootId: row.id,
    name: row.name ?? row.id,
    rootType: 'businessCapability',
    required,
    supportingApplications,
    supportingAIComponents,
    childCapabilities,
    parentRequiredLevels,
  }
  cache.capabilities.set(rootId, node)

  inFlight.delete(rootId)
  return node
}

/**
 * Entry point for a BusinessCapability chain load: creates a fresh
 * per-request `cache`/`inFlight` pair and delegates to
 * `fetchBusinessCapabilityChain`, requesting the root-only parent-required-
 * levels fetch (02.3 D-01) via `isRoot: true`.
 */
async function loadBusinessCapabilitySupportChain(
  session: Session,
  companyIds: readonly string[],
  isAdmin: boolean,
  rootId: string
): Promise<BusinessCapabilityChain | null> {
  const cache = createNodeCache()
  const inFlight = new Set<string>()
  return fetchBusinessCapabilityChain(session, companyIds, isAdmin, rootId, cache, inFlight, true)
}

/**
 * Loads a DataObject's own requirements plus its full support chain:
 * Applications that use it (`usedByApplications`) or serve as one of its
 * data sources (`dataSources`), and AIComponents trained with it
 * (`usedForTrainingAI`) — D-08: Application/AIComponent/Infrastructure only,
 * no Supplier. Returns `null` when the DataObject does not exist or is not
 * owned by a company in `companyIds` (and the caller is not admin).
 */
async function loadDataObjectSupportChain(
  session: Session,
  companyIds: readonly string[],
  isAdmin: boolean,
  rootId: string
): Promise<DataObjectChain | null> {
  const result = await session.run(
    `
    MATCH (obj:DataObject {id: $rootId})-[:OWNED_BY]->(c:Company)
    WHERE $isAdmin OR c.id IN $companyIds
    WITH DISTINCT obj
    OPTIONAL MATCH (obj)<-[:USES]-(usedByApp:Application)
    OPTIONAL MATCH (obj)-[:DATA_SOURCE]->(sourceApp:Application)
    OPTIONAL MATCH (obj)<-[:TRAINED_WITH]-(aiComponent:AIComponent)
    RETURN
      obj.id AS id,
      obj.name AS name,
      obj.sovereigntyReqStrategicAutonomy AS reqStrategicAutonomy,
      obj.sovereigntyReqResilience AS reqResilience,
      obj.sovereigntyReqSecurity AS reqSecurity,
      obj.sovereigntyReqControl AS reqControl,
      collect(DISTINCT usedByApp.id) AS usedByAppIds,
      collect(DISTINCT sourceApp.id) AS sourceAppIds,
      collect(DISTINCT aiComponent.id) AS aiComponentIds
    `,
    { rootId, companyIds: [...companyIds], isAdmin }
  )

  if (result.records.length === 0) return null

  const row = result.records[0].toObject() as {
    id: string | null
    name: string | null
    reqStrategicAutonomy: string | null
    reqResilience: string | null
    reqSecurity: string | null
    reqControl: string | null
    usedByAppIds: (string | null)[]
    sourceAppIds: (string | null)[]
    aiComponentIds: (string | null)[]
  }
  if (!row.id) return null

  const required: RequirementLevels = {
    strategicAutonomy: toMaturityLevel(row.reqStrategicAutonomy),
    resilience: toMaturityLevel(row.reqResilience),
    security: toMaturityLevel(row.reqSecurity),
    control: toMaturityLevel(row.reqControl),
  }

  const cache = createNodeCache()
  const inFlight = new Set<string>()

  const appIds = new Set([...nonNullIds(row.usedByAppIds), ...nonNullIds(row.sourceAppIds)])
  const supportingApplications: ApplicationNode[] = []
  for (const appId of appIds) {
    const app = await fetchApplication(session, appId, cache, inFlight)
    if (app) supportingApplications.push(app)
  }

  const supportingAIComponents: AIComponentNode[] = []
  for (const aiComponentId of nonNullIds(row.aiComponentIds)) {
    const aiComponent = await fetchAIComponent(session, aiComponentId, cache, inFlight)
    if (aiComponent) supportingAIComponents.push(aiComponent)
  }

  return {
    rootId: row.id,
    name: row.name ?? row.id,
    rootType: 'dataObject',
    required,
    supportingApplications,
    supportingAIComponents,
  }
}

/**
 * Loads a BusinessProcess's own requirements plus the Applications it is
 * directly supported by (`supportedByApplications`, D-02 \u2014 flat,
 * DataObject-shaped: no nested childProcesses achieved-chain walk).
 * BusinessProcess has no direct AIComponent relationship in schema.graphql,
 * so `supportingAIComponents` is always `[]` \u2014 never fetched. Also fetches
 * `parentRequiredLevels` (D-04): a root-only `HAS_PARENT_PROCESS`-OUT upward
 * fetch of the process's own direct parents' required levels, company-scoped
 * identically to `fetchBusinessCapabilityChain`'s T-02.3-04 parent guard \u2014
 * no `isRoot` parameter needed since every call to this function is already
 * root-only (BusinessProcess has no recursive descendant walk). Returns
 * `null` when the BusinessProcess does not exist or is not owned by a
 * company in `companyIds` (and the caller is not admin).
 */
async function loadBusinessProcessSupportChain(
  session: Session,
  companyIds: readonly string[],
  isAdmin: boolean,
  rootId: string
): Promise<BusinessProcessChain | null> {
  const result = await session.run(
    `
    MATCH (proc:BusinessProcess {id: $rootId})-[:OWNED_BY]->(c:Company)
    WHERE $isAdmin OR c.id IN $companyIds
    WITH DISTINCT proc
    OPTIONAL MATCH (proc)<-[:SUPPORTS]-(app:Application)
    OPTIONAL MATCH (proc)-[:HAS_PARENT_PROCESS]->(parent:BusinessProcess)-[:OWNED_BY]->(parentCompany:Company)
    WHERE parent IS NULL OR $isAdmin OR parentCompany.id IN $companyIds
    RETURN
      proc.id AS id,
      proc.name AS name,
      proc.sovereigntyReqStrategicAutonomy AS reqStrategicAutonomy,
      proc.sovereigntyReqResilience AS reqResilience,
      proc.sovereigntyReqSecurity AS reqSecurity,
      proc.sovereigntyReqControl AS reqControl,
      collect(DISTINCT app.id) AS appIds,
      collect(DISTINCT parent { .id, .name, .sovereigntyReqStrategicAutonomy, .sovereigntyReqResilience, .sovereigntyReqSecurity, .sovereigntyReqControl }) AS parentRequiredRows
    `,
    { rootId, companyIds: [...companyIds], isAdmin }
  )

  if (result.records.length === 0) return null

  const row = result.records[0].toObject() as {
    id: string | null
    name: string | null
    reqStrategicAutonomy: string | null
    reqResilience: string | null
    reqSecurity: string | null
    reqControl: string | null
    appIds: (string | null)[]
    parentRequiredRows: {
      id: string | null
      name: string | null
      sovereigntyReqStrategicAutonomy: string | null
      sovereigntyReqResilience: string | null
      sovereigntyReqSecurity: string | null
      sovereigntyReqControl: string | null
    }[]
  }
  if (!row.id) return null

  const required: RequirementLevels = {
    strategicAutonomy: toMaturityLevel(row.reqStrategicAutonomy),
    resilience: toMaturityLevel(row.reqResilience),
    security: toMaturityLevel(row.reqSecurity),
    control: toMaturityLevel(row.reqControl),
  }

  const cache = createNodeCache()
  const inFlight = new Set<string>()

  const supportingApplications: ApplicationNode[] = []
  for (const appId of nonNullIds(row.appIds)) {
    const app = await fetchApplication(session, appId, cache, inFlight)
    if (app) supportingApplications.push(app)
  }

  const parentRequiredLevels = (row.parentRequiredRows ?? [])
    .filter((parentRow): parentRow is typeof parentRow & { id: string } => Boolean(parentRow?.id))
    .map(parentRow => ({
      id: parentRow.id,
      name: parentRow.name ?? parentRow.id,
      required: {
        strategicAutonomy: toMaturityLevel(parentRow.sovereigntyReqStrategicAutonomy),
        resilience: toMaturityLevel(parentRow.sovereigntyReqResilience),
        security: toMaturityLevel(parentRow.sovereigntyReqSecurity),
        control: toMaturityLevel(parentRow.sovereigntyReqControl),
      },
    }))

  return {
    rootId: row.id,
    name: row.name ?? row.id,
    rootType: 'businessProcess',
    required,
    supportingApplications,
    supportingAIComponents: [],
    parentRequiredLevels,
  }
}

/**
 * Loads a requirement root's (`BusinessCapability` or `DataObject`) own
 * requirements plus its full support chain, dispatching on `rootType`. This
 * is the only chain loader `resolvers.ts` calls — the single hop this module
 * used to expose directly (`loadBusinessCapabilityChain`, Task 1) is now an
 * internal delegate built on the same per-node fetch helpers.
 *
 * The `$isAdmin OR c.id IN $companyIds` filter mirrors the `@authorization`
 * filter block every other type in schema.graphql already has, since this
 * custom resolver bypasses that directive entirely. This is defense-in-depth
 * only — the resolver performs the authoritative JWT company/role check
 * before this function is ever called (T-02-01).
 */
export async function loadFullSupportChain(
  session: Session,
  companyIds: readonly string[],
  isAdmin: boolean,
  rootType: SovereigntyRootType,
  rootId: string
): Promise<BusinessCapabilityChain | DataObjectChain | BusinessProcessChain | null> {
  if (rootType === 'businessCapability') {
    return loadBusinessCapabilitySupportChain(session, companyIds, isAdmin, rootId)
  }
  if (rootType === 'businessProcess') {
    return loadBusinessProcessSupportChain(session, companyIds, isAdmin, rootId)
  }
  return loadDataObjectSupportChain(session, companyIds, isAdmin, rootId)
}

/**
 * Task 1's single-hop entry point, retained as a thin delegate to
 * `loadFullSupportChain` per the Task 2 plan ("may remain in repository.ts
 * as an internal helper if loadFullSupportChain is implemented by extending
 * it"). `resolvers.ts` no longer calls this directly.
 */
export async function loadBusinessCapabilityChain(
  session: Session,
  companyIds: readonly string[],
  isAdmin: boolean,
  capabilityId: string
): Promise<BusinessCapabilityChain | null> {
  const chain = await loadFullSupportChain(
    session,
    companyIds,
    isAdmin,
    'businessCapability',
    capabilityId
  )
  return chain && chain.rootType === 'businessCapability' ? chain : null
}
