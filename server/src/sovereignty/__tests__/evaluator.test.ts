import { analyzeBusinessCapability, analyzeBusinessProcess, analyzeDataObject } from '../evaluator'
import {
  businessProcessGreenFixture,
  businessProcessGreyFixture,
  businessProcessMultiParentFixture,
  businessProcessNoParentUnfilledFixture,
  businessProcessParentAllExcludedFixture,
  businessProcessParentContradictionFixture,
  businessProcessParentNoContradictionFixture,
  businessProcessRedFixture,
  capabilityCycleFixture,
  capabilityCycleTriggeringFixture,
  compositeApplicationFixture,
  dataObjectChainFixture,
  descendantParentContradictionFixture,
  greenChainFixture,
  greyChainFixture,
  multiParentBothStricterFixture,
  multiParentInfrastructureFixture,
  multiParentOnlyOneStricterFixture,
  multiParentOneEmptyOneConsistentFixture,
  nestedCapabilityGreenFixture,
  nestedCapabilitySubtreeFixture,
  partialAchievedFixture,
  redChainFixture,
  rootNoParentUnfilledFixture,
  rootParentAllExcludedFixture,
  rootParentContradictionFixture,
  rootParentNoContradictionFixture,
} from './fixtures'

describe('analyzeBusinessCapability', () => {
  it('produces exactly one RED finding for the eam-konzept.md worked example', () => {
    const result = analyzeBusinessCapability(redChainFixture)

    // Revised rule: a true hierarchy root (no parent) with its own required
    // levels filled in resolves GREEN, not the eternal GREY konzept.md's
    // original "innen neutral" text describes — grey must mean "not filled
    // in", not "this root can never be green".
    expect(result.selfStatus).toBe('GREEN')
    expect(result.downstreamStatus).toBe('RED')

    const redFindings = result.findings.filter(f => f.status === 'RED')
    expect(redFindings).toHaveLength(1)
    expect(redFindings[0]).toMatchObject({
      violatingElementId: 'infra-vm-web-03',
      violatingElementType: 'infrastructure',
      violatingElementName: 'VM-web-03',
      dimension: 'resilience',
      status: 'RED',
      requiredLevel: 'HIGH',
      actualLevel: 'LOW',
      chainPath: ['cap-abrechnung', 'app-billing', 'infra-vm-web-03'],
    })

    expect(result.findings.some(f => f.status === 'GREY')).toBe(false)
  })

  it('classifies an entity with no achieved values as GREY, never GREEN by omission', () => {
    const result = analyzeBusinessCapability(greyChainFixture)

    expect(result.downstreamStatus).toBe('GREY')
    expect(result.findings.length).toBeGreaterThan(0)
    expect(result.findings.every(f => f.status === 'GREY')).toBe(true)
    expect(
      result.findings.every(
        f => f.violatingElementId === 'app-unassessed' && f.actualLevel === null
      )
    ).toBe(true)
  })

  it('produces an empty findings array and GREEN downstreamStatus when fully satisfied', () => {
    const result = analyzeBusinessCapability(greenChainFixture)

    expect(result.findings).toHaveLength(0)
    expect(result.downstreamStatus).toBe('GREEN')
    // Revised rule: no parent, but the root's own required levels are filled
    // in, so selfStatus resolves GREEN too.
    expect(result.selfStatus).toBe('GREEN')
  })

  it('produces one independent finding per parentInfrastructure edge, never a single "worst of" finding (D-01)', () => {
    const result = analyzeBusinessCapability(multiParentInfrastructureFixture)

    const redFindings = result.findings.filter(f => f.status === 'RED')
    expect(redFindings).toHaveLength(1)
    expect(redFindings[0]).toMatchObject({
      violatingElementId: 'infra-parent-violating',
      violatingElementType: 'infrastructure',
      dimension: 'resilience',
      status: 'RED',
    })

    // The compliant parent edge must be independently evaluated too (no
    // finding expected since it's fully compliant) — never merged/suppressed
    // by the sibling violating edge.
    expect(result.findings.some(f => f.violatingElementId === 'infra-parent-compliant')).toBe(false)
    expect(result.downstreamStatus).toBe('RED')
  })

  it('never hides a composite Application container behind fully-compliant components (D-02)', () => {
    const result = analyzeBusinessCapability(compositeApplicationFixture)

    const containerFindings = result.findings.filter(f => f.violatingElementId === 'app-container')
    expect(containerFindings.length).toBeGreaterThan(0)
    expect(containerFindings.every(f => f.status === 'GREY')).toBe(true)

    // Components are fully compliant — no findings expected for them.
    expect(result.findings.some(f => f.violatingElementId === 'app-component-a')).toBe(false)
    expect(result.findings.some(f => f.violatingElementId === 'app-component-b')).toBe(false)
  })

  it('produces independent per-dimension findings for a partially-assessed entity', () => {
    const result = analyzeBusinessCapability(partialAchievedFixture)

    const redFindings = result.findings.filter(f => f.status === 'RED')
    const greyFindings = result.findings.filter(f => f.status === 'GREY')

    expect(redFindings).toHaveLength(1)
    expect(redFindings[0]).toMatchObject({
      violatingElementId: 'app-partial',
      dimension: 'strategicAutonomy',
      requiredLevel: 'HIGH',
      actualLevel: 'LOW',
    })

    expect(greyFindings.length).toBeGreaterThan(0)
    expect(greyFindings.every(f => f.violatingElementId === 'app-partial')).toBe(true)
    expect(greyFindings.some(f => f.dimension === 'security')).toBe(true)
    expect(greyFindings.some(f => f.dimension === 'control')).toBe(true)

    // resilience is satisfied (required HIGH, achieved HIGH) — no finding.
    expect(result.findings.some(f => f.dimension === 'resilience')).toBe(false)
  })

  it('rolls up a violation nested 2 levels down inside a child BusinessCapability to the ancestor (D-11, nested-bc-sov-inheritance)', () => {
    const result = analyzeBusinessCapability(nestedCapabilitySubtreeFixture)

    expect(result.selfStatus).toBe('GREY')
    expect(result.downstreamStatus).toBe('RED')

    const redFindings = result.findings.filter(f => f.status === 'RED')
    expect(redFindings).toHaveLength(1)
    expect(redFindings[0]).toMatchObject({
      violatingElementId: 'app-schlechte-app',
      dimension: 'strategicAutonomy',
      status: 'RED',
      requiredLevel: 'VERY_HIGH',
      actualLevel: 'LOW',
      chainPath: ['cap-gemeinsamer-max', 'cap-test', 'app-schlechte-app'],
    })

    // The compliant child subtree must not contribute any findings.
    expect(result.findings.some(f => f.violatingElementId === 'app-gute-app')).toBe(false)
  })
})

