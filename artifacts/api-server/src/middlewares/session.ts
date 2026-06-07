import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { profileTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "inmu-session";
export const DEMO_SESSION_COOKIE = SESSION_COOKIE;

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userName?: string;
    }
  }
}

export function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const cookie = req.cookies?.[SESSION_COOKIE];
  if (cookie && typeof cookie === "string") {
    try {
      const data = JSON.parse(Buffer.from(cookie, "base64url").toString("utf8")) as {
        userId?: string; email?: string; name?: string;
      };
      if (data.userId) {
        req.userId = data.userId;
        req.userEmail = data.email;
        req.userName = data.name;
      }
    } catch {
      // ignore malformed cookie
    }
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const profile = await db
      .select({ role: profileTable.role })
      .from(profileTable)
      .where(eq(profileTable.userId, req.userId))
      .then((r) => r[0]);
    if (!profile || profile.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: "Internal error" });
  }
}

export function makeSessionValue(userId: string, email: string, name: string): string {
  return Buffer.from(JSON.stringify({ userId, email, name })).toString("base64url");
}
