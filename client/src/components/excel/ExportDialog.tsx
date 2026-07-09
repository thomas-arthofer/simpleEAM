import React from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { Info as InfoIcon } from '@mui/icons-material'
import { useTranslations } from 'next-intl'

import { EntityType, ExportSettings } from './types'
import { useCompanyContext } from '@/contexts/CompanyContext'
import { entityTypeLabels, entityTypeOrder } from './constants'
import { useFeatureFlags } from '@/lib/feature-flags'

interface ExportDialogProps {
  exportSettings: ExportSettings
  onEntityTypeChange: (entityType: string) => void
  onFormatChange: (format: string) => void
  availableEntityTypes?: readonly EntityType[]
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  exportSettings,
  onEntityTypeChange,
  onFormatChange,
  availableEntityTypes = entityTypeOrder,
}) => {
  const t = useTranslations('importExport.export')
  const tEntityTypes = useTranslations('importExport.entityTypes')
  const tFileFormats = useTranslations('importExport.fileFormats')
  const { selectedCompanyId, companies } = useCompanyContext()
  const { featureFlags } = useFeatureFlags()
  const isSovereigntyEnabled = featureFlags.Sovereignty
  const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.name

  const sovereigntyRequirementFields = [
    'sovereigntyReqStrategicAutonomy',
    'sovereigntyReqResilience',
    'sovereigntyReqSecurity',
    'sovereigntyReqControl',
    'sovereigntyReqStrategicAutonomyRationale',
    'sovereigntyReqResilienceRationale',
    'sovereigntyReqSecurityRationale',
    'sovereigntyReqControlRationale',
    'sovereigntyReqWeight',
  ]

  const sovereigntyAchievedFields = [
    'sovereigntyAchStrategicAutonomy',
    'sovereigntyAchResilience',
    'sovereigntyAchSecurity',
    'sovereigntyAchControl',
    'sovereigntyAchStrategicAutonomyEvidence',
    'sovereigntyAchResilienceEvidence',
    'sovereigntyAchSecurityEvidence',
    'sovereigntyAchControlEvidence',
    'lastSovereigntyAssessmentAt',
  ]

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3} sx={{ width: '100%' }}>
        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('title')}
            </Typography>

            <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
              <Typography variant="body2">
                {selectedCompanyName
                  ? t('companyFilterInfo', { companyName: selectedCompanyName })
                  : t('companyFilterDefault')}
              </Typography>
            </Alert>

            <Grid container spacing={2}>
              <Grid size={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('dataType')}</InputLabel>
                  <Select
                    value={exportSettings.entityType}
                    label={t('dataType')}
                    onChange={e => onEntityTypeChange(e.target.value)}
                  >
                    {availableEntityTypes.map(entityType => (
                      <MenuItem key={entityType} value={entityType}>
                        {tEntityTypes(entityType as keyof typeof entityTypeLabels) || entityType}
                      </MenuItem>
                    ))}
                    <MenuItem key="all" value="all">
                      {tEntityTypes('all')}
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('fileFormat')}</InputLabel>
                  <Select
                    value={exportSettings.format}
                    label={t('fileFormat')}
                    onChange={e => onFormatChange(e.target.value)}
                  >
                    <MenuItem value="xlsx">{tFileFormats('xlsx')}</MenuItem>
                    <MenuItem value="csv" disabled={exportSettings.entityType === 'all'}>
                      {tFileFormats('csv')}
                    </MenuItem>
                    <MenuItem value="json">{tFileFormats('json')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('preview')}
            </Typography>
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                {t('previewText', {
                  entityType: tEntityTypes(exportSettings.entityType) || exportSettings.entityType,
                  format: exportSettings.format.toUpperCase(),
                })}
              </Typography>
            </Alert>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>{t('graphqlFields')}:</strong>
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(() => {
                  // GraphQL-Felder für alle Entitätstypen
                  const entityFieldsMapping: Record<EntityType, string[]> = {
                    businessCapabilities: [
                      'id',
                      'name',
                      'description',
                      'maturityLevel',
                      'status',
                      'type',
                      'businessValue',
                      'sequenceNumber',
                      ...(isSovereigntyEnabled ? sovereigntyRequirementFields : []),
                      'introductionDate',
                      'endDate',
                      'owners',
                      'tags',
                      'createdAt',
                      'updatedAt',
                      'children',
                      'parents',
                      'supportedByApplications',
                      'partOfArchitectures',
                      'relatedDataObjects',
                      'depictedInDiagrams',
                    ],
                    businessProcesses:
                      exportSettings.format === 'json'
                        ? [
                            'id',
                            'name',
                            'description',
                            'processType',
                            'status',
                            'maturityLevel',
                            'category',
                            'tags',
                            'bpmnXml',
                            'owners',
                            'parentProcess',
                            'childProcesses',
                            'supportsCapabilities',
                            'supportedByApplications',
                            'partOfArchitectures',
                            'depictedInDiagrams',
                            'createdAt',
                            'updatedAt',
                          ]
                        : [
                            'id',
                            'name',
                            'description',
                            'processType',
                            'status',
                            'maturityLevel',
                            'category',
                            'tags',
                            'owners',
                            'parentProcess',
                            'childProcesses',
                            'supportsCapabilities',
                            'supportedByApplications',
                            'partOfArchitectures',
                            'depictedInDiagrams',
                            'createdAt',
                            'updatedAt',
                          ],
                    applications: [
                      'id',
                      'name',
                      'description',
                      'status',
                      'criticality',
                      'timeCategory',
                      'sevenRStrategy',
                      'costs',
                      'vendor',
                      'version',
                      ...(isSovereigntyEnabled ? sovereigntyAchievedFields : []),
                      'technologyStack',
                      'planningDate',
                      'introductionDate',
                      'endOfUseDate',
                      'endOfLifeDate',
                      'owners',
                      'createdAt',
                      'updatedAt',
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
                    ],
                    dataObjects: [
                      'id',
                      'name',
                      'description',
                      'owners',
                      'classification',
                      'format',
                      ...(isSovereigntyEnabled ? sovereigntyRequirementFields : []),
                      'planningDate',
                      'introductionDate',
                      'endOfUseDate',
                      'endOfLifeDate',
                      'dataSources',
                      'usedByApplications',
                      'relatedToCapabilities',
                      'relatedDataObjects',
                      'partOfArchitectures',
                      'depictedInDiagrams',
                      'createdAt',
                      'updatedAt',
                    ],
                    interfaces: [
                      'id',
                      'name',
                      'description',
                      'interfaceType',
                      'protocol',
                      'version',
                      'status',
                      'planningDate',
                      'introductionDate',
                      'endOfUseDate',
                      'endOfLifeDate',
                      'createdAt',
                      'updatedAt',
                      'owners',
                      'sourceApplications',
                      'targetApplications',
                      'dataObjects',
                      'predecessors',
                      'successors',
                      'partOfArchitectures',
                      'depictedInDiagrams',
                    ],
                    persons: [
                      'id',
                      'firstName',
                      'lastName',
                      'email',
                      'department',
                      'role',
                      'phone',
                      'createdAt',
                      'updatedAt',
                      'ownedCapabilities',
                      'ownedApplications',
                      'ownedDataObjects',
                    ],
                    architectures: [
                      'id',
                      'name',
                      'description',
                      'domain',
                      'type',
                      'timestamp',
                      'tags',
                      'createdAt',
                      'updatedAt',
                      'owners',
                      'containsApplications',
                      'containsCapabilities',
                      'containsDataObjects',
                      'containsInterfaces',
                      'containsInfrastructure',
                      'diagrams',
                      'childArchitectures',
                      'parentArchitecture',
                      'appliedPrinciples',
                    ],
                    // Diagrams are displayed differently depending on format
                    diagrams:
                      exportSettings.format === 'json'
                        ? [
                            'id',
                            'title',
                            'description',
                            'diagramType',
                            'diagramJson',
                            'createdAt',
                            'updatedAt',
                            'creator',
                            'architecture',
                            'containsCapabilities',
                            'containsApplications',
                            'containsDataObjects',
                            'containsInterfaces',
                            'containsInfrastructure',
                          ]
                        : [
                            'id',
                            'title',
                            'description',
                            'diagramType',
                            // 'diagramJson' wird bei Excel/CSV-Export ausgeschlossen
                            'createdAt',
                            'updatedAt',
                            'creator',
                            'architecture',
                            'containsCapabilities',
                            'containsApplications',
                            'containsDataObjects',
                            'containsInterfaces',
                            'containsInfrastructure',
                          ],
                    architecturePrinciples: [
                      'id',
                      'name',
                      'description',
                      'category',
                      'priority',
                      'rationale',
                      'implications',
                      'tags',
                      'isActive',
                      'createdAt',
                      'updatedAt',
                      'owners',
                      'appliedInArchitectures',
                      'implementedByApplications',
                    ],
                    infrastructures: [
                      'id',
                      'name',
                      'description',
                      'infrastructureType',
                      'status',
                      'vendor',
                      'version',
                      'capacity',
                      'location',
                      ...(isSovereigntyEnabled ? sovereigntyAchievedFields : []),
                      'ipAddress',
                      'operatingSystem',
                      'specifications',
                      'maintenanceWindow',
                      'costs',
                      'planningDate',
                      'introductionDate',
                      'endOfUseDate',
                      'endOfLifeDate',
                      'owners',
                      'parentInfrastructure',
                      'childInfrastructures',
                      'hostsApplications',
                      'partOfArchitectures',
                      'depictedInDiagrams',
                      'createdAt',
                      'updatedAt',
                    ],
                    productFamilies: [
                      'id',
                      'name',
                      'description',
                      'vendor',
                      'manufacturer',
                      'softwareProducts',
                      'hardwareProducts',
                      'createdAt',
                      'updatedAt',
                    ],
                    softwareProducts: [
                      'id',
                      'name',
                      'description',
                      'vendor',
                      'manufacturer',
                      'productType',
                      'deliveryModel',
                      'mainLicenseType',
                      'productFamily',
                      'company',
                      'versions',
                      'createdAt',
                      'updatedAt',
                    ],
                    softwareVersions: [
                      'id',
                      'name',
                      'version',
                      'releaseDate',
                      'eolDate',
                      'isLTS',
                      'isCurrent',
                      'product',
                      'company',
                      'createdAt',
                      'updatedAt',
                    ],
                    hardwareProducts: [
                      'id',
                      'name',
                      'description',
                      'vendor',
                      'manufacturer',
                      'productType',
                      'lifecycleType',
                      'mainLicenseType',
                      'productFamily',
                      'company',
                      'versions',
                      'createdAt',
                      'updatedAt',
                    ],
                    hardwareVersions: [
                      'id',
                      'name',
                      'version',
                      'releaseDate',
                      'eolDate',
                      'isCurrent',
                      'product',
                      'company',
                      'createdAt',
                      'updatedAt',
                    ],
                    aicomponents: [
                      'id',
                      'name',
                      'description',
                      'aiType',
                      'model',
                      'version',
                      'status',
                      'accuracy',
                      ...(isSovereigntyEnabled ? sovereigntyAchievedFields : []),
                      'trainingDate',
                      'lastUpdated',
                      'provider',
                      'license',
                      'costs',
                      'tags',
                      'owners',
                      'supportsCapabilities',
                      'usedByApplications',
                      'trainedWithDataObjects',
                      'hostedOn',
                      'partOfArchitectures',
                      'implementsPrinciples',
                      'depictedInDiagrams',
                      'createdAt',
                      'updatedAt',
                    ],
                    visions: [
                      'id',
                      'name',
                      'visionStatement',
                      'timeHorizon',
                      'year',
                      'owners',
                      'supportsMissions',
                      'supportedByGoals',
                      'supportedByValues',
                      'partOfArchitectures',
                      'depictedInDiagrams',
                      'createdAt',
                      'updatedAt',
                    ],
                    missions: [
                      'id',
                      'name',
                      'purposeStatement',
                      'keywords',
                      'year',
                      'owners',
                      'supportedByVisions',
                      'supportedByValues',
                      'supportedByGoals',
                      'partOfArchitectures',
                      'depictedInDiagrams',
                      'createdAt',
                      'updatedAt',
                    ],
                    values: [
                      'id',
                      'name',
                      'valueStatement',
                      'owners',
                      'supportsMissions',
                      'supportsVisions',
                      'partOfArchitectures',
                      'depictedInDiagrams',
                      'createdAt',
                      'updatedAt',
                    ],
                    goals: [
                      'id',
                      'name',
                      'goalStatement',
                      'owners',
                      'operationalizesVisions',
                      'supportsMissions',
                      'supportsValues',
                      'achievedByStrategies',
                      'partOfArchitectures',
                      'depictedInDiagrams',
                      'createdAt',
                      'updatedAt',
                    ],
                    strategies: [
                      'id',
                      'name',
                      'description',
                      'owners',
                      'achievesGoals',
                      'partOfArchitectures',
                      'depictedInDiagrams',
                      'createdAt',
                      'updatedAt',
                    ],
                    all: [] as string[], // Für "Alle Entitäten" zeigen wir eine spezielle Behandlung
                  }

                  const fields = entityFieldsMapping[exportSettings.entityType] || []

                  if (exportSettings.entityType === 'all') {
                    return (
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          {t('allEntitiesInfo')}
                        </Typography>
                        {exportSettings.format !== 'json' && (
                          <>
                            <Alert severity="info" sx={{ mb: 2 }}>
                              <Typography variant="body2">
                                <strong>{t('diagramExportWarning')}</strong>
                              </Typography>
                            </Alert>
                            <Alert severity="info" sx={{ mb: 2 }}>
                              <Typography variant="body2">
                                <strong>{t('businessProcessExportWarning')}</strong>
                              </Typography>
                            </Alert>
                          </>
                        )}
                        {Object.entries(entityFieldsMapping)
                          .filter(([key]) => key !== 'all')
                          .map(([entityType, entityFields]) => (
                            <Box key={entityType} sx={{ mb: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                {tEntityTypes(entityType as keyof typeof entityTypeLabels) ||
                                  entityType}
                                :
                                {entityType === 'diagrams' && exportSettings.format !== 'json' && (
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="textSecondary"
                                    sx={{ ml: 1 }}
                                  >
                                    ({t('withoutDiagramJsonSuffix')})
                                  </Typography>
                                )}
                                {entityType === 'businessProcesses' &&
                                  exportSettings.format !== 'json' && (
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      color="textSecondary"
                                      sx={{ ml: 1 }}
                                    >
                                      ({t('withoutBpmnXmlSuffix')})
                                    </Typography>
                                  )}
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                {entityFields.map((field, index) => (
                                  <Typography
                                    key={index}
                                    variant="body2"
                                    component="span"
                                    sx={{
                                      backgroundColor: 'primary.main',
                                      color: 'primary.contrastText',
                                      px: 1,
                                      py: 0.5,
                                      borderRadius: 1,
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {field}
                                  </Typography>
                                ))}
                              </Box>
                            </Box>
                          ))}
                      </Box>
                    )
                  }

                  // Note for individual diagram exports
                  if (
                    exportSettings.entityType === 'diagrams' &&
                    exportSettings.format !== 'json'
                  ) {
                    return (
                      <Box sx={{ width: '100%' }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>{t('singleDiagramExportWarning')}</strong>
                          </Typography>
                        </Alert>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                          {fields.map((field, index) => (
                            <Typography
                              key={index}
                              variant="body2"
                              component="span"
                              sx={{
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                              }}
                            >
                              {field}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )
                  }

                  if (
                    exportSettings.entityType === 'businessProcesses' &&
                    exportSettings.format !== 'json'
                  ) {
                    return (
                      <Box sx={{ width: '100%' }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>{t('singleBusinessProcessExportWarning')}</strong>
                          </Typography>
                        </Alert>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                          {fields.map((field, index) => (
                            <Typography
                              key={index}
                              variant="body2"
                              component="span"
                              sx={{
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                              }}
                            >
                              {field}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )
                  }

                  return fields.map((field, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      component="span"
                      sx={{
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                      }}
                    >
                      {field}
                    </Typography>
                  ))
                })()}
              </Box>

              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                {t('relationInfo')}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default ExportDialog
