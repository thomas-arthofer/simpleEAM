import type { ElementType } from '@/graphql/library'
import { InfrastructureType } from '@/gql/generated'
import { getInfrastructureTypeLabel } from '@/components/infrastructure/utils'
import { generateElementId, generateSeed, getNextIndex } from './elementIdManager'
import type { ExcalidrawElement, ElementCustomizations } from './capabilityMapTypes'

// Re-export ElementType for external use
export type { ElementType }

// ============================================================================
// Font Utilities
// ============================================================================

// CRITICAL: This must match Excalidraw's BOUND_TEXT_PADDING constant
// See: excalidraw/packages/excalidraw/constants.ts
const BOUND_TEXT_PADDING = 5

// Safety margin to account for font rendering variations between measurement and actual rendering
// Canvas measureText may give slightly different results than actual font rendering
const MEASUREMENT_SAFETY_MARGIN = 0.95 // Use 95% of available width to ensure no clipping

// ============================================================================
// Icon Width Cache
// ============================================================================

/**
 * Cache for icon widths by element type.
 * Calculated once during library initialization to optimize performance.
 */
const iconWidthCache = new Map<ElementType, number>()

/**
 * Calculates the width of the icon area for a given element type by examining
 * the template's non-text, non-container elements (shapes that form the icon).
 */
function calculateIconWidth(templateElements: any[]): number {
  // Find the main container (rectangle)
  const container = templateElements.find(
    el => el.type === 'rectangle' && el.boundElements?.some((b: any) => b.type === 'text')
  )

  if (!container) {
    return 0
  }

  const containerRight = container.x + container.width

  // Find all non-text, non-container elements (these form the icon)
  const iconElements = templateElements.filter(
    el =>
      el.type !== 'text' &&
      el.id !== container.id &&
      !el.boundElements?.some((b: any) => b.type === 'text')
  )

  if (iconElements.length === 0) {
    return 0
  }

  // Find the leftmost x position of icon elements
  const iconLeftmost = Math.min(
    ...iconElements.map(el => {
      if (el.type === 'freedraw') {
        // For freedraw, x is the starting point
        return el.x
      }
      return el.x
    })
  )

  // Icon width is the space from leftmost icon element to container right edge
  const iconWidth = containerRight - iconLeftmost

  return iconWidth
}

/**
 * Initializes the icon width cache for all templates in the library.
 * Should be called once when the library is loaded.
 */
export function initializeIconWidthCache(library: ArchiMateLibrary | null): void {
  if (!library?.libraryItems?.length) return

  iconWidthCache.clear()

  // Process each element type
  for (const [elementType, templateName] of Object.entries(TEMPLATE_NAME_BY_TYPE)) {
    const template = findArchimateTemplate(library, templateName)
    if (template?.elements) {
      const iconWidth = calculateIconWidth(template.elements)
      iconWidthCache.set(elementType as ElementType, iconWidth)
    }
  }
}

/**
 * Gets the cached icon width for an element type.
 * Returns 0 if not found in cache.
 */
function getIconWidth(elementType: ElementType): number {
  const width = iconWidthCache.get(elementType) ?? 0
  return width
}

const FONT_FAMILY_MAP: Record<number, string> = {
  1: 'Virgil',
  2: 'Helvetica',
  3: 'Cascadia',
  5: 'Excalifont',
  6: 'Nunito',
  7: 'Lilita One',
  8: 'Comic Shanns',
  9: 'Liberation Sans',
}

/**
 * Converts font family ID to CSS font string with fallbacks.
 * Must match Excalidraw's getFontFamilyString behavior.
 */
function getFontFamilyString(fontFamily: number): string {
  const baseFontName = FONT_FAMILY_MAP[fontFamily] || 'Excalifont'

  // Add fallbacks matching Excalidraw's logic
  // Excalifont gets CJK + Emoji fallbacks, others just get Emoji
  if (fontFamily === 5) {
    // Excalifont
    return `${baseFontName}, Xiaolai, Segoe UI Emoji`
  }

  return `${baseFontName}, Segoe UI Emoji`
}

/**
 * Measures the height of wrapped text (multiple lines)
 */
function measureWrappedTextHeight(text: string, fontSize: number): number {
  const lineHeight = 1.25 // Excalidraw's default line height
  const lines = text.split('\n')
  return lines.length * fontSize * lineHeight
}

// ============================================================================
// Library Types and Constants
// ============================================================================

export interface ExcalidrawLibraryItem {
  id: string
  status?: 'unpublished' | 'published'
  name?: string
  elements: any[]
  [key: string]: any
}

export const TEMPLATE_NAME_BY_TYPE: Partial<Record<ElementType, string>> = {
  businessCapability: 'Capability',
  businessProcess: 'Business Process',
  application: 'Application Component',
  dataObject: 'Data Object',
  applicationInterface: 'Application Interface',
  infrastructure: 'Infrastructure',
  aiComponent: 'AI Component',
}

export const EXCALIDRAW_LIBRARY_MIME = 'application/vnd.excalidrawlib+json'
const EXCALIDRAW_SOURCE = 'nextgen-eam'

