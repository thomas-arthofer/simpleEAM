import type {
  AchievedLevels,
  AIComponentNode,
  ApplicationNode,
  BusinessCapabilityChain,
  DataObjectChain,
  InfrastructureNode,
  RequirementLevels,
} from '../types'

function requirementLevels(overrides: Partial<RequirementLevels> = {}): RequirementLevels {
  return {
    strategicAutonomy: null,
    resilience: null,
    security: null,
    control: null,
    ...overrides,
  }
}

function achievedLevels(overrides: Partial<AchievedLevels> = {}): AchievedLevels {
  return {
    strategicAutonomy: null,
    resilience: null,
    security: null,
    control: null,
    ...overrides,
  }
}

function infrastructureNode(
  overrides: Partial<InfrastructureNode> & Pick<InfrastructureNode, 'id' | 'name'>
): InfrastructureNode {
  return {
    type: 'infrastructure',
    achieved: achievedLevels(),
    parentInfrastructure: [],
    ...overrides,
  }
}

function applicationNode(
  overrides: Partial<ApplicationNode> & Pick<ApplicationNode, 'id' | 'name'>
): ApplicationNode {
  return {
    type: 'application',
    achieved: achievedLevels(),
    hostedOn: [],
    components: [],
    ...overrides,
  }
}

function aiComponentNode(
  overrides: Partial<AIComponentNode> & Pick<AIComponentNode, 'id' | 'name'>
): AIComponentNode {
  return {
    type: 'aiComponent',
    achieved: achievedLevels(),
    hostedOn: [],
    ...overrides,
  }
}

/**
 * eam-konzept.md §3 worked example: "Abrechnung" requires HIGH resilience;
 * Billing (Application) achieves HIGH; VM-web-03 (Infrastructure) achieves
 * only LOW — the single expected finding. The other 3 dimensions are given
 * satisfied achieved/required pairs on every node so the RED finding stays
 * isolated (fixture intent, not part of the concept doc's own example).
 */
export const redChainFixture: BusinessCapabilityChain = {
  rootId: 'cap-abrechnung',
  rootType: 'businessCapability',
  parentRequiredLevels: [],
  required: requirementLevels({
    strategicAutonomy: 'MEDIUM',
    resilience: 'HIGH',
    security: 'MEDIUM',
    control: 'MEDIUM',
  }),
  supportingAIComponents: [],
  childCapabilities: [],
  supportingApplications: [
    applicationNode({
      id: 'app-billing',
      name: 'Billing',
      achieved: achievedLevels({
        strategicAutonomy: 'MEDIUM',
        resilience: 'HIGH',
        security: 'MEDIUM',
        control: 'MEDIUM',
      }),
      hostedOn: [
        infrastructureNode({
          id: 'infra-vm-web-03',
          name: 'VM-web-03',
          achieved: achievedLevels({
            strategicAutonomy: 'MEDIUM',
            resilience: 'LOW',
            security: 'MEDIUM',
            control: 'MEDIUM',
          }),
        }),
      ],
    }),
  ],
}

/**
 * A supporting Application with no sovereigntyAch* values set at all (SOV-03)
 * — every dimension must classify GREY, never silently GREEN-by-default.
 */
export const greyChainFixture: BusinessCapabilityChain = {
  rootId: 'cap-grey',
  rootType: 'businessCapability',
  parentRequiredLevels: [],
  required: requirementLevels({ control: 'MEDIUM' }),
  supportingAIComponents: [],
  childCapabilities: [],
  supportingApplications: [
    applicationNode({
      id: 'app-unassessed',
      name: 'UnassessedApp',
      achieved: achievedLevels(),
      hostedOn: [],
    }),
  ],
}

/**
 * Achieved values satisfy (or exceed) the requirement on every dimension for
 * both the Application and its Infrastructure — expects zero findings and a
 * GREEN downstreamStatus.
 */
export const greenChainFixture: BusinessCapabilityChain = {
  rootId: 'cap-green',
  rootType: 'businessCapability',
  parentRequiredLevels: [],
  required: requirementLevels({
    strategicAutonomy: 'HIGH',
    resilience: 'HIGH',
    security: 'HIGH',
    control: 'HIGH',
  }),
  supportingAIComponents: [],
  childCapabilities: [],
  supportingApplications: [
    applicationNode({
      id: 'app-compliant',
      name: 'CompliantApp',
      achieved: achievedLevels({
        strategicAutonomy: 'HIGH',
        resilience: 'VERY_HIGH',
        security: 'HIGH',
        control: 'HIGH',
      }),
      hostedOn: [
        infrastructureNode({
          id: 'infra-compliant',
          name: 'CompliantInfra',
          achieved: achievedLevels({
            strategicAutonomy: 'HIGH',
            resilience: 'HIGH',
            security: 'VERY_HIGH',
            control: 'HIGH',
          }),
        }),
      ],
    }),
  ],
}

