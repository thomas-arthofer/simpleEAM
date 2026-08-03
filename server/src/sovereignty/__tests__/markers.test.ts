import { analyzeBusinessCapability } from '../evaluator'
import { DEFAULT_MARKER, projectMarkers, resolveMarker } from '../markers'
import {
  greenChainFixture,
  greyChainFixture,
  nestedCapabilitySubtreeFixture,
  redChainFixture,
  rootParentContradictionFixture,
  rootParentNoContradictionFixture,
} from './fixtures'

describe('projectMarkers', () => {
  it('gives a BusinessCapability root a GREY selfStatus even when its downstreamStatus is RED (capability ring only)', () => {
    const analysis = analyzeBusinessCapability(redChainFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get('cap-abrechnung')).toEqual({ selfStatus: 'GREY', downstreamStatus: 'RED' })
  })

  it('gives every non-root element on a finding chainPath its own self and downstream status', () => {
    const analysis = analyzeBusinessCapability(redChainFixture)
    const markers = projectMarkers(analysis)

    // app-billing is fully compliant itself (no finding names it) but the
    // RED violation below it (infra-vm-web-03) must still widen its ring.
    expect(markers.get('app-billing')).toEqual({ selfStatus: 'GREEN', downstreamStatus: 'RED' })

    // infra-vm-web-03 is the actual violating element — both fill and ring RED.
    expect(markers.get('infra-vm-web-03')).toEqual({ selfStatus: 'RED', downstreamStatus: 'RED' })
  })

  it('classifies an element with no achieved values as GREY self and GREY downstream, never GREEN by omission', () => {
    const analysis = analyzeBusinessCapability(greyChainFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get('cap-grey')).toEqual({ selfStatus: 'GREY', downstreamStatus: 'GREY' })
    expect(markers.get('app-unassessed')).toEqual({ selfStatus: 'GREY', downstreamStatus: 'GREY' })
  })

  it('resolves an element that appears in zero findings to an explicit GREEN/GREEN marker, never omitting it', () => {
    const analysis = analyzeBusinessCapability(greenChainFixture)
    const markers = projectMarkers(analysis)

    // Fully-compliant elements never appear in any finding's chainPath, so
    // projectMarkers has no entry for them directly...
    expect(markers.has('app-compliant')).toBe(false)
    expect(markers.has('infra-compliant')).toBe(false)

    // ...but resolveMarker (the same helper the sovereigntyMarkers resolver
    // uses) must still return an explicit GREEN/GREEN marker for them.
    expect(resolveMarker(markers, 'app-compliant')).toEqual(DEFAULT_MARKER)
    expect(resolveMarker(markers, 'infra-compliant')).toEqual(DEFAULT_MARKER)
    expect(resolveMarker(markers, 'infra-compliant')).toEqual({
      selfStatus: 'GREEN',
      downstreamStatus: 'GREEN',
    })

    // The root itself is GREY-self with a GREEN ring when fully compliant.
    expect(markers.get('cap-green')).toEqual({ selfStatus: 'GREY', downstreamStatus: 'GREEN' })
  })

  // sovereignty-low-dc-green: a nested BusinessCapability child appearing
  // mid-chain in its ancestor's own findings (not as the analysis's own
  // rootId) must still stay GREY-self forever (D-05) — it must never fall
  // back to the DEFAULT_MARKER's GREEN just because it is never a finding's
  // `violatingElementId` (only Application/AIComponent/Infrastructure ever
  // are). Reproduces the "gemeinsamer max" -> "Wichtiger Businesscase" ->
  // "TEST" topology from the nested-bc-sov-inheritance precedent.
  it('gives every nested BusinessCapability child a GREY selfStatus too, not just the analysis root (D-05, D-11)', () => {
    const analysis = analyzeBusinessCapability(nestedCapabilitySubtreeFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get('cap-gemeinsamer-max')).toEqual({
      selfStatus: 'GREY',
      downstreamStatus: 'RED',
    })
    // "cap-test" is the violating child (its own app is below requirement).
    expect(markers.get('cap-test')?.selfStatus).toBe('GREY')
    // "cap-wichtiger-businesscase" is a fully-compliant *sibling* child that
    // never violates anything itself — before the fix it fell back to the
    // GREEN default here since it's never a finding's violatingElementId.
    expect(resolveMarker(markers, 'cap-wichtiger-businesscase').selfStatus).toBe('GREY')
  })

  // 02.3 D-05: the one narrow exception to the GREY-self invariant above — a
  // capability that IS the violating element of its own parent-vs-child
  // required-level contradiction finding gets a real YELLOW selfStatus.
  it('gives a capability YELLOW selfStatus when its own required level contradicts its parent (Test E, 02.3 D-05)', () => {
    const analysis = analyzeBusinessCapability(rootParentContradictionFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(rootParentContradictionFixture.rootId)?.selfStatus).toBe('YELLOW')
  })

  it('keeps the general GREY invariant when parentRequiredLevels is populated but produces no contradiction (Test F)', () => {
    const analysis = analyzeBusinessCapability(rootParentNoContradictionFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(rootParentNoContradictionFixture.rootId)).toEqual({
      selfStatus: 'GREY',
      downstreamStatus: 'GREEN',
    })
  })
})
