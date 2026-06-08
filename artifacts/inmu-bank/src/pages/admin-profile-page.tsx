import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'wouter'
import { AdminShell } from '@/components/admin-shell'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Shield, WalletCards, ExternalLink, LogOut, Coins, Send, RefreshCw, User, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatInmu } from '@/lib/format'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'

const INMU_MINT = new PublicKey('4FDtAagigMuFcPp36rbd9bzcYTJgQah2qLMYcYtfpump')
const INMU_DECIMALS = 6
const ADMIN_WALLET_KEY = 'inmu_admin_wallet'

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>
      disconnect(): Promise<void>
      publicKey?: { toString(): string }
      signAndSendTransaction(tx: Transaction): Promise<{ signature: string }>
    }
    phantom?: {
      solana?: {
        isPhantom?: boolean
        connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>
        disconnect(): Promise<void>
        publicKey?: { toString(): string }
        signAndSendTransaction(tx: Transaction): Promise<{ signature: string }>
      }
    }
  }
}

function getPhantomProvider() {
  return window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null)
}

function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) }
function isAndroid() { return /Android/.test(navigator.userAgent) }
function isMobile() { return isIOS() || isAndroid() }

function getRpcProxyUrl() {
  return `${window.location.origin}/api/solana/rpc-proxy`
}

type UserRow = {
  userId: string
  displayName: string
  solWallet: string | null
  balance: string
  monthlyPoints: string
}

type WalletStatus = 'disconnected' | 'cached' | 'connected'