/**
 * D-01: an Infrastructure with 2 `parentInfrastructure` edges, one compliant
 * and one violating — expects the RED finding to name only the violating
 * parent, never a single "worst of" synthetic finding merging both edges.
 */
export const multiParentInfrastructureFixture: BusinessCapabilityChain = {
  rootId: 'cap-multi-parent',
  rootType: 'businessCapability',
  parentRequiredLevels: [],
  required: requirementLevels({ resilience: 'HIGH' }),
  supportingAIComponents: [],
  childCapabilities: [],
  supportingApplications: [
    applicationNode({
      id: 'app-multi-parent-host',
      name: 'MultiParentHostApp',
      achieved: achievedLevels({
        strategicAutonomy: 'HIGH',
        resilience: 'HIGH',
        security: 'HIGH',
        control: 'HIGH',
      }),
      hostedOn: [
        infrastructureNode({
          id: 'infra-child',
          name: 'ChildInfra',
          achieved: achievedLevels({
            strategicAutonomy: 'HIGH',
            resilience: 'HIGH',
            security: 'HIGH',
            control: 'HIGH',
          }),
          parentInfrastructure: [
            infrastructureNode({
              id: 'infra-parent-compliant',
              name: 'CompliantParentInfra',
              achieved: achievedLevels({
                strategicAutonomy: 'HIGH',
                resilience: 'HIGH',
                security: 'HIGH',
                control: 'HIGH',
              }),
            }),
            infrastructureNode({
              id: 'infra-parent-violating',
              name: 'ViolatingParentInfra',
              achieved: achievedLevels({
                strategicAutonomy: 'HIGH',
                resilience: 'LOW',
                security: 'HIGH',
                control: 'HIGH',
              }),
            }),
          ],
        }),
      ],
    }),
  ],
}

/**
 * D-02: a composite Application container with its own GREY achieved values
 * (nothing set) and 2 fully-compliant GREEN components — the container's own
 * GREY findings must be present in the output; it is never hidden behind its
 * components.
 */
export const compositeApplicationFixture: BusinessCapabilityChain = {
  rootId: 'cap-composite',
  rootType: 'businessCapability',
  parentRequiredLevels: [],
  required: requirementLevels({ control: 'MEDIUM' }),
  supportingAIComponents: [],
  childCapabilities: [],
  supportingApplications: [
    applicationNode({
      id: 'app-container',
      name: 'ContainerApp',
      achieved: achievedLevels(),
      components: [
        applicationNode({
          id: 'app-component-a',
          name: 'ComponentA',
          achieved: achievedLevels({
            strategicAutonomy: 'HIGH',
            resilience: 'HIGH',
            security: 'HIGH',
            control: 'HIGH',
          }),
        }),
        applicationNode({
          id: 'app-component-b',
          name: 'ComponentB',
          achieved: achievedLevels({
            strategicAutonomy: 'HIGH',
            resilience: 'HIGH',
            security: 'HIGH',
            control: 'HIGH',
          }),
        }),
      ],
    }),
  ],
}

/**
 * D-03: Application A's `components` includes B, and B's `components`
 * includes A — a genuine cyclic object graph (mutated in after construction
 * since both nodes must reference each other). Traversal must terminate
 * without throwing or looping infinitely.
 */
function buildCyclicApplicationFixture(): BusinessCapabilityChain {
  const appA: ApplicationNode = applicationNode({
    id: 'app-cycle-a',
    name: 'CycleAppA',
    achieved: achievedLevels({ security: 'MEDIUM' }),
  })
  const appB: ApplicationNode = applicationNode({
    id: 'app-cycle-b',
    name: 'CycleAppB',
    achieved: achievedLevels({ security: 'LOW' }),
    components: [appA],
  })
  // Mutate after construction to close the cycle — readonly is a compile-time
  // guard only, and this is the one place a genuine cyclic fixture requires
  // reaching past it.
  ;(appA as unknown as { components: ApplicationNode[] }).components = [appB]

  return {
    rootId: 'cap-cycle',
    rootType: 'businessCapability',
    parentRequiredLevels: [],
    required: requirementLevels({ security: 'MEDIUM' }),
    supportingAIComponents: [],
    supportingApplications: [appA],
    childCapabilities: [],
  }
}

