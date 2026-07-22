# Codebase Concerns

**Analysis Date:** 2026-07-22

## Tech Debt

**Company AI credential handling is mixed into normal entity reads and writes:**

- Issue: Company-level LLM configuration includes `llmKey` in the GraphQL schema and client queries/mutations, so the same secret field flows through standard CRUD and generated client types instead of a dedicated secret-management path.
- Files: `server/src/graphql/schema.graphql`, `client/src/graphql/company.ts`, `client/src/components/companies/CompanyForm.tsx`, `client/src/gql/generated.ts`, `ai-server/src/gql/generated.ts`
- Impact: Secret material becomes easy to over-fetch, cache, log, or expose in future UI changes; any planner touching company CRUD must treat a normal entity form as sensitive infrastructure.
- Fix approach: Move `llmKey` behind a dedicated server-side credential API or encrypted storage boundary, remove it from list queries, and treat write access separately from ordinary company updates.

**Large generated and orchestration files create high-change blast radius:**

- Issue: Core runtime behavior is concentrated in very large files, especially the AI route orchestration and generated GraphQL type files.
- Files: `ai-server/agents/routes.ts`, `client/src/gql/generated.ts`, `ai-server/src/gql/generated.ts`, `client/src/utils/excelDataService.ts`, `client/src/components/analytics/AnalyticsWorkspace.tsx`, `server/src/db/init-db.ts`
- Impact: Small changes require navigating thousand-line files, review becomes shallow, merge conflicts increase, and local regressions are harder to isolate.
- Fix approach: Split feature routing into narrower modules, keep generated files out of hand-edited concern lists, and extract focused services around analytics, import/export, and AI request handling.

**JSON import relationship support is incomplete for some entity types:**

- Issue: JSON import utilities explicitly leave application and data object relationship mapping as TODOs.
- Files: `client/src/utils/jsonInputUtils.ts`
- Impact: Import flows can silently create partial graphs, leaving data integrity gaps that look like successful imports from the UI.
- Fix approach: Complete relationship mapping for `applications` and `dataObjects`, then add import validation that rejects partial relationship support instead of proceeding with incomplete graph writes.

## Known Bugs

**Diagram viewer permissions are hard-coded off in the custom context menu:**

- Symptoms: The Excalidraw wrapper passes `isViewerRole={false}` instead of deriving permissions from auth or props.
- Files: `client/src/components/diagrams/components/ExcalidrawWrapper.tsx`
- Trigger: Open diagram context actions while expecting read-only behavior for viewer users.
- Workaround: None in code; future changes must inspect surrounding auth flow before trusting diagram-side authorization behavior.

**Add-related-elements dialog is only partially implemented:**

- Symptoms: The new dialog includes a TODO for actual loading and creation behavior.
- Files: `client/src/components/diagrams/dialogs/AddRelatedElementsDialogNew.tsx`
- Trigger: Attempt to use the newer related-elements flow in diagrams.
- Workaround: Use existing relationship editing paths until the new dialog owns a complete create/link flow.

## Security Considerations

**Legacy server auth helper decodes JWTs without signature verification:**

- Risk: The old auth module uses `jwt.decode` and labels it as simplified verification, which accepts untrusted token payloads if reused.
- Files: `server/src/auth/auth.ts`
- Current mitigation: Active analytics auth uses JWKS verification in `server/src/auth/auth-jwks.ts`, and the main GraphQL server forwards tokens to Neo4j GraphQL rather than using the legacy helper directly.
- Recommendations: Remove or quarantine the legacy module, fail builds on imports of `server/src/auth/auth.ts`, and keep all auth entry points on the JWKS-verified path.

**Admin API routes fall back to default Keycloak credentials:**

- Risk: Admin routes request Keycloak admin tokens with fallback credentials of `admin`/`admin` when env vars are absent.
- Files: `client/src/app/api/admin/keycloak-users/route.ts`, `client/src/app/api/admin/sync-company-ids/route.ts`, `client/src/app/api/admin/sync-company-ids/by-email/route.ts`
- Current mitigation: These routes are wrapped with `withAuth(..., true)` in the client server layer.
- Recommendations: Remove insecure fallbacks, fail closed when required env vars are missing, and centralize privileged Keycloak access behind a smaller internal service surface.

