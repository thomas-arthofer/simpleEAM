// Database synchronization utilities for diagram elements
import { gql } from '@apollo/client'
import {
  normalizeText,
  prepareTextForDatabase,
  findLinkedTextElement,
  ensureTextContainerBindings,
} from './textContainerUtils'
import {
  updateCanvasElementName,
  getInfrastructureDisplayName,
  stripInfrastructureTypePrefix,
} from './architectureElements'
import { syncSovereigntyMarkers } from './sovereigntyMarkers'

interface DiagramElement {
  id: string
  type: string
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
      | 'businessCapability'
      | 'applicationInterface'
      | 'businessProcess'
    elementName?: string // Optimization: Just the name instead of complete originalElement
    originalElement?: any // Kept for backwards compatibility
    isMainElement?: boolean
    mainElementId?: string
    lastSyncedName?: string
    originalDiagramText?: string // Original text from diagram when first loaded/created
    originalDatabaseName?: string // Original name from database when first synced
    isDatabaseMissing?: boolean
    missingReason?: string
  }
  strokeColor?: string
  strokeWidth?: number
  strokeStyle?: string
  text?: string
  rawText?: string
  originalText?: string
  [key: string]: any
}

interface ValidationResult {
  valid: boolean
  missingElements: string[]
  updatedElements: DiagramElement[]
}

/**
 * Extrahiert alle Datenbankelemente aus einem Diagramm
 */
export const extractDatabaseElements = (elements: DiagramElement[]): DiagramElement[] => {
  const databaseElements: DiagramElement[] = []
  const processedIds = new Set<string>()

  for (const element of elements) {
    if (!element.customData?.isFromDatabase) continue

    // Process main elements
    if (element.customData.isMainElement && element.customData.databaseId) {
      const dbId = element.customData.databaseId
      if (!processedIds.has(dbId)) {
        databaseElements.push(element)
        processedIds.add(dbId)
      }
    }
    // Child elements - find the main element
    else if (element.customData.mainElementId) {
      const mainElement = elements.find(el => el.id === element.customData!.mainElementId)
      if (mainElement?.customData?.isMainElement && mainElement.customData.databaseId) {
        const dbId = mainElement.customData.databaseId
        if (!processedIds.has(dbId)) {
          databaseElements.push(mainElement)
          processedIds.add(dbId)
        }
      }
    }
  }

  return databaseElements
}

/**
 * Holt aktuelle Daten für ein Datenbankelement
 */
export const fetchElementData = async (
  apolloClient: any,
  databaseId: string,
  elementType: string
): Promise<any | null> => {
  try {
    let query

    // Normalize elementType for businessCapability and applicationInterface
    const normalizedElementType =
      elementType === 'businessCapability'
        ? 'businessCapability'
        : elementType === 'applicationInterface'
          ? 'interface'
          : elementType

    // Select the appropriate query based on the element type
    switch (normalizedElementType) {
      case 'businessCapability':
        query = gql`
          query GetCapability($id: ID!) {
            businessCapabilities(where: { id: { eq: $id } }) {
              id
              name
              description
              status
              maturityLevel
              businessValue
            }
          }
        `
        break
      case 'application':
        query = gql`
          query GetApplication($id: ID!) {
            applications(where: { id: { eq: $id } }) {
              id
              name
              description
              status
            }
          }
        `
        break
      case 'aiComponent':
        query = gql`
          query GetAIComponent($id: ID!) {
            aiComponents(where: { id: { eq: $id } }) {
              id
              name
              description
              aiType
              model
              status
              provider
              version
            }
          }
        `
        break
      case 'dataObject':
        query = gql`
          query GetDataObject($id: ID!) {
            dataObjects(where: { id: { eq: $id } }) {
              id
              name
              description
              classification
            }
          }
        `
        break
      case 'interface':
        query = gql`
          query GetInterface($id: ID!) {
            applicationInterfaces(where: { id: { eq: $id } }) {
              id
              name
              description
              protocol
              interfaceType
            }
          }
        `
        break
      case 'infrastructure':
        query = gql`
          query GetInfrastructure($id: ID!) {
            infrastructures(where: { id: { eq: $id } }) {
              id
              name
              description
              infrastructureType
              status
              vendor
              version
              location
            }
          }
        `
        break
      default:
        console.warn(`Unknown elementType: ${elementType} (normalized: ${normalizedElementType})`)
        return null
    }

    const result = await apolloClient.query({
      query,
      variables: { id: databaseId },
      fetchPolicy: 'network-only', // Always fetch current data
    })

    // Return the corresponding element type
    switch (normalizedElementType) {
      case 'businessCapability':
        return result.data.businessCapabilities?.[0] || null
      case 'application':
        return result.data.applications?.[0] || null
      case 'aiComponent':
        return result.data.aiComponents?.[0] || null
      case 'dataObject':
        return result.data.dataObjects?.[0] || null
      case 'interface':
        return result.data.applicationInterfaces?.[0] || null
      case 'infrastructure':
        return result.data.infrastructures?.[0] || null
      default:
        console.warn(`Unknown normalized elementType: ${normalizedElementType}`)
        return null
    }
  } catch (error: any) {
    console.warn(`Failed to fetch data for ${elementType} ${databaseId}:`, error)
    console.warn(
      `GraphQL error details:`,
      error?.graphQLErrors || error?.networkError || 'No detailed error info'
    )

    // Analyze the response for GraphQL errors
    if (error?.graphQLErrors?.length > 0) {
      error.graphQLErrors.forEach((gqlError: any, index: number) => {
        console.warn(`GraphQL Error ${index + 1}:`, gqlError.message)
        if (gqlError.path) {
          console.warn(`Error path:`, gqlError.path)
        }
      })
    }

    return null
  }
}

