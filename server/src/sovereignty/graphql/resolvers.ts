import { loadFullSupportChain } from '../repository'
import { analyzeBusinessCapability, analyzeDataObject } from '../evaluator'
import { analyzeCompanyRollup } from '../companyRollup'
import { projectMarkers, resolveMarker } from '../markers'
import { sovereigntyAnalysisArgsSchema, sovereigntyCompanyRollupArgsSchema, sovereigntyMarkerNodesSchema } from '../validation'
import type { Finding, SovereigntyAnalysis, SovereigntyDimension } from '../types'
import neo4jDriver from '../../db/neo4j-client'

interface SovereigntyResolverContext {
  token?: string
}

interface SovereigntyAnalysisArgs {
  companyId: string
  rootType: string
  rootId: string
}

interface SovereigntyCompanyRollupArgs {
  companyId: string
}

interface SovereigntyMarkerNodeArg {
  id: string
  type: string
}

interface SovereigntyMarkersArgs {
  companyId: string
  rootType: string
  rootId: string
  nodes: SovereigntyMarkerNodeArg[]
}

interface DecodedAuth {
  companyIds: string[]
  roles: string[]
}

/**
 * Decodes the JWT already forwarded via `context.token` (see `req.headers.authorization`
 * wiring in server/src/index.ts) to extract `company_ids`/`roles` — the same claims the
 * declarative `@authorization` directive reads via `$jwt.company_ids`/`$jwt.roles`. This
 * custom resolver runs OUTSIDE that directive pipeline, so it must re-implement the same
 * check manually (T-02-01) before running any Cypher.
 */
function decodeAuth(token: string | undefined): DecodedAuth {
  if (!token) return { companyIds: [], roles: [] }

  const bearer = token.startsWith('Bearer ') ? token.slice(7) : token
  const parts = bearer.split('.')
  if (parts.length < 2) return { companyIds: [], roles: [] }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    ) as {
      company_ids?: unknown
      realm_access?: { roles?: unknown }
    }

    return {
      companyIds: Array.isArray(payload.company_ids) ? (payload.company_ids as string[]) : [],
      roles: Array.isArray(payload.realm_access?.roles)
        ? (payload.realm_access?.roles as string[])
        : [],
    }
  } catch {
    return { companyIds: [], roles: [] }
  }
}

const DIMENSION_ENUM_MAP: Record<SovereigntyDimension, string> = {
  strategicAutonomy: 'STRATEGIC_AUTONOMY',
  resilience: 'RESILIENCE',
  security: 'SECURITY',
  control: 'CONTROL',
}

function toGraphQLFinding(finding: Finding) {
  return {
    ...finding,
    dimension: DIMENSION_ENUM_MAP[finding.dimension],
  }
}

function toGraphQLAnalysis(analysis: SovereigntyAnalysis) {
  return {
    ...analysis,
    findings: analysis.findings.map(toGraphQLFinding),
  }
}

export const sovereigntyResolvers = {
  Query: {
    sovereigntyAnalysis: async (
      _parent: unknown,
      args: SovereigntyAnalysisArgs,
      context: SovereigntyResolverContext
    ) => {
      // Reject malformed rootType/companyId/rootId at the boundary (OWASP
      // ASVS V5), before the JWT check and before any Cypher runs — never
      // pass unvalidated strings into repository.ts's Cypher parameters
      // (T-02-05).
      const parsedArgs = sovereigntyAnalysisArgsSchema.parse(args)

      const { companyIds, roles } = decodeAuth(context.token)
      const isAdmin = roles.includes('admin')

      if (!isAdmin && !companyIds.includes(parsedArgs.companyId)) {
        throw new Error('Not authorized for this company')
      }

      const session = neo4jDriver.session()
      try {
        const chain = await loadFullSupportChain(
          session,
          companyIds,
          isAdmin,
          parsedArgs.rootType,
          parsedArgs.rootId
        )
        if (!chain) {
          throw new Error(`${parsedArgs.rootType} not found`)
        }
        const analysis =
          chain.rootType === 'businessCapability'
            ? analyzeBusinessCapability(chain)
            : analyzeDataObject(chain)
        return toGraphQLAnalysis(analysis)
      } finally {
        await session.close()
      }
    },

    sovereigntyMarkers: async (
      _parent: unknown,
      args: SovereigntyMarkersArgs,
      context: SovereigntyResolverContext
    ) => {
      // Same input-validation boundary as sovereigntyAnalysis, plus the
      // 500-node cap on `nodes` that closes the unbounded-batch DoS/
      // Information-Disclosure threat (T-02-04) — reject, never truncate.
      const parsedArgs = sovereigntyAnalysisArgsSchema.parse({
        companyId: args.companyId,
        rootType: args.rootType,
        rootId: args.rootId,
      })
      const nodes = sovereigntyMarkerNodesSchema.parse(args.nodes)

      const { companyIds, roles } = decodeAuth(context.token)
      const isAdmin = roles.includes('admin')

      if (!isAdmin && !companyIds.includes(parsedArgs.companyId)) {
        throw new Error('Not authorized for this company')
      }

      const session = neo4jDriver.session()
      try {
        const chain = await loadFullSupportChain(
          session,
          companyIds,
          isAdmin,
          parsedArgs.rootType,
          parsedArgs.rootId
        )
        if (!chain) {
          throw new Error(`${parsedArgs.rootType} not found`)
        }
        const analysis =
          chain.rootType === 'businessCapability'
            ? analyzeBusinessCapability(chain)
            : analyzeDataObject(chain)
        const markers = projectMarkers(analysis)

        return nodes.map(node => {
          const marker = resolveMarker(markers, node.id)
          return {
            nodeId: node.id,
            selfStatus: marker.selfStatus,
            downstreamStatus: marker.downstreamStatus,
          }
        })
      } finally {
        await session.close()
      }
    },

    sovereigntyCompanyRollup: async (
      _parent: unknown,
      args: SovereigntyCompanyRollupArgs,
      context: SovereigntyResolverContext
    ) => {
      // Same input-validation boundary as sovereigntyAnalysis (T-02-05) —
      // reject a malformed companyId before the JWT check and before any
      // Cypher runs.
      const parsedArgs = sovereigntyCompanyRollupArgsSchema.parse(args)

      const { companyIds, roles } = decodeAuth(context.token)
      const isAdmin = roles.includes('admin')

      if (!isAdmin && !companyIds.includes(parsedArgs.companyId)) {
        throw new Error('Not authorized for this company')
      }

      const session = neo4jDriver.session()
      try {
        return await analyzeCompanyRollup(session, parsedArgs.companyId)
      } finally {
        await session.close()
      }
    },
  },
}
