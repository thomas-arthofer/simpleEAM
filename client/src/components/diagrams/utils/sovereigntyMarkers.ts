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

// Only BusinessCapability/DataObject elements are valid sovereigntyMarkers
// roots (02-02's rootType contract).
const isMarkerRoot = (element: DiagramElement): boolean =>
  element.customData?.elementType === 'businessCapability' ||
  element.customData?.elementType === 'dataObject'

/**
 * Fetches sovereigntyMarkers for every BusinessCapability/DataObject root
 * found among the diagram's database elements, folding all returned markers
 * into a single Map keyed by nodeId. A diagram with no marker root returns an
 * empty Map without issuing any query.
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

  for (const root of roots) {
    if (!root.customData?.databaseId || !root.customData?.elementType) continue

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
      result.set(marker.nodeId, {
        selfStatus: marker.selfStatus,
        downstreamStatus: marker.downstreamStatus,
      })
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
 * an entry in markerByNodeId. Never reads or writes the main element's own
 * strokeColor/backgroundColor/strokeWidth (UI-SPEC: never overwrite the
 * user's own chosen colors).
 */
export const applySovereigntyMarkers = (
  elements: DiagramElement[],
  markerByNodeId: Map<string, SovereigntyMarkerEntry>
): DiagramElement[] => {
  if (markerByNodeId.size === 0) {
    return elements
  }

  const newMarkerEllipses: DiagramElement[] = []
  for (const element of elements) {
    if (!element.customData?.isMainElement || !element.customData?.databaseId) continue
    const marker = markerByNodeId.get(element.customData.databaseId)
    if (!marker) continue
    newMarkerEllipses.push(...createMarkerEllipses(element, marker))
  }

  return [...elements, ...newMarkerEllipses]
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
