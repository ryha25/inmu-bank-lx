import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { RankingView } from '@/components/ranking-view'
import { PageHeader } from '@/components/page-header'
import { useI18n } from '@/lib/i18n/context'
import { useAuth } from '@/hooks/use-auth'

export function RankingPage() {
  const { t } = useI18n()
  const { profile, unread } = useAuth()
  const [rows, setRows] = useState<{ rank: number; userId: string; displayName: string; balance: number; totalReceived: number; participations: number }[]>([])

  useEffect(() => {
    fetch('/api/ranking', { credentials: 'include' }).then(r => r.json()).then(setRows)
  }, [])

  return (
    <AppShell isAdmin={profile?.role === 'admin'} displayName={profile?.displayName ?? ''} unread={unread}>
      <PageHeader titleKey="nav_ranking" />
      <RankingView rows={rows} />
    </AppShell>
  )
}
