# Project-specific Copilot Instructions

This repository contains additional, high-priority Copilot rules for agent-based Neo4j reasoning.

Copilot MUST follow:

- .github/copilot-instructions.agent-based-reasoning.md

# NextGen EAM AI Coding Instructions

## Critical Rules

### Package Manager

⚠️ **NEVER use npm - YARN ONLY** ⚠️

- All commands must use `yarn` (Yarn Berry v4+)
- Running `npm install` or any npm command is forbidden
- Correct: `yarn install`, `yarn dev`, `yarn build`

## Architecture Overview

### Stack & Services

- **Frontend**: Next.js 15 (App Router) + Material UI 7 + Apollo Client
- **Backend**: GraphQL Server (Apollo) with Neo4j GraphQL Library
- **Database**: Neo4j graph database
- **Auth**: Keycloak with JWT/JWKS validation
- **Diagrams**: Excalidraw (custom fork integration)
- **Forms**: Tanstack Form with Zod validation
- **Tables**: Tanstack Table V8

### Service Communication

```
Client (Next.js :3000) → GraphQL (:4000) → Neo4j (:7474/:7687)
                       ↓
                   Keycloak (:8080)
```

**Key Integration Points:**

- GraphQL schema auto-generated from `server/src/graphql/schema.graphql` using `@neo4j/graphql`
- Client types generated with `yarn codegen` from live GraphQL endpoint (not static schema)
- Auth token passed via Authorization header, validated by Neo4j GraphQL Library with JWKS

## Development Workflows

### Starting Development

```bash
# Start all services (Docker)
docker-compose up -d

# Client development
cd client && yarn dev

# Generate GraphQL types (after schema changes)
cd client && yarn codegen
```

### Creating New Entities

Use the automated script - NEVER create entities manually:

```bash
./scripts/create-entity.sh <entity-name>
# Example: ./scripts/create-entity.sh companies
```

**What it generates:**

- GraphQL operations (`client/src/graphql/<entity>.ts`)
- React components following the Applications pattern
- Page component with full CRUD functionality
- Translations in `messages/de.json` and `messages/en.json`

**After generation, update:**

1. `availableValues` in `page.tsx` for entity-specific filters
2. GraphQL schema in `server/src/graphql/schema.graphql`
3. Run `yarn codegen` to regenerate types

## Code Patterns & Conventions

### Component Architecture (Critical)

**Reference Pattern**: `/client/src/app/[lang]/applications/` and `/client/src/components/applications/`

Every entity follows this structure:

```
src/
├── app/[lang]/<entity>/
│   └── page.tsx                    # Main page (keep minimal)
├── components/<entity>/
│   ├── types.ts                    # Entity-specific types
│   ├── utils.ts                    # Helper functions
│   ├── use<Entity>Filter.ts        # Custom filter hook
│   ├── <Entity>Form.tsx            # Form with Tanstack Form
│   ├── <Entity>Table.tsx           # Table with Tanstack Table
│   ├── <Entity>Toolbar.tsx         # Toolbar with actions
│   └── <Entity>FilterDialog.tsx   # Filter dialog
```

**Naming Convention**: Use SINGULAR for component files (`CompanyForm.tsx`, NOT `CompaniesForm.tsx`)

### Form Pattern (Tanstack Form)

```tsx
// ✅ CORRECT - Optimized validation
validators: {
  onChange: schema,   // Primary validation
  onSubmit: schema,   // Final validation
  // onBlur: only for external API checks
}

// ❌ WRONG - Don't duplicate validation
validators: {
  onChange: schema,
  onBlur: schema,     // ❌ Duplicate
  onMount: schema,    // ❌ Unnecessary
}

// ✅ CORRECT - Direct handler reference
onBlur={handleBlur}

// ❌ WRONG - Arrow function wrapper
onBlur={() => handleBlur()}
```

### Table Pattern (Tanstack Table V8)

```tsx
// Use column helper for type safety
const columnHelper = createColumnHelper<EntityType>()

const columns = useMemo(
  () => [
    columnHelper.accessor('name', { header: 'Name' }),
    // ...
  ],
  []
)

// Persistent column visibility
const { columnVisibility, onTableReady } = usePersistentColumnVisibility({
  tableKey: 'entity-name',
  defaultColumnVisibility: ENTITY_DEFAULT_COLUMN_VISIBILITY,
})
```

### GraphQL Patterns

**Client-side queries:**