/**
 * Aktualisiert den Namen eines Datenbankelements
 */
export const updateElementName = async (
  apolloClient: any,
  databaseId: string,
  elementType: string,
  newName: string
): Promise<boolean> => {
  try {
    let mutation

    // Normalize elementType for consistent treatment
    const normalizedElementType =
      elementType === 'businessCapability'
        ? 'businessCapability'
        : elementType === 'applicationInterface'
          ? 'interface'
          : elementType

    // Select the appropriate mutation based on the element type
    switch (normalizedElementType) {
      case 'businessCapability':
        mutation = gql`
          mutation UpdateCapabilityName($id: ID!, $name: String!) {
            updateBusinessCapabilities(
              where: { id: { eq: $id } }
              update: { name: { set: $name } }
            ) {
              businessCapabilities {
                id
                name
              }
            }
          }
        `
        break
      case 'application':
        mutation = gql`
          mutation UpdateApplicationName($id: ID!, $name: String!) {
            updateApplications(where: { id: { eq: $id } }, update: { name: { set: $name } }) {
              applications {
                id
                name
              }
            }
          }
        `
        break
      case 'aiComponent':
        mutation = gql`
          mutation UpdateAIComponentName($id: ID!, $name: String!) {
            updateAiComponents(where: { id: { eq: $id } }, update: { name: { set: $name } }) {
              aiComponents {
                id
                name
              }
            }
          }
        `
        break
      case 'dataObject':
        mutation = gql`
          mutation UpdateDataObjectName($id: ID!, $name: String!) {
            updateDataObjects(where: { id: { eq: $id } }, update: { name: { set: $name } }) {
              dataObjects {
                id
                name
              }
            }
          }
        `
        break
      case 'interface':
        mutation = gql`
          mutation UpdateInterfaceName($id: ID!, $name: String!) {
            updateApplicationInterfaces(
              where: { id: { eq: $id } }
              update: { name: { set: $name } }
            ) {
              applicationInterfaces {
                id
                name
              }
            }
          }
        `
        break
      case 'infrastructure':
        mutation = gql`
          mutation UpdateInfrastructureName($id: ID!, $name: String!) {
            updateInfrastructures(where: { id: { eq: $id } }, update: { name: { set: $name } }) {
              infrastructures {
                id
                name
              }
            }
          }
        `
        break
      default:
        console.warn(
          `Unknown elementType for mutation: ${elementType} (normalized: ${normalizedElementType})`
        )
        return false
    }

    await apolloClient.mutate({
      mutation,
      variables: {
        id: databaseId,
        // For infrastructure elements the diagram label is rendered as
        // "<TypeLabel> - <name>". Strip that display-only prefix so the DB
        // never persists it as part of the actual entity name.
        name: prepareTextForDatabase(
          normalizedElementType === 'infrastructure'
            ? stripInfrastructureTypePrefix(newName)
            : newName
        ),
      },
    })

    return true
  } catch (error) {
    console.error(`Failed to update ${elementType} ${databaseId} name:`, error)
    return false
  }
}

