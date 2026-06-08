---
name: Admin Auth Pattern
description: Admin login uses ADMIN_CODE env var only; no email/password required
---

Admin login endpoint: POST /api/auth/admin-code-login with body { code: string }
Also accepts: POST /api/auth/admin-sign-in with body { code: string }
Both check against process.env.ADMIN_CODE (set to INMU2026 in shared env vars)

**Why:** User spec required code-only auth (no email, no password). Previous implementation used ADMIN_PASSWORD which was shared with other potential password logic.

**How to apply:** Any future admin auth changes must use ADMIN_CODE env var. Never revert to email+password login for admin. The admin session uses ADMIN_SESSION_COOKIE (inmu-admin-session), separate from user session cookie (inmu-session).
