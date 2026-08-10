import { z } from 'zod'

/**
 * Requirement roots supported. BusinessCapability and DataObject were added
 * in Phase 2 (D-04); `businessProcess` was added in Phase 4 (D-01/D-02).
 * Mirrors `SovereigntyRootType` in `./types.ts` — kept as a
 * separate zod schema (not derived from the TS type) since zod schemas are
 * the runtime input boundary, not a mechanical mirror of compile-time types.
 */
export const rootTypeSchema = z.enum(['businessCapability', 'dataObject', 'businessProcess'])

/**
 * Shared args shape for `Query.sovereigntyAnalysis` and the root-identifying
 * portion of `Query.sovereigntyMarkers`. Validated at the resolver boundary,
 * before any Cypher runs, closing the Cypher-injection pitfall named in
 * 02-RESEARCH.md's Security Domain table (T-02-05) — `rootId`/`rootType`/
 * `companyId` are never passed to `repository.ts` unvalidated.
 */
export const sovereigntyAnalysisArgsSchema = z.object({
  companyId: z.string().trim().min(1),
  rootType: rootTypeSchema,
  rootId: z.string().trim().min(1),
})

/**
 * Args for `Query.sovereigntyCompanyRollup` (Task 1, 02-04). Same
 * validate-before-Cypher boundary as `sovereigntyAnalysisArgsSchema`
 * (T-02-05) — `companyId` is never passed to `companyRollup.ts` unvalidated.
 */
export const sovereigntyCompanyRollupArgsSchema = z.object({
  companyId: z.string().trim().min(1),
})

/**
 * The `sovereigntyMarkers` batch input. Capped at 500 nodes and REJECTED
 * (not silently truncated) when oversized — this directly closes the
 * "unbounded batch marker query = DoS/Information Disclosure" threat named
 * in 02-RESEARCH.md's Security Domain table (T-02-04).
 */
export const sovereigntyMarkerNodesSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
    })
  )
  .max(500)
