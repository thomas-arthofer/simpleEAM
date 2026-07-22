<!-- refreshed: 2026-07-22 -->

# Architecture

**Analysis Date:** 2026-07-22

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Experience Layer                               │
├─────────────────────────┬──────────────────────────┬─────────────────────────┤
│  Next.js client         │  GraphQL/Analytics API   │  AI orchestration API   │
│  `client/src/app`       │  `server/src`            │  `ai-server/agents`     │
└──────────────┬──────────┴──────────────┬───────────┴──────────────┬──────────┘
               │                         │                          │
               ▼                         ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Service Integration Layer                         │
│  Apollo client `client/src/lib/apollo-client.ts`                           │
│  Next.js API proxies `client/src/app/api`                                  │
│  Express routers `server/src/analytics/routes.ts`                          │
│  AI run router `ai-server/agents/routes.ts`                                │
└──────────────────────────────┬───────────────────────────────┬──────────────┘
                               │                               │
                               ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Domain/Runtime Layer                           │
│  Neo4j GraphQL schema `server/src/graphql/schema.ts`                       │
│  Analytics projection sync `server/src/analytics/projections.ts`           │
│  LangGraph policy flow `ai-server/graph/buildGraph.ts`                     │
│  Temporal workers `analytics/runtime/src` and `ai-server/temporal`         │
└──────────────────────────────┬───────────────────────────────┬──────────────┘
                               │                               │
                               ▼                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Persistence and External Systems                     │
│  Neo4j `server/src/db/neo4j-client.ts`                                     │
│  ClickHouse/Cube `server/src/analytics/clickhouse.ts`,                     │
│  `server/src/analytics/cube.ts`                                            │
│  Keycloak via JWKS and service tokens                                      │
│  Temporal cluster via workflow clients/workers                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component                     | Responsibility                                                                               | File                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js app shell             | Provides layouts, locale scoping, runtime config hydration, auth-aware client bootstrapping  | `client/src/app/layout.tsx`, `client/src/app/[lang]/layout.tsx`, `client/src/components/layout/AppLayout.tsx`                                                 |
| Feature pages                 | Keep route files thin and delegate entity behavior to feature folders                        | `client/src/app/[lang]/applications/page.tsx`, `client/src/components/applications`                                                                           |
| Runtime config API            | Publishes runtime environment values to the browser without build-time embedding             | `client/src/app/api/runtime-config/route.ts`                                                                                                                  |
| AI API proxy                  | Keeps browser traffic on same-origin `/api/ai/*` and forwards to the AI service              | `client/src/app/api/ai/[...path]/route.ts`                                                                                                                    |
| GraphQL server                | Boots Express, mounts GraphQL and analytics routes, manages Neo4j lifecycle                  | `server/src/index.ts`                                                                                                                                         |
| GraphQL schema boundary       | Converts `schema.graphql` plus Neo4j auth rules into the executable API                      | `server/src/graphql/schema.ts`, `server/src/graphql/schema.graphql`                                                                                           |
| Analytics API                 | Validates requests, enforces company access, queries Cube, and triggers projection workflows | `server/src/analytics/routes.ts`                                                                                                                              |
| Analytics projection pipeline | Reads from Neo4j and writes denormalized analytics rows into ClickHouse                      | `server/src/analytics/projections.ts`, `server/src/analytics/clickhouse.ts`                                                                                   |
| AI server                     | Validates startup artifacts, seeds agent config, exposes AI run endpoints                    | `ai-server/agents/http/server.ts`                                                                                                                             |
| AI orchestration graph        | Normalizes requests, applies policy gates, chooses query/workflow execution path             | `ai-server/graph/buildGraph.ts`, `ai-server/policy`                                                                                                           |
| Temporal runtimes             | Execute long-running AI and analytics workflows outside request/response paths               | `ai-server/temporal/client/temporal-client.ts`, `ai-server/temporal/worker.ts`, `analytics/runtime/src/index.ts`, `analytics/runtime/src/analytics-worker.ts` |

## Pattern Overview

**Overall:** Multi-service modular monolith with service-local feature slices.

