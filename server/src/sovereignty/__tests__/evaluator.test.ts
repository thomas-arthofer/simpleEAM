import { analyzeBusinessCapability, analyzeDataObject } from '../evaluator'
import {
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
  nestedCapabilitySubtreeFixture,
  partialAchievedFixture,
  redChainFixture,
  rootParentContradictionFixture,
  rootParentNoContradictionFixture,
} from './fixtures'

describe('analyzeBusinessCapability', () => {
  it('produces exactly one RED finding for the eam-konzept.md worked example', () => {
    const result = analyzeBusinessCapability(redChainFixture)

    expect(result.selfStatus).toBe('GREY')
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
    expect(result.selfStatus).toBe('GREY')
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
      result.findings.some(f => f.violatingElementId === 'cap-cycle-root-2' && f.actualLevel === 'NONE')
    ).toBe(false)
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
