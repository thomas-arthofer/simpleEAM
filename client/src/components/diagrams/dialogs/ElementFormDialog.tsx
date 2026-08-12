'use client'

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { ExcalidrawElement } from '../types/relationshipTypes'

// Import der Form-Komponenten (alle einheitlich als Forms)
import ApplicationForm, { ApplicationFormValues } from '../../applications/ApplicationForm'
import CapabilityForm, { CapabilityFormValues } from '../../capabilities/CapabilityForm'
import DataObjectForm, { DataObjectFormValues } from '../../dataobjects/DataObjectForm'
import InfrastructureForm, {
  InfrastructureFormValues,
} from '../../infrastructure/InfrastructureForm'
import ApplicationInterfaceForm, {
  ApplicationInterfaceFormValues,
} from '../../interfaces/ApplicationInterfaceForm'
import AicomponentForm, { AicomponentFormValues } from '../../aicomponents/AicomponentForm'

// Import der GraphQL-Queries
import { GET_APPLICATION, GET_APPLICATIONS } from '@/graphql/application'
import { GET_CAPABILITY, GET_CAPABILITIES } from '@/graphql/capability'
import { GET_APPLICATION_INTERFACE } from '@/graphql/applicationInterface'
import { GET_INFRASTRUCTURE } from '@/graphql/infrastructure'
import { GET_DATA_OBJECT } from '@/graphql/dataObject'
import { GET_Aicomponent } from '@/graphql/aicomponent'

// Import der Mutations
import { UPDATE_APPLICATION } from '@/graphql/application'
import { UPDATE_CAPABILITY } from '@/graphql/capability'
import { UPDATE_INFRASTRUCTURE } from '@/graphql/infrastructure'
import { UPDATE_DATA_OBJECT } from '@/graphql/dataObject'
import { UPDATE_APPLICATION_INTERFACE } from '@/graphql/applicationInterface'
import { UPDATE_Aicomponent } from '@/graphql/aicomponent'
import { buildDataObjectRelationshipConnectInput } from '@/utils/dataObjectRelationshipUtils'

interface ElementFormDialogProps {
  element: ExcalidrawElement | null
  mode: 'view' | 'edit'
  isOpen: boolean
  onClose: () => void
  onElementUpdated?: (updatedName: string) => void
}

interface CustomData {
  databaseId?: string
  elementType?: string // Changed from 'type' to 'elementType'
}

export default function ElementFormDialog({
  element,
  mode,
  isOpen,
  onClose,
  onElementUpdated,
}: ElementFormDialogProps) {
  const [currentMode, setCurrentMode] = useState<'view' | 'edit'>(mode)

  // Reset mode when props change
  useEffect(() => {
    setCurrentMode(mode)
  }, [mode])

  if (!element || !isOpen) {
    return null
  }

  const customData = element.customData as CustomData
  const databaseId = customData?.databaseId
  const elementType = customData?.elementType // Changed from 'type' to 'elementType'

  if (!databaseId || !elementType) {
    console.warn('Element has no database ID or elementType:', element)
    return null
  }

  const handleEditMode = () => {
    setCurrentMode('edit')
  }

  const handleClose = () => {
    setCurrentMode(mode) // Reset to original mode
    onClose()
  }

  // Render appropriate form based on element type
  switch (elementType.toLowerCase()) {
    case 'application':
      return (
        <ApplicationFormWrapper
          databaseId={databaseId}
          mode={currentMode}
          isOpen={isOpen}
          onClose={handleClose}
          onEditMode={handleEditMode}
          onElementUpdated={onElementUpdated}
        />
      )

    case 'business capability':
    case 'businesscapability':
    case 'businessCapability':
      return (
        <CapabilityFormWrapper
          databaseId={databaseId}
          mode={currentMode}
          isOpen={isOpen}
          onClose={handleClose}
          onEditMode={handleEditMode}
          onElementUpdated={onElementUpdated}
        />
      )

    case 'data object':
    case 'dataobject':
      return (
        <DataObjectFormWrapper
          databaseId={databaseId}
          mode={currentMode}
          isOpen={isOpen}
          onClose={handleClose}
          onEditMode={handleEditMode}
          onElementUpdated={onElementUpdated}
        />
      )

    case 'application interface':
    case 'applicationinterface':
    case 'interface':
      return (
        <InterfaceFormWrapper
          databaseId={databaseId}
          mode={currentMode}
          isOpen={isOpen}
          onClose={handleClose}
          onEditMode={handleEditMode}
          onElementUpdated={onElementUpdated}
        />
      )

    case 'infrastructure':
      return (
        <InfrastructureFormWrapper
          databaseId={databaseId}
          mode={currentMode}
          isOpen={isOpen}
          onClose={handleClose}
          onEditMode={handleEditMode}
          onElementUpdated={onElementUpdated}
        />
      )

    case 'aicomponent':
    case 'ai component':
      return (
        <AiComponentFormWrapper
          databaseId={databaseId}
          mode={currentMode}
          isOpen={isOpen}
          onClose={handleClose}
          onEditMode={handleEditMode}
          onElementUpdated={onElementUpdated}
        />
      )

    default:
      console.warn('Unknown element type:', elementType)
      return null
  }
}