**Key Characteristics:**

- Separate deployable services exist at the repository root (`client`, `server`, `ai-server`, `analytics/runtime`, `auth`), but each service keeps related code close to its entry points.
- Browser-facing routes and HTTP handlers stay thin; substantial behavior moves into neighboring `components`, `lib`, `analytics`, `graph`, `policy`, or `temporal` modules.
- Long-running or cross-system work is offloaded to Temporal instead of being completed inline inside HTTP handlers.

## Layers

**Presentation Layer:**

- Purpose: Render localized UI, hold client-only providers, and expose same-origin API entry points for browser calls.
- Location: `client/src/app`, `client/src/components`, `client/src/contexts`, `client/src/lib`
- Contains: Next.js layouts/pages, API routes, providers, table/form feature modules.
- Depends on: GraphQL API, AI proxy endpoint, runtime config endpoint, Keycloak JS.
- Used by: End users in the browser.

**Application Service Layer:**

- Purpose: Accept HTTP requests, validate access, route work, and translate requests into graph/analytics/workflow operations.
- Location: `server/src/index.ts`, `server/src/analytics`, `ai-server/agents`, `client/src/app/api`
- Contains: Express routers, Next.js route handlers, proxy logic, workflow starters.
- Depends on: Domain/runtime modules, external auth, data stores.
- Used by: Browser client, background workers, and internal service-to-service calls.

**Domain and Policy Layer:**

- Purpose: Encode graph-backed business logic, AI request governance, and analytics query semantics.
- Location: `server/src/graphql`, `server/src/analytics/schema.ts`, `ai-server/graph`, `ai-server/policy`, `ai-server/artifacts`, `ai-server/state`
- Contains: Schema construction, analytics metadata, LangGraph nodes, artifact validation, policy enforcement.
- Depends on: Persistence/integration layer.
- Used by: HTTP handlers and Temporal workflows.

**Infrastructure Layer:**

- Purpose: Connect to Neo4j, Cube, ClickHouse, Keycloak, and Temporal.
- Location: `server/src/db`, `server/src/analytics/cube.ts`, `analytics/runtime/src/graphql/client.ts`, `ai-server/src/auth`, `compose.yml`
- Contains: Drivers, service-token auth, workflow clients, container topology.
- Depends on: Environment configuration.
- Used by: All runtime services.

## Data Flow

### Primary CRUD Request Path

1. A locale-scoped page renders through the app shell and providers (`client/src/app/[lang]/layout.tsx`, `client/src/components/layout/AppLayout.tsx`).
2. The page issues GraphQL operations through the Apollo client with Keycloak-derived bearer tokens (`client/src/app/[lang]/applications/page.tsx`, `client/src/lib/apollo-client.ts`).
3. The GraphQL server boots Express, mounts Apollo middleware, and forwards the auth token into Neo4j GraphQL context (`server/src/index.ts`).
4. The executable schema is created from `schema.graphql` plus JWKS-based authorization config (`server/src/graphql/schema.ts`).
5. Neo4j remains the source of truth via the shared driver (`server/src/db/neo4j-client.ts`).

### Analytics Refresh and Query Path

1. The server exposes `/analytics/projections/sync`, `/analytics/projections/refresh`, and `/analytics/query` through the analytics router (`server/src/analytics/routes.ts`).
2. Refresh requests start a Temporal workflow instead of doing the full projection refresh inline (`server/src/analytics/temporal-client.ts`).
3. The analytics scheduler reconciles recurring schedules and the analytics worker runs Temporal activities (`analytics/runtime/src/index.ts`, `analytics/runtime/src/analytics-worker.ts`).
4. Projection activities read graph data from Neo4j and replace denormalized rows in ClickHouse (`server/src/analytics/projections.ts`, `server/src/analytics/clickhouse.ts`).
5. Query requests read aggregated chart data from Cube using short-lived JWTs signed for analytics access (`server/src/analytics/cube.ts`).

### AI Run Path

