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
 * - The root always has an entry with `selfStatus: 'GREY'` (D-05 — a
 *   BusinessCapability/DataObject owns no achieved rating of its own), and
 *   `downstreamStatus` equal to the analysis's own aggregate.
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

  function ensure(id: string): SovereigntyMarker {
    const existing = markers.get(id)
    if (existing) return existing
    const created = DEFAULT_MARKER
    markers.set(id, created)
    return created
  }

  // The root always gets an entry, GREY-self, regardless of whether any
  // findings exist at all (D-05).
  markers.set(analysis.rootId, {
    selfStatus: 'GREY',
    downstreamStatus: analysis.downstreamStatus,
  })

  for (const finding of analysis.findings) {
    for (const id of finding.chainPath) {
      const isRoot = id === analysis.rootId
      const current = ensure(id)
      const isViolatingElement = id === finding.violatingElementId

      markers.set(id, {
        selfStatus: isRoot
          ? 'GREY'
          : isViolatingElement
            ? worseStatus(current.selfStatus, finding.status)
            : current.selfStatus,
        downstreamStatus: worseStatus(current.downstreamStatus, finding.status),
      })
    }
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
