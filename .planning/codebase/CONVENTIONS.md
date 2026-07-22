# Coding Conventions

**Analysis Date:** 2026-07-22

## Naming Patterns

**Files:**

- Feature routes live in `client/src/app/[lang]/<entity>/page.tsx` and usually delegate UI work into `client/src/components/<entity>/`.
- Feature directories are plural, while component files are singular. Use `client/src/components/applications/ApplicationForm.tsx`, `client/src/components/applications/ApplicationTable.tsx`, and `client/src/components/applications/useApplicationFilter.ts` as the reference pattern.
- GraphQL documents are grouped one entity per file in `client/src/graphql/`, for example `client/src/graphql/application.ts` and `client/src/graphql/company.ts`.

**Functions:**

- Use camelCase for functions and hooks. Prefix hooks with `use`, as in `client/src/hooks/usePersistentColumnVisibility.tsx` and `client/src/components/applications/useApplicationFilter.ts`.
- Use verb-led handler names in React code, such as `handleFormSubmit`, `handleDelete`, and `handleTableReady` in `client/src/components/common/GenericTable.tsx`.

**Variables:**

- Use descriptive camelCase names. Boolean state typically uses `is*`, `has*`, or `show*`, for example `isFormOpen`, `showBusinessProcessRelationship`, and `hasAnalyticsWriteAccess` in `client/src/components/common/GenericTable.tsx`, `client/src/app/[lang]/applications/page.tsx`, and `server/src/analytics/routes.ts`.
- Translation handles are short and contextual, usually `t`, `tStatus`, `tTimeCategory`, or `tSevenR`, as seen in `client/src/components/applications/ApplicationTable.tsx`.

**Types:**

- Prefer generated GraphQL types from `client/src/gql/generated.ts` instead of hand-written duplicates. This pattern is visible in `client/src/app/[lang]/applications/page.tsx` and `client/src/components/applications/ApplicationForm.tsx`.
- Use `interface` for prop and config shapes and `type` for unions or inferred payloads, as in `client/src/components/common/GenericForm.tsx` and `ai-server/agents/routes.ts`.

## Code Style

**Formatting:**

- Prettier settings come from `.prettierrc`: 2-space indentation, single quotes, no semicolons, trailing commas `es5`, and `printWidth` 100.
- Preserve existing formatting in generated GraphQL strings and large schema blocks such as `client/src/graphql/application.ts` and `server/src/graphql/schema.graphql`.

**Linting:**

- Root TypeScript linting is configured in `.eslintrc.js`; the Next.js client uses `client/eslint.config.mjs`.
- The client intentionally relaxes several React hook rules and allows `console` usage. Do not re-enable those ad hoc in feature files unless the repository changes centrally in `client/eslint.config.mjs`.
- Unused parameters should use a leading underscore where needed. Both lint configs preserve `_`-prefixed arguments.

**TypeScript:**

- Keep `strict` TypeScript compatible. `client/tsconfig.json`, `server/tsconfig.json`, and `ai-server/tsconfig.json` all enable strict mode.
- In client code, prefer the `@/*` path alias from `client/tsconfig.json`. Server and AI server code use relative imports.

## Import Organization

**Order:**

1. Framework and third-party imports such as React, Material UI, Apollo, Zod, and TanStack packages.
2. Generated types and application libraries such as `@/gql/generated`, `@/lib/*`, and `@/hooks/*`.
3. Feature-local components and utilities by relative path.

**Path Aliases:**

- Use `@/*` only inside the client package, for example `@/graphql/application`, `@/lib/auth`, and `@/components/applications/ApplicationForm` in `client/src/app/[lang]/applications/page.tsx`.
- Do not introduce client-style aliases into `server/` or `ai-server/`; those packages consistently use relative imports such as `./analytics/routes` in `server/src/index.ts` and `../src/auth/auth-jwks` in `ai-server/agents/routes.ts`.

## Error Handling

**Patterns:**

- Validate inbound HTTP payloads with Zod and branch on `safeParse` results before doing work. `server/src/analytics/routes.ts` is the clearest model.
- Fail fast in entrypoints when infrastructure is unavailable. `server/src/index.ts`, `ai-server/index.ts`, and `ai-server/temporal/worker.ts` use `console.error` plus `process.exit(1)`.
- In UI code, surface operational failures to users with snackbars and keep dialogs open on mutation failure. See `client/src/app/[lang]/applications/page.tsx` and `client/src/components/common/GenericTable.tsx`.
- In deterministic backend utilities, throw explicit `Error` instances with actionable messages instead of returning ambiguous sentinel values. Examples: `ai-server/artifacts/graphql/render.ts`, `ai-server/graph/client/graphql-client.ts`, and `server/src/analytics/clickhouse.ts`.

## Logging

**Framework:** console

**Patterns:**

