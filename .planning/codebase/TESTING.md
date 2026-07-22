# Testing Patterns

**Analysis Date:** 2026-07-22

## Test Framework

**Runner:**

- Workspace testing is partial rather than uniform.
- `server/package.json` declares `jest` and `ts-jest`, and exposes `yarn test` for the server package.
- `client/package.json` does not define a `test` script.
- `ai-server/package.json` defines `yarn test` as `echo "No ai-server tests configured"`.
- `analytics/runtime/package.json` defines `yarn test` as `echo "No analytics runtime tests configured"`.

**Assertion Library:**

- Jest assertions are the only explicit assertion library declared, via `server/package.json`.
- No client-side assertion library or browser test framework is configured in package scripts.

**Run Commands:**

```bash
yarn test                                  # Root aggregator across packages; incomplete because package coverage is uneven
cd server && yarn test                     # Only real automated test runner configured
cd client && yarn lint                     # Primary client verification step
cd client && yarn type-check               # Type safety check for frontend changes
cd client && node hydration-check.js       # Custom hydration-risk scan
cd ai-server && yarn verify-flexible-queries
cd ai-server && yarn validate-query-library
cd ai-server && yarn build                 # Required before validation scripts that use dist/
```

## Test File Organization

**Location:**

- No dedicated `*.test.*` or `*.spec.*` files were detected under `client/`, `server/`, `ai-server/`, or `analytics/runtime/` during this scan.
- `server/tsconfig.json` and `ai-server/tsconfig.json` both exclude `**/*.test.ts`, which indicates tests are expected to sit near source files once they exist.

**Naming:**

- Prefer `*.test.ts` for new package-local tests so they match the TypeScript excludes already present in `server/tsconfig.json` and `ai-server/tsconfig.json`.

**Structure:**

```text
server/src/<feature>.test.ts              # Expected future server unit/integration tests
client/src/<feature>.test.tsx             # Expected future client component tests
ai-server/<area>/<module>.test.ts         # Expected future AI policy and agent tests
```

## Test Structure

**Suite Organization:**

```typescript
// No repository-native Jest or component test suites detected.
// Use describe/it blocks close to the module under test when adding coverage.
```

**Patterns:**

- Static and script-based verification currently substitutes for most automated tests.
- Client changes are validated primarily with linting, type-checking, GraphQL code generation, and the hydration scan in `client/hydration-check.js`.
- AI server logic has deterministic verification scripts instead of test suites, especially `ai-server/scripts/verify-flexible-queries.ts` and the query-library validation flow referenced by `ai-server/package.json`.

## Mocking

**Framework:** Not detected

**Patterns:**

```typescript
// No repository-native mocking helpers detected.
// Future tests should stub external boundaries, not core business logic.
```

**What to Mock:**

- Neo4j, GraphQL HTTP, and ClickHouse boundaries from `server/src/db/neo4j-client.ts`, `server/src/analytics/clickhouse.ts`, and `ai-server/graph/client/graphql-client.ts`.
- Keycloak and JWKS interactions from `server/src/auth/auth-jwks.ts` and `ai-server/src/auth/auth-jwks.ts`.
- Temporal client calls from `server/src/analytics/temporal-client.ts` and `ai-server/temporal/client/temporal-client.ts`.
- Browser storage or `window` access used by client hooks such as `client/src/hooks/usePersistentColumnVisibility.tsx`.

**What NOT to Mock:**

- Pure validation and transformation logic in `ai-server/policy/`, `ai-server/artifacts/`, and client-side filter utilities under `client/src/components/*/utils.ts`.
- Zod schema behavior in modules like `server/src/analytics/routes.ts`; pass realistic payloads through the real schema.

## Fixtures and Factories

**Test Data:**

```typescript
// Current realistic fixture sources are repository assets rather than formal test factories:
// - client/demos/*.json for import-heavy frontend flows
// - ai-server/artifacts/query-library.json for governed query behavior
// - server/src/graphql/schema.graphql for schema-aware validations
```

**Location:**

- Use existing domain-shaped fixture sources from `client/demos/`, `ai-server/artifacts/`, and `server/src/graphql/` when building new tests.
- No shared `fixtures/` or factory helpers are currently present.

## Coverage

**Requirements:** None enforced

**View Coverage:**

```bash
# No coverage command or threshold is configured in package scripts.
```

## Current Coverage Shape

- Server package: test runner declared, but no discovered Jest test files.
- Client package: no automated unit or component tests configured; verification is mostly lint, type-check, hydration scan, and manual runtime checks.
- AI server package: no unit tests configured; verification relies on buildable TypeScript and deterministic script checks.
- Analytics runtime package: no automated tests configured.
- CI in `.github/workflows/build-and-push-images.yml` builds container images only; it does not run lint, type-check, or test commands.

## Test Types

**Unit Tests:**

- Not currently present in a meaningful way across the main packages.
- New pure-logic work should start here first, especially in `ai-server/policy/`, `ai-server/artifacts/`, `server/src/analytics/`, and client-side utility modules.

**Integration Tests:**

- Operational integration is mostly validated manually against running services described in `README.md`.
- Good future integration targets are `server/src/analytics/routes.ts`, GraphQL operations under `client/src/graphql/`, and workflow entrypoints in `ai-server/temporal/`.

**E2E Tests:**

- Not used in repository scripts.
- No Playwright, Cypress, or browser-driven test files were detected, even though lockfiles reference some transitive tooling.

## Common Patterns

**Async Testing:**

```typescript
// No canonical async test pattern exists yet.
// Follow the async API style already used in source modules such as
// server/src/analytics/routes.ts and ai-server/agents/routes.ts.
```

**Error Testing:**

```typescript
// Prefer asserting explicit messages and status branches from real validators,
// matching the fail-fast style in ai-server/artifacts/graphql/render.ts
// and server/src/analytics/routes.ts.
```

## Notable Gaps

- Root `package.json` advertises `yarn test`, `yarn test:client`, `yarn test:ai-server`, and `yarn test:analytics-runtime`, but only the server package has a real runner and the other packages do not provide meaningful automated coverage.
- Critical UI flows in `client/src/app/[lang]/` and reusable primitives in `client/src/components/common/` have no detected automated tests.
- Deterministic policy and query-governance logic in `ai-server/policy/`, `ai-server/graph/`, and `ai-server/artifacts/validation/` lacks unit-test coverage despite being high-value logic.
- Authentication and authorization branches in `server/src/auth/`, `client/src/lib/auth.ts`, and `ai-server/src/auth/` are not covered by detected automated tests.

## Verification For Future Work

- Frontend changes: run `cd client && yarn lint`, `cd client && yarn type-check`, and `cd client && node hydration-check.js`. If GraphQL operations or schema-facing types change, also run `cd client && yarn codegen`.
- Server changes: run `cd server && yarn build` and add Jest coverage next to the touched module. Prioritize route validation, auth guards, and analytics adapters.
- AI server changes: run `cd ai-server && yarn build`, `cd ai-server && yarn verify-flexible-queries`, and `cd ai-server && yarn validate-query-library`. If schema-driven artifacts change, also rerun `cd ai-server && yarn codegen` or `cd ai-server && yarn generate-schema-digest` as appropriate.
- Cross-service schema changes: start the GraphQL server described in `README.md`, then regenerate types in both `client/` and `ai-server/` using their `codegen.ts` files.
- Deployment or packaging changes: at minimum, ensure the affected image still builds under `.github/workflows/build-and-push-images.yml` or the equivalent local Docker build path.

---

_Testing analysis: 2026-07-22_
