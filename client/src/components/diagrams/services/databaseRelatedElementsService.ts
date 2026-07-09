// databaseRelatedElementsService.ts - Lädt und extrahiert Related Elements aus dem Backend
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
// Reale Queries & Typen aus bestehender Datei
import {
  GET_RELATED_ELEMENTS_FOR_CAPABILITY,
  GET_RELATED_ELEMENTS_FOR_APPLICATION,
  GET_RELATED_ELEMENTS_FOR_DATA_OBJECT,
  GET_RELATED_ELEMENTS_FOR_INTERFACE,
  GET_RELATED_ELEMENTS_FOR_INFRASTRUCTURE,
  GET_RELATED_ELEMENTS_FOR_BUSINESS_PROCESS,
  RelatedElementsResponse,
} from '../../../graphql/relatedElements'
import { normalizeElementType } from '../utils/relationshipValidation'

export interface LoadRelatedElementsParams {
  client: ApolloClient<NormalizedCacheObject>
  mainElementId: string
  mainElementType: string
  selectedTypes?: string[] // Neue optionale Filterung
}

export const loadRelatedElementsFromDatabase = async ({
  client,
  mainElementId,
  mainElementType,
  selectedTypes,
}: LoadRelatedElementsParams): Promise<RelatedElementsResponse> => {
  try {
    const normalizedType = normalizeElementType(mainElementType)
    if (!normalizedType) throw new Error('Unsupported element type')

    let query
    let queryName: string
    switch (normalizedType) {
      case 'businessCapability':
        query = GET_RELATED_ELEMENTS_FOR_CAPABILITY
        queryName = 'businessCapabilities'
        break
      case 'application':
        query = GET_RELATED_ELEMENTS_FOR_APPLICATION
        queryName = 'applications'
        break
      case 'businessProcess':
        query = GET_RELATED_ELEMENTS_FOR_BUSINESS_PROCESS
        queryName = 'businessProcesses'
        break
      case 'dataObject':
        query = GET_RELATED_ELEMENTS_FOR_DATA_OBJECT
        queryName = 'dataObjects'
        break
      case 'applicationInterface':
        query = GET_RELATED_ELEMENTS_FOR_INTERFACE
        queryName = 'applicationInterfaces'
        break
      case 'infrastructure':
        query = GET_RELATED_ELEMENTS_FOR_INFRASTRUCTURE
        queryName = 'infrastructures'
        break
      default:
        throw new Error('Unsupported element type')
    }

    const result = await client.query({
      query,
      variables: { id: mainElementId },
      fetchPolicy: 'network-only',
    })

    const elementDataArray = (result.data as any)[queryName]
    if (!elementDataArray || elementDataArray.length === 0) {
      return { elements: [], relationshipTypes: [], totalElements: 0 }
    }

    const elementData = elementDataArray[0]
    const extractionType =
      normalizedType === 'businessCapability'
        ? 'businessCapability'
        : normalizedType === 'applicationInterface'
          ? 'interface'
          : normalizedType
    console.info('[DBRelated] Fetch', {
      mainElementId,
      mainElementType,
      normalizedType,
      extractionType,
    })
    const relatedElements = extractRelatedElementsFromQueryResult(elementData, extractionType)

    // Optionale Filterung nach selectedTypes
    const filteredElements =
      selectedTypes && selectedTypes.length > 0
        ? relatedElements.filter((element: any) => selectedTypes.includes(element.elementType))
        : relatedElements

    console.info('[DBRelated] Filtering', {
      originalCount: relatedElements.length,
      filteredCount: filteredElements.length,
      selectedTypes,
    })

    return {
      elements: filteredElements,
      relationshipTypes: getRelationshipTypesForElement(extractionType),
      totalElements: filteredElements.length, // Angepasst für gefilterte Anzahl
    }
  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error)
    throw error
  }
}

// Hilfstypen (repräsentativ – erweitern bei Bedarf)
// Hinweis: Ehemalige Edge-Typen werden aktuell nicht benötigt.

