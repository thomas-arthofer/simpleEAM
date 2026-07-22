# Architecture Patterns

**Domain:** Brownfield EAM platform with sovereignty traceability and deployment stabilization
**Researched:** 2026-07-22

## Recommended Architecture

The next milestone should treat sovereignty evaluation as a backend-owned analysis capability, not as a UI calculation. The brownfield system already stores requirement fields on business capabilities, business processes, and data objects, and achieved fields on applications, AI components, infrastructure, and suppliers in [server/src/graphql/schema.graphql](server/src/graphql/schema.graphql). The architecture problem is not missing data storage. The problem is that the current detail flow assembles raw graph slices in the client through [client/src/graphql/sovereigntyDetail.ts](client/src/graphql/sovereigntyDetail.ts) and then computes effective results in [client/src/components/sovereignty/utils.ts](client/src/components/sovereignty/utils.ts), including inherited infrastructure values and worst-case aggregation. That guarantees drift between detail views, diagram markers, company rollups, and any future background jobs.

The milestone should therefore introduce one sovereignty analysis boundary in the backend that resolves explicit per-element ratings, traverses dependency chains, classifies missing evidence versus actual violations, and returns a normalized analysis object to every consumer. UI surfaces should render that object, not reconstruct it. This is the only structure that keeps the detail view, diagram markers, and future rollups consistent while removing the current duplicate logic noted in [eam-konzept.md](eam-konzept.md).

Setup stabilization belongs beside that work as a deployment-contract track. It should not be mixed into the sovereignty domain model. Architecturally, local Docker Compose and Kubernetes should be treated as two runtime profiles over the same service topology, with documented external assumptions and a verified startup contract anchored in [compose.yml](compose.yml) and [k8s/README.md](k8s/README.md).

```text
Business requirement nodes
  BusinessCapability / BusinessProcess / DataObject
            |
            v
GraphQL sovereignty analysis query
            |
            v
Sovereignty analysis service (server-owned)
  - load dependency chain
  - evaluate explicit ratings only
  - classify GREEN / RED / YELLOW / GREY
  - emit violations and impact summaries
            |
            +--> detail-view DTOs
            +--> diagram marker DTOs
            +--> company rollup DTOs
            +--> optional persisted snapshot job later

Deployment stabilization track
  compose contract + k8s contract + docs + verification scripts
```

## Component Boundaries

| Component                            | Responsibility                                                                                                                                                                         | Communicates With                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Graph model storage                  | Persist explicit sovereignty requirements, achieved ratings, evidence text, and existing dependency relationships only. No inheritance logic in storage.                               | Neo4j GraphQL schema, import/export flows                      |
| Sovereignty analysis service         | Load graph neighborhood for one root or a batch of roots, traverse supported-by and hosted-on chains, compare requirement-to-achievement by dimension, and produce canonical findings. | Neo4j driver or GraphQL-backed repository, GraphQL query layer |
| Sovereignty repository/query adapter | Encapsulate Cypher or repository reads needed for chain traversal so traversal rules are not embedded in UI or resolver glue.                                                          | Neo4j, analysis service                                        |
| GraphQL sovereignty API              | Expose normalized analysis objects for detail views, diagram markers, and rollups. Keep schema additive so existing CRUD stays intact.                                                 | Analysis service, client                                       |
| Detail view UI                       | Render requirement summary, effective chain status, and violation list from backend DTOs. Never recompute scores or inheritance.                                                       | GraphQL sovereignty API                                        |
| Diagram marker adapter               | Convert backend status payload into fill and ring markers for diagram elements already linked through `customData.databaseId` and `customData.elementType`.                            | GraphQL sovereignty API, diagram editor state                  |
| Company/dashboard rollup             | Aggregate backend-emitted statuses and counts for list views or overview cards. Do not infer from raw entity fields.                                                                   | GraphQL sovereignty API                                        |
| Deployment profile contract          | Define environment prerequisites, network assumptions, startup ordering, and health checks for Compose and Kubernetes.                                                                 | compose.yml, k8s chart/docs, operators                         |
| Verification harness                 | Run reproducible checks for local stack startup and for sovereignty-analysis regression cases.                                                                                         | Yarn scripts, Docker/K8s docs, server tests                    |

