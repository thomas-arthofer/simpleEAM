// Sovereignty diagram markers (SUX-03/SUX-04, D-05 fill/ring model).
//
// Renders two small bound ellipse elements on every main diagram element that
// has a resolvable sovereigntyMarkers entry: an inner filled "fill" ellipse
// (selfStatus, 10px) and an outer unfilled "ring" ellipse (downstreamStatus,
// 18px, offset 2px outside the fill). Gated behind featureFlags.Sovereignty
// (D-09) — syncSovereigntyMarkers is the single gate, composed into
// syncDiagramOnOpen (databaseSyncUtils.ts) immediately after
// syncDiagramOnOpenSimple.
import { GET_SOVEREIGNTY_MARKERS } from '@/graphql/sovereigntyMarkers'
import { extractDatabaseElements } from './databaseSyncUtils'
import { generateElementId } from './excalidrawLibraryUtils'

// Minimal structural shape shared with databaseSyncUtils.ts's (unexported)
// DiagramElement — kept in sync with the customData fields this module
// reads/writes.
interface DiagramElement {
  id: string
  type: string
  x?: number
  y?: number
  width?: number
  height?: number
  groupIds?: string[]
  customData?: {
    isFromDatabase?: boolean
    databaseId?: string
    elementType?:
      | 'businessCapability'
      | 'application'
      | 'aiComponent'
      | 'dataObject'
      | 'interface'
      | 'infrastructure'
      | 'applicationInterface'
    isMainElement?: boolean
    mainElementId?: string
    sovereigntyMarker?: 'fill' | 'ring'
    [key: string]: any
  }
  [key: string]: any
}

export type SovereigntyStatus = 'RED' | 'YELLOW' | 'GREY' | 'GREEN'

interface SovereigntyMarkerEntry {
  selfStatus: SovereigntyStatus
  downstreamStatus: SovereigntyStatus
}

// Locked UI-SPEC hex values (Color section) — hardcoded, no theme import,
// matching the existing convention for element colors in excalidrawLibraryUtils.ts.
export const SOVEREIGNTY_STATUS_COLORS: Record<SovereigntyStatus, string> = {
  RED: '#D32F2F',
  YELLOW: '#ED6C02',
  GREY: '#9E9E9E',
  GREEN: '#2E7D32',
}

// Worst-known-status precedence for merging marker results across multiple
// BusinessCapability/DataObject roots on the same diagram (mirrors the
// evaluator's "a RED finding anywhere below a node sets the ring" precedence,
// eam-konzept.md §3 / D-05) — used only to reconcile per-root query results,
// never to reclassify anything.
const SOVEREIGNTY_STATUS_RANK: Record<SovereigntyStatus, number> = {
  GREEN: 0,
  GREY: 1,
  YELLOW: 2,
  RED: 3,
}

export const worseStatus = (a: SovereigntyStatus, b: SovereigntyStatus): SovereigntyStatus =>
  SOVEREIGNTY_STATUS_RANK[b] > SOVEREIGNTY_STATUS_RANK[a] ? b : a

// Only BusinessCapability/DataObject elements are valid sovereigntyMarkers
// roots (02-02's rootType contract).
const isMarkerRoot = (element: DiagramElement): boolean =>
  element.customData?.elementType === 'businessCapability' ||
  element.customData?.elementType === 'dataObject'

/**
 * The definitive "no markers possible" signal for a whole diagram: true iff
 * at least one BusinessCapability/DataObject marker root exists among the
 * diagram's database elements — mirrors fetchSovereigntyMarkersForDiagram's
 * own zero-roots early-return exactly. Distinct from a per-node empty sync
 * result (markerByNodeId.size === 0), which may simply mean the backend
 * hasn't resolved that node's marker yet — this helper lets the retry-safe
 * diff-detection in ExcalidrawWrapper.handleChange distinguish "will never
 * have a marker" from "not yet resolved, keep retrying."
 */
export const hasAnyMarkerRoot = (elements: DiagramElement[]): boolean =>
  extractDatabaseElements(elements).some(isMarkerRoot)

/**
 * Fetches sovereigntyMarkers for every BusinessCapability/DataObject root
 * found among the diagram's database elements, merging results across roots
 * (worse status always wins) into a single Map keyed by nodeId. A diagram
 * with no marker root returns an empty Map without issuing any query. A
 * failure fetching one root's markers never blocks the others — fail-closed
 * per root, never throws out of this function.
 */
