import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { AdminPanel } from '@/components/admin-panel'
import { PageHeader } from '@/components/page-header'
import { useI18n } from '@/lib/i18n/context'
import { useAuth } from '@/hooks/use-auth'
import { Card } from '@/components/ui/card'
import { Shield } from 'lucide-react'

type UserRow = { userId: string; displayName: string; role: string; balance: string; savingsBalance: string; totalReceived: string; totalSent: string; participationCount: number; createdAt: string }

export function AdminPage() {
  const { t } = useI18n()
  const { profile, unread } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (profile?.role !== 'admin') {
    return (
      <AppShell isAdmin={false} displayName={profile?.displayName ?? ''} unread={unread}>
        <Card className="border-border bg-card p-8 text-center">
          <Shield className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('admin_only')}</p>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell isAdmin displayName={profile.displayName ?? ''} unread={unread}>
      <PageHeader titleKey="nav_admin" />
      {loading ? <div className="py-20 text-center text-muted-foreground">{t('loading')}</div> : <AdminPanel users={users} onRefresh={load} />}
    </AppShell>
  )
}