export function buildLibraryDropPayload(libraryItem: ExcalidrawLibraryItem) {
  return JSON.stringify({
    type: 'excalidrawlib',
    version: 2,
    source: EXCALIDRAW_SOURCE,
    libraryItems: [libraryItem],
  })
}

export function normalizeTemplateFonts(
  library: ArchiMateLibrary,
  targetFontFamily: number
): ArchiMateLibrary {
  return {
    ...library,
    libraryItems: library.libraryItems.map(item => {
      if (!Array.isArray(item.elements)) {
        return item
      }
      const patchedElements = item.elements.map(element => {
        if (element?.type === 'text' && element.fontFamily !== targetFontFamily) {
          return {
            ...element,
            fontFamily: targetFontFamily,
          }
        }
        return element
      })
      return {
        ...item,
        elements: patchedElements,
      }
    }),
  }
}

const DEFAULT_FONT_SIZE = 20

/**
 * Wraps text using proper font measurement.
 * This ensures accurate wrapping for any font family.
 *
 * NOTE: line-wrapping is intentionally disabled — labels are never split
 * into multiple `\n`-joined lines by this codebase's own logic.
 */
function wrapTextForExcalidraw(
  text: string,
  _maxWidth: number,
  _fontSize: number,
  _fontFamily: number
): string {
  if (!text || text.trim() === '') {
    return text
  }

  return text.trim()
}

/**
 * Builds the diagram display name for an element, prefixing Infrastructure
 * elements with their Infrastructure Type label (e.g. "Virtual Machine - SRLX0018").
 */
export function getInfrastructureDisplayName(
  name: string,
  elementType: string,
  infrastructureType?: string | null
): string {
  if (elementType === 'infrastructure' && infrastructureType) {
    return `${getInfrastructureTypeLabel(infrastructureType as InfrastructureType)} - ${name}`
  }
  return name
}

// All possible InfrastructureType label prefixes, precomputed once so the strip
// helper stays O(1) w.r.t. enum size and doesn't rebuild the list per element.
const INFRASTRUCTURE_TYPE_PREFIXES: readonly string[] = Object.values(InfrastructureType)
  .map(t => `${getInfrastructureTypeLabel(t)} - `)
  // Longest first so e.g. "On-Premise-Rechenzentrum - " is tried before a
  // shorter label that could accidentally match its head.
  .sort((a, b) => b.length - a.length)

/**
 * Strips a known Infrastructure Type label prefix (as produced by
 * `getInfrastructureDisplayName`) from `name`. Used on the save path so the
 * database `Infrastructure.name` never gets the diagram-only prefix persisted.
 * Returns `name` unchanged if no known prefix matches.
 */
export function stripInfrastructureTypePrefix(name: string): string {
  if (!name) return name
  for (const prefix of INFRASTRUCTURE_TYPE_PREFIXES) {
    if (name.startsWith(prefix)) {
      return name.slice(prefix.length)
    }
  }
  return name
}

// ============================================================================
// ArchiMate Library Types and Functions
// ============================================================================

export interface ArchiMateLibrary {
  libraryItems: ExcalidrawLibraryItem[]
  [key: string]: any
}

/**
 * Loads the ArchiMate library from the public directory.
 * Initializes the icon width cache for all templates.
 */
export async function loadArchimateLibrary(): Promise<ArchiMateLibrary | null> {
  try {
    const response = await fetch('/libraries/archimate-symbols.excalidrawlib')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const library = (await response.json()) as ArchiMateLibrary

    // Initialize icon width cache for all templates
    initializeIconWidthCache(library)

    return library
  } catch (error) {
    console.warn('Failed to load ArchiMate library:', error)
    return null
  }
}

/**
 * Finds an ArchiMate template by name with fallback strategies.
 */
export function findArchimateTemplate(
  library: ArchiMateLibrary | null,
  templateName: string
): ExcalidrawLibraryItem | null {
  if (!library?.libraryItems?.length) {
    return null
  }

  // Try to find by name property
  let item = library.libraryItems.find(libItem => libItem.name === templateName) ?? null

  // Try to find by text content
  if (!item) {
    item =
      library.libraryItems.find(libItem =>
        libItem.elements?.some(
          (element: any) => element.type === 'text' && element.text?.includes(templateName)
        )
      ) ?? null
  }

  // Try alternative names
  if (!item) {
    const alternatives: Record<string, string[]> = {
      Capability: ['Business Function', 'Business Capability', 'Business'],
      'Application Component': [
        'Application',
        'App Component',
        'ApplicationComponent',
        'App',
        'Software Component',
        'System Component',
      ],
      'Data Object': ['Business Object', 'Data', 'Object'],
      'Application Interface': ['Interface', 'API'],
      Infrastructure: [
        'Infrastruktur',
        'Server',
        'Device',
        'Technology Node',
        'System Software',
        'Node',
      ],
      'AI Component': ['AI', 'Artificial Intelligence', 'ML Component'],
    }

    const alts = alternatives[templateName] || []
    for (const alt of alts) {
      item = library.libraryItems.find(libItem => libItem.name === alt) ?? null
      if (item) break

      item =
        library.libraryItems.find(libItem =>
          libItem.elements?.some(
            (element: any) => element.type === 'text' && element.text?.includes(alt)
          )
        ) ?? null
      if (item) break
    }
  }

  // Fallback to first rectangular item
  if (!item) {
    item =
      library.libraryItems.find(libItem =>
        libItem.elements?.some((element: any) => element.type === 'rectangle')
      ) ?? null
  }

  return item
}

