# Technology Stack

**Analysis Date:** 2026-07-22

## Languages

**Primary:**

- TypeScript - primary implementation language for the frontend, GraphQL server, AI runtime, and analytics runtime in `client/src/`, `server/src/`, `ai-server/`, and `analytics/runtime/src/`.

**Secondary:**

- JavaScript - runtime config and analytics semantic models in `client/next.config.js`, `analytics/cube/cube.js`, and `analytics/cube/model/`.
- GraphQL SDL - schema-first API definition in `server/src/graphql/schema.graphql`.
- YAML - deployment and artifact metadata in `compose.yml`, `k8s/values.yaml`, and `ai-server/artifacts/query-library-metadata.v1.0.0.yaml`.
- JSON - Keycloak realm bootstrap and versioned AI artifacts in `auth/src/realm-export.json` and `ai-server/artifacts/*.json`.
- Bash - project automation in `scripts/create-entity.sh`, `scripts/sync-k8s-asset-configmaps.sh`, and root helper scripts.

## Runtime

**Environment:**

- Node.js 20+ is the required application runtime, declared in `package.json` under `engines.node`.
- Containerized runtime is defined in `compose.yml` for Neo4j, server, ai-server, analytics runtime, Keycloak, ClickHouse, Cube, CubeStore, Temporal, and the Next.js client.

**Package Manager:**

- Yarn Berry 4.9.1 is the only supported package manager, declared in root `package.json`, `client/package.json`, `server/package.json`, `ai-server/package.json`, and `analytics/runtime/package.json`.
- npm is intentionally blocked by root wrappers in `prevent-npm.sh`, `use-yarn.sh`, `npm-wrapper.js`, and package `preinstall` guards.
- Lockfiles are present per package: `client/yarn.lock`, `server/yarn.lock`, `ai-server/yarn.lock`, and `analytics/runtime/yarn.lock`.

## Frameworks

**Core:**

- Next.js 16.2.7 with React 19.2.0 for the web client in `client/package.json` and `client/src/app/`.
- Apollo Client 3.8.0 for frontend GraphQL access in `client/package.json` and `client/src/graphql/`.
- Apollo Server Express 3.12.1 plus Express 4.18.2 for the GraphQL and analytics API in `server/package.json` and `server/src/index.ts`.
- Neo4j GraphQL 7.1.1 for schema-to-GraphQL generation and auth integration in `server/package.json` and `server/src/graphql/schema.ts`.
- Express 4.18.2 for the AI HTTP runtime in `ai-server/package.json` and `ai-server/agents/http/server.ts`.
- Temporal SDK packages for durable workflows in `server/package.json`, `ai-server/package.json`, and `analytics/runtime/package.json`.

**UI and Client Feature Libraries:**

- Material UI 7 and Emotion for UI rendering, declared in `client/package.json`.
- `next-intl` for i18n in `client/package.json` and `client/src/app/[lang]/layout.tsx`.
- TanStack React Table and TanStack React Form for CRUD-heavy entity screens in `client/package.json` and `client/src/components/`.
- Excalidraw plus `socket.io-client` for collaborative diagram editing in `client/package.json` and `client/src/components/diagrams/hooks/useExcalidrawCollaboration.ts`.
- SheetJS `xlsx` for import and export workflows in `client/package.json` and `client/src/components/excel/`.

**Analytics and AI:**

- ClickHouse is the analytics projection store configured in `compose.yml`, `env.template`, and accessed by `server/src/analytics/clickhouse.ts`.
- Cube and CubeStore provide the analytics semantic layer and cache/queue backend in `compose.yml` and `analytics/cube/`.
- LangChain Core and LangGraph support AI orchestration in `ai-server/package.json`.

**Testing:**

- Jest with `ts-jest` is configured for the server package in `server/package.json`.
- Client, AI server, and analytics runtime expose `test` scripts, but only the server has an actual test framework dependency in its package manifest.

**Build/Dev:**

- TypeScript compiler `tsc` builds `server/`, `ai-server/`, and `analytics/runtime/` via their package scripts.
- `ts-node-dev` drives live reload for `server` and `ai-server`, declared in `server/package.json` and `ai-server/package.json`.
- `tsx` is used for client-side scripts such as import utilities in `client/package.json`.
- GraphQL Code Generator is configured in `client/codegen.ts` and `ai-server/codegen.ts` to generate types from the live GraphQL endpoint.

## Key Dependencies

**Critical:**

- `next`, `react`, `react-dom` - frontend application runtime in `client/package.json`.
- `@apollo/client` - typed GraphQL access from the client in `client/src/graphql/`.
- `@neo4j/graphql` and `neo4j-driver` - GraphQL schema generation and Bolt access in `server/package.json`, `server/src/graphql/schema.ts`, and `server/src/db/neo4j-client`.
- `apollo-server-express` and `express` - GraphQL/REST serving in `server/src/index.ts`.
- `keycloak-js` - browser auth integration for the client, declared in `client/package.json` and paired with auth helpers in `client/src/lib/auth.ts` and `client/src/contexts/AuthContext.tsx`.
- `jwks-client` and `jsonwebtoken` - JWT verification and signed Cube access tokens in `server/src/auth/auth-jwks.ts` and `server/src/analytics/cube.ts`.
- `@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow` - workflow orchestration across `server`, `ai-server`, and `analytics/runtime`.

**Infrastructure:**

