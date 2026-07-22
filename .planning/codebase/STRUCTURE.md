# Codebase Structure

**Analysis Date:** 2026-07-22

## Directory Layout

```text
nextgen-eam/
├── ai-server/          # AI orchestration service, policy artifacts, Temporal AI runtime
├── analytics/          # Analytics infrastructure and Temporal analytics runtime
├── auth/               # Keycloak realm import, themes, and auth persistence assets
├── client/             # Next.js frontend, browser API routes, and feature UI slices
├── db/                 # Neo4j data directories and DB-related assets
├── docs/               # Human-maintained implementation and operations guidance
├── k8s/                # Helm chart and cluster deployment assets
├── sandbox/            # Isolated demo/prototyping Vite app
├── scripts/            # Repo-level automation such as entity generation and sync helpers
├── server/             # GraphQL API, analytics API, Neo4j access, operational backend logic
├── templates/          # Entity generation templates used by automation scripts
├── compose.yml         # Local multi-service runtime topology
└── package.json        # Workspace scripts coordinating subprojects
```

## Directory Purposes

**client/:**

- Purpose: Browser application and same-origin API facade.
- Contains: App Router pages/layouts in `client/src/app`, feature components in `client/src/components`, context/providers in `client/src/contexts`, browser/runtime integration in `client/src/lib`, generated GraphQL types in `client/src/gql/generated.ts`.
- Key files: `client/src/app/[lang]/layout.tsx`, `client/src/components/layout/AppLayout.tsx`, `client/src/app/api/runtime-config/route.ts`, `client/src/app/api/ai/[...path]/route.ts`, `client/codegen.ts`.

**server/:**

- Purpose: Main operational backend for GraphQL CRUD and analytics endpoints.
- Contains: Process entrypoint, Neo4j driver access, GraphQL schema files, analytics HTTP routes and projection logic.
- Key files: `server/src/index.ts`, `server/src/graphql/schema.ts`, `server/src/graphql/schema.graphql`, `server/src/db/neo4j-client.ts`, `server/src/analytics/routes.ts`.

**ai-server/:**

- Purpose: Dedicated AI orchestration service, artifacts, policy enforcement, and AI Temporal runtime.
- Contains: HTTP entrypoints under `ai-server/agents`, artifact bundles under `ai-server/artifacts`, graph/policy/state modules, worker and workflow clients.
- Key files: `ai-server/index.ts`, `ai-server/agents/http/server.ts`, `ai-server/agents/routes.ts`, `ai-server/graph/buildGraph.ts`, `ai-server/temporal/client/temporal-client.ts`.

**analytics/runtime/:**

- Purpose: Separate runtime for recurring analytics refresh scheduling and worker execution.
- Contains: Scheduler process, analytics Temporal worker, GraphQL client bridge back to the server.
- Key files: `analytics/runtime/src/index.ts`, `analytics/runtime/src/analytics-worker.ts`, `analytics/runtime/src/graphql/client.ts`.

**auth/:**

- Purpose: Keycloak import data, themes, and local auth-related state.
- Contains: Realm import files in `auth/src`, theme assets in `auth/themes`, DB data directories.
- Key files: `auth/src`, `auth/themes`.

**templates/:**

- Purpose: Source templates for automated entity creation.
- Contains: Scaffolding used by the entity generator.
- Key files: `templates/entity`.

**scripts/:**

- Purpose: Repo-level automation and operational helpers.
- Contains: Entity generation, analytics schema sync, k8s asset sync, versioning utilities.
- Key files: `scripts/create-entity.sh`, `scripts/sync-cube-schema.sh`, `scripts/version.sh`.

**docs/:**

- Purpose: Human-authored implementation guidance that planning/execution agents should follow.
- Contains: Entity implementation patterns, runtime configuration guidance, branding, deployment, analytics change checklists.
- Key files: `docs/ENTITY-IMPLEMENTATION-PATTERN.md`, `docs/RUNTIME_CONFIG.md`, `docs/CONTRIBUTING.md`.

## Key File Locations

**Entry Points:**

- `client/src/app/layout.tsx`: Global Next.js root layout.
- `client/src/app/[lang]/layout.tsx`: Locale-aware UI shell and provider composition.
- `server/src/index.ts`: Express/Apollo server bootstrap.
- `ai-server/index.ts`: AI service bootstrap.
- `analytics/runtime/src/index.ts`: Analytics scheduler bootstrap.
- `analytics/runtime/src/analytics-worker.ts`: Analytics Temporal worker bootstrap.

**Configuration:**

- `compose.yml`: Local service topology and container wiring.
- `package.json`: Workspace orchestration scripts and engine constraints.
- `client/next.config.js`: Next.js runtime configuration.
- `client/eslint.config.mjs`: Frontend lint rules.
- `server/tsconfig.json`, `ai-server/tsconfig.json`, `analytics/runtime/tsconfig.json`: TypeScript build boundaries.
- `k8s/values.yaml`: Deployment-time configuration defaults.

**Core Logic:**

