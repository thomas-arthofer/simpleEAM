import { analyzeBusinessCapability, analyzeBusinessProcess, analyzeDataObject } from '../evaluator'
import {
  ancestorStricterOneStepFixture,
  businessProcessGreenFixture,
  businessProcessGreyFixture,
  businessProcessNoParentUnfilledFixture,
  businessProcessRedFixture,
  compositeApplicationFixture,
  dataObjectChainFixture,
  greenChainFixture,
  greyChainFixture,
  multiParentInfrastructureFixture,
  nestedCapabilitySubtreeFixture,
  partialAchievedFixture,
  redChainFixture,
  rootNoParentUnfilledFixture,
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

    // Phase 5 Design A: two RED findings expected — one leaf finding on
    // `app-schlechte-app` (deviation=3, from `classifyNode`) and one
    // synthesised premise finding on the nested BC `cap-test` (Design A,
    // RESEARCH §3.4) so `projectMarkers` can give the nested BC its own
    // fill via the unified findings-fold. Filter by
    // `violatingElementType: 'application'` to assert on the leaf finding.
    const redLeafFindings = result.findings.filter(
      f => f.status === 'RED' && f.violatingElementType === 'application'
    )
    expect(redLeafFindings).toHaveLength(1)
    expect(redLeafFindings[0]).toMatchObject({
      violatingElementId: 'app-schlechte-app',
      dimension: 'strategicAutonomy',
      status: 'RED',
      requiredLevel: 'VERY_HIGH',
      actualLevel: 'LOW',
      chainPath: ['cap-gemeinsamer-max', 'cap-test', 'app-schlechte-app'],
    })

    // Synthesised premise finding for the failing nested BC.
    const redBcFindings = result.findings.filter(
      f => f.status === 'RED' && f.violatingElementType === 'businessCapability'
    )
    expect(redBcFindings).toHaveLength(1)
    expect(redBcFindings[0]).toMatchObject({
      violatingElementId: 'cap-test',
      status: 'RED',
      chainPath: ['cap-gemeinsamer-max', 'cap-test'],
    })

    // The compliant child subtree must not contribute any findings.
    expect(result.findings.some(f => f.violatingElementId === 'app-gute-app')).toBe(false)
    expect(result.findings.some(f => f.violatingElementId === 'cap-wichtiger-businesscase')).toBe(
      false
    )
  })
})