1. The browser calls same-origin `/api/ai/*`, which proxies requests to the dedicated AI service (`client/src/app/api/ai/[...path]/route.ts`).
2. The AI server validates artifacts at startup, mounts `aiRunRouter`, and exposes health plus orchestration endpoints (`ai-server/agents/http/server.ts`).
3. AI routes verify Keycloak tokens, enforce company and role access, and decide whether to run governed query workflows or coordinator workflows (`ai-server/agents/routes.ts`).
4. Workflow starters hand execution to Temporal on the AI task queue (`ai-server/temporal/client/temporal-client.ts`).
5. LangGraph nodes apply artifact-backed normalization, policy enforcement, and graph-grounded query selection before data lookup or response formatting (`ai-server/graph/buildGraph.ts`).

**State Management:**

- Client UI state is local to pages/hooks/providers (`client/src/components/layout/AppLayout.tsx`, `client/src/contexts`, `client/src/hooks`).
- GraphQL server state is mostly stateless aside from shared driver instances and Express/Apollo process state (`server/src/db/neo4j-client.ts`, `server/src/index.ts`).
- AI reasoning state is explicit and serializable in `AiState`-style workflow/graph structures (`ai-server/state`).
- Long-running execution state is externalized to Temporal workflows (`ai-server/temporal`, `analytics/runtime/src`).

## Key Abstractions

**Feature Slice:**

- Purpose: Keep route files small and group entity-specific UI code by feature.
- Examples: `client/src/components/applications`, `client/src/app/[lang]/applications/page.tsx`
- Pattern: Thin page entry point plus adjacent `Form`, `Table`, `Toolbar`, `FilterDialog`, `types`, `utils`, and custom filter hook.

**Runtime Config Provider:**

- Purpose: Replace build-time public env usage with a runtime-fetched config document.
- Examples: `client/src/app/api/runtime-config/route.ts`, `client/src/lib/runtime-config.tsx`
- Pattern: Server route returns curated config; client provider caches and distributes it through hooks.

**Schema-as-boundary:**

- Purpose: Treat Neo4j GraphQL schema generation as the authoritative API assembly point.
- Examples: `server/src/graphql/schema.ts`, `server/src/graphql/schema.graphql`
- Pattern: Static schema file plus generated CRUD behavior and auth rules, rather than hand-written resolvers for every entity.

**Workflow Starter:**

- Purpose: Move durable or expensive work behind Temporal workflow starts.
- Examples: `server/src/analytics/temporal-client.ts`, `ai-server/temporal/client/temporal-client.ts`
- Pattern: HTTP route validates inputs, computes workflow id, then starts background execution with bounded timeouts.

**Artifact-governed AI graph:**

- Purpose: Constrain AI behavior to graph-grounded plans, query libraries, and policy checks.
- Examples: `ai-server/artifacts`, `ai-server/policy`, `ai-server/graph/buildGraph.ts`
- Pattern: Load artifacts first, normalize intent, ask for clarification when context is insufficient, and never bypass allowed query selection.

## Entry Points

**Client root layout:**

- Location: `client/src/app/layout.tsx`
- Triggers: Every browser request into the Next.js app.
- Responsibilities: Minimal document shell and global CSS imports.

**Locale app layout:**

- Location: `client/src/app/[lang]/layout.tsx`
- Triggers: Any locale-scoped page render.
- Responsibilities: Locale validation, message loading, runtime config provider wiring, app shell composition.

**GraphQL/analytics server process:**

- Location: `server/src/index.ts`
- Triggers: `yarn dev` or container startup for the `server` service.
- Responsibilities: Verify Neo4j connectivity, initialize analytics schema, mount `/analytics`, mount `/graphql`, expose `/health`.

**AI server process:**

- Location: `ai-server/index.ts`, `ai-server/agents/http/server.ts`
- Triggers: `yarn start` or container startup for the `ai-server` service.
- Responsibilities: Validate AI artifacts, bootstrap agent config, mount AI run routes, expose `/health`.

**Analytics scheduler:**

- Location: `analytics/runtime/src/index.ts`
- Triggers: `analytics-scheduler` container startup.
- Responsibilities: Reconcile recurring Temporal schedule for analytics projection refresh.

