import { analyzeBusinessCapability } from '../evaluator'
import { DEFAULT_MARKER, projectMarkers, resolveMarker } from '../markers'
import { greenChainFixture, greyChainFixture, redChainFixture } from './fixtures'

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
})
