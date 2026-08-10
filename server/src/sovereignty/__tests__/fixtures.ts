import type {
  AchievedLevels,
  AIComponentNode,
  ApplicationNode,
  BusinessCapabilityChain,
  BusinessProcessChain,
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
 * D-02: a BusinessProcess root whose one supporting Application achieves the
 * required resilience itself, but that Application's `hostedOn`
 * Infrastructure achieves only LOW against the process's required HIGH —
 * mirrors `redChainFixture`'s app-compliant/infra-violating RED shape.
 */
export const businessProcessRedFixture: BusinessProcessChain = {
  rootId: 'process-onboarding',
  rootType: 'businessProcess',
  parentRequiredLevels: [],
  required: requirementLevels({
    strategicAutonomy: 'MEDIUM',
    resilience: 'HIGH',
    security: 'MEDIUM',
    control: 'MEDIUM',
  }),
  supportingAIComponents: [],
  supportingApplications: [
    applicationNode({
      id: 'app-onboarding-service',
      name: 'OnboardingService',
      achieved: achievedLevels({
        strategicAutonomy: 'MEDIUM',
        resilience: 'HIGH',
        security: 'MEDIUM',
        control: 'MEDIUM',
      }),
      hostedOn: [
        infrastructureNode({
          id: 'infra-onboarding-vm',
          name: 'OnboardingVM',
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
 * D-02: a BusinessProcess root with one supporting Application that has no
 * achieved values set at all (SOV-03) — expects every dimension with a
 * required value to classify GREY, mirrors `greyChainFixture`.
 */
export const businessProcessGreyFixture: BusinessProcessChain = {
  rootId: 'process-grey',
  rootType: 'businessProcess',
  parentRequiredLevels: [],
  required: requirementLevels({ control: 'MEDIUM' }),
  supportingAIComponents: [],
  supportingApplications: [
    applicationNode({
      id: 'app-process-unassessed',
      name: 'UnassessedProcessApp',
      achieved: achievedLevels(),
      hostedOn: [],
    }),
  ],
}

/**
 * D-02: achieved values satisfy (or exceed) the requirement on every
 * dimension for both the Application and its Infrastructure — expects zero
 * findings and a GREEN downstreamStatus, mirrors `greenChainFixture`.
 */
export const businessProcessGreenFixture: BusinessProcessChain = {
  rootId: 'process-green',
  rootType: 'businessProcess',
  parentRequiredLevels: [],
  required: requirementLevels({
    strategicAutonomy: 'HIGH',
    resilience: 'HIGH',
    security: 'HIGH',
    control: 'HIGH',
  }),
  supportingAIComponents: [],
  supportingApplications: [
    applicationNode({
      id: 'app-process-compliant',
      name: 'CompliantProcessApp',
      achieved: achievedLevels({
        strategicAutonomy: 'HIGH',
        resilience: 'VERY_HIGH',
        security: 'HIGH',
        control: 'HIGH',
      }),
      hostedOn: [
        infrastructureNode({
          id: 'infra-process-compliant',
          name: 'CompliantProcessInfra',
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
 * D-04: a BusinessProcess root whose own required security (MEDIUM) is
 * weaker than its direct `parentProcess`'s required security (HIGH) — the
 * root-only tracer case, mirrors `rootParentContradictionFixture`. Expects
 * exactly one YELLOW finding naming the process as the violating element,
 * `chainPath: ['proc-parent-strict', 'process-root-weaker']`.
 */
export const businessProcessParentContradictionFixture: BusinessProcessChain = {
  rootId: 'process-root-weaker',
  rootType: 'businessProcess',
  required: requirementLevels({ security: 'MEDIUM' }),
  parentRequiredLevels: [
    { id: 'proc-parent-strict', required: requirementLevels({ security: 'HIGH' }) },
  ],
  supportingAIComponents: [],
  supportingApplications: [],
}

/**
 * D-04: a BusinessProcess root whose own required security (LOW) is equal
 * to or stricter than its direct `parentProcess`'s required security
 * (MEDIUM) — no contradiction, so no finding and `selfStatus` resolves
 * GREEN (a real comparison happened and passed), mirrors
 * `rootParentNoContradictionFixture`.
 */
export const businessProcessParentNoContradictionFixture: BusinessProcessChain = {
  rootId: 'process-root-stricter',
  rootType: 'businessProcess',
  required: requirementLevels({ security: 'LOW' }),
  parentRequiredLevels: [
    { id: 'proc-parent-looser', required: requirementLevels({ security: 'LOW' }) },
  ],
  supportingAIComponents: [],
  supportingApplications: [],
}

/**
 * D-04 / 03-CONTEXT.md D-01: a BusinessProcess root with a `parentProcess`,
 * but the parent's own `required` is entirely null — every dimension is
 * excluded from comparison regardless of the root's own values, so
 * genuinely nothing was compared. `selfStatus` resolves GREY, distinct from
 * both the "no parent at all" bucket and the "compared and passed" GREEN
 * bucket — mirrors `rootParentAllExcludedFixture`.
 */
export const businessProcessParentAllExcludedFixture: BusinessProcessChain = {
  rootId: 'process-root-all-excluded',
  rootType: 'businessProcess',
  required: requirementLevels({ security: 'HIGH', resilience: 'MEDIUM' }),
  parentRequiredLevels: [{ id: 'proc-parent-vacuous', required: requirementLevels() }],
  supportingAIComponents: [],
  supportingApplications: [],
}

/**
 * D-04 / 02.3 D-02: a BusinessProcess root with TWO `parentProcess` edges,
 * only one stricter than the root's own required control level — expects
 * exactly ONE finding, from the stricter parent only; the root is flagged
 * "below ANY parent", not required to be below ALL — mirrors
 * `multiParentOnlyOneStricterFixture`.
 */
export const businessProcessMultiParentFixture: BusinessProcessChain = {
  rootId: 'process-root-multi',
  rootType: 'businessProcess',
  required: requirementLevels({ control: 'MEDIUM' }),
  parentRequiredLevels: [
    { id: 'proc-p-strict', required: requirementLevels({ control: 'HIGH' }) },
    { id: 'proc-p-loose', required: requirementLevels({ control: 'LOW' }) },
  ],
  supportingAIComponents: [],
  supportingApplications: [],
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
 * 03-CONTEXT.md D-01: a root with a parent, but the parent's own `required`
 * is entirely null — every one of the 4 dimensions is excluded from
 * comparison regardless of the root's own values, so genuinely nothing was
 * compared. Distinct from BOTH the "no parent at all" GREY bucket
 * (`redChainFixture`/`greyChainFixture`/`greenChainFixture`) and the
 * "compared and passed" GREEN bucket (`rootParentNoContradictionFixture`) —
 * this fixture proves the "parent present but nothing genuinely comparable"
 * case stays GREY too, not GREEN by vacuous non-contradiction.
 */
export const rootParentAllExcludedFixture: BusinessCapabilityChain = {
  rootId: 'cap-root-all-excluded',
  rootType: 'businessCapability',
  required: requirementLevels({ security: 'HIGH', resilience: 'MEDIUM' }),
  parentRequiredLevels: [{ id: 'cap-parent-vacuous', required: requirementLevels() }],
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

/**
 * 02.3 D-03/WR-01 regression: unlike `capabilityCycleFixture` (whose
 * re-entrant node's required level happens not to trigger a contradiction
 * against its cyclic "parent", so it cannot prove the guard actually does
 * anything), this fixture's re-entrant node IS weaker than its immediate
 * cyclic parent (`cap-cycle-child-2`'s `security: LOW` vs. the re-entrant
 * node's `security: NONE`). Without the `pathVisited` guard on the
 * descendant-vs-parent classifier call, this would produce a SECOND, bogus
 * finding attributing a contradiction to the already-visited root via the
 * re-entrant edge (Test M2 asserts this does not happen).
 */
export const capabilityCycleTriggeringFixture: BusinessCapabilityChain = {
  rootId: 'cap-cycle-root-2',
  rootType: 'businessCapability',
  required: requirementLevels({ security: 'HIGH' }),
  parentRequiredLevels: [],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [
    {
      rootId: 'cap-cycle-child-2',
      rootType: 'businessCapability',
      required: requirementLevels({ security: 'LOW' }),
      parentRequiredLevels: [],
      supportingAIComponents: [],
      supportingApplications: [],
      childCapabilities: [
        {
          // Cyclic edge back to the root, with a required level deliberately
          // weaker than its immediate cyclic "parent" (cap-cycle-child-2's
          // LOW) — would trigger a spurious contradiction if the re-entrant
          // edge were not skipped entirely (WR-01).
          rootId: 'cap-cycle-root-2',
          rootType: 'businessCapability',
          required: requirementLevels({ security: 'NONE' }),
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
 * 02.3 D-05/CR-01 regression: a capability ("cap-shared") reachable from TWO
 * different parents within the same analyzed subtree (a diamond topology —
 * explicitly supported by design, no memoization by design per D-02's
 * independent-per-parent evaluation). "cap-shared" genuinely violates
 * against ONE parent (`cap-p1`, stricter) but not the other (`cap-p2`,
 * equal), and its `cap-p2`-side copy also has its own supporting Application
 * with a real RED achieved-level violation below it — so "cap-shared"
 * appears as a mid-chain PASSTHROUGH id in a *second*, later finding block
 * that is not itself a businessCapability-type self-violation. Before the
 * CR-01 fix, that later passthrough block would unconditionally reset
 * "cap-shared"'s already-correct YELLOW selfStatus back to GREY.
 */
export const diamondSharedCapabilityFixture: BusinessCapabilityChain = {
  rootId: 'cap-diamond-root',
  rootType: 'businessCapability',
  required: requirementLevels({ security: 'LOW' }),
  parentRequiredLevels: [],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [
    {
      // Stricter parent: "cap-shared"'s own LOW requirement is weaker than
      // this parent's HIGH requirement — genuine self-violation.
      rootId: 'cap-p1',
      rootType: 'businessCapability',
      required: requirementLevels({ security: 'HIGH' }),
      parentRequiredLevels: [],
      supportingAIComponents: [],
      supportingApplications: [],
      childCapabilities: [
        {
          rootId: 'cap-shared',
          rootType: 'businessCapability',
          required: requirementLevels({ security: 'LOW' }),
          parentRequiredLevels: [],
          supportingAIComponents: [],
          supportingApplications: [],
          childCapabilities: [],
        },
      ],
    },
    {
      // Equal (non-stricter) parent: "cap-shared"'s LOW requirement matches
      // this parent's own LOW requirement exactly — NOT weaker, so no
      // self-violation from this edge. This copy also carries a real
      // Application-level RED violation below it, so "cap-shared" still
      // appears (as a mid-chain passthrough, not a violatingElementId) in a
      // finding processed AFTER the cap-p1 block above.
      rootId: 'cap-p2',
      rootType: 'businessCapability',
      required: requirementLevels({ security: 'LOW' }),
      parentRequiredLevels: [],
      supportingAIComponents: [],
      supportingApplications: [],
      childCapabilities: [
        {
          rootId: 'cap-shared',
          rootType: 'businessCapability',
          required: requirementLevels({ security: 'LOW' }),
          parentRequiredLevels: [],
          supportingAIComponents: [
            aiComponentNode({
              id: 'ai-under-shared',
              name: 'AI under shared',
              achieved: achievedLevels({ security: 'NONE' }),
            }),
          ],
          supportingApplications: [],
          childCapabilities: [],
        },
      ],
    },
  ],
}

/**
 * 03-CONTEXT.md D-01 descendant half: a root with a real, non-null required
 * dimension (`security: MEDIUM`) and one child whose own required level
 * (`security: HIGH`) is stricter than — and thus consistent with — its
 * immediate in-scope parent. Proves a descendant, not just the analysis
 * root, gets the GREEN treatment via the same `analyzeCapabilitySubtree`
 * per-child loop Task 1 rewired (no separate traversal needed).
 */
export const nestedCapabilityGreenFixture: BusinessCapabilityChain = {
  rootId: 'cap-root-nested-green',
  rootType: 'businessCapability',
  required: requirementLevels({ security: 'MEDIUM' }),
  parentRequiredLevels: [],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [
    {
      rootId: 'cap-child-nested-green',
      rootType: 'businessCapability',
      required: requirementLevels({ security: 'HIGH' }),
      parentRequiredLevels: [],
      supportingAIComponents: [],
      supportingApplications: [],
      childCapabilities: [],
    },
  ],
}

/**
 * 03-CONTEXT.md D-02: a root with TWO parents, one (`p-empty`) contributing
 * zero comparable dimensions (its `required` is entirely null) and the
 * other (`p-consistent`) contributing one real, consistent (non-
 * contradicting) dimension. Proves GREEN is not blocked by one parent
 * contributing nothing to compare, as long as some other parent's edge was
 * genuinely checked and passed.
 */
export const multiParentOneEmptyOneConsistentFixture: BusinessCapabilityChain = {
  rootId: 'cap-root-multi-green',
  rootType: 'businessCapability',
  required: requirementLevels({ control: 'MEDIUM' }),
  parentRequiredLevels: [
    { id: 'p-empty', required: requirementLevels() },
    { id: 'p-consistent', required: requirementLevels({ control: 'LOW' }) },
  ],
  supportingAIComponents: [],
  supportingApplications: [],
  childCapabilities: [],
}
