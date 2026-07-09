import { ApolloClient } from '@apollo/client'
import { getMutationsByEntityType } from './graphql'
import {
  ApplicationStatus,
  CriticalityLevel,
  DataClassification,
  InterfaceType,
  InterfaceStatus,
  InterfaceProtocol,
  InfrastructureType,
  InfrastructureStatus,
  ArchitectureDomain,
  ArchitectureType,
  PrincipleCategory,
  PrinciplePriority,
  CapabilityStatus,
  CapabilityType,
  AiComponentType,
  AiComponentStatus,
  ProcessType,
  ProcessStatus,
  SovereigntyMaturity,
} from '../../gql/generated'
import {
  encodeDataObjectRelationshipValue,
  parseDataObjectRelationshipValue,
} from '../../utils/dataObjectRelationshipUtils'

// Helper function to parse comma-separated relationship IDs
export const parseRelationshipIds = (value: string | undefined | null): string[] => {
  if (!value || typeof value !== 'string') return []
  return value
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0)
}

// Helper function to get relationship field names for each entity type
export const getRelationshipFields = (entityType: string): string[] => {
  switch (entityType) {
    case 'businessCapabilities':
      return [
        'owners',
        'parents',
        'children',
        'supportedByApplications',
        'partOfArchitectures',
        'relatedDataObjects',
        'depictedInDiagrams',
      ]
    case 'applications':
      return [
        'owners',
        'supportsCapabilities',
        'supportsBusinessProcesses',
        'usesDataObjects',
        'sourceOfInterfaces',
        'targetOfInterfaces',
        'partOfArchitectures',
        'depictedInDiagrams',
        'parents',
        'components',
        'predecessors',
        'successors',
        'implementsPrinciples',
        'hostedOn',
      ]
    case 'businessProcesses':
      return [
        'owners',
        'parentProcess',
        'childProcesses',
        'supportsCapabilities',
        'supportedByApplications',
        'partOfArchitectures',
        'depictedInDiagrams',
      ]
    case 'dataObjects':
      return [
        'owners',
        'dataSources',
        'usedByApplications',
        'relatedToCapabilities',
        'transferredInInterfaces',
        'relatedDataObjects',
        'partOfArchitectures',
        'depictedInDiagrams',
      ]
    case 'interfaces':
      return [
        'owners',
        'sourceApplications',
        'targetApplications',
        'dataObjects',
        'partOfArchitectures',
      ]
    case 'persons':
      return [] // Persons typically don't have relationships in our model
    case 'architectures':
      return [
        'owners',
        'containsApplications',
        'containsCapabilities',
        'containsDataObjects',
        'diagrams',
        'parentArchitecture',
      ]
    case 'diagrams':
      return ['creator', 'architecture']
    case 'architecturePrinciples':
      return ['owners', 'appliedInArchitectures', 'implementedByApplications']
    case 'infrastructures':
      return [
        'owners',
        'hostsApplications',
        'partOfArchitectures',
        'depictedInDiagrams',
        'parentInfrastructure',
        'childInfrastructures',
      ]
    case 'visions':
      return [
        'owners',
        'supportsMissions',
        'supportedByGoals',
        'supportedByValues',
        'partOfArchitectures',
        'depictedInDiagrams',
      ]
    case 'missions':
      return [
        'owners',
        'supportedByVisions',
        'supportedByValues',
        'supportedByGoals',
        'partOfArchitectures',
        'depictedInDiagrams',
      ]
    case 'values':
      return [
        'owners',
        'supportsMissions',
        'supportsVisions',
        'partOfArchitectures',
        'depictedInDiagrams',
      ]
    case 'goals':
      return [
        'owners',
        'operationalizesVisions',
        'supportsMissions',
        'supportsValues',
        'achievedByStrategies',
        'partOfArchitectures',
        'depictedInDiagrams',
      ]
    case 'strategies':
      return ['owners', 'achievesGoals', 'partOfArchitectures', 'depictedInDiagrams']
    case 'softwareProducts':
      return [
        'productFamily',
        'developedBy',
        'providedBy',
        'maintainedBy',
        'versions',
        'usedByApplications',
        'usedByInfrastructure',
      ]
    case 'softwareVersions':
      return ['softwareProduct', 'usedByApplications', 'usedByInfrastructure']
    case 'hardwareProducts':
      return [
        'productFamily',
        'manufacturedBy',
        'providedBy',
        'maintainedBy',
        'versions',
        'usedByInfrastructure',
      ]
    case 'hardwareVersions':
      return ['hardwareProduct', 'usedByInfrastructure']
    case 'productFamilies':
      return ['softwareProducts', 'hardwareProducts']
    default:
      return []
  }
}

