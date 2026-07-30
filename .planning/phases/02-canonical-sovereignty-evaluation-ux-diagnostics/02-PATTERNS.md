# Phase 2: Canonical Sovereignty Evaluation & UX Diagnostics - Pattern Map

**Mapped:** 2026-07-30
**Files analyzed:** 17
**Analogs found:** 15 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `server/src/sovereignty/types.ts` | model | transform | `client/src/components/sovereignty/utils.ts` (interfaces `AchievedEntity`/`RequirementEntity`) | role-match |
| `server/src/sovereignty/repository.ts` | service | CRUD (graph read) | `server/src/db/neo4j-client.ts` (driver/session setup) + `ai-server/temporal/sovereignty/activities.ts` (`fetchSovereigntyReqEntities`/`fetchSovereigntyAchEntities`) | role-match |
| `server/src/sovereignty/evaluator.ts` | service | transform | `client/src/components/sovereignty/utils.ts` (`collectAchievedDependencyTree`, `maturityScore`, `MATURITY_LEVELS`) | exact (traversal shape only, not inheritance behavior) |
| `server/src/sovereignty/markers.ts` | service | transform | `client/src/components/diagrams/utils/databaseSyncUtils.ts` (`markMissingElements` — status→visual-attribute projection shape) | role-match |
| `server/src/sovereignty/graphql/typeDefs.ts` | config | request-response | `server/src/graphql/schema.graphql` (existing `type Query`/type definitions, e.g. `BusinessCapability`) | partial (no existing hand-written typeDefs file in this repo — schema.graphql is the only precedent) |
| `server/src/sovereignty/graphql/resolvers.ts` | controller | request-response | `server/src/graphql/schema.graphql` `@authorization`/`@cypher` directive blocks (declarative precedent only — **no existing imperative resolver file in this codebase**) | none (see No Analog Found) |
| `server/src/sovereignty/__tests__/evaluator.test.ts` | test | transform | none — no test files or jest config exist anywhere in `server/` today | none (see No Analog Found) |
| `server/src/sovereignty/__tests__/markers.test.ts` | test | transform | none | none (see No Analog Found) |
| `server/jest.config.js` | config | — | none — no jest config exists in `server/` | none (see No Analog Found) |
| `server/src/graphql/schema.ts` (MODIFIED) | config | request-response | itself (existing `new Neo4jGraphQL({ typeDefs, driver, features })` call) | exact |
| `server/src/graphql/schema.graphql` (MODIFIED, additive) | model | request-response | itself (existing type/query patterns, `@authorization` blocks) | exact |
| `ai-server/temporal/sovereignty/activities.ts` (MODIFIED) | service | batch | itself (`computeSovereigntyScores`, `graphqlRequest` usage already in file) | exact |
| `client/src/components/sovereignty/utils.ts` (DELETE) | utility | transform | n/a — file is being removed, not replaced | n/a |
| `client/src/graphql/sovereigntyDetail.ts` (MODIFIED/replaced query) | model | request-response | itself (existing `GET_SOVEREIGNTY_CAPABILITY_DETAIL` gql query) | exact |
| `client/src/components/sovereignty/SovereigntyCapabilityView.tsx` (MODIFIED) | component | request-response | itself + `SovereigntyDataView.tsx` (sibling, same pattern) | exact |
| `client/src/components/sovereignty/SovereigntyDataView.tsx` (MODIFIED) | component | request-response | `SovereigntyCapabilityView.tsx` (near-identical sibling) | exact |
| `client/src/components/diagrams/utils/sovereigntyMarkers.ts` (NEW) | utility | transform | `client/src/components/diagrams/utils/databaseSyncUtils.ts` (`markMissingElements`) + `excalidrawLibraryUtils.ts` (`createIconElement`/`boundElements`) | exact |

## Pattern Assignments

### `server/src/sovereignty/repository.ts` (service, graph read)

**Analogs:** `server/src/db/neo4j-client.ts` (driver/session pattern) + `ai-server/temporal/sovereignty/activities.ts` (batch-fetch shape)

