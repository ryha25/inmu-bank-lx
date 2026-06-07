import { DashboardView } from '@/components/dashboard-view'
import { ensureProfile } from '@/app/actions/auth-helpers'
import { getDashboard } from '@/app/actions/data'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

const DEMO_DASHBOARD = {
  balance: 0,
  savingsBalance: 0,
  totalReceived: 0,
  totalSent: 0,
  monthlyPoints: 0,
  monthlyChange: 0,
  jarTotal: 0,
  goalRate: 0,
  recent: [] as Array<{
    id: number
    userId: string
    type: string
    amount: string
    category: string | null
    counterparty: string | null
    counterpartyId: string | null
    memo: string | null
    jarId: number | null
    createdAt: string
  }>,
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  let displayName = session.user.name || 'Demo User'
  let data = DEMO_DASHBOARD

  try {
    const profile = await ensureProfile()
    displayName = profile.displayName || displayName

    const raw = await getDashboard()
    data = {
      ...raw,
      recent: raw.recent.map((t) => ({
        ...t,
        createdAt: t.createdAt instanceof Date
          ? t.createdAt.toISOString()
          : String(t.createdAt),
      })),
    }
  } catch {
    // DB unavailable — show demo dashboard with zero balances
  }

  return <DashboardView data={data} displayName={displayName} />
}
