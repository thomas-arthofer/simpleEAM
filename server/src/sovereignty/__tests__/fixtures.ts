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
  required: requirementLevels({
    strategicAutonomy: 'MEDIUM',
    resilience: 'HIGH',
    security: 'MEDIUM',
    control: 'MEDIUM',
  }),
  supportingAIComponents: [],
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
  required: requirementLevels({ control: 'MEDIUM' }),
  supportingAIComponents: [],
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
  required: requirementLevels({
    strategicAutonomy: 'HIGH',
    resilience: 'HIGH',
    security: 'HIGH',
    control: 'HIGH',
  }),
  supportingAIComponents: [],
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
  required: requirementLevels({ resilience: 'HIGH' }),
  supportingAIComponents: [],
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
  required: requirementLevels({ control: 'MEDIUM' }),
  supportingAIComponents: [],
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
    required: requirementLevels({ security: 'MEDIUM' }),
    supportingAIComponents: [],
    supportingApplications: [appA],
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
  required: requirementLevels({ strategicAutonomy: 'HIGH', resilience: 'HIGH' }),
  supportingAIComponents: [],
  supportingApplications: [
    applicationNode({
      id: 'app-partial',
      name: 'PartialApp',
      achieved: achievedLevels({ strategicAutonomy: 'LOW', resilience: 'HIGH' }),
    }),
  ],
}
