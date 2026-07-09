/**
 * JSON-spezifische Input-Erstellung und Utilities
 * Optimiert für verschachtelte Objektstrukturen aus JSON-Exporten
 */

// No need for Excel-specific updateDiagramJsonDatabaseIds function
// JSON imports use specialized ID mapping logic from importIdMappingUtils

/**
 * Generiert einen Fallback-Namen für Entitäten
 */
const generateFallbackName = (prefix: string, row: any): string => {
  return row.name || row.title || row.firstName || `${prefix} ${Date.now().toString().slice(-4)}`
}

export const validateBpmnXmlForImport = async (xml: unknown): Promise<string[]> => {
  if (typeof xml !== 'string' || !xml.trim()) {
    return []
  }

  const errors: string[] = []

  try {
    const bpmnModdleModule = (await import('bpmn-moddle')) as any
    const BpmnModdleConstructor =
      bpmnModdleModule?.BpmnModdle ??
      bpmnModdleModule?.default?.BpmnModdle ??
      bpmnModdleModule?.default?.default ??
      bpmnModdleModule?.default ??
      bpmnModdleModule

    if (typeof BpmnModdleConstructor !== 'function') {
      return ['BPMN validation library could not be initialized.']
    }

    const moddle = new BpmnModdleConstructor()
    const validationResult = (await moddle.fromXML(xml)) as any

    const rootElement = validationResult?.rootElement
    if (rootElement?.$type !== 'bpmn:Definitions') {
      errors.push('BPMN root element must be bpmn:Definitions.')
      return errors
    }

    const rootElements = Array.isArray(rootElement?.rootElements) ? rootElement.rootElements : []
    const processes = rootElements.filter((element: any) => element?.$type === 'bpmn:Process')

    if (processes.length === 0) {
      errors.push('BPMN must contain at least one bpmn:Process.')
    }

    const diagrams = Array.isArray(rootElement?.diagrams) ? rootElement.diagrams : []
    if (diagrams.length === 0) {
      errors.push('BPMN must contain at least one bpmndi:BPMNDiagram.')
    } else {
      const hasAnyPlane = diagrams.some(
        (diagram: any) => diagram?.plane?.$type === 'bpmndi:BPMNPlane'
      )
      if (!hasAnyPlane) {
        errors.push('BPMN diagram must contain a bpmndi:BPMNPlane.')
      }
    }

    processes.forEach((process: any) => {
      const flowElements = Array.isArray(process?.flowElements) ? process.flowElements : []
      const startEvents = flowElements.filter(
        (element: any) => element?.$type === 'bpmn:StartEvent'
      )
      const endEvents = flowElements.filter((element: any) => element?.$type === 'bpmn:EndEvent')

      if (startEvents.length === 0) {
        errors.push(`Process "${process?.name || process?.id || 'unknown'}" has no start event.`)
      }

      if (endEvents.length === 0) {
        errors.push(`Process "${process?.name || process?.id || 'unknown'}" has no end event.`)
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown BPMN parsing error'
    errors.push(`Invalid BPMN XML: ${message}`)
  }

  return errors
}

/**
 * Erstellt Entity-Input aus JSON-Zeile für GraphQL-Mutation
 * Berücksichtigt verschachtelte Beziehungen und vollständige Objektstrukturen
 * WICHTIG: Entfernt id und createdAt, da diese in Create-Input-Typen nicht erlaubt sind
 */
export const createEntityInputFromJson = (entityType: string, row: any): any => {
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

  const baseInput = {
    name: row.name || '',
    description: row.description || '',
    // NOTE: id and createdAt are not transferred during creation
    // id is auto-generated, createdAt is auto-set
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
  }

  const parseOptionalSovereigntyMaturity = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
      return undefined
    }

    const normalized = value.trim().toUpperCase()
    return ['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].includes(normalized)
      ? normalized
      : undefined
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
    case 'businessCapabilities':
      return {
        ...baseInput,
        // status is required field - use valid enum value
        status: ['ACTIVE', 'PLANNED', 'RETIRED'].includes(row.status) ? row.status : 'ACTIVE',
        // type is optional - use valid enum value if present
        type: ['OPERATIONAL', 'STRATEGIC', 'SUPPORT'].includes(row.type) ? row.type : undefined,
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
        // Relationships are processed in a separate step
        // owners, parents, children, supportedByApplications, etc.
      }

    case 'applications':
      return {
        ...baseInput,
        version: row.version || '',
        // status is required field - use valid enum value
        status: ['ACTIVE', 'PLANNED', 'RETIRED'].includes(row.status) ? row.status : 'ACTIVE',
        // criticality is required field - use valid enum value
        criticality: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(row.criticality)
          ? row.criticality
          : 'MEDIUM',
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
        // Enum fields
        sevenRStrategy: row.sevenRStrategy || undefined,
        timeCategory: row.timeCategory || undefined,
      }

    case 'businessProcesses':
      return {
        ...baseInput,
        processType: ['CORE', 'SUPPORT', 'MANAGEMENT'].includes(row.processType)
          ? row.processType
          : 'CORE',
        status: ['ACTIVE', 'PLANNED', 'RETIRED'].includes(row.status) ? row.status : 'ACTIVE',
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
        bpmnXml: row.bpmnXml || '',
      }

    case 'dataObjects':
      return {
        ...baseInput,
        // classification is required field - use valid enum value
        classification: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'STRICTLY_CONFIDENTIAL'].includes(
          row.classification
        )
          ? row.classification
          : 'INTERNAL',
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
      }

    case 'interfaces':
      return {
        name: generateFallbackName('Interface', row),
        description: row.description || '',
        // interfaceType is required field - use valid enum value
        interfaceType: [
          'API',
          'FILE_TRANSFER',
          'DATABASE',
          'MESSAGE_QUEUE',
          'WEB_SERVICE',
          'RPC',
          'OTHER',
        ].includes(row.interfaceType?.toUpperCase())
          ? row.interfaceType?.toUpperCase()
          : row.type?.toUpperCase() || 'OTHER',
        // status is required field - use valid enum value
        status: ['ACTIVE', 'DEPRECATED', 'IN_DEVELOPMENT', 'OUT_OF_SERVICE', 'PLANNED'].includes(
          row.status?.toUpperCase()
        )
          ? row.status?.toUpperCase()
          : 'PLANNED',
        // protocol is enum field but optional
        protocol: [
          'HTTP',
          'HTTPS',
          'FTP',
          'SFTP',
          'SOAP',
          'REST',
          'GRAPHQL',
          'TCP',
          'UDP',
          'OTHER',
        ].includes(row.protocol?.toUpperCase())
          ? row.protocol?.toUpperCase()
          : undefined,
        version: row.version || undefined,
        // Date fields
        introductionDate: row.introductionDate ? new Date(row.introductionDate) : undefined,
        planningDate: row.planningDate ? new Date(row.planningDate) : undefined,
        endOfUseDate: row.endOfUseDate ? new Date(row.endOfUseDate) : undefined,
        endOfLifeDate: row.endOfLifeDate ? new Date(row.endOfLifeDate) : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      }

    case 'persons':
      return {
        // Persons use firstName and lastName instead of name
        firstName: row.firstName || row.name || 'Unbekannt',
        lastName: row.lastName || '',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
        email: row.email || '',
        role: row.role || '',
        department: row.department || '',
        phone: row.phone || '',
        // location is not part of PersonCreateInput
      }

    case 'architectures':
      return {
        name: generateFallbackName('Architecture', row),
        description: row.description || '',
        // domain is required field - use valid enum value
        domain: [
          'APPLICATION',
          'BUSINESS',
          'DATA',
          'ENTERPRISE',
          'INTEGRATION',
          'SECURITY',
          'TECHNOLOGY',
        ].includes(row.domain?.toUpperCase())
          ? row.domain.toUpperCase()
          : 'ENTERPRISE',
        // type is required field - use valid enum value
        type: ['CONCEPTUAL', 'CURRENT_STATE', 'FUTURE_STATE', 'TRANSITION'].includes(
          row.type?.toUpperCase()
        )
          ? row.type.toUpperCase()
          : 'CURRENT_STATE',
        // timestamp is required field - use current time or given time
        timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
        tags: Array.isArray(row.tags) ? row.tags : [],
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      }

    case 'diagrams': {
      // For JSON imports, ID mapping is done via importIdMappingUtils
      // nicht über die Excel-spezifische updateDiagramJsonDatabaseIds Funktion
      return {
        title: row.title || row.name || generateFallbackName('Diagram', row),
        description: row.description || '',
        diagramJson: row.diagramJson || '{}', // Vollständige Excalidraw-Daten
        diagramPng: row.diagramPng || undefined,
        diagramType: ['ARCHITECTURE', 'BUSINESS_PROCESS', 'DATA_FLOW', 'NETWORK', 'OTHER'].includes(
          row.diagramType?.toUpperCase()
        )
          ? row.diagramType.toUpperCase()
          : undefined,
      }
    }

    case 'architecturePrinciples':
      return {
        name: generateFallbackName('Architecture Principle', row),
        description: row.description || '',
        rationale: row.rationale || '',
        implications: row.implications || '',
        // category is required field - use valid enum value
        category: [
          'BUSINESS',
          'DATA',
          'APPLICATION',
          'TECHNOLOGY',
          'SECURITY',
          'GOVERNANCE',
        ].includes(row.category?.toUpperCase())
          ? row.category.toUpperCase()
          : 'GOVERNANCE',
        // priority is required field - use valid enum value
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(row.priority?.toUpperCase())
          ? row.priority.toUpperCase()
          : 'MEDIUM',
        // isActive is required field
        isActive: row.isActive === true || row.isActive === 'true' || row.isActive === 1,
        tags: Array.isArray(row.tags) ? row.tags : [],
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      }

    case 'infrastructures':
      return {
        name: generateFallbackName('Infrastructure', row),
        description: row.description || '',
        // infrastructureType is required field - use valid enum value
        infrastructureType: [
          'CLOUD_DATACENTER',
          'CONTAINER_HOST',
          'KUBERNETES_CLUSTER',
          'ON_PREMISE_DATACENTER',
          'PHYSICAL_SERVER',
          'VIRTUAL_MACHINE',
        ].includes(row.infrastructureType?.toUpperCase())
          ? row.infrastructureType.toUpperCase()
          : row.type?.toUpperCase() === 'SERVER' || row.type?.toUpperCase() === 'PHYSICAL_SERVER'
            ? 'PHYSICAL_SERVER'
            : 'VIRTUAL_MACHINE',
        // status is required field - use valid enum value
        status: ['ACTIVE', 'INACTIVE', 'IN_DEVELOPMENT', 'PLANNED', 'RETIRED'].includes(
          row.status?.toUpperCase()
        )
          ? row.status.toUpperCase()
          : 'PLANNED',
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
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      }

    case 'aicomponents':
      return {
        name: generateFallbackName('AI Component', row),
        description: row.description || '',
        aiType: [
          'MACHINE_LEARNING_MODEL',
          'NATURAL_LANGUAGE_MODEL',
          'COMPUTER_VISION_MODEL',
          'RECOMMENDATION_ENGINE',
          'PREDICTIVE_ANALYTICS',
          'ROBOTIC_PROCESS_AUTOMATION',
          'EXPERT_SYSTEM',
          'NEURAL_NETWORK',
          'OTHER',
        ].includes(row.aiType?.toUpperCase())
          ? row.aiType.toUpperCase()
          : 'MACHINE_LEARNING_MODEL',
        status: ['ACTIVE', 'INACTIVE', 'IN_DEVELOPMENT', 'DEPRECATED', 'PLANNED'].includes(
          row.status?.toUpperCase()
        )
          ? row.status.toUpperCase()
          : 'IN_DEVELOPMENT',
        model: row.model || '',
        version: row.version ? String(row.version) : '',
        provider: row.provider || '',
        license: row.license || '',
        accuracy:
          typeof row.accuracy === 'number'
            ? row.accuracy
            : row.accuracy && row.accuracy !== ''
              ? parseFloat(row.accuracy)
              : undefined,
        costs:
          typeof row.costs === 'number'
            ? row.costs
            : row.costs && row.costs !== ''
              ? parseFloat(row.costs)
              : undefined,
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
        tags: Array.isArray(row.tags)
          ? row.tags
          : typeof row.tags === 'string' && row.tags.trim()
            ? row.tags.split(',').map((tag: string) => tag.trim())
            : undefined,
        trainingDate: row.trainingDate ? new Date(row.trainingDate) : undefined,
        lastUpdated: row.lastUpdated ? new Date(row.lastUpdated) : undefined,
        lastSovereigntyAssessmentAt: row.lastSovereigntyAssessmentAt
          ? new Date(row.lastSovereigntyAssessmentAt)
          : undefined,
      }

    case 'visions':
      return {
        name: generateFallbackName('Vision', row),
        visionStatement: row.visionStatement || row.description || '',
        timeHorizon: row.timeHorizon || '',
        year: toYearDate(row.year),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'missions':
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

    case 'values':
      return {
        name: generateFallbackName('Value', row),
        valueStatement: row.valueStatement || row.description || '',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'goals':
      return {
        name: generateFallbackName('Goal', row),
        goalStatement: row.goalStatement || row.description || '',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'strategies':
      return {
        name: generateFallbackName('Strategy', row),
        description: row.description || '',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'softwareProducts':
      return {
        name: generateFallbackName('Software Product', row),
        lifecycleStatus: row.lifecycleStatus || undefined,
        isActive: row.isActive === true || row.isActive === 'true' || row.isActive === 1,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'softwareVersions':
      return {
        name: generateFallbackName('Software Version', row),
        version: row.version ? String(row.version) : undefined,
        releaseChannel: row.releaseChannel ? String(row.releaseChannel) : undefined,
        supportTier: row.supportTier ? String(row.supportTier) : undefined,
        isLts: row.isLts === true || row.isLts === 'true' || row.isLts === 1,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'hardwareProducts':
      return {
        name: generateFallbackName('Hardware Product', row),
        lifecycleStatus: row.lifecycleStatus || undefined,
        isActive: row.isActive === true || row.isActive === 'true' || row.isActive === 1,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'hardwareVersions':
      return {
        name: generateFallbackName('Hardware Version', row),
        version: row.version ? String(row.version) : undefined,
        releaseChannel: row.releaseChannel ? String(row.releaseChannel) : undefined,
        supportTier: row.supportTier ? String(row.supportTier) : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }

    case 'productFamilies': {
      const normalizedType = typeof row.type === 'string' ? row.type.trim().toUpperCase() : ''
      const normalizedCategory =
        typeof row.category === 'string' ? row.category.trim().toUpperCase() : ''

      return {
        name: generateFallbackName('Product Family', row),
        type: ['SOFTWARE', 'HARDWARE'].includes(normalizedType) ? normalizedType : 'SOFTWARE',
        category: normalizedCategory || 'OPERATING_PLATFORM_SOFTWARE',
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
      }
    }

    default:
      return baseInput
  }
}

/**
 * Transformiert verschachtelte Beziehungen aus JSON zu IDs
 * Wird für das Mapping von Beziehungen verwendet
 */
export const extractRelationshipIds = (relationshipData: any): string[] => {
  if (!relationshipData) return []

  if (Array.isArray(relationshipData)) {
    return relationshipData
      .map(item => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item !== null && 'id' in item) return item.id
        return null
      })
      .filter(id => id !== null) as string[]
  }

  if (
    typeof relationshipData === 'object' &&
    relationshipData !== null &&
    'id' in relationshipData
  ) {
    return [relationshipData.id]
  }

  if (typeof relationshipData === 'string') {
    return [relationshipData]
  }

  return []
}

/**
 * Erstellt ein Fallback-Name wenn der Name leer ist
 * Besonders wichtig für JSON-Importe mit fehlenden Namen
 */
export const generateFallbackNameForJson = (
  entityType: string,
  row: any,
  index: number
): string => {
  // Try existing name first
  if (row.name && typeof row.name === 'string' && row.name.trim() !== '') {
    return row.name.trim()
  }

  // Fallback based on other properties
  const fallbacks: { [key: string]: string[] } = {
    businessCapabilities: ['level', 'description'],
    businessProcesses: ['processType', 'category', 'description'],
    applications: ['type', 'technology', 'version'],
    dataObjects: ['type', 'format', 'description'],
    interfaces: ['type', 'protocol', 'description'],
    persons: ['email', 'role', 'department'],
    architectures: ['type', 'version', 'description'],
    diagrams: ['type', 'version', 'description'],
    architecturePrinciples: ['category', 'priority', 'description'],
    infrastructures: ['type', 'technology', 'location'],
    productFamilies: ['category', 'type', 'description'],
    softwareProducts: ['lifecycleStatus', 'description'],
    softwareVersions: ['version', 'releaseChannel', 'supportTier'],
    hardwareProducts: ['lifecycleStatus', 'description'],
    hardwareVersions: ['version', 'releaseChannel', 'supportTier'],
    visions: ['visionStatement', 'timeHorizon', 'description'],
    missions: ['purposeStatement', 'keywords', 'description'],
    values: ['valueStatement', 'description'],
    goals: ['goalStatement', 'description'],
    strategies: ['description'],
  }

  const fallbackFields = fallbacks[entityType] || ['description']

  for (const field of fallbackFields) {
    if (row[field] && typeof row[field] === 'string' && row[field].trim() !== '') {
      const value = row[field].trim()
      return `${entityType.slice(0, -1)} ${value.substring(0, 30)}...`
    }
  }

  // Letzter Fallback: Typ + Index
  return `${entityType.slice(0, -1)} ${index + 1}`
}

/**
 * Bereinigt JSON-Import-Daten für bessere Verarbeitung
 */
export const sanitizeJsonImportData = (data: any[]): any[] => {
  return data.map((row, index) => {
    const sanitized = { ...row }

    // Ensure that value is present
    if (!sanitized.id || sanitized.id.trim() === '') {
      sanitized.id = `generated-${Date.now()}-${index}`
    }

    // Clean empty strings to null
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === '' || sanitized[key] === undefined) {
        sanitized[key] = null
      }
    })

    // Ensure that date fields are correctly formatted
    const dateFields = [
      'createdAt',
      'updatedAt',
      'introductionDate',
      'endOfLifeDate',
      'installationDate',
    ]
    dateFields.forEach(field => {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        try {
          new Date(sanitized[field]) // Validiere Datum
        } catch {
          sanitized[field] = null // Ungültige Daten zu null
        }
      }
    })

    return sanitized
  })
}

/**
 * Erstellt Beziehungs-Input aus JSON-Daten für Update-Operationen
 * Extrahiert nur die Beziehungsfelder für die Update-Mutation
 */
export const createRelationshipInputFromJson = (
  entityType: string,
  row: any,
  entityMappings: { [key: string]: string }
): any => {
  switch (entityType) {
    case 'businessCapabilities': {
      const relationshipInput: any = {}

      // Owners (Person-Beziehungen)
      if (row.owners && Array.isArray(row.owners)) {
        const ownerIds = extractRelationshipIds(row.owners)
        if (ownerIds.length > 0) {
          relationshipInput.owners = {
            connect: ownerIds.map(id => ({ where: { node: { id: entityMappings[id] || id } } })),
          }
        }
      }

      // Parents (Business Capability Hierarchie)
      if (row.parents && Array.isArray(row.parents)) {
        const parentIds = extractRelationshipIds(row.parents)
        if (parentIds.length > 0) {
          relationshipInput.parents = {
            connect: parentIds.map(id => ({ where: { node: { id: entityMappings[id] || id } } })),
          }
        }
      }

      // Children (Business Capability Hierarchie)
      if (row.children && Array.isArray(row.children)) {
        const childIds = extractRelationshipIds(row.children)
        if (childIds.length > 0) {
          relationshipInput.children = {
            connect: childIds.map(id => ({ where: { node: { id: entityMappings[id] || id } } })),
          }
        }
      }

      // Supported by Applications
      if (row.supportedByApplications && Array.isArray(row.supportedByApplications)) {
        const appIds = extractRelationshipIds(row.supportedByApplications)
        if (appIds.length > 0) {
          relationshipInput.supportedByApplications = {
            connect: appIds.map(id => ({ where: { node: { id: entityMappings[id] || id } } })),
          }
        }
      }

      // Related Data Objects
      if (row.relatedDataObjects && Array.isArray(row.relatedDataObjects)) {
        const dataObjectIds = extractRelationshipIds(row.relatedDataObjects)
        if (dataObjectIds.length > 0) {
          relationshipInput.relatedDataObjects = {
            connect: dataObjectIds.map(id => ({
              where: { node: { id: entityMappings[id] || id } },
            })),
          }
        }
      }

      // Part of Architectures
      if (row.partOfArchitectures && Array.isArray(row.partOfArchitectures)) {
        const archIds = extractRelationshipIds(row.partOfArchitectures)
        if (archIds.length > 0) {
          relationshipInput.partOfArchitectures = {
            connect: archIds.map(id => ({ where: { node: { id: entityMappings[id] || id } } })),
          }
        }
      }

      return relationshipInput
    }

    // Additional entity types can be added here
    case 'applications':
      // TODO: Application relationships
      return {}

    case 'dataObjects':
      // TODO: DataObject relationships
      return {}

    default:
      return {}
  }
}
export const validateJsonEntityStructure = (
  data: any[],
  entityType: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!Array.isArray(data)) {
    errors.push('Daten müssen ein Array sein')
    return { isValid: false, errors }
  }

  const requiredFields: { [key: string]: string[] } = {
    businessCapabilities: ['id', 'name'],
    businessProcesses: ['id', 'name'],
    applications: ['id', 'name'],
    dataObjects: ['id', 'name'],
    interfaces: ['id', 'name'],
    persons: ['id', 'name'],
    architectures: ['id', 'name'],
    diagrams: ['id', 'name'],
    architecturePrinciples: ['id', 'name'],
    infrastructures: ['id', 'name'],
    productFamilies: ['id', 'name'],
    softwareProducts: ['id', 'name'],
    softwareVersions: ['id', 'name'],
    hardwareProducts: ['id', 'name'],
    hardwareVersions: ['id', 'name'],
    visions: ['id', 'name'],
    missions: ['id', 'name'],
    values: ['id', 'name'],
    goals: ['id', 'name'],
    strategies: ['id', 'name'],
  }

  const required = requiredFields[entityType] || ['id', 'name']

  data.forEach((row, index) => {
    if (typeof row !== 'object' || row === null) {
      errors.push(`Zeile ${index + 1}: Muss ein Objekt sein`)
      return
    }

    required.forEach(field => {
      if (!row[field] || (typeof row[field] === 'string' && row[field].trim() === '')) {
        errors.push(`Zeile ${index + 1}: Feld '${field}' ist erforderlich`)
      }
    })
  })

  return { isValid: errors.length === 0, errors }
}
