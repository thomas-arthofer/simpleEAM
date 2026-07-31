import { analyzeBusinessCapability, analyzeDataObject } from '../evaluator'
import {
  compositeApplicationFixture,
  dataObjectChainFixture,
  greenChainFixture,
  greyChainFixture,
  multiParentInfrastructureFixture,
  nestedCapabilitySubtreeFixture,
  partialAchievedFixture,
  redChainFixture,
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