- Structured prefixes are preferred for operational logs, for example `[analytics][query]` in `server/src/analytics/routes.ts`, `[AI RUN][PATH_SELECTION]` in `ai-server/agents/routes.ts`, and `[AUTH DEBUG]` in `server/src/index.ts`.
- Debug logging is often gated by environment flags instead of local code edits. Follow the `AUTH_DEBUG` pattern in `server/src/index.ts`.

## Comments

**When to Comment:**

- Comment non-obvious behavior, migration constraints, SSR workarounds, and generic infrastructure. Good examples are in `client/next.config.js`, `client/codegen.ts`, and `client/src/hooks/usePersistentColumnVisibility.tsx`.
- Do not add narration for straightforward assignments or JSX wiring.

**JSDoc/TSDoc:**

- Reusable generic primitives use short doc blocks, especially `client/src/components/common/GenericForm.tsx` and `client/src/hooks/usePersistentColumnVisibility.tsx`.
- Feature files rely more on clear naming than on large API docs.

## Function Design

**Size:**

- Keep `page.tsx` files thin when possible and move form, table, filter, and helper logic into feature modules. `docs/ENTITY-IMPLEMENTATION-PATTERN.md` and `client/src/app/[lang]/applications/page.tsx` define the target shape.
- Large generic or orchestration modules exist, but new code should prefer smaller helpers over expanding already-large files such as `client/src/components/common/GenericForm.tsx` or `ai-server/agents/routes.ts`.

**Parameters:**

- Prefer object-shaped props and options for components and hooks. Examples include `GenericTableProps<TData, TFormValues>` in `client/src/components/common/GenericTable.tsx` and the options object in `client/src/hooks/usePersistentColumnVisibility.tsx`.

**Return Values:**

- Hooks return grouped state and callbacks, as in `client/src/hooks/usePersistentColumnVisibility.tsx`.
- Validation and policy utilities either return parsed structures or throw with explicit messages, as in `ai-server/artifacts/loader.ts` and `ai-server/policy/enforce.ts`.

## Module Design

**Exports:**

- GraphQL modules export named documents. See `client/src/graphql/application.ts`.
- Feature React files commonly default-export the main component and named-export related types or constants, as in `client/src/components/applications/ApplicationTable.tsx`.

**Barrel Files:**

- Barrel files are not a dominant pattern. Import from concrete modules instead of adding broad re-export layers.

## React Patterns

- Mark interactive UI modules with `'use client'`. This is standard in `client/src/app/[lang]/applications/page.tsx`, `client/src/components/common/GenericForm.tsx`, and `client/src/components/common/GenericTable.tsx`.
- Use `next-intl` for all user-facing strings. `useTranslations(...)` appears throughout `client/src/app/[lang]/` and `client/src/components/`.
- Use TanStack Form plus Zod schema factories for complex forms. `client/src/components/applications/ApplicationForm.tsx` is the reference pattern.
- Use TanStack Table V8 with `createColumnHelper`, `useReactTable`, and explicit column visibility state. Follow `client/src/components/applications/ApplicationTable.tsx` and `client/src/components/common/GenericTable.tsx`.
- Preserve SSR safety for browser-only state. `client/src/hooks/usePersistentColumnVisibility.tsx` shows the expected `typeof window` guard pattern.

## GraphQL Patterns

- Keep the server schema authoritative in `server/src/graphql/schema.graphql`.
- Store client operations in entity-scoped files under `client/src/graphql/` and consume them from page-level containers such as `client/src/app/[lang]/applications/page.tsx`.
- Regenerate GraphQL types from the live endpoint, not from a static schema snapshot. `client/codegen.ts` and `ai-server/codegen.ts` both require `GRAPHQL_URL` and explicitly use remote schema generation.
- Prefer generated enums and object types from `client/src/gql/generated.ts` in page, form, and table code.

## Workflow Conventions

- Use Yarn only. Root `package.json`, `client/package.json`, `server/package.json`, `ai-server/package.json`, and `analytics/runtime/package.json` all enforce Yarn via `preinstall` scripts.
- Use the workspace root scripts in `package.json` to orchestrate per-package work instead of inventing one-off commands.
- Scaffold new entities with `scripts/create-entity.sh` and follow the file layout documented in `docs/ENTITY-IMPLEMENTATION-PATTERN.md`.
- After GraphQL schema changes, rerun code generation in affected packages with `client/codegen.ts` and `ai-server/codegen.ts`.
- Keep translation files in sync across at least `client/messages/de.json` and `client/messages/en.json`; this repository also carries `client/messages/fr.json`.

## Documentation Expectations

- Update durable process and architectural guidance in `docs/`, especially `docs/CONTRIBUTING.md`, `docs/ENTITY-IMPLEMENTATION-PATTERN.md`, and `docs/RUNTIME_CONFIG.md`.
- Keep README-level scripts and service expectations aligned with actual package commands in `README.md` and the relevant `package.json` files.
- When changing shared behavior, document the source-of-truth file that future agents should follow, not just the immediate feature.

---

_Convention analysis: 2026-07-22_