// Wrapper für Application Form
function ApplicationFormWrapper({
  databaseId,
  mode,
  isOpen,
  onClose,
  onEditMode,
  onElementUpdated,
}: {
  databaseId: string
  mode: 'view' | 'edit'
  isOpen: boolean
  onClose: () => void
  onEditMode?: () => void
  onElementUpdated?: (updatedName: string) => void
}) {
  const { data, loading, error } = useQuery(GET_APPLICATION, {
    variables: { id: databaseId },
    skip: !isOpen,
  })

  // Lade alle Applikationen für die Parent/Child-Auswahl
  const {
    data: allApplicationsData,
    loading: allApplicationsLoading,
    error: allApplicationsError,
  } = useQuery(GET_APPLICATIONS, {
    skip: !isOpen,
  })

  const [updateApplication] = useMutation(UPDATE_APPLICATION, {
    onCompleted: data => {
      console.log('🟢 [ApplicationFormWrapper] Mutation onCompleted called', data)
      const updatedName = data?.updateApplications?.applications?.[0]?.name
      if (updatedName) {
        onElementUpdated?.(updatedName)
      }
    },
    onError: error => {
      console.error('🔴 [ApplicationFormWrapper] Mutation onError called', error)
    },
  })

  const handleSubmit = async (formData: ApplicationFormValues) => {
    console.log('🔵 [ApplicationFormWrapper] handleSubmit called with formData:', formData)
    try {
      // Destructure IDs from form data
      const {
        ownerId,
        supportsCapabilityIds,
        usesDataObjectIds,
        sourceOfInterfaceIds,
        targetOfInterfaceIds,
        implementsPrincipleIds,
        parentIds,
        componentIds,
        predecessorIds,
        successorIds,
        hostedOnIds,
        ...applicationData
      } = formData

      console.log('🔵 [ApplicationFormWrapper] Transforming form data to GraphQL input format...')

      // Transform to GraphQL update format
      const input: Record<string, any> = {
        name: { set: applicationData.name },
        description: { set: applicationData.description },
        status: { set: applicationData.status },
        criticality: { set: applicationData.criticality },
        costs: { set: applicationData.costs },
        vendor: { set: applicationData.vendor },
        version: { set: applicationData.version },
        technologyStack: { set: applicationData.technologyStack },
        planningDate: { set: applicationData.planningDate },
        introductionDate: { set: applicationData.introductionDate },
        endOfUseDate: { set: applicationData.endOfUseDate },
        endOfLifeDate: { set: applicationData.endOfLifeDate },
        timeCategory: { set: applicationData.timeCategory },
        sevenRStrategy: { set: applicationData.sevenRStrategy },
        sovereigntyAchStrategicAutonomy: {
          set: applicationData.sovereigntyAchStrategicAutonomy ?? null,
        },
        sovereigntyAchResilience: { set: applicationData.sovereigntyAchResilience ?? null },
        sovereigntyAchSecurity: { set: applicationData.sovereigntyAchSecurity ?? null },
        sovereigntyAchControl: { set: applicationData.sovereigntyAchControl ?? null },
        sovereigntyAchStrategicAutonomyEvidence: {
          set: applicationData.sovereigntyAchStrategicAutonomyEvidence ?? null,
        },
        lastSovereigntyAssessmentAt: { set: applicationData.lastSovereigntyAssessmentAt ?? null },
      }

      // Transform owner relationship
      if (ownerId) {
        input.owners = {
          disconnect: [{ where: {} }],
          connect: [{ where: { node: { id: { eq: ownerId } } } }],
        }
      } else {
        input.owners = { disconnect: [{ where: {} }] }
      }

      // Transform capability relationships
      if (supportsCapabilityIds && supportsCapabilityIds.length > 0) {
        input.supportsCapabilities = {
          disconnect: [{ where: {} }],
          connect: supportsCapabilityIds.map(capId => ({
            where: { node: { id: { eq: capId } } },
          })),
        }
      } else {
        input.supportsCapabilities = { disconnect: [{ where: {} }] }
      }

      // Transform data object relationships
      if (usesDataObjectIds && usesDataObjectIds.length > 0) {
        input.usesDataObjects = {
          disconnect: [{ where: {} }],
          connect: usesDataObjectIds.map(doId => ({
            where: { node: { id: { eq: doId } } },
          })),
        }
      } else {
        input.usesDataObjects = { disconnect: [{ where: {} }] }
      }

      // Transform source interface relationships
      if (sourceOfInterfaceIds && sourceOfInterfaceIds.length > 0) {
        input.sourceOfInterfaces = {
          disconnect: [{ where: {} }],
          connect: sourceOfInterfaceIds.map(intfId => ({
            where: { node: { id: { eq: intfId } } },
          })),
        }
      } else {
        input.sourceOfInterfaces = { disconnect: [{ where: {} }] }
      }

      // Transform target interface relationships
      if (targetOfInterfaceIds && targetOfInterfaceIds.length > 0) {
        input.targetOfInterfaces = {
          disconnect: [{ where: {} }],
          connect: targetOfInterfaceIds.map(intfId => ({
            where: { node: { id: { eq: intfId } } },
          })),
        }
      } else {
        input.targetOfInterfaces = { disconnect: [{ where: {} }] }
      }

      // Transform parent relationships
      if (parentIds && parentIds.length > 0) {
        input.parents = {
          disconnect: [{ where: {} }],
          connect: parentIds.map(parentId => ({
            where: { node: { id: { eq: parentId } } },
          })),
        }
      } else {
        input.parents = { disconnect: [{ where: {} }] }
      }

      // Transform component relationships
      if (componentIds && componentIds.length > 0) {
        input.components = {
          disconnect: [{ where: {} }],
          connect: componentIds.map(componentId => ({
            where: { node: { id: { eq: componentId } } },
          })),
        }
      } else {
        input.components = { disconnect: [{ where: {} }] }
      }

      // Transform predecessor relationships
      if (predecessorIds && predecessorIds.length > 0) {
        input.predecessors = {
          disconnect: [{ where: {} }],
          connect: predecessorIds.map(predecessorId => ({
            where: { node: { id: { eq: predecessorId } } },
          })),
        }
      } else {
        input.predecessors = { disconnect: [{ where: {} }] }
      }

      // Transform successor relationships
      if (successorIds && successorIds.length > 0) {
        input.successors = {
          disconnect: [{ where: {} }],
          connect: successorIds.map(successorId => ({
            where: { node: { id: { eq: successorId } } },
          })),
        }
      } else {
        input.successors = { disconnect: [{ where: {} }] }
      }

      // Transform hostedOn relationships
      if (hostedOnIds && hostedOnIds.length > 0) {
        input.hostedOn = {
          disconnect: [{ where: {} }],
          connect: hostedOnIds.map(infraId => ({
            where: { node: { id: { eq: infraId } } },
          })),
        }
      } else {
        input.hostedOn = { disconnect: [{ where: {} }] }
      }

      // Transform principle relationships
      if (implementsPrincipleIds && implementsPrincipleIds.length > 0) {
        input.implementsPrinciples = {
          disconnect: [{ where: {} }],
          connect: implementsPrincipleIds.map(principleId => ({
            where: { node: { id: { eq: principleId } } },
          })),
        }
      } else {
        input.implementsPrinciples = { disconnect: [{ where: {} }] }
      }

      console.log('🔵 [ApplicationFormWrapper] Transformed input:', input)
      console.log('🔵 [ApplicationFormWrapper] Calling updateApplication mutation...')
      const result = await updateApplication({
        variables: {
          id: databaseId,
          input,
        },
      })
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map(e => e.message).join('; '))
      }
      console.log('🟢 [ApplicationFormWrapper] Mutation completed successfully:', result)
      console.log('🔵 [ApplicationFormWrapper] Calling onClose()...')
      onClose()
      console.log('🟢 [ApplicationFormWrapper] onClose() called successfully')
    } catch (error) {
      console.error('🔴 [ApplicationFormWrapper] Error in handleSubmit:', error)
      throw error
    }
  }

  if (loading || allApplicationsLoading) return null
  if (error) {
    console.error('Error loading application:', error)
    return null
  }
  if (allApplicationsError) {
    console.error('Error loading all applications:', allApplicationsError)
    return null
  }

  const applicationData = data?.applications?.[0]

  return (
    <ApplicationForm
      data={applicationData}
      availableApplications={allApplicationsData?.applications || []}
      mode={mode}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      onEditMode={onEditMode}
      loading={false}
    />
  )
}

