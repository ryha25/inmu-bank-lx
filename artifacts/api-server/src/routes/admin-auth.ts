import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { ADMIN_SESSION_COOKIE, makeAdminSessionValue } from "../middlewares/session";

const router = Router();

function safeEqual(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) {
      timingSafeEqual(ab, ab);
      return false;
    }
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

router.post("/auth/admin-sign-in", (req, res): void => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("[AdminAuth] ADMIN_EMAIL or ADMIN_PASSWORD secret not set");
    res.status(503).json({ error: "Admin credentials not configured" });
    return;
  }

  const emailMatch = safeEqual(email, adminEmail);
  const passwordMatch = safeEqual(password, adminPassword);

  if (!emailMatch || !passwordMatch) {
    console.warn(`[AdminAuth] Failed admin login attempt for email: ${email}`);
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  console.info("[AdminAuth] Admin login successful");
  res.cookie(ADMIN_SESSION_COOKIE, makeAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({ ok: true });
});

router.post("/auth/admin-sign-out", (_req, res): void => {
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/admin-session", (req, res): void => {
  res.json({ isAdmin: !!req.isAdminSession });
});

export default router;
