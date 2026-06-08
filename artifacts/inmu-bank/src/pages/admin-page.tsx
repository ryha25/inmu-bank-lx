import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { AppShell } from '@/components/app-shell'
import { AdminPanel } from '@/components/admin-panel'
import { PageHeader } from '@/components/page-header'
import { useI18n } from '@/lib/i18n/context'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

type UserRow = {
  userId: string
  displayName: string
  role: string
  balance: string
  savingsBalance: string
  totalReceived: string
  totalSent: string
  participationCount: number
  xId: string | null
  discordId: string | null
  createdAt: string
}

export function AdminPage() {
  const { t } = useI18n()
  const { profile, unread } = useAuth()
  const [, navigate] = useLocation()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/admin-session', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { isAdmin: false })
      .then((d: { isAdmin: boolean }) => {
        setIsAdmin(d.isAdmin)
        if (!d.isAdmin) navigate('/admin-login')
      })
      .catch(() => { setIsAdmin(false); navigate('/admin-login') })
  }, [navigate])

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setUsers(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isAdmin) load()
  }, [load, isAdmin])

  async function handleLogout() {
    await fetch('/api/auth/admin-sign-out', { method: 'POST', credentials: 'include' })
    navigate('/admin-login')
  }

  if (isAdmin === null || !isAdmin) {
    return null
  }

  return (
    <AppShell isAdmin displayName={profile?.displayName ?? ''} unread={unread}>
      <div className="flex items-center justify-between mb-2">
        <PageHeader titleKey="nav_admin" />
        <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
          <LogOut className="size-4 mr-1" />
          ログアウト
        </Button>
      </div>
      {loading
        ? <div className="py-20 text-center text-muted-foreground">{t('loading')}</div>
        : <AdminPanel users={users} onRefresh={load} />}
    </AppShell>
  )
}
