import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

// ── Better Auth tables (column names must match Better Auth defaults) ──
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// ── INMU Bank app tables ──
export const profile = pgTable('profile', {
  userId: text('userId').primaryKey(),
  displayName: text('displayName').notNull().default(''),
  xId: text('xId'),
  discordId: text('discordId'),
  solWallet: text('solWallet'),
  role: text('role').notNull().default('user'),
  balance: numeric('balance').notNull().default('0'),
  participationCount: integer('participationCount').notNull().default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  type: text('type').notNull(), // deposit | withdraw | send | receive | reward | airdrop
  amount: numeric('amount').notNull(),
  category: text('category'),
  counterparty: text('counterparty'),
  memo: text('memo'),
  jarId: integer('jarId'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const jars = pgTable('jars', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  balance: numeric('balance').notNull().default('0'),
  isLocked: boolean('isLocked').notNull().default(false),
  lockDays: integer('lockDays'),
  lockStart: timestamp('lockStart'),
  unlockDate: timestamp('unlockDate'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  targetAmount: numeric('targetAmount').notNull(),
  currentAmount: numeric('currentAmount').notNull().default('0'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const rewards = pgTable('rewards', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  type: text('type').notNull(), // 810day | inmuday | campaign | airdrop
  amount: numeric('amount').notNull(),
  memo: text('memo'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  type: text('type').notNull(), // deposit | withdraw | reward | airdrop
  title: text('title').notNull(),
  message: text('message'),
  isRead: boolean('isRead').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