// Wrapper für Capability Form
function CapabilityFormWrapper({
  databaseId,
  mode,
  isOpen,
  onClose,
  onEditMode,
  onElementUpdated,
}: {
  databaseId: string
  mode: 'view' | 'edit'
  isOpen: boolean
  onClose: () => void
  onEditMode?: () => void
  onElementUpdated?: (updatedName: string) => void
}) {
  const { data, loading, error } = useQuery(GET_CAPABILITY, {
    variables: { id: databaseId },
    skip: !isOpen,
  })

  // Lade alle Capabilities für die Parent/Child-Auswahl
  const {
    data: allCapabilitiesData,
    loading: allCapabilitiesLoading,
    error: allCapabilitiesError,
  } = useQuery(GET_CAPABILITIES, {
    skip: !isOpen,
  })

  const [updateCapability] = useMutation(UPDATE_CAPABILITY, {
    onCompleted: data => {
      console.log('🟢 [CapabilityFormWrapper] Mutation onCompleted called', data)
      const updatedName = data?.updateBusinessCapabilities?.businessCapabilities?.[0]?.name
      if (updatedName) {
        onElementUpdated?.(updatedName)
      }
    },
    onError: error => {
      console.error('🔴 [CapabilityFormWrapper] Mutation onError called', error)
    },
  })

  const handleSubmit = async (formData: CapabilityFormValues) => {
    console.log('🔵 [CapabilityFormWrapper] handleSubmit called with formData:', formData)
    try {
      // Destructure IDs from form data
      const {
        ownerId,
        parentId,
        children,
        supportedByApplications,
        partOfArchitectures,
        ...capabilityData
      } = formData

      console.log('🔵 [CapabilityFormWrapper] Transforming form data to GraphQL input format...')

      // Transform to GraphQL update format
      const input: Record<string, any> = {
        name: { set: capabilityData.name },
        description: { set: capabilityData.description },
        maturityLevel: { set: capabilityData.maturityLevel },
        status: { set: capabilityData.status },
        type: { set: capabilityData.type },
        businessValue: { set: capabilityData.businessValue },
        sequenceNumber: { set: capabilityData.sequenceNumber },
        introductionDate: { set: capabilityData.introductionDate },
        endDate: { set: capabilityData.endDate },
        tags: { set: capabilityData.tags },
        sovereigntyReqStrategicAutonomy: {
          set: capabilityData.sovereigntyReqStrategicAutonomy ?? null,
        },
        sovereigntyReqResilience: { set: capabilityData.sovereigntyReqResilience ?? null },
        sovereigntyReqSecurity: { set: capabilityData.sovereigntyReqSecurity ?? null },
        sovereigntyReqControl: { set: capabilityData.sovereigntyReqControl ?? null },
        sovereigntyReqWeight: { set: capabilityData.sovereigntyReqWeight ?? null },
        sovereigntyReqStrategicAutonomyRationale: {
          set: capabilityData.sovereigntyReqStrategicAutonomyRationale ?? null,
        },
      }

      // Transform owner relationship
      if (ownerId) {
        input.owners = {
          disconnect: [{ where: {} }],
          connect: [{ where: { node: { id: { eq: ownerId } } } }],
        }
      } else {
        input.owners = { disconnect: [{ where: {} }] }
      }

      // Transform parent relationship
      if (parentId) {
        input.parents = {
          disconnect: [{ where: {} }],
          connect: [{ where: { node: { id: { eq: parentId } } } }],
        }
      } else {
        input.parents = { disconnect: [{ where: {} }] }
      }

      // Transform children relationships
      if (children && children.length > 0) {
        input.children = {
          disconnect: [{ where: {} }],
          connect: children.map(childId => ({
            where: { node: { id: { eq: childId } } },
          })),
        }
      } else {
        input.children = { disconnect: [{ where: {} }] }
      }

      // Transform application relationships
      if (supportedByApplications && supportedByApplications.length > 0) {
        input.supportedByApplications = {
          disconnect: [{ where: {} }],
          connect: supportedByApplications.map(appId => ({
            where: { node: { id: { eq: appId } } },
          })),
        }
      } else {
        input.supportedByApplications = { disconnect: [{ where: {} }] }
      }

      // Transform architecture relationships
      if (partOfArchitectures && partOfArchitectures.length > 0) {
        input.partOfArchitectures = {
          disconnect: [{ where: {} }],
          connect: partOfArchitectures.map(archId => ({
            where: { node: { id: { eq: archId } } },
          })),
        }
      } else {
        input.partOfArchitectures = { disconnect: [{ where: {} }] }
      }

      console.log('🔵 [CapabilityFormWrapper] Transformed input:', input)
      console.log('🔵 [CapabilityFormWrapper] Calling updateCapability mutation...')
      const result = await updateCapability({
        variables: {
          id: databaseId,
          input,
        },
      })
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map(e => e.message).join('; '))
      }
      console.log('🟢 [CapabilityFormWrapper] Mutation completed successfully:', result)
      console.log('🔵 [CapabilityFormWrapper] Calling onClose()...')
      onClose()
      console.log('🟢 [CapabilityFormWrapper] onClose() called successfully')
    } catch (error) {
      console.error('🔴 [CapabilityFormWrapper] Error in handleSubmit:', error)
      throw error
    }
  }

  if (loading || allCapabilitiesLoading) return null
  if (error) {
    console.error('Error loading capability:', error)
    return null
  }
  if (allCapabilitiesError) {
    console.error('Error loading all capabilities:', allCapabilitiesError)
    return null
  }

  return (
    <CapabilityForm
      data={data?.businessCapabilities?.[0]}
      availableCapabilities={allCapabilitiesData?.businessCapabilities || []}
      mode={mode}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      onEditMode={onEditMode}
      loading={false}
    />
  )
}