## Data Flow

### Sovereignty Detail Flow

1. The user opens a business capability, business process, data object, application, AI component, or infrastructure detail view.
2. The client requests a backend sovereignty analysis query for that root entity instead of requesting multiple raw entity collections.
3. The GraphQL layer calls the sovereignty analysis service with the root type, root id, and company scope.
4. The analysis service loads the relevant chain segments:
   - requirement roots from business capability, business process, or data object
   - supported applications and AI components
   - application composition where relevant
   - infrastructure hosting hierarchy
5. The analysis service evaluates each dimension using explicit achieved values only. Missing achieved values remain missing; they are not filled from parents.
6. The service emits a normalized result:
   - root summary
   - chain nodes
   - per-dimension findings
   - classified violations
   - impacted upstream roots
   - marker state for self and downstream impact
7. The detail view renders the payload directly.

### Diagram Marker Flow

1. A diagram loads elements that already carry `customData.databaseId` and `customData.elementType` in the diagram subsystem.
2. The client requests sovereignty marker data for the visible database ids in one batch.
3. The GraphQL layer delegates to the same sovereignty analysis service, but through a batch marker query optimized for many nodes.
4. The service returns a compact marker DTO per element:
   - `selfStatus`: green, red, yellow, grey, neutral
   - `downstreamStatus`: green, red, yellow, grey, none
   - optional counts for tooltip display
5. The diagram renderer applies fill from `selfStatus` and ring from `downstreamStatus` without interpreting raw maturity fields.

### Company Rollup Flow

1. Dashboard or list views request sovereignty rollups by company or entity class.
2. The backend computes summary counts from the same canonical findings model.
3. Existing scalar fields such as `expectedSovereigntyScore`, `achievedSovereigntyScore`, `sovereigntyGap`, and `sovereigntyScoreStatus` should be treated as legacy summary outputs until they are either redefined from the new engine or deprecated.

### Setup Stabilization Flow

1. Operators choose a runtime profile: local Compose or Kubernetes.
2. Each profile follows a documented contract for required networks, hostnames, secrets, persistent volumes, and optional services.
3. Verification scripts or checklists confirm the environment before developers debug application behavior.
4. Sovereignty work then runs on top of a reproducible stack instead of ad hoc local fixes.

## Canonical Sovereignty Analysis Model

The backend should return one explicit analysis shape. The exact GraphQL type names can vary, but the contract should include these concepts.

```text
SovereigntyAnalysis
  root
  rootKind
  overallStatus
  dimensions[]
  findings[]
  chainNodes[]
  marker
  impactSummary

DimensionEvaluation
  dimension
  requiredLevel
  bestClaimedLevel
  limitingLevel
  status

Finding
  severity
  status
  dimension
  requiredBy
  failingNode
  expectedLevel
  actualLevel
  reason
  chainPath[]

Marker
  selfStatus
  downstreamStatus
```

Important rules:

- `RED`: an explicit business-side requirement is violated somewhere in the chain.
- `YELLOW`: the chain contradicts itself, but no explicit business requirement exists yet.
- `GREY`: required rating or achieved rating is missing and therefore not evidenced.
- `GREEN`: no finding for the dimension and all required comparisons pass.

This model aligns with the concept note in [eam-konzept.md](eam-konzept.md) and prevents UI-only interpretations of the same raw graph.

## Patterns to Follow

### Pattern 1: Backend-Owned Sovereignty Engine

**What:** A single service module in the server owns chain traversal, classification, and result assembly.

**When:** Use for all detail dialogs, diagram overlays, company summaries, export logic, and any later background recalculation.

**Why:** The current client utility in [client/src/components/sovereignty/utils.ts](client/src/components/sovereignty/utils.ts) already embeds inheritance removal risk, aggregation rules, and status logic. Leaving this in the UI guarantees split behavior.

**Example shape:**