describe('analyzeBusinessCapability — parent-vs-child required-level contradiction (02.3 D-01/D-06)', () => {
  it('produces exactly one YELLOW finding when the root is weaker than its direct parent (Test A)', () => {
    const result = analyzeBusinessCapability(rootParentContradictionFixture)

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      status: 'YELLOW',
      violatingElementType: 'businessCapability',
      violatingElementId: rootParentContradictionFixture.rootId,
      dimension: 'security',
      requiredLevel: 'HIGH',
      actualLevel: 'MEDIUM',
    })
    expect(result.findings[0].chainPath).toEqual(['cap-parent-strict', 'cap-root-weaker'])
    // 03-CONTEXT.md D-01: a contradiction is still a real comparison, just a
    // failing one — YELLOW must win over GREEN, not GREY.
    expect(result.selfStatus).toBe('YELLOW')
  })

  it('excludes the dimension entirely when the parent required level is null (Test B)', () => {
    const fixture = {
      ...rootParentContradictionFixture,
      parentRequiredLevels: [
        {
          id: 'cap-parent-strict',
          required: {
            ...rootParentContradictionFixture.parentRequiredLevels[0].required,
            security: null,
          },
        },
      ],
    }

    const result = analyzeBusinessCapability(fixture)

    expect(result.findings.filter(f => f.dimension === 'security')).toHaveLength(0)
  })

  it('excludes the dimension entirely when the child required level is null (Test B)', () => {
    const fixture = {
      ...rootParentContradictionFixture,
      required: { ...rootParentContradictionFixture.required, security: null },
    }

    const result = analyzeBusinessCapability(fixture)

    expect(result.findings.filter(f => f.dimension === 'security')).toHaveLength(0)
  })

  it('produces no finding when the child is stricter than the parent (Test C)', () => {
    const result = analyzeBusinessCapability(rootParentNoContradictionFixture)

    expect(result.findings).toHaveLength(0)
    // Blocker fix: `analyzeBusinessCapability`'s own selfStatus must resolve
    // GREEN here, not the old hardcoded GREY — this is the value the
    // `/sovereignty` detail page's StatusChip renders.
    expect(result.selfStatus).toBe('GREEN')
  })

  it('produces one independent finding per dimension when the parent is stricter on multiple dimensions (Test D)', () => {
    const fixture = {
      ...rootParentContradictionFixture,
      required: { ...rootParentContradictionFixture.required, resilience: 'LOW' as const },
      parentRequiredLevels: [
        {
          id: 'cap-parent-strict',
          required: {
            ...rootParentContradictionFixture.parentRequiredLevels[0].required,
            resilience: 'HIGH' as const,
          },
        },
      ],
    }

    const result = analyzeBusinessCapability(fixture)

    expect(result.findings).toHaveLength(2)
    const securityFinding = result.findings.find(f => f.dimension === 'security')
    const resilienceFinding = result.findings.find(f => f.dimension === 'resilience')
    expect(securityFinding).toMatchObject({ requiredLevel: 'HIGH', actualLevel: 'MEDIUM' })
    expect(resilienceFinding).toMatchObject({ requiredLevel: 'HIGH', actualLevel: 'LOW' })
  })

  it('flags a nested child whose own required level is weaker than its immediate parent (Test G, D-01 descendant half)', () => {
    const result = analyzeBusinessCapability(descendantParentContradictionFixture)

    const finding = result.findings.find(f => f.violatingElementId === 'cap-child-3lvl')
    expect(finding).toMatchObject({
      status: 'YELLOW',
      violatingElementType: 'businessCapability',
      dimension: 'security',
      requiredLevel: 'HIGH',
      actualLevel: 'MEDIUM',
    })
    expect(finding?.chainPath[0]).toBe('cap-root-3lvl')
    expect(finding?.chainPath[finding.chainPath.length - 1]).toBe('cap-child-3lvl')
  })

  it('excludes the dimension when the descendant child required level is null (Test H)', () => {
    const fixture = {
      ...descendantParentContradictionFixture,
      childCapabilities: [
        {
          ...descendantParentContradictionFixture.childCapabilities[0],
          required: {
            ...descendantParentContradictionFixture.childCapabilities[0].required,
            security: null,
          },
          childCapabilities: [],
        },
      ],
    }

    const result = analyzeBusinessCapability(fixture)

    expect(result.findings.filter(f => f.dimension === 'security')).toHaveLength(0)
  })

  it('excludes the dimension when the descendant parent (in-scope) required level is null (Test I)', () => {
    const fixture = {
      ...descendantParentContradictionFixture,
      required: { ...descendantParentContradictionFixture.required, security: null },
      childCapabilities: [
        { ...descendantParentContradictionFixture.childCapabilities[0], childCapabilities: [] },
      ],
    }

    const result = analyzeBusinessCapability(fixture)

    expect(result.findings.filter(f => f.dimension === 'security')).toHaveLength(0)
  })

  it('compares a grandchild against its immediate parent (child), not the root (Test J)', () => {
    const result = analyzeBusinessCapability(descendantParentContradictionFixture)

    const finding = result.findings.find(f => f.violatingElementId === 'cap-grandchild-3lvl')
    expect(finding).toMatchObject({
      status: 'YELLOW',
      dimension: 'security',
      requiredLevel: 'MEDIUM',
      actualLevel: 'LOW',
    })
    expect(finding?.chainPath).toEqual(['cap-root-3lvl', 'cap-child-3lvl', 'cap-grandchild-3lvl'])
  })

  it('emits two independent findings when two parents are both stricter (Test K, D-02)', () => {
    const result = analyzeBusinessCapability(multiParentBothStricterFixture)

    const controlFindings = result.findings.filter(f => f.dimension === 'control')
    expect(controlFindings).toHaveLength(2)
    expect(controlFindings.map(f => f.chainPath[0]).sort()).toEqual(['p1', 'p2'])
  })

  it('emits exactly one finding when only one of two parents is stricter (Test L, D-02)', () => {
    const result = analyzeBusinessCapability(multiParentOnlyOneStricterFixture)

    const controlFindings = result.findings.filter(f => f.dimension === 'control')
    expect(controlFindings).toHaveLength(1)
    expect(controlFindings[0].chainPath[0]).toBe('p-strict')
  })

  it('terminates on a childCapabilities cycle and still emits the non-cyclic descendant finding (Test M, D-03)', () => {
    const result = analyzeBusinessCapability(capabilityCycleFixture)

    const finding = result.findings.find(f => f.violatingElementId === 'cap-cycle-child')
    expect(finding).toMatchObject({
      status: 'YELLOW',
      dimension: 'security',
      requiredLevel: 'HIGH',
      actualLevel: 'LOW',
    })

    // WR-02: assert the total count too — this fixture's re-entrant node
    // happens not to trigger a contradiction against its cyclic "parent", so
    // without this the test would pass identically whether or not the
    // re-entrant edge was silently skipped (see Test M2 for a fixture that
    // actually exercises the guard).
    expect(result.findings).toHaveLength(1)
  })

  it('does not emit a spurious contradiction finding via a cyclic re-entrant edge (Test M2, WR-01)', () => {
    const result = analyzeBusinessCapability(capabilityCycleTriggeringFixture)

    // Only the non-cyclic child-vs-root contradiction should fire.
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]).toMatchObject({
      status: 'YELLOW',
      violatingElementType: 'businessCapability',
      violatingElementId: 'cap-cycle-child-2',
      dimension: 'security',
      requiredLevel: 'HIGH',
      actualLevel: 'LOW',
    })

    // No finding may attribute a contradiction to the re-entrant edge (the
    // cyclic node's NONE-vs-LOW comparison against its cyclic "parent" must
    // never surface, per D-03's "stops silently" contract).
    expect(
      result.findings.some(
        f => f.violatingElementId === 'cap-cycle-root-2' && f.actualLevel === 'NONE'
      )
    ).toBe(false)
  })
})