// Wrapper für Interface Form
function InterfaceFormWrapper({
  databaseId,
  mode,
  isOpen,
  onClose,
  onEditMode,
  onElementUpdated,
}: {
  databaseId: string
  mode: 'view' | 'edit'
  isOpen: boolean
  onClose: () => void
  onEditMode?: () => void
  onElementUpdated?: (updatedName: string) => void
}) {
  const { data, loading, error } = useQuery(GET_APPLICATION_INTERFACE, {
    variables: { id: databaseId },
    skip: !isOpen,
  })

  const [updateApplicationInterface] = useMutation(UPDATE_APPLICATION_INTERFACE, {
    onCompleted: data => {
      console.log('🟢 [InterfaceFormWrapper] Mutation onCompleted called', data)
      const updatedName = data?.updateApplicationInterfaces?.applicationInterfaces?.[0]?.name
      if (updatedName) {
        onElementUpdated?.(updatedName)
      }
    },
    onError: error => {
      console.error('🔴 [InterfaceFormWrapper] Mutation onError called', error)
    },
  })

  const handleSubmit = async (formData: ApplicationInterfaceFormValues) => {
    console.log('🔵 [InterfaceFormWrapper] handleSubmit called with formData:', formData)
    try {
      // Destructure IDs from form data with type assertion
      const { sourceApplicationId, targetApplicationId, ...interfaceData } = formData as any

      console.log('🔵 [InterfaceFormWrapper] Transforming form data to GraphQL input format...')

      // Transform to GraphQL update format
      const input: Record<string, any> = {
        name: { set: interfaceData.name },
        description: { set: interfaceData.description },
        protocol: { set: interfaceData.protocol },
        dataFormat: { set: (formData as any).dataFormat },
        frequency: { set: (formData as any).frequency },
        criticality: { set: (formData as any).criticality },
      }

      // Transform source application relationship
      if (sourceApplicationId) {
        input.sourceApplication = {
          disconnect: { where: {} },
          connect: { where: { node: { id: { eq: sourceApplicationId } } } },
        }
      } else {
        input.sourceApplication = { disconnect: { where: {} } }
      }

      // Transform target application relationship
      if (targetApplicationId) {
        input.targetApplication = {
          disconnect: { where: {} },
          connect: { where: { node: { id: { eq: targetApplicationId } } } },
        }
      } else {
        input.targetApplication = { disconnect: { where: {} } }
      }

      console.log('🔵 [InterfaceFormWrapper] Transformed input:', input)
      console.log('🔵 [InterfaceFormWrapper] Calling updateApplicationInterface mutation...')
      const result = await updateApplicationInterface({
        variables: {
          id: databaseId,
          input,
        },
      })
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map(e => e.message).join('; '))
      }
      console.log('🟢 [InterfaceFormWrapper] Mutation completed successfully:', result)
      console.log('🔵 [InterfaceFormWrapper] Calling onClose()...')
      onClose()
      console.log('🟢 [InterfaceFormWrapper] onClose() called successfully')
    } catch (error) {
      console.error('🔴 [InterfaceFormWrapper] Error in handleSubmit:', error)
      throw error
    }
  }

  if (loading) return null
  if (error) {
    console.error('Error loading application interface:', error)
    return null
  }

  return (
    <ApplicationInterfaceForm
      data={data?.applicationInterfaces?.[0]}
      mode={mode}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      onEditMode={onEditMode}
      loading={false}
    />
  )
}