- `client/src/components`: Frontend feature slices and shared UI.
- `server/src/graphql`: GraphQL schema definition and assembly.
- `server/src/analytics`: Analytics auth, routes, schema metadata, Cube, ClickHouse, and Temporal bridge.
- `ai-server/graph`: LangGraph orchestration.
- `ai-server/policy`: AI request guardrails and query selection rules.
- `ai-server/artifacts`: Versioned AI governance data and validators.

**Testing:**

- Test structure is sparse in the scanned architecture slice. No server test files were detected under `server/src/**/*.test.ts` during this pass.
- Service-local `test` scripts are defined in `package.json`, `server/package.json`, `client/package.json`, `ai-server/package.json`, and `analytics/runtime/package.json`, but architecture work should expect uneven automated coverage across services.

## Naming Conventions

**Files:**

- Route entry files use framework conventions: `page.tsx`, `layout.tsx`, `route.ts`.
- Feature component files use singular PascalCase names inside plural feature folders, for example `client/src/components/applications/ApplicationForm.tsx` and `client/src/components/applications/ApplicationTable.tsx`.
- Feature helper files use lower camel or descriptive lower-case patterns, for example `client/src/components/applications/useApplicationFilter.ts`, `client/src/components/applications/types.ts`, `client/src/components/applications/utils.ts`.
- Service entrypoints commonly use `index.ts` for process bootstrap, for example `server/src/index.ts`, `ai-server/index.ts`, and `analytics/runtime/src/index.ts`.

**Directories:**

- Root directories map to deployable services or infrastructure domains: `client`, `server`, `ai-server`, `analytics`, `auth`, `k8s`.
- Frontend entity directories are plural and live in parallel under `client/src/app/[lang]`, `client/src/components`, and `client/src/graphql`.
- Backend support code is grouped by concern rather than by entity inside services, for example `server/src/analytics`, `server/src/graphql`, `ai-server/policy`, `ai-server/state`.

## Where to Add New Code

**New frontend entity feature:**

- Primary route: `client/src/app/[lang]/<entity>/page.tsx`
- Feature UI slice: `client/src/components/<entity>/`
- GraphQL operations: `client/src/graphql/<entity>.ts`
- Generated types consumer: `client/src/gql/generated.ts`
- Translations: `client/messages/de.json` and `client/messages/en.json`
- Use the generator first: `scripts/create-entity.sh`

**New shared frontend behavior:**

- App-level providers or session/runtime wiring: `client/src/components/layout`, `client/src/contexts`, `client/src/lib`
- Generic UI building blocks: `client/src/components/common` if the behavior is reusable across multiple entity slices.

**New GraphQL-backed backend capability:**

- Graph data model or auth rules: `server/src/graphql/schema.graphql`
- Schema assembly or server bootstrap integration: `server/src/graphql/schema.ts`, `server/src/index.ts`
- Neo4j access helper: `server/src/db`

**New analytics capability:**

- HTTP boundary and auth checks: `server/src/analytics/routes.ts`
- Analytics metadata or Cube query construction: `server/src/analytics/schema.ts`, `server/src/analytics/cube.ts`
- Projection extraction from Neo4j: `server/src/analytics/projections.ts`
- Background scheduling/worker changes: `analytics/runtime/src`

**New AI orchestration behavior:**

- HTTP API boundary: `ai-server/agents/routes.ts` or `ai-server/agents/http`
- Query/path selection, policy, or graph steps: `ai-server/graph`, `ai-server/policy`, `ai-server/state`
- Workflow launch/worker wiring: `ai-server/temporal`
- Governance artifacts and validation: `ai-server/artifacts`

**Utilities:**

- Frontend shared helpers: `client/src/utils` or `client/src/lib`, depending on whether the code is UI-facing or integration-facing.
- Service-specific shared helpers: keep them inside the owning service, for example `server/src/analytics` or `ai-server/shared` rather than creating a cross-service root utility folder.

## Special Directories

**client/src/gql/:**

- Purpose: Generated GraphQL TypeScript types consumed by the frontend.
- Generated: Yes.
- Committed: Yes.

**templates/entity/:**

- Purpose: Template source for `scripts/create-entity.sh`.
- Generated: No.
- Committed: Yes.

**ai-server/artifacts/:**

- Purpose: Versioned AI governance artifacts, metadata, validators, and schema digests.
- Generated: Mixed. Files such as digests and query library assets are build/process outputs that are kept in-repo.
- Committed: Yes.

**auth/data/ and db/data/:**

- Purpose: Local persistent container state for Keycloak/Postgres and Neo4j.
- Generated: Yes.
- Committed: Repository contains the directories, but runtime contents are environment state and should not be treated as hand-edited source.

**k8s/files/ and k8s/templates/:**

- Purpose: Helm chart assets and rendered deployment inputs.
- Generated: Hand-maintained chart source.
- Committed: Yes.

**sandbox/:**

- Purpose: Isolated experimental frontend surface using Vite.
- Generated: No.
- Committed: Yes.

---

_Structure analysis: 2026-07-22_
