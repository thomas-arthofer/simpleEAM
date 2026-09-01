import type {
  AIComponentNode,
  ApplicationNode,
  BusinessCapabilityChain,
  BusinessProcessChain,
  DataObjectChain,
  InfrastructureNode,
} from './types'

/** Human-readable label for one id that can appear in a Finding's `chainPath` (SOV-04). */
export interface ChainNodeLabel {
  readonly name: string
  readonly type: string
}

/**
 * Walks the same chain tree `repository.ts`'s `loadFullSupportChain` already
 * fetched (and the evaluator already walked) into an `id -> {name, type}`
 * lookup covering every element that can appear in any of this analysis's
 * findings' `chainPath` — the root itself, nested BusinessCapability
 * children, direct requirement parents, and every supporting Application/
 * AIComponent/Infrastructure reachable from them. Built entirely from data
 * already in memory (no fresh Neo4j lookup), so a resolved label can never
 * disagree with the finding it labels.
 *
 * Cycle-safe via a single shared `visited` set — mirrors the visited-set
 * guards `evaluator.ts`'s walkers use for the same underlying (possibly
 * cyclic, D-03) object graph.
 */
export function collectChainLabels(
  root: BusinessCapabilityChain | DataObjectChain | BusinessProcessChain
): Map<string, ChainNodeLabel> {
  const labels = new Map<string, ChainNodeLabel>()
  const visited = new Set<string>()

  function addInfrastructure(node: InfrastructureNode): void {
    if (visited.has(node.id)) return
    visited.add(node.id)
    labels.set(node.id, { name: node.name, type: 'infrastructure' })
    for (const parent of node.parentInfrastructure) addInfrastructure(parent)
  }

  function addApplication(node: ApplicationNode): void {
    if (visited.has(node.id)) return
    visited.add(node.id)
    labels.set(node.id, { name: node.name, type: 'application' })
    for (const infra of node.hostedOn) addInfrastructure(infra)
    for (const component of node.components) addApplication(component)
  }

  function addAIComponent(node: AIComponentNode): void {
    if (visited.has(node.id)) return
    visited.add(node.id)
    labels.set(node.id, { name: node.name, type: 'aiComponent' })
    for (const infra of node.hostedOn) addInfrastructure(infra)
  }

  function addChain(chain: BusinessCapabilityChain | DataObjectChain | BusinessProcessChain): void {
    if (visited.has(chain.rootId)) return
    visited.add(chain.rootId)
    labels.set(chain.rootId, { name: chain.name ?? chain.rootId, type: chain.rootType })

    for (const app of chain.supportingApplications) addApplication(app)
    for (const aiComponent of chain.supportingAIComponents) addAIComponent(aiComponent)

    if (chain.rootType === 'businessCapability') {
      for (const child of chain.childCapabilities) addChain(child)
    }
  }

  addChain(root)
  return labels
}