// Wrapper für Infrastructure Form
function InfrastructureFormWrapper({
  databaseId,
  mode,
  isOpen,
  onClose,
  onEditMode,
  onElementUpdated,
}: {
  databaseId: string
  mode: 'view' | 'edit'
  isOpen: boolean
  onClose: () => void
  onEditMode?: () => void
  onElementUpdated?: (updatedName: string) => void
}) {
  const { data, loading, error } = useQuery(GET_INFRASTRUCTURE, {
    variables: { id: databaseId },
    skip: !isOpen,
  })

  const [updateInfrastructure] = useMutation(UPDATE_INFRASTRUCTURE, {
    onCompleted: data => {
      console.log('🟢 [InfrastructureFormWrapper] Mutation onCompleted called', data)
      const updatedName = data?.updateInfrastructures?.infrastructures?.[0]?.name
      if (updatedName) {
        onElementUpdated?.(updatedName)
      }
    },
    onError: error => {
      console.error('🔴 [InfrastructureFormWrapper] Mutation onError called', error)
    },
  })

  const handleSubmit = async (formData: InfrastructureFormValues) => {
    console.log('🔵 [InfrastructureFormWrapper] handleSubmit called with formData:', formData)
    try {
      // Destructure IDs from form data with type assertion
      const { ownerId, hostsApplications, ...infrastructureData } = formData as any

      console.log(
        '🔵 [InfrastructureFormWrapper] Transforming form data to GraphQL input format...'
      )

      // Transform to GraphQL update format
      const input: Record<string, any> = {
        name: { set: infrastructureData.name },
        description: { set: infrastructureData.description },
        infrastructureType: { set: infrastructureData.infrastructureType },
        status: { set: infrastructureData.status },
        location: { set: infrastructureData.location },
        capacity: { set: infrastructureData.capacity },
        vendor: { set: infrastructureData.vendor },
        sovereigntyAchStrategicAutonomy: {
          set: infrastructureData.sovereigntyAchStrategicAutonomy ?? null,
        },
        sovereigntyAchResilience: { set: infrastructureData.sovereigntyAchResilience ?? null },
        sovereigntyAchSecurity: { set: infrastructureData.sovereigntyAchSecurity ?? null },
        sovereigntyAchControl: { set: infrastructureData.sovereigntyAchControl ?? null },
        sovereigntyAchStrategicAutonomyEvidence: {
          set: infrastructureData.sovereigntyAchStrategicAutonomyEvidence ?? null,
        },
        lastSovereigntyAssessmentAt: {
          set: infrastructureData.lastSovereigntyAssessmentAt ?? null,
        },
      }

      // Transform owner relationship
      if (ownerId) {
        input.owners = {
          disconnect: [{ where: {} }],
          connect: [{ where: { node: { id: { eq: ownerId } } } }],
        }
      } else {
        input.owners = { disconnect: [{ where: {} }] }
      }

      // Transform hosted applications relationships
      if (hostsApplications && hostsApplications.length > 0) {
        input.hostsApplications = {
          disconnect: [{ where: {} }],
          connect: hostsApplications.map((appId: string) => ({
            where: { node: { id: { eq: appId } } },
          })),
        }
      } else {
        input.hostsApplications = { disconnect: [{ where: {} }] }
      }

      console.log('🔵 [InfrastructureFormWrapper] Transformed input:', input)
      console.log('🔵 [InfrastructureFormWrapper] Calling updateInfrastructure mutation...')
      const result = await updateInfrastructure({
        variables: {
          id: databaseId,
          input,
        },
      })
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map(e => e.message).join('; '))
      }
      console.log('🟢 [InfrastructureFormWrapper] Mutation completed successfully:', result)
      console.log('🔵 [InfrastructureFormWrapper] Calling onClose()...')
      onClose()
      console.log('🟢 [InfrastructureFormWrapper] onClose() called successfully')
    } catch (error) {
      console.error('🔴 [InfrastructureFormWrapper] Error in handleSubmit:', error)
      throw error
    }
  }

  if (loading) return null
  if (error) {
    console.error('Error loading infrastructure:', error)
    return null
  }

  return (
    <InfrastructureForm
      data={data?.infrastructures?.[0]}
      mode={mode}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      onEditMode={onEditMode}
      loading={false}
    />
  )
}

