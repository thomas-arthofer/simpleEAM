import type { SovereigntyAnalysis, SovereigntyStatus } from './types'

/**
 * The D-05 two-marker projection for a single element: `selfStatus` is this
 * element's own achieved-vs-required comparison (RED/YELLOW/GREY/GREEN),
 * `downstreamStatus` is the worst status found anywhere below it in the
 * support chain. This is the fill/ring distinction eam-konzept.md §3
 * describes for diagram markers (SUX-04).
 */
export interface SovereigntyMarker {
  readonly selfStatus: SovereigntyStatus
  readonly downstreamStatus: SovereigntyStatus
}

/**
 * An element with zero findings anywhere in its chain is fully compliant —
 * it must still resolve to an explicit GREEN/GREEN marker, never be
 * suppressed or omitted (UI-SPEC: markers must never be suppressed for the
 * compliant case).
 */
export const DEFAULT_MARKER: SovereigntyMarker = { selfStatus: 'GREEN', downstreamStatus: 'GREEN' }

const STATUS_RANK: Record<SovereigntyStatus, number> = {
  GREEN: 0,
  GREY: 1,
  YELLOW: 2,
  RED: 3,
}

/**
 * RED always wins (eam-konzept.md: "ein Element mit auch nur einem roten
 * Befund gilt als rot"), then YELLOW, then GREY, with GREEN as the
 * fully-compliant floor: GREEN < GREY < YELLOW < RED.
 */
function worseStatus(a: SovereigntyStatus, b: SovereigntyStatus): SovereigntyStatus {
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a
}

/**
 * Projects a `SovereigntyAnalysis`'s flat `Finding[]` into a per-element
 * self/downstream marker map. Folds over `analysis.findings` only — no new
 * comparison/classification logic is introduced here, this only aggregates
 * `Finding[]` already produced by `evaluator.ts` (RESEARCH.md Anti-Pattern
 * 3: one classifier, reused everywhere).
 *
 * - The root always has an entry (D-05 — a BusinessCapability/DataObject
 *   owns no achieved rating of its own): `selfStatus` is GREEN when a real
 *   comparison against a parent was made and found consistent, YELLOW on a
 *   parent-vs-own contradiction, GREY only when there is genuinely nothing
 *   to compare (03-CONTEXT.md D-01/D-02); a DataObject root (no parents)
 *   always stays GREY. `downstreamStatus` equals the analysis's own
 *   aggregate.
 * - Every other element that appears anywhere in a finding's `chainPath`
 *   gets its own `selfStatus` (worst status among findings where it is the
 *   `violatingElementId`) and `downstreamStatus` (worst status among all
 *   findings whose `chainPath` contains it at any position at-or-below it).
 * - An element that never appears in any finding's `chainPath` has no entry
 *   in the returned map — callers must resolve missing ids via
 *   `resolveMarker`/`DEFAULT_MARKER`, which is always `{ GREEN, GREEN }`,
 *   so GREEN is never silently omitted end-to-end.
 */