**AI provider secrets are available in multiple runtime surfaces:**

- Risk: `llmKey` appears in AI runtime request composition and in graph-derived company configuration, which expands the number of places where secret exposure can happen.
- Files: `ai-server/agents/routes.ts`, `ai-server/graph/buildGraph.ts`, `ai-server/src/shared/agents/llm.ts`, `client/src/app/[lang]/agentic-architect/page.tsx`, `client/src/components/layout/RootLayout.tsx`
- Current mitigation: The code conditionally sets the Authorization header only when a key exists.
- Recommendations: Keep secrets server-only, avoid exposing them through client-side company objects, and redact these fields from generated schemas consumed by the UI.

## Performance Bottlenecks

**Diagram editing persists large JSON payloads repeatedly to localStorage:**

- Problem: Diagram state, current diagram metadata, last saved scene, and viewport state are all serialized into localStorage during editor flows.
- Files: `client/src/components/diagrams/utils/DiagramStorageUtils.ts`, `client/src/components/diagrams/handlers/DiagramHandlers.ts`, `client/src/components/diagrams/components/DiagramEditor.tsx`, `client/src/components/diagrams/state/DiagramState.ts`
- Cause: Crash-recovery and convenience persistence are implemented through repeated JSON serialization of large scene payloads.
- Improvement path: Throttle writes harder, persist only deltas or lightweight references, and move large crash-recovery state to IndexedDB when diagram sizes grow.

**Analytics workspace complexity is concentrated in a single UI module:**

- Problem: The analytics workspace is a very large component with state persistence, report navigation, and UI orchestration in one place.
- Files: `client/src/components/analytics/AnalyticsWorkspace.tsx`
- Cause: Feature growth accumulated into one component rather than isolated hooks and child components.
- Improvement path: Extract state domains for report scope, folder state, query execution, and persistence into separate hooks before adding more analytics features.

## Fragile Areas

**AI server request routing is a single highly-coupled control surface:**

- Files: `ai-server/agents/routes.ts`
- Why fragile: Authentication, company context, LLM dispatch, response shaping, and agent orchestration are coupled in one very large route file.
- Safe modification: Change one route or one adapter boundary at a time, then run the narrowest available build or request-path validation before touching adjacent flows.
- Test coverage: `ai-server/package.json` reports `"No ai-server tests configured"`, so there is no executable safety net for this runtime.

**Graph import/export and Excel transformation code carries silent data-loss risk:**

- Files: `client/src/utils/excelDataService.ts`, `client/src/utils/jsonDataService.ts`, `client/src/utils/jsonInputUtils.ts`, `client/src/components/excel/operations.ts`
- Why fragile: High line counts, format translation logic, and incomplete relationship support make imports easy to partially succeed.
- Safe modification: Add schema-level assertions at every stage of transform/import, and validate relationship counts before commit-like final writes.
- Test coverage: No repository tests were found for these import/export paths during this concerns pass.

**Database bootstrap scripts encode business rules in large imperative seed logic:**

- Files: `server/src/db/init-db.ts`, `server/src/db/heatpump/heatpump-relationships.ts`, `server/src/db/heatpump/heatpump-application-interfaces.ts`
- Why fragile: Initialization logic mixes data seeding, normalization, and relationship creation in long files that are hard to reason about incrementally.
- Safe modification: Isolate one seed domain per module and make normalization idempotence explicit before changing graph bootstrap behavior.
- Test coverage: No seed-focused tests were detected from package manifests or discovered test files.

## Scaling Limits

**GraphQL type generation is already large enough to slow manual change review:**