```tsx
// Always use generated types
import { GetApplicationsQuery } from '@/gql/generated'

const { data, loading, error } = useQuery(GET_APPLICATIONS, {
  fetchPolicy: 'cache-and-network',
  variables: { where: companyWhere },
})
```

**Mutations with relationship updates:**

```tsx
// Use connect/disconnect for relationships
const input = {
  name: 'App Name',
  owners: {
    connect: [{ where: { node: { id: ownerId } } }],
  },
  supportsCapabilities: {
    disconnect: [{ where: { node: { id: oldCapId } } }],
    connect: [{ where: { node: { id: newCapId } } }],
  },
}
```

### Diagram Integration

Diagrams auto-sync relationships with database:

- When saving diagrams, elements are extracted from `diagramJson`
- Relationships created via `createDiagramRelationshipUpdates()` utility
- Updates use `createDiagramRelationshipUpdatesWithDisconnect()` to clear old relationships

### Multi-tenancy Pattern

**Company filtering is automatic:**

```tsx
// In components, use company context
const { selectedCompanyId } = useCompanyContext()
const companyWhere = useCompanyWhere('company') // relationship name

// In queries
useQuery(GET_ENTITIES, {
  variables: { where: companyWhere },
})
```

### Internationalization

```tsx
// Always use translations
const t = useTranslations('entity-name')

// In JSX
<Typography>{t('title')}</Typography>

// Add translations to both:
// - messages/de.json
// - messages/en.json
```

## Common Pitfalls

### Hydration Errors (Next.js 15 + MUI 7)

```tsx
// ✅ CORRECT - Same DOM structure
;<Box sx={{ display: isClient ? 'block' : 'none' }}>
  <ClientComponent />
</Box>

// ❌ WRONG - Different DOM structure
{
  isClient ? <ClientComponent /> : <ServerComponent />
}

// Always mark client components
;('use client')
```

### Form-Dialog Interaction

```tsx
// ✅ Dialog closes only in view mode
<Dialog open={isOpen} onClose={isViewMode ? onClose : undefined}>

// ✅ Close dialog after successful submit
onSubmit: async ({ value }) => {
  await submitData(value)
  onClose() // Always close after success
}
```

### GraphQL Codegen

**IMPORTANT:** Always use remote schema (live server), not static file:

```ts
// codegen.ts
schema: process.env.GRAPHQL_URL || 'http://localhost:4000/graphql'
```

The Neo4j GraphQL Library generates queries/mutations at runtime that aren't in static schema.

## File Locations

**Generated types:** `client/src/gql/generated.ts` - Always prefer over custom types  
**Generic components:** `client/src/components/common/` - Reusable UI (GenericTable, GenericDialog, etc.)  
**GraphQL operations:** `client/src/graphql/<entity>.ts` - One file per entity  
**Server schema:** `server/src/graphql/schema.graphql` - Single source of truth  
**Entity templates:** `templates/entity/` - Used by create-entity.sh script

## Testing & Debugging

```bash
# Health check
curl http://localhost:4000/health

# GraphQL Playground
open http://localhost:4000/graphql

# Neo4j Browser
open http://localhost:7474

# Check logs
docker-compose logs -f server
docker-compose logs -f neo4j
```

## Quick Reference

**Add new entity field:**

1. Update `server/src/graphql/schema.graphql`
2. Restart GraphQL server
3. Run `cd client && yarn codegen`
4. Add field to form/table components

**Fix hydration error:**

1. Mark component with `'use client'`
2. Ensure consistent DOM structure (server vs client)
3. Use AppRouterCacheProvider in layout

**Debug GraphQL:**

1. Check Network tab for actual query sent
2. Test query in GraphQL Playground
3. Verify Neo4j data with Cypher query in Neo4j Browser

---

**See full guidelines:** `.github/instructions/nextgen-eam.instructions.md`

<!-- GSD Configuration — managed by gsd-core installer -->
# Instructions for GSD

- Use the gsd-core skill when the user asks for GSD or uses a `gsd-*` command.
- Treat `/gsd-...` or `gsd-...` as command invocations and load the matching file from `.github/skills/gsd-*`.
- When a command says to spawn a subagent, prefer a matching custom agent from `.github/agents`.
- Do not apply GSD workflows unless the user explicitly asks for them.
- After completing any `gsd-*` command (or any deliverable it triggers: feature, bug fix, tests, docs, etc.), ALWAYS: (1) offer the user the next step by prompting via `ask_user`; repeat this feedback loop until the user explicitly indicates they are done.
<!-- /GSD Configuration -->