export type ArchitectureElementVerticalAlign = 'top' | 'middle'

interface ArchitectureElementMetadata {
  elementType: ElementType
  referenceId: string
  referenceType: ElementType
  referenceName: string
  verticalAlign: ArchitectureElementVerticalAlign
}

export interface CreateLibraryItemFromDatabaseElementParams<
  T extends { id: string; name: string },
> {
  template: ExcalidrawLibraryItem | null
  element: T
  elementType: ElementType
  defaultFontFamily: number
  verticalAlign?: ArchitectureElementVerticalAlign
}

export function createLibraryItemFromDatabaseElement<T extends { id: string; name: string }>(
  params: CreateLibraryItemFromDatabaseElementParams<T>
): ExcalidrawLibraryItem | null {
  const { template, element, elementType, defaultFontFamily, verticalAlign = 'middle' } = params
  const referenceName = getInfrastructureDisplayName(
    element.name,
    elementType,
    (element as any).infrastructureType
  )
  if (!template?.elements?.length) {
    return null
  }

  const idMapping = new Map<string, string>()
  template.elements.forEach(templateElement => {
    idMapping.set(templateElement.id, generateElementId())
  })

  const groupIdMapping = new Map<string, string>()
  template.elements.forEach(templateElement => {
    templateElement.groupIds?.forEach((groupId: string) => {
      if (!groupIdMapping.has(groupId)) {
        groupIdMapping.set(groupId, generateElementId())
      }
    })
  })

  const templateById = new Map(template.elements.map(el => [el.id, el]))
  const cloneByOriginalId = new Map<string, any>()

  const clonedElements = template.elements.map(original => {
    const clone = deepClone(original)
    clone.id = idMapping.get(original.id) ?? generateElementId()
    if (Array.isArray(original.groupIds)) {
      clone.groupIds = original.groupIds.map(
        (groupId: string) => groupIdMapping.get(groupId) ?? groupId
      )
    }
    if (Array.isArray(original.boundElements)) {
      clone.boundElements = original.boundElements.map((bound: { id: string; type: string }) => ({
        ...bound,
        id: idMapping.get(bound.id) ?? bound.id,
      }))
    }
    if (original.containerId) {
      clone.containerId = idMapping.get(original.containerId) ?? original.containerId
    }
    cloneByOriginalId.set(original.id, clone)
    return clone
  })

  const metadata: ArchitectureElementMetadata = {
    elementType,
    referenceId: element.id,
    referenceType: elementType,
    referenceName,
    verticalAlign,
  }

  applyMetadataToContainers(template.elements, cloneByOriginalId, templateById, metadata)
  applyMetadataToTexts({
    templateElements: template.elements,
    cloneByOriginalId,
    metadata,
    defaultFontFamily,
  })
  markRemainingShapes(cloneByOriginalId)

  return {
    id: `db-${elementType}-${element.id}`,
    status: 'published',
    name: referenceName,
    elements: clonedElements,
  }
}

function applyMetadataToContainers(
  templateElements: any[],
  cloneByOriginalId: Map<string, any>,
  templateById: Map<string, any>,
  metadata: ArchitectureElementMetadata
) {
  const candidates = templateElements.filter(element => isContainerRectangle(element, templateById))

  const targetRectangles = candidates.length
    ? candidates
    : templateElements.filter(element => element.type === 'rectangle')

  // Mark the first rectangle as the main element
  let isFirst = true
  targetRectangles.forEach(rectangle => {
    const clone = cloneByOriginalId.get(rectangle.id)
    if (!clone) {
      return
    }
    clone.strokeColor = '#1e1e1e'

    if (isFirst) {
      // Main container gets full metadata (old format for compatibility)
      clone.customData = {
        isFromDatabase: true,
        databaseId: metadata.referenceId,
        elementType: metadata.elementType,
        elementName: metadata.referenceName,
        isMainElement: true,
      }
      isFirst = false
    } else {
      // Other elements just reference the main element
      clone.customData = {
        isFromDatabase: true,
        isMainElement: false,
      }
    }
  })
}