/**
 * Validiert und synchronisiert Elemente beim Import von anderen Instanzen (mit Namensvergleich für ID-Mapping)
 * WICHTIG: Aktualisiert ALLE Instanzen von Elementen mit derselben databaseId
 * Should ONLY be used during import where IDs do not match and names need to be compared
 */
export const validateAndSyncElementsForImport = async (
  apolloClient: any,
  elements: DiagramElement[]
): Promise<ValidationResult> => {
  const databaseElements = extractDatabaseElements(elements)
  const missingElements: string[] = []
  const updatedElements: DiagramElement[] = []

  // Process each unique databaseId
  for (const element of databaseElements) {
    if (!element.customData?.databaseId || !element.customData?.elementType) continue

    const databaseId = element.customData.databaseId
    const elementType = element.customData.elementType

    // Aktuelle Daten aus der Datenbank abrufen
    const currentData = await fetchElementData(apolloClient, databaseId, elementType)

    if (!currentData) {
      // Element nicht mehr in Datenbank vorhanden
      missingElements.push(databaseId)
      continue
    }

    const databaseName = currentData.name
    const displayName = getInfrastructureDisplayName(
      databaseName,
      elementType,
      currentData.infrastructureType
    )

    // WICHTIG: Finde ALLE Elemente mit derselben databaseId
    const allElementsWithSameDbId = elements.filter(el => el.customData?.databaseId === databaseId)

    // Verarbeite jede Instanz des Datenbankelements
    for (const elementInstance of allElementsWithSameDbId) {
      // Sichere Prüfung für customData
      if (!elementInstance.customData) continue

      // Synchronize names if necessary - check various sources for current name
      const currentElementName =
        elementInstance.customData.elementName || elementInstance.customData.originalElement?.name

      // Use the common function for robust text element search
      const textElement = findLinkedTextElement(elementInstance, elements)
      const displayedName = textElement?.text || textElement?.rawText

      // Update required if database name differs from stored name
      // Use normalizeText for comparisons to ignore line breaks
      // Handle undefined/null values correctly
      const normalizedCurrentElementName = normalizeText(currentElementName)
      const normalizedDisplayedName = normalizeText(displayedName)
      const normalizedDatabaseName = normalizeText(displayName)

      // Debug: Show comparison values only when update is potentially needed
      const isDisplayedNameDifferent =
        displayedName && normalizedDisplayedName !== normalizedDatabaseName
      const isOriginalNameDifferent =
        currentElementName && normalizedCurrentElementName !== normalizedDatabaseName

      // Update only when there is actually a discrepancy
      const nameUpdateNeeded = displayName && (isDisplayedNameDifferent || isOriginalNameDifferent)

      if (nameUpdateNeeded) {
        // Update elementName with new data (optimized)
        elementInstance.customData.elementName = displayName
        elementInstance.customData.lastSyncedName = displayName

        // IMPORTANT: Also directly update the associated text element
        if (textElement) {
          // Use the abstraction layer to properly wrap and position the text
          const updatedTextElement = updateCanvasElementName(
            elementInstance as any,
            displayName,
            elements as any
          )

          // Add both the container element and the text element to the updates
          if (updatedTextElement) {
            updatedElements.push(elementInstance, updatedTextElement as any)
          } else {
            updatedElements.push(elementInstance)
          }
        } else {
          console.warn(
            `No text element found for ${elementType} ${databaseId} (instance ${elementInstance.id})`
          )
          updatedElements.push(elementInstance)
        }
      }
    }
  }

  return {
    valid: missingElements.length === 0,
    missingElements,
    updatedElements,
  }
}

/**
 * Marks missing elements with red borders and removes marks for found elements
 */
