'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Card, CardContent, Tab, Tabs, Typography } from '@mui/material'
import { useTranslations } from 'next-intl'
import { useFeatureFlags } from '@/lib/feature-flags'
import { useAuth } from '@/lib/auth'
import { useCompanyContext } from '@/contexts/CompanyContext'
import SovereigntyCapabilityView from '@/components/sovereignty/SovereigntyCapabilityView'
import SovereigntyDataView from '@/components/sovereignty/SovereigntyDataView'
import SovereigntyProcessView from '@/components/sovereignty/SovereigntyProcessView'
import SovereigntyEntityDialog from '@/components/sovereignty/SovereigntyEntityDialog'
import { EntityRef } from '@/components/sovereignty/types'

type ViewType = 'capabilities' | 'data' | 'processes'

export default function SovereigntyDetailPage() {
  const { authenticated, initialized } = useAuth()
  const t = useTranslations('sovereigntyDetail')
  const { featureFlags } = useFeatureFlags()
  const { selectedCompany, loading: companyLoading } = useCompanyContext()
  const router = useRouter()
  const [activeView, setActiveView] = useState<ViewType>('capabilities')
  const [selectedEntity, setSelectedEntity] = useState<EntityRef | null>(null)

  useEffect(() => {
    if (
      initialized &&
      authenticated &&
      !companyLoading &&
      !!selectedCompany &&
      !featureFlags.Sovereignty
    ) {
      router.replace('/')
    }
  }, [
    initialized,
    authenticated,
    companyLoading,
    selectedCompany,
    featureFlags.Sovereignty,
    router,
  ])

  if (!initialized || !authenticated || companyLoading) {
    return null
  }

  if (!selectedCompany) {
    return null
  }

  if (!featureFlags.Sovereignty) {
    return null
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t('title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('subtitle')}
      </Typography>

      <Card>
        <CardContent sx={{ pb: 0, '&:last-child': { pb: 0 } }}>
          <Tabs
            value={activeView}
            onChange={(_, v: ViewType) => setActiveView(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab value="capabilities" label={t('capabilityView')} />
            <Tab value="data" label={t('dataView')} />
            <Tab value="processes" label={t('processView')} />
          </Tabs>
        </CardContent>

        <CardContent>
          {activeView === 'capabilities' && (
            <SovereigntyCapabilityView onEntityClick={setSelectedEntity} />
          )}
          {activeView === 'data' && <SovereigntyDataView onEntityClick={setSelectedEntity} />}
          {activeView === 'processes' && (
            <SovereigntyProcessView onEntityClick={setSelectedEntity} />
          )}
        </CardContent>
      </Card>

      <SovereigntyEntityDialog entity={selectedEntity} onClose={() => setSelectedEntity(null)} />
    </Box>
  )
}