export const fetchSovereigntyMarkersForDiagram = async (
  apolloClient: any,
  companyId: string,
  databaseElements: DiagramElement[]
): Promise<Map<string, SovereigntyMarkerEntry>> => {
  const result = new Map<string, SovereigntyMarkerEntry>()
  const roots = databaseElements.filter(isMarkerRoot)

  if (roots.length === 0) {
    return result
  }

  const nodes = databaseElements
    .filter(el => el.customData?.databaseId && el.customData?.elementType)
    .map(el => ({ id: el.customData!.databaseId, type: el.customData!.elementType }))
    .slice(0, 500) // mirrors server's sovereigntyMarkerNodesSchema.max(500) cap

  for (const root of roots) {
    if (!root.customData?.databaseId || !root.customData?.elementType) continue

    try {
      const { data } = await apolloClient.query({
        query: GET_SOVEREIGNTY_MARKERS,
        variables: {
          companyId,
          rootType: root.customData.elementType,
          rootId: root.customData.databaseId,
          nodes,
        },
        fetchPolicy: 'network-only',
      })

      const markers: Array<{
        nodeId: string
        selfStatus: SovereigntyStatus
        downstreamStatus: SovereigntyStatus
      }> = data?.sovereigntyMarkers ?? []

      for (const marker of markers) {
        const existing = result.get(marker.nodeId)
        result.set(marker.nodeId, {
          selfStatus: existing
            ? worseStatus(existing.selfStatus, marker.selfStatus)
            : marker.selfStatus,
          downstreamStatus: existing
            ? worseStatus(existing.downstreamStatus, marker.downstreamStatus)
            : marker.downstreamStatus,
        })
      }
    } catch (err) {
      console.warn(
        `sovereigntyMarkers fetch failed for root ${root.customData.elementType}/${root.customData.databaseId}:`,
        err
      )
      continue
    }
  }

  return result
}

/**
 * Creates the two bound ellipse elements (10px fill, 18px ring) for one main
 * database element, positioned concentrically at its top-right corner.
 */
const createMarkerEllipses = (
  mainElement: DiagramElement,
  marker: SovereigntyMarkerEntry
): DiagramElement[] => {
  const x = mainElement.x ?? 0
  const y = mainElement.y ?? 0
  const width = mainElement.width ?? 0

  const fillSize = 10
  const ringSize = 18

  // Anchor both ellipses at the element's top-right corner, concentric, the
  // ring offset 2px further out than the fill.
  const fillX = x + width - fillSize / 2
  const fillY = y - fillSize / 2
  const ringX = fillX - (ringSize - fillSize) / 2
  const ringY = fillY - (ringSize - fillSize) / 2

  const base = {
    angle: 0,
    fillStyle: 'solid' as const,
    roughness: 0,
    opacity: 100,
    groupIds: [mainElement.id],
    frameId: null,
    roundness: null,
    seed: Math.floor(Math.random() * 1000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000000),
    isDeleted: false,
    boundElements: [],
    updated: typeof window !== 'undefined' ? Date.now() : 0,
    link: null,
    locked: true,
  }

  const fillEllipse: DiagramElement = {
    ...base,
    id: generateElementId(),
    type: 'ellipse',
    x: fillX,
    y: fillY,
    width: fillSize,
    height: fillSize,
    strokeColor: 'transparent',
    strokeWidth: 0,
    strokeStyle: 'solid',
    backgroundColor: SOVEREIGNTY_STATUS_COLORS[marker.selfStatus],
    customData: {
      isFromDatabase: true,
      isMainElement: false,
      mainElementId: mainElement.id,
      sovereigntyMarker: 'fill',
    },
  }

  const ringEllipse: DiagramElement = {
    ...base,
    id: generateElementId(),
    type: 'ellipse',
    x: ringX,
    y: ringY,
    width: ringSize,
    height: ringSize,
    strokeColor: SOVEREIGNTY_STATUS_COLORS[marker.downstreamStatus],
    strokeWidth: 3,
    strokeStyle: marker.downstreamStatus === 'YELLOW' ? 'dashed' : 'solid',
    backgroundColor: 'transparent',
    customData: {
      isFromDatabase: true,
      isMainElement: false,
      mainElementId: mainElement.id,
      sovereigntyMarker: 'ring',
    },
  }

  return [fillEllipse, ringEllipse]
}