// Extraktion aus GraphQL Antwort (vereinfachte Struktur – anpassen falls nötig)
// Extrahiert verwandte Elemente aus Query-Ergebnis (angepasst aus Monolith)
export const extractRelatedElementsFromQueryResult = (
  elementData: any,
  sourceElementType: string
): any[] => {
  const relatedElements: any[] = []
  switch (sourceElementType) {
    case 'businessCapability':
      if (elementData.supportedByApplications) {
        elementData.supportedByApplications.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
            relationshipType: 'SUPPORTS',
            reverseArrow: true,
          })
        })
      }
      if (elementData.supportedByAIComponents) {
        elementData.supportedByAIComponents.forEach((aiComponent: any) => {
          relatedElements.push({
            id: aiComponent.id,
            name: aiComponent.name,
            description: aiComponent.description,
            elementType: 'aiComponent',
            status: aiComponent.status,
            aiType: aiComponent.aiType,
            relationshipType: 'SUPPORTS',
            reverseArrow: true,
          })
        })
      }
      if (elementData.supportedByBusinessProcesses) {
        elementData.supportedByBusinessProcesses.forEach((proc: any) => {
          relatedElements.push({
            id: proc.id,
            name: proc.name,
            description: proc.description,
            elementType: 'businessProcess',
            status: proc.status,
            relationshipType: 'SUPPORTS_CAPABILITY',
            reverseArrow: true,
          })
        })
      }
      if (elementData.relatedDataObjects) {
        elementData.relatedDataObjects.forEach((dataObj: any) => {
          relatedElements.push({
            id: dataObj.id,
            name: dataObj.name,
            description: dataObj.description,
            elementType: 'dataObject',
            classification: dataObj.classification,
            relationshipType: 'RELATED_TO',
            reverseArrow: false,
          })
        })
      }
      if (elementData.parents) {
        elementData.parents.forEach((parent: any) => {
          relatedElements.push({
            id: parent.id,
            name: parent.name,
            description: parent.description,
            elementType: 'businessCapability',
            status: parent.status,
            type: parent.type,
          })
        })
      }
      if (elementData.children) {
        elementData.children.forEach((child: any) => {
          relatedElements.push({
            id: child.id,
            name: child.name,
            description: child.description,
            elementType: 'businessCapability',
            status: child.status,
            type: child.type,
          })
        })
      }
      break
    case 'application':
      if (elementData.supportsCapabilities) {
        elementData.supportsCapabilities.forEach((cap: any) => {
          relatedElements.push({
            id: cap.id,
            name: cap.name,
            description: cap.description,
            elementType: 'businessCapability',
            status: cap.status,
            type: cap.type,
            maturityLevel: cap.maturityLevel,
            businessValue: cap.businessValue,
          })
        })
      }
      if (elementData.supportsBusinessProcesses) {
        elementData.supportsBusinessProcesses.forEach((proc: any) => {
          relatedElements.push({
            id: proc.id,
            name: proc.name,
            description: proc.description,
            elementType: 'businessProcess',
            status: proc.status,
            relationshipType: 'SUPPORTS_PROCESS',
            reverseArrow: false,
          })
        })
      }
      if (elementData.usesDataObjects) {
        elementData.usesDataObjects.forEach((dataObj: any) => {
          relatedElements.push({
            id: dataObj.id,
            name: dataObj.name,
            description: dataObj.description,
            elementType: 'dataObject',
            classification: dataObj.classification,
          })
        })
      }
      if (elementData.sourceOfInterfaces) {
        elementData.sourceOfInterfaces.forEach((iface: any) => {
          relatedElements.push({
            id: iface.id,
            name: iface.name,
            description: iface.description,
            elementType: 'interface',
            interfaceType: iface.interfaceType,
            relationshipType: 'INTERFACE_SOURCE',
            reverseArrow: false,
          })
        })
      }
      if (elementData.targetOfInterfaces) {
        elementData.targetOfInterfaces.forEach((iface: any) => {
          relatedElements.push({
            id: iface.id,
            name: iface.name,
            description: iface.description,
            elementType: 'interface',
            interfaceType: iface.interfaceType,
            relationshipType: 'INTERFACE_TARGET',
            reverseArrow: true,
          })
        })
      }
      if (elementData.hostedOn) {
        elementData.hostedOn.forEach((infra: any) => {
          relatedElements.push({
            id: infra.id,
            name: infra.name,
            description: infra.description,
            elementType: 'infrastructure',
            infrastructureType: infra.infrastructureType,
            status: infra.status,
          })
        })
      }
      if (elementData.parents) {
        elementData.parents.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
            relationshipType: 'HAS_PARENT_APPLICATION',
            reverseArrow: false,
          })
        })
      }
      if (elementData.components) {
        elementData.components.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
            relationshipType: 'HAS_PARENT_APPLICATION',
            reverseArrow: false,
          })
        })
      }
      break
    case 'businessProcess':
      if (elementData.supportsCapabilities) {
        elementData.supportsCapabilities.forEach((cap: any) => {
          relatedElements.push({
            id: cap.id,
            name: cap.name,
            description: cap.description,
            elementType: 'businessCapability',
            status: cap.status,
            type: cap.type,
            maturityLevel: cap.maturityLevel,
            businessValue: cap.businessValue,
          })
        })
      }
      if (elementData.supportedByApplications) {
        elementData.supportedByApplications.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
            relationshipType: 'SUPPORTS',
            reverseArrow: true,
          })
        })
      }
      if (elementData.parentProcess) {
        elementData.parentProcess.forEach((proc: any) => {
          relatedElements.push({
            id: proc.id,
            name: proc.name,
            description: proc.description,
            elementType: 'businessProcess',
            status: proc.status,
            relationshipType: 'HAS_PARENT_PROCESS',
            reverseArrow: false,
          })
        })
      }
      if (elementData.childProcesses) {
        elementData.childProcesses.forEach((proc: any) => {
          relatedElements.push({
            id: proc.id,
            name: proc.name,
            description: proc.description,
            elementType: 'businessProcess',
            status: proc.status,
            relationshipType: 'HAS_CHILD_PROCESS',
            reverseArrow: false,
          })
        })
      }
      break
    case 'dataObject':
      if (elementData.dataSources) {
        elementData.dataSources.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
          })
        })
      }
      if (elementData.usedByApplications) {
        elementData.usedByApplications.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
          })
        })
      }
      if (elementData.relatedToCapabilities) {
        elementData.relatedToCapabilities.forEach((cap: any) => {
          relatedElements.push({
            id: cap.id,
            name: cap.name,
            description: cap.description,
            elementType: 'businessCapability',
            status: cap.status,
            type: cap.type,
            maturityLevel: cap.maturityLevel,
            businessValue: cap.businessValue,
          })
        })
      }
      if (elementData.transferredInInterfaces) {
        elementData.transferredInInterfaces.forEach((iface: any) => {
          relatedElements.push({
            id: iface.id,
            name: iface.name,
            description: iface.description,
            elementType: 'interface',
            interfaceType: iface.interfaceType,
          })
        })
      }
      break
    case 'interface':
      if (elementData.sourceApplications && elementData.sourceApplications.length > 0) {
        elementData.sourceApplications.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
            relationshipType: 'INTERFACE_SOURCE',
            reverseArrow: true,
          })
        })
      }
      if (elementData.targetApplications) {
        elementData.targetApplications.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
            relationshipType: 'INTERFACE_TARGET',
            reverseArrow: false,
          })
        })
      }
      if (elementData.dataObjects) {
        elementData.dataObjects.forEach((dataObj: any) => {
          relatedElements.push({
            id: dataObj.id,
            name: dataObj.name,
            description: dataObj.description,
            elementType: 'dataObject',
            classification: dataObj.classification,
          })
        })
      }
      break
    case 'infrastructure':
      if (elementData.hostsApplications) {
        elementData.hostsApplications.forEach((app: any) => {
          relatedElements.push({
            id: app.id,
            name: app.name,
            description: app.description,
            elementType: 'application',
            status: app.status,
            criticality: app.criticality,
          })
        })
      }
      if (elementData.parentInfrastructure) {
        const parents = Array.isArray(elementData.parentInfrastructure)
          ? elementData.parentInfrastructure
          : [elementData.parentInfrastructure]
        parents.forEach((infra: any) => {
          relatedElements.push({
            id: infra.id,
            name: infra.name,
            description: infra.description,
            elementType: 'infrastructure',
            infrastructureType: infra.infrastructureType,
            status: infra.status,
            relationshipType: 'HAS_PARENT_INFRASTRUCTURE',
            reverseArrow: false,
          })
        })
      }
      if (elementData.childInfrastructures) {
        elementData.childInfrastructures.forEach((infra: any) => {
          relatedElements.push({
            id: infra.id,
            name: infra.name,
            description: infra.description,
            elementType: 'infrastructure',
            infrastructureType: infra.infrastructureType,
            status: infra.status,
            relationshipType: 'HAS_PARENT_INFRASTRUCTURE',
            reverseArrow: true,
          })
        })
      }
      break
  }
  const uniqueElements = relatedElements.filter(
    (el, idx, self) => idx === self.findIndex(e => e.id === el.id)
  )
  return uniqueElements
}

// Beziehungstyp-Ermittlung (Placeholder – echte Logik im Original prüfen und hierher verschieben)
export const getRelationshipTypesForElement = (elementType: string): string[] => {
  const relationshipMap = {
    capability: ['SUPPORTS', 'RELATES_TO', 'HAS_PARENT', 'HAS_CHILD'],
    application: ['SUPPORTS', 'USES', 'SOURCE_OF', 'TARGET_OF', 'HOSTED_ON'],
    businessProcess: ['SUPPORTS_CAPABILITY', 'SUPPORTED_BY_APPLICATION', 'PARENT_PROCESS'],
    dataObject: ['USED_BY', 'DATA_SOURCE', 'RELATES_TO', 'TRANSFERRED_IN'],
    interface: ['SOURCE', 'TARGET', 'TRANSFERS'],
    infrastructure: ['HOSTS'],
  }
  return (relationshipMap as any)[elementType] || []
}
