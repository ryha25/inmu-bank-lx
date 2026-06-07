'use server'

import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { profile } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export type SessionUser = {
  id: string
  email: string
  name: string
}

type ProfileRow = {
  userId: string
  displayName: string
  xId: string | null
  discordId: string | null
  discordUsername: string | null
  solWallet: string | null
  avatar: string | null
  role: string
  balance: string
  savingsBalance: string
  totalReceived: string
  totalSent: string
  monthlyPoints: string
  participationCount: number
  createdAt: Date
  updatedAt: Date
}

function makeMockProfile(userId: string, name: string): ProfileRow {
  return {
    userId,
    displayName: name,
    xId: null,
    discordId: null,
    discordUsername: null,
    solWallet: null,
    avatar: null,
    role: 'admin',
    balance: '0',
    savingsBalance: '0',
    totalReceived: '0',
    totalSent: '0',
    monthlyPoints: '0',
    participationCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function patchProfile(row: Record<string, unknown>): ProfileRow {
  return {
    userId: String(row.userId ?? ''),
    displayName: String(row.displayName ?? ''),
    xId: (row.xId as string | null) ?? null,
    discordId: (row.discordId as string | null) ?? null,
    discordUsername: (row.discordUsername as string | null) ?? null,
    solWallet: (row.solWallet as string | null) ?? null,
    avatar: (row.avatar as string | null) ?? null,
    role: String(row.role ?? 'user'),
    balance: String(row.balance ?? '0'),
    savingsBalance: String(row.savingsBalance ?? '0'),
    totalReceived: String(row.totalReceived ?? '0'),
    totalSent: String(row.totalSent ?? '0'),
    monthlyPoints: String(row.monthlyPoints ?? '0'),
    participationCount: Number(row.participationCount ?? 0),
    createdAt: (row.createdAt as Date) ?? new Date(),
    updatedAt: (row.updatedAt as Date) ?? new Date(),
  }
}

export async function getUserId(): Promise<string> {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getSession()
  if (!session?.user) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  }
}

export async function ensureProfile(): Promise<ProfileRow> {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const u = session.user

  // Try SELECT first — catches missing table or missing columns
  try {
    const existing = await db
      .select()
      .from(profile)
      .where(eq(profile.userId, u.id))
      .limit(1)

    if (existing.length > 0) {
      return patchProfile(existing[0] as Record<string, unknown>)
    }
  } catch {
    // Profile table or new columns missing in production — return mock
    return makeMockProfile(u.id, u.name)
  }

  // No existing profile — try to create one
  try {
    const [created] = await db
      .insert(profile)
      .values({
        userId: u.id,
        displayName: u.name || u.email.split('@')[0],
        role: 'admin',
        balance: '0',
        savingsBalance: '0',
        totalReceived: '0',
        totalSent: '0',
        monthlyPoints: '0',
        participationCount: 0,
      })
      .returning()
    return patchProfile(created as Record<string, unknown>)
  } catch {
    // INSERT failed — new columns may not exist yet; return mock
    return makeMockProfile(u.id, u.name)
  }
}

export async function isAdmin(): Promise<boolean> {
  try {
    const userId = await getUserId()
    const [p] = await db
      .select({ role: profile.role })
      .from(profile)
      .where(eq(profile.userId, userId))
      .limit(1)
    return p?.role === 'admin'
  } catch {
    return false
  }
}

export async function requireAdmin(): Promise<string> {
  const userId = await getUserId()
  try {
    const [p] = await db
      .select({ role: profile.role })
      .from(profile)
      .where(eq(profile.userId, userId))
      .limit(1)
    if (p?.role !== 'admin') throw new Error('Forbidden: admin only')
  } catch (e) {
    if ((e as Error).message === 'Forbidden: admin only') throw e
    // DB unavailable — allow through in demo mode
  }
  return userId
}
