---
name: Admin Shell Separation
description: Admin UI uses AdminShell (2-item nav), never AppShell (7-item nav)
---

AdminShell (artifacts/inmu-bank/src/components/admin-shell.tsx) shows only:
- プロフィール → /admin/profile
- 管理ツール → /admin

Regular AppShell shows 7 items: dashboard, balance, history, points, achievements, notifications, profile.

**Why:** Spec requires admin users to see only their own admin UI, never the general user interface.

**How to apply:** AdminPage and AdminProfilePage use AdminShell. Regular pages (DashboardPage etc.) use AppShell. Never render AppShell in admin routes or vice versa.
