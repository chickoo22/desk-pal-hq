# Architecture

A high-level map of how DeskPal HQ is put together. For the feature list and
data model, see the [README](../README.md); for the security controls, see
[SECURITY.md](../SECURITY.md).

## Overview

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│  Browser (React SPA)         │        │  Supabase                         │
│                              │        │                                   │
│  React 18 + TypeScript       │  HTTPS │  ┌─────────────┐  ┌────────────┐  │
│  Vite build                  │ ─────▶ │  │ Auth (GoTrue)│  │  Storage   │  │
│  TanStack Query (data)       │        │  └─────────────┘  └────────────┘  │
│  React Router (routing)      │        │  ┌────────────────────────────┐   │
│  shadcn/ui + Tailwind        │ ◀───── │  │ Postgres                   │   │
│  @supabase/supabase-js       │        │  │  • RLS per company_id      │   │
│                              │        │  │  • security-definer fns    │   │
│  anon/publishable key only   │        │  │  • triggers enforce rules  │   │
└─────────────────────────────┘        │  └────────────────────────────┘   │
                                        └──────────────────────────────────┘
```

There is **no custom application server**. The browser talks directly to
Supabase using the public anon key, and all authorization is enforced in the
database via Row-Level Security (RLS) and security-definer functions. This is
the most important thing to understand about the system: business rules and
access control live in SQL, not in the frontend.

## Frontend

- **Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS v3, shadcn/ui,
  Recharts, TanStack Query.
- **Routing:** `react-router-dom`. Route guards in
  [`src/App.tsx`](../src/App.tsx) (`ProtectedRoute`, `WorkspaceRoute`,
  `OwnerRoute`, etc.) gate screens by auth state, role and feature flag. These
  are UX conveniences — the database enforces the same rules independently.
- **Auth/session state:** [`src/contexts/AuthContext.tsx`](../src/contexts/AuthContext.tsx)
  holds the session, company memberships, active company, role and feature
  flags.
- **Data access:** the generated Supabase client in
  [`src/integrations/supabase/`](../src/integrations/supabase/) (do not hand-edit
  `types.ts`), with TanStack Query for caching.
- **Structure:**
  - `src/pages/` — one file per screen.
  - `src/components/` — shared UI and feature components.
  - `src/lib/` — salary math, leave helpers, spreadsheet import/mapping, CSV
    export, feature flags.

## Backend (Supabase / Postgres)

- **Schema & logic:** all in [`supabase/migrations/`](../supabase/migrations/)
  as timestamped SQL files applied in order.
- **Multi-tenancy:** every company-scoped table carries a `company_id`, and RLS
  policies match it against the signed-in user's active company. Roles live in
  a separate `user_roles` table (never on the profile) and are checked by
  security-definer helpers: `has_role`, `is_hr`, `is_manager_of`,
  `is_platform_admin`, `current_company_id`.
- **New-user flow:** the `handle_new_user()` trigger on `auth.users` creates the
  `companies`/`profiles`/`user_roles` rows (or consumes an invite) on sign-up.
- **Business rules in the database:** clock-in/out, attendance-request
  application, leave overlap and balance checks, locked pay periods,
  self-approval blocks, "last leave type enabled" and the five importers are all
  enforced by functions and triggers, so they can't be bypassed from the client.
- **Auth:** Supabase GoTrue (email). Passwords are bcrypt-hashed by GoTrue; the
  app never sees them.
- **Storage:** buckets for avatars, employee documents and payslip files, with
  per-company access policies.

## Data flow example — applying for leave

1. Employee submits a leave request in the UI; `supabase-js` inserts into
   `leave_requests` using the anon key.
2. RLS confirms the row belongs to the user's active company; triggers validate
   overlap, balance and date rules — rejecting the insert if they fail.
3. Notifications are created for the reporting manager and HR.
4. Manager (stage 1) then HR (stage 2) approve; approval is blocked for the
   requester's own request by a database guard.
5. On final approval the balance is updated and the leave appears on the
   attendance calendar.

## Testing

- **Unit:** Vitest (`bun run test`).
- **End-to-end:** Playwright in [`e2e/`](../e2e/), seeding data with the
  service-role key via [`e2e/helpers/`](../e2e/helpers/). See
  [TEST_PLAN.md](TEST_PLAN.md).

## Key conventions

- Authorization is a database concern first; UI guards mirror it but never
  replace it.
- Never ship the service-role key to the browser — only the publishable key.
- The design system in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and
  `docs/brand-tokens.html` is the source of truth for UI; use semantic tokens,
  not raw palette values.