export const markMissingElements = (
  elements: DiagramElement[],
  missingIds: string[]
): DiagramElement[] => {
  return elements.map(element => {
    if (!element.customData?.isFromDatabase) return element

    // Check if this element or its main element is missing
    let isMissing = false
    let databaseId: string | undefined

    if (element.customData.isMainElement && element.customData.databaseId) {
      databaseId = element.customData.databaseId
      isMissing = missingIds.includes(databaseId)
    } else if (element.customData.mainElementId) {
      // Find the main element and check its databaseId
      const mainElement = elements.find(el => el.id === element.customData!.mainElementId)
      if (mainElement?.customData?.databaseId) {
        databaseId = mainElement.customData.databaseId
        isMissing = missingIds.includes(databaseId)
      }
    }

    if (isMissing) {
      return {
        ...element,
        strokeColor: '#ff0000',
        strokeWidth: 3,
        strokeStyle: 'solid',
        customData: {
          ...element.customData,
          isDatabaseMissing: true,
          missingReason: 'Element no longer exists in database',
        },
      }
    } else if (element.customData.isDatabaseMissing) {
      // Element was previously marked as missing, but is now back - remove marking
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isDatabaseMissing, missingReason, ...cleanCustomData } = element.customData
      return {
        ...element,
        strokeColor: element.strokeColor === '#ff0000' ? '#000000' : element.strokeColor,
        strokeWidth: element.strokeWidth === 3 ? 2 : element.strokeWidth,
        strokeStyle: 'solid',
        customData: cleanCustomData,
      }
    }

    return element
  })
}

/**
 * Debug helper function: Analyzes all elements and their connections
 */
const debugElementStructure = (elements: DiagramElement[]): void => {
  const databaseElements = elements.filter(el => el.customData?.isFromDatabase)

  databaseElements.forEach(dbEl => {
    // Use the common function for text element search
    findLinkedTextElement(dbEl, elements)
  })
}

/**
 * Simple synchronization when opening diagrams - loads names directly via IDs without comparison
 */
export const syncDiagramOnOpenSimple = async (
  apolloClient: any,
  elements: DiagramElement[]
): Promise<DiagramElement[]> => {
  const databaseElements = extractDatabaseElements(elements)
  const missingElements: string[] = []
  const updatedElements: DiagramElement[] = []

  // Process each unique databaseId - only ID-based query, no name comparison
  for (const element of databaseElements) {
    if (!element.customData?.databaseId || !element.customData?.elementType) continue

    const databaseId = element.customData.databaseId
    const elementType = element.customData.elementType

    // Aktuelle Daten aus der Datenbank abrufen
    const currentData = await fetchElementData(apolloClient, databaseId, elementType)

    if (!currentData) {
      // Element nicht mehr in Datenbank vorhanden
      missingElements.push(databaseId)
      continue
    }

    const databaseName = currentData.name
    const displayName = getInfrastructureDisplayName(
      databaseName,
      elementType,
      currentData.infrastructureType
    )

    // WICHTIG: Finde ALLE Elemente mit derselben databaseId
    const allElementsWithSameDbId = elements.filter(el => el.customData?.databaseId === databaseId)

    // Verarbeite jede Instanz des Datenbankelements
    for (const elementInstance of allElementsWithSameDbId) {
      // Sichere Prüfung für customData
      if (!elementInstance.customData) continue

      // CRITICAL: Only process main container elements, not text elements
      // Text elements will be updated via updateCanvasElementName
      if (!elementInstance.customData.isMainElement) continue

      // Use the common function for robust text element search
      const textElement = findLinkedTextElement(elementInstance, elements)

      // When normally opening: ALWAYS use the database name, no comparison needed
      if (databaseName && textElement) {
        // Use the abstraction layer to properly wrap and position the text
        // This ensures text is re-wrapped with correct padding on every load
        // IMPORTANT: Pass the existing font family to preserve user's font choice
        const updatedTextElement = updateCanvasElementName(
          elementInstance as any,
          displayName,
          elements as any,
          textElement.fontFamily || 5
        )

        // Create a copy of the element with updated name and bumped version
        const updatedElement = {
          ...elementInstance,
          customData: {
            ...elementInstance.customData,
            elementName: displayName,
            lastSyncedName: displayName,
            // Store original database name on first sync (for hyphen preservation)
            originalDatabaseName: elementInstance.customData.originalDatabaseName || databaseName,
            // Store original diagram text if not already stored
            originalDiagramText:
              elementInstance.customData.originalDiagramText ||
              textElement?.text ||
              textElement?.rawText,
            // Remove the missing mark if present
            isDatabaseMissing: false,
            missingReason: undefined,
          },
          version: (elementInstance.version ?? 1) + 1,
          versionNonce: Math.floor(Math.random() * 1000000),
          updated: Date.now(),
        }

        updatedElements.push(updatedElement)

        if (updatedTextElement && updatedTextElement.id !== updatedElement.id) {
          updatedElements.push(updatedTextElement as any)
        }
      }
    }
  }

  // Update elements with new names
  let finalElements = [...elements]

  // Update elements based on the results
  for (const updatedElement of updatedElements) {
    const elementIndex = finalElements.findIndex(el => el.id === updatedElement.id)
    if (elementIndex !== -1) {
      // Replace the element in the array
      finalElements[elementIndex] = updatedElement
    }
  }

  // IMPORTANT: Mark missing AND remove marks for found elements
  finalElements = markMissingElements(finalElements, missingElements)

  // Ensure text-container bindings are correct
  finalElements = ensureTextContainerBindings(finalElements)

  if (missingElements.length > 0) {
    console.warn(`Found ${missingElements.length} missing database elements:`, missingElements)
  }

  return finalElements
}

