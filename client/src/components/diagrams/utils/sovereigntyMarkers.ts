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
    locked: false,
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
  for (const element of elements) {
    if (
      element.customData?.isMainElement &&
      element.customData?.databaseId &&
      markerByNodeId.has(element.customData.databaseId)
    ) {
      mainElementIdsToMark.add(element.id)
    }
  }

  // Drop any prior marker ellipses bound to a main element that is about to
  // be re-marked below, so re-syncing replaces rather than accumulates.
  const withoutStaleMarkers = elements.filter(element => {
    const isMarkerEllipse =
      element.customData?.sovereigntyMarker === 'fill' ||
      element.customData?.sovereigntyMarker === 'ring'
    if (!isMarkerEllipse || !element.customData?.mainElementId) return true
    return !mainElementIdsToMark.has(element.customData.mainElementId)
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