function applyMetadataToTexts({
  templateElements,
  cloneByOriginalId,
  metadata,
  defaultFontFamily,
}: {
  templateElements: any[]
  cloneByOriginalId: Map<string, any>
  metadata: ArchitectureElementMetadata
  defaultFontFamily: number
}) {
  templateElements.forEach(original => {
    if (original.type !== 'text') {
      return
    }

    const clone = cloneByOriginalId.get(original.id)
    if (!clone) {
      return
    }

    const templateContainer = findContainerForText(templateElements, original.id)
    const containerClone = templateContainer
      ? cloneByOriginalId.get(templateContainer.id)
      : undefined

    const fontSize = clone.fontSize ?? DEFAULT_FONT_SIZE
    const containerWidth = containerClone ? containerClone.width : (clone.width ?? 180)

    // Get icon width for this element type
    const iconWidth = getIconWidth(metadata.elementType)

    // Calculate available width for text based on alignment
    let availableWidth: number
    let textWidth: number

    if (metadata.verticalAlign === 'top' && iconWidth > 0) {
      // For top-aligned text, reduce width by icon width to avoid overlap
      // CRITICAL: Must match Excalidraw's getBoundTextMaxWidth calculation
      // For rectangles: width - BOUND_TEXT_PADDING * 2 - iconWidth
      availableWidth =
        (containerWidth - BOUND_TEXT_PADDING * 2 - iconWidth) * MEASUREMENT_SAFETY_MARGIN
      textWidth = containerWidth - BOUND_TEXT_PADDING * 2 - iconWidth
    } else {
      // For middle-aligned text (or top without icon), use full width with padding
      // Icon is above the text, so it doesn't reduce available width
      // CRITICAL: Must match Excalidraw's getBoundTextMaxWidth calculation
      // For rectangles: width - BOUND_TEXT_PADDING * 2
      availableWidth = (containerWidth - BOUND_TEXT_PADDING * 2) * MEASUREMENT_SAFETY_MARGIN
      textWidth = containerWidth - BOUND_TEXT_PADDING * 2
    }

    const wrappedText = wrapTextForExcalidraw(
      metadata.referenceName ?? '',
      availableWidth,
      fontSize,
      defaultFontFamily
    )

    // Excalidraw expects pre-wrapped text in both text and originalText
    clone.text = wrappedText
    clone.rawText = wrappedText
    clone.originalText = wrappedText
    clone.fontFamily = defaultFontFamily
    clone.textAlign = clone.textAlign || 'center'
    clone.verticalAlign = metadata.verticalAlign

    if (containerClone) {
      // For bound text, width should be based on container, not on measured text
      // This matches Excalidraw's getBoundTextMaxWidth calculation
      const textHeight = measureWrappedTextHeight(wrappedText, fontSize)

      // Center the text within the container
      const containerCenterY = containerClone.y + containerClone.height / 2

      if (metadata.verticalAlign === 'top' && iconWidth > 0) {
        // For top-aligned text with icon, center the text in the available space
        // Available space is from left edge to start of icon area, with 4px padding on each side
        const availableSpace = containerWidth - iconWidth - 8 // 4px padding on left and right
        const availableSpaceCenterX = containerClone.x + 4 + availableSpace / 2 // Start after left padding
        clone.x = availableSpaceCenterX - textWidth / 2
        clone.y = containerClone.y + 10
      } else if (metadata.verticalAlign === 'top') {
        // For top-aligned text without icon, center it in full width with 4px padding on each side
        const containerCenterX = containerClone.x + containerClone.width / 2
        clone.x = containerCenterX - textWidth / 2
        clone.y = containerClone.y + 10
      } else {
        // For middle-aligned text, center it in full width
        // Icon is above the text, so positioning uses full width
        const containerCenterX = containerClone.x + containerClone.width / 2
        clone.x = containerCenterX - textWidth / 2
        clone.y = containerCenterY - textHeight / 2
      }
      clone.width = textWidth
      clone.height = textHeight
      clone.baseline = clone.y + clone.height
      clone.containerId = containerClone.id
    }

    // Text elements just reference that they're from database
    clone.customData = {
      isFromDatabase: true,
      isMainElement: false,
    }
  })
}

function markRemainingShapes(cloneByOriginalId: Map<string, any>) {
  cloneByOriginalId.forEach(clone => {
    if (clone.customData) {
      return // Already has customData
    }
    // Icon elements just reference that they're from database
    clone.customData = {
      isFromDatabase: true,
      isMainElement: false,
    }
  })
}

function isContainerRectangle(element: any, templateById: Map<string, any>) {
  if (element.type !== 'rectangle' || !Array.isArray(element.boundElements)) {
    return false
  }
  return element.boundElements.some((bound: any) => templateById.get(bound.id)?.type === 'text')
}

function findContainerForText(templateElements: any[], textId: string) {
  return templateElements.find(
    element =>
      element.type === 'rectangle' &&
      element.boundElements?.some((bound: { id: string }) => bound.id === textId)
  )
}

function deepClone(element: any) {
  return JSON.parse(JSON.stringify(element))
}

// ============================================================================
// Canvas Element Operations - Abstraction Layer
// ============================================================================

export interface CreateCanvasElementParams<T extends { id: string; name: string }> {
  template: ExcalidrawLibraryItem | { elements: any[] } | null
  element: T
  elementType: ElementType
  targetX: number
  targetY: number
  groupId?: string
  customizations?: ElementCustomizations
  defaultFontFamily?: number
}

