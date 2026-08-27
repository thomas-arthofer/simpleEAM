import { SovereigntyMaturity } from '@/gql/generated'
import type { FieldConfig } from './GenericForm'

const MATURITY_ORDER: readonly SovereigntyMaturity[] = [
  SovereigntyMaturity.VERY_HIGH,
  SovereigntyMaturity.HIGH,
  SovereigntyMaturity.MEDIUM,
  SovereigntyMaturity.LOW,
  SovereigntyMaturity.NONE,
]

const buildMaturityOptions = (tCommon: (key: string) => string) =>
  MATURITY_ORDER.map(value => ({
    value,
    label: tCommon(`sovereignty.maturity.${value}`),
  }))

export const buildSovereigntyRequirementFields = (
  tCommon: (key: string) => string,
  tabId = 'sovereignty'
): FieldConfig[] => {
  const options = buildMaturityOptions(tCommon)

  return [
    {
      name: 'sovereigntyReqStrategicAutonomy',
      label: tCommon('sovereignty.fields.reqStrategicAutonomy'),
      type: 'select',
      tabId,
      options,
      size: { xs: 12, md: 6 },
      tooltip: tCommon('sovereignty.tooltip'),
    },
    {
      name: 'sovereigntyReqResilience',
      label: tCommon('sovereignty.fields.reqResilience'),
      type: 'select',
      tabId,
      options,
      size: { xs: 12, md: 6 },
      tooltip: tCommon('sovereignty.tooltip'),
    },
    {
      name: 'sovereigntyReqSecurity',
      label: tCommon('sovereignty.fields.reqSecurity'),
      type: 'select',
      tabId,
      options,
      size: { xs: 12, md: 6 },
      tooltip: tCommon('sovereignty.tooltip'),
    },
    {
      name: 'sovereigntyReqControl',
      label: tCommon('sovereignty.fields.reqControl'),
      type: 'select',
      tabId,
      options,
      size: { xs: 12, md: 6 },
      tooltip: tCommon('sovereignty.tooltip'),
    },
    {
      name: 'sovereigntyReqStrategicAutonomyRationale',
      label: tCommon('sovereignty.fields.reqStrategicAutonomyRationale'),
      type: 'textarea',
      tabId,
      rows: 3,
      size: { xs: 12, md: 6 },
    },
    {
      name: 'sovereigntyReqResilienceRationale',
      label: tCommon('sovereignty.fields.reqResilienceRationale'),
      type: 'textarea',
      tabId,
      rows: 3,
      size: { xs: 12, md: 6 },
    },
    {
      name: 'sovereigntyReqSecurityRationale',
      label: tCommon('sovereignty.fields.reqSecurityRationale'),
      type: 'textarea',
      tabId,
      rows: 3,
      size: { xs: 12, md: 6 },
    },
    {
      name: 'sovereigntyReqControlRationale',
      label: tCommon('sovereignty.fields.reqControlRationale'),
      type: 'textarea',
      tabId,
      rows: 3,
      size: { xs: 12, md: 6 },
    },
    {
      name: 'sovereigntyReqWeight',
      label: tCommon('sovereignty.fields.reqWeight'),
      type: 'number',
      tabId,
      size: { xs: 12, md: 6 },
    },
  ]
}

export const buildSovereigntyAchievedFields = (
  tCommon: (key: string) => string,
  tabId = 'sovereignty'
): FieldConfig[] => {
  const options = buildMaturityOptions(tCommon)

  return [
    {
      name: 'sovereigntyAchStrategicAutonomy',
      label: tCommon('sovereignty.fields.achStrategicAutonomy'),
      type: 'select',
      tabId,
      options,
      size: { xs: 12, md: 6 },
      tooltip: tCommon('sovereignty.tooltip'),
    },
    {
      name: 'sovereigntyAchResilience',
      label: tCommon('sovereignty.fields.achResilience'),
      type: 'select',
      tabId,
      options,
      size: { xs: 12, md: 6 },
      tooltip: tCommon('sovereignty.tooltip'),
    },
    {
      name: 'sovereigntyAchSecurity',
      label: tCommon('sovereignty.fields.achSecurity'),
      type: 'select',
      tabId,
      options,
      size: { xs: 12, md: 6 },
      tooltip: tCommon('sovereignty.tooltip'),
    },
    {
      name: 'sovereigntyAchControl',
      label: tCommon('sovereignty.fields.achControl'),
      type: 'select',
      tabId,
      options,
      size: { xs: 12, md: 6 },
      tooltip: tCommon('sovereignty.tooltip'),
    },
    {
      name: 'sovereigntyAchStrategicAutonomyEvidence',
      label: tCommon('sovereignty.fields.achStrategicAutonomyEvidence'),
      type: 'textarea',
      tabId,
      rows: 3,
      size: { xs: 12, md: 6 },
    },
    {
      name: 'sovereigntyAchResilienceEvidence',
      label: tCommon('sovereignty.fields.achResilienceEvidence'),
      type: 'textarea',
      tabId,
      rows: 3,
      size: { xs: 12, md: 6 },
    },
    {
      name: 'sovereigntyAchSecurityEvidence',
      label: tCommon('sovereignty.fields.achSecurityEvidence'),
      type: 'textarea',
      tabId,
      rows: 3,
      size: { xs: 12, md: 6 },
    },
    {
      name: 'sovereigntyAchControlEvidence',
      label: tCommon('sovereignty.fields.achControlEvidence'),
      type: 'textarea',
      tabId,
      rows: 3,
      size: { xs: 12, md: 6 },
    },
    {
      name: 'lastSovereigntyAssessmentAt',
      label: tCommon('sovereignty.fields.lastAssessmentAt'),
      type: 'date',
      tabId,
      size: { xs: 12, md: 6 },
    },
  ]
}