export const cyclicApplicationFixture: BusinessCapabilityChain = buildCyclicApplicationFixture()

/**
 * D-08: a DataObject root with one supporting Application (via
 * `usedByApplications`) achieving below the required security level.
 */
export const dataObjectChainFixture: DataObjectChain = {
  rootId: 'dataobject-customer-records',
  rootType: 'dataObject',
  required: requirementLevels({ security: 'HIGH' }),
  supportingAIComponents: [],
  supportingApplications: [
    applicationNode({
      id: 'app-consumer',
      name: 'ConsumerApp',
      achieved: achievedLevels({
        strategicAutonomy: 'HIGH',
        resilience: 'HIGH',
        security: 'MEDIUM',
        control: 'HIGH',
      }),
    }),
  ],
}

/**
 * An entity with achieved set on 2 of 4 dimensions and missing on the other
 * 2 — expects independent per-dimension findings (GREY for the 2 missing,
 * RED for the violated set dimension, no finding for the satisfied one).
 */
export const partialAchievedFixture: BusinessCapabilityChain = {
  rootId: 'cap-partial',
  rootType: 'businessCapability',
  parentRequiredLevels: [],
  required: requirementLevels({ strategicAutonomy: 'HIGH', resilience: 'HIGH' }),
  supportingAIComponents: [],
  childCapabilities: [],
  supportingApplications: [
    applicationNode({
      id: 'app-partial',
      name: 'PartialApp',
      achieved: achievedLevels({ strategicAutonomy: 'LOW', resilience: 'HIGH' }),
    }),
  ],
}

/**
 * D-11 regression fixture (nested-bc-sov-inheritance): reproduces the
 * reported "gemeinsamer max" topology — a parent BusinessCapability with two
 * `childCapabilities` ("TEST" and "Wichtiger Businesscase"). "TEST" has its
 * own `sovereigntyReqStrategicAutonomy: VERY_HIGH` requirement violated by
 * its own direct supporting Application ("schlechte app", achieved LOW).
 * "Wichtiger Businesscase" is fully compliant via "gute app". The parent
 * itself has no direct supporting Applications/AIComponents of its own — its
 * `downstreamStatus` must still roll up to RED because of the violation
 * nested 2 levels down inside "TEST", not stay GREEN just because the parent
 * has no direct violations of its own.
 */
export const nestedCapabilitySubtreeFixture: BusinessCapabilityChain = {
  rootId: 'cap-gemeinsamer-max',
  rootType: 'businessCapability',
  parentRequiredLevels: [],
  required: requirementLevels(),
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [
    {
      rootId: 'cap-test',
      rootType: 'businessCapability',
      parentRequiredLevels: [],
      required: requirementLevels({ strategicAutonomy: 'VERY_HIGH' }),
      supportingAIComponents: [],
      childCapabilities: [],
      supportingApplications: [
        applicationNode({
          id: 'app-schlechte-app',
          name: 'schlechte app',
          achieved: achievedLevels({ strategicAutonomy: 'LOW' }),
        }),
      ],
    },
    {
      rootId: 'cap-wichtiger-businesscase',
      rootType: 'businessCapability',
      parentRequiredLevels: [],
      required: requirementLevels({ strategicAutonomy: 'MEDIUM' }),
      supportingAIComponents: [],
      childCapabilities: [],
      supportingApplications: [
        applicationNode({
          id: 'app-gute-app',
          name: 'gute app',
          achieved: achievedLevels({
            strategicAutonomy: 'MEDIUM',
            resilience: 'MEDIUM',
            security: 'MEDIUM',
            control: 'MEDIUM',
          }),
        }),
      ],
    },
  ],
}

/**
 * 02.3 D-01/D-06: a root whose own required security (MEDIUM) is weaker than
 * its direct parent's required security (HIGH) — the ROOT-only tracer case.
 * Expects exactly one YELLOW finding naming the root as the violating
 * element, `requiredLevel` from the parent, `actualLevel` from the root's
 * own required, and `chainPath: ['cap-parent-strict', 'cap-root-weaker']`.
 */
export const rootParentContradictionFixture: BusinessCapabilityChain = {
  rootId: 'cap-root-weaker',
  rootType: 'businessCapability',
  required: requirementLevels({ security: 'MEDIUM' }),
  parentRequiredLevels: [
    { id: 'cap-parent-strict', required: requirementLevels({ security: 'HIGH' }) },
  ],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [],
}