export function AdminProfilePage() {
  const [, navigate] = useLocation()

  const [adminWallet, setAdminWallet] = useState<string | null>(() => {
    try { return localStorage.getItem(ADMIN_WALLET_KEY) ?? null } catch { return null }
  })
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('disconnected')
  const [inmuBalance, setInmuBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const [users, setUsers] = useState<UserRow[]>([])
  const [sendOpen, setSendOpen] = useState(false)
  const [sendTarget, setSendTarget] = useState<UserRow | null>(null)
  const [sendAmount, setSendAmount] = useState('1')
  const [sendLoading, setSendLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    fetch('/api/auth/admin-session', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { isAdmin: false })
      .then((d: { isAdmin: boolean }) => {
        setIsAdmin(d.isAdmin)
        if (!d.isAdmin) navigate('/admin-login')
      })
      .catch(() => { setIsAdmin(false); navigate('/admin-login') })
  }, [navigate])

  const fetchBalance = useCallback(async (wallet: string) => {
    if (!wallet) return
    setBalanceLoading(true)
    try {
      const res = await fetch(`/api/admin/solana/inmu-balance?wallet=${encodeURIComponent(wallet)}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const d = await res.json() as { balance: number }
        setInmuBalance(d.balance)
      } else {
        setInmuBalance(null)
      }
    } catch {
      setInmuBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }, [])

  // localStorageにウォレットがある場合、残高取得 + Phantom自動再接続を試みる
  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_WALLET_KEY)
    if (!saved) {
      setWalletStatus('disconnected')
      return
    }
    setAdminWallet(saved)
    setWalletStatus('cached')
    fetchBalance(saved)

    // Phantom がインストール済みなら onlyIfTrusted で静かに再接続
    const provider = getPhantomProvider()
    if (provider?.isPhantom) {
      provider.connect({ onlyIfTrusted: true })
        .then((resp) => {
          const addr = resp.publicKey.toString()
          if (addr === saved) {
            setWalletStatus('connected')
          }
        })
        .catch(() => {
          // ユーザーが承認していない場合は cached 状態のまま
        })
    }
  }, [fetchBalance])

  const loadUsers = useCallback(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.json())
      .then((d: UserRow[]) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin, loadUsers])

  async function handleLogout() {
    await fetch('/api/auth/admin-sign-out', { method: 'POST', credentials: 'include' })
    navigate('/admin-login')
  }

  async function connectWallet() {
    setWalletLoading(true)
    try {
      const provider = getPhantomProvider()
      if (provider?.isPhantom) {
        const resp = await provider.connect()
        const addr = resp.publicKey.toString()
        setAdminWallet(addr)
        setWalletStatus('connected')
        try { localStorage.setItem(ADMIN_WALLET_KEY, addr) } catch {}
        toast.success('管理ウォレットを接続しました')
        fetchBalance(addr)
        return
      }
      if (isMobile()) {
        const currentUrl = encodeURIComponent(window.location.href)
        const ref = encodeURIComponent(window.location.origin)
        const phantomBrowse = `https://phantom.app/ul/browse/${currentUrl}?ref=${ref}`
        if (isIOS()) {
          window.location.href = phantomBrowse
        } else {
          const intentUrl = `intent://browse/${encodeURIComponent(window.location.href)}#Intent;scheme=phantom;package=app.phantom;S.browser_fallback_url=${encodeURIComponent(phantomBrowse)};end`
          window.location.href = intentUrl
        }
        return
      }
      toast.error('Phantom ウォレットをインストールしてください')
      window.open('https://phantom.app/', '_blank')
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== 'User rejected the request.') toast.error(e.message)
    } finally {
      setWalletLoading(false)
    }
  }

  async function disconnectWallet() {
    setWalletLoading(true)
    try {
      const provider = getPhantomProvider()
      if (provider?.disconnect) await provider.disconnect().catch(() => {})
      setAdminWallet(null)
      setInmuBalance(null)
      setWalletStatus('disconnected')
      try { localStorage.removeItem(ADMIN_WALLET_KEY) } catch {}
      toast.success('管理ウォレットを切断しました')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setWalletLoading(false)
    }
  }

  async function handleSendInmu() {
    if (!sendTarget || !adminWallet || !sendAmount) return
    const amount = Number(sendAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('送金量を正しく入力してください')
      return
    }
    if (!sendTarget.solWallet) {
      toast.error('送金先ユーザーにSOLアドレスが設定されていません')
      return
    }

    const provider = getPhantomProvider()

    // Phantom が未接続なら再接続を促す
    if (!provider?.isPhantom) {
      toast.error('Phantom ウォレットが見つかりません。インストールしてください。')
      return
    }

    // cached 状態 (localStorageから復元) の場合は明示的に再接続
    if (walletStatus !== 'connected') {
      toast.loading('Phantom に再接続しています…', { id: 'reconnect' })
      try {
        const resp = await provider.connect()
        const addr = resp.publicKey.toString()
        if (addr !== adminWallet) {
          toast.dismiss('reconnect')
          toast.error(`接続ウォレットが異なります（${addr.slice(0, 6)}…）。正しいウォレットで接続してください。`)
          return
        }
        setWalletStatus('connected')
        toast.dismiss('reconnect')
      } catch {
        toast.dismiss('reconnect')
        toast.error('Phantom 再接続が必要です。「再接続」ボタンを押してください。')
        return
      }
    }

    setSendLoading(true)
    try {
      // バックエンドRPCプロキシ経由で接続（403回避）
      const rpcUrl = getRpcProxyUrl()
      const connection = new Connection(rpcUrl, 'confirmed')
      const fromPubkey = new PublicKey(adminWallet)
      const toPubkey = new PublicKey(sendTarget.solWallet)

      const fromATA = await getAssociatedTokenAddress(INMU_MINT, fromPubkey)
      const toATA = await getAssociatedTokenAddress(INMU_MINT, toPubkey)

      const instructions = []

      try {
        await getAccount(connection, toATA)
      } catch {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            fromPubkey,
            toATA,
            toPubkey,
            INMU_MINT,
          )
        )
      }

      const rawAmount = Math.floor(amount * Math.pow(10, INMU_DECIMALS))
      instructions.push(
        createTransferInstruction(
          fromATA,
          toATA,
          fromPubkey,
          rawAmount,
        )
      )

      const tx = new Transaction()
      tx.add(...instructions)
      tx.feePayer = fromPubkey
      const { blockhash } = await connection.getLatestBlockhash('finalized')
      tx.recentBlockhash = blockhash

      toast.loading('Phantom で署名してください…', { id: 'signing' })
      const result = await provider.signAndSendTransaction(tx)
      toast.dismiss('signing')

      toast.loading('トランザクション確認中…', { id: 'confirming' })
      await connection.confirmTransaction(result.signature, 'confirmed')
      toast.dismiss('confirming')

      await fetch('/api/admin/record-sol-transfer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: sendTarget.userId,
          amount,
          txSignature: result.signature,
          targetWallet: sendTarget.solWallet,
        }),
      })

      toast.success(`${formatInmu(amount)} INMU を ${sendTarget.displayName} に送金しました！`)
      setSendOpen(false)
      setSendAmount('1')
      setSendTarget(null)
      fetchBalance(adminWallet)
    } catch (e: unknown) {
      toast.dismiss('signing')
      toast.dismiss('confirming')
      if (e instanceof Error && e.message !== 'User rejected the request.') {
        toast.error(`送金失敗: ${e.message}`)
      }
    } finally {
      setSendLoading(false)
    }
  }

  if (isAdmin === null || !isAdmin) return null

  const filteredUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(userSearch.toLowerCase()) && u.solWallet
  )

  const shortAddr = adminWallet
    ? `${adminWallet.slice(0, 6)}…${adminWallet.slice(-6)}`
    : null

  return (
    <AdminShell onLogout={handleLogout}>
      <PageHeader titleKey="nav_profile" />

      <div className="flex flex-col gap-4 max-w-md">
        {/* ── 管理者情報 ── */}
        <Card className="border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-3">
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

        {/* ── 管理ウォレット ── */}
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <WalletCards className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">管理ウォレット</h3>
          </div>

          {adminWallet ? (
            <div className="flex flex-col gap-3">
              {/* 接続ステータス */}
              <div className="flex items-center gap-2">
                {walletStatus === 'connected' ? (
                  <>
                    <span className="inline-flex size-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-600">接続中</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex size-2 rounded-full bg-yellow-400" />
                    <span className="text-xs font-medium text-yellow-600">前回接続 (署名時に再接続)</span>
                  </>
                )}
              </div>

              {/* アドレス表示 */}
              <div className="rounded-md bg-secondary/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-1">管理ウォレットアドレス</p>
                <p className="font-mono text-xs break-all">{adminWallet}</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">（{shortAddr}）</p>
              </div>

              {/* INMU残高 */}
              <Card className="border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Coins className="size-4 text-primary" />
                    <p className="text-xs font-medium text-muted-foreground">管理者 INMU 残高</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchBalance(adminWallet)}
                    disabled={balanceLoading}
                    className="size-7 p-0"
                  >
                    <RefreshCw className={`size-3.5 ${balanceLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {balanceLoading ? (
                  <p className="font-mono text-lg font-bold text-muted-foreground">読み込み中…</p>
                ) : inmuBalance !== null ? (
                  <p className="font-mono text-lg font-bold gold-text">
                    {formatInmu(inmuBalance)} INMU
                  </p>
                ) : (
                  <p className="font-mono text-sm text-muted-foreground">取得できませんでした</p>
                )}
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
                  <WalletCards className="size-3.5" />
                  再接続
                </Button>
                <Button
                  onClick={disconnectWallet}
                  disabled={walletLoading}
                  variant="ghost"
                  className="min-h-10 text-destructive gap-1.5 text-xs"
                >
                  <LogOut className="size-3.5" />
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
              {isMobile() && (
                <p className="text-[11px] text-center text-muted-foreground">
                  iPhoneの場合はPhantomアプリが起動します
                </p>
              )}
            </div>
          )}
        </Card>

        {/* ── 実INMU送金 ── */}
        {adminWallet && (
          <Card className="border-primary/30 bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="size-4 text-primary" />
              <h3 className="font-semibold text-sm">実INMU送金</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              接続済みウォレットから指定ユーザーへ実際のINMUを送金します。送金時にPhantomで署名確認が行われます。
            </p>
            {walletStatus === 'cached' && (
              <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-2.5 mb-3">
                <AlertCircle className="size-3.5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-yellow-700 dark:text-yellow-400">
                  前回接続のウォレットを表示中です。送金時に自動でPhantom再接続が行われます。
                </p>
              </div>
            )}
            <Button
              onClick={() => setSendOpen(true)}
              className="min-h-11 w-full gap-2"
            >
              <Send className="size-4" />
              ユーザーを選択して送金
            </Button>
          </Card>
        )}

        {/* ── ログアウト ── */}
        <Card className="border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full min-h-[56px] items-center gap-3 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/20"
          >
            <LogOut className="size-[18px] shrink-0" />
            <span className="flex-1 text-left">管理画面からログアウト</span>
          </button>
        </Card>
      </div>

      {/* ── 実INMU送金ダイアログ ── */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-4 text-primary" />
              実INMU送金
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            {!sendTarget ? (
              <>
                <p className="text-xs text-muted-foreground">SOLアドレス登録済みのユーザーを選択してください</p>
                <Input
                  placeholder="ユーザー名で検索"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="min-h-10"
                />
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    SOLアドレス登録済みのユーザーがいません
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {filteredUsers.map(u => (
                      <button
                        key={u.userId}
                        type="button"
                        onClick={() => setSendTarget(u)}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-secondary/30 transition-colors"
                      >
                        <User className="size-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{u.displayName}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">
                            {u.solWallet?.slice(0, 12)}…
                          </p>
                        </div>
                        <span className="text-xs font-mono shrink-0">{formatInmu(u.balance)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">送金先</p>
                  <p className="font-medium text-sm">{sendTarget.displayName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground break-all mt-0.5">
                    {sendTarget.solWallet}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium mb-1.5">送金量 (INMU)</p>
                  <Input
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    className="min-h-11"
                    placeholder="例: 1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    管理ウォレット残高: {inmuBalance !== null ? formatInmu(inmuBalance) : '—'} INMU
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSendTarget(null)}
                    disabled={sendLoading}
                    className="flex-1 min-h-11"
                  >
                    戻る
                  </Button>
                  <Button
                    onClick={handleSendInmu}
                    disabled={sendLoading || !sendAmount}
                    className="flex-1 min-h-11 gap-2"
                  >
                    <Send className="size-4" />
                    {sendLoading ? '送金中…' : '署名して送金'}
                  </Button>
                </div>

                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
                  <p className="text-[11px] text-yellow-700 dark:text-yellow-400">
                    ⚠️ Phantom で署名確認が行われます。承認すると実際のINMUが送金されます。秘密鍵は一切保存されません。
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}
