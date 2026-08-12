'use client'

import React from 'react'
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@mui/material'
import { useQuery } from '@apollo/client'
import { useTranslations } from 'next-intl'
import { useCompanyContext } from '@/contexts/CompanyContext'
import { useCompanyWhere } from '@/hooks/useCompanyWhere'
import {
  GET_SOVEREIGNTY_ANALYSIS,
  GET_SOVEREIGNTY_BUSINESS_PROCESSES_LIST,
} from '@/graphql/sovereigntyDetail'
import { EntityRef, EntityType } from './types'

// Status taxonomy locked by eam-konzept.md §3 / 02-UI-SPEC.md Color table —
// no new hex values, these are the exact theme colors specified there.
const STATUS_COLORS: Record<string, string> = {
  RED: '#D32F2F',
  YELLOW: '#ED6C02',
  GREY: '#9E9E9E',
  GREEN: '#2E7D32',
}

// evaluator.ts's ViolatingElementType ('application' | 'aiComponent' |
// 'infrastructure' | 'businessProcess') to this app's EntityRef.type / i18n
// key casing.
const VIOLATING_ELEMENT_TYPE_MAP: Record<string, EntityType> = {
  application: 'application',
  aiComponent: 'aicomponent',
  infrastructure: 'infrastructure',
  businessProcess: 'businessprocess',
}

// chainLabels.ts's chain node `type` (evaluator's ViolatingElementType plus
// the SovereigntyRootType strings) to sovereigntyDetail's `entityTypes` i18n
// key casing (SOV-04 chain readability).
const CHAIN_NODE_TYPE_I18N_KEY: Record<string, string> = {
  application: 'application',
  aiComponent: 'aicomponent',
  infrastructure: 'infrastructure',
  businessCapability: 'capability',
  dataObject: 'dataobject',
  businessProcess: 'businessprocess',
}

interface BusinessProcessListItem {
  id: string
  name: string
}

interface SovereigntyFinding {
  violatingElementId: string
  violatingElementType: string
  violatingElementName: string
  dimension: string
  status: string
  requiredLevel: string | null
  actualLevel: string | null
  chainPath: string[]
  chainNodes: { id: string; name: string; type: string }[]
}

interface SovereigntyAnalysisResult {
  rootId: string
  rootType: string
  selfStatus: string
  downstreamStatus: string
  findings: SovereigntyFinding[]
}

function StatusChip({ label, status }: { label: string; status: string }) {
  return (
    <Chip
      label={`${label}: ${status}`}
      size="small"
      sx={{
        bgcolor: STATUS_COLORS[status] ?? STATUS_COLORS.GREY,
        color: '#fff',
        fontWeight: 500,
      }}
    />
  )
}

function FindingsPanel({
  analysis,
  onEntityClick,
  t,
}: {
  analysis: SovereigntyAnalysisResult
  onEntityClick: (ref: EntityRef) => void
  t: (key: string, values?: Record<string, string | number>) => string
}) {
  if (analysis.downstreamStatus === 'GREEN') {
    return (
      <Alert severity="success" sx={{ mt: 1.5 }}>
        <Typography variant="subtitle2">{t('greenEmptyHeading')}</Typography>
        <Typography variant="body2">{t('greenEmptyBody')}</Typography>
      </Alert>
    )
  }

  if (analysis.downstreamStatus === 'GREY' && analysis.findings.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 1.5 }}>
        <Typography variant="subtitle2">{t('greyEmptyHeading')}</Typography>
        <Typography variant="body2">{t('greyEmptyBody')}</Typography>
      </Alert>
    )
  }

  return (
    <Box
      sx={{
        maxHeight: 320,
        overflowY: 'auto',
        mt: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {analysis.findings.map((finding, index) => {
        const entityType = VIOLATING_ELEMENT_TYPE_MAP[finding.violatingElementType]
        const dimensionLabel = t(`dimensions.${finding.dimension}` as never)

        return (
          <Paper
            key={`${finding.violatingElementId}-${finding.dimension}-${index}`}
            variant="outlined"
            sx={{
              p: 1,
              borderLeft: `4px solid ${STATUS_COLORS[finding.status] ?? STATUS_COLORS.GREY}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={finding.violatingElementName}
                size="small"
                clickable
                onClick={() =>
                  entityType && onEntityClick({ id: finding.violatingElementId, type: entityType })
                }
              />
              <Typography variant="caption" color="text.secondary">
                {dimensionLabel}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {t('findingRow', {
                required: finding.requiredLevel ?? '–',
                actual: finding.actualLevel ?? '–',
              })}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.25 }}
            >
              {t('chainContext', {
                chainPath: finding.chainNodes
                  .map(
                    node =>
                      `${t(`entityTypes.${CHAIN_NODE_TYPE_I18N_KEY[node.type] ?? node.type}` as never)}: ${node.name}`
                  )
                  .join(' → '),
              })}
            </Typography>
          </Paper>
        )
      })}
    </Box>
  )
}

function BusinessProcessAnalysisCard({
  businessProcess,
  onEntityClick,
}: {
  businessProcess: BusinessProcessListItem
  onEntityClick: (ref: EntityRef) => void
}) {
  const t = useTranslations('sovereigntyDetail')
  const { selectedCompanyId } = useCompanyContext()

  const { data, loading, error } = useQuery(GET_SOVEREIGNTY_ANALYSIS, {
    variables: {
      companyId: selectedCompanyId,
      rootType: 'businessProcess',
      rootId: businessProcess.id,
    },
    skip: !selectedCompanyId,
    fetchPolicy: 'cache-and-network',
  })

  const analysis: SovereigntyAnalysisResult | undefined = data?.sovereigntyAnalysis

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Chip
          label={businessProcess.name}
          onClick={() => onEntityClick({ id: businessProcess.id, type: 'businessprocess' })}
          clickable
          color="primary"
          variant="outlined"
        />
        {analysis && (
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <StatusChip label={t('selfStatusLabel')} status={analysis.selfStatus} />
            <StatusChip label={t('downstreamStatusLabel')} status={analysis.downstreamStatus} />
          </Box>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {t('loadError')}
        </Alert>
      )}

      {!loading && !error && analysis && (
        <FindingsPanel
          analysis={analysis}
          onEntityClick={onEntityClick}
          t={t as (key: string, values?: Record<string, string | number>) => string}
        />
      )}
    </Paper>
  )
}

interface SovereigntyProcessViewProps {
  onEntityClick: (ref: EntityRef) => void
}

export default function SovereigntyProcessView({ onEntityClick }: SovereigntyProcessViewProps) {
  const t = useTranslations('sovereigntyDetail')
  const { selectedCompanyId } = useCompanyContext()
  const companyWhere = useCompanyWhere('company')

  const { data, loading, error } = useQuery(GET_SOVEREIGNTY_BUSINESS_PROCESSES_LIST, {
    skip: !selectedCompanyId,
    fetchPolicy: 'cache-and-network',
    variables: { where: companyWhere },
  })

  if (!selectedCompanyId) {
    return <Alert severity="info">{t('noCompanySelected')}</Alert>
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">{error.message}</Alert>
  }

  const businessProcesses: BusinessProcessListItem[] = data?.businessProcesses ?? []

  if (businessProcesses.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('noBusinessProcesses')}
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {businessProcesses.map(businessProcess => (
        <BusinessProcessAnalysisCard
          key={businessProcess.id}
          businessProcess={businessProcess}
          onEntityClick={onEntityClick}
        />
      ))}
    </Box>
  )
}