/**
 * 02.3 D-01/D-06: a root whose own required security (HIGH) is equal to or
 * stricter than its direct parent's required security (MEDIUM) — no
 * contradiction, so no finding and `selfStatus` stays the general GREY
 * (Test C / Test F).
 */
export const rootParentNoContradictionFixture: BusinessCapabilityChain = {
  rootId: 'cap-root-stricter',
  rootType: 'businessCapability',
  required: requirementLevels({ security: 'HIGH' }),
  parentRequiredLevels: [
    { id: 'cap-parent-looser', required: requirementLevels({ security: 'MEDIUM' }) },
  ],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [],
}

/**
 * 02.3 D-01 descendant half / Test J: a three-level chain (root -> child ->
 * grandchild) where each level's required level is weaker than the one
 * above it. `analyzeCapabilitySubtree`'s existing recursion already has the
 * immediate parent in scope at each level, so the grandchild's finding must
 * compare against the CHILD's required level (MEDIUM), not the root's
 * (HIGH) — proving the descendant check uses the immediate in-scope parent.
 */
export const descendantParentContradictionFixture: BusinessCapabilityChain = {
  rootId: 'cap-root-3lvl',
  rootType: 'businessCapability',
  required: requirementLevels({ security: 'HIGH' }),
  parentRequiredLevels: [],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [
    {
      rootId: 'cap-child-3lvl',
      rootType: 'businessCapability',
      required: requirementLevels({ security: 'MEDIUM' }),
      parentRequiredLevels: [],
      supportingAIComponents: [],
      supportingApplications: [],
      childCapabilities: [
        {
          rootId: 'cap-grandchild-3lvl',
          rootType: 'businessCapability',
          required: requirementLevels({ security: 'LOW' }),
          parentRequiredLevels: [],
          supportingAIComponents: [],
          supportingApplications: [],
          childCapabilities: [],
        },
      ],
    },
  ],
}

/**
 * 02.3 D-02: a root with TWO parents, both stricter than the root's own
 * required control level — expects exactly TWO independent findings (one
 * per parent edge), never a collapsed worst-of finding (Test K).
 */
export const multiParentBothStricterFixture: BusinessCapabilityChain = {
  rootId: 'cap-root-multi-both',
  rootType: 'businessCapability',
  required: requirementLevels({ control: 'LOW' }),
  parentRequiredLevels: [
    { id: 'p1', required: requirementLevels({ control: 'MEDIUM' }) },
    { id: 'p2', required: requirementLevels({ control: 'HIGH' }) },
  ],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [],
}

/**
 * 02.3 D-02: a root with TWO parents where only one is stricter than the
 * root's own required control level — expects exactly ONE finding, from the
 * stricter parent only; the root is flagged "below ANY parent", not
 * required to be below ALL (Test L).
 */
export const multiParentOnlyOneStricterFixture: BusinessCapabilityChain = {
  rootId: 'cap-root-multi-one',
  rootType: 'businessCapability',
  required: requirementLevels({ control: 'MEDIUM' }),
  parentRequiredLevels: [
    { id: 'p-strict', required: requirementLevels({ control: 'HIGH' }) },
    { id: 'p-loose', required: requirementLevels({ control: 'LOW' }) },
  ],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [],
}

/**
 * 02.3 D-03 cycle-safety regression (Test M): a `childCapabilities` cycle
 * where the nested child's own `childCapabilities` entry shares the root's
 * `rootId` — the pre-existing per-branch visited-set contract in
 * `analyzeCapabilitySubtree` must stop the re-entrant branch silently
 * instead of recursing forever, while the non-cyclic child-vs-root
 * descendant contradiction (security: root HIGH, child LOW) still surfaces.
 */
export const capabilityCycleFixture: BusinessCapabilityChain = {
  rootId: 'cap-cycle-root',
  rootType: 'businessCapability',
  required: requirementLevels({ security: 'HIGH' }),
  parentRequiredLevels: [],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [
    {
      rootId: 'cap-cycle-child',
      rootType: 'businessCapability',
      required: requirementLevels({ security: 'LOW' }),
      parentRequiredLevels: [],
      supportingAIComponents: [],
      supportingApplications: [],
      childCapabilities: [
        {
          // Cyclic edge: shares the root's id, re-entering an already
          // visited branch — must terminate silently, not recurse forever.
          rootId: 'cap-cycle-root',
          rootType: 'businessCapability',
          required: requirementLevels({ security: 'HIGH' }),
          parentRequiredLevels: [],
          supportingAIComponents: [],
          supportingApplications: [],
          childCapabilities: [],
        },
      ],
    },
  ],
}
