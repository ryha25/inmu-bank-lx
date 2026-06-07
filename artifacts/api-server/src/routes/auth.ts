import { Router } from "express";
import { db } from "@workspace/db";
import { userTable, profileTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, makeSessionValue } from "../middlewares/session";

const router = Router();

router.get("/session", async (req, res): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ user: null });
    return;
  }
  res.json({
    user: {
      id: req.userId,
      email: req.userEmail,
      name: req.userName,
    },
  });
});

router.post("/sign-in", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  try {
    let user = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .then((r) => r[0]);

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await ensureProfile(user.id, user.name);

    res.cookie(SESSION_COOKIE, makeSessionValue(user.id, user.email, user.name ?? ""), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch {
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/sign-up", async (req, res): Promise<void> => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };
  if (!email || !password || !name) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  try {
    const existing = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email))
      .then((r) => r[0]);
    if (existing) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await db.insert(userTable).values({
      id: userId,
      email,
      name,
      emailVerified: false,
    });
    await ensureProfile(userId, name);

    res.cookie(SESSION_COOKIE, makeSessionValue(userId, email, name), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    res.status(201).json({ user: { id: userId, email, name } });
  } catch {
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/sign-out", (_req, res): void => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

async function ensureProfile(userId: string, displayName: string) {
  const existing = await db
    .select()
    .from(profileTable)
    .where(eq(profileTable.userId, userId))
    .then((r) => r[0]);
  if (!existing) {
    await db.insert(profileTable).values({ userId, displayName });
  }
}

export default router;
