import { AppShell } from '@/components/app-shell'
import { auth } from '@/lib/auth'
import { ensureProfile } from '@/app/actions/auth-helpers'
import { getUnreadCount } from '@/app/actions/data'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const profile = await ensureProfile()
  const unread = await getUnreadCount()

  return (
    <AppShell
      isAdmin={profile.role === 'admin'}
      displayName={profile.displayName}
      unread={unread}
    >
      {children}
    </AppShell>
  )
}