// Wrapper für DataObject Form (einheitlich wie die anderen)
function DataObjectFormWrapper({
  databaseId,
  mode,
  isOpen,
  onClose,
  onEditMode,
  onElementUpdated,
}: {
  databaseId: string
  mode: 'view' | 'edit'
  isOpen: boolean
  onClose: () => void
  onEditMode?: () => void
  onElementUpdated?: (updatedName: string) => void
}) {
  const { data, loading, error } = useQuery(GET_DATA_OBJECT, {
    variables: { where: { id: { eq: databaseId } } },
    skip: !isOpen,
  })

  const [updateDataObject] = useMutation(UPDATE_DATA_OBJECT, {
    onCompleted: data => {
      console.log('🟢 [DataObjectFormWrapper] Mutation onCompleted called', data)
      const updatedName = data?.updateDataObjects?.dataObjects?.[0]?.name
      if (updatedName) {
        onElementUpdated?.(updatedName)
      }
    },
    onError: error => {
      console.error('🔴 [DataObjectFormWrapper] Mutation onError called', error)
    },
  })

  const handleSubmit = async (formData: DataObjectFormValues) => {
    console.log('🔵 [DataObjectFormWrapper] handleSubmit called with formData:', formData)
    try {
      // Destructure IDs from form data
      const { ownerId, usedByApplications, relatedDataObjects, ...dataObjectData } = formData

      console.log('🔵 [DataObjectFormWrapper] Transforming form data to GraphQL input format...')

      // Transform to GraphQL update format
      const input: Record<string, any> = {
        name: { set: dataObjectData.name },
        description: { set: dataObjectData.description },
        dataClassification: { set: dataObjectData.classification },
        format: { set: dataObjectData.format },
        retentionPeriod: { set: (formData as any).retentionPeriod },
        sovereigntyReqStrategicAutonomy: {
          set: dataObjectData.sovereigntyReqStrategicAutonomy ?? null,
        },
        sovereigntyReqResilience: { set: dataObjectData.sovereigntyReqResilience ?? null },
        sovereigntyReqSecurity: { set: dataObjectData.sovereigntyReqSecurity ?? null },
        sovereigntyReqControl: { set: dataObjectData.sovereigntyReqControl ?? null },
        sovereigntyReqWeight: { set: dataObjectData.sovereigntyReqWeight ?? null },
        sovereigntyReqStrategicAutonomyRationale: {
          set: dataObjectData.sovereigntyReqStrategicAutonomyRationale ?? null,
        },
      }

      // Transform owner relationship
      if (ownerId) {
        input.owners = {
          disconnect: [{ where: {} }],
          connect: [{ where: { node: { id: { eq: ownerId } } } }],
        }
      } else {
        input.owners = { disconnect: [{ where: {} }] }
      }

      // Transform application relationships
      if (usedByApplications && usedByApplications.length > 0) {
        input.usedByApplications = {
          disconnect: [{ where: {} }],
          connect: usedByApplications.map(appId => ({
            where: { node: { id: { eq: appId } } },
          })),
        }
      } else {
        input.usedByApplications = { disconnect: [{ where: {} }] }
      }

      if (relatedDataObjects && relatedDataObjects.length > 0) {
        input.relatedDataObjects = {
          disconnect: [{ where: {} }],
          connect: buildDataObjectRelationshipConnectInput(relatedDataObjects),
        }
      } else {
        input.relatedDataObjects = { disconnect: [{ where: {} }] }
      }

      console.log('🔵 [DataObjectFormWrapper] Transformed input:', input)
      console.log('🔵 [DataObjectFormWrapper] Calling updateDataObject mutation...')
      const result = await updateDataObject({
        variables: {
          id: databaseId,
          input,
        },
      })
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map(e => e.message).join('; '))
      }
      console.log('🟢 [DataObjectFormWrapper] Mutation completed successfully:', result)
      console.log('🔵 [DataObjectFormWrapper] Calling onClose()...')
      onClose()
      console.log('🟢 [DataObjectFormWrapper] onClose() called successfully')
    } catch (error) {
      console.error('🔴 [DataObjectFormWrapper] Error in handleSubmit:', error)
      throw error
    }
  }

  if (loading) return null
  if (error) {
    console.error('Error loading data object:', error)
    return null
  }

  return (
    <DataObjectForm
      data={data?.dataObjects?.[0]}
      mode={mode}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      onEditMode={onEditMode}
      loading={false}
    />
  )
}