// Helper function to transform input for UPDATE mutations (wrap scalars in { set: value })
export const transformInputForUpdate = (input: any): any => {
  const transformed: any = {}
  const nonUpdatableFields = new Set(['id', 'createdAt', 'updatedAt', '__typename'])

  for (const [key, value] of Object.entries(input)) {
    if (nonUpdatableFields.has(key)) {
      continue
    }

    if (key.includes('connect') || key.includes('disconnect') || key.includes('create')) {
      // Relationship fields - keep as is
      transformed[key] = value
    } else if (value instanceof Date) {
      // Date and DateTime scalars in update inputs use mutation wrappers
      transformed[key] = { set: value }
    } else if (Array.isArray(value)) {
      // Array fields - wrap in { set: array }
      transformed[key] = { set: value }
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      // Scalar fields - wrap in { set: value }
      transformed[key] = { set: value }
    } else {
      // Other types - keep as is
      transformed[key] = value
    }
  }

  return transformed
}

// Helper function to check if entity exists in database
export const checkEntityExists = async (
  client: ApolloClient<any>,
  entityType: string,
  id: string
): Promise<boolean> => {
  const mutations = getMutationsByEntityType(entityType)
  if (!mutations?.check) {
    throw new Error(`No check mutation found for entity type: ${entityType}`)
  }

  try {
    const result = await client.query({
      query: mutations.check,
      variables: { id },
    })

    // Check based on entity type
    switch (entityType) {
      case 'businessCapabilities':
        return result.data?.businessCapabilities?.length > 0
      case 'applications':
        return result.data?.applications?.length > 0
      case 'businessProcesses':
        return result.data?.businessProcesses?.length > 0
      case 'dataObjects':
        return result.data?.dataObjects?.length > 0
      case 'interfaces':
        return result.data?.applicationInterfaces?.length > 0
      case 'persons':
        return result.data?.people?.length > 0
      case 'architectures':
        return result.data?.architectures?.length > 0
      case 'diagrams':
        return result.data?.diagrams?.length > 0
      case 'architecturePrinciples':
        return result.data?.architecturePrinciples?.length > 0
      case 'infrastructures':
        return result.data?.infrastructures?.length > 0
      case 'aicomponents':
        return result.data?.aiComponents?.length > 0
      case 'visions':
        return result.data?.geaVisions?.length > 0
      case 'missions':
        return result.data?.geaMissions?.length > 0
      case 'values':
        return result.data?.geaValues?.length > 0
      case 'goals':
        return result.data?.geaGoals?.length > 0
      case 'strategies':
        return result.data?.geaStrategies?.length > 0
      case 'softwareProducts':
        return result.data?.softwareProducts?.length > 0
      case 'softwareVersions':
        return result.data?.softwareVersions?.length > 0
      case 'hardwareProducts':
        return result.data?.hardwareProducts?.length > 0
      case 'hardwareVersions':
        return result.data?.hardwareVersions?.length > 0
      case 'productFamilies':
        return result.data?.productFamilies?.length > 0
      default:
        return false
    }
  } catch (error) {
    console.error(`Error checking entity existence for ${entityType}:`, error)
    return false
  }
}

