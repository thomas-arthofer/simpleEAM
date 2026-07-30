import type {
  AchievedLevels,
  ApplicationNode,
  BusinessCapabilityChain,
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
