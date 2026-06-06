'use server'

import { db } from '@/lib/db'
import {
  goals,
  jars,
  notifications,
  profile,
  rewards,
  transactions,
} from '@/lib/db/schema'
import { TX_OUTGOING_TYPES } from '@/lib/format'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { ensureProfile, getUserId } from './auth-helpers'

// ─────────────────────────── Dashboard ───────────────────────────

export async function getDashboard() {
  const userId = await getUserId()
  const p = await ensureProfile()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))

  let totalReceived = 0
  let totalSent = 0
  let monthlyChange = 0
  for (const t of allTx) {
    const amt = Number(t.amount)
    const outgoing = TX_OUTGOING_TYPES.includes(t.type)
    if (outgoing) totalSent += amt
    else totalReceived += amt
    if (new Date(t.createdAt) >= startOfMonth) {
      monthlyChange += outgoing ? -amt : amt
    }
  }

  const jarRows = await db.select().from(jars).where(eq(jars.userId, userId))
  const jarTotal = jarRows.reduce((s, j) => s + Number(j.balance), 0)

  const goalRows = await db.select().from(goals).where(eq(goals.userId, userId))
  const goalTotalTarget = goalRows.reduce((s, g) => s + Number(g.targetAmount), 0)
  const goalTotalCurrent = goalRows.reduce(
    (s, g) => s + Number(g.currentAmount),
    0,
  )
  const goalRate =
    goalTotalTarget > 0
      ? Math.min(100, (goalTotalCurrent / goalTotalTarget) * 100)
      : 0

  const recent = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(6)

  return {
    balance: Number(p.balance),
    monthlyChange,
    totalReceived,
    totalSent,
    jarTotal,
    goalRate,
    recent,
  }
}

// ─────────────────────────── Transactions ───────────────────────────

export async function getTransactions(filters?: {
  type?: string
  search?: string
}) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))

  let result = rows
  if (filters?.type && filters.type !== 'all') {
    result = result.filter((r) => r.type === filters.type)
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (r) =>
        r.memo?.toLowerCase().includes(q) ||
        r.counterparty?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q),
    )
  }
  return result
}