- `dotenv` and `dotenv-expand` - environment bootstrap in `client/codegen.ts`, `ai-server/codegen.ts`, `server/src/index.ts`, and runtime entrypoints.
- `helmet`, `cors`, and `compression` - HTTP hardening and transport middleware in `server/src/index.ts` and `ai-server/agents/http/server.ts`.
- `cubejs/cube`, `cubejs/cubestore`, `clickhouse/clickhouse-server`, `temporalio/auto-setup`, `temporalio/ui`, `quay.io/keycloak/keycloak`, and `neo4j:5.26` - service images pinned in `compose.yml` and mirrored through `k8s/values.yaml`.

## Build, Test, and Dev Commands

**Root workspace commands:**

- `yarn start` - starts the Docker Compose stack via root `package.json`.
- `yarn dev` - runs `docker-compose up` from root `package.json`.
- `yarn client` - starts the Next.js dev server from `client/package.json`.
- `yarn server` - starts the GraphQL API with `ts-node-dev` from `server/package.json`.
- `yarn ai-server` - starts the AI HTTP runtime from `ai-server/package.json`.
- `yarn analytics-runtime` - starts the analytics scheduler from `analytics/runtime/package.json`.
- `yarn build:all` - builds client, server, ai-server, and analytics runtime from root `package.json`.
- `yarn test` - delegates to client, server, and analytics runtime package test scripts from root `package.json`.

**Package-local commands that matter to planners:**

- `cd client && yarn codegen` regenerates `client/src/gql/generated.ts` using `client/codegen.ts`.
- `cd ai-server && yarn codegen` regenerates `ai-server/src/gql/generated.ts` using `ai-server/codegen.ts`.
- `cd ai-server && yarn generate-schema-digest` refreshes schema digest artifacts via `ai-server/scripts/generate-schema-digest.mjs`.
- `yarn sync:cube-schema` copies Cube models into Helm packaging inputs via `scripts/sync-cube-schema.sh`.
- `./scripts/sync-k8s-asset-configmaps.sh` publishes branding and theme archives required by the Helm chart.

## Configuration

**Environment:**

- Shared environment variables are documented in `env.template`.
- Client runtime configuration is injected through container environment in `compose.yml` and consumed by the Next.js runtime.
- GraphQL code generation depends on `GRAPHQL_URL` loaded from the root `.env` in `client/codegen.ts` and `ai-server/codegen.ts`.
- AI, analytics, Keycloak, ClickHouse, and Temporal settings are centralized in `env.template` and repeated as Helm values in `k8s/values.yaml`.

**Build and Tooling Config Files:**

- Root workspace: `package.json`.
- Client: `client/package.json`, `client/tsconfig.json`, `client/eslint.config.mjs`, `client/next.config.js`, `client/codegen.ts`.
- Server: `server/package.json`, `server/tsconfig.json`.
- AI runtime: `ai-server/package.json`, `ai-server/tsconfig.json`, `ai-server/codegen.ts`.
- Analytics runtime: `analytics/runtime/package.json`, `analytics/runtime/tsconfig.json`.
- Deployment: `compose.yml`, `k8s/Chart.yaml`, `k8s/values.yaml`.

## Notable Generated and Versioned Artifacts

**Generated Type and Schema Outputs:**

- `client/src/gql/generated.ts` is generated from the live GraphQL endpoint by `client/codegen.ts`.
- `ai-server/src/gql/generated.ts` is generated from the live GraphQL endpoint by `ai-server/codegen.ts`.
- `k8s/files/cube/` is generated from canonical analytics models under `analytics/cube/`, as documented in `k8s/README.md`.

**Versioned AI Artifacts:**

- `ai-server/artifacts/concept-dictionary.v1.0.0.json`.
- `ai-server/artifacts/intent-schema.v1.0.0.json`.
- `ai-server/artifacts/query-library.json` and `ai-server/artifacts/query-library.md`.
- `ai-server/artifacts/schema-digest.v1.0.0.ts` and `ai-server/scripts/generate-schema-digest.mjs`.
- Query library validation entrypoints under `ai-server/artifacts/validation/`.

## Service Boundaries

**Client boundary:**

- `client/` contains the Next.js web application, translating browser interactions into GraphQL, analytics, AI proxy, and Excalidraw collaboration calls.

**Primary API boundary:**

- `server/` exposes `/graphql`, `/analytics`, and `/health` from `server/src/index.ts`.
- GraphQL schema and Neo4j-backed authorization are assembled in `server/src/graphql/schema.ts`.

**AI boundary:**

- `ai-server/` exposes a separate REST runtime for AI orchestration in `ai-server/agents/http/server.ts`.
- Long-running AI work executes in the separate `ai-worker` command path defined by `compose.yml` and `ai-server/package.json`.

**Analytics boundary:**

- `analytics/runtime/` contains the scheduler and worker that operate through Temporal and call back into the server's protected analytics endpoints.
- `analytics/cube/` is the semantic layer configuration mounted directly into the Cube container.

**Infrastructure boundary:**

- `compose.yml` defines local/dev service topology.
- `k8s/` defines the Helm-packaged cluster topology and mirrors the same service decomposition.

## Platform Requirements

**Development:**

- Node.js 20+ and Yarn 4.9.1.
- Docker Engine with Compose support for the integrated stack in `compose.yml`.
- A populated root `.env` derived from `env.template`.

**Production:**

- Container runtime capable of running the images and network model described in `compose.yml`.
- Kubernetes 1.25+ and Helm 3.10+ for the packaged deployment in `k8s/README.md`.
- External ingress/TLS management and persistent storage for Neo4j, Keycloak Postgres, Temporal Postgres, ClickHouse, and CubeStore as configured in `k8s/values.yaml`.

---

_Stack analysis: 2026-07-22_
