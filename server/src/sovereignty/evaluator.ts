import { SOVEREIGNTY_DIMENSIONS, SOVEREIGNTY_MATURITY_LEVELS } from './types'
import type {
  AchievedLevels,
  AIComponentNode,
  ApplicationNode,
  BusinessCapabilityChain,
  BusinessProcessChain,
  DataObjectChain,
  Finding,
  InfrastructureNode,
  RequirementLevels,
  SovereigntyAnalysis,
  SovereigntyMaturityLevel,
  SovereigntyRootType,
  SovereigntyStatus,
  SupportChain,
  ViolatingElementType,
} from './types'

interface ClassifiableNode {
  readonly id: string
  readonly name: string
  readonly type: ViolatingElementType
  readonly achieved: AchievedLevels
}

function maturityIndex(level: SovereigntyMaturityLevel): number {
  return SOVEREIGNTY_MATURITY_LEVELS.indexOf(level)
}

/**
 * Phase 5 D-05: exported so `repository.ts` can share the sole ordinal
 * source of truth when folding max-per-dimension over the ancestor chain,
 * instead of duplicating the mapping (which would silently drift). Same
 * semantics as the private `maturityIndex` used inside this module.
 */
export function maturityIndexOrDefault(
  level: SovereigntyMaturityLevel | null,
  fallback: number = -1
): number {
  return level === null ? fallback : maturityIndex(level)
}

/**
 * Classifies a single support-chain node against the root's requirements,
 * producing one finding per dimension where the node is not GREEN. Missing
 * achieved values are always GREY (SOV-03), even when no requirement is set
 * for that dimension — GREY must never silently read as compliant-by-default.
 *
 * Phase 5 D-02 chain-premise deviation math: when both required and actual
 * are set, the deviation `maturityIndex(required) − maturityIndex(actual)`
 * decides the finding — `=== 1` is a one-step deviation (YELLOW), `>= 2` is
 * a two-or-more-step deviation (RED), `<= 0` is compliant (implicit GREEN,
 * no finding). The math uses `maturityIndex` only — no literal scale bound
 * (e.g. `4`) appears here, so extending `SOVEREIGNTY_MATURITY_LEVELS` never
 * requires touching this function (D-02 scale-independence).
 *
 * Shared by `analyzeBusinessCapability` and `analyzeDataObject` (Task 2) so
 * detail views, diagram markers, and the Temporal rollup never see two
 * diverging classifiers (RESEARCH.md Anti-Pattern 3).
 */
export function classifyNode(
  node: ClassifiableNode,
  required: RequirementLevels,
  chainPath: readonly string[]
): Finding[] {
  const findings: Finding[] = []
  const fullPath = [...chainPath, node.id]

  for (const dimension of SOVEREIGNTY_DIMENSIONS) {
    const requiredLevel = required[dimension]
    const actualLevel = node.achieved[dimension]

    if (actualLevel === null) {
      findings.push({
        violatingElementId: node.id,
        violatingElementType: node.type,
        violatingElementName: node.name,
        dimension,
        status: 'GREY',
        requiredLevel,
        actualLevel: null,
        chainPath: fullPath,
      })
      continue
    }

    if (requiredLevel === null) continue

    const deviation = maturityIndex(requiredLevel) - maturityIndex(actualLevel)
    if (deviation <= 0) continue

    findings.push({
      violatingElementId: node.id,
      violatingElementType: node.type,
      violatingElementName: node.name,
      dimension,
      status: deviation === 1 ? 'YELLOW' : 'RED',
      requiredLevel,
      actualLevel,
      chainPath: fullPath,
    })
  }

  return findings
}

/**
 * Phase 5 D-05: max-per-dimension merge of two RequirementLevels. Used to
 * fold a nested BC's `chain.required` with its ancestor's already-folded
 * `parentEffectiveReq`, producing the effective requirement seen by that
 * BC's downstream walkers. Reused from `foldEffectiveRequiredLevels` in
 * `repository.ts` for the same fold semantics, but exposed as a per-pair
 * pure helper here so the evaluator's descendant threading doesn't need a
 * whole ancestor-rows array.
 */
