# External Integrations

**Analysis Date:** 2026-07-22

## APIs and External Services

**Authentication and Identity:**

- Keycloak - OpenID Connect identity provider for both browser and server-side auth.
  - Runtime declarations: `compose.yml`, `k8s/values.yaml`, `env.template`.
  - Realm bootstrap: `auth/src/realm-export.json`.
  - Server verification path: `server/src/auth/auth-jwks.ts` and `server/src/graphql/schema.ts`.
  - Client integration surface: `client/src/lib/auth.ts`, `client/src/lib/auth-middleware.ts`, and `client/src/contexts/AuthContext.tsx`.
  - Service-account token flow for background jobs: `ai-server/src/auth/keycloak-service-token.ts` and `analytics/runtime/src/auth/keycloak-service-token.ts`.

**Graph Data API:**

- Internal GraphQL API - canonical application API exposed by the `server` service.
  - Entry point: `server/src/index.ts`.
  - Public route: `/graphql`.
  - Consumers: `client/src/graphql/`, `ai-server/graph/client/graphql-client.ts`, and `analytics/runtime/src/graphql/client.ts`.
  - Auth handoff: bearer token forwarded into Neo4j GraphQL in `server/src/index.ts`.

**AI Model Endpoint:**

- Configured LLM HTTP endpoint - external model provider defined by `AI_LLM_URL` and related settings in `env.template` and `compose.yml`.
  - Runtime caller: `ai-server/src/shared/agents/llm.ts`.
  - Workloads using it: Temporal AI workers defined in `ai-server/temporal/worker.ts` and routes in `ai-server/agents/routes.ts`.
  - Notes for planners: endpoint is optional, failover behavior is controlled by `AI_ALLOW_LLM_FALLBACK` in `env.template`.

**External Search Providers:**

- DuckDuckGo HTML, DuckDuckGo Lite, Wikipedia API, and optional SearXNG - used for AI web research.
  - Implementation: `ai-server/src/shared/agents/web-search.ts`.
  - Search orchestration: `ai-server/agents/internet-research/activities.ts`.
  - Provider configuration: `AI_SEARCH_PROVIDERS`, `AI_SEARCH_SEARXNG_URL`, and `AI_SEARCH_SEARXNG_API_KEY` in `env.template` and `compose.yml`.

**Realtime Diagram Collaboration:**

- Excalidraw Room - external websocket-compatible collaboration service deployed as its own container.
  - Runtime declarations: `compose.yml` service `excalidraw-room`.
  - Client websocket usage: `client/src/components/diagrams/hooks/useExcalidrawCollaboration.ts`.
  - Client runtime config variable: `EXCALIDRAW_WS_SERVER_URL` in `env.template` and `compose.yml`.

## Data Storage

**Databases:**

- Neo4j - primary system of record for the enterprise architecture graph.
  - Container and ports: `compose.yml` service `neo4j`.
  - Driver usage: `server/src/db/neo4j-client` and `server/src/graphql/schema.ts`.
  - Auth and sizing config: `env.template` and `k8s/values.yaml`.

- PostgreSQL for Keycloak - dedicated identity persistence store.
  - Container wiring: `compose.yml` service `keycloak-db`.
  - Helm mirror: `k8s/values.yaml` under `keycloak.db`.

- PostgreSQL for Temporal - dedicated workflow persistence store.
  - Container wiring: `compose.yml` service `temporal-db`.
  - Persistent asset path: `tools/temporal/postgres-data/` mounted from `compose.yml`.

- ClickHouse - projection store for analytics workloads.
  - Container wiring: `compose.yml` service `clickhouse`.
  - Table creation and mutation path: `server/src/analytics/clickhouse.ts`.
  - Initialization assets: `analytics/clickhouse/init/`.

**File and Asset Storage:**

- Local filesystem-backed volumes are used for service persistence in Compose.
  - Neo4j: `db/data`, `db/logs`, `db/import`, `db/plugins` from `compose.yml`.
  - Keycloak Postgres: `auth/data` from `compose.yml`.
  - ClickHouse: `analytics/clickhouse/data` and `analytics/clickhouse/log` from `compose.yml`.
  - CubeStore: `analytics/cubestore/data` and `analytics/cubestore/remote` from `compose.yml`.
- Kubernetes asset ConfigMaps are populated by `scripts/sync-k8s-asset-configmaps.sh` before Helm install or upgrade.

**Caching and Semantic Query Layer:**

- Cube - semantic query API over ClickHouse projections.
  - Container wiring: `compose.yml` service `cube`.
  - Schema source: `analytics/cube/cube.js` and `analytics/cube/model/`.
  - Query caller: `server/src/analytics/cube.ts`.
  - Auth token signing for Cube: `server/src/analytics/cube.ts` using `CUBEJS_API_SECRET`.

- CubeStore - cache and queue backend for Cube.
  - Container wiring: `compose.yml` service `cubestore`.
  - Runtime connection variables: `compose.yml` and `k8s/values.yaml`.

## Authentication and Identity

**Auth Provider:**

- Keycloak with OIDC and JWKS-backed JWT verification.
  - Browser client ID, server client ID, and realm values are defined in `env.template`.
  - GraphQL authorization uses the Keycloak JWKS URL assembled in `server/src/graphql/schema.ts`.
  - REST analytics auth reuses JWT verification in `server/src/analytics/auth.ts` and `server/src/auth/auth-jwks.ts`.
  - Bootstrapped realm clients and protocol mappers live in `auth/src/realm-export.json`.

**Identity propagation pattern:**