export interface UpdateCanvasElementParams {
  element: ExcalidrawElement
  newName?: string
  newPosition?: { x: number; y: number }
  newDimensions?: { width: number; height: number }
  newBackgroundColor?: string
  customizations?: ElementCustomizations
}

export interface PositionCanvasElementParams {
  elements: ExcalidrawElement[]
  targetX: number
  targetY: number
}

/**
 * Creates positioned canvas elements from a template and database element.
 * This is the primary function for creating elements on the diagram canvas.
 */
export function createCanvasElementsFromTemplate<T extends { id: string; name: string }>(
  params: CreateCanvasElementParams<T>
): ExcalidrawElement[] {
  const {
    template,
    element,
    elementType,
    targetX,
    targetY,
    groupId,
    customizations,
    defaultFontFamily = 5,
  } = params

  const referenceName = getInfrastructureDisplayName(
    element.name,
    elementType,
    (element as any).infrastructureType
  )

  if (!template?.elements?.length) {
    console.warn(`No template found for element type: ${elementType}`)
    return []
  }

  // Create ID mappings to maintain relationships
  const idMapping = new Map<string, string>()
  template.elements.forEach((templateElement: any) => {
    idMapping.set(templateElement.id, generateElementId())
  })

  // Generate new group IDs while preserving grouping relationships
  const groupIdMapping = new Map<string, string>()
  template.elements.forEach((templateElement: any) => {
    if (templateElement.groupIds && templateElement.groupIds.length > 0) {
      templateElement.groupIds.forEach((gId: string) => {
        if (!groupIdMapping.has(gId)) {
          groupIdMapping.set(gId, generateElementId())
        }
      })
    }
  })

  // Calculate template bounding box for positioning
  const templateBounds = calculateTemplateBounds(template.elements)
  const offsetX = targetX - templateBounds.minX
  const offsetY = targetY - templateBounds.minY

  // Clone and transform elements
  const clonedElements = template.elements.map((original: any) => {
    const clone = deepClone(original)
    clone.id = idMapping.get(original.id) ?? generateElementId()

    // Apply position offset
    clone.x = original.x + offsetX
    clone.y = original.y + offsetY

    // Map group IDs
    if (Array.isArray(original.groupIds)) {
      clone.groupIds = original.groupIds.map(
        (gId: string) => groupIdMapping.get(gId) ?? generateElementId()
      )
    } else {
      clone.groupIds = []
    }

    // Add parent group if specified
    if (groupId) {
      clone.groupIds = [...clone.groupIds, groupId]
    }

    // Map bound elements
    if (Array.isArray(original.boundElements)) {
      clone.boundElements = original.boundElements.map((bound: any) => ({
        ...bound,
        id: idMapping.get(bound.id) ?? bound.id,
      }))
    }

    // Map container ID
    if (original.containerId) {
      clone.containerId = idMapping.get(original.containerId) ?? original.containerId
    }

    // Update metadata
    clone.index = getNextIndex()
    clone.seed = generateSeed()
    clone.version = 1
    clone.versionNonce = generateSeed()
    clone.updated = Date.now()

    return clone
  })

  // Apply element-specific transformations
  const templateById = new Map(template.elements.map((el: any) => [el.id, el]))
  const cloneById = new Map(clonedElements.map(el => [el.id, el]))

  // Apply metadata and customizations to containers
  applyContainerCustomizations(
    template.elements,
    clonedElements,
    templateById,
    cloneById,
    idMapping,
    {
      elementType,
      referenceId: element.id,
      referenceName,
      customizations,
    }
  )

  // Reposition all non-text elements (icons, images, etc.) if container width changed
  if (customizations?.width !== undefined) {
    const mainContainerOriginal = template.elements.find(
      (el: any, idx: number) =>
        el.type === 'rectangle' &&
        ((el.boundElements && el.boundElements.length > 0) ||
          (el.width > 100 && el.height > 50) ||
          idx === 0)
    )

    const mainContainerClone = clonedElements.find(
      (clone: any) => clone.customData?.isMainElement === true
    )

    if (mainContainerOriginal && mainContainerClone) {
      clonedElements.forEach((clone: any, index: number) => {
        const original = template.elements[index]
        // Reposition all non-text, non-main-container elements
        if (original.type !== 'text' && clone !== mainContainerClone) {
          repositionIconElement(
            original,
            clone,
            mainContainerOriginal,
            mainContainerClone,
            customizations.width!
          )
        }
      })
    }
  }

  // Apply text customizations
  applyTextCustomizations(template.elements, clonedElements, templateById, cloneById, idMapping, {
    referenceName,
    customizations,
    defaultFontFamily,
    elementType,
  })

  // Mark remaining elements (icons, etc.)
  clonedElements.forEach(clone => {
    if (!clone.customData) {
      clone.customData = {
        isFromDatabase: true,
        isMainElement: false,
      }
    }
  })

  // Validate text-container relationships
  validateTextContainerBindings(clonedElements)

  return clonedElements
}