/**
 * Applies fill/ring marker ellipses to every main database element that has
 * an entry in markerByNodeId. Idempotent: a prior marker pair for the same
 * main element is removed before the new pair is appended, so repeated calls
 * (manual re-sync, reopening the diagram) replace the previous ellipses in
 * place instead of accumulating duplicates — mirrors markMissingElements's
 * "update in place based on current state, never accumulate" pattern. Never
 * reads or writes the main element's own strokeColor/backgroundColor/
 * strokeWidth (UI-SPEC: never overwrite the user's own chosen colors).
 */
export const applySovereigntyMarkers = (
  elements: DiagramElement[],
  markerByNodeId: Map<string, SovereigntyMarkerEntry>
): DiagramElement[] => {
  if (markerByNodeId.size === 0) {
    return elements
  }

  const mainElementIdsToMark = new Set<string>()
  const presentMainElementIds = new Set<string>()
  for (const element of elements) {
    if (!element.customData?.isMainElement || !element.customData?.databaseId) continue
    presentMainElementIds.add(element.id)
    if (markerByNodeId.has(element.customData.databaseId)) {
      mainElementIdsToMark.add(element.id)
    }
  }

  // Drop any prior marker ellipse that is either (a) bound to a main element
  // about to be re-marked below (avoids duplicate accumulation on re-sync),
  // or (b) orphaned because its main element no longer exists on the canvas
  // at all (deleted/removed) — without (b), ellipses for removed elements
  // were left behind forever since nothing else ever targets them for
  // cleanup. A marker whose main element is still present but simply has no
  // fresh entry this round (e.g. a transient per-root fetch failure) is left
  // untouched, matching the existing fail-safe behavior.
  const withoutStaleMarkers = elements.filter(element => {
    const isMarkerEllipse =
      element.customData?.sovereigntyMarker === 'fill' ||
      element.customData?.sovereigntyMarker === 'ring'
    if (!isMarkerEllipse || !element.customData?.mainElementId) return true
    const mainElementId = element.customData.mainElementId
    const isOrphaned = !presentMainElementIds.has(mainElementId)
    return !isOrphaned && !mainElementIdsToMark.has(mainElementId)
  })

  const newMarkerEllipses: DiagramElement[] = []
  for (const element of withoutStaleMarkers) {
    if (!element.customData?.isMainElement || !element.customData?.databaseId) continue
    const marker = markerByNodeId.get(element.customData.databaseId)
    if (!marker) continue
    newMarkerEllipses.push(...createMarkerEllipses(element, marker))
  }

  return [...withoutStaleMarkers, ...newMarkerEllipses]
}

/**
 * Recomputes a main element's fill/ring marker ellipse positions using the
 * exact same top-right-anchor geometry as createMarkerEllipses, and returns
 * mutated copies (same id, updated x/y/version/versionNonce/updated) — or
 * null if the recomputed position is unchanged. Drag-time only (D-02/D-03):
 * createMarkerEllipses/applySovereigntyMarkers remain the sync-time
 * (initial/resync) path and are unaffected by this function.
 */
export const repositionMarkerEllipses = (
  mainElement: DiagramElement,
  fillEllipse: DiagramElement,
  ringEllipse: DiagramElement
): { fillEllipse: DiagramElement; ringEllipse: DiagramElement } | null => {
  const x = mainElement.x ?? 0
  const y = mainElement.y ?? 0
  const width = mainElement.width ?? 0

  const fillSize = 10
  const ringSize = 18

  const fillX = x + width - fillSize / 2
  const fillY = y - fillSize / 2
  const ringX = fillX - (ringSize - fillSize) / 2
  const ringY = fillY - (ringSize - fillSize) / 2

  if (
    fillX === fillEllipse.x &&
    fillY === fillEllipse.y &&
    ringX === ringEllipse.x &&
    ringY === ringEllipse.y
  ) {
    return null
  }

  return {
    fillEllipse: {
      ...fillEllipse,
      x: fillX,
      y: fillY,
      version: (fillEllipse.version ?? 1) + 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      updated: Date.now(),
    },
    ringEllipse: {
      ...ringEllipse,
      x: ringX,
      y: ringY,
      version: (ringEllipse.version ?? 1) + 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      updated: Date.now(),
    },
  }
}

/**
 * Scans elements once for main database elements that currently carry a
 * complete fill+ring marker pair (D-04 — elements without a full existing
 * pair are skipped entirely, no partial-pair handling) and repositions each
 * pair in place via repositionMarkerEllipses. Returns the original elements
 * reference with changed: false when nothing needed repositioning (the
 * common no-markers-on-this-diagram case incurs no extra array allocation,
 * per D-04's perf requirement), or a new array with the repositioned pairs
 * substituted in place (matched by id; every other element, including the
 * main element itself, is left untouched) otherwise.
 */