**Analytics worker:**

- Location: `analytics/runtime/src/analytics-worker.ts`
- Triggers: `analytics-worker` container startup.
- Responsibilities: Register and execute analytics workflow activities.

**AI worker:**

- Location: `ai-server/temporal/worker.ts`
- Triggers: AI worker process startup.
- Responsibilities: Register and execute AI workflows and activities.

## Architectural Constraints

- **Threading:** Each service is a single Node.js event loop process; concurrency for durable work is delegated to Temporal workers rather than in-process job runners.
- **Global state:** Shared mutable singletons exist for Neo4j driver (`server/src/db/neo4j-client.ts`), cached runtime config in browser memory (`client/src/lib/runtime-config.tsx`), client-side Emotion cache (`client/src/components/layout/AppLayout.tsx`), and memoized Temporal client promises (`server/src/analytics/temporal-client.ts`, `ai-server/temporal/client/temporal-client.ts`).
- **Service boundaries:** Browser code should not call `ai-server` directly; use `client/src/app/api/ai/[...path]/route.ts`. Analytics workers should call the server through configured internal URLs rather than importing server modules directly (`analytics/runtime/src/graphql/client.ts`).
- **Source of truth:** Neo4j is the authoritative operational store; ClickHouse and Cube are derived analytics stores refreshed from graph data (`server/src/analytics/projections.ts`, `server/src/analytics/cube.ts`).
- **Schema generation:** GraphQL client types are generated from the running API endpoint, not from the raw schema file (`client/codegen.ts`, `client/src/gql/generated.ts`).

## Anti-Patterns

### Direct browser coupling to internal services

**What happens:** Frontend code would reach internal service URLs directly and bypass same-origin route controls.
**Why it's wrong:** It couples browser behavior to deployment topology and duplicates auth/header logic.
**Do this instead:** Route browser AI traffic through `client/src/app/api/ai/[...path]/route.ts` and runtime-dependent URLs through `client/src/app/api/runtime-config/route.ts` plus `client/src/lib/runtime-config.tsx`.

### Fat page files with embedded feature logic

**What happens:** Entity pages accumulate table definitions, filter logic, form logic, and helper code in a single route file.
**Why it's wrong:** It makes later planning and generated changes harder because behavior is no longer localized by feature.
**Do this instead:** Follow the applications reference slice in `client/src/components/applications` and the entity placement guide in `docs/ENTITY-IMPLEMENTATION-PATTERN.md`.

## Error Handling

**Strategy:** Fail fast on startup for missing critical dependencies, validate request payloads at the boundary, and offload retryable long-running failures to workflow runtimes.

**Patterns:**

- Startup checks abort or degrade explicitly when Neo4j, artifacts, or service bootstrap prerequisites are unavailable (`server/src/index.ts`, `ai-server/agents/http/server.ts`).
- HTTP handlers validate payloads with schema guards and return typed 4xx/5xx responses (`server/src/analytics/routes.ts`, `ai-server/agents/routes.ts`).
- Background workers log fatal startup failures and exit so orchestration can restart them (`analytics/runtime/src/analytics-worker.ts`, `analytics/runtime/src/index.ts`).

## Cross-Cutting Concerns

**Logging:** Console logging is the default across services, with tagged prefixes for analytics, auth debug, AI runs, and workers (`server/src/index.ts`, `server/src/analytics/routes.ts`, `ai-server/agents/http/server.ts`).
**Validation:** Zod validates analytics request payloads; AI artifacts and policy modules validate AI execution eligibility before work starts (`server/src/analytics/routes.ts`, `ai-server/agents/http/server.ts`, `ai-server/policy`).
**Authentication:** Keycloak is the auth provider. The server uses JWKS-backed Neo4j GraphQL auth (`server/src/graphql/schema.ts`), Next.js uses Keycloak JS in the browser (`client/src/components/layout/AppLayout.tsx`), and service-to-service startup/bootstrap uses service tokens (`ai-server/agents/http/server.ts`).

---

_Architecture analysis: 2026-07-22_