/**
 * Synchronizes diagram elements when opening
 */
export const syncDiagramOnOpen = async (
  apolloClient: any,
  diagramData: any,
  sovereigntyOptions?: { enabled: boolean; companyId: string | null }
): Promise<any> => {
  if (!diagramData.elements || !Array.isArray(diagramData.elements)) {
    return diagramData
  }

  // Debug: Analyze element structure
  debugElementStructure(diagramData.elements)

  // Use simple synchronization without name comparison
  let updatedElements = await syncDiagramOnOpenSimple(apolloClient, diagramData.elements)

  // D-09: only issues a sovereigntyMarkers query/render when explicitly gated in
  if (sovereigntyOptions) {
    updatedElements = await syncSovereigntyMarkers(
      apolloClient,
      updatedElements,
      sovereigntyOptions
    )
  }

  return {
    ...diagramData,
    elements: updatedElements,
  }
}

/**
 * Synchronizes changes back to the database when saving
 */
export const syncDiagramOnSave = async (
  apolloClient: any,
  diagramData: any
): Promise<{ success: boolean; updatedCount: number }> => {
  if (!diagramData.elements || !Array.isArray(diagramData.elements)) {
    return { success: true, updatedCount: 0 }
  }

  const databaseElements = extractDatabaseElements(diagramData.elements)
  let updatedCount = 0

  for (const element of databaseElements) {
    if (!element.customData?.databaseId || !element.customData?.elementType) continue

    // Use the common function for robust text element search
    const textElement = findLinkedTextElement(element, diagramData.elements)

    if (!textElement) {
      console.warn(`No text element found for database element ${element.customData.databaseId}`)
      console.warn(
        `Available text elements:`,
        diagramData.elements
          .filter((el: DiagramElement) => el.type === 'text')
          .map((el: DiagramElement) => ({
            id: el.id,
            text: el.text,
            rawText: el.rawText,
            customData: el.customData,
            x: el.x,
            y: el.y,
          }))
      )
      continue
    }

    const rawCurrentText =
      textElement.originalText || textElement.rawText || textElement.text || ''
    const currentName = normalizeText(rawCurrentText)
    const lastSyncedName = normalizeText(
      element.customData.lastSyncedName ||
        element.customData.elementName ||
        element.customData.originalElement?.name
    )

    // Check if the name has changed (with normalized text)
    if (currentName && currentName.trim() !== '' && currentName !== lastSyncedName) {
      // For infrastructure, strip the diagram-only "<TypeLabel> - " prefix from
      // the RAW text before normalizeText runs — normalizeText collapses `-\n`
      // to nothing and would corrupt labels like "On-Premise-Rechenzentrum".
      const nameForDatabase =
        element.customData.elementType === 'infrastructure'
          ? stripInfrastructureTypePrefix(rawCurrentText)
          : rawCurrentText
      const normalizedName = normalizeText(nameForDatabase)
        .trim()
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')

      const success = await updateElementName(
        apolloClient,
        element.customData.databaseId,
        element.customData.elementType,
        normalizedName
      )

      if (success) {
        // Update lastSyncedName with normalized name
        element.customData.lastSyncedName = normalizedName
        // IMPORTANT: Use only elementName, not originalElement.name for better performance
        element.customData.elementName = normalizedName
        updatedCount++
      } else {
        console.error(`Failed to update name for ${element.customData.databaseId}`)
      }
    }
  }

  return { success: true, updatedCount }
}

