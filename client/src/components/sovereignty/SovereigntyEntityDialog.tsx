'use client'

import React, { useEffect } from 'react'
import { useLazyQuery, useMutation, useApolloClient, useQuery } from '@apollo/client'
import { Box, CircularProgress, Dialog, DialogContent } from '@mui/material'
import CapabilityForm, { CapabilityFormValues } from '@/components/capabilities/CapabilityForm'
import ApplicationForm, { ApplicationFormValues } from '@/components/applications/ApplicationForm'
import DataObjectForm, { DataObjectFormValues } from '@/components/dataobjects/DataObjectForm'
import AicomponentForm, { AicomponentFormValues } from '@/components/aicomponents/AicomponentForm'
import InfrastructureForm, {
  InfrastructureFormValues,
} from '@/components/infrastructure/InfrastructureForm'
import BusinessProcessForm from '@/components/business-processes/BusinessProcessForm'
import { BusinessProcessFormValues } from '@/components/business-processes/types'
import { useCompanyWhere } from '@/hooks/useCompanyWhere'
import { GET_CAPABILITY, UPDATE_CAPABILITY } from '@/graphql/capability'
import { GET_APPLICATION, UPDATE_APPLICATION } from '@/graphql/application'
import { GET_CAPABILITIES } from '@/graphql/capability'
import { GET_APPLICATIONS } from '@/graphql/application'
import { GET_DATA_OBJECT, UPDATE_DATA_OBJECT } from '@/graphql/dataObject'
import { GET_Aicomponent, UPDATE_Aicomponent } from '@/graphql/aicomponent'
import { GET_INFRASTRUCTURE, UPDATE_INFRASTRUCTURE } from '@/graphql/infrastructure'
import { GET_BUSINESS_PROCESSES, UPDATE_BUSINESS_PROCESS } from '@/graphql/businessProcess'
import { buildDataObjectRelationshipConnectInput } from '@/utils/dataObjectRelationshipUtils'
import { EntityRef } from './types'

// Builds a Neo4j relationship update (disconnect all → reconnect with new IDs).
// Use for Capability and Application handlers (non-array format).
function rel(ids: string[] | undefined) {
  const base = { disconnect: [{ where: {} }] } as Record<string, any>
  if (ids && ids.length > 0) {
    base.connect = ids.map(id => ({ where: { node: { id: { eq: id } } } }))
  }
  return base
}

// Array-wrapped variant used by DataObject and AIComponent handlers.
function relArr(ids: string[] | undefined) {
  return [rel(ids)]
}

interface Props {
  entity: EntityRef | null
  onClose: () => void
}

