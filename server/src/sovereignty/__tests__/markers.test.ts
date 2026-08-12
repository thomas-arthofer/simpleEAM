import { analyzeBusinessCapability, analyzeBusinessProcess } from '../evaluator'
import { DEFAULT_MARKER, projectMarkers, resolveMarker } from '../markers'
import {
  businessProcessParentAllExcludedFixture,
  businessProcessParentContradictionFixture,
  businessProcessParentNoContradictionFixture,
  diamondSharedCapabilityFixture,
  greenChainFixture,
  greyChainFixture,
  multiParentOneEmptyOneConsistentFixture,
  nestedCapabilityGreenFixture,
  nestedCapabilitySubtreeFixture,
  redChainFixture,
  rootParentAllExcludedFixture,
  rootParentContradictionFixture,
  rootParentNoContradictionFixture,
} from './fixtures'

describe('projectMarkers', () => {
  it('gives a BusinessCapability root a GREEN selfStatus once its own required levels are filled in, even without a parent to compare against', () => {
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

    // cap-grey has its own required level filled in (control: MEDIUM) and no
    // parent, so it resolves GREEN-self even though its downstream is GREY.
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
    expect(resolveMarker(markers, 'infra-compliant')).toEqual({
      selfStatus: 'GREEN',
      downstreamStatus: 'GREEN',
    })

    // The root itself is GREEN-self (own required levels filled in, no
    // parent to contradict) with a GREEN ring when fully compliant.
    expect(markers.get('cap-green')).toEqual({ selfStatus: 'GREEN', downstreamStatus: 'GREEN' })
  })

  // sovereignty-low-dc-green: a nested BusinessCapability child appearing
  // mid-chain in its ancestor's own findings (not as the analysis's own
  // rootId) must still stay GREY-self forever (D-05) — it must never fall
  // back to the DEFAULT_MARKER's GREEN just because it is never a finding's
  // `violatingElementId` (only Application/AIComponent/Infrastructure ever
  // are). Reproduces the "gemeinsamer max" -> "Wichtiger Businesscase" ->
  // "TEST" topology from the nested-bc-sov-inheritance precedent.
  //
  // 03-CONTEXT.md D-01: this stays GREY under the new three-valued rule too
  // (not a behavior change) — "cap-test"/"cap-wichtiger-businesscase"'s
  // immediate parent ("cap-gemeinsamer-max") has `required: requirementLevels()`
  // (every dimension null), so every dimension is excluded for both children,
  // landing in the same "genuinely nothing compared" bucket as
  // `rootParentAllExcludedFixture`, not the "no parent at all" bucket.
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

  // 03-CONTEXT.md D-01: a capability whose own required level was genuinely
  // compared (both sides non-null) against a parent and found consistent
  // (no contradiction anywhere) resolves selfStatus GREEN — distinct from
  // both the general "no parent at all" GREY invariant above and the
  // YELLOW contradiction case below.
  it('resolves GREEN when parentRequiredLevels is populated and produces no contradiction — a genuine comparison passed (Test F, D-01)', () => {
    const analysis = analyzeBusinessCapability(rootParentNoContradictionFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(rootParentNoContradictionFixture.rootId)).toEqual({
      selfStatus: 'GREEN',
      downstreamStatus: 'GREEN',
    })
  })

  // 03-CONTEXT.md D-01: a parent IS present, but every one of its 4
  // dimensions is null (excluded from comparison regardless of the child's
  // own values) — genuinely nothing was compared, so this must stay GREY,
  // distinct from the GREEN case immediately above.
  it('stays GREY when a parent is present but every dimension is excluded from comparison (genuinely nothing compared)', () => {
    const analysis = analyzeBusinessCapability(rootParentAllExcludedFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(rootParentAllExcludedFixture.rootId)).toEqual({
      selfStatus: 'GREY',
      downstreamStatus: 'GREEN',
    })
  })

  // CR-01 regression: a capability shared by two parents in the same
  // subtree (diamond topology, no memoization by design per D-02) genuinely
  // self-violates against only ONE of its two parents. Its selfStatus must
  // stay YELLOW even though a LATER, unrelated finding block (the other
  // parent's copy, which has its own real Application/AIComponent violation
  // below it) also touches the same id as a mid-chain passthrough member.
  //
  // 03-CONTEXT.md D-02 precedence regression: "cap-shared"'s `cap-p2` edge
  // (security LOW vs. parent LOW — equal, not stricter, a real PASSING
  // comparison) now ALSO contributes to `comparedIds` (this phase's new
  // GREEN-eligibility signal), yet `selfStatus` must still resolve YELLOW,
  // never GREEN, because the `cap-p1` edge's genuine contradiction wins —
  // proving "any contradiction beats any GREEN-eligible comparison" holds
  // even when the same capability id has both kinds of edge in one analysis.
  it("keeps a diamond-shared capability's genuine YELLOW self-violation even when a later finding block also passes through it (Test N, CR-01)", () => {
    const analysis = analyzeBusinessCapability(diamondSharedCapabilityFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get('cap-shared')?.selfStatus).toBe('YELLOW')
  })

  it('resolves GREEN for a descendant whose own required level was genuinely compared against its immediate parent and found consistent (D-01 descendant half)', () => {
    const analysis = analyzeBusinessCapability(nestedCapabilityGreenFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get('cap-child-nested-green')?.selfStatus).toBe('GREEN')
  })

  it('D-02: resolves GREEN overall when one parent contributes zero comparable dimensions but another contributes a real, consistent one', () => {
    const analysis = analyzeBusinessCapability(multiParentOneEmptyOneConsistentFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(multiParentOneEmptyOneConsistentFixture.rootId)?.selfStatus).toBe('GREEN')
  })

  // Critical regression (04-RESEARCH.md § selfViolatingIds Filter Gap): before
  // the fix, `selfViolatingIds` hardcoded `f.violatingElementType ===
  // 'businessCapability'`, so a BusinessProcess's genuine YELLOW
  // parent-contradiction finding was silently swallowed into GREEN (its
  // dimension was also a real comparison, so `comparedIds` resolved it
  // GREEN) instead of surfacing as YELLOW. This test is the fix for that
  // exact gap — it must fail before the `capabilityIds.has(...)` fix is
  // applied and pass after.
  it('gives a BusinessProcess YELLOW selfStatus when its own required level contradicts its parentProcess (D-04 critical fix)', () => {
    const analysis = analyzeBusinessProcess(businessProcessParentContradictionFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(businessProcessParentContradictionFixture.rootId)?.selfStatus).toBe('YELLOW')
  })

  it('resolves GREEN for a BusinessProcess genuinely compared against its parentProcess and found consistent', () => {
    const analysis = analyzeBusinessProcess(businessProcessParentNoContradictionFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(businessProcessParentNoContradictionFixture.rootId)?.selfStatus).toBe(
      'GREEN'
    )
  })

  it('resolves GREY for a BusinessProcess whose parentProcess is present but every dimension is excluded from comparison', () => {
    const analysis = analyzeBusinessProcess(businessProcessParentAllExcludedFixture)
    const markers = projectMarkers(analysis)

    expect(markers.get(businessProcessParentAllExcludedFixture.rootId)?.selfStatus).toBe('GREY')
  })
})