```typescript
interface SovereigntyAnalysisInput {
  companyId: string
  rootType:
    | 'businessCapability'
    | 'businessProcess'
    | 'dataObject'
    | 'application'
    | 'aiComponent'
    | 'infrastructure'
  rootId: string
}

interface SovereigntyAnalysisService {
  analyzeRoot(input: SovereigntyAnalysisInput): Promise<SovereigntyAnalysis>
  analyzeMarkers(input: {
    companyId: string
    nodes: Array<{ id: string; type: string }>
  }): Promise<SovereigntyMarker[]>
}
```

### Pattern 2: Repository and Traversal Separation

**What:** Keep graph loading separate from evaluation logic.

**When:** Use when reading capabilities, applications, AI components, infrastructures, and their relationships.

**Why:** Brownfield graph traversal queries will evolve while the evaluation rules must stay testable. If traversal and classification are fused, every schema or relationship tweak rewrites business logic.

**Example:**

```typescript
interface SovereigntyChainRepository {
  loadRequirementRoot(companyId: string, rootType: string, rootId: string): Promise<RequirementRoot>
  loadSupportChain(companyId: string, rootId: string): Promise<SupportChain>
}
```

### Pattern 3: Additive GraphQL Analysis Types

**What:** Add new query fields for sovereignty analysis instead of overloading existing CRUD entity shapes with more derived fields.

**When:** Use during the migration from score-centric views to finding-centric views.

**Why:** Existing generated CRUD surfaces are broad and already feed many forms and tables. The milestone should minimize blast radius while enabling a better contract.

**Recommended query shapes:**

```text
sovereigntyAnalysis(rootType, rootId): SovereigntyAnalysis!
sovereigntyMarkers(nodes: [SovereigntyMarkerRequest!]!): [SovereigntyMarker!]!
sovereigntyImpacts(rootType, rootId): [SovereigntyImpact!]!
```

### Pattern 4: Marker Projection as a Read Model

**What:** Treat diagram marker data as a thin projection of the canonical analysis, not a separate rules engine.

**When:** Use for diagram canvas rendering and tooltip summaries.

**Why:** Diagram logic already has enough complexity around Excalidraw element state and `customData` linkage. It should consume a compact status object, not perform dependency reasoning on canvas elements.

### Pattern 5: Deployment Profiles with Verified Contracts

**What:** Define Compose and Kubernetes as two supported deployment profiles with explicit prerequisites, not as informal variants.

**When:** Use for local development onboarding and milestone documentation.

**Why:** [compose.yml](compose.yml) currently depends on Traefik network and hostname-based routing, while [k8s/README.md](k8s/README.md) documents ingress, storage, and secret prerequisites. These assumptions need one architectural home so setup issues stop blocking domain work.

**Required contract topics:**

- external network and DNS assumptions
- whether HTTPS hostnames are mandatory for local startup
- minimum services for non-AI local development
- health endpoints and startup order
- secret sources and example overrides
- which components are optional profiles versus required base stack

## Suggested Build Order

1. Stabilize runtime contracts first.
   - Verify Compose startup path from repository state.
   - Document Traefik network, hostname, and TLS assumptions.
   - Document Kubernetes prerequisites and the gap between local and cluster expectations.
   - Add a lightweight verification checklist or script surface.

2. Introduce backend sovereignty analysis types and service boundary.
   - Keep existing CRUD schema unchanged.
   - Add additive GraphQL analysis queries.
   - Define DTOs and status taxonomy.

3. Migrate current client detail view from raw graph assembly to backend analysis.
   - Replace [client/src/graphql/sovereigntyDetail.ts](client/src/graphql/sovereigntyDetail.ts) with analysis queries.
   - Remove client-side inheritance and worst-case evaluation logic from [client/src/components/sovereignty/utils.ts](client/src/components/sovereignty/utils.ts).

4. Add diagram marker batch query and renderer mapping.
   - Reuse existing diagram `customData.databaseId` and `customData.elementType` linkage.
   - Keep marker rendering separate from chain evaluation.

5. Reconcile legacy score fields.
   - Either compute `expectedSovereigntyScore`, `achievedSovereigntyScore`, `sovereigntyGap`, and `sovereigntyScoreStatus` from the new engine or mark them as legacy-only and stop using them in new UI.

