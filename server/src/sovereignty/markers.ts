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
 *
 * Data-gap dominance (Phase 5 D-02) falls out of this rank automatically:
 * `worseStatus(GREY, YELLOW) = YELLOW` and `worseStatus(GREY, RED) = RED`,
 * so a real violation on any dimension always beats a data-gap GREY on any
 * other dimension when both findings target the same element.
 */
function worseStatus(a: SovereigntyStatus, b: SovereigntyStatus): SovereigntyStatus {
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a
}

/**
 * Projects a `SovereigntyAnalysis`'s flat `Finding[]` into a per-element
 * self/downstream marker map via a single unified findings-fold — no
 * classification logic is introduced here (RESEARCH.md Anti-Pattern 3: one
 * classifier, reused everywhere).
 *
 * Phase 5 D-06 rewrite (RESEARCH §3.3): the pre-Phase-5 per-capability
 * self-violation / compared-set / GREEN-backfill machinery is gone. Every
 * element — including requirement roots and nested BCs — resolves its fill
 * from findings via this single loop.
 *
 * Semantics:
 * - The root ALWAYS has an entry (D-05, "never omit a requested node"),
 *   seeded with `analysis.selfStatus` / `analysis.downstreamStatus`. The
 *   evaluator's `analyzeBusinessCapability` / `analyzeBusinessProcess` /
 *   `analyzeDataObject` all return `selfStatus = GREEN` when the root has
 *   its own required filled in and `GREY` otherwise (Phase 5 D-06 seed).
 * - Nested BusinessCapabilities pick up their fill via the per-nested-BC
 *   premise findings that `analyzeCapabilitySubtree` synthesises (Design A,
 *   RESEARCH §3.4): a synthesised finding names the nested BC as its own
 *   `violatingElementId`, so the `isViolatingElement` branch below produces
 *   the correct nested-BC fill without any special-case machinery.
 * - Downstream Application/Infrastructure/AIComponent leaves receive their
 *   fill via `classifyNode`'s per-leaf findings (deviation math against the
 *   root's effective-Req, RESEARCH §2.4 + §3.5).
 * - Every id on any `chainPath` also picks up a `downstreamStatus` update
 *   (worseStatus, unconditionally) — this is what propagates the "worst
 *   status anywhere below me" ring up through every ancestor of a leaf
 *   violation.
 * - An element that never appears in any finding's `chainPath` has no entry
 *   in the returned map — callers must resolve missing ids via
 *   `resolveMarker` / `DEFAULT_MARKER`, which is always `{ GREEN, GREEN }`,
 *   so GREEN is never silently omitted end-to-end.
 */
export function projectMarkers(analysis: SovereigntyAnalysis): Map<string, SovereigntyMarker> {
  const markers = new Map<string, SovereigntyMarker>()

  // Root always exists in the map (never omitted). The seed carries the
  // requirement-root's own selfStatus (Phase 5 D-06: GREEN when own required
  // is filled in, GREY otherwise) and the analysis's aggregate downstream
  // status. Subsequent findings-fold updates may worsen either value.
  markers.set(analysis.rootId, {
    selfStatus: analysis.selfStatus,
    downstreamStatus: analysis.downstreamStatus,
  })

  for (const finding of analysis.findings) {
    for (const id of finding.chainPath) {
      const current = markers.get(id) ?? DEFAULT_MARKER
      const isViolatingElement = id === finding.violatingElementId
      markers.set(id, {
        selfStatus: isViolatingElement
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
