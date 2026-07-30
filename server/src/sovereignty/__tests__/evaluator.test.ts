import { analyzeBusinessCapability } from '../evaluator'
import { greenChainFixture, greyChainFixture, redChainFixture } from './fixtures'

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
})