describe('analyzeBusinessCapability — comparedCapabilityIds / three-valued selfStatus (03-CONTEXT.md D-01/D-02)', () => {
  it('includes the root id in comparedCapabilityIds when a real comparison passed', () => {
    const result = analyzeBusinessCapability(rootParentNoContradictionFixture)

    expect(result.comparedCapabilityIds).toContain(rootParentNoContradictionFixture.rootId)
  })

  it('includes the root id in comparedCapabilityIds even when the comparison contradicted — a contradiction is still a real comparison', () => {
    const result = analyzeBusinessCapability(rootParentContradictionFixture)

    expect(result.comparedCapabilityIds).toContain(rootParentContradictionFixture.rootId)
  })

  it('excludes the root id from comparedCapabilityIds when every dimension was excluded on every parent (genuinely nothing compared)', () => {
    const result = analyzeBusinessCapability(rootParentAllExcludedFixture)

    expect(result.comparedCapabilityIds).not.toContain(rootParentAllExcludedFixture.rootId)
    expect(result.selfStatus).toBe('GREY')
    expect(result.findings).toHaveLength(0)
  })

  it('resolves GREEN for a descendant whose own required level was genuinely compared against its immediate parent and found consistent', () => {
    const result = analyzeBusinessCapability(nestedCapabilityGreenFixture)

    expect(result.comparedCapabilityIds).toContain('cap-child-nested-green')
    expect(result.findings).toHaveLength(0)
  })

  it('D-02: includes the root id in comparedCapabilityIds when one parent contributes zero comparable dimensions but another contributes a real, consistent one', () => {
    const result = analyzeBusinessCapability(multiParentOneEmptyOneConsistentFixture)

    expect(result.comparedCapabilityIds).toContain(multiParentOneEmptyOneConsistentFixture.rootId)
    expect(result.findings).toHaveLength(0)
  })

  // Revised rule: a true hierarchy root (no parent at all) is internally
  // consistent by definition — nothing to contradict — so its own filled-in
  // required levels are the GREEN-eligibility signal, not a parent
  // comparison it can never have.
  it('resolves GREEN and includes the root id in comparedCapabilityIds when there is no parent at all but the root has its own required levels filled in', () => {
    const result = analyzeBusinessCapability(greenChainFixture)

    expect(result.comparedCapabilityIds).toContain(greenChainFixture.rootId)
    expect(result.selfStatus).toBe('GREEN')
  })

  it('resolves GREY and excludes the root id from comparedCapabilityIds when there is no parent at all and nothing is filled in', () => {
    const result = analyzeBusinessCapability(rootNoParentUnfilledFixture)

    expect(result.comparedCapabilityIds).not.toContain(rootNoParentUnfilledFixture.rootId)
    expect(result.selfStatus).toBe('GREY')
    expect(result.findings).toHaveLength(0)
  })
})