/**
 * Updates an existing canvas element's properties.
 */
export function updateCanvasElement(params: UpdateCanvasElementParams): ExcalidrawElement {
  const { element, newName, newPosition, newDimensions, newBackgroundColor } = params

  const updatedElement = { ...element }

  // Update position
  if (newPosition) {
    updatedElement.x = newPosition.x
    updatedElement.y = newPosition.y
  }

  // Update dimensions
  if (newDimensions) {
    updatedElement.width = newDimensions.width
    updatedElement.height = newDimensions.height
  }

  // Update background color
  if (newBackgroundColor) {
    updatedElement.backgroundColor = newBackgroundColor
  }

  // Update text content
  if (newName && element.type === 'text') {
    // CRITICAL: Excalidraw wraps originalText automatically based on container
    updatedElement.text = newName // Unwrapped
    if ('rawText' in updatedElement) {
      updatedElement.rawText = newName
    }
    if ('originalText' in updatedElement) {
      updatedElement.originalText = newName // Unwrapped - Excalidraw will wrap this
    }
  }

  // Update metadata
  updatedElement.version = (element.version ?? 1) + 1
  updatedElement.versionNonce = generateSeed()
  updatedElement.updated = Date.now()

  return updatedElement
}

/**
 * Updates the name of a database-linked element by updating its bound text element.
 * This function properly wraps the text using the abstraction layer to ensure
 * consistent padding and icon spacing.
 *
 * @param containerElement - The main container element (rectangle with customData)
 * @param newName - The new name to apply
 * @param allElements - All elements in the diagram (needed to find the text element)
 * @param defaultFontFamily - Optional font family (defaults to 5 = Excalifont)
 * @returns Updated text element, or null if not found
 */
export function updateCanvasElementName(
  containerElement: ExcalidrawElement,
  newName: string,
  allElements: ExcalidrawElement[],
  defaultFontFamily: number = 5
): ExcalidrawElement | null {
  // Get element type to determine correct styling
  const elementType = containerElement.customData?.elementType as ElementType | undefined
  if (!elementType) {
    console.warn('updateCanvasElementName: Element type not found in customData')
    return null
  }

  // Find the linked text element using the same multi-strategy approach
  const textElement = allElements.find(
    el =>
      el.type === 'text' &&
      el.containerId === containerElement.id &&
      containerElement.boundElements?.some(bound => bound.id === el.id)
  )

  if (!textElement || textElement.type !== 'text') {
    console.warn(
      'updateCanvasElementName: Text element not found for container',
      containerElement.id
    )
    return null
  }

  // Get icon width and container dimensions
  const iconWidth = getIconWidth(elementType)
  const containerWidth = containerElement.width || 0
  const fontSize = textElement.fontSize || 20

  // Determine vertical alignment based on element type
  // Business capabilities use top alignment, others use middle
  const verticalAlign =
    elementType === 'businessCapability' ? 'top' : textElement.verticalAlign || 'middle'
  const useTopCenteredText = verticalAlign === 'top'

  // Calculate available width with proper padding (4px on each side = 8px total)
  // CRITICAL: Must match Excalidraw's getBoundTextMaxWidth calculation
  let availableWidth: number
  if (useTopCenteredText && iconWidth > 0) {
    availableWidth =
      (containerWidth - BOUND_TEXT_PADDING * 2 - iconWidth) * MEASUREMENT_SAFETY_MARGIN
  } else {
    // For middle-aligned text (or top without icon), use full width
    // Icon is above the text, so it doesn't reduce available width
    availableWidth = (containerWidth - BOUND_TEXT_PADDING * 2) * MEASUREMENT_SAFETY_MARGIN
  }

  // Wrap text using the abstraction layer
  // Use the existing font family from the text element, fall back to defaultFontFamily if not set
  const fontFamily = textElement.fontFamily || defaultFontFamily
  const wrappedText = wrapTextForExcalidraw(newName, availableWidth, fontSize, fontFamily)

  // Calculate text width (should match container width minus padding)
  let textWidth: number
  if (useTopCenteredText && iconWidth > 0) {
    textWidth = containerWidth - BOUND_TEXT_PADDING * 2 - iconWidth
  } else {
    // For middle-aligned text (or top without icon), use full width
    // Icon is above the text, so it doesn't reduce text width
    textWidth = containerWidth - BOUND_TEXT_PADDING * 2
  }

  const textHeight = measureWrappedTextHeight(wrappedText, fontSize)

  // Calculate text position
  const containerCenterX = containerElement.x + containerElement.width / 2
  const containerCenterY = containerElement.y + containerElement.height / 2

  let textX: number
  let textY: number

  if (useTopCenteredText && iconWidth > 0) {
    // For top-aligned text with icon, center in available space
    const availableSpace = containerWidth - BOUND_TEXT_PADDING * 2 - iconWidth
    const availableSpaceCenterX = containerElement.x + BOUND_TEXT_PADDING + availableSpace / 2
    textX = availableSpaceCenterX - textWidth / 2
    textY = containerElement.y + 10
  } else if (useTopCenteredText) {
    // For top-aligned text without icon, center in full width
    textX = containerCenterX - textWidth / 2
    textY = containerElement.y + 10
  } else {
    // For middle-aligned text, center vertically and horizontally
    textX = containerCenterX - textWidth / 2
    textY = containerCenterY - textHeight / 2
  }

  // Return updated text element with all properties
  return {
    ...textElement,
    text: wrappedText,
    rawText: wrappedText,
    originalText: wrappedText,
    fontSize: fontSize,
    fontFamily: fontFamily, // Preserve the existing font family
    textAlign: textElement.textAlign || 'center',
    verticalAlign: useTopCenteredText ? 'top' : textElement.verticalAlign || 'middle',
    width: textWidth,
    height: textHeight,
    x: textX,
    y: textY,
    baseline: textY + textHeight,
    containerId: containerElement.id,
    version: (textElement.version ?? 1) + 1,
    versionNonce: generateSeed(),
    updated: Date.now(),
  }
}

