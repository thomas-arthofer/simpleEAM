import { analyzeBusinessCapability, analyzeBusinessProcess } from '../evaluator'
import { DEFAULT_MARKER, projectMarkers, resolveMarker } from '../markers'
import type { Finding, SovereigntyAnalysis } from '../types'
import {
  ancestorStricterOneStepFixture,
  businessProcessGreenFixture,
  businessProcessNoParentUnfilledFixture,
  greenChainFixture,
  greyChainFixture,
  nestedCapabilitySubtreeFixture,
  redChainFixture,
} from './fixtures'

describe('projectMarkers', () => {
  it('gives a BusinessCapability root a GREEN selfStatus once its own required levels are filled in (Phase 5 D-06 seed)', () => {
    const analysis = analyzeBusinessCapability(redChainFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get('cap-abrechnung')).toEqual({
      selfStatus: 'GREEN',
      downstreamStatus: 'RED',
    })
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

  it('classifies a non-root element with no achieved values as GREY self and GREY downstream, never GREEN by omission', () => {
    const analysis = analyzeBusinessCapability(greyChainFixture)
    const markers = projectMarkers(analysis)

    // cap-grey has its own required level filled in (control: MEDIUM), so
    // its selfStatus is GREEN (Phase 5 D-06 seed rule).
    expect(markers.get('cap-grey')).toEqual({ selfStatus: 'GREEN', downstreamStatus: 'GREY' })
    // app-unassessed has no achieved values at all — stays GREY regardless.
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

    // The root itself is GREEN-self (own required levels filled in) with a
    // GREEN ring when fully compliant.
    expect(markers.get('cap-green')).toEqual({ selfStatus: 'GREEN', downstreamStatus: 'GREEN' })
  })

  // Phase 5 Design A (RESEARCH §3.4): a nested BC whose subtree contains a
  // real deviation receives its own fill via a synthesised premise finding
  // emitted by `analyzeCapabilitySubtree` — projectMarkers picks this up
  // naturally via the `isViolatingElement` branch, so no
  // `capabilityIds`/`comparedIds` machinery is needed.
  it('gives a failing nested BusinessCapability its own RED fill via a synthesised premise finding (Phase 5 Design A)', () => {
    const analysis = analyzeBusinessCapability(nestedCapabilitySubtreeFixture)
    const markers = projectMarkers(analysis)

    // Root has no requirement of its own, so seed selfStatus is GREY; the
    // synthesised premise finding at `cap-test` also updates its
    // downstream to RED (violation is in its subtree).
    expect(markers.get('cap-gemeinsamer-max')).toEqual({
      selfStatus: 'GREY',
      downstreamStatus: 'RED',
    })
    // `cap-test`: fill = RED (synthesised premise finding) + ring = RED
    // (its own subtree has a leaf RED via classifyNode).
    expect(markers.get('cap-test')).toEqual({ selfStatus: 'RED', downstreamStatus: 'RED' })
    // `cap-wichtiger-businesscase`: compliant sibling; never appears in any
    // finding's chainPath → resolves to DEFAULT_MARKER (GREEN/GREEN).
    expect(markers.has('cap-wichtiger-businesscase')).toBe(false)
    expect(resolveMarker(markers, 'cap-wichtiger-businesscase')).toEqual(DEFAULT_MARKER)
  })

  // Phase 5 D-02: on the same element, a real violation (RED/YELLOW) always
  // beats a data-gap GREY on any other dimension via the STATUS_RANK
  // (GREEN<GREY<YELLOW<RED). Verified here by hand-constructing a
  // two-finding fixture rather than relying on evaluator plumbing.
  it('precedence: a YELLOW finding on one dim beats a GREY finding on another dim for the same element', () => {
    const analysis: SovereigntyAnalysis = {
      rootId: 'root',
      rootType: 'businessCapability',
      selfStatus: 'GREEN',
      downstreamStatus: 'YELLOW',
      capabilityIds: ['root'],
      findings: [
        {
          violatingElementId: 'leaf',
          violatingElementType: 'application',
          violatingElementName: 'Leaf',
          dimension: 'security',
          status: 'GREY',
          requiredLevel: null,
          actualLevel: null,
          chainPath: ['root', 'leaf'],
        },
        {
          violatingElementId: 'leaf',
          violatingElementType: 'application',
          violatingElementName: 'Leaf',
          dimension: 'control',
          status: 'YELLOW',
          requiredLevel: 'HIGH',
          actualLevel: 'MEDIUM',
          chainPath: ['root', 'leaf'],
        },
      ] as Finding[],
    }

    const markers = projectMarkers(analysis)

    expect(markers.get('leaf')).toEqual({ selfStatus: 'YELLOW', downstreamStatus: 'YELLOW' })
    // Root still has a GREEN seed; its downstream picks up the YELLOW ring.
    expect(markers.get('root')).toEqual({ selfStatus: 'GREEN', downstreamStatus: 'YELLOW' })
  })

  // Phase 5 D-04: a downstream Application receives its per-element fill
  // directly from `classifyNode`'s deviation math — no additional lookup or
  // backfill needed.
  it("downstream App inherits YELLOW fill at 1-step deviation against the root's effective-Req", () => {
    const analysis = analyzeBusinessCapability(ancestorStricterOneStepFixture('MEDIUM'))
    const markers = projectMarkers(analysis)

    // Root: GREEN-self (own required filled in) + YELLOW ring.
    expect(markers.get('cap-tracer-root')).toEqual({
      selfStatus: 'GREEN',
      downstreamStatus: 'YELLOW',
    })
    // Leaf App: YELLOW-self (it is the violating element on the security
    // dim, deviation=1) + YELLOW ring.
    expect(markers.get('app-tracer-leaf')).toEqual({
      selfStatus: 'YELLOW',
      downstreamStatus: 'YELLOW',
    })
  })

  it('downstream App inherits RED fill at ≥2-step deviation', () => {
    const analysis = analyzeBusinessCapability(ancestorStricterOneStepFixture('LOW'))
    const markers = projectMarkers(analysis)

    expect(markers.get('cap-tracer-root')).toEqual({
      selfStatus: 'GREEN',
      downstreamStatus: 'RED',
    })
    expect(markers.get('app-tracer-leaf')).toEqual({
      selfStatus: 'RED',
      downstreamStatus: 'RED',
    })
  })

  // BP root has its own required filled in → GREEN seed (Phase 5 D-06).
  it('resolves a BusinessProcess root to GREEN when its own required is filled in', () => {
    const analysis = analyzeBusinessProcess(businessProcessGreenFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(businessProcessGreenFixture.rootId)?.selfStatus).toBe('GREEN')
  })

  it('resolves a BusinessProcess root to GREY when nothing is filled in', () => {
    const analysis = analyzeBusinessProcess(businessProcessNoParentUnfilledFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(businessProcessNoParentUnfilledFixture.rootId)?.selfStatus).toBe('GREY')
  })
})