export async function getTransfers() {
  const userId = await getUserId()
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.type} IN ('send','receive')`,
      ),
    )
    .orderBy(desc(transactions.createdAt))
}

// ─────────────────────────── Jars ───────────────────────────

export async function getJars() {
  const userId = await getUserId()
  return db
    .select()
    .from(jars)
    .where(eq(jars.userId, userId))
    .orderBy(desc(jars.createdAt))
}

export async function createJar(name: string) {
  const userId = await getUserId()
  await db.insert(jars).values({ userId, name })
  revalidatePath('/jars')
}

export async function depositToJar(jarId: number, amount: number) {
  const userId = await getUserId()
  const [jar] = await db
    .select()
    .from(jars)
    .where(and(eq(jars.id, jarId), eq(jars.userId, userId)))
  if (!jar) throw new Error('Jar not found')
  await db
    .update(jars)
    .set({ balance: sql`${jars.balance} + ${amount}` })
    .where(and(eq(jars.id, jarId), eq(jars.userId, userId)))
  revalidatePath('/jars')
}

export async function withdrawFromJar(jarId: number, amount: number) {
  const userId = await getUserId()
  const [jar] = await db
    .select()
    .from(jars)
    .where(and(eq(jars.id, jarId), eq(jars.userId, userId)))
  if (!jar) throw new Error('Jar not found')
  if (jar.isLocked && jar.unlockDate && new Date(jar.unlockDate) > new Date()) {
    throw new Error('LOCKED')
  }
  await db
    .update(jars)
    .set({ balance: sql`GREATEST(${jars.balance} - ${amount}, 0)` })
    .where(and(eq(jars.id, jarId), eq(jars.userId, userId)))
  revalidatePath('/jars')
}

export async function lockJar(jarId: number, days: number) {
  const userId = await getUserId()
  const start = new Date()
  const unlock = new Date()
  unlock.setDate(unlock.getDate() + days)
  await db
    .update(jars)
    .set({ isLocked: true, lockDays: days, lockStart: start, unlockDate: unlock })
    .where(and(eq(jars.id, jarId), eq(jars.userId, userId)))
  revalidatePath('/jars')
}

export async function deleteJar(jarId: number) {
  const userId = await getUserId()
  await db.delete(jars).where(and(eq(jars.id, jarId), eq(jars.userId, userId)))
  revalidatePath('/jars')
}

// ─────────────────────────── Goals ───────────────────────────

export async function getGoals() {
  const userId = await getUserId()
  return db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.createdAt))
}

export async function createGoal(name: string, targetAmount: number) {
  const userId = await getUserId()
  await db.insert(goals).values({ userId, name, targetAmount: String(targetAmount) })
  revalidatePath('/goals')
}

export async function addGoalProgress(goalId: number, amount: number) {
  const userId = await getUserId()
  await db
    .update(goals)
    .set({ currentAmount: sql`${goals.currentAmount} + ${amount}` })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
  revalidatePath('/goals')
}

export async function deleteGoal(goalId: number) {
  const userId = await getUserId()
  await db.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
  revalidatePath('/goals')
}

// ─────────────────────────── Rewards ───────────────────────────

export async function getRewards() {
  const userId = await getUserId()
  return db
    .select()
    .from(rewards)
    .where(eq(rewards.userId, userId))
    .orderBy(desc(rewards.createdAt))
}

// ─────────────────────────── Airdrops ───────────────────────────

export async function getAirdrops() {
  const userId = await getUserId()
  const received = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'airdrop')))
    .orderBy(desc(transactions.createdAt))
  return { received }
}

// ─────────────────────────── Notifications ───────────────────────────

export async function getNotifications() {
  const userId = await getUserId()
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
}

export async function getUnreadCount() {
  const userId = await getUserId()
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
  return row?.count ?? 0
}

export async function markAllRead() {
  const userId = await getUserId()
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId))
  revalidatePath('/notifications')
}

// ─────────────────────────── Community / Ranking ───────────────────────────

export async function getCommunityStats() {
  const userId = await getUserId()
  const p = await ensureProfile()

  const received = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))

  const receiveCount = received.filter(
    (t) => !TX_OUTGOING_TYPES.includes(t.type),
  ).length
  const totalReceivedInmu = received
    .filter((t) => !TX_OUTGOING_TYPES.includes(t.type))
    .reduce((s, t) => s + Number(t.amount), 0)

  // rank by balance
  const allProfiles = await db
    .select({ userId: profile.userId, balance: profile.balance })
    .from(profile)
    .orderBy(desc(profile.balance))
  const rank = allProfiles.findIndex((x) => x.userId === userId) + 1

  return {
    participations: p.participationCount,
    receiveCount,
    totalReceivedInmu,
    rank: rank || allProfiles.length,
    totalUsers: allProfiles.length,
  }
}

export async function getRanking() {
  await getUserId()
  const rows = await db
    .select({
      userId: profile.userId,
      displayName: profile.displayName,
      balance: profile.balance,
      participationCount: profile.participationCount,
    })
    .from(profile)
    .orderBy(desc(profile.balance))
    .limit(50)

  // total received per user
  const totals = await db
    .select({
      userId: transactions.userId,
      total: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} NOT IN ('withdraw','send') THEN ${transactions.amount} ELSE 0 END),0)::float`,
    })
    .from(transactions)
    .groupBy(transactions.userId)

  const totalMap = new Map(totals.map((t) => [t.userId, Number(t.total)]))

  // NOTE: solWallet intentionally NOT included — ranking never exposes wallet.
  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    displayName: r.displayName || 'INMU User',
    balance: Number(r.balance),
    totalReceived: totalMap.get(r.userId) ?? 0,
    participations: r.participationCount,
  }))
}

// ─────────────────────────── Profile ───────────────────────────

export async function getMyProfile() {
  await getUserId()
  return ensureProfile()
}

export async function updateMyProfile(input: {
  displayName?: string
  xId?: string
  discordId?: string
  solWallet?: string
}) {
  const userId = await getUserId()
  await ensureProfile()
  await db
    .update(profile)
    .set({
      displayName: input.displayName,
      xId: input.xId,
      discordId: input.discordId,
      solWallet: input.solWallet,
      updatedAt: new Date(),
    })
    .where(eq(profile.userId, userId))
  revalidatePath('/profile')
}