- Current capacity: Generated client and AI GraphQL types are approximately 54k and 48k lines respectively.
- Limit: Any schema growth makes code review and conflict resolution progressively worse, especially when secret-bearing fields like `llmKey` remain in broad generated types.
- Scaling path: Split generated outputs by domain where possible, trim exposed schema surfaces, and keep generated files out of review-critical planning slices.

**HTTP body-size assumptions are optimistic for diagram-heavy usage:**

- Current capacity: The server accepts JSON and GraphQL bodies up to 50 MB.
- Limit: Larger collaborative diagrams can shift memory pressure and request latency into the Node process before durable storage becomes the bottleneck.
- Scaling path: Add payload metrics, enforce practical diagram-size thresholds, and move bulk asset handling out of synchronous request bodies where possible.

## Dependencies at Risk

**Framework version assumptions are inconsistent across repo guidance and implementation:**

- Risk: Project instructions and docs describe Next.js 15, while the actual client dependency is Next.js 16.2.7.
- Impact: Planning agents or contributors may apply the wrong migration, hydration, or router assumptions when touching the client.
- Migration plan: Update repo instructions and architecture docs to the installed major version, then audit for stale version-specific guidance before more frontend work lands.

## Missing Critical Features

**The AI and analytics runtimes do not have real automated test execution:**

- Problem: `ai-server/package.json` and `analytics/runtime/package.json` define test scripts that only print that no tests are configured, while the client package has no test script at all.
- Blocks: Safe refactoring of agent routing, Temporal workflows, analytics refresh, and client-heavy import/diagram flows.

**Import flows lack strict integrity gates for partially supported entities:**

- Problem: Import code contains explicit TODOs for relationship mapping and no hard stop for unsupported relationship shapes.
- Blocks: Reliable bulk migration and repeatable tenant onboarding from JSON or spreadsheet sources.

## Test Coverage Gaps

**AI orchestration runtime is effectively untested:**

- What's not tested: Route authorization, company context resolution, provider dispatch, timeout handling, and response normalization.
- Files: `ai-server/agents/routes.ts`, `ai-server/agents/strategy-generator/activities.ts`, `ai-server/src/shared/agents/llm.ts`
- Risk: Regressions will surface only in integrated environments with live credentials and company data.
- Priority: High

**Analytics scheduler and worker flows are effectively untested:**

- What's not tested: Temporal schedule reconciliation, projection sync auth, and GraphQL-to-analytics refresh behavior.
- Files: `analytics/runtime/src/index.ts`, `analytics/runtime/src/analytics/activities.ts`, `analytics/runtime/src/temporal-client.ts`
- Risk: Background refresh can fail silently or drift from deployment assumptions.
- Priority: High

**Client-side persistence and diagram recovery paths are underprotected:**

- What's not tested: localStorage recovery, corrupted persisted scene cleanup, pending diagram handoff, and viewer/edit permission interactions.
- Files: `client/src/components/diagrams/utils/DiagramStorageUtils.ts`, `client/src/components/diagrams/components/DiagramEditor.tsx`, `client/src/components/diagrams/components/ExcalidrawWrapper.tsx`, `client/src/contexts/CompanyContext.tsx`
- Risk: Users can lose work or inherit stale state without deterministic reproduction steps.
- Priority: High

## Immediate Watchpoints

**Before any future company or AI phase:**

- Watch `llmKey` exposure across `server/src/graphql/schema.graphql`, `client/src/graphql/company.ts`, and `client/src/components/companies/CompanyForm.tsx` before adding new AI settings or company admin UI.

**Before any auth or admin phase:**

- Watch for new imports or reuse of `server/src/auth/auth.ts`, and remove default-admin fallback behavior from `client/src/app/api/admin/keycloak-users/route.ts` and related admin sync routes before widening admin capabilities.

**Before any diagram or analytics phase:**

- Watch the size and coupling of `client/src/components/analytics/AnalyticsWorkspace.tsx`, `client/src/components/diagrams/handlers/DiagramHandlers.ts`, and `ai-server/agents/routes.ts`; these files should be split before major feature additions.

---

_Concerns audit: 2026-07-22_