describe('analyzeDataObject', () => {
  it('walks usedByApplications and classifies against the DataObject requirement (D-08)', () => {
    const result = analyzeDataObject(dataObjectChainFixture)

    expect(result.selfStatus).toBe('GREY')
    expect(result.downstreamStatus).toBe('RED')

    const redFindings = result.findings.filter(f => f.status === 'RED')
    expect(redFindings).toHaveLength(1)
    expect(redFindings[0]).toMatchObject({
      violatingElementId: 'app-consumer',
      violatingElementType: 'application',
      dimension: 'security',
      status: 'RED',
      requiredLevel: 'HIGH',
      actualLevel: 'MEDIUM',
      chainPath: ['dataobject-customer-records', 'app-consumer'],
    })
  })

  it('shares its classification logic with analyzeBusinessCapability (same GREY/never-GREEN-by-default rule)', () => {
    const result = analyzeDataObject(dataObjectChainFixture)

    // No dimension is missing an achieved value in this fixture, so no GREY
    // findings are expected — only the one RED violation.
    expect(result.findings.every(f => f.status === 'RED')).toBe(true)
  })
})

describe('analyzeBusinessProcess', () => {
  it('produces exactly one RED finding when a supporting Application achieves the requirement but its hostedOn Infrastructure does not', () => {
    const result = analyzeBusinessProcess(businessProcessRedFixture)

    const redFindings = result.findings.filter(f => f.status === 'RED')
    expect(redFindings).toHaveLength(1)
    expect(redFindings[0]).toMatchObject({
      violatingElementId: 'infra-onboarding-vm',
      violatingElementType: 'infrastructure',
      dimension: 'resilience',
      status: 'RED',
      requiredLevel: 'HIGH',
      actualLevel: 'LOW',
    })
    expect(result.downstreamStatus).toBe('RED')
  })

  it('classifies a supporting Application with no achieved values as GREY, never GREEN by omission', () => {
    const result = analyzeBusinessProcess(businessProcessGreyFixture)

    expect(result.downstreamStatus).toBe('GREY')
    expect(result.findings.length).toBeGreaterThan(0)
    expect(result.findings.every(f => f.status === 'GREY')).toBe(true)
  })

  it('produces an empty findings array and GREEN downstreamStatus when fully satisfied', () => {
    const result = analyzeBusinessProcess(businessProcessGreenFixture)

    expect(result.findings).toHaveLength(0)
    expect(result.downstreamStatus).toBe('GREEN')
  })

  // Revised rule: a true hierarchy root (no parentProcess at all) is
  // internally consistent by definition, so its own filled-in required
  // levels resolve GREEN instead of the previous eternal GREY.
  it('resolves selfStatus to GREEN on achieved-chain-only fixtures with no parentProcess but required levels filled in (parentRequiredLevels: [])', () => {
    expect(analyzeBusinessProcess(businessProcessRedFixture).selfStatus).toBe('GREEN')
    expect(analyzeBusinessProcess(businessProcessGreyFixture).selfStatus).toBe('GREEN')
    expect(analyzeBusinessProcess(businessProcessGreenFixture).selfStatus).toBe('GREEN')
  })

  it('resolves selfStatus to GREY when there is no parentProcess at all and nothing is filled in', () => {
    const result = analyzeBusinessProcess(businessProcessNoParentUnfilledFixture)

    expect(result.selfStatus).toBe('GREY')
    expect(result.comparedCapabilityIds).not.toContain(businessProcessNoParentUnfilledFixture.rootId)
  })

  it('sets rootType to businessProcess and capabilityIds/comparedCapabilityIds to the type-agnostic SupportChain shape', () => {
    const result = analyzeBusinessProcess(businessProcessGreenFixture)

    expect(result.rootType).toBe('businessProcess')
    expect(result.capabilityIds).toEqual([businessProcessGreenFixture.rootId])
    // No parentProcess, but required levels are filled in — the root is
    // included (revised rule).
    expect(result.comparedCapabilityIds).toEqual([businessProcessGreenFixture.rootId])
  })
})