**Driver/session import + usage pattern** (`server/src/db/neo4j-client.ts` lines 1-19):
```typescript
import { Driver, driver, auth } from 'neo4j-driver'
import * as dotenv from 'dotenv'

dotenv.config()
...
const URI = process.env.NEO4J_URI || 'bolt://neo4j:7687'
const USER = process.env.NEO4J_USER || 'neo4j'
const PASSWORD = process.env.NEO4J_PASSWORD || 'eam_password'
```
`repository.ts` should `import neo4jDriver from '../db/neo4j-client'` (the exported default driver singleton, same as `server/src/graphql/schema.ts` already does) and open/close a `session()` per call — do not construct a second driver instance.

**Company-scoped, batched fetch shape to port** (`ai-server/temporal/sovereignty/activities.ts` lines 55-79, batching helper lines 39-49):
```typescript
const SOVEREIGNTY_BATCH_SIZE = 200

async function fetchAllPages<T>(fetcher: (offset: number) => Promise<T[]>): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  while (true) {
    const batch = await fetcher(offset)
    all.push(...batch)
    if (batch.length < SOVEREIGNTY_BATCH_SIZE) break
    offset += SOVEREIGNTY_BATCH_SIZE
  }
  return all
}

export async function fetchSovereigntyReqEntities(input: {
  readonly companyId: string
  readonly accessToken: string
}): Promise<SovereigntyEntity[]> {
  const companyFilter = { company: { some: { id: { eq: input.companyId } } } }
  // ...fetches businessCapabilities + dataObjects via graphqlRequest, paginated
}
```
`repository.ts` differs in transport (raw Cypher via `neo4jDriver.session().run(...)` instead of `graphqlRequest`), but the **shape** — company-scoped filter as a first-class parameter, paginate/batch large result sets, keep req-entities and ach-entities as separate functions — is the pattern to reuse. **Security-critical:** every Cypher query in `repository.ts` MUST take `companyId` (derived from the resolver's JWT context, per Pitfall 3 below) as a required parameter and filter `WHERE company.id = $companyId` — mirroring the `$jwt.company_ids` scoping every existing type carries in `schema.graphql` (see Shared Patterns → Authorization).

---

### `server/src/sovereignty/evaluator.ts` (service, transform)

**Analog:** `client/src/components/sovereignty/utils.ts` (traversal shape only — inheritance/hiding behavior is explicitly NOT to be ported, D-07)

**Maturity ordering + scoring convention to reuse verbatim** (`client/src/components/sovereignty/utils.ts` lines 1-9):
```typescript
export const MATURITY_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const
export type MaturityLevel = (typeof MATURITY_LEVELS)[number]

export function maturityScore(level: string | null | undefined): number {
  if (!level) return 1
  const idx = MATURITY_LEVELS.indexOf(level as MaturityLevel)
  return idx >= 0 ? idx + 1 : 1
}
```
This is the *third and final* place this ordering should be encoded (RESEARCH.md "Don't Hand-Roll") — once `evaluator.ts` exists, both `client/src/components/sovereignty/utils.ts` (deleted, D-07) and `ai-server/temporal/sovereignty/activities.ts`'s own `MATURITY_SCORE` map (retired, D-06) go away.

**Cycle-safe visited-set traversal shape to port** (`client/src/components/sovereignty/utils.ts` lines ~230-245, `collectAchievedDependencyTree`):
```typescript
const visitedApplicationIds = new Set<string>()
const applicationStack = rootApplications.map(app => app.id)

while (applicationStack.length > 0) {
  const applicationId = applicationStack.pop()
  if (!applicationId || visitedApplicationIds.has(applicationId)) {
    continue
  }
  visitedApplicationIds.add(applicationId)
  // ... D-03: silently stop re-descending into an already-visited node, no cycle finding emitted
}
```
Port this **stack + `Set<string>`** shape into `evaluateInfrastructureChain`/`evaluateApplicationChain` in `evaluator.ts` (per RESEARCH.md Pattern 4's `visited: Set<string>` recursive example). **Do not port** the surrounding calls this function makes today — `buildEffectiveApplication()` (hides container's own achieved values, lines ~215-229) and `resolveInheritedValue()`/`buildEffectiveInfrastructure()` (infra inheritance, lines ~155-200) are the exact anti-patterns D-02/D-07 remove. Per D-01, do **not** reuse `pickParentInfrastructure()`'s "pick one representative parent" logic (lines ~131-154) — every parent/hosting edge must be walked and produce its own finding.

**Predicate to reuse as-is** (`client/src/components/sovereignty/utils.ts` lines ~366-373):
```typescript
export function hasAnySovereigntyReqs(entity: RequirementEntity): boolean {
  return SOVEREIGNTY_REQ_FIELDS.some(field => entity[field] != null)
}
export function hasAnySovereigntyAchs(entity: AchievedEntity): boolean {
  return SOVEREIGNTY_ACH_FIELDS.some(field => entity[field] != null)
}
```
These pure predicates (no inheritance involved) are safe and correct to copy into `evaluator.ts` to drive GREY classification (Pitfall 2 guard: an entity with zero achieved fields must produce an explicit GREY finding, never be silently excluded).

**Anti-pattern to explicitly NOT port** (`ai-server/temporal/sovereignty/activities.ts` lines ~145-152):
```typescript
const achScores = input.achEntities
  .map(e => extractEntityScore(e, ACH_DIMS))
  .filter((s): s is number => s !== null) // <-- silent-fallback anti-pattern (Pitfall 2)
const achievedSovereigntyScore = achScores.length > 0 ? Math.min(...achScores) : null
```
Missing values must become an explicit GREY finding in the new evaluator, never be `.filter()`-dropped before aggregation.

---

### `server/src/sovereignty/graphql/typeDefs.ts` + `resolvers.ts` (config/controller, request-response)

**No direct analog** — this codebase has zero custom GraphQL resolvers today (100% auto-generated CRUD from `@neo4j/graphql`). Use `server/src/graphql/schema.graphql`'s existing **additive style** and **authorization scoping idiom** as the structural template, translated from declarative directives to imperative resolver code (RESEARCH.md Pattern 2/Pitfall 3).

**Existing additive query/type style to mirror** (`server/src/graphql/schema.graphql` lines 1-9, JWT claim shape):
```graphql
type JWT @jwt {
  sub: String!
  preferred_username: String
  email: String
  roles: [String!]! @jwtClaim(path: "realm_access.roles")
  company_ids: [String!] @jwtClaim(path: "company_ids")
}

extend schema @authentication
```
`typeDefs.ts` should add `extend type Query { sovereigntyAnalysis(...): SovereigntyAnalysis! sovereigntyMarkers(...): [SovereigntyMarker!]! }` plus new output types — additive only, no existing type touched, exactly matching how every existing type in `schema.graphql` is independently declared.

**Authorization scoping idiom every resolver must replicate manually** (`server/src/graphql/schema.graphql` lines 19-47, `BusinessCapability`'s `@authorization filter` block):
```graphql
filter: [
  {
    where: {
      OR: [
        { jwt: { roles: { includes: "admin" } } }
        { node: { company: { some: { id_IN: "$jwt.company_ids" } } } }
      ]
    }
  }
]
```
Because custom resolvers registered via a `resolvers` map bypass `@neo4j/graphql`'s `@authorization` directive pipeline entirely (RESEARCH.md Pitfall 3 — genuinely new attack surface), `resolvers.ts` must manually re-derive `company_ids`/`roles` from `context.token` (same JWT the directives read) and pass it into every `repository.ts` call as an explicit `companyId`/`allowedCompanyIds` parameter, then apply the equivalent `WHERE ... company.id IN $allowedCompanyIds` (or admin-role bypass) inside the Cypher itself. This is not optional hardening — see Shared Patterns → Authorization below.

**Context/token wiring already present** (`server/src/index.ts`, ApolloServer construction):
```typescript
const server = new ApolloServer({
  schema,
  context: ({ req }) => ({
    token: req.headers.authorization, // Token directly from Authorization header forward to Neo4j GraphQL Library
  }),
  ...
})
```
Custom resolvers in `resolvers.ts` receive this same `context.token` as their third resolver argument (`(parent, args, context) => ...`) — decode/verify it the same way `server/src/index.ts`'s `safeDecodeJwt()` debug helper already demonstrates (lines ~76-84) to extract `company_ids`/`roles`, rather than inventing a new JWT-parsing path.

**Schema wiring change** (`server/src/graphql/schema.ts`, current full file — additive modification target):
```typescript
import { Neo4jGraphQL } from '@neo4j/graphql'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import neo4jDriver from '../db/neo4j-client'
import dotenv from 'dotenv'

dotenv.config()
const typeDefs = readFileSync(resolve(__dirname, 'schema.graphql')).toString('utf-8')
...
export const neoSchema = new Neo4jGraphQL({
  typeDefs,
  driver: neo4jDriver,
  features: { authorization: { key: { url: jwksUrl } } },
})
export const getSchema = async () => { return await neoSchema.getSchema() }
export default neoSchema
```
Per RESEARCH.md Pattern 2/Wave-0 spike guidance, the simplest first attempt is passing a `resolvers` object directly into this existing `new Neo4jGraphQL({...})` constructor call (Neo4j's documented `resolvers` option) rather than introducing `@graphql-tools/schema` `mergeSchemas` — try approach (a) first; fall back to (b) only if the object-type return shape proves awkward. Either way, `getSchema()`'s exported shape/consumers in `server/src/index.ts` (`const schema = await neoSchema.getSchema()`) stay unchanged.

---

### `server/src/sovereignty/markers.ts` (service, transform)

**Analog:** `client/src/components/diagrams/utils/databaseSyncUtils.ts` → `markMissingElements()` (status → visual-attribute projection shape, NOT the diagram-mutation part — that lives client-side in the new `sovereigntyMarkers.ts`)

**Projection shape to mirror conceptually** (`markMissingElements`, lines 463-513):
```typescript
export const markMissingElements = (
  elements: DiagramElement[],
  missingIds: string[]
): DiagramElement[] => {
  return elements.map(element => {
    if (!element.customData?.isFromDatabase) return element
    // ...matches on customData.databaseId, conditionally overwrites visual attributes
    if (isMissing) {
      return { ...element, strokeColor: '#ff0000', strokeWidth: 3, ... }
    }
    return element
  })
}
```
`markers.ts` on the server side is the **status classifier** (`Finding[] → { selfStatus, downstreamStatus }` per node id, per D-05), not the DOM/Excalidraw mutation itself — that visual-projection responsibility is `client/src/components/diagrams/utils/sovereigntyMarkers.ts` (see below). Keep this separation: `markers.ts` must stay UI-framework-agnostic so the same output also serves `sovereigntyAnalysis`'s detail-view header chips (RESEARCH.md Anti-Pattern 3 — never a second classifier for diagram vs. detail view).

---

### `client/src/components/diagrams/utils/sovereigntyMarkers.ts` (NEW, utility, transform)

**Analogs:** `databaseSyncUtils.ts` (`markMissingElements`, `extractDatabaseElements`) + `excalidrawLibraryUtils.ts` (`createIconElement`)

**Element extraction to reuse directly, not reimplement** (`databaseSyncUtils.ts` lines 47-73):
```typescript
export const extractDatabaseElements = (elements: DiagramElement[]): DiagramElement[] => {
  const databaseElements: DiagramElement[] = []
  const processedIds = new Set<string>()
  for (const element of elements) {
    if (!element.customData?.isFromDatabase) continue
    if (element.customData.isMainElement && element.customData.databaseId) {
      const dbId = element.customData.databaseId
      if (!processedIds.has(dbId)) {
        databaseElements.push(element)
        processedIds.add(dbId)
      }
    }
    // ...child-element → main-element resolution
  }
  return databaseElements
}
```
Call this existing function to build the `{id, type}` node list for the `sovereigntyMarkers` batch query — per RESEARCH.md Pattern 5, do not write a new extraction function.

**Bound-element creation pattern to reuse for the fill/ring ellipses** (`excalidrawLibraryUtils.ts` lines ~127-175, `createIconElement`):
```typescript
const createIconElement = (
  elementType: ElementType,
  position: { x: number; y: number },
  groupId: string
): ExcalidrawElement | null => {
  const iconId = generateElementId()
  const baseIcon: Partial<ExcalidrawElement> = {
    id: iconId,
    x: position.x + iconOffset,
    y: position.y + iconOffset,
    width: iconSize,
    height: iconSize,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    groupIds: [groupId],
    boundElements: [],
    customData: { isFromDatabase: true, isMainElement: false, mainElementId: groupId },
    ...
  }
  ...
}
```
`applySovereigntyMarkers(elements, markerByDatabaseId)` should follow this same shape to create two small `ellipse`-type bound elements per main element (per 02-UI-SPEC.md: 10px filled inner ellipse for `selfStatus`, 18px unfilled outer ellipse for `downstreamStatus`, offset at top-right corner), bound via `groupIds`/`customData.mainElementId` exactly like the icon element — **do not** overwrite the main element's own `strokeColor`/`backgroundColor` (unlike `markMissingElements`'s transient red-border behavior), per UI-SPEC's explicit "never overwrite user's own chosen colors" rule.

**Wiring point** (`databaseSyncUtils.ts` lines 643-658, `syncDiagramOnOpen`, called from `client/src/components/diagrams/handlers/DiagramHandlers.ts` line 247):
```typescript
export const syncDiagramOnOpen = async (apolloClient: any, diagramData: any): Promise<any> => {
  if (!diagramData.elements || !Array.isArray(diagramData.elements)) {
    return diagramData
  }
  debugElementStructure(diagramData.elements)
  const updatedElements = await syncDiagramOnOpenSimple(apolloClient, diagramData.elements)
  return { ...diagramData, elements: updatedElements }
}
```
Sovereignty marker application should be composed into this same `syncDiagramOnOpen` pipeline (called once per diagram open, same as the missing-element sync), gated by `if (!featureFlags.Sovereignty) return elements` (D-09) before the batch `sovereigntyMarkers` GraphQL call is even made.

---

### `client/src/graphql/sovereigntyDetail.ts` (MODIFIED — replace raw-entity query with canonical query)

**Analog:** itself — current file already defines `GET_SOVEREIGNTY_CAPABILITY_DETAIL`

**Current raw-entity query shape to retire** (lines 1-40):
```typescript
import { gql } from '@apollo/client/core'

export const GET_SOVEREIGNTY_CAPABILITY_DETAIL = gql`
  query GetSovereigntyCapabilityDetail(
    $where: BusinessCapabilityWhere
    $applicationWhere: ApplicationWhere
    $aiComponentWhere: AIComponentWhere
    $infrastructureWhere: InfrastructureWhere
  ) {
    businessCapabilities(where: $where) {
      id
      name
      sovereigntyReqStrategicAutonomy
      ...
      supportedByApplications { id name sovereigntyAchStrategicAutonomy ... }
    }
    applications(where: $applicationWhere) {
      id name sovereigntyAchStrategicAutonomy ...
      components { id }
      hostedOn { id name sovereigntyAchStrategicAutonomy ... parentInfrastructure { ... } }
    }
    ...
  }
`
```
Replace with a single `sovereigntyAnalysis(rootType: ..., rootId: ...)` query (exact field/type names are the agent's discretion per CONTEXT.md) returning the canonical DTO — same `gql` import convention, same file location, same naming convention (`GET_SOVEREIGNTY_...`) so `yarn codegen` picks it up identically. Keep the file name `sovereigntyDetail.ts` (no rename needed).

---

### `client/src/components/sovereignty/SovereigntyCapabilityView.tsx` / `SovereigntyDataView.tsx` (MODIFIED)

**Analog:** each other (near-identical siblings) — the file to modify already has the target UI shell to keep

**Reusable shell to keep, only the data-computation calls change** (`SovereigntyCapabilityView.tsx` lines 1-70):
```typescript
'use client'
import { Alert, Box, Chip, CircularProgress, Paper, Tooltip, Typography } from '@mui/material'
import { useQuery } from '@apollo/client'
import { useTranslations } from 'next-intl'
import { useCompanyContext } from '@/contexts/CompanyContext'
import { useCompanyWhere } from '@/hooks/useCompanyWhere'
import { GET_SOVEREIGNTY_CAPABILITY_DETAIL } from '@/graphql/sovereigntyDetail'
import {
  AchievedEntity, collectAchievedDependencyTree, computeAggregatedAchievedScore,
  computeEntityAchivedScore, computeEntityRequiredScore, ... hasAnySovereigntyAchs, hasAnySovereigntyReqs,
} from './utils'
...
const { data, loading, error } = useQuery(GET_SOVEREIGNTY_CAPABILITY_DETAIL, {
  skip: !selectedCompanyId, fetchPolicy: 'cache-and-network',
  variables: { where: companyWhere, applicationWhere, aiComponentWhere, infrastructureWhere },
})
if (!selectedCompanyId) return <Alert severity="info">{t('noCompanySelected')}</Alert>
if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
if (error) return <Alert severity="error">{error.message}</Alert>
```
Keep this exact loading/error/empty-state shell (matches 02-UI-SPEC.md's "reuse `CircularProgress`/`Alert` patterns verbatim"). Remove the `import ... from './utils'` block (file is deleted, D-07) and replace with the new canonical query's returned DTO fields; replace `collectAchievedDependencyTree`/`computeAggregatedAchievedScore` calls with direct rendering of the DTO's `findings`/`selfStatus`/`downstreamStatus`. The `Chip` + `onEntityClick({ id, type })` navigation pattern (line ~127) is explicitly called out in 02-UI-SPEC.md to reuse verbatim for "finding row → violating element" clicks.

---

## Shared Patterns

### Authorization (company/JWT scoping) — CRITICAL, applies to `resolvers.ts` and `repository.ts`
**Source:** `server/src/graphql/schema.graphql` lines 19-47 (`BusinessCapability`'s `@authorization` block, representative of ~40 other types)
**Apply to:** Every new custom resolver and every Cypher query in `server/src/sovereignty/`
```graphql
@authorization(
  filter: [
    { where: { OR: [
      { jwt: { roles: { includes: "admin" } } }
      { node: { company: { some: { id_IN: "$jwt.company_ids" } } } }
    ] } }
  ]
)
```
Since custom resolvers bypass this directive pipeline entirely (RESEARCH.md Pitfall 3), `resolvers.ts` must manually extract `company_ids`/`roles` from `context.token` and every `repository.ts` Cypher query must include the equivalent `WHERE ... company.id IN $companyIds OR $isAdmin` clause. Treat as required, not optional — this is the single largest net-new security surface this phase introduces (OWASP A01 Broken Access Control).

### Feature-flag gating (diagram markers)
**Source:** `client/src/components/aicomponents/AicomponentForm.tsx` line 95
**Apply to:** `client/src/components/diagrams/utils/sovereigntyMarkers.ts`
```typescript
const { featureFlags } = useFeatureFlags()
const isSovereigntyEnabled = featureFlags.Sovereignty
```
Same flag, same read pattern (`client/src/lib/feature-definitions.ts` already declares `'Sovereignty'` in `FEATURE_FLAGS`) — no new gating mechanism (D-09).

### Cypher/driver session lifecycle
**Source:** `server/src/db/neo4j-client.ts` (exported `neo4jDriver`) + existing `session()`/`close()` usage in `server/src/index.ts`'s `normalizeAnalyticsReports()` (open session, `try { ... } finally { await session.close() }`)
**Apply to:** `server/src/sovereignty/repository.ts`
```typescript
const session = neo4jDriver.session()
try {
  const result = await session.run(`MATCH ... WHERE ... RETURN ...`, params)
  return result.records.map(r => r.get('...'))
} finally {
  await session.close()
}
```

### Maturity-level ordering
**Source:** `client/src/components/sovereignty/utils.ts` lines 1-9 (`MATURITY_LEVELS` as const array, no enum)
**Apply to:** `server/src/sovereignty/evaluator.ts` and `server/src/sovereignty/types.ts`
Per project TypeScript convention (no enums, `as const` unions) already followed here — copy the array shape verbatim as the new module's only remaining copy of this ordering.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `server/src/sovereignty/graphql/resolvers.ts` | controller | request-response | Zero custom GraphQL resolvers exist anywhere in this codebase today — schema is 100% auto-generated CRUD from `@neo4j/graphql`. Use RESEARCH.md's `Code Examples` wiring snippet and Neo4j's documented `resolvers` option as the template instead of an in-repo analog. |
| `server/src/sovereignty/__tests__/evaluator.test.ts`, `markers.test.ts` | test | transform | No test files or jest configuration exist in `server/` (confirmed: no `jest.config.*`, no `__tests__` directories) despite `jest`/`ts-jest` being installed dependencies and a `"test": "jest"` script already in `server/package.json`. Planner should treat `server/jest.config.js` + first test files as genuinely new infrastructure, following standard `ts-jest` preset conventions (no project-specific precedent to match). |
| `server/jest.config.js` | config | — | Same as above — no existing jest config anywhere in the repo's `server/` package to copy from. |

## Metadata

**Analog search scope:** `server/src/`, `ai-server/temporal/sovereignty/`, `ai-server/src/graphql/`, `client/src/components/sovereignty/`, `client/src/components/diagrams/utils/`, `client/src/components/aicomponents/`, `client/src/graphql/`
**Files scanned:** ~20 (targeted reads guided by CONTEXT.md/RESEARCH.md file references; no blind directory sweep needed since research already enumerated candidate files)
**Pattern extraction date:** 2026-07-30