export const repositionAllMarkerEllipses = (
  elements: DiagramElement[]
): { elements: DiagramElement[]; changed: boolean } => {
  const markersByMainId = new Map<string, { fill?: DiagramElement; ring?: DiagramElement }>()

  for (const element of elements) {
    const markerType = element.customData?.sovereigntyMarker
    const mainElementId = element.customData?.mainElementId
    if ((markerType !== 'fill' && markerType !== 'ring') || !mainElementId) continue

    const entry = markersByMainId.get(mainElementId) ?? {}
    if (markerType === 'fill') {
      entry.fill = element
    } else {
      entry.ring = element
    }
    markersByMainId.set(mainElementId, entry)
  }

  const repositionedById = new Map<string, DiagramElement>()

  for (const element of elements) {
    if (!element.customData?.isMainElement || !element.customData?.databaseId) continue
    const pair = markersByMainId.get(element.id)
    if (!pair?.fill || !pair?.ring) continue

    const repositioned = repositionMarkerEllipses(element, pair.fill, pair.ring)
    if (!repositioned) continue

    repositionedById.set(repositioned.fillEllipse.id, repositioned.fillEllipse)
    repositionedById.set(repositioned.ringEllipse.id, repositioned.ringEllipse)
  }

  if (repositionedById.size === 0) {
    return { elements, changed: false }
  }

  const newElements = elements.map(element => repositionedById.get(element.id) ?? element)
  return { elements: newElements, changed: true }
}

/**
 * Live/incremental, isDeleted-aware orphan-marker cleanup for the
 * onChange-reactive path (D-01/D-03). Unlike applySovereigntyMarkers's
 * sync-time (initial/manual-resync) orphan detection, which array-filters
 * stale markers out and never checks element.isDeleted, this helper must
 * correctly treat a natively-keyboard-deleted main element (Excalidraw
 * tombstones via isDeleted: true, never physically removes it from the
 * elements array) as no longer "present" — otherwise its markers are never
 * flagged as orphaned. Marker cleanup here also tombstones (isDeleted: true)
 * rather than array-filters, keeping the marker's deleted representation
 * consistent with how Excalidraw's own change/undo tracking expects deleted
 * elements to be represented, so it participates correctly in the following
 * captureUpdate/history entry.
 *
 * applySovereigntyMarkers itself remains unmodified and is the sync-time
 * full-rebuild path only; this function is additive and used exclusively by
 * the live onChange cleanup wired into ExcalidrawWrapper.handleChange.
 *
 * Returns { elements, changed: false } (same array reference) when no marker
 * is orphaned. A marker whose main element is present and not deleted is
 * returned completely untouched (same object reference) even when
 * changed: true overall.
 */
export const removeOrphanedMarkersLive = (
  elements: DiagramElement[]
): { elements: DiagramElement[]; changed: boolean } => {
  const presentMainElementIds = new Set<string>()
  for (const element of elements) {
    if (element.isDeleted) continue
    if (element.customData?.isMainElement && element.customData?.databaseId) {
      presentMainElementIds.add(element.id)
    }
  }

  let changed = false
  const newElements = elements.map(element => {
    const isMarker =
      element.customData?.sovereigntyMarker === 'fill' ||
      element.customData?.sovereigntyMarker === 'ring'
    if (!isMarker || element.isDeleted || !element.customData?.mainElementId) return element
    if (presentMainElementIds.has(element.customData.mainElementId)) return element

    changed = true
    return {
      ...element,
      isDeleted: true,
      version: (element.version ?? 1) + 1,
      versionNonce: Math.floor(Math.random() * 1000000000),
      updated: Date.now(),
    }
  })

  return changed ? { elements: newElements, changed: true } : { elements, changed: false }
}

/**
 * The single D-09 gate: no sovereigntyMarkers query is ever issued unless the
 * feature flag is enabled and a company is selected.
 */
export const syncSovereigntyMarkers = async (
  apolloClient: any,
  elements: DiagramElement[],
  options: { enabled: boolean; companyId: string | null }
): Promise<DiagramElement[]> => {
  if (!options.enabled || !options.companyId) {
    return elements
  }

  const databaseElements = extractDatabaseElements(elements)
  const markerByNodeId = await fetchSovereigntyMarkersForDiagram(
    apolloClient,
    options.companyId,
    databaseElements
  )

  if (markerByNodeId.size === 0) {
    return elements
  }

  return applySovereigntyMarkers(elements, markerByNodeId)
}
