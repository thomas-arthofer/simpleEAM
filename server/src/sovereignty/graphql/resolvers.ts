import { loadBusinessCapabilityChain } from '../repository'
import { analyzeBusinessCapability } from '../evaluator'
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
      const { companyIds, roles } = decodeAuth(context.token)
      const isAdmin = roles.includes('admin')

      if (!isAdmin && !companyIds.includes(args.companyId)) {
        throw new Error('Not authorized for this company')
      }

      if (args.rootType !== 'businessCapability') {
        throw new Error(`Unsupported rootType: ${args.rootType}`)
      }

      const session = neo4jDriver.session()
      try {
        const chain = await loadBusinessCapabilityChain(session, companyIds, isAdmin, args.rootId)
        if (!chain) {
          throw new Error('BusinessCapability not found')
        }
        return toGraphQLAnalysis(analyzeBusinessCapability(chain))
      } finally {
        await session.close()
      }
    },
  },
}
