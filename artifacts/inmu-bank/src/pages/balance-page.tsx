import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { BalanceSummary } from '@/components/balance-summary'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n/context'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { PiggyBank, ArrowUpRight } from 'lucide-react'

export function BalancePage() {
  const { t } = useI18n()
  const { profile, unread } = useAuth()
  const [data, setData] = useState<{ balance: number; savingsBalance: number; totalReceived: number; totalSent: number } | null>(null)
  const [toSavings, setToSavings] = useState('')
  const [fromSavings, setFromSavings] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    fetch('/api/balance', { credentials: 'include' }).then(r => r.json()).then(setData)
  }, [])

  useEffect(() => { load() }, [load])

  async function move(direction: 'to' | 'from') {
    const amount = Number(direction === 'to' ? toSavings : fromSavings)
    if (!amount) return
    setLoading(true)
    try {
      const path = direction === 'to' ? '/api/balance/move-to-savings' : '/api/balance/move-from-savings'
      const res = await fetch(path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(t('success'))
      direction === 'to' ? setToSavings('') : setFromSavings('')
      load()
    } catch (e) { toast.error(e instanceof Error ? e.message : t('error')) } finally { setLoading(false) }
  }

  return (
    <AppShell isAdmin={profile?.role === 'admin'} displayName={profile?.displayName ?? ''} unread={unread}>
      <PageHeader titleKey="nav_balance" />
      {!data ? <div className="py-20 text-center text-muted-foreground">{t('loading')}</div> : (
        <div className="flex flex-col gap-4">
          <BalanceSummary balance={data.balance} totalReceived={data.totalReceived} totalSent={data.totalSent} />
          <Card className="border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">{t('savings_title')}</p>
            <p className="mb-4 font-mono text-2xl font-bold gold-text">{data.savingsBalance.toLocaleString()} INMU</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input type="number" placeholder={t('move_to_savings')} value={toSavings} onChange={e => setToSavings(e.target.value)} className="min-h-11 flex-1" />
                <Button onClick={() => move('to')} disabled={loading} className="min-h-11 gap-2"><PiggyBank className="size-4" />{t('move_to_savings')}</Button>
              </div>
              <div className="flex gap-2">
                <Input type="number" placeholder={t('move_from_savings')} value={fromSavings} onChange={e => setFromSavings(e.target.value)} className="min-h-11 flex-1" />
                <Button variant="outline" onClick={() => move('from')} disabled={loading} className="min-h-11 gap-2"><ArrowUpRight className="size-4" />{t('move_from_savings')}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  )
}