describe('analyzeDataObject', () => {
  it('walks usedByApplications and classifies against the DataObject requirement (D-08)', () => {
    const result = analyzeDataObject(dataObjectChainFixture)

    // Phase 5 D-06: uniform seed rule — root's own required is filled in
    // (security: HIGH), so selfStatus is GREEN (was GREY pre-Phase-5 for
    // DataObject).
    expect(result.selfStatus).toBe('GREEN')
    // Phase 5 D-02: HIGH vs MEDIUM is a 1-step deviation, now YELLOW under
    // the deviation math (was RED under the old strict `actual < required`
    // rule; the intent — "the supporting App is below the DataObject's
    // requirement" — is preserved).
    expect(result.downstreamStatus).toBe('YELLOW')

    const yellowFindings = result.findings.filter(f => f.status === 'YELLOW')
    expect(yellowFindings).toHaveLength(1)
    expect(yellowFindings[0]).toMatchObject({
      violatingElementId: 'app-consumer',
      violatingElementType: 'application',
      dimension: 'security',
      status: 'YELLOW',
      requiredLevel: 'HIGH',
      actualLevel: 'MEDIUM',
      chainPath: ['dataobject-customer-records', 'app-consumer'],
    })
  })

  it('shares its classification logic with analyzeBusinessCapability (same GREY/never-GREEN-by-default rule)', () => {
    const result = analyzeDataObject(dataObjectChainFixture)

    // No dimension is missing an achieved value in this fixture, so no GREY
    // findings are expected — only the one YELLOW deviation-1 violation
    // (post Phase 5 D-02 deviation math; was RED historically).
    expect(result.findings.every(f => f.status === 'YELLOW')).toBe(true)
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
  // levels resolve GREEN. Phase 5 D-06: no more parentProcess consistency
  // check, so selfStatus is only ever GREEN (own required filled in) or
  // GREY (nothing filled in).
  it('resolves selfStatus to GREEN on achieved-chain-only fixtures with required levels filled in', () => {
    expect(analyzeBusinessProcess(businessProcessRedFixture).selfStatus).toBe('GREEN')
    expect(analyzeBusinessProcess(businessProcessGreyFixture).selfStatus).toBe('GREEN')
    expect(analyzeBusinessProcess(businessProcessGreenFixture).selfStatus).toBe('GREEN')
  })

  it('resolves selfStatus to GREY when nothing is filled in', () => {
    const result = analyzeBusinessProcess(businessProcessNoParentUnfilledFixture)

    expect(result.selfStatus).toBe('GREY')
  })

  it('sets rootType to businessProcess and capabilityIds to the type-agnostic SupportChain shape', () => {
    const result = analyzeBusinessProcess(businessProcessGreenFixture)

    expect(result.rootType).toBe('businessProcess')
    expect(result.capabilityIds).toEqual([businessProcessGreenFixture.rootId])
  })
})
// Phase 5 Plan A tracer: proves the chain-premise math end-to-end for
// BusinessCapability on one dimension (security) — repository fold produces
// `effectiveRequiredLevels.security = HIGH` from a root that only requires
// MEDIUM but sits under a stricter ancestor, and classifyNode's new
// deviation math yields YELLOW at delta=1, RED at delta>=2, no finding when
// achieved meets/exceeds effective-Req, GREY when achieved is null. All other
// dimensions stay null so each case asserts exactly one finding on security.
describe('Phase 5 tracer: BC ancestor-stricter deviation (security)', () => {
  it('emits exactly one YELLOW finding when leaf achieved is one step below effective-Req (MEDIUM vs HIGH)', () => {
    const result = analyzeBusinessCapability(ancestorStricterOneStepFixture('MEDIUM'))

    const securityFindings = result.findings.filter(f => f.dimension === 'security')
    expect(securityFindings).toHaveLength(1)
    expect(securityFindings[0]).toMatchObject({
      violatingElementId: 'app-tracer-leaf',
      violatingElementType: 'application',
      dimension: 'security',
      status: 'YELLOW',
      requiredLevel: 'HIGH',
      actualLevel: 'MEDIUM',
    })
    expect(result.downstreamStatus).toBe('YELLOW')
    // No findings on any other dimension (all other required/achieved are null).
    expect(result.findings.filter(f => f.dimension !== 'security')).toHaveLength(0)
  })

  it('emits exactly one RED finding when leaf achieved is two steps below effective-Req (LOW vs HIGH)', () => {
    const result = analyzeBusinessCapability(ancestorStricterOneStepFixture('LOW'))

    const securityFindings = result.findings.filter(f => f.dimension === 'security')
    expect(securityFindings).toHaveLength(1)
    expect(securityFindings[0]).toMatchObject({
      violatingElementId: 'app-tracer-leaf',
      dimension: 'security',
      status: 'RED',
      requiredLevel: 'HIGH',
      actualLevel: 'LOW',
    })
    expect(result.downstreamStatus).toBe('RED')
    expect(result.findings.filter(f => f.dimension !== 'security')).toHaveLength(0)
  })

  it('emits no finding when leaf achieved meets effective-Req (HIGH == HIGH)', () => {
    const result = analyzeBusinessCapability(ancestorStricterOneStepFixture('HIGH'))

    expect(result.findings.filter(f => f.dimension === 'security')).toHaveLength(0)
    // No non-security findings either — all other dims are null on both sides.
    expect(result.findings).toHaveLength(0)
    expect(result.downstreamStatus).toBe('GREEN')
  })

  it('emits a single GREY finding when leaf achieved is null on the security dimension', () => {
    const result = analyzeBusinessCapability(ancestorStricterOneStepFixture(null))

    const greyFindings = result.findings.filter(f => f.dimension === 'security')
    expect(greyFindings).toHaveLength(1)
    expect(greyFindings[0]).toMatchObject({
      violatingElementId: 'app-tracer-leaf',
      dimension: 'security',
      status: 'GREY',
      requiredLevel: 'HIGH',
      actualLevel: null,
    })
    // Every other dimension of the leaf is also achieved=null → GREY finding
    // per SOV-03. This is expected and shared with all leaves in the suite.
    expect(result.findings.every(f => f.status === 'GREY')).toBe(true)
    expect(result.downstreamStatus).toBe('GREY')
  })
})

// Phase 5 Plan B: exercise the deviation math on all four dimensions (Plan A
// covered `security` only) plus the scale-boundary and precedence corners.
describe('Phase 5: deviation math (all four dimensions)', () => {
  it('emits four YELLOW findings when leaf achieved is one step below required on every dim', () => {
    const { deviationOneStepFixture } = require('./fixtures')
    const result = analyzeBusinessCapability(deviationOneStepFixture)

    const yellow = result.findings.filter((f: { status: string }) => f.status === 'YELLOW')
    expect(yellow).toHaveLength(4)
    const dims = new Set(yellow.map((f: { dimension: string }) => f.dimension))
    expect(dims).toEqual(new Set(['strategicAutonomy', 'resilience', 'security', 'control']))
    expect(result.downstreamStatus).toBe('YELLOW')
  })

  it('emits four RED findings when leaf achieved is two steps below required on every dim', () => {
    const { deviationTwoStepFixture } = require('./fixtures')
    const result = analyzeBusinessCapability(deviationTwoStepFixture)

    const red = result.findings.filter((f: { status: string }) => f.status === 'RED')
    expect(red).toHaveLength(4)
    expect(result.downstreamStatus).toBe('RED')
  })

  it('scale boundary: NONE vs VERY_HIGH is a 4-step deviation, still RED — no hardcoded 4 in classifyNode', () => {
    const { deviationBoundaryFixture } = require('./fixtures')
    const result = analyzeBusinessCapability(deviationBoundaryFixture)

    const red = result.findings.filter((f: { status: string }) => f.status === 'RED')
    expect(red).toHaveLength(4)
    expect(
      red.every(
        (f: { requiredLevel: string | null; actualLevel: string | null }) =>
          f.requiredLevel === 'VERY_HIGH' && f.actualLevel === 'NONE'
      )
    ).toBe(true)
  })

  it('precedence: a RED finding on one dim and a GREY finding on another on the same element — worseStatus makes the marker RED', () => {
    const { precedenceViolationOverGapFixture } = require('./fixtures')
    const result = analyzeBusinessCapability(precedenceViolationOverGapFixture)

    const findingsOnLeaf = result.findings.filter(
      (f: { violatingElementId: string }) => f.violatingElementId === 'app-prec'
    )
    // 1 RED (strategicAutonomy) + 1 GREY (security)
    expect(findingsOnLeaf.some((f: { status: string }) => f.status === 'RED')).toBe(true)
    expect(findingsOnLeaf.some((f: { status: string }) => f.status === 'GREY')).toBe(true)
    // Aggregate: RED beats GREY.
    expect(result.downstreamStatus).toBe('RED')
  })
})

// Phase 5 Plan B: verify that a nested BC sees its ancestor's stricter
// requirement via the maxByDimension fold — not just its own weaker req.
describe('Phase 5: ancestor-stricter propagation via analyzeCapabilitySubtree', () => {
  it("a child BC's downstream App is classified against max(child.required, ancestor's effectiveReq)", () => {
    const { ancestorMaxWinsFixture } = require('./fixtures')
    const result = analyzeBusinessCapability(ancestorMaxWinsFixture)

    // App achieved security=MEDIUM under folded requirement HIGH → YELLOW.
    const leafFindings = result.findings.filter(
      (f: { violatingElementId: string; violatingElementType: string; dimension: string }) =>
        f.violatingElementId === 'app-anc' &&
        f.violatingElementType === 'application' &&
        f.dimension === 'security'
    )
    expect(leafFindings).toHaveLength(1)
    expect(leafFindings[0]).toMatchObject({
      status: 'YELLOW',
      requiredLevel: 'HIGH',
      actualLevel: 'MEDIUM',
    })
  })
})
