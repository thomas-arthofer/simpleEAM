import { ApolloClient } from '@apollo/client'
import { GET_CAPABILITIES } from '../graphql/capability'
import { GET_APPLICATIONS } from '../graphql/application'
import { GET_DATA_OBJECTS } from '../graphql/dataObject'
import { GET_APPLICATION_INTERFACES } from '../graphql/applicationInterface'
import { GET_PERSONS } from '../graphql/person'
import { GET_ARCHITECTURES } from '../graphql/architecture'
import { GET_DIAGRAMS } from '../graphql/diagram'
import { GET_ARCHITECTURE_PRINCIPLES } from '../graphql/architecturePrinciple'
import { GET_INFRASTRUCTURES } from '../graphql/infrastructure'
import { GET_Aicomponents } from '../graphql/aicomponent'
import { GET_VISIONS } from '../graphql/vision'
import { GET_MISSIONS } from '../graphql/mission'
import { GET_VALUES } from '../graphql/value'
import { GET_GOALS } from '../graphql/goal'
import { GET_STRATEGIES } from '../graphql/strategy'
import { GET_BUSINESS_PROCESSES } from '../graphql/businessProcess'
import { GET_PRODUCT_FAMILIES } from '../graphql/productFamily'
import { GET_SOFTWARE_PRODUCTS } from '../graphql/softwareProduct'
import { GET_SOFTWARE_VERSIONS } from '../graphql/softwareVersion'
import { GET_HARDWARE_PRODUCTS } from '../graphql/hardwareProduct'
import { GET_HARDWARE_VERSIONS } from '../graphql/hardwareVersion'
import { ValidationResult } from '../components/excel/types'
import { getRequiredFieldsByEntityType, getOptionalFieldsByEntityType } from './excelDataService'
import { encodeDataObjectRelationshipValue } from './dataObjectRelationshipUtils'

/**
 * Typen für JSON-Export
 */
export interface JsonExportData {
  [key: string]: any
}

export type JsonEntityType =
  | 'businessCapabilities'
  | 'businessProcesses'
  | 'applications'
  | 'dataObjects'
  | 'interfaces'
  | 'persons'
  | 'architectures'
  | 'diagrams'
  | 'architecturePrinciples'
  | 'infrastructures'
  | 'productFamilies'
  | 'softwareProducts'
  | 'softwareVersions'
  | 'hardwareProducts'
  | 'hardwareVersions'
  | 'aicomponents'
  | 'visions'
  | 'missions'
  | 'values'
  | 'goals'
  | 'strategies'

// Hilfsfunktion: Company-Filter (inkl. Diagramm-OR-Sonderfall)
const companyWhere = (entityType: JsonEntityType | 'all', companyId?: string): any | undefined => {
  if (!companyId) return undefined

  if (entityType === 'diagrams') {
    return {
      OR: [
        { company: { some: { id: { eq: companyId } } } },
        { architecture: { some: { company: { some: { id: { eq: companyId } } } } } },
      ],
    }
  }

  if (entityType === 'persons') {
    return { companies: { some: { id: { eq: companyId } } } }
  }

  if (entityType === 'productFamilies') {
    return {
      OR: [
        { softwareProducts: { some: { company: { some: { id: { eq: companyId } } } } } },
        { hardwareProducts: { some: { company: { some: { id: { eq: companyId } } } } } },
      ],
    }
  }

  return { company: { some: { id: { eq: companyId } } } }
}

export interface ValidationError {
  row: number
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  row: number
  field: string
  message: string
  suggestion?: string
}

/**
 * Formatiert Datum für JSON-Export (behält ursprüngliches ISO-Format bei)
 */
const formatDateForJsonExport = (date: string | null | undefined): string => {
  if (!date) return ''
  return date // JSON behält ISO-Format bei
}

const mapScoredEdges = (connection: {
  edges?: Array<{ node?: { id?: string; name?: string }; properties?: { score?: number | null } }>
}): Array<{ id: string; name?: string; score?: number }> => {
  if (!connection?.edges || !Array.isArray(connection.edges)) {
    return []
  }

  return connection.edges.reduce<Array<{ id: string; name?: string; score?: number }>>(
    (acc, edge) => {
      const id = edge.node?.id
      if (!id) {
        return acc
      }

      const score = edge.properties?.score
      acc.push({
        id,
        name: edge.node?.name,
        score: typeof score === 'number' ? score : undefined,
      })

      return acc
    },
    []
  )
}

/**
 * Holt Business Capabilities für JSON-Export mit vollständigen Daten
 */
export const fetchBusinessCapabilitiesForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_CAPABILITIES,
      variables: { where: companyWhere('businessCapabilities', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.businessCapabilities?.map((cap: any) => ({
      id: cap.id,
      name: cap.name || '',
      description: cap.description || '',
      status: cap.status || '',
      type: cap.type || undefined,
      // Numeric fields
      businessValue: cap.businessValue || undefined,
      maturityLevel: cap.maturityLevel || undefined,
      sequenceNumber: cap.sequenceNumber || undefined,
      sovereigntyReqWeight: cap.sovereigntyReqWeight || undefined,
      sovereigntyReqStrategicAutonomy: cap.sovereigntyReqStrategicAutonomy || undefined,
      sovereigntyReqResilience: cap.sovereigntyReqResilience || undefined,
      sovereigntyReqSecurity: cap.sovereigntyReqSecurity || undefined,
      sovereigntyReqControl: cap.sovereigntyReqControl || undefined,
      sovereigntyReqStrategicAutonomyRationale: cap.sovereigntyReqStrategicAutonomyRationale || '',
      sovereigntyReqResilienceRationale: cap.sovereigntyReqResilienceRationale || '',
      sovereigntyReqSecurityRationale: cap.sovereigntyReqSecurityRationale || '',
      sovereigntyReqControlRationale: cap.sovereigntyReqControlRationale || '',
      // Date fields
      introductionDate: formatDateForJsonExport(cap.introductionDate),
      endDate: formatDateForJsonExport(cap.endDate),
      createdAt: formatDateForJsonExport(cap.createdAt),
      updatedAt: formatDateForJsonExport(cap.updatedAt),
      // Array fields
      tags: cap.tags || [],
      // Beziehungen als verschachtelte Objekte (nicht als ID-Strings)
      owners: cap.owners || [],
      supportedByApplications: cap.supportedByApplications || [],
      partOfArchitectures: cap.partOfArchitectures || [],
      relatedDataObjects: cap.relatedDataObjects || [],
      depictedInDiagrams: cap.depictedInDiagrams || [],
      parents: cap.parents || [],
      children: cap.children || [],
    }))
  } catch {
    throw new Error('Error loading business capabilities für JSON-Export')
  }
}

