'use server'

import { db } from '@/lib/db'
import {
  goals,
  jars,
  notifications,
  profile,
  rewards,
  transactions,
  user,
} from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from './auth-helpers'

// ─────────────────────────── User listing ───────────────────────────

export async function adminListUsers() {
  await requireAdmin()
  const rows = await db
    .select({
      userId: profile.userId,
      displayName: profile.displayName,
      email: user.email,
      role: profile.role,
      balance: profile.balance,
      xId: profile.xId,
      discordId: profile.discordId,
      solWallet: profile.solWallet,
      participationCount: profile.participationCount,
      createdAt: profile.createdAt,
    })
    .from(profile)
    .leftJoin(user, eq(user.id, profile.userId))
  return rows
}

// ─────────────────────────── Balance / transactions ───────────────────────────

async function notify(
  userId: string,
  type: string,
  title: string,
  message: string,
) {
  await db.insert(notifications).values({ userId, type, title, message })
}

export async function adminChangeBalance(
  targetUserId: string,
  newBalance: number,
  reason: string,
) {
  await requireAdmin()
  await db
    .update(profile)
    .set({ balance: String(newBalance), updatedAt: new Date() })
    .where(eq(profile.userId, targetUserId))
  await notify(
    targetUserId,
    'deposit',
    '残高が更新されました',
    reason || `残高が ${newBalance} に設定されました`,
  )
  revalidatePath('/admin')
}

export async function adminRegisterTx(input: {
  targetUserId: string
  type: string
  amount: number
  counterparty?: string
  memo?: string
}) {
  await requireAdmin()
  const { targetUserId, type, amount, counterparty, memo } = input
  await db.insert(transactions).values({
    userId: targetUserId,
    type,
    amount: String(amount),
    counterparty,
    memo,
  })
  const outgoing = type === 'withdraw' || type === 'send'
  await db
    .update(profile)
    .set({
      balance: outgoing
        ? sql`GREATEST(${profile.balance} - ${amount}, 0)`
        : sql`${profile.balance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(profile.userId, targetUserId))
  await notify(
    targetUserId,
    outgoing ? 'withdraw' : 'deposit',
    outgoing ? '出金が登録されました' : '入金が登録されました',
    `${amount} INMU`,
  )
  revalidatePath('/admin')
}

export async function adminDistributeReward(input: {
  targetUserId: string
  type: string
  amount: number
  memo?: string
}) {
  await requireAdmin()
  const { targetUserId, type, amount, memo } = input
  await db.insert(rewards).values({
    userId: targetUserId,
    type,
    amount: String(amount),
    memo,
  })
  await db.insert(transactions).values({
    userId: targetUserId,
    type: 'reward',
    amount: String(amount),
    category: type,
    memo,
  })
  await db
    .update(profile)
    .set({
      balance: sql`${profile.balance} + ${amount}`,
      participationCount: sql`${profile.participationCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(profile.userId, targetUserId))
  await notify(targetUserId, 'reward', '報酬が配布されました', `${amount} INMU (${type})`)
  revalidatePath('/admin')
}

export async function adminDistributeAirdrop(input: {
  targetUserIds: string[]
  amount: number
  memo?: string
}) {
  await requireAdmin()
  const { targetUserIds, amount, memo } = input
  for (const targetUserId of targetUserIds) {
    await db.insert(transactions).values({
      userId: targetUserId,
      type: 'airdrop',
      amount: String(amount),
      memo,
    })
    await db
      .update(profile)
      .set({
        balance: sql`${profile.balance} + ${amount}`,
        participationCount: sql`${profile.participationCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(profile.userId, targetUserId))
    await notify(
      targetUserId,
      'airdrop',
      'エアドロップを受け取りました',
      `${amount} INMU`,
    )
  }
  revalidatePath('/admin')
}

export async function adminSetRole(targetUserId: string, role: 'user' | 'admin') {
  await requireAdmin()
  await db
    .update(profile)
    .set({ role, updatedAt: new Date() })
    .where(eq(profile.userId, targetUserId))
  revalidatePath('/admin')
}

// ─────────────────────────── Reset functions ───────────────────────────

export async function adminResetUserBalance(targetUserId: string) {
  await requireAdmin()
  await db
    .update(profile)
    .set({ balance: '0', updatedAt: new Date() })
    .where(eq(profile.userId, targetUserId))
  revalidatePath('/admin')
}

export async function adminResetUserHistory(targetUserId: string) {
  await requireAdmin()
  await db.delete(transactions).where(eq(transactions.userId, targetUserId))
  await db.delete(rewards).where(eq(rewards.userId, targetUserId))
  revalidatePath('/admin')
}

export async function adminResetUser(targetUserId: string) {
  await requireAdmin()
  await db.delete(transactions).where(eq(transactions.userId, targetUserId))
  await db.delete(rewards).where(eq(rewards.userId, targetUserId))
  await db.delete(jars).where(eq(jars.userId, targetUserId))
  await db.delete(goals).where(eq(goals.userId, targetUserId))
  await db.delete(notifications).where(eq(notifications.userId, targetUserId))
  await db
    .update(profile)
    .set({ balance: '0', participationCount: 0, updatedAt: new Date() })
    .where(eq(profile.userId, targetUserId))
  revalidatePath('/admin')
}

export async function adminResetAll() {
  await requireAdmin()
  await db.delete(transactions)
  await db.delete(rewards)
  await db.delete(jars)
  await db.delete(goals)
  await db.delete(notifications)
  await db.update(profile).set({ balance: '0', participationCount: 0 })
  revalidatePath('/admin')
}

// ─────────────────────────── CSV backup (admin includes wallet) ───────────────────────────

export async function adminBackupCsv(): Promise<string> {
  await requireAdmin()
  const users = await db
    .select({
      userId: profile.userId,
      displayName: profile.displayName,
      email: user.email,
      role: profile.role,
      balance: profile.balance,
      xId: profile.xId,
      discordId: profile.discordId,
      solWallet: profile.solWallet,
      participationCount: profile.participationCount,
    })
    .from(profile)
    .leftJoin(user, eq(user.id, profile.userId))

  const header = [
    'userId',
    'displayName',
    'email',
    'role',
    'balance',
    'xId',
    'discordId',
    'solWallet',
    'participationCount',
  ]
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [header.join(',')]
  for (const u of users) {
    lines.push(
      [
        u.userId,
        u.displayName,
        u.email,
        u.role,
        u.balance,
        u.xId,
        u.discordId,
        u.solWallet, // admin backup includes wallet
        u.participationCount,
      ]
        .map(escape)
        .join(','),
    )
  }
  return lines.join('\n')
}