export function maxByDimension(
  a: RequirementLevels,
  b: RequirementLevels
): RequirementLevels {
  const pick = (
    left: SovereigntyMaturityLevel | null,
    right: SovereigntyMaturityLevel | null
  ): SovereigntyMaturityLevel | null => {
    if (left === null) return right
    if (right === null) return left
    return maturityIndex(left) >= maturityIndex(right) ? left : right
  }
  return {
    strategicAutonomy: pick(a.strategicAutonomy, b.strategicAutonomy),
    resilience: pick(a.resilience, b.resilience),
    security: pick(a.security, b.security),
    control: pick(a.control, b.control),
  }
}

function aggregateDownstreamStatus(findings: readonly Finding[]): SovereigntyStatus {
  if (findings.some(f => f.status === 'RED')) return 'RED'
  if (findings.some(f => f.status === 'YELLOW')) return 'YELLOW'
  if (findings.some(f => f.status === 'GREY')) return 'GREY'
  return 'GREEN'
}

/**
 * True when at least one of the four dimensions has a required level set —
 * the "ausgefüllt" (filled in) signal a true hierarchy root (no parent to
 * compare against at all) uses in place of a parent comparison (see
 * `rootIsFilledIn` in `analyzeBusinessCapability`/`analyzeBusinessProcess`).
 */
function hasAnyRequirement(required: RequirementLevels): boolean {
  return Object.values(required).some(level => level !== null)
}

/**
 * Recursively walks an Infrastructure and its `parentInfrastructure` edges.
 * `visited` is the set of element ids already on the current traversal path
 * (D-03): re-entering one of them stops silently (no finding, no recursion),
 * which is what makes a cyclic `parentInfrastructure` graph terminate. Each
 * child edge recurses with its own copy of the path-visited set so a
 * violation on one parent edge never suppresses or merges with a sibling
 * edge's result (D-01).
 */
function walkInfrastructure(
  infra: InfrastructureNode,
  required: RequirementLevels,
  chainPath: readonly string[],
  visited: ReadonlySet<string>
): Finding[] {
  if (visited.has(infra.id)) return []

  const pathVisited = new Set(visited)
  pathVisited.add(infra.id)
  const nextPath = [...chainPath, infra.id]

  const findings = classifyNode(infra, required, chainPath)

  for (const parent of infra.parentInfrastructure) {
    findings.push(...walkInfrastructure(parent, required, nextPath, pathVisited))
  }

  return findings
}

/**
 * Recursively walks an Application, its `hostedOn` Infrastructure, and its
 * `components` (D-02: the container's own classification always happens
 * before — and independently of — descending into components, so a
 * composite Application is never hidden behind fully-compliant components).
 * Same cycle-safe visited-set contract as `walkInfrastructure` (D-03).
 */
function walkApplication(
  app: ApplicationNode,
  required: RequirementLevels,
  chainPath: readonly string[],
  visited: ReadonlySet<string>
): Finding[] {
  if (visited.has(app.id)) return []

  const pathVisited = new Set(visited)
  pathVisited.add(app.id)
  const nextPath = [...chainPath, app.id]

  const findings = classifyNode(app, required, chainPath)

  for (const infra of app.hostedOn) {
    findings.push(...walkInfrastructure(infra, required, nextPath, pathVisited))
  }
  for (const component of app.components) {
    findings.push(...walkApplication(component, required, nextPath, pathVisited))
  }

  return findings
}

/**
 * Recursively walks an AIComponent and the Infrastructure it is hosted on.
 * Same cycle-safe visited-set contract as `walkInfrastructure` (D-03).
 */
function walkAIComponent(
  aiComponent: AIComponentNode,
  required: RequirementLevels,
  chainPath: readonly string[],
  visited: ReadonlySet<string>
): Finding[] {
  if (visited.has(aiComponent.id)) return []

  const pathVisited = new Set(visited)
  pathVisited.add(aiComponent.id)
  const nextPath = [...chainPath, aiComponent.id]

  const findings = classifyNode(aiComponent, required, chainPath)

  for (const infra of aiComponent.hostedOn) {
    findings.push(...walkInfrastructure(infra, required, nextPath, pathVisited))
  }

  return findings
}