export const fetchBusinessProcessesForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_BUSINESS_PROCESSES,
      variables: { where: companyWhere('businessProcesses', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.businessProcesses?.map((process: any) => ({
      id: process.id,
      name: process.name || '',
      description: process.description || '',
      processType: process.processType || '',
      status: process.status || '',
      maturityLevel: process.maturityLevel || undefined,
      category: process.category || '',
      tags: process.tags || [],
      bpmnXml: process.bpmnXml || '',
      createdAt: formatDateForJsonExport(process.createdAt),
      updatedAt: formatDateForJsonExport(process.updatedAt),
      owners: process.owners || [],
      parentProcess: process.parentProcess || [],
      childProcesses: process.childProcesses || [],
      supportsCapabilities: process.supportsCapabilities || [],
      supportedByApplications: process.supportedByApplications || [],
      partOfArchitectures: process.partOfArchitectures || [],
      depictedInDiagrams: process.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Geschäftsprozesse für JSON-Export')
  }
}

/**
 * Holt Applications für JSON-Export mit vollständigen Daten
 */
export const fetchApplicationsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_APPLICATIONS,
      variables: { where: companyWhere('applications', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.applications?.map((app: any) => ({
      id: app.id,
      name: app.name || '',
      description: app.description || '',
      version: app.version || '',
      status: app.status || '',
      criticality: app.criticality || '',
      vendor: app.vendor || '',
      // Numeric fields
      costs: app.costs || undefined,
      sovereigntyAchStrategicAutonomy: app.sovereigntyAchStrategicAutonomy || undefined,
      sovereigntyAchResilience: app.sovereigntyAchResilience || undefined,
      sovereigntyAchSecurity: app.sovereigntyAchSecurity || undefined,
      sovereigntyAchControl: app.sovereigntyAchControl || undefined,
      sovereigntyAchStrategicAutonomyEvidence: app.sovereigntyAchStrategicAutonomyEvidence || '',
      sovereigntyAchResilienceEvidence: app.sovereigntyAchResilienceEvidence || '',
      sovereigntyAchSecurityEvidence: app.sovereigntyAchSecurityEvidence || '',
      sovereigntyAchControlEvidence: app.sovereigntyAchControlEvidence || '',
      // Date fields - alle wichtigen Datums-Felder hinzufügen
      introductionDate: formatDateForJsonExport(app.introductionDate),
      endOfLifeDate: formatDateForJsonExport(app.endOfLifeDate),
      endOfUseDate: formatDateForJsonExport(app.endOfUseDate),
      planningDate: formatDateForJsonExport(app.planningDate),
      lastSovereigntyAssessmentAt: formatDateForJsonExport(app.lastSovereigntyAssessmentAt),
      createdAt: formatDateForJsonExport(app.createdAt),
      updatedAt: formatDateForJsonExport(app.updatedAt),
      // Array fields
      technologyStack: app.technologyStack || [],
      // Enum fields
      sevenRStrategy: app.sevenRStrategy || undefined,
      timeCategory: app.timeCategory || undefined,
      // Beziehungen als verschachtelte Objekte
      owners: app.owners || [],
      supportsCapabilities: app.supportsCapabilities || [],
      supportsBusinessProcesses: app.supportsBusinessProcesses || [],
      usesDataObjects: app.usesDataObjects || [],
      sourceOfInterfaces: app.sourceOfInterfaces || [],
      targetOfInterfaces: app.targetOfInterfaces || [],
      partOfArchitectures: app.partOfArchitectures || [],
      depictedInDiagrams: app.depictedInDiagrams || [],
      parents: app.parents || [],
      components: app.components || [],
      predecessors: app.predecessors || [],
      successors: app.successors || [],
      implementsPrinciples: app.implementsPrinciples || [],
      hostedOn: app.hostedOn || [],
      isDataSourceFor: app.isDataSourceFor || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Applications für JSON-Export')
  }
}

/**
 * Holt Data Objects für JSON-Export mit vollständigen Daten
 */
export const fetchDataObjectsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_DATA_OBJECTS,
      variables: { where: companyWhere('dataObjects', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.dataObjects?.map((obj: any) => ({
      id: obj.id,
      name: obj.name || '',
      description: obj.description || '',
      classification: obj.classification || '',
      format: obj.format || '',
      sovereigntyReqWeight: obj.sovereigntyReqWeight || undefined,
      sovereigntyReqStrategicAutonomy: obj.sovereigntyReqStrategicAutonomy || undefined,
      sovereigntyReqResilience: obj.sovereigntyReqResilience || undefined,
      sovereigntyReqSecurity: obj.sovereigntyReqSecurity || undefined,
      sovereigntyReqControl: obj.sovereigntyReqControl || undefined,
      sovereigntyReqStrategicAutonomyRationale: obj.sovereigntyReqStrategicAutonomyRationale || '',
      sovereigntyReqResilienceRationale: obj.sovereigntyReqResilienceRationale || '',
      sovereigntyReqSecurityRationale: obj.sovereigntyReqSecurityRationale || '',
      sovereigntyReqControlRationale: obj.sovereigntyReqControlRationale || '',
      // Date fields
      introductionDate: formatDateForJsonExport(obj.introductionDate),
      endOfLifeDate: formatDateForJsonExport(obj.endOfLifeDate),
      endOfUseDate: formatDateForJsonExport(obj.endOfUseDate),
      planningDate: formatDateForJsonExport(obj.planningDate),
      createdAt: formatDateForJsonExport(obj.createdAt),
      updatedAt: formatDateForJsonExport(obj.updatedAt),
      // Beziehungen als verschachtelte Objekte
      owners: obj.owners || [],
      dataSources: obj.dataSources || [],
      usedByApplications: obj.usedByApplications || [],
      relatedToCapabilities: obj.relatedToCapabilities || [],
      transferredInInterfaces: obj.transferredInInterfaces || [],
      relatedDataObjects:
        obj.relatedDataObjectsConnection?.edges?.map((edge: any) => ({
          id: edge.node?.id,
          name: edge.node?.name,
          exportValue: encodeDataObjectRelationshipValue(
            edge.node?.id || '',
            edge.properties?.name
          ),
          properties: edge.properties || {},
        })) ||
        obj.relatedDataObjects ||
        [],
      partOfArchitectures: obj.partOfArchitectures || [],
      depictedInDiagrams: obj.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Data Objects für JSON-Export')
  }
}

/**
 * Holt Interfaces für JSON-Export mit vollständigen Daten
 */
export const fetchInterfacesForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_APPLICATION_INTERFACES,
      variables: { where: companyWhere('interfaces', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.applicationInterfaces?.map((iface: any) => ({
      id: iface.id,
      name: iface.name || '',
      description: iface.description || '',
      interfaceType: iface.interfaceType || '',
      status: iface.status || '',
      protocol: iface.protocol || '',
      version: iface.version || '',
      // Date fields
      introductionDate: formatDateForJsonExport(iface.introductionDate),
      planningDate: formatDateForJsonExport(iface.planningDate),
      endOfUseDate: formatDateForJsonExport(iface.endOfUseDate),
      endOfLifeDate: formatDateForJsonExport(iface.endOfLifeDate),
      createdAt: formatDateForJsonExport(iface.createdAt),
      updatedAt: formatDateForJsonExport(iface.updatedAt),
      // Beziehungen als verschachtelte Objekte
      sourceApplications: iface.sourceApplications || [],
      targetApplications: iface.targetApplications || [],
      dataObjects: iface.dataObjects || [],
      owners: iface.owners || [],
      predecessors: iface.predecessors || [],
      successors: iface.successors || [],
      partOfArchitectures: iface.partOfArchitectures || [],
      depictedInDiagrams: iface.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Interfaces für JSON-Export')
  }
}

/**
 * Holt Persons für JSON-Export mit vollständigen Daten
 */
export const fetchPersonsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_PERSONS,
      variables: { where: companyWhere('persons', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.people?.map((person: any) => ({
      id: person.id,
      firstName: person.firstName || '',
      lastName: person.lastName || '',
      // Temporäres name-Feld für Export-Kompatibilität (kombiniert firstName + lastName)
      name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unbenannt',
      email: person.email || '',
      role: person.role || '',
      department: person.department || '',
      phone: person.phone || '',
      avatarUrl: person.avatarUrl || '',
      createdAt: formatDateForJsonExport(person.createdAt),
      updatedAt: formatDateForJsonExport(person.updatedAt),
      // Beziehungen als verschachtelte Objekte
      ownedApplications: person.ownedApplications || [],
      ownedDataObjects: person.ownedDataObjects || [],
      ownedCapabilities: person.ownedCapabilities || [],
      ownedArchitectures: person.ownedArchitectures || [],
      ownedDiagrams: person.ownedDiagrams || [],
      ownedInfrastructure: person.ownedInfrastructure || [],
      ownedInterfaces: person.ownedInterfaces || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Persons für JSON-Export')
  }
}

/**
 * Holt Architectures für JSON-Export mit vollständigen Daten
 */
export const fetchArchitecturesForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_ARCHITECTURES,
      variables: { where: companyWhere('architectures', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.architectures?.map((arch: any) => ({
      id: arch.id,
      name: arch.name || '',
      description: arch.description || '',
      domain: arch.domain || '',
      type: arch.type || '',
      tags: arch.tags || [],
      timestamp: formatDateForJsonExport(arch.timestamp),
      createdAt: formatDateForJsonExport(arch.createdAt),
      updatedAt: formatDateForJsonExport(arch.updatedAt),
      // Beziehungen als verschachtelte Objekte
      containsApplications: arch.containsApplications || [],
      containsCapabilities: arch.containsCapabilities || [],
      containsDataObjects: arch.containsDataObjects || [],
      containsInterfaces: arch.containsInterfaces || [],
      containsInfrastructure: arch.containsInfrastructure || [],
      owners: arch.owners || [],
      diagrams: arch.diagrams || [],
      appliedPrinciples: arch.appliedPrinciples || [],
      parentArchitecture: arch.parentArchitecture || null,
      childArchitectures: arch.childArchitectures || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Architectures für JSON-Export')
  }
}

/**
 * Holt Diagrams für JSON-Export mit vollständigen Daten (inklusive diagramJson)
 */
export const fetchDiagramsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_DIAGRAMS,
      variables: { where: companyWhere('diagrams', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.diagrams?.map((diagram: any) => ({
      id: diagram.id,
      title: diagram.title || '',
      description: diagram.description || '',
      diagramType: diagram.diagramType || '',
      diagramJson: diagram.diagramJson || '', // Vollständige Excalidraw-Daten für JSON
      diagramPng: diagram.diagramPng || '',
      createdAt: formatDateForJsonExport(diagram.createdAt),
      updatedAt: formatDateForJsonExport(diagram.updatedAt),
      // Beziehungen als verschachtelte Objekte
      containsApplications: diagram.containsApplications || [],
      containsCapabilities: diagram.containsCapabilities || [],
      containsDataObjects: diagram.containsDataObjects || [],
      containsInterfaces: diagram.containsInterfaces || [],
      containsInfrastructure: diagram.containsInfrastructure || [],
      creator: diagram.creator || null,
      architecture: diagram.architecture || null,
    }))
  } catch {
    throw new Error('Fehler beim Laden der Diagrams für JSON-Export')
  }
}

/**
 * Holt Architecture Principles für JSON-Export mit vollständigen Daten
 */
export const fetchArchitecturePrinciplesForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_ARCHITECTURE_PRINCIPLES,
      variables: { where: companyWhere('architecturePrinciples', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.architecturePrinciples?.map((principle: any) => ({
      id: principle.id,
      name: principle.name || '',
      description: principle.description || '',
      rationale: principle.rationale || '',
      implications: principle.implications || '',
      category: principle.category || '',
      priority: principle.priority || '',
      isActive: principle.isActive || false,
      tags: principle.tags || [],
      createdAt: formatDateForJsonExport(principle.createdAt),
      updatedAt: formatDateForJsonExport(principle.updatedAt),
      // Beziehungen als verschachtelte Objekte
      appliedInArchitectures: principle.appliedInArchitectures || [],
      implementedByApplications: principle.implementedByApplications || [],
      owners: principle.owners || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Architecture Principles für JSON-Export')
  }
}

/**
 * Holt Infrastructures für JSON-Export mit vollständigen Daten
 */
export const fetchInfrastructuresForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_INFRASTRUCTURES,
      variables: { where: companyWhere('infrastructures', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.infrastructures?.map((infra: any) => ({
      id: infra.id,
      name: infra.name || '',
      description: infra.description || '',
      infrastructureType: infra.infrastructureType || '',
      status: infra.status || '',
      location: infra.location || '',
      capacity: infra.capacity || '',
      costs: infra.costs || 0,
      vendor: infra.vendor || '',
      operatingSystem: infra.operatingSystem || '',
      ipAddress: infra.ipAddress || '',
      specifications: infra.specifications || '',
      maintenanceWindow: infra.maintenanceWindow || '',
      sovereigntyAchStrategicAutonomy: infra.sovereigntyAchStrategicAutonomy || undefined,
      sovereigntyAchResilience: infra.sovereigntyAchResilience || undefined,
      sovereigntyAchSecurity: infra.sovereigntyAchSecurity || undefined,
      sovereigntyAchControl: infra.sovereigntyAchControl || undefined,
      sovereigntyAchStrategicAutonomyEvidence: infra.sovereigntyAchStrategicAutonomyEvidence || '',
      sovereigntyAchResilienceEvidence: infra.sovereigntyAchResilienceEvidence || '',
      sovereigntyAchSecurityEvidence: infra.sovereigntyAchSecurityEvidence || '',
      sovereigntyAchControlEvidence: infra.sovereigntyAchControlEvidence || '',
      // Date fields
      introductionDate: formatDateForJsonExport(infra.introductionDate),
      planningDate: formatDateForJsonExport(infra.planningDate),
      endOfUseDate: formatDateForJsonExport(infra.endOfUseDate),
      endOfLifeDate: formatDateForJsonExport(infra.endOfLifeDate),
      lastSovereigntyAssessmentAt: formatDateForJsonExport(infra.lastSovereigntyAssessmentAt),
      createdAt: formatDateForJsonExport(infra.createdAt),
      updatedAt: formatDateForJsonExport(infra.updatedAt),
      // Beziehungen als verschachtelte Objekte
      hostsApplications: infra.hostsApplications || [],
      owners: infra.owners || [],
      partOfArchitectures: infra.partOfArchitectures || [],
      depictedInDiagrams: infra.depictedInDiagrams || [],
      parentInfrastructure: infra.parentInfrastructure || null,
      childInfrastructures: infra.childInfrastructures || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Infrastructures für JSON-Export')
  }
}

/**
 * Holt AI Components für JSON-Export mit vollständigen Daten
 */
export const fetchAicomponentsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_Aicomponents,
      variables: { where: companyWhere('aicomponents', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.aiComponents?.map((ai: any) => ({
      id: ai.id,
      name: ai.name || '',
      description: ai.description || '',
      aiType: ai.aiType || '',
      model: ai.model || '',
      version: ai.version || '',
      status: ai.status || '',
      accuracy: ai.accuracy || '',
      provider: ai.provider || '',
      license: ai.license || '',
      costs: ai.costs || '',
      sovereigntyAchStrategicAutonomy: ai.sovereigntyAchStrategicAutonomy || undefined,
      sovereigntyAchResilience: ai.sovereigntyAchResilience || undefined,
      sovereigntyAchSecurity: ai.sovereigntyAchSecurity || undefined,
      sovereigntyAchControl: ai.sovereigntyAchControl || undefined,
      sovereigntyAchStrategicAutonomyEvidence: ai.sovereigntyAchStrategicAutonomyEvidence || '',
      sovereigntyAchResilienceEvidence: ai.sovereigntyAchResilienceEvidence || '',
      sovereigntyAchSecurityEvidence: ai.sovereigntyAchSecurityEvidence || '',
      sovereigntyAchControlEvidence: ai.sovereigntyAchControlEvidence || '',
      // Date fields
      trainingDate: formatDateForJsonExport(ai.trainingDate),
      lastUpdated: formatDateForJsonExport(ai.lastUpdated),
      lastSovereigntyAssessmentAt: formatDateForJsonExport(ai.lastSovereigntyAssessmentAt),
      createdAt: formatDateForJsonExport(ai.createdAt),
      updatedAt: formatDateForJsonExport(ai.updatedAt),
      // Array fields
      tags: ai.tags || [],
      // Beziehungen als verschachtelte Objekte
      owners: ai.owners || [],
      supportsCapabilities: ai.supportsCapabilities || [],
      usedByApplications: ai.usedByApplications || [],
      trainedWithDataObjects: ai.trainedWithDataObjects || [],
      hostedOn: ai.hostedOn || [],
      partOfArchitectures: ai.partOfArchitectures || [],
      implementsPrinciples: ai.implementsPrinciples || [],
      depictedInDiagrams: ai.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der AI Components für JSON-Export')
  }
}

export const fetchVisionsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_VISIONS,
      variables: { where: companyWhere('visions', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.geaVisions?.map((vision: any) => ({
      id: vision.id,
      name: vision.name || '',
      visionStatement: vision.visionStatement || '',
      timeHorizon: vision.timeHorizon || '',
      year: vision.year || '',
      createdAt: formatDateForJsonExport(vision.createdAt),
      updatedAt: formatDateForJsonExport(vision.updatedAt),
      owners: vision.owners || [],
      supportsMissions: mapScoredEdges(vision.supportsMissionsConnection),
      supportedByGoals: mapScoredEdges(vision.supportedByGoalsConnection),
      supportedByValues: mapScoredEdges(vision.supportedByValuesConnection),
      partOfArchitectures: vision.partOfArchitectures || [],
      depictedInDiagrams: vision.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Visions für JSON-Export')
  }
}

export const fetchMissionsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_MISSIONS,
      variables: { where: companyWhere('missions', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.geaMissions?.map((mission: any) => ({
      id: mission.id,
      name: mission.name || '',
      purposeStatement: mission.purposeStatement || '',
      keywords: mission.keywords || [],
      year: mission.year || '',
      createdAt: formatDateForJsonExport(mission.createdAt),
      updatedAt: formatDateForJsonExport(mission.updatedAt),
      owners: mission.owners || [],
      supportedByVisions: mapScoredEdges(mission.supportedByVisionsConnection),
      supportedByValues: mapScoredEdges(mission.supportedByValuesConnection),
      supportedByGoals: mapScoredEdges(mission.supportedByGoalsConnection),
      partOfArchitectures: mission.partOfArchitectures || [],
      depictedInDiagrams: mission.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Missions für JSON-Export')
  }
}

export const fetchValuesForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_VALUES,
      variables: { where: companyWhere('values', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.geaValues?.map((value: any) => ({
      id: value.id,
      name: value.name || '',
      valueStatement: value.valueStatement || '',
      createdAt: formatDateForJsonExport(value.createdAt),
      updatedAt: formatDateForJsonExport(value.updatedAt),
      owners: value.owners || [],
      supportsMissions: mapScoredEdges(value.supportsMissionsConnection),
      supportsVisions: mapScoredEdges(value.supportsVisionsConnection),
      partOfArchitectures: value.partOfArchitectures || [],
      depictedInDiagrams: value.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Values für JSON-Export')
  }
}

export const fetchGoalsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_GOALS,
      variables: { where: companyWhere('goals', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.geaGoals?.map((goal: any) => ({
      id: goal.id,
      name: goal.name || '',
      goalStatement: goal.goalStatement || '',
      createdAt: formatDateForJsonExport(goal.createdAt),
      updatedAt: formatDateForJsonExport(goal.updatedAt),
      owners: goal.owners || [],
      operationalizesVisions: mapScoredEdges(goal.operationalizesVisionsConnection),
      supportsMissions: mapScoredEdges(goal.supportsMissionsConnection),
      supportsValues: mapScoredEdges(goal.supportsValuesConnection),
      achievedByStrategies: mapScoredEdges(goal.achievedByStrategiesConnection),
      partOfArchitectures: goal.partOfArchitectures || [],
      depictedInDiagrams: goal.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Goals für JSON-Export')
  }
}

export const fetchStrategiesForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_STRATEGIES,
      variables: { where: companyWhere('strategies', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.geaStrategies?.map((strategy: any) => ({
      id: strategy.id,
      name: strategy.name || '',
      description: strategy.description || '',
      createdAt: formatDateForJsonExport(strategy.createdAt),
      updatedAt: formatDateForJsonExport(strategy.updatedAt),
      owners: strategy.owners || [],
      achievesGoals: mapScoredEdges(strategy.achievesGoalsConnection),
      partOfArchitectures: strategy.partOfArchitectures || [],
      depictedInDiagrams: strategy.depictedInDiagrams || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Strategies für JSON-Export')
  }
}

export const fetchProductFamiliesForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_PRODUCT_FAMILIES,
      variables: { where: companyWhere('productFamilies', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.productFamilies?.map((family: any) => ({
      id: family.id,
      name: family.name || '',
      category: family.category || '',
      type: family.type || '',
      createdAt: formatDateForJsonExport(family.createdAt),
      updatedAt: formatDateForJsonExport(family.updatedAt),
      softwareProducts: family.softwareProducts || [],
      hardwareProducts: family.hardwareProducts || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Product Families für JSON-Export')
  }
}

export const fetchSoftwareProductsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_SOFTWARE_PRODUCTS,
      variables: { where: companyWhere('softwareProducts', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.softwareProducts?.map((product: any) => ({
      id: product.id,
      name: product.name || '',
      lifecycleStatus: product.lifecycleStatus || '',
      isActive: product.isActive ?? undefined,
      createdAt: formatDateForJsonExport(product.createdAt),
      updatedAt: formatDateForJsonExport(product.updatedAt),
      productFamily: product.productFamily || [],
      developedBy: product.developedBy || [],
      providedBy: product.providedBy || [],
      maintainedBy: product.maintainedBy || [],
      versions: product.versions || [],
      usedByApplications: product.usedByApplications || [],
      usedByInfrastructure: product.usedByInfrastructure || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Software Products für JSON-Export')
  }
}

export const fetchSoftwareVersionsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_SOFTWARE_VERSIONS,
      variables: { where: companyWhere('softwareVersions', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.softwareVersions?.map((version: any) => ({
      id: version.id,
      name: version.name || '',
      version: version.version || '',
      releaseChannel: version.releaseChannel || '',
      supportTier: version.supportTier || '',
      isLts: version.isLts ?? undefined,
      createdAt: formatDateForJsonExport(version.createdAt),
      updatedAt: formatDateForJsonExport(version.updatedAt),
      softwareProduct: version.softwareProduct || [],
      usedByApplications: version.usedByApplications || [],
      usedByInfrastructure: version.usedByInfrastructure || [],
      lifecycleRecords: version.lifecycleRecords || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Software Versions für JSON-Export')
  }
}

export const fetchHardwareProductsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_HARDWARE_PRODUCTS,
      variables: { where: companyWhere('hardwareProducts', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.hardwareProducts?.map((product: any) => ({
      id: product.id,
      name: product.name || '',
      lifecycleStatus: product.lifecycleStatus || '',
      isActive: product.isActive ?? undefined,
      createdAt: formatDateForJsonExport(product.createdAt),
      updatedAt: formatDateForJsonExport(product.updatedAt),
      productFamily: product.productFamily || [],
      manufacturedBy: product.manufacturedBy || [],
      providedBy: product.providedBy || [],
      maintainedBy: product.maintainedBy || [],
      versions: product.versions || [],
      usedByInfrastructure: product.usedByInfrastructure || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Hardware Products für JSON-Export')
  }
}

export const fetchHardwareVersionsForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string
): Promise<JsonExportData[]> => {
  try {
    const { data } = await client.query({
      query: GET_HARDWARE_VERSIONS,
      variables: { where: companyWhere('hardwareVersions', selectedCompanyId) },
      fetchPolicy: 'cache-first',
    })

    return data.hardwareVersions?.map((version: any) => ({
      id: version.id,
      name: version.name || '',
      version: version.version || '',
      releaseChannel: version.releaseChannel || '',
      supportTier: version.supportTier || '',
      createdAt: formatDateForJsonExport(version.createdAt),
      updatedAt: formatDateForJsonExport(version.updatedAt),
      hardwareProduct: version.hardwareProduct || [],
      usedByInfrastructure: version.usedByInfrastructure || [],
      lifecycleRecords: version.lifecycleRecords || [],
    }))
  } catch {
    throw new Error('Fehler beim Laden der Hardware Versions für JSON-Export')
  }
}

/**
 * Holt alle Daten für JSON-Export mit vollständigen Beziehungsinformationen
 */
export const fetchAllDataForJson = async (
  client: ApolloClient<any>,
  selectedCompanyId?: string,
  includeGea: boolean = false
): Promise<{ [tabName: string]: JsonExportData[] }> => {
  try {
    const [
      businessCapabilities,
      businessProcesses,
      applications,
      dataObjects,
      interfaces,
      persons,
      architectures,
      diagrams,
      architecturePrinciples,
      infrastructures,
      productFamilies,
      softwareProducts,
      softwareVersions,
      hardwareProducts,
      hardwareVersions,
      aicomponents,
      visions,
      missions,
      values,
      goals,
      strategies,
    ] = await Promise.all([
      fetchBusinessCapabilitiesForJson(client, selectedCompanyId),
      fetchBusinessProcessesForJson(client, selectedCompanyId),
      fetchApplicationsForJson(client, selectedCompanyId),
      fetchDataObjectsForJson(client, selectedCompanyId),
      fetchInterfacesForJson(client, selectedCompanyId),
      fetchPersonsForJson(client, selectedCompanyId),
      fetchArchitecturesForJson(client, selectedCompanyId),
      fetchDiagramsForJson(client, selectedCompanyId),
      fetchArchitecturePrinciplesForJson(client, selectedCompanyId),
      fetchInfrastructuresForJson(client, selectedCompanyId),
      fetchProductFamiliesForJson(client, selectedCompanyId),
      fetchSoftwareProductsForJson(client, selectedCompanyId),
      fetchSoftwareVersionsForJson(client, selectedCompanyId),
      fetchHardwareProductsForJson(client, selectedCompanyId),
      fetchHardwareVersionsForJson(client, selectedCompanyId),
      fetchAicomponentsForJson(client, selectedCompanyId),
      includeGea ? fetchVisionsForJson(client, selectedCompanyId) : Promise.resolve([]),
      includeGea ? fetchMissionsForJson(client, selectedCompanyId) : Promise.resolve([]),
      includeGea ? fetchValuesForJson(client, selectedCompanyId) : Promise.resolve([]),
      includeGea ? fetchGoalsForJson(client, selectedCompanyId) : Promise.resolve([]),
      includeGea ? fetchStrategiesForJson(client, selectedCompanyId) : Promise.resolve([]),
    ])

    const baseData = {
      'Business Capabilities': businessCapabilities,
      'Business Processes': businessProcesses,
      Applications: applications,
      'Data Objects': dataObjects,
      Interfaces: interfaces,
      Persons: persons,
      Architectures: architectures,
      Diagrams: diagrams, // Vollständige Diagramme mit JSON-Daten
      'Architecture Principles': architecturePrinciples,
      Infrastructure: infrastructures,
      'Product Families': productFamilies,
      'Software Products': softwareProducts,
      'Software Versions': softwareVersions,
      'Hardware Products': hardwareProducts,
      'Hardware Versions': hardwareVersions,
      'AI Components': aicomponents,
    }

    if (!includeGea) {
      return baseData
    }

    return {
      ...baseData,
      Visions: visions,
      Missions: missions,
      Values: values,
      Goals: goals,
      Strategies: strategies,
    }
  } catch (error) {
    console.error('Fehler beim Laden aller Daten für JSON-Export:', error)
    throw error
  }
}

/**
 * Holt Daten für spezifischen Entity-Type für JSON-Export
 */
export const fetchDataByEntityTypeForJson = async (
  client: ApolloClient<any>,
  entityType: JsonEntityType | 'all',
  includeGea: boolean = false,
  selectedCompanyId?: string
): Promise<JsonExportData[] | { [tabName: string]: JsonExportData[] }> => {
  if (entityType === 'all') {
    return await fetchAllDataForJson(client, selectedCompanyId, includeGea)
  }

  switch (entityType) {
    case 'businessCapabilities':
      return await fetchBusinessCapabilitiesForJson(client, selectedCompanyId)
    case 'businessProcesses':
      return await fetchBusinessProcessesForJson(client, selectedCompanyId)
    case 'applications':
      return await fetchApplicationsForJson(client, selectedCompanyId)
    case 'dataObjects':
      return await fetchDataObjectsForJson(client, selectedCompanyId)
    case 'interfaces':
      return await fetchInterfacesForJson(client, selectedCompanyId)
    case 'persons':
      return await fetchPersonsForJson(client, selectedCompanyId)
    case 'architectures':
      return await fetchArchitecturesForJson(client, selectedCompanyId)
    case 'diagrams':
      return await fetchDiagramsForJson(client, selectedCompanyId)
    case 'architecturePrinciples':
      return await fetchArchitecturePrinciplesForJson(client, selectedCompanyId)
    case 'infrastructures':
      return await fetchInfrastructuresForJson(client, selectedCompanyId)
    case 'productFamilies':
      return await fetchProductFamiliesForJson(client, selectedCompanyId)
    case 'softwareProducts':
      return await fetchSoftwareProductsForJson(client, selectedCompanyId)
    case 'softwareVersions':
      return await fetchSoftwareVersionsForJson(client, selectedCompanyId)
    case 'hardwareProducts':
      return await fetchHardwareProductsForJson(client, selectedCompanyId)
    case 'hardwareVersions':
      return await fetchHardwareVersionsForJson(client, selectedCompanyId)
    case 'aicomponents':
      return await fetchAicomponentsForJson(client, selectedCompanyId)
    case 'visions':
      return await fetchVisionsForJson(client, selectedCompanyId)
    case 'missions':
      return await fetchMissionsForJson(client, selectedCompanyId)
    case 'values':
      return await fetchValuesForJson(client, selectedCompanyId)
    case 'goals':
      return await fetchGoalsForJson(client, selectedCompanyId)
    case 'strategies':
      return await fetchStrategiesForJson(client, selectedCompanyId)
    default:
      throw new Error(`Unbekannter Entity-Type: ${entityType}`)
  }
}

/**
 * Validiert JSON-Import-Daten gegen Schema
 */
export const validateJsonImportData = (
  data: any[],
  entityType: JsonEntityType
): ValidationResult => {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const seenIds = new Set<string>()
  let validRows = 0
  let duplicates = 0

  // Grundlegende JSON-Struktur-Validierung
  if (!Array.isArray(data)) {
    errors.push({
      row: 1,
      field: 'structure',
      message: 'JSON data must be an array',
      severity: 'error',
    })
    return {
      isValid: false,
      errors,
      warnings,
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        duplicates: 0,
      },
      fieldCoverage: {
        mandatoryFieldsPresent: [],
        mandatoryFieldsMissing: [],
        optionalFieldsPresent: [],
        optionalFieldsMissing: [],
        unmappedColumns: [],
      },
    }
  }

  // Get required and optional fields for this entity type
  const requiredFields = getRequiredFieldsByEntityType(entityType)
  const optionalFields = getOptionalFieldsByEntityType(entityType)
  const allValidFields = ['id', ...requiredFields, ...optionalFields]

  // Analyze field coverage from the first row
  const fileColumns = data.length > 0 ? Object.keys(data[0]) : []
  const mandatoryFieldsPresent = requiredFields.filter((field: string) =>
    fileColumns.includes(field)
  )
  const mandatoryFieldsMissing = requiredFields.filter(
    (field: string) => !fileColumns.includes(field)
  )
  const optionalFieldsPresent = optionalFields.filter((field: string) =>
    fileColumns.includes(field)
  )
  const optionalFieldsMissing = optionalFields.filter(
    (field: string) => !fileColumns.includes(field)
  )
  const unmappedColumns = fileColumns.filter((col: string) => !allValidFields.includes(col))

  data.forEach((row, index) => {
    const rowNumber = index + 1
    let rowIsValid = true

    // Grundlegende Struktur-Checks
    if (typeof row !== 'object' || row === null) {
      errors.push({
        row: rowNumber,
        field: 'structure',
        message: 'Each row must be an object',
        severity: 'error',
      })
      rowIsValid = false
      return
    }

    // ID-Checks
    if (!row.id) {
      errors.push({
        row: rowNumber,
        field: 'id',
        message: 'ID is required',
        severity: 'error',
      })
      rowIsValid = false
    } else if (seenIds.has(row.id)) {
      duplicates++
      errors.push({
        row: rowNumber,
        field: 'id',
        message: 'Duplicate ID found',
        severity: 'error',
      })
      rowIsValid = false
    } else {
      seenIds.add(row.id)
    }

    // Entitätsspezifische Name-Validierung
    let nameField = 'name'
    let hasValidName = false

    switch (entityType) {
      case 'diagrams':
        nameField = 'title'
        hasValidName = !!(row.title && typeof row.title === 'string' && row.title.trim() !== '')
        break
      case 'persons':
        nameField = 'firstName oder lastName'
        // Validierung: firstName ODER lastName ODER name-Feld (für Export-Kompatibilität)
        hasValidName = !!(
          (row.firstName && typeof row.firstName === 'string' && row.firstName.trim() !== '') ||
          (row.lastName && typeof row.lastName === 'string' && row.lastName.trim() !== '') ||
          (row.name && typeof row.name === 'string' && row.name.trim() !== '')
        )
        break
      default:
        hasValidName = !!(row.name && typeof row.name === 'string' && row.name.trim() !== '')
        break
    }

    if (!hasValidName) {
      // Für Personen: Versuche zusätzliche Fallback-Strategien
      if (entityType === 'persons') {
        // Falls email vorhanden ist, verwende den ersten Teil als Fallback
        if (row.email && typeof row.email === 'string' && row.email.includes('@')) {
          const emailUser = row.email.split('@')[0]
          warnings.push({
            row: rowNumber,
            field: 'name',
            message: `No name found, using email username as fallback: "${emailUser}"`,
            suggestion: 'Add firstName and/or lastName',
          })
          // Akzeptiere diese Zeile trotzdem
          hasValidName = true
        }
      }

      if (!hasValidName) {
        errors.push({
          row: rowNumber,
          field: nameField,
          message: `${nameField} is required`,
          severity: 'error',
        })
        rowIsValid = false
      }
    }

    // Validierung für spezifische Entity-Types
    switch (entityType) {
      case 'diagrams':
        // Spezielle Validierung für Diagramme
        if (row.diagramJson && typeof row.diagramJson === 'string') {
          try {
            JSON.parse(row.diagramJson)
          } catch {
            warnings.push({
              row: rowNumber,
              field: 'diagramJson',
              message: 'DiagramJson contains invalid JSON',
              suggestion: 'Check the JSON syntax of the diagram',
            })
          }
        }
        break
      case 'applications':
        // Spezielle Validierung für Applications
        if (row.criticality && !['Low', 'Medium', 'High', 'Critical'].includes(row.criticality)) {
          warnings.push({
            row: rowNumber,
            field: 'criticality',
            message: 'Invalid criticality value',
            suggestion: 'Use: Low, Medium, High, Critical',
          })
        }
        break
      // Additional specific validations can be added here
    }

    if (rowIsValid) {
      validRows++
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRows: data.length,
      validRows,
      invalidRows: data.length - validRows,
      duplicates,
    },
    fieldCoverage: {
      mandatoryFieldsPresent,
      mandatoryFieldsMissing,
      optionalFieldsPresent,
      optionalFieldsMissing,
      unmappedColumns,
    },
  }
}