// Wrapper für AI Component Form
function AiComponentFormWrapper({
  databaseId,
  mode,
  isOpen,
  onClose,
  onEditMode,
  onElementUpdated,
}: {
  databaseId: string
  mode: 'view' | 'edit'
  isOpen: boolean
  onClose: () => void
  onEditMode?: () => void
  onElementUpdated?: (updatedName: string) => void
}) {
  const { data, loading, error } = useQuery(GET_Aicomponent, {
    variables: { id: databaseId },
    skip: !isOpen,
  })

  const [updateAiComponent] = useMutation(UPDATE_Aicomponent, {
    onCompleted: data => {
      console.log('🟢 [AiComponentFormWrapper] Mutation onCompleted called', data)
      const updatedName = data?.updateAicomponents?.aicomponents?.[0]?.name
      if (updatedName) {
        onElementUpdated?.(updatedName)
      }
    },
    onError: error => {
      console.error('🔴 [AiComponentFormWrapper] Mutation onError called', error)
    },
  })

  const handleSubmit = async (values: AicomponentFormValues) => {
    console.log('🔵 [AiComponentFormWrapper] handleSubmit called with values:', values)
    try {
      // Separate relationship IDs from base data
      const {
        ownerId,
        supportsCapabilityIds,
        usedByApplicationIds,
        trainedWithDataObjectIds,
        hostedOnIds,
        partOfArchitectureIds,
        implementsPrincipleIds,
        ...baseData
      } = values

      console.log('🔵 [AiComponentFormWrapper] Transforming form data to GraphQL input format...')

      // Prepare update input with proper scalar mutations
      const updateInput: Record<string, any> = {
        name: { set: baseData.name },
        description: { set: baseData.description },
        aiType: { set: baseData.aiType },
        status: { set: baseData.status },
        tags: { set: baseData.tags || [] },
      }

      // Handle optional fields
      if (baseData.model && baseData.model.trim() !== '') {
        updateInput.model = { set: baseData.model }
      }
      if (baseData.version && baseData.version.trim() !== '') {
        updateInput.version = { set: baseData.version }
      }
      if (baseData.provider && baseData.provider.trim() !== '') {
        updateInput.provider = { set: baseData.provider }
      }
      if (baseData.license && baseData.license.trim() !== '') {
        updateInput.license = { set: baseData.license }
      }
      if (baseData.trainingDate && baseData.trainingDate.trim() !== '') {
        updateInput.trainingDate = { set: baseData.trainingDate }
      }
      if (baseData.accuracy !== undefined) {
        updateInput.accuracy = { set: baseData.accuracy }
      }
      if (baseData.costs !== undefined) {
        updateInput.costs = { set: baseData.costs }
      }

      // Sovereignty fields
      updateInput.sovereigntyAchStrategicAutonomy = {
        set: baseData.sovereigntyAchStrategicAutonomy ?? null,
      }
      updateInput.sovereigntyAchResilience = { set: baseData.sovereigntyAchResilience ?? null }
      updateInput.sovereigntyAchSecurity = { set: baseData.sovereigntyAchSecurity ?? null }
      updateInput.sovereigntyAchControl = { set: baseData.sovereigntyAchControl ?? null }
      updateInput.sovereigntyAchStrategicAutonomyEvidence = {
        set: baseData.sovereigntyAchStrategicAutonomyEvidence ?? null,
      }
      updateInput.lastSovereigntyAssessmentAt = {
        set: baseData.lastSovereigntyAssessmentAt ?? null,
      }

      // Handle owners relationship (single owner)
      if (ownerId !== undefined) {
        if (ownerId) {
          updateInput.owners = {
            disconnect: [{ where: {} }],
            connect: [{ where: { node: { id: { eq: ownerId } } } }],
          }
        } else {
          updateInput.owners = { disconnect: [{ where: {} }] }
        }
      }

      // Handle supportsCapabilities relationship
      if (supportsCapabilityIds !== undefined) {
        if (supportsCapabilityIds.length > 0) {
          updateInput.supportsCapabilities = {
            disconnect: [{ where: {} }],
            connect: supportsCapabilityIds.map(capabilityId => ({
              where: { node: { id: { eq: capabilityId } } },
            })),
          }
        } else {
          updateInput.supportsCapabilities = { disconnect: [{ where: {} }] }
        }
      }

      // Handle usedByApplications relationship
      if (usedByApplicationIds !== undefined) {
        if (usedByApplicationIds.length > 0) {
          updateInput.usedByApplications = {
            disconnect: [{ where: {} }],
            connect: usedByApplicationIds.map(applicationId => ({
              where: { node: { id: { eq: applicationId } } },
            })),
          }
        } else {
          updateInput.usedByApplications = { disconnect: [{ where: {} }] }
        }
      }

      // Handle trainedWithDataObjects relationship
      if (trainedWithDataObjectIds !== undefined) {
        if (trainedWithDataObjectIds.length > 0) {
          updateInput.trainedWithDataObjects = {
            disconnect: [{ where: {} }],
            connect: trainedWithDataObjectIds.map(dataObjectId => ({
              where: { node: { id: { eq: dataObjectId } } },
            })),
          }
        } else {
          updateInput.trainedWithDataObjects = { disconnect: [{ where: {} }] }
        }
      }

      // Handle hostedOn relationship
      if (hostedOnIds !== undefined) {
        if (hostedOnIds.length > 0) {
          updateInput.hostedOn = {
            disconnect: [{ where: {} }],
            connect: hostedOnIds.map(infraId => ({
              where: { node: { id: { eq: infraId } } },
            })),
          }
        } else {
          updateInput.hostedOn = { disconnect: [{ where: {} }] }
        }
      }

      // Handle partOfArchitectures relationship
      if (partOfArchitectureIds !== undefined) {
        if (partOfArchitectureIds.length > 0) {
          updateInput.partOfArchitectures = {
            disconnect: [{ where: {} }],
            connect: partOfArchitectureIds.map(archId => ({
              where: { node: { id: { eq: archId } } },
            })),
          }
        } else {
          updateInput.partOfArchitectures = { disconnect: [{ where: {} }] }
        }
      }

      // Handle implementsPrinciples relationship
      if (implementsPrincipleIds !== undefined) {
        if (implementsPrincipleIds.length > 0) {
          updateInput.implementsPrinciples = {
            disconnect: [{ where: {} }],
            connect: implementsPrincipleIds.map(principleId => ({
              where: { node: { id: { eq: principleId } } },
            })),
          }
        } else {
          updateInput.implementsPrinciples = { disconnect: [{ where: {} }] }
        }
      }

      console.log('🔵 [AiComponentFormWrapper] Transformed input:', updateInput)
      console.log('🔵 [AiComponentFormWrapper] Calling updateAiComponent mutation...')
      const result = await updateAiComponent({
        variables: {
          where: { id: databaseId },
          update: updateInput,
        },
      })
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map(e => e.message).join('; '))
      }
      console.log('🟢 [AiComponentFormWrapper] Mutation completed successfully:', result)
      console.log('🔵 [AiComponentFormWrapper] Calling onClose()...')
      onClose()
      console.log('🟢 [AiComponentFormWrapper] onClose() called successfully')
    } catch (error) {
      console.error('🔴 [AiComponentFormWrapper] Error in handleSubmit:', error)
      throw error
    }
  }

  if (loading) return null
  if (error) {
    console.error('Error loading AI component:', error)
    return null
  }

  const aiComponentData = data?.aiComponents?.[0]

  return (
    <AicomponentForm
      data={aiComponentData}
      mode={mode}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      onEditMode={onEditMode}
      loading={false}
    />
  )
}