/**
 * Walks only a `SupportChain`'s own direct supporting Applications/
 * AIComponents (not any nested capability children) against its own
 * `required` levels. Every top-level supporting entity starts its own fresh
 * visited-set branch (D-01) seeded only with the root id, so multi-parent/
 * composite/AIComponent edges are always evaluated independently of one
 * another.
 *
 * Phase 5 D-03: an optional `requiredOverride` lets the caller pass a folded
 * effective-Req (e.g. `BusinessCapabilityChain.effectiveRequiredLevels`)
 * instead of the raw `chain.required`, so downstream Application/AIComponent/
 * Infrastructure walks classify against the strictest requirement in the
 * ancestor chain rather than just the root's own. Undefined = keep today's
 * behavior (DataObject/BusinessProcess call sites unaffected until Plan B).
 */
function collectOwnFindings(chain: SupportChain, requiredOverride?: RequirementLevels): Finding[] {
  const required = requiredOverride ?? chain.required
  const findings: Finding[] = []

  for (const app of chain.supportingApplications) {
    findings.push(...walkApplication(app, required, [chain.rootId], new Set([chain.rootId])))
  }
  for (const aiComponent of chain.supportingAIComponents) {
    findings.push(
      ...walkAIComponent(aiComponent, required, [chain.rootId], new Set([chain.rootId]))
    )
  }

  return findings
}

/**
 * Shared analysis walk for any requirement root shape (`SupportChain`):
 * `analyzeDataObject` delegates here directly (a DataObject has no nested
 * children); `analyzeBusinessCapability` builds on `collectOwnFindings` plus
 * `walkChildCapabilities` below so detail views, diagram markers, and the
 * Temporal rollup never see two diverging traversal implementations
 * (RESEARCH.md Anti-Pattern 3).
 *
 * Phase 5 D-05: reads `chain.effectiveRequiredLevels` (repository-folded for
 * BC/BP, `= required` for DO) instead of `chain.required`, so downstream
 * walks classify against the strictest requirement seen in the ancestor
 * chain — not just this root's own.
 */
function analyzeSupportChain(
  chain: SupportChain & { readonly effectiveRequiredLevels: RequirementLevels },
  rootType: SovereigntyRootType
): SovereigntyAnalysis {
  // Same fallback as analyzeBusinessCapability/analyzeBusinessProcess:
  // hand-authored fixtures may leave effectiveRequiredLevels as a
  // null-quadruple; production paths always populate it (DO copies
  // `required` verbatim at load, BP folds via HAS_PARENT_PROCESS*0..).
  const effectiveRequirement = hasAnyRequirement(chain.effectiveRequiredLevels)
    ? chain.effectiveRequiredLevels
    : chain.required
  const findings = collectOwnFindings(chain, effectiveRequirement)

  return {
    rootId: chain.rootId,
    rootType,
    findings,
    // Phase 5 D-06 / RESEARCH §3.3: a requirement root's `selfStatus` seeds
    // `projectMarkers` — GREEN when the root's own required is filled in,
    // GREY otherwise (nothing to say about a root that has no requirement of
    // its own). No more parent-vs-own contradiction path exists after the
    // D-06 retirement, so the tri-state selfStatus collapses to this pair.
    selfStatus: hasAnyRequirement(chain.required) ? 'GREEN' : 'GREY',
    downstreamStatus: aggregateDownstreamStatus(findings),
    capabilityIds: [chain.rootId],
  }
}

