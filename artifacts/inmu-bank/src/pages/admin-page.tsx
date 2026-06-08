import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { AdminPanel } from '@/components/admin-panel'
import { PageHeader } from '@/components/page-header'
import { useI18n } from '@/lib/i18n/context'
import { useAuth } from '@/hooks/use-auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, KeyRound, LogOut } from 'lucide-react'
import { toast } from 'sonner'

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
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  // Check if admin session is active
  useEffect(() => {
    fetch('/api/auth/admin-session', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { isAdmin: false })
      .then((d: { isAdmin: boolean }) => setIsAdmin(d.isAdmin))
      .catch(() => setIsAdmin(false))
  }, [])

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

  useEffect(() => {
    if (!isAdmin) {
      setTimeout(() => emailRef.current?.focus(), 100)
    }
  }, [isAdmin])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/admin-sign-in', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        toast.error('メールアドレスまたはパスワードが正しくありません')
        setPassword('')
        return
      }
      setIsAdmin(true)
    } catch {
      toast.error(t('error'))
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/admin-sign-out', { method: 'POST', credentials: 'include' })
    setIsAdmin(false)
    setEmail('')
    setPassword('')
    setUsers([])
  }

  // Still loading admin session check
  if (isAdmin === null) {
    return (
      <AppShell isAdmin={false} displayName={profile?.displayName ?? ''} unread={unread}>
        <div className="py-20 text-center text-muted-foreground">{t('loading')}</div>
      </AppShell>
    )
  }

  // Not logged in as admin — show dedicated login form
  if (!isAdmin) {
    return (
      <AppShell isAdmin={false} displayName={profile?.displayName ?? ''} unread={unread}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="border-border bg-card w-full max-w-sm p-6">
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="size-6 text-primary" />
              </div>
              <h2 className="font-semibold text-lg">管理者ログイン</h2>
              <p className="text-xs text-muted-foreground text-center">
                管理画面にアクセスするには管理者アカウントでログインしてください
              </p>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <Input
                ref={emailRef}
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="min-h-11"
                autoComplete="email"
              />
              <Input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="min-h-11"
                autoComplete="current-password"
              />
              <Button type="submit" disabled={loginLoading || !email || !password} className="min-h-11">
                <KeyRound className="size-4 mr-2" />
                {loginLoading ? t('loading') : 'ログイン'}
              </Button>
            </form>
          </Card>
        </div>
      </AppShell>
    )
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