describe('analyzeBusinessProcess — parentProcess required-vs-required consistency (D-04)', () => {
  it('produces exactly one YELLOW finding when the root is weaker than its direct parentProcess (Test 6)', () => {
    const result = analyzeBusinessProcess(businessProcessParentContradictionFixture)

    const yellowFindings = result.findings.filter(f => f.status === 'YELLOW')
    expect(yellowFindings).toHaveLength(1)
    expect(yellowFindings[0]).toMatchObject({
      status: 'YELLOW',
      violatingElementType: 'businessProcess',
      violatingElementId: businessProcessParentContradictionFixture.rootId,
      dimension: 'security',
      requiredLevel: 'HIGH',
      actualLevel: 'MEDIUM',
      chainPath: ['proc-parent-strict', businessProcessParentContradictionFixture.rootId],
    })
    expect(result.selfStatus).toBe('YELLOW')
  })

  it('resolves GREEN when the root is genuinely compared against a parentProcess and found consistent (Test 7)', () => {
    const result = analyzeBusinessProcess(businessProcessParentNoContradictionFixture)

    expect(result.findings).toHaveLength(0)
    expect(result.selfStatus).toBe('GREEN')
    expect(result.comparedCapabilityIds).toContain(
      businessProcessParentNoContradictionFixture.rootId
    )
  })

  it('resolves GREEN when there is no parentProcess at all but the root has its own required levels filled in (Test 8, revised)', () => {
    const result = analyzeBusinessProcess(businessProcessGreenFixture)

    expect(result.selfStatus).toBe('GREEN')
    expect(result.comparedCapabilityIds).toContain(businessProcessGreenFixture.rootId)
  })

  it('resolves GREY when there is no parentProcess at all and nothing is filled in (Test 8b)', () => {
    const result = analyzeBusinessProcess(businessProcessNoParentUnfilledFixture)

    expect(result.selfStatus).toBe('GREY')
    expect(result.comparedCapabilityIds).not.toContain(businessProcessNoParentUnfilledFixture.rootId)
  })

  it('resolves GREY when a parentProcess is present but every dimension is excluded from comparison (Test 9)', () => {
    const result = analyzeBusinessProcess(businessProcessParentAllExcludedFixture)

    expect(result.selfStatus).toBe('GREY')
    expect(result.findings).toHaveLength(0)
    expect(result.comparedCapabilityIds).not.toContain(
      businessProcessParentAllExcludedFixture.rootId
    )
  })

  it('emits exactly one finding when only one of two parentProcess edges is stricter (Test 10, D-02 independence)', () => {
    const result = analyzeBusinessProcess(businessProcessMultiParentFixture)

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].chainPath[0]).toBe('proc-p-strict')
  })

  it('excludes a dimension entirely when either side is null (Test 11)', () => {
    const fixture = {
      ...businessProcessParentContradictionFixture,
      parentRequiredLevels: [
        {
          id: 'proc-parent-strict',
          required: {
            ...businessProcessParentContradictionFixture.parentRequiredLevels[0].required,
            security: null,
          },
        },
      ],
    }

    const result = analyzeBusinessProcess(fixture)

    expect(result.findings.filter(f => f.dimension === 'security')).toHaveLength(0)
  })
})
