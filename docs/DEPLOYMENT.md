# Deployment

DeskPal HQ has two deployable parts:

1. A **Supabase backend** (Postgres + Auth + Storage), configured by the SQL
   migrations in [`supabase/migrations/`](../supabase/migrations/).
2. A **static frontend** (Vite + React) that talks to Supabase from the browser.

## Prerequisites

- A [Supabase](https://supabase.com) project.
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase`) for
  running migrations.
- Node.js 18+ or [Bun](https://bun.sh) (this repo uses Bun; `bun.lock` is the
  committed lockfile).

## 1. Configure environment

Copy the template and fill in your project's values:

```bash
cp .env.example .env
```

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | public anon key |
| `VITE_SUPABASE_PROJECT_ID` | frontend | project ref |
| `SUPABASE_SERVICE_ROLE_KEY` | CI/tests only | **secret**, never in the browser |

## 2. Deploy the database

Link the CLI to your project (once), then push migrations:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push          # applies supabase/migrations in order
```

To create a new change, add a migration and push it:

```bash
supabase migration new <name>
# edit the generated SQL file, then:
supabase db push
```

> Migrations are plain SQL and run in filename (timestamp) order. Review each
> one — many define Row-Level Security policies and security-definer functions
> that are central to tenant isolation.

### Auth & storage settings

In the Supabase dashboard, confirm:

- **Auth → Providers:** email enabled; configure the Site URL and redirect URLs
  to your deployed frontend domain (needed for password reset links).
- **Auth → Policies:** leaked-password (HIBP) protection enabled.
- **Storage:** buckets for avatars, employee documents and payslip files exist
  with the expected access policies.

## 3. Build the frontend

```bash
bun install
bun run build     # outputs to dist/
```

`dist/` is a static bundle. Host it on any static host or CDN, for example:

- **Vercel / Netlify / Cloudflare Pages:** set the build command to
  `bun run build` and the output directory to `dist`. Add the `VITE_*`
  environment variables in the host's dashboard.
- **Any static server:** serve the contents of `dist/`.

### SPA routing

This is a client-side-routed single-page app. Configure your host to **rewrite
all unknown paths to `/index.html`** so deep links (e.g. `/employees`) work on
refresh. Example rewrite rule:

```
/*    /index.html    200
```

## 4. Post-deploy checks

- Sign up a new company at `/signup` and confirm the setup wizard loads.
- Confirm password-reset emails arrive and their links point to your domain.
- Verify a non-admin user cannot reach admin-only routes (RLS + route guards).
- Run the end-to-end suite against the deployment:

  ```bash
  E2E_BASE_URL="https://your-domain" bun run e2e
  ```

  (requires `SUPABASE_SERVICE_ROLE_KEY` in the environment for seeding).

## 5. Secrets & rotation

- Never commit `.env`. If a secret is ever exposed, rotate it in
  **Supabase → Project Settings → API** immediately.
- The service-role key grants full database access and must live only in CI or
  a trusted server environment — never in the frontend bundle.
