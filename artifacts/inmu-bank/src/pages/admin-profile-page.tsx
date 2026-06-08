import { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { AdminShell } from '@/components/admin-shell'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Wallet, WalletCards, ExternalLink, LogOut as WalletDisconnect, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { formatInmu } from '@/lib/format'

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>
      disconnect(): Promise<void>
      publicKey?: { toString(): string }
    }
    phantom?: {
      solana?: {
        isPhantom?: boolean
        connect(): Promise<{ publicKey: { toString(): string } }>
        disconnect(): Promise<void>
      }
    }
  }
}

function getPhantomProvider() {
  return window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null)
}

export function AdminProfilePage() {
  const [, navigate] = useLocation()
  const [adminWallet, setAdminWallet] = useState<string | null>(
    window.phantom?.solana?.publicKey?.toString() ?? window.solana?.publicKey?.toString() ?? null
  )
  const [walletLoading, setWalletLoading] = useState(false)
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

  async function handleLogout() {
    await fetch('/api/auth/admin-sign-out', { method: 'POST', credentials: 'include' })
    navigate('/admin-login')
  }

  async function connectWallet() {
    setWalletLoading(true)
    try {
      const provider = getPhantomProvider()
      if (!provider?.isPhantom) {
        toast.error('Phantom ウォレットがインストールされていません')
        window.open('https://phantom.app/', '_blank')
        return
      }
      const resp = await provider.connect()
      setAdminWallet(resp.publicKey.toString())
      toast.success('管理ウォレットを接続しました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ウォレット接続に失敗しました')
    } finally {
      setWalletLoading(false)
    }
  }

  async function disconnectWallet() {
    setWalletLoading(true)
    try {
      const provider = getPhantomProvider()
      if (provider?.disconnect) await provider.disconnect()
      setAdminWallet(null)
      toast.success('管理ウォレットを切断しました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setWalletLoading(false)
    }
  }

  if (isAdmin === null || !isAdmin) return null

  return (
    <AdminShell onLogout={handleLogout}>
      <PageHeader titleKey="nav_profile" />

      <div className="flex flex-col gap-4 max-w-md">
        {/* 管理者情報 */}
        <Card className="border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="size-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-base">管理者</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="size-3 text-primary" /> INMU PORTAL 管理者権限
              </p>
            </div>
          </div>
        </Card>

        {/* 管理ウォレット */}
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <WalletCards className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">管理ウォレット</h3>
          </div>

          {adminWallet ? (
            <div className="flex flex-col gap-3">
              {/* 接続状態 */}
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-green-600">接続中</span>
              </div>

              {/* ウォレットアドレス */}
              <div className="rounded-md bg-secondary/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-1">管理ウォレットアドレス</p>
                <p className="font-mono text-xs break-all">{adminWallet}</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  ({adminWallet.slice(0, 6)}…{adminWallet.slice(-6)})
                </p>
              </div>

              {/* 管理者INMU残高（プレースホルダー） */}
              <Card className="border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="size-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">管理者 INMU 残高</p>
                </div>
                <p className="font-mono text-lg font-bold gold-text">— INMU</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  ウォレット上の INMU 残高はオンチェーンで確認してください
                </p>
              </Card>

              <a
                href={`https://solscan.io/account/${adminWallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="size-3" />
                Solscan で確認
              </a>

              <div className="flex gap-2">
                <Button
                  onClick={connectWallet}
                  disabled={walletLoading}
                  variant="outline"
                  className="min-h-10 flex-1 text-xs gap-1.5"
                >
                  <Wallet className="size-3.5" />
                  再接続
                </Button>
                <Button
                  onClick={disconnectWallet}
                  disabled={walletLoading}
                  variant="ghost"
                  className="min-h-10 text-destructive gap-1.5 text-xs"
                >
                  <WalletDisconnect className="size-3.5" />
                  切断
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">未接続</span>
              </div>
              <Button
                onClick={connectWallet}
                disabled={walletLoading}
                className="min-h-11 gap-2"
              >
                <WalletCards className="size-4" />
                {walletLoading ? '接続中…' : 'Phantom ウォレットに接続'}
              </Button>
            </div>
          )}
        </Card>

        {/* ログアウト */}
        <Card className="border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full min-h-[56px] items-center gap-3 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/20"
          >
            <WalletDisconnect className="size-[18px] shrink-0" />
            <span className="flex-1 text-left">管理画面からログアウト</span>
          </button>
        </Card>
      </div>
    </AdminShell>
  )
}