/**
 * Positions a group of elements at new coordinates.
 */
export function positionCanvasElements(params: PositionCanvasElementParams): ExcalidrawElement[] {
  const { elements, targetX, targetY } = params

  if (elements.length === 0) {
    return []
  }

  // Calculate current bounding box
  const bounds = {
    minX: Math.min(...elements.map(el => el.x)),
    minY: Math.min(...elements.map(el => el.y)),
  }

  // Calculate offset
  const offsetX = targetX - bounds.minX
  const offsetY = targetY - bounds.minY

  // Apply offset to all elements
  return elements.map(element => ({
    ...element,
    x: element.x + offsetX,
    y: element.y + offsetY,
    version: (element.version ?? 1) + 1,
    versionNonce: generateSeed(),
    updated: Date.now(),
  }))
}

/**
 * Marks elements as deleted (soft delete).
 */
export function removeCanvasElements(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  return elements.map(element => ({
    ...element,
    isDeleted: true,
    version: (element.version ?? 1) + 1,
    versionNonce: generateSeed(),
    updated: Date.now(),
  }))
}

/**
 * Finds all elements that belong to a database entity.
 */
export function findElementsByDatabaseId(
  allElements: ExcalidrawElement[],
  databaseId: string
): ExcalidrawElement[] {
  const mainElement = allElements.find(
    el => el.customData?.isMainElement && el.customData?.databaseId === databaseId
  )

  if (!mainElement) {
    return []
  }

  // Find all elements in the same group as the main element
  if (!mainElement.groupIds || mainElement.groupIds.length === 0) {
    return [mainElement]
  }

  return allElements.filter(
    el => el.groupIds && el.groupIds.some(gId => mainElement.groupIds?.includes(gId))
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateTemplateBounds(elements: any[]) {
  return {
    minX: Math.min(...elements.map(el => el.x)),
    minY: Math.min(...elements.map(el => el.y)),
    maxX: Math.max(...elements.map(el => el.x + (el.width || 0))),
    maxY: Math.max(...elements.map(el => el.y + (el.height || 0))),
  }
}

function applyContainerCustomizations(
  templateElements: any[],
  clonedElements: any[],
  templateById: Map<string, any>,
  cloneById: Map<string, any>,
  idMapping: Map<string, string>,
  context: {
    elementType: ElementType
    referenceId: string
    referenceName: string
    customizations?: ElementCustomizations
  }
) {
  const { elementType, referenceId, referenceName, customizations } = context

  // Find container rectangles
  const containerRects = templateElements.filter(el => isContainerRectangle(el, templateById))
  const targetRects =
    containerRects.length > 0
      ? containerRects
      : templateElements.filter(el => el.type === 'rectangle')

  let isFirst = true

  targetRects.forEach(original => {
    const cloneId = idMapping.get(original.id)
    const clone = cloneId ? cloneById.get(cloneId) : null
    if (!clone) return

    // Always use black stroke for main containers
    clone.strokeColor = '#1e1e1e'

    if (isFirst) {
      // Main element gets full metadata
      clone.customData = {
        isFromDatabase: true,
        databaseId: referenceId,
        elementType,
        elementName: referenceName,
        isMainElement: true,
      }

      // Apply customizations to main container
      if (customizations?.width) {
        clone.width = customizations.width
      }
      if (customizations?.height) {
        clone.height = customizations.height
      }
      if (customizations?.backgroundColor) {
        clone.backgroundColor = customizations.backgroundColor
      }

      isFirst = false
    } else {
      // Non-main elements
      clone.customData = {
        isFromDatabase: true,
        isMainElement: false,
      }
    }
  })
}

function repositionIconElement(
  originalElement: any,
  clonedElement: any,
  mainContainerTemplate: any,
  mainContainerClone: any,
  customWidth: number
) {
  // Calculate original distance from right edge in template
  const originalRightEdge = mainContainerTemplate.x + mainContainerTemplate.width
  const originalDistanceFromRight =
    originalRightEdge - (originalElement.x + (originalElement.width || 0))

  // Calculate new position using the cloned (already positioned) main container
  const newRightEdge = mainContainerClone.x + customWidth
  clonedElement.x = newRightEdge - originalDistanceFromRight - (originalElement.width || 0)
}

function applyTextCustomizations(
  templateElements: any[],
  clonedElements: any[],
  templateById: Map<string, any>,
  cloneById: Map<string, any>,
  idMapping: Map<string, string>,
  context: {
    referenceName: string
    customizations?: ElementCustomizations
    defaultFontFamily: number
    elementType: ElementType
  }
) {
  const { referenceName, customizations, defaultFontFamily, elementType } = context

  templateElements.forEach(original => {
    if (original.type !== 'text') return

    const cloneId = idMapping.get(original.id)
    const clone = cloneId ? cloneById.get(cloneId) : null
    if (!clone) return

    // Find container
    const containerOriginal = findContainerForText(templateElements, original.id)
    const containerCloneId = containerOriginal ? idMapping.get(containerOriginal.id) : null
    const containerClone = containerCloneId ? cloneById.get(containerCloneId) : null

    // Calculate text properties
    const fontSize = customizations?.fontSize ?? original.fontSize ?? DEFAULT_FONT_SIZE
    const containerWidth = containerClone ? containerClone.width : (original.width ?? 180)

    // Get icon width for this element type
    const iconWidth = getIconWidth(elementType)

    // CRITICAL: Must match Excalidraw's getBoundTextMaxWidth calculation
    // For rectangles with top-aligned text and icon: width - BOUND_TEXT_PADDING * 2 - iconWidth
    // For rectangles with middle-aligned text: width - BOUND_TEXT_PADDING * 2
    // Apply safety margin to account for font measurement variations
    let availableWidth: number
    if (customizations?.useTopCenteredText && iconWidth > 0) {
      availableWidth =
        (containerWidth - BOUND_TEXT_PADDING * 2 - iconWidth) * MEASUREMENT_SAFETY_MARGIN
    } else {
      availableWidth = (containerWidth - BOUND_TEXT_PADDING * 2) * MEASUREMENT_SAFETY_MARGIN
    }

    const wrappedText = wrapTextForExcalidraw(
      referenceName,
      availableWidth,
      fontSize,
      defaultFontFamily
    )

    // Excalidraw expects pre-wrapped text in both text and originalText
    clone.text = wrappedText
    clone.rawText = wrappedText
    clone.originalText = wrappedText
    clone.fontSize = fontSize
    clone.fontFamily = defaultFontFamily
    clone.textAlign = original.textAlign || 'center'
    clone.verticalAlign = customizations?.useTopCenteredText
      ? 'top'
      : original.verticalAlign || 'middle'

    if (containerClone) {
      // For bound text, width should be based on container, not on measured text
      // This matches Excalidraw's getBoundTextMaxWidth calculation
      let textWidth: number
      if (customizations?.useTopCenteredText && iconWidth > 0) {
        textWidth = containerWidth - BOUND_TEXT_PADDING * 2 - iconWidth - 8
      } else {
        textWidth = containerWidth - BOUND_TEXT_PADDING * 2 - 8
      }

      const textHeight = measureWrappedTextHeight(wrappedText, fontSize)

      // Center the text within the container (or available space for top-aligned with icon)
      const containerCenterX = containerClone.x + containerClone.width / 2
      const containerCenterY = containerClone.y + containerClone.height / 2

      if (customizations?.useTopCenteredText && iconWidth > 0) {
        // For top-aligned text with icon, center the text in the available space
        const availableSpace = containerWidth - iconWidth
        const availableSpaceCenterX = containerClone.x + availableSpace / 2
        clone.x = availableSpaceCenterX - textWidth / 2
        clone.y = containerClone.y + 10
      } else if (customizations?.useTopCenteredText) {
        // For top-aligned text without icon, center it in full width
        clone.x = containerCenterX - textWidth / 2
        clone.y = containerClone.y + 10
      } else {
        // For middle-aligned text, center it in full width with 4px padding on each side
        clone.x = containerCenterX - textWidth / 2
        clone.y = containerCenterY - textHeight / 2
      }
      clone.width = textWidth
      clone.height = textHeight
      clone.baseline = clone.y + clone.height
      clone.containerId = containerClone.id
    }

    // Set metadata
    clone.customData = {
      isFromDatabase: true,
      isMainElement: false,
    }
  })
}

function validateTextContainerBindings(elements: any[]) {
  const textElements = elements.filter(el => el.type === 'text')
  const rectangleElements = elements.filter(el => el.type === 'rectangle')

  textElements.forEach(textEl => {
    if (!textEl.containerId) return

    const container = rectangleElements.find(rect => rect.id === textEl.containerId)
    if (!container) return

    if (!container.boundElements) {
      container.boundElements = []
    }

    const hasBinding = container.boundElements.some((bound: any) => bound.id === textEl.id)
    if (!hasBinding) {
      container.boundElements.push({
        type: 'text',
        id: textEl.id,
      })
    }
  })
}
