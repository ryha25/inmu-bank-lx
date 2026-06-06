'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { profile } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export type SessionUser = {
  id: string
  email: string
  name: string
}

/** Returns the authenticated user id, or throws. */
export async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  }
}

/**
 * Ensure a profile row exists for the current user. The first user (or any
 * email listed in ADMIN_EMAILS) is granted the admin role. Returns the profile.
 */
export async function ensureProfile() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const u = session.user

  const existing = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, u.id))
    .limit(1)

  if (existing.length > 0) return existing[0]

  // Determine role: env admin list, or first ever user becomes admin.
  let role = 'user'
  if (ADMIN_EMAILS.includes(u.email.toLowerCase())) {
    role = 'admin'
  } else {
    const anyProfile = await db.select({ userId: profile.userId }).from(profile).limit(1)
    if (anyProfile.length === 0) role = 'admin'
  }

  const [created] = await db
    .insert(profile)
    .values({
      userId: u.id,
      displayName: u.name || u.email.split('@')[0],
      role,
    })
    .returning()

  return created
}

export async function isAdmin(): Promise<boolean> {
  const userId = await getUserId()
  const [p] = await db
    .select({ role: profile.role })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)
  return p?.role === 'admin'
}

export async function requireAdmin(): Promise<string> {
  const userId = await getUserId()
  const [p] = await db
    .select({ role: profile.role })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1)
  if (p?.role !== 'admin') throw new Error('Forbidden: admin only')
  return userId
}
