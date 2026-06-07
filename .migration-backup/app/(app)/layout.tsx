import { AppShell } from '@/components/app-shell'
import { getSession } from '@/lib/auth'
import { ensureProfile } from '@/app/actions/auth-helpers'
import { getUnreadCount } from '@/app/actions/data'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  let displayName = session.user.name || 'Demo User'
  let isAdmin = false
  let unread = 0

  try {
    const profile = await ensureProfile()
    displayName = profile.displayName || displayName
    isAdmin = profile.role === 'admin'
  } catch {
    // DB unavailable — show app with defaults
  }

  try {
    unread = await getUnreadCount()
  } catch {
    unread = 0
  }

  return (
    <AppShell
      isAdmin={isAdmin}
      displayName={displayName}
      unread={unread}
    >
      {children}
    </AppShell>
  )
}
