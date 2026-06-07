import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useI18n } from '@/lib/i18n/context'
import { formatInmu } from '@/lib/format'
import { toast } from 'sonner'
import { useState } from 'react'
import { Search, Download, Shield, User, Trash2 } from 'lucide-react'

type UserRow = {
  userId: string
  displayName: string
  role: string
  balance: string
  savingsBalance: string
  totalReceived: string
  totalSent: string
  participationCount: number
  createdAt: string
}

type AuditRow = { id: number; adminId: string; action: string; targetUserId: string | null; createdAt: string }

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(`/api${path}`, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { error?: string }).error ?? 'Error') }
  if (res.headers.get('content-type')?.includes('text/csv')) return res.text()
  return res.json()
}

export function AdminPanel({ users, onRefresh }: { users: UserRow[]; onRefresh: () => void }) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [rewardType, setRewardType] = useState('810day')
  const [txType, setTxType] = useState('deposit')
  const [airdropAmount, setAirdropAmount] = useState('')
  const [airdropMemo, setAirdropMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([])

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase())
  )

  async function withLoading(fn: () => Promise<void>) {
    setLoading(true)
    try { await fn(); onRefresh() } catch (e) { toast.error(e instanceof Error ? e.message : t('error')) } finally { setLoading(false) }
  }

  async function handleDownloadBackup() {
    setLoading(true)
    try {
      const csv = await api('/admin/backup-csv', 'GET')
      const blob = new Blob([csv as string], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'inmu-backup.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success(t('success'))
    } catch (e) { toast.error(e instanceof Error ? e.message : t('error')) } finally { setLoading(false) }
  }

  async function loadAuditLog() {
    try {
      const data = await api('/admin/audit', 'GET') as AuditRow[]
      setAuditLogs(data)
    } catch { toast.error(t('error')) }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-primary">
        <Shield className="size-4" />
        <p className="text-sm font-medium">{t('admin_only')}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')} className="min-h-11 pl-9" />
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="reset">Reset</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="flex flex-col gap-3 mt-3">
          {filtered.map((u) => (
            <Card key={u.userId} className={`border-border bg-card p-3 cursor-pointer transition-colors hover:bg-secondary/50 ${selectedUser?.userId === u.userId ? 'border-primary/50' : ''}`} onClick={() => setSelectedUser(u)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{u.displayName}</span>
                  {u.role === 'admin' && <Shield className="size-3 text-primary" />}
                </div>
                <span className="font-mono text-sm font-bold">{formatInmu(u.balance)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Savings: {formatInmu(u.savingsBalance)} · Parts: {u.participationCount}
              </p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="actions" className="flex flex-col gap-4 mt-3">
          {selectedUser ? (
            <>
              <div className="rounded-lg bg-secondary/50 px-3 py-2">
                <p className="text-sm font-medium">{selectedUser.displayName}</p>
                <p className="text-xs text-muted-foreground">Balance: {formatInmu(selectedUser.balance)}</p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">{t('change_balance')}</p>
                <Input type="number" placeholder="New balance" value={amount} onChange={(e) => setAmount(e.target.value)} className="min-h-11" />
                <Input placeholder={t('reason')} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11" />
                <Button onClick={() => withLoading(() => api('/admin/balance', 'POST', { targetUserId: selectedUser.userId, newBalance: Number(amount), reason }))} disabled={loading} className="min-h-11">{t('apply')}</Button>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">{t('register_tx')}</p>
                <select value={txType} onChange={(e) => setTxType(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdraw</option>
                  <option value="reward">Reward</option>
                  <option value="airdrop">Airdrop</option>
                </select>
                <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="min-h-11" />
                <Input placeholder={t('memo')} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11" />
                <Button onClick={() => withLoading(() => api('/admin/register-tx', 'POST', { targetUserId: selectedUser.userId, type: txType, amount: Number(amount), memo: reason }))} disabled={loading} variant="outline" className="min-h-11">{t('register_tx')}</Button>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">{t('distribute_reward')}</p>
                <select value={rewardType} onChange={(e) => setRewardType(e.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="810day">810Day</option>
                  <option value="inmuday">INMU Day</option>
                  <option value="campaign">Campaign</option>
                </select>
                <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="min-h-11" />
                <Button onClick={() => withLoading(() => api('/admin/distribute-reward', 'POST', { targetUserId: selectedUser.userId, rewardType, amount: Number(amount), memo: reason }))} disabled={loading} variant="outline" className="min-h-11">{t('distribute_reward')}</Button>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Usersタブでユーザーを選択してください</p>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{t('distribute_airdrop')} (全員)</p>
            <Input type="number" placeholder="Amount per user" value={airdropAmount} onChange={(e) => setAirdropAmount(e.target.value)} className="min-h-11" />
            <Input placeholder="Memo" value={airdropMemo} onChange={(e) => setAirdropMemo(e.target.value)} className="min-h-11" />
            <Button
              onClick={() => withLoading(() => api('/admin/distribute-airdrop', 'POST', { targetUserIds: users.map(u => u.userId), amount: Number(airdropAmount), memo: airdropMemo }))}
              disabled={loading || !airdropAmount}
              className="min-h-11"
            >{t('distribute_airdrop')}</Button>
          </div>

          <Button onClick={handleDownloadBackup} variant="outline" className="min-h-11 gap-2" disabled={loading}>
            <Download className="size-4" />
            {t('backup')}
          </Button>
        </TabsContent>

        <TabsContent value="audit" className="flex flex-col gap-3 mt-3">
          {auditLogs.length === 0 ? (
            <Button onClick={loadAuditLog} variant="outline">Load Audit Log</Button>
          ) : (
            <div className="flex flex-col gap-2">
              {auditLogs.map((log) => (
                <Card key={log.id} className="border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{log.action}</span>
                    <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('ja-JP')}</span>
                  </div>
                  {log.targetUserId && <p className="mt-1 text-xs text-muted-foreground">Target: {log.targetUserId}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reset" className="flex flex-col gap-3 mt-3">
          {selectedUser ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-sm">Reset: {selectedUser.displayName}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => withLoading(() => api('/admin/reset-user', 'POST', { targetUserId: selectedUser.userId, resetType: 'balance' }))} disabled={loading} variant="destructive" className="min-h-11 text-xs">{t('reset_balance')}</Button>
                <Button onClick={() => withLoading(() => api('/admin/reset-user', 'POST', { targetUserId: selectedUser.userId, resetType: 'history' }))} disabled={loading} variant="destructive" className="min-h-11 text-xs">{t('reset_history')}</Button>
                <Button onClick={() => withLoading(() => api('/admin/reset-user', 'POST', { targetUserId: selectedUser.userId, resetType: 'all' }))} disabled={loading} variant="destructive" className="min-h-11 gap-2 col-span-2">
                  <Trash2 className="size-4" />{t('reset_user')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-5 text-center text-sm text-muted-foreground">Usersタブでユーザーを選択してください</p>
          )}
          <Button
            onClick={() => { if (!confirm(t('reset_confirm_desc'))) return; withLoading(() => api('/admin/reset-all', 'POST')) }}
            disabled={loading} variant="destructive" className="min-h-11"
          >{t('reset_all')}</Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