6. Add regression tests around chain evaluation.
   - explicit rating lower than requirement produces red
   - missing rating produces grey
   - architecture contradiction without requirement produces yellow
   - multiple failing nodes all appear in findings
   - business-process requirements participate in the same flow

## Anti-Patterns to Avoid

### Anti-Pattern 1: Recomputing Sovereignty in the Client

**What:** UI queries many entities and calculates effective status locally.

**Why bad:** This is the current drift source. The existing utility already performs hidden inheritance through `resolveInheritedValue`, suppresses container application values, and computes worst-case aggregation in the browser. Any additional UI surface would reimplement the same policy differently.

**Instead:** Move all chain reasoning to the backend and let the UI render canonical findings.

### Anti-Pattern 2: Encoding Inheritance as a Fallback Convenience

**What:** Parent infrastructure values fill child gaps automatically.

**Why bad:** It hides missing evidence and contradicts the milestone goal of explicit accountability.

**Instead:** Preserve null as meaningful. Missing achieved ratings must stay grey until explicitly assessed.

### Anti-Pattern 3: Separate Rules for Detail Views and Diagram Markers

**What:** Detail dialogs use one evaluator while diagrams use a lighter heuristic.

**Why bad:** Users will see one status in the sidebar and another on the canvas.

**Instead:** The diagram receives a projection of the same analysis result.

### Anti-Pattern 4: Mixing Setup Repair into Domain Logic

**What:** Sovereignty implementation compensates for unstable local runtime assumptions by embedding workarounds or skipping dependencies.

**Why bad:** Domain correctness becomes environment-dependent and harder to validate.

**Instead:** Solve setup stabilization as deployment-contract and documentation work before or in parallel with the domain slice.

## Scalability Considerations

| Concern                    | At current brownfield scale                                            | At larger tenant scale                     | Recommendation                                                                                 |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Chain traversal cost       | Acceptable for single detail view reads if bounded by company and root | Batch diagram loads can become expensive   | Provide dedicated batch marker query and limit traversal depth by supported relationship types |
| UI consistency             | Already fragile because logic is split                                 | More surfaces will multiply drift          | One backend engine only                                                                        |
| Recalculation timing       | On-demand reads are enough for milestone start                         | Frequent dashboards may need caching later | Start with on-demand analysis; add persisted snapshots only after behavior stabilizes          |
| Deployment reproducibility | Currently blocked by implicit network assumptions                      | More contributors amplify setup churn      | Codify Compose and Kubernetes profiles with validation steps                                   |

## Brownfield Migration Notes

- Reuse existing sovereignty fields in the schema. The concept document explicitly says no data model expansion is required for the redesign.
- Treat existing company-level summary fields as compatibility surfaces, not as the design center.
- Fold business-process requirements into the same chain analysis from the start because [eam-konzept.md](eam-konzept.md) identifies their current exclusion as a weakness.
- Leave `sovereigntyReqWeight` out of milestone-critical logic unless the team decides its semantics. It is currently captured but unused, and adding weighting before the canonical chain engine stabilizes would widen ambiguity.
- Prefer additive GraphQL analysis queries over broad schema rewrites so generated client types and CRUD pages remain stable during the milestone.

## Sources

- [eam-konzept.md](eam-konzept.md)
- [compose.yml](compose.yml)
- [k8s/README.md](k8s/README.md)
- [server/src/graphql/schema.graphql](server/src/graphql/schema.graphql)
- [client/src/graphql/sovereigntyDetail.ts](client/src/graphql/sovereigntyDetail.ts)
- [client/src/components/sovereignty/utils.ts](client/src/components/sovereignty/utils.ts)
- [client/src/components/diagrams/utils/databaseSyncUtils.ts](client/src/components/diagrams/utils/databaseSyncUtils.ts)
- [.planning/codebase/ARCHITECTURE.md](/home/thomas/atos/simpleEAM/.planning/codebase/ARCHITECTURE.md)
- [.planning/codebase/CONCERNS.md](/home/thomas/atos/simpleEAM/.planning/codebase/CONCERNS.md)