/**
 * Recursively rolls up nested BusinessCapability children's (`HAS_PARENT`,
 * D-11) own findings into their ancestor, so a violation found only inside a
 * child/grandchild capability's own support chain still makes every
 * ancestor's `downstreamStatus` reflect it (worst-of-entire-subtree, per
 * user-confirmed expectation in nested-bc-sov-inheritance debug session).
 * Each nested finding's `chainPath` is re-prefixed with every ancestor id it
 * passed through on the way back up, so the displayed chain always starts at
 * the capability the caller asked about, not at the deepest descendant.
 *
 * Cycle-safe via the same per-branch visited-set contract as every other
 * walker in this module (D-03): each child gets its own copy of the
 * ancestor-visited set, so a capability re-entered on its own HAS_PARENT path
 * stops silently instead of recursing forever, while a capability shared by
 * two different parents (diamond shape) is still evaluated independently on
 * each path (D-01).
 *
 * Phase 5 D-05: `parentEffectiveReq` is the effective-Req of the outer BC in
 * the ancestor walk (equals `analysis root effectiveRequiredLevels` at the
 * top call). Each level's own `effectiveReq = maxByDimension(chain.required,
 * parentEffectiveReq)` — this is what walkers classify against AND what
 * recursion passes down to descendants. Descendants therefore see the
 * strictest requirement anywhere along their entire ancestor chain.
 *
 * Phase 5 Design A: for each nested BC whose subtree fails the BC's own
 * `effectiveReq`, synthesise a `Finding` naming the nested BC as
 * `violatingElementId` (violatingElementType `'businessCapability'`,
 * status = worst-of-dim over that subtree). This gives `projectMarkers`
 * everything it needs to produce the nested-BC fill via a single unified
 * findings-fold — no per-capability GREEN-backfill, no special-case
 * self-violation-set machinery.
 */
interface CapabilitySubtreeResult {
  readonly findings: Finding[]
  readonly capabilityIds: string[]
}

function worstStatusOf(findings: readonly Finding[]): SovereigntyStatus | null {
  if (findings.length === 0) return null
  if (findings.some(f => f.status === 'RED')) return 'RED'
  if (findings.some(f => f.status === 'YELLOW')) return 'YELLOW'
  if (findings.some(f => f.status === 'GREY')) return 'GREY'
  return null
}

function analyzeCapabilitySubtree(
  chain: BusinessCapabilityChain,
  visited: ReadonlySet<string>,
  parentEffectiveReq: RequirementLevels
): CapabilitySubtreeResult {
  if (visited.has(chain.rootId)) return { findings: [], capabilityIds: [] }

  const pathVisited = new Set(visited)
  pathVisited.add(chain.rootId)

  // Phase 5 D-05: descendant effective-Req = max of ancestor's already-folded
  // effectiveReq and this level's own required.
  const effectiveReq = maxByDimension(chain.required, parentEffectiveReq)

  const ownFindings = collectOwnFindings(chain, effectiveReq)

  const descendantFindings: Finding[] = []
  const capabilityIds: string[] = [chain.rootId]
  for (const child of chain.childCapabilities) {
    // D-03 cycle-safety: a `childCapabilities` entry that re-enters an
    // already-visited ancestor (including `chain` itself, an immediate
    // self-loop) must stop completely silently — no recursion.
    if (pathVisited.has(child.rootId)) continue

    const nested = analyzeCapabilitySubtree(child, pathVisited, effectiveReq)
    // Re-prefix nested findings' chainPath with this level's rootId so the
    // displayed chain always starts at the analysis root.
    for (const finding of nested.findings) {
      descendantFindings.push({ ...finding, chainPath: [chain.rootId, ...finding.chainPath] })
    }
    capabilityIds.push(...nested.capabilityIds)

    // Phase 5 Design A (RESEARCH §3.4): synthesise a per-nested-BC premise
    // finding whenever this child's subtree carries a real deviation
    // (RED/YELLOW/GREY) against its own effective-Req. Marker-only signal —
    // gives projectMarkers a natural fill for the nested BC via the single
    // findings-fold branch (id === violatingElementId → worseStatus), so no
    // per-capability GREEN-backfill or self-violation-set machinery is needed.
    const status = worstStatusOf(nested.findings)
    if (status !== null) {
      descendantFindings.push({
        violatingElementId: child.rootId,
        violatingElementType: 'businessCapability',
        violatingElementName: child.name ?? child.rootId,
        // Premise-verdict finding: single conceptual dimension. Dimension
        // 'strategicAutonomy' is used as a stable placeholder — projectMarkers
        // ignores the dimension for the isViolatingElement fold, and the
        // detail-view i18n copy renders the finding via its status alone.
        // (RESEARCH §3.4 Design A: "carries a different meaning conveyed via
        // i18n copy".)
        dimension: 'strategicAutonomy',
        status,
        requiredLevel: null,
        actualLevel: null,
        chainPath: [chain.rootId, child.rootId],
      })
    }
  }

  return {
    findings: [...ownFindings, ...descendantFindings],
    capabilityIds,
  }
}