export interface NameChange {
  elementId: string
  databaseId: string
  elementType: string
  elementName: string // Current element name in database
  oldDisplayName: string // Name as displayed in diagram (with wrapping/hyphens)
  newDatabaseName: string // Proposed new name for database (normalized)
  originalDatabaseName?: string // Original database name (for hyphen preservation)
}

/**
 * Detects name changes without updating the database
 * Returns array of name changes for user review
 */
export const detectNameChanges = (diagramData: any): NameChange[] => {
  if (!diagramData.elements || !Array.isArray(diagramData.elements)) {
    return []
  }

  const nameChanges: NameChange[] = []
  const databaseElements = extractDatabaseElements(diagramData.elements)

  for (const element of databaseElements) {
    if (!element.customData?.databaseId || !element.customData?.elementType) continue

    // Find linked text element
    const textElement = findLinkedTextElement(element, diagramData.elements)

    if (!textElement) {
      continue
    }

    const currentDisplayName =
      textElement.originalText || textElement.rawText || textElement.text || ''
    const normalizedCurrentName = normalizeText(currentDisplayName)

    const lastSyncedName = normalizeText(
      element.customData.lastSyncedName ||
        element.customData.elementName ||
        element.customData.originalElement?.name
    )

    // Check if name has changed
    if (
      normalizedCurrentName &&
      normalizedCurrentName.trim() !== '' &&
      normalizedCurrentName !== lastSyncedName
    ) {
      // For infrastructure, strip the diagram-only "<TypeLabel> - " prefix from
      // the RAW display text (before normalizeText) — normalizeText collapses
      // `-\n` to nothing and would corrupt labels like "On-Premise-Rechenzentrum".
      const nameForDatabase =
        element.customData.elementType === 'infrastructure'
          ? stripInfrastructureTypePrefix(currentDisplayName)
          : currentDisplayName
      const newDatabaseName = normalizeText(nameForDatabase)
        .trim()
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')

      nameChanges.push({
        elementId: element.id,
        databaseId: element.customData.databaseId,
        elementType: element.customData.elementType,
        elementName:
          element.customData.elementName || element.customData.originalElement?.name || '',
        oldDisplayName: currentDisplayName,
        newDatabaseName,
        originalDatabaseName: element.customData.originalDatabaseName,
      })
    }
  }

  return nameChanges
}

/**
 * Applies name changes to database with user-edited values
 * @param apolloClient - Apollo Client instance
 * @param nameChanges - Array of name changes with user-edited new names
 * @returns Result with success status and count
 */
export const applyNameChanges = async (
  apolloClient: any,
  nameChanges: NameChange[]
): Promise<{ success: boolean; updatedCount: number; errors: string[] }> => {
  let updatedCount = 0
  const errors: string[] = []

  for (const change of nameChanges) {
    const success = await updateElementName(
      apolloClient,
      change.databaseId,
      change.elementType,
      change.newDatabaseName
    )

    if (success) {
      updatedCount++
    } else {
      errors.push(`Failed to update ${change.elementType} ${change.databaseId}`)
    }
  }

  return {
    success: errors.length === 0,
    updatedCount,
    errors,
  }
}

/**
 * Removes marks for missing elements
 */
export const clearMissingElementMarkers = (elements: DiagramElement[]): DiagramElement[] => {
  return elements.map(element => {
    if (element.customData?.isDatabaseMissing) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isDatabaseMissing, missingReason, ...cleanCustomData } = element.customData
      return {
        ...element,
        strokeColor: element.strokeColor === '#ff0000' ? '#000000' : element.strokeColor,
        strokeWidth: element.strokeWidth === 3 ? 2 : element.strokeWidth,
        strokeStyle: 'solid',
        customData: cleanCustomData,
      }
    }
    return element
  })
}