export function projectMarkers(analysis: SovereigntyAnalysis): Map<string, SovereigntyMarker> {
  const markers = new Map<string, SovereigntyMarker>()
  const capabilityIds = new Set(analysis.capabilityIds)

  // 02.3 D-05: a capability can be analyzed more than once when it is shared
  // by two or more parents in the same subtree (diamond topology — no
  // memoization by design, per D-02 independent-per-parent evaluation). Each
  // occurrence produces its own block of findings in `analysis.findings`, so
  // whether `id` keeps its self-violation status must be decided from the
  // FULL finding set up front, not per-finding as the loop below walks
  // blocks in order — otherwise a later block's non-violating passthrough
  // for the same id would unconditionally reset an earlier block's genuine
  // YELLOW self-violation back to GREY (CR-01).
  //
  // Derived from `capabilityIds` membership (Phase 4 04-02 fix) rather than
  // an enumerated `violatingElementType === 'businessCapability'` string
  // check: the old hardcoded literal silently excluded every other
  // requirement-root type's own self-violation findings (BusinessProcess's
  // `violatingElementType: 'businessProcess'` parent-contradiction findings,
  // D-04) from this set, downgrading a genuine YELLOW contradiction to
  // GREEN/GREY. `capabilityIds` already identifies every requirement-root id
  // in this analysis (Pattern 3, BusinessCapability and BusinessProcess
  // today, extensible to a future third root type without another code
  // change here) — a finding's `violatingElementId` is a self-violation
  // exactly when that id is itself a requirement root.
  const selfViolatingIds = new Set(
    analysis.findings
      .filter(f => capabilityIds.has(f.violatingElementId))
      .map(f => f.violatingElementId)
  )

  // 03-CONTEXT.md D-01/D-02: the set of capability ids that had at least one
  // real (non-excluded) dimension compared against a parent, whether that
  // comparison passed or contradicted. Consulted below alongside
  // `selfViolatingIds` to resolve the three-valued GREEN/YELLOW/GREY
  // selfStatus — YELLOW (selfViolatingIds) still wins over GREEN
  // (comparedIds) for free, since a genuine contradiction is by construction
  // also a hasRealComparison=true case (no new precedence logic needed).
  const comparedIds = new Set(analysis.comparedCapabilityIds)

  function ensure(id: string): SovereigntyMarker {
    const existing = markers.get(id)
    if (existing) return existing
    const created = DEFAULT_MARKER
    markers.set(id, created)
    return created
  }

  // The root always gets an entry, GREY-self by default, regardless of
  // whether any findings exist at all (D-05) — the loop below and the
  // backfill loop after it may still upgrade this to GREEN (via
  // `comparedIds`) or YELLOW (via `selfViolatingIds`) for a capability root
  // whose own required level was genuinely compared against a parent.
  markers.set(analysis.rootId, {
    selfStatus: 'GREY',
    downstreamStatus: analysis.downstreamStatus,
  })

  for (const finding of analysis.findings) {
    for (const id of finding.chainPath) {
      // Every BusinessCapability in this analysis's own subtree (D-11) must
      // stay GREY-self forever, not just the outermost query root (D-05): a
      // capability owns no achieved rating, whether it's the id the caller
      // asked about or a nested `childCapabilities` id merely passed through
      // on the way to a descendant's violation. Without this, a nested
      // capability's selfStatus fell back to the DEFAULT_MARKER's GREEN,
      // since it is never a finding's own `violatingElementId` (only
      // Application/AIComponent/Infrastructure ever are).
      const isCapability = capabilityIds.has(id)
      const current = ensure(id)
      const isViolatingElement = id === finding.violatingElementId
      // 02.3 D-05 narrow exception: a capability that IS the violating element
      // of its own parent-vs-child required-level contradiction finding gets a
      // real selfStatus (YELLOW) instead of the unconditional GREY every other
      // capability keeps. Every other isCapability case (mid-chain pass-through,
      // or a violating element of a non-businessCapability type) resolves via
      // `comparedIds` (03-CONTEXT.md D-01/D-02): GREEN if a real comparison
      // happened for this id anywhere in the analysis, GREY otherwise.
      //
      // Checked against `selfViolatingIds` (computed once from the full
      // finding set above), NOT against this single `finding` in isolation —
      // a diamond-shared capability's self-violation, once true anywhere in
      // the analysis, must never be reset to GREY by a later, unrelated
      // passthrough finding for the same id (CR-01).
      const isCapabilitySelfViolation = isCapability && selfViolatingIds.has(id)

      markers.set(id, {
        selfStatus: isCapabilitySelfViolation
          ? isViolatingElement
            ? worseStatus(current.selfStatus, finding.status)
            : current.selfStatus
          : isCapability
            ? comparedIds.has(id)
              ? 'GREEN'
              : 'GREY'
            : isViolatingElement
              ? worseStatus(current.selfStatus, finding.status)
              : current.selfStatus,
        downstreamStatus: worseStatus(current.downstreamStatus, finding.status),
      })
    }
  }

  // A BusinessCapability with zero findings anywhere in its own subtree
  // (fully compliant, e.g. a compliant sibling next to a violating one)
  // never appears in the loop above at all, so without this it would fall
  // through to `resolveMarker`'s DEFAULT_MARKER (GREEN/GREEN) — wrong for a
  // capability, which must resolve GREEN-self only when a real comparison
  // actually happened (`comparedIds`), GREY otherwise (D-05/D-01). Backfills
  // every capability id with an explicit self-status entry, defaulting its
  // downstream to GREEN only when no finding ever touched it.
  // 02.3 D-05: skip the unconditional backfill for a capability that IS the
  // violating element of a parent-vs-child required-level contradiction
  // finding (its selfStatus was already set to YELLOW in the loop above) —
  // every other capability id still gets backfilled to GREEN/GREY exactly as
  // determined by `comparedIds`.
  for (const id of capabilityIds) {
    const current = ensure(id)
    if (selfViolatingIds.has(id)) continue
    markers.set(id, {
      selfStatus: comparedIds.has(id) ? 'GREEN' : 'GREY',
      downstreamStatus: current.downstreamStatus,
    })
  }

  return markers
}

/**
 * Resolves a single element's marker from a `projectMarkers` map, defaulting
 * to `DEFAULT_MARKER` (GREEN/GREEN) when the element has no entry — the
 * single place both `markers.test.ts` and the `sovereigntyMarkers` resolver
 * apply the "never omit a requested node" rule (RESEARCH.md Anti-Pattern 3:
 * one classifier, reused everywhere).
 */
export function resolveMarker(
  markers: ReadonlyMap<string, SovereigntyMarker>,
  id: string
): SovereigntyMarker {
  return markers.get(id) ?? DEFAULT_MARKER
}