/**
 * Analyzes a BusinessCapability's full support chain: its own direct
 * supporting Applications (with their composite `components` and
 * multi-parent `hostedOn` Infrastructure) and AIComponents, PLUS — recursively
 * — every nested child BusinessCapability's own support chain (D-11), each
 * evaluated against that child's own requirements folded with the ancestor
 * chain's effective-Req (D-05, max-per-dim).
 *
 * Phase 5 D-06: parent-vs-own required-level contradiction machinery is
 * retired. `selfStatus` is now GREEN when the root's own required is filled
 * in, GREY otherwise — no YELLOW-on-contradiction path (RESEARCH §5 Option a).
 */
export function analyzeBusinessCapability(chain: BusinessCapabilityChain): SovereigntyAnalysis {
  // Phase 5 D-05: prefer the repository-folded effectiveRequiredLevels when
  // it carries any dimension; otherwise fall back to the root's own required.
  // The fallback covers hand-authored fixtures that leave effectiveRequiredLevels
  // as a null-quadruple; production always populates it (the root itself sits
  // at HAS_PARENT*0 in the fold, so a lone root's effectiveRequiredLevels
  // equals its own required — the fallback preserves that identity).
  const effectiveRequirement = hasAnyRequirement(chain.effectiveRequiredLevels)
    ? chain.effectiveRequiredLevels
    : chain.required
  const { findings, capabilityIds } = analyzeCapabilitySubtree(
    chain,
    new Set(),
    effectiveRequirement
  )

  return {
    rootId: chain.rootId,
    rootType: 'businessCapability',
    findings,
    selfStatus: hasAnyRequirement(chain.required) ? 'GREEN' : 'GREY',
    downstreamStatus: aggregateDownstreamStatus(findings),
    capabilityIds,
  }
}

/**
 * Analyzes a DataObject's full support chain: Applications that use it or
 * serve as one of its data sources, and AIComponents trained with it (D-08).
 * Shares `classifyNode`/`analyzeSupportChain` with `analyzeBusinessCapability`
 * so both root types are classified identically.
 *
 * Phase 5 D-05 uniform shape: `chain.effectiveRequiredLevels` is set to
 * `chain.required` at load time by `loadDataObjectSupportChain` — no
 * per-rootType dispatch needed inside classifyNode.
 */
export function analyzeDataObject(chain: DataObjectChain): SovereigntyAnalysis {
  return analyzeSupportChain(chain, 'dataObject')
}

/**
 * Analyzes a BusinessProcess's achieved-chain (own requirements vs. the
 * Applications it is directly supported by, D-02). Phase 5 D-06 retires the
 * parentProcess required-vs-required consistency check that used to live
 * here — BP now behaves exactly like DO in shape (flat, no nested subtree),
 * with `chain.effectiveRequiredLevels` (repository-folded from
 * HAS_PARENT_PROCESS*0..) as the requirement seen by walkers. `selfStatus`
 * is GREEN if the root's own required is filled in, GREY otherwise (same
 * rule as BC, DO, and the DataObject entry point above).
 */
export function analyzeBusinessProcess(chain: BusinessProcessChain): SovereigntyAnalysis {
  // Fallback identical to BC entry — hand-authored fixtures may leave
  // effectiveRequiredLevels null; production always populates it via the
  // HAS_PARENT_PROCESS*0.. fold.
  const effectiveRequirement = hasAnyRequirement(chain.effectiveRequiredLevels)
    ? chain.effectiveRequiredLevels
    : chain.required
  const findings = collectOwnFindings(chain, effectiveRequirement)

  return {
    rootId: chain.rootId,
    rootType: 'businessProcess',
    findings,
    selfStatus: hasAnyRequirement(chain.required) ? 'GREEN' : 'GREY',
    downstreamStatus: aggregateDownstreamStatus(findings),
    capabilityIds: [chain.rootId],
  }
}
