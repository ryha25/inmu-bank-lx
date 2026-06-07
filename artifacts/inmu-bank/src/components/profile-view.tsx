import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n/context'
import { formatInmu } from '@/lib/format'
import { toast } from 'sonner'
import { useState } from 'react'
import { User, Wallet, Coins, TrendingUp, TrendingDown, Award, ExternalLink } from 'lucide-react'

type ProfileData = {
  userId: string
  displayName: string
  xId: string | null
  discordId: string | null
  discordUsername: string | null
  solWallet: string | null
  avatar: string | null
  balance: string
  savingsBalance: string
  totalReceived: string
  totalSent: string
  monthlyPoints: string
  participationCount: number
  createdAt: string
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      connect: () => Promise<{ publicKey: { toString(): string } }>
      disconnect: () => Promise<void>
    }
  }
}

export function ProfileView({ profile, onRefresh }: { profile: ProfileData; onRefresh: () => void }) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [phantomLoading, setPhantomLoading] = useState(false)
  const [form, setForm] = useState({
    displayName: profile.displayName || '',
    xId: profile.xId || '',
    discordId: profile.discordId || '',
    discordUsername: profile.discordUsername || '',
    solWallet: profile.solWallet || '',
  })

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(t('success'))
      onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  async function connectPhantom() {
    setPhantomLoading(true)
    try {
      if (!window.solana?.isPhantom) {
        toast.error(t('phantom_not_installed'))
        window.open('https://phantom.app/', '_blank')
        return
      }
      const resp = await window.solana.connect()
      const address = resp.publicKey.toString()
      const res = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solWallet: address }),
      })
      if (!res.ok) throw new Error('Failed to save wallet')
      setForm((f) => ({ ...f, solWallet: address }))
      toast.success(t('phantom_connected'))
      onRefresh()
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== 'User rejected the request.') {
        toast.error(e.message)
      }
    } finally {
      setPhantomLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2"><Coins className="size-4 text-primary" /><p className="text-xs font-medium text-muted-foreground">{t('current_balance')}</p></div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums gold-text">{formatInmu(profile.balance)}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2"><Wallet className="size-4 text-accent" /><p className="text-xs font-medium text-muted-foreground">{t('savings_title')}</p></div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums">{formatInmu(profile.savingsBalance)}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2"><TrendingUp className="size-4 text-chart-5" /><p className="text-xs font-medium text-muted-foreground">{t('total_received')}</p></div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums text-chart-5">{formatInmu(profile.totalReceived)}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2"><TrendingDown className="size-4 text-destructive" /><p className="text-xs font-medium text-muted-foreground">{t('total_sent')}</p></div>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums text-destructive">{formatInmu(profile.totalSent)}</p>
        </Card>
      </div>

      <Card className="border-border bg-card p-4">
        <div className="flex items-center gap-2"><Award className="size-4 text-primary" /><p className="text-xs font-medium text-muted-foreground">{t('monthly_points')}</p></div>
        <p className="mt-2 font-mono text-xl font-bold tabular-nums">{formatInmu(profile.monthlyPoints)}</p>
      </Card>

      {/* Phantom wallet */}
      <Card className="border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">Phantom Wallet</h3>
          </div>
          {form.solWallet && (
            <a href={`https://solscan.io/account/${form.solWallet}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Solscan <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        {form.solWallet ? (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs text-muted-foreground break-all">{form.solWallet}</p>
            <p className="text-[11px] text-muted-foreground">{t('wallet_private')}</p>
            <Button variant="outline" onClick={connectPhantom} disabled={phantomLoading} className="min-h-9 text-xs">
              {t('connect_phantom')}
            </Button>
          </div>
        ) : (
          <Button onClick={connectPhantom} disabled={phantomLoading} className="min-h-11 w-full gap-2">
            <Wallet className="size-4" />
            {phantomLoading ? t('loading') : t('connect_phantom')}
          </Button>
        )}
      </Card>

      {/* Profile form */}
      <Card className="border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="size-4 text-primary" />
          <h2 className="font-semibold">{t('profile_title')}</h2>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('displayName')}</Label>
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="min-h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('x_id')}</Label>
            <Input value={form.xId} onChange={(e) => setForm({ ...form, xId: e.target.value })} className="min-h-11" placeholder="@username" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('discord_id')}</Label>
            <Input value={form.discordId} onChange={(e) => setForm({ ...form, discordId: e.target.value })} className="min-h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('discord_username')}</Label>
            <Input value={form.discordUsername} onChange={(e) => setForm({ ...form, discordUsername: e.target.value })} className="min-h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('sol_wallet')}</Label>
            <Input value={form.solWallet} onChange={(e) => setForm({ ...form, solWallet: e.target.value })} className="min-h-11 font-mono text-xs" placeholder="SOL address" />
            <p className="text-[11px] text-muted-foreground">{t('wallet_private')}</p>
          </div>
          <Button onClick={handleSave} disabled={loading} className="min-h-11">{t('save')}</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t('registered_at')}: {new Date(profile.createdAt).toLocaleDateString('ja-JP')}</p>
      </Card>
    </div>
  )
}
