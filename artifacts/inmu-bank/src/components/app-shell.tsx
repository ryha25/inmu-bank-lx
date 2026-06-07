import { Logo } from '@/components/logo'
import { LangToggle } from '@/components/lang-toggle'
import { signOut } from '@/lib/auth-client'
import { useI18n } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/dict'
import { cn } from '@/lib/utils'
import {
  Award, Bell, Coins, Gift, History, LayoutDashboard,
  LogOut, Menu, PiggyBank, Send, Shield, Star, Target,
  Trophy, User as UserIcon, Users, X,
} from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { useState } from 'react'

type NavItem = { href: string; key: TranslationKey; icon: React.ElementType }

const FULL_NAV: NavItem[] = [
  { href: '/',              key: 'nav_dashboard',     icon: LayoutDashboard },
  { href: '/balance',       key: 'nav_balance',       icon: Coins },
  { href: '/history',       key: 'nav_history',       icon: History },
  { href: '/transfers',     key: 'nav_transfers',     icon: Send },
  { href: '/jars',          key: 'nav_jars',          icon: PiggyBank },
  { href: '/goals',         key: 'nav_goals',         icon: Target },
  { href: '/rewards',       key: 'nav_rewards',       icon: Award },
  { href: '/airdrops',      key: 'nav_airdrops',      icon: Gift },
  { href: '/community',     key: 'nav_community',     icon: Users },
  { href: '/ranking',       key: 'nav_ranking',       icon: Trophy },
  { href: '/points',        key: 'nav_points',        icon: Star },
  { href: '/notifications', key: 'nav_notifications', icon: Bell },
  { href: '/profile',       key: 'nav_profile',       icon: UserIcon },
]

export function AppShell({
  children,
  isAdmin,
  displayName,
  unread,
}: {
  children: React.ReactNode
  isAdmin: boolean
  displayName: string
  unread: number
}) {
  const { t } = useI18n()
  const [location, navigate] = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems: NavItem[] = isAdmin
    ? [...FULL_NAV, { href: '/admin', key: 'nav_admin' as const, icon: Shield }]
    : FULL_NAV

  async function handleSignOut() {
    await signOut()
    navigate('/sign-in')
  }

  const isActive = (href: string) =>
    href === '/' ? location === '/' : location.startsWith(href)

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <ul className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onClick}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span>{t(item.key)}</span>
              {item.href === '/notifications' && unread > 0 && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="min-h-dvh">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Logo size={32} />
          <span className="font-bold tracking-tight gold-text">INMU Bank</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavList />
        </nav>
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-[18px]" />
            {t('nav_signout')}
          </button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          {/* panel */}
          <aside
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                <Logo size={28} />
                <span className="font-bold tracking-tight gold-text">INMU Bank</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>
            {displayName && (
              <div className="border-b border-border px-5 py-3">
                <p className="text-xs text-muted-foreground">{displayName}</p>
              </div>
            )}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <NavList onClick={() => setDrawerOpen(false)} />
            </nav>
            <div className="border-t border-border p-3">
              <button
                type="button"
                onClick={() => { setDrawerOpen(false); handleSignOut() }}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="size-[18px]" />
                {t('nav_signout')}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
              aria-label="メニュー"
            >
              <Menu className="size-5" />
            </button>
            <Logo size={26} />
            <span className="font-bold tracking-tight gold-text text-sm">INMU Bank</span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <Link
              href="/notifications"
              className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card/60 lg:hidden"
              aria-label={t('nav_notifications')}
            >
              <Bell className="size-[18px]" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