- Browser requests authenticate through Keycloak, then call the Next.js and GraphQL surfaces.
- The GraphQL server forwards bearer tokens directly into Neo4j GraphQL authorization in `server/src/index.ts`.
- Background runtimes fetch service-account tokens before calling protected GraphQL or analytics endpoints in `ai-server/src/auth/keycloak-service-token.ts` and `analytics/runtime/src/auth/keycloak-service-token.ts`.

## Monitoring and Observability

**Error Tracking:**

- Not detected as a dedicated SaaS integration. No Sentry, Datadog, or similar package/config surface was found in the inspected manifests.

**Logs:**

- Application and worker processes log to stdout and stderr through `console.*` calls in `server/src/index.ts`, `ai-server/agents/http/server.ts`, `analytics/runtime/src/index.ts`, and `analytics/runtime/src/analytics-worker.ts`.
- Container logs are the expected operational surface in Compose and Kubernetes.

**Health Endpoints:**

- GraphQL server exposes `/health` in `server/src/index.ts`.
- AI server exposes `/health` in `ai-server/agents/http/server.ts`.
- Runtime readiness for Temporal-backed services is inferred from process startup logs; no separate HTTP health probe exists for workers.

## CI/CD and Deployment

**Hosting and Packaging:**

- Local and VM/container deployments are modeled through `compose.yml`.
- Kubernetes packaging is provided as a Helm chart in `k8s/`.
- Image registry assumptions are documented in `k8s/README.md` and parameterized in `k8s/values.yaml` under `global.imageRegistry` and `global.imageRepository`.

**Container orchestration touchpoints:**

- Compose service boundaries, ports, networks, and container commands are defined centrally in `compose.yml`.
- Helm templates and values define the cluster equivalent in `k8s/templates/` and `k8s/values.yaml`.
- Traefik labels in `compose.yml` provide reverse-proxy routing for Neo4j, GraphQL, Keycloak, Excalidraw Room, Temporal UI, and the client.
- Ingress equivalents are provided in `k8s/values.yaml` and described in `k8s/README.md`.

**Build artifact synchronization:**

- Cube models are copied into `k8s/files/cube/` through `scripts/sync-cube-schema.sh` before Helm packaging.
- Branding and theme archives are published as ConfigMaps by `scripts/sync-k8s-asset-configmaps.sh`.

## Environment Configuration

**Required env vars by integration area:**

- Graph database: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_AUTH` in `env.template`.
- Auth: `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID_SERVER`, `KEYCLOAK_CLIENT_ID_CLIENT`, and Keycloak admin/database variables in `env.template`.
- Analytics: `ANALYTICS_ENABLED`, `ANALYTICS_API_URL`, `CLICKHOUSE_URL`, `CLICKHOUSE_DB`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`, `ANALYTICS_CUBE_INTERNAL_URL`, `CUBEJS_API_SECRET` in `env.template`.
- Temporal: `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `AI_RUN_TASK_QUEUE`, `ANALYTICS_PROJECTION_TASK_QUEUE`, and schedule variables in `env.template`.
- AI/LLM: `AI_LLM_URL`, `AI_LLM_MODEL`, `AI_LLM_API_KEY`, `AI_LLM_TIMEOUT_MS`, `AI_LLM_RETRY_COUNT`, `AI_ALLOW_LLM_FALLBACK` in `env.template`.
- External search: `AI_SEARCH_PROVIDERS`, `AI_SEARCH_SEARXNG_URL`, `AI_SEARCH_SEARXNG_API_KEY` in `env.template`.

**Secrets location:**

- Development and Compose secrets are expected in the root `.env`, based on `env.template`.
- Kubernetes secrets are externalized through Helm values and `existingSecret` hooks in `k8s/values.yaml`.

## Webhooks and Callbacks

**Incoming:**

- None detected as third-party webhook receivers.
- Internal refresh triggers exist as protected REST endpoints in `server/src/analytics/routes.ts` for `/analytics/projections/sync` and `/analytics/projections/refresh`.

**Outgoing:**

- AI runtime performs outbound HTTP calls to configured LLM endpoints in `ai-server/src/shared/agents/llm.ts`.
- AI runtime performs outbound HTTP calls to DuckDuckGo, Wikipedia, and optional SearXNG in `ai-server/src/shared/agents/web-search.ts`.
- Server performs outbound HTTP requests to ClickHouse in `server/src/analytics/clickhouse.ts` and Cube in `server/src/analytics/cube.ts`.
- Background runtimes perform outbound HTTP requests to the GraphQL API through `ai-server/graph/client/graphql-client.ts` and `analytics/runtime/src/graphql/client.ts`.

## Workflow and Data Exchange Boundaries

**Browser to backend:**

- The client calls GraphQL operations from `client/src/graphql/` and analytics endpoints via `client/src/components/analytics/api.ts`.
- Diagram collaboration bypasses GraphQL for realtime room traffic through the Excalidraw room websocket URL.

**Server to storage:**

- GraphQL resolves against Neo4j through the Neo4j driver and Neo4j GraphQL in `server/src/graphql/schema.ts`.
- Analytics projection refresh writes denormalized rows into ClickHouse via `server/src/analytics/projections.ts` and `server/src/analytics/clickhouse.ts`.

**Background orchestration:**

- AI HTTP requests start Temporal workflows using clients under `ai-server/temporal/client/temporal-client.ts`.
- Analytics refresh requests start Temporal workflows via `server/src/analytics/temporal-client.ts`.
- Analytics scheduler reconciles Temporal schedules in `analytics/runtime/src/temporal-client.ts` and `analytics/runtime/src/index.ts`.

**Cluster/runtime edges:**

- Compose networks `eam-network` and the external Traefik network mediate service-to-service and ingress traffic in `compose.yml`.
- Helm values mirror these boundaries for Kubernetes and surface ingress, persistence, and secret hooks in `k8s/values.yaml`.

---

_Integration audit: 2026-07-22_