export default function SovereigntyEntityDialog({ entity, onClose }: Props) {
  const client = useApolloClient()
  const companyWhere = useCompanyWhere('company')

  const [fetchCapability, { data: capData, loading: capLoading }] = useLazyQuery(GET_CAPABILITY)
  const [fetchApplication, { data: appData, loading: appLoading }] = useLazyQuery(GET_APPLICATION)
  const [fetchDataObject, { data: doData, loading: doLoading }] = useLazyQuery(GET_DATA_OBJECT)
  const [fetchAicomponent, { data: aiData, loading: aiLoading }] = useLazyQuery(GET_Aicomponent)
  const [fetchInfrastructure, { data: infraData, loading: infraLoading }] =
    useLazyQuery(GET_INFRASTRUCTURE)
  const [fetchBusinessProcess, { data: bpData, loading: bpLoading }] =
    useLazyQuery(GET_BUSINESS_PROCESSES)

  const [updateCapability, { loading: capUpdating }] = useMutation(UPDATE_CAPABILITY)
  const [updateApplication, { loading: appUpdating }] = useMutation(UPDATE_APPLICATION)
  const [updateDataObject, { loading: doUpdating }] = useMutation(UPDATE_DATA_OBJECT)
  const [updateAicomponent, { loading: aiUpdating }] = useMutation(UPDATE_Aicomponent)
  const [updateInfrastructure, { loading: infraUpdating }] = useMutation(UPDATE_INFRASTRUCTURE)
  const [updateBusinessProcess, { loading: bpUpdating }] = useMutation(UPDATE_BUSINESS_PROCESS)

  const { data: applicationsListData } = useQuery(GET_APPLICATIONS, {
    variables: { where: companyWhere },
    skip: !entity || (entity.type !== 'application' && entity.type !== 'capability'),
  })

  const { data: capabilitiesListData } = useQuery(GET_CAPABILITIES, {
    variables: { where: companyWhere },
    skip: !entity || entity.type !== 'capability',
  })

  useEffect(() => {
    if (!entity) return
    switch (entity.type) {
      case 'capability':
        fetchCapability({ variables: { id: entity.id } })
        break
      case 'application':
        fetchApplication({ variables: { id: entity.id } })
        break
      case 'dataobject':
        fetchDataObject({ variables: { where: { id: { eq: entity.id } } } })
        break
      case 'aicomponent':
        fetchAicomponent({ variables: { id: entity.id } })
        break
      case 'infrastructure':
        fetchInfrastructure({ variables: { id: entity.id } })
        break
      case 'businessprocess':
        fetchBusinessProcess({ variables: { where: { id: { eq: entity.id } } } })
        break
    }
  }, [entity?.id, entity?.type]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!entity) return null

  const capabilityData = capData?.businessCapabilities?.[0] ?? null
  const applicationData = appData?.applications?.[0] ?? null
  const dataObjectData = doData?.dataObjects?.[0] ?? null
  const aiComponentData = aiData?.aiComponents?.[0] ?? null
  const infrastructureData = infraData?.infrastructures?.[0] ?? null
  const businessProcessData = bpData?.businessProcesses?.[0] ?? null

  const isLoading =
    capLoading || appLoading || doLoading || aiLoading || infraLoading || bpLoading
  const isUpdating =
    capUpdating || appUpdating || doUpdating || aiUpdating || infraUpdating || bpUpdating

  const hasCurrentData =
    (entity.type === 'capability' && capabilityData != null) ||
    (entity.type === 'application' && applicationData != null) ||
    (entity.type === 'dataobject' && dataObjectData != null) ||
    (entity.type === 'aicomponent' && aiComponentData != null) ||
    (entity.type === 'infrastructure' && infrastructureData != null) ||
    (entity.type === 'businessprocess' && businessProcessData != null)

  const afterSave = () => {
    client.refetchQueries({
      include: ['GetSovereigntyCapabilityDetail', 'GetSovereigntyDataDetail'],
    })
    onClose()
  }

  const handleCapabilitySubmit = async (data: CapabilityFormValues) => {
    if (!capabilityData) return
    const { parentId, ownerId, children, supportedByApplications, partOfArchitectures, ...base } =
      data
    const input: Record<string, any> = {
      name: { set: base.name },
      description: { set: base.description },
      maturityLevel: { set: base.maturityLevel },
      sovereigntyReqStrategicAutonomy: { set: base.sovereigntyReqStrategicAutonomy ?? null },
      sovereigntyReqResilience: { set: base.sovereigntyReqResilience ?? null },
      sovereigntyReqSecurity: { set: base.sovereigntyReqSecurity ?? null },
      sovereigntyReqControl: { set: base.sovereigntyReqControl ?? null },
      sovereigntyReqWeight: { set: base.sovereigntyReqWeight ?? null },
      sovereigntyReqStrategicAutonomyRationale: {
        set: base.sovereigntyReqStrategicAutonomyRationale ?? null,
      },
      businessValue: { set: base.businessValue },
      status: { set: base.status },
      sequenceNumber: { set: base.sequenceNumber },
      tags: { set: base.tags || [] },
      owners: rel(ownerId ? [ownerId] : []),
      parents: rel(parentId ? [parentId] : []),
      children: rel(children),
      supportedByApplications: rel(supportedByApplications),
      partOfArchitectures: rel(partOfArchitectures),
    }
    if (base.type) input.type = { set: base.type }
    if (base.introductionDate) {
      const d = base.introductionDate as any
      input.introductionDate = { set: d.toISOString ? d.toISOString().split('T')[0] : d }
    }
    if (base.endDate) {
      const d = base.endDate as any
      input.endDate = { set: d.toISOString ? d.toISOString().split('T')[0] : d }
    }
    await updateCapability({ variables: { id: capabilityData.id, input } })
    afterSave()
  }

  const handleApplicationSubmit = async (data: ApplicationFormValues) => {
    if (!applicationData) return
    const {
      ownerId,
      supportsCapabilityIds,
      supportsBusinessProcessIds,
      usesDataObjectIds,
      sourceOfInterfaceIds,
      targetOfInterfaceIds,
      implementsPrincipleIds,
      parentIds,
      componentIds,
      predecessorIds,
      successorIds,
      hostedOnIds,
      providedByIds,
      supportedByIds,
      maintainedByIds,
      ...base
    } = data
    const input: Record<string, any> = {
      name: { set: base.name },
      description: { set: base.description },
      sovereigntyAchStrategicAutonomy: { set: base.sovereigntyAchStrategicAutonomy ?? null },
      sovereigntyAchResilience: { set: base.sovereigntyAchResilience ?? null },
      sovereigntyAchSecurity: { set: base.sovereigntyAchSecurity ?? null },
      sovereigntyAchControl: { set: base.sovereigntyAchControl ?? null },
      sovereigntyAchStrategicAutonomyEvidence: {
        set: base.sovereigntyAchStrategicAutonomyEvidence ?? null,
      },
      lastSovereigntyAssessmentAt: { set: base.lastSovereigntyAssessmentAt ?? null },
      status: { set: base.status },
      criticality: { set: base.criticality },
      costs: { set: base.costs },
      vendor: { set: base.vendor },
      version: { set: base.version },
      technologyStack: { set: base.technologyStack },
      planningDate: { set: base.planningDate },
      introductionDate: { set: base.introductionDate },
      endOfUseDate: { set: base.endOfUseDate },
      endOfLifeDate: { set: base.endOfLifeDate },
      timeCategory: { set: base.timeCategory },
      sevenRStrategy: { set: base.sevenRStrategy },
      owners: rel(ownerId ? [ownerId] : []),
      supportsCapabilities: rel(supportsCapabilityIds),
      usesDataObjects: rel(usesDataObjectIds),
      sourceOfInterfaces: rel(sourceOfInterfaceIds),
      targetOfInterfaces: rel(targetOfInterfaceIds),
      parents: rel(parentIds),
      components: rel(componentIds),
      predecessors: rel(predecessorIds),
      successors: rel(successorIds),
      hostedOn: rel(hostedOnIds),
      providedBy: rel(providedByIds),
      supportedBy: rel(supportedByIds),
      maintainedBy: rel(maintainedByIds),
      implementsPrinciples: rel(implementsPrincipleIds),
    }
    if (supportsBusinessProcessIds !== undefined) {
      input.supportsBusinessProcesses = rel(supportsBusinessProcessIds)
    }
    await updateApplication({ variables: { id: applicationData.id, input } })
    afterSave()
  }

  const handleDataObjectSubmit = async (data: DataObjectFormValues) => {
    if (!dataObjectData) return
    const input: Record<string, any> = {
      name: { set: data.name },
      description: { set: data.description },
      sovereigntyReqStrategicAutonomy: { set: data.sovereigntyReqStrategicAutonomy ?? null },
      sovereigntyReqResilience: { set: data.sovereigntyReqResilience ?? null },
      sovereigntyReqSecurity: { set: data.sovereigntyReqSecurity ?? null },
      sovereigntyReqControl: { set: data.sovereigntyReqControl ?? null },
      sovereigntyReqWeight: { set: data.sovereigntyReqWeight ?? null },
      sovereigntyReqStrategicAutonomyRationale: {
        set: data.sovereigntyReqStrategicAutonomyRationale ?? null,
      },
      classification: { set: data.classification },
      format: { set: data.format },
      planningDate: { set: data.planningDate },
      introductionDate: { set: data.introductionDate },
      endOfUseDate: { set: data.endOfUseDate },
      endOfLifeDate: { set: data.endOfLifeDate },
      owners: relArr(data.ownerId ? [data.ownerId] : []),
      dataSources: relArr(data.dataSources),
      usedByApplications: relArr(data.usedByApplications),
      relatedToCapabilities: relArr(data.relatedToCapabilities),
      relatedDataObjects: data.relatedDataObjects?.length
        ? [
            {
              disconnect: [{ where: {} }],
              connect: buildDataObjectRelationshipConnectInput(data.relatedDataObjects),
            },
          ]
        : [{ disconnect: [{ where: {} }] }],
    }
    if (data.depictedInDiagrams !== undefined) {
      input.depictedInDiagrams = relArr(data.depictedInDiagrams)
    }
    await updateDataObject({ variables: { id: dataObjectData.id, input } })
    afterSave()
  }

  const handleAicomponentSubmit = async (data: AicomponentFormValues) => {
    if (!aiComponentData) return
    const {
      ownerId,
      supportsCapabilityIds,
      usedByApplicationIds,
      trainedWithDataObjectIds,
      hostedOnIds,
      providedByIds,
      supportedByIds,
      maintainedByIds,
      partOfArchitectureIds,
      implementsPrincipleIds,
      depictedInDiagramIds,
      ...base
    } = data
    const updateInput: Record<string, any> = {
      name: { set: base.name },
      description: { set: base.description },
      sovereigntyAchStrategicAutonomy: { set: base.sovereigntyAchStrategicAutonomy ?? null },
      sovereigntyAchResilience: { set: base.sovereigntyAchResilience ?? null },
      sovereigntyAchSecurity: { set: base.sovereigntyAchSecurity ?? null },
      sovereigntyAchControl: { set: base.sovereigntyAchControl ?? null },
      sovereigntyAchStrategicAutonomyEvidence: {
        set: base.sovereigntyAchStrategicAutonomyEvidence ?? null,
      },
      lastSovereigntyAssessmentAt: { set: base.lastSovereigntyAssessmentAt ?? null },
      aiType: { set: base.aiType },
      status: { set: base.status },
      tags: { set: base.tags || [] },
      owners: relArr(ownerId ? [ownerId] : []),
      supportsCapabilities: relArr(supportsCapabilityIds),
      usedByApplications: relArr(usedByApplicationIds),
      trainedWithDataObjects: relArr(trainedWithDataObjectIds),
      hostedOn: relArr(hostedOnIds),
      providedBy: relArr(providedByIds),
      supportedBy: relArr(supportedByIds),
      maintainedBy: relArr(maintainedByIds),
      partOfArchitectures: relArr(partOfArchitectureIds),
      implementsPrinciples: relArr(implementsPrincipleIds),
      depictedInDiagrams: relArr(depictedInDiagramIds),
    }
    if (base.model?.trim()) updateInput.model = { set: base.model }
    if (base.version?.trim()) updateInput.version = { set: base.version }
    if (base.provider?.trim()) updateInput.provider = { set: base.provider }
    if (base.license?.trim()) updateInput.license = { set: base.license }
    if (base.trainingDate?.trim()) updateInput.trainingDate = { set: base.trainingDate }
    if (base.accuracy !== undefined) updateInput.accuracy = { set: base.accuracy }
    if (base.costs !== undefined) updateInput.costs = { set: base.costs }
    await updateAicomponent({
      variables: { where: { id: { eq: aiComponentData.id } }, update: updateInput },
    })
    afterSave()
  }

  const handleInfrastructureSubmit = async (data: InfrastructureFormValues) => {
    if (!infrastructureData) return

    const parentId = Array.isArray(data.parentInfrastructure)
      ? data.parentInfrastructure[0]
      : data.parentInfrastructure
    const lastSovereigntyAssessmentAt = data.lastSovereigntyAssessmentAt ?? new Date().toISOString()

    const input: Record<string, any> = {
      name: { set: data.name },
      description: { set: data.description || '' },
      sovereigntyAchStrategicAutonomy: { set: data.sovereigntyAchStrategicAutonomy ?? null },
      sovereigntyAchResilience: { set: data.sovereigntyAchResilience ?? null },
      sovereigntyAchSecurity: { set: data.sovereigntyAchSecurity ?? null },
      sovereigntyAchControl: { set: data.sovereigntyAchControl ?? null },
      sovereigntyAchStrategicAutonomyEvidence: {
        set: data.sovereigntyAchStrategicAutonomyEvidence ?? null,
      },
      lastSovereigntyAssessmentAt: { set: lastSovereigntyAssessmentAt },
      infrastructureType: { set: data.infrastructureType },
      status: { set: data.status },
      vendor: { set: data.vendor || '' },
      version: { set: data.version || '' },
      capacity: { set: data.capacity || '' },
      location: { set: data.location || '' },
      ipAddress: { set: data.ipAddress || '' },
      operatingSystem: { set: data.operatingSystem || '' },
      specifications: { set: data.specifications || '' },
      maintenanceWindow: { set: data.maintenanceWindow || '' },
      costs: { set: data.costs ?? null },
      planningDate: { set: data.planningDate || null },
      introductionDate: { set: data.introductionDate || null },
      endOfUseDate: { set: data.endOfUseDate || null },
      endOfLifeDate: { set: data.endOfLifeDate || null },
      owners: relArr(data.ownerId ? [data.ownerId] : []),
      parentInfrastructure: relArr(parentId ? [parentId] : []),
      childInfrastructures: relArr(data.childInfrastructures),
      hostsApplications: relArr(data.hostsApplications),
      providedBy: relArr(data.providedBy),
      hostedBy: relArr(data.hostedBy),
      maintainedBy: relArr(data.maintainedBy),
      partOfArchitectures: relArr(data.partOfArchitectures),
      depictedInDiagrams: relArr(data.depictedInDiagrams),
    }

    await updateInfrastructure({ variables: { id: infrastructureData.id, input } })
    afterSave()
  }

  const handleBusinessProcessSubmit = async (data: BusinessProcessFormValues) => {
    if (!businessProcessData) return
    const {
      ownerId,
      parentProcessId,
      supportsCapabilityIds,
      supportedByApplicationIds,
      partOfArchitectures,
      depictedInDiagrams,
      ...base
    } = data
    const input: Record<string, any> = {
      name: { set: base.name },
      description: { set: base.description || '' },
      processType: { set: base.processType },
      status: { set: base.status },
      category: { set: base.category || '' },
      tags: { set: base.tags || [] },
      maturityLevel: { set: base.maturityLevel || null },
      sovereigntyReqStrategicAutonomy: { set: base.sovereigntyReqStrategicAutonomy ?? null },
      sovereigntyReqResilience: { set: base.sovereigntyReqResilience ?? null },
      sovereigntyReqSecurity: { set: base.sovereigntyReqSecurity ?? null },
      sovereigntyReqControl: { set: base.sovereigntyReqControl ?? null },
      sovereigntyReqWeight: { set: base.sovereigntyReqWeight ?? null },
      sovereigntyReqStrategicAutonomyRationale: {
        set: base.sovereigntyReqStrategicAutonomyRationale ?? null,
      },
      owners: relArr(ownerId ? [ownerId] : []),
      parentProcess: relArr(parentProcessId ? [parentProcessId] : []),
      supportsCapabilities: relArr(supportsCapabilityIds),
      supportedByApplications: relArr(supportedByApplicationIds),
      partOfArchitectures: relArr(partOfArchitectures),
      depictedInDiagrams: relArr(depictedInDiagrams),
    }
    await updateBusinessProcess({ variables: { id: businessProcessData.id, input } })
    afterSave()
  }

  if (isLoading || !hasCurrentData) {
    return (
      <Dialog open onClose={onClose}>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    )
  }

  if (entity.type === 'capability') {
    return (
      <CapabilityForm
        isOpen
        onClose={onClose}
        onSubmit={handleCapabilitySubmit}
        mode="edit"
        data={capabilityData}
        availableCapabilities={capabilitiesListData?.businessCapabilities || []}
        loading={isUpdating}
      />
    )
  }

  if (entity.type === 'application') {
    return (
      <ApplicationForm
        isOpen
        onClose={onClose}
        onSubmit={handleApplicationSubmit}
        mode="edit"
        data={applicationData}
        availableApplications={applicationsListData?.applications || []}
        loading={isUpdating}
      />
    )
  }

  if (entity.type === 'dataobject') {
    return (
      <DataObjectForm
        isOpen
        onClose={onClose}
        onSubmit={handleDataObjectSubmit}
        mode="edit"
        data={dataObjectData}
        loading={isUpdating}
      />
    )
  }

  if (entity.type === 'aicomponent') {
    return (
      <AicomponentForm
        isOpen
        onClose={onClose}
        onSubmit={handleAicomponentSubmit}
        mode="edit"
        data={aiComponentData}
        loading={isUpdating}
      />
    )
  }

  if (entity.type === 'infrastructure') {
    return (
      <InfrastructureForm
        isOpen
        onClose={onClose}
        onSubmit={handleInfrastructureSubmit}
        mode="edit"
        data={infrastructureData}
        loading={isUpdating}
      />
    )
  }

  if (entity.type === 'businessprocess') {
    return (
      <BusinessProcessForm
        isOpen
        onClose={onClose}
        onSubmit={handleBusinessProcessSubmit}
        mode="edit"
        data={businessProcessData}
        loading={isUpdating}
      />
    )
  }

  return null
}