// Helper function to create entity input based on entity type and row data
export const createEntityInput = (entityType: string, row: any): any => {
  row = { ...row, updatedAt: new Date().toISOString() }

  const toYearDate = (value: unknown): Date | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined
    }

    if (value instanceof Date) {
      return value
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(Date.UTC(Math.trunc(value), 0, 1))
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) {
        return undefined
      }

      if (/^\d{4}$/.test(trimmed)) {
        return new Date(Date.UTC(parseInt(trimmed, 10), 0, 1))
      }

      const parsed = new Date(trimmed)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }

    return undefined
  }

  // Helper function to generate a fallback name if name is empty
  const generateFallbackName = (prefix: string, row: any): string => {
    // Für Diagramme: Verwende 'title' statt 'name'
    const nameField = entityType === 'diagrams' ? 'title' : 'name'

    if (row[nameField] && row[nameField].trim()) {
      return row[nameField].trim()
    }

    // Generate fallback name based on available data
    if (row.id && row.id.trim()) {
      return `${prefix} ${row.id}`
    }

    // Use description as fallback
    if (row.description && row.description.trim()) {
      const desc = row.description.trim()
      return desc.length > 50 ? `${desc.substring(0, 47)}...` : desc
    }

    // Last resort: use timestamp
    const fallbackName = `${prefix} ${new Date().toISOString()}`
    return fallbackName
  }

  const parseOptionalSovereigntyMaturity = (value: unknown): SovereigntyMaturity | undefined => {
    if (typeof value !== 'string') {
      return undefined
    }

    const normalized = value.trim().toUpperCase() as SovereigntyMaturity
    return Object.values(SovereigntyMaturity).includes(normalized) ? normalized : undefined
  }

  const parseOptionalNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = parseFloat(value)
      return Number.isNaN(parsed) ? undefined : parsed
    }

    return undefined
  }

  switch (entityType) {
    case 'businessCapabilities': {
      const validStatus = Object.values(CapabilityStatus).includes(
        row.status?.toUpperCase() as CapabilityStatus
      )
        ? (row.status.toUpperCase() as CapabilityStatus)
        : CapabilityStatus.ACTIVE

      const validType =
        row.type &&
        Object.values(CapabilityType).includes(row.type?.toUpperCase() as CapabilityType)
          ? (row.type.toUpperCase() as CapabilityType)
          : undefined

      return {
        name: generateFallbackName('Business Capability', row),
        description: row.description || '',
        status: validStatus,
        type: validType,
        // Numeric fields
        businessValue:
          typeof row.businessValue === 'number'
            ? row.businessValue
            : row.businessValue
              ? parseInt(row.businessValue, 10)
              : undefined,
        maturityLevel:
          typeof row.maturityLevel === 'number'
            ? row.maturityLevel
            : row.maturityLevel
              ? parseInt(row.maturityLevel, 10)
              : undefined,
        sequenceNumber:
          typeof row.sequenceNumber === 'number'
            ? row.sequenceNumber
            : row.sequenceNumber
              ? parseInt(row.sequenceNumber, 10)
              : undefined,
        sovereigntyReqStrategicAutonomy: parseOptionalSovereigntyMaturity(
          row.sovereigntyReqStrategicAutonomy
        ),
        sovereigntyReqResilience: parseOptionalSovereigntyMaturity(row.sovereigntyReqResilience),
        sovereigntyReqSecurity: parseOptionalSovereigntyMaturity(row.sovereigntyReqSecurity),
        sovereigntyReqControl: parseOptionalSovereigntyMaturity(row.sovereigntyReqControl),
        sovereigntyReqStrategicAutonomyRationale:
          row.sovereigntyReqStrategicAutonomyRationale || undefined,
        sovereigntyReqResilienceRationale: row.sovereigntyReqResilienceRationale || undefined,
        sovereigntyReqSecurityRationale: row.sovereigntyReqSecurityRationale || undefined,
        sovereigntyReqControlRationale: row.sovereigntyReqControlRationale || undefined,
        sovereigntyReqWeight: parseOptionalNumber(row.sovereigntyReqWeight),
        // Date fields
        introductionDate: row.introductionDate ? new Date(row.introductionDate) : undefined,
        endDate: row.endDate ? new Date(row.endDate) : undefined,
        // Tags-Array
        tags: Array.isArray(row.tags)
          ? row.tags
          : typeof row.tags === 'string' && row.tags.trim()
            ? row.tags.split(',').map((t: string) => t.trim())
            : undefined,
        // updatedAt für Excel
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'applications': {
      const validStatus = Object.values(ApplicationStatus).includes(
        row.status?.toUpperCase() as ApplicationStatus
      )
        ? (row.status.toUpperCase() as ApplicationStatus)
        : ApplicationStatus.ACTIVE

      const validCriticality = Object.values(CriticalityLevel).includes(
        row.criticality?.toUpperCase() as CriticalityLevel
      )
        ? (row.criticality.toUpperCase() as CriticalityLevel)
        : CriticalityLevel.MEDIUM

      return {
        name: generateFallbackName('Application', row),
        description: row.description || '',
        version: row.version ? String(row.version) : '',
        status: validStatus,
        criticality: validCriticality,
        vendor: row.vendor || '',
        // Numeric fields
        costs:
          typeof row.costs === 'number' ? row.costs : row.costs ? parseFloat(row.costs) : undefined,
        sovereigntyAchStrategicAutonomy: parseOptionalSovereigntyMaturity(
          row.sovereigntyAchStrategicAutonomy
        ),
        sovereigntyAchResilience: parseOptionalSovereigntyMaturity(row.sovereigntyAchResilience),
        sovereigntyAchSecurity: parseOptionalSovereigntyMaturity(row.sovereigntyAchSecurity),
        sovereigntyAchControl: parseOptionalSovereigntyMaturity(row.sovereigntyAchControl),
        sovereigntyAchStrategicAutonomyEvidence:
          row.sovereigntyAchStrategicAutonomyEvidence || undefined,
        sovereigntyAchResilienceEvidence: row.sovereigntyAchResilienceEvidence || undefined,
        sovereigntyAchSecurityEvidence: row.sovereigntyAchSecurityEvidence || undefined,
        sovereigntyAchControlEvidence: row.sovereigntyAchControlEvidence || undefined,
        // Date fields
        introductionDate: row.introductionDate ? new Date(row.introductionDate) : undefined,
        endOfLifeDate: row.endOfLifeDate ? new Date(row.endOfLifeDate) : undefined,
        endOfUseDate: row.endOfUseDate ? new Date(row.endOfUseDate) : undefined,
        planningDate: row.planningDate ? new Date(row.planningDate) : undefined,
        lastSovereigntyAssessmentAt: row.lastSovereigntyAssessmentAt
          ? new Date(row.lastSovereigntyAssessmentAt)
          : undefined,
        // Array fields
        technologyStack: Array.isArray(row.technologyStack)
          ? row.technologyStack
          : typeof row.technologyStack === 'string' && row.technologyStack.trim()
            ? row.technologyStack.split(',').map((t: string) => t.trim())
            : undefined,
        // updatedAt für Excel
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'businessProcesses': {
      const validProcessType = Object.values(ProcessType).includes(
        row.processType?.toUpperCase() as ProcessType
      )
        ? (row.processType.toUpperCase() as ProcessType)
        : ProcessType.CORE

      const validStatus = Object.values(ProcessStatus).includes(
        row.status?.toUpperCase() as ProcessStatus
      )
        ? (row.status.toUpperCase() as ProcessStatus)
        : ProcessStatus.ACTIVE

      return {
        name: generateFallbackName('Business Process', row),
        description: row.description || '',
        processType: validProcessType,
        status: validStatus,
        maturityLevel:
          typeof row.maturityLevel === 'number'
            ? row.maturityLevel
            : row.maturityLevel
              ? parseInt(row.maturityLevel, 10)
              : undefined,
        category: row.category || '',
        tags: Array.isArray(row.tags)
          ? row.tags
          : typeof row.tags === 'string' && row.tags.trim()
            ? row.tags.split(',').map((t: string) => t.trim())
            : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'dataObjects': {
      const validClassification = Object.values(DataClassification).includes(
        row.classification?.toUpperCase() as DataClassification
      )
        ? (row.classification.toUpperCase() as DataClassification)
        : DataClassification.INTERNAL

      return {
        name: generateFallbackName('Data Object', row),
        description: row.description || '',
        classification: validClassification,
        format: row.format || '',
        sovereigntyReqStrategicAutonomy: parseOptionalSovereigntyMaturity(
          row.sovereigntyReqStrategicAutonomy
        ),
        sovereigntyReqResilience: parseOptionalSovereigntyMaturity(row.sovereigntyReqResilience),
        sovereigntyReqSecurity: parseOptionalSovereigntyMaturity(row.sovereigntyReqSecurity),
        sovereigntyReqControl: parseOptionalSovereigntyMaturity(row.sovereigntyReqControl),
        sovereigntyReqStrategicAutonomyRationale:
          row.sovereigntyReqStrategicAutonomyRationale || undefined,
        sovereigntyReqResilienceRationale: row.sovereigntyReqResilienceRationale || undefined,
        sovereigntyReqSecurityRationale: row.sovereigntyReqSecurityRationale || undefined,
        sovereigntyReqControlRationale: row.sovereigntyReqControlRationale || undefined,
        sovereigntyReqWeight: parseOptionalNumber(row.sovereigntyReqWeight),
        // Date fields
        introductionDate: row.introductionDate ? new Date(row.introductionDate) : undefined,
        endOfLifeDate: row.endOfLifeDate ? new Date(row.endOfLifeDate) : undefined,
        endOfUseDate: row.endOfUseDate ? new Date(row.endOfUseDate) : undefined,
        planningDate: row.planningDate ? new Date(row.planningDate) : undefined,
        // updatedAt für Excel
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'interfaces': {
      const validInterfaceType = Object.values(InterfaceType).includes(
        row.interfaceType?.toUpperCase() as InterfaceType
      )
        ? (row.interfaceType.toUpperCase() as InterfaceType)
        : Object.values(InterfaceType).includes(row.type?.toUpperCase() as InterfaceType)
          ? (row.type.toUpperCase() as InterfaceType)
          : InterfaceType.OTHER

      const validStatus = Object.values(InterfaceStatus).includes(
        row.status?.toUpperCase() as InterfaceStatus
      )
        ? (row.status.toUpperCase() as InterfaceStatus)
        : InterfaceStatus.PLANNED

      const validProtocol = Object.values(InterfaceProtocol).includes(
        row.protocol?.toUpperCase() as InterfaceProtocol
      )
        ? (row.protocol.toUpperCase() as InterfaceProtocol)
        : undefined

      return {
        name: generateFallbackName('Interface', row),
        description: row.description || '',
        interfaceType: validInterfaceType,
        status: validStatus,
        protocol: validProtocol,
        version: row.version ? String(row.version) : '',
        // Date fields
        introductionDate: row.introductionDate ? new Date(row.introductionDate) : undefined,
        planningDate: row.planningDate ? new Date(row.planningDate) : undefined,
        endOfUseDate: row.endOfUseDate ? new Date(row.endOfUseDate) : undefined,
        endOfLifeDate: row.endOfLifeDate ? new Date(row.endOfLifeDate) : undefined,
      }
    }

    case 'persons':
      return {
        firstName: row.firstName || generateFallbackName('Person', row).split(' ')[0] || 'Vorname',
        lastName:
          row.lastName ||
          generateFallbackName('Person', row).split(' ').slice(1).join(' ') ||
          'Nachname',
        email: row.email || '',
        department: row.department || '',
        role: row.role || '',
        phone: row.phone || '',
        avatarUrl: row.avatarUrl || '',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'architectures': {
      const validDomain = Object.values(ArchitectureDomain).includes(
        row.domain?.toUpperCase() as ArchitectureDomain
      )
        ? (row.domain.toUpperCase() as ArchitectureDomain)
        : ArchitectureDomain.ENTERPRISE

      const validType = Object.values(ArchitectureType).includes(
        row.type?.toUpperCase() as ArchitectureType
      )
        ? (row.type.toUpperCase() as ArchitectureType)
        : ArchitectureType.CURRENT_STATE

      return {
        name: generateFallbackName('Architecture', row),
        description: row.description || '',
        domain: validDomain,
        type: validType,
        timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
        tags: row.tags ? parseRelationshipIds(row.tags) : [],
      }
    }

    case 'diagrams': {
      const baseJson =
        row.diagramJson ||
        row.content ||
        '{"elements":[],"appState":{"currentChartType":"whiteboard"}}'

      return {
        title: row.title || row.name || generateFallbackName('Diagram', row),
        description: row.description || '',
        diagramJson: baseJson,
      }
    }

    case 'architecturePrinciples': {
      const validCategory = Object.values(PrincipleCategory).includes(
        row.category?.toUpperCase() as PrincipleCategory
      )
        ? (row.category.toUpperCase() as PrincipleCategory)
        : PrincipleCategory.BUSINESS

      const validPriority = Object.values(PrinciplePriority).includes(
        row.priority?.toUpperCase() as PrinciplePriority
      )
        ? (row.priority.toUpperCase() as PrinciplePriority)
        : PrinciplePriority.MEDIUM

      const tags = row.tags
        ? row.tags
            .split(',')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
        : []

      return {
        name: generateFallbackName('Architecture Principle', row),
        description: row.description || '',
        category: validCategory,
        priority: validPriority,
        rationale: row.rationale || '',
        implications: row.implications || '',
        tags: tags,
        isActive: row.isActive === 'true' || row.isActive === true || row.isActive === 1,
      }
    }

    case 'infrastructures': {
      const validInfrastructureType = Object.values(InfrastructureType).includes(
        row.infrastructureType?.toUpperCase() as InfrastructureType
      )
        ? (row.infrastructureType.toUpperCase() as InfrastructureType)
        : Object.values(InfrastructureType).includes(row.type?.toUpperCase() as InfrastructureType)
          ? (row.type.toUpperCase() as InfrastructureType)
          : InfrastructureType.PHYSICAL_SERVER

      const validStatus = Object.values(InfrastructureStatus).includes(
        row.status?.toUpperCase() as InfrastructureStatus
      )
        ? (row.status.toUpperCase() as InfrastructureStatus)
        : InfrastructureStatus.PLANNED

      return {
        name: generateFallbackName('Infrastructure', row),
        description: row.description || '',
        infrastructureType: validInfrastructureType,
        status: validStatus,
        location: row.location || '',
        capacity: row.capacity || '',
        costs: row.costs ? parseFloat(row.costs.toString()) : undefined,
        vendor: row.vendor || '',
        sovereigntyAchStrategicAutonomy: parseOptionalSovereigntyMaturity(
          row.sovereigntyAchStrategicAutonomy
        ),
        sovereigntyAchResilience: parseOptionalSovereigntyMaturity(row.sovereigntyAchResilience),
        sovereigntyAchSecurity: parseOptionalSovereigntyMaturity(row.sovereigntyAchSecurity),
        sovereigntyAchControl: parseOptionalSovereigntyMaturity(row.sovereigntyAchControl),
        sovereigntyAchStrategicAutonomyEvidence:
          row.sovereigntyAchStrategicAutonomyEvidence || undefined,
        sovereigntyAchResilienceEvidence: row.sovereigntyAchResilienceEvidence || undefined,
        sovereigntyAchSecurityEvidence: row.sovereigntyAchSecurityEvidence || undefined,
        sovereigntyAchControlEvidence: row.sovereigntyAchControlEvidence || undefined,
        operatingSystem: row.operatingSystem || '',
        ipAddress: row.ipAddress || '',
        specifications: row.specifications || '',
        maintenanceWindow: row.maintenanceWindow || '',
        // Date fields
        introductionDate: row.introductionDate ? new Date(row.introductionDate) : undefined,
        planningDate: row.planningDate ? new Date(row.planningDate) : undefined,
        endOfUseDate: row.endOfUseDate ? new Date(row.endOfUseDate) : undefined,
        endOfLifeDate: row.endOfLifeDate ? new Date(row.endOfLifeDate) : undefined,
        lastSovereigntyAssessmentAt: row.lastSovereigntyAssessmentAt
          ? new Date(row.lastSovereigntyAssessmentAt)
          : undefined,
      }
    }

    case 'aicomponents': {
      const validAiType = Object.values(AiComponentType).includes(
        row.aiType?.toUpperCase() as AiComponentType
      )
        ? (row.aiType.toUpperCase() as AiComponentType)
        : AiComponentType.MACHINE_LEARNING_MODEL

      const validStatus = Object.values(AiComponentStatus).includes(
        row.status?.toUpperCase() as AiComponentStatus
      )
        ? (row.status.toUpperCase() as AiComponentStatus)
        : AiComponentStatus.IN_DEVELOPMENT

      return {
        name: generateFallbackName('AI Component', row),
        description: row.description || '',
        aiType: validAiType,
        model: row.model || '',
        version: row.version ? String(row.version) : '',
        status: validStatus,
        accuracy: row.accuracy && row.accuracy !== '' ? parseFloat(row.accuracy) : undefined,
        provider: row.provider || '',
        license: row.license || '',
        costs: row.costs && row.costs !== '' ? parseFloat(row.costs) : undefined,
        sovereigntyAchStrategicAutonomy: parseOptionalSovereigntyMaturity(
          row.sovereigntyAchStrategicAutonomy
        ),
        sovereigntyAchResilience: parseOptionalSovereigntyMaturity(row.sovereigntyAchResilience),
        sovereigntyAchSecurity: parseOptionalSovereigntyMaturity(row.sovereigntyAchSecurity),
        sovereigntyAchControl: parseOptionalSovereigntyMaturity(row.sovereigntyAchControl),
        sovereigntyAchStrategicAutonomyEvidence:
          row.sovereigntyAchStrategicAutonomyEvidence || undefined,
        sovereigntyAchResilienceEvidence: row.sovereigntyAchResilienceEvidence || undefined,
        sovereigntyAchSecurityEvidence: row.sovereigntyAchSecurityEvidence || undefined,
        sovereigntyAchControlEvidence: row.sovereigntyAchControlEvidence || undefined,
        tags: row.tags ? parseRelationshipIds(row.tags) : [],
        // Date fields
        trainingDate: row.trainingDate ? new Date(row.trainingDate) : undefined,
        lastUpdated: row.lastUpdated ? new Date(row.lastUpdated) : undefined,
        lastSovereigntyAssessmentAt: row.lastSovereigntyAssessmentAt
          ? new Date(row.lastSovereigntyAssessmentAt)
          : undefined,
      }
    }

    case 'visions': {
      return {
        name: generateFallbackName('Vision', row),
        visionStatement: row.visionStatement || row.description || '',
        timeHorizon: row.timeHorizon || '',
        year: toYearDate(row.year),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'missions': {
      return {
        name: generateFallbackName('Mission', row),
        purposeStatement: row.purposeStatement || row.description || '',
        keywords: Array.isArray(row.keywords)
          ? row.keywords
          : typeof row.keywords === 'string' && row.keywords.trim()
            ? row.keywords.split(',').map((k: string) => k.trim())
            : undefined,
        year: toYearDate(row.year),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'values': {
      return {
        name: generateFallbackName('Value', row),
        valueStatement: row.valueStatement || row.description || '',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'goals': {
      return {
        name: generateFallbackName('Goal', row),
        goalStatement: row.goalStatement || row.description || '',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'strategies': {
      return {
        name: generateFallbackName('Strategy', row),
        description: row.description || '',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'softwareProducts': {
      const validLifecycleStatus =
        typeof row.lifecycleStatus === 'string' && row.lifecycleStatus.trim()
          ? row.lifecycleStatus.trim().toUpperCase()
          : undefined

      return {
        name: generateFallbackName('Software Product', row),
        lifecycleStatus: validLifecycleStatus,
        isActive:
          row.isActive === true ||
          row.isActive === 'true' ||
          row.isActive === 1 ||
          row.isActive === '1',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'softwareVersions': {
      return {
        name: generateFallbackName('Software Version', row),
        version: row.version ? String(row.version) : undefined,
        releaseChannel: row.releaseChannel ? String(row.releaseChannel) : undefined,
        supportTier: row.supportTier ? String(row.supportTier) : undefined,
        isLts: row.isLts === true || row.isLts === 'true' || row.isLts === 1 || row.isLts === '1',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'hardwareProducts': {
      const validLifecycleStatus =
        typeof row.lifecycleStatus === 'string' && row.lifecycleStatus.trim()
          ? row.lifecycleStatus.trim().toUpperCase()
          : undefined

      return {
        name: generateFallbackName('Hardware Product', row),
        lifecycleStatus: validLifecycleStatus,
        isActive:
          row.isActive === true ||
          row.isActive === 'true' ||
          row.isActive === 1 ||
          row.isActive === '1',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'hardwareVersions': {
      return {
        name: generateFallbackName('Hardware Version', row),
        version: row.version ? String(row.version) : undefined,
        releaseChannel: row.releaseChannel ? String(row.releaseChannel) : undefined,
        supportTier: row.supportTier ? String(row.supportTier) : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    case 'productFamilies': {
      const normalizedType = typeof row.type === 'string' ? row.type.trim().toUpperCase() : ''
      const normalizedCategory =
        typeof row.category === 'string' ? row.category.trim().toUpperCase() : ''

      const validType = ['SOFTWARE', 'HARDWARE'].includes(normalizedType)
        ? normalizedType
        : 'SOFTWARE'

      return {
        name: generateFallbackName('Product Family', row),
        type: validType,
        category: normalizedCategory || 'OPERATING_PLATFORM_SOFTWARE',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    default:
      throw new Error(`Unsupported entity type: ${entityType}`)
  }
}

// Helper function to map relationship IDs using entity mappings
export const mapRelationshipValues = (
  row: any,
  entityType: string,
  allEntityMappings: { [originalId: string]: string }
): any => {
  const updatedRow = { ...row }
  const relationshipFields = getRelationshipFields(entityType)
  const geaEntityTypes = new Set(['visions', 'missions', 'values', 'goals', 'strategies'])

  relationshipFields.forEach(field => {
    if (row[field]) {
      if (entityType === 'dataObjects' && field === 'relatedDataObjects') {
        const mappedValues = parseRelationshipIds(
          typeof row[field] === 'string'
            ? row[field]
            : Array.isArray(row[field])
              ? row[field]
                  .map(item => {
                    if (typeof item === 'string') {
                      return item
                    }

                    if (typeof item === 'object' && item?.id) {
                      return encodeDataObjectRelationshipValue(
                        item.id,
                        item.properties?.name || item.edgeName || item.relationshipName
                      )
                    }

                    return String(item)
                  })
                  .join(',')
              : String(row[field])
        )
          .map(item => parseDataObjectRelationshipValue(item))
          .filter(item => item.id)
          .map(item =>
            encodeDataObjectRelationshipValue(allEntityMappings[item.id] || item.id, item.edgeName)
          )

        if (mappedValues.length > 0) {
          updatedRow[field] = mappedValues.join(',')
        }

        return
      }

      let relationshipItems: Array<{ id: string; score?: number }> = []

      // Handle different formats of relationship data
      if (Array.isArray(row[field])) {
        // JSON format: Array of objects with id property
        relationshipItems = row[field].reduce<Array<{ id: string; score?: number }>>(
          (acc, item: any) => {
            if (typeof item === 'string') {
              const [itemId, itemScore] = item.split(':')
              const parsedScore = Number(itemScore)
              acc.push({
                id: itemId,
                score: Number.isFinite(parsedScore) ? parsedScore : undefined,
              })
            } else if (typeof item === 'object' && item.id) {
              const directScore = item.score
              const nestedScore = item.properties?.score
              const parsedScore = Number(directScore ?? nestedScore)
              acc.push({
                id: item.id,
                score: Number.isFinite(parsedScore) ? parsedScore : undefined,
              })
            }
            return acc
          },
          []
        )
      } else if (typeof row[field] === 'string') {
        // Excel format: comma-separated string
        relationshipItems = parseRelationshipIds(row[field]).map(item => {
          const [itemId, itemScore] = item.split(':')
          const parsedScore = Number(itemScore)
          return {
            id: itemId,
            score: Number.isFinite(parsedScore) ? parsedScore : undefined,
          }
        })
      } else if (typeof row[field] === 'object' && row[field].id) {
        // Single object with id
        const parsedScore = Number(row[field].score ?? row[field].properties?.score)
        relationshipItems = [
          {
            id: row[field].id,
            score: Number.isFinite(parsedScore) ? parsedScore : undefined,
          },
        ]
      }

      if (relationshipItems.length > 0) {
        const mappedIds = relationshipItems
          .map(item => {
            const mappedId = allEntityMappings[item.id] || item.id

            if (geaEntityTypes.has(entityType) && typeof item.score === 'number') {
              return `${mappedId}:${item.score}`
            }

            return mappedId
          })
          .filter(id => id)

        if (mappedIds.length > 0) {
          updatedRow[field] = mappedIds.join(',')
        }
      }
    }
  })

  return updatedRow
}
