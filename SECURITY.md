# Security Policy

DeskPal HQ is a multi-tenant HR platform that stores personal and payroll data,
so we take security seriously. This document explains how to report a
vulnerability and summarizes the controls already in place.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Instead, report privately:

- Email: `security@<your-domain>` (replace with your real security contact)
- Or use GitHub's **private vulnerability reporting**: the repository's
  **Security → Report a vulnerability** tab.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (proof-of-concept, affected endpoint/role, screenshots).
- Any suggested remediation.

**What to expect**

- Acknowledgement within **3 business days**.
- A triage assessment and severity rating.
- Progress updates until the issue is resolved.
- Credit in the release notes once a fix ships, if you would like it.

Please give us a reasonable window to fix the issue before any public
disclosure. Do not access, modify, or exfiltrate data that is not yours, and do
not run denial-of-service or load tests against production.

## Supported versions

This is an actively developed application; only the latest `main` branch (and
the current production deployment) receives security fixes.

## Security model (summary)

Most of the security surface lives in the Supabase/Postgres backend, not the
frontend:

- **Row-Level Security on every table**, scoped by the signed-in user's active
  company membership, so one tenant can never read another tenant's rows.
- **Server-side role checks** via security-definer helpers
  (`has_role`, `is_hr`, `is_manager_of`, `is_platform_admin`, `current_company_id`).
- **Self-approval / self-edit guards** on attendance, leave, performance
  reviews and profiles, enforced in the database — not just the UI.
- **Privileged operations run through security-definer functions**; the
  frontend only ever holds the public publishable (anon) key. The service-role
  key is never shipped to the browser.
- **Rate-limited sign-in** (5 failed attempts per email in 15 minutes → 15 min
  lockout) with generic error messages that don't reveal whether an account
  exists; sign-in fingerprints are one-way hashed.
- **Session limits**: 30 minutes idle / 12 hours absolute, then auto sign-out.
- **Password policy**: minimum 8 characters, HaveIBeenPwned breach check, and
  90-day expiry; passwords are only ever stored as bcrypt hashes by the auth
  service.
- **CSV / spreadsheet injection protection**: all exports neutralize cells
  beginning with `=`, `+`, `-`, `@`, tab or carriage return.
- **Tamper-evident audit logs** for sensitive and platform-owner actions.

See the "Security model" section of the [README](README.md) for the full list.

## Handling secrets

- Never commit `.env` (it is git-ignored). Use [`.env.example`](.env.example)
  as the template.
- The `SUPABASE_SERVICE_ROLE_KEY` is used **only** by local/CI end-to-end tests
  and must never reach client code or a public environment variable.
- If a secret is ever committed, rotate it immediately in the Supabase
  dashboard — removing it from a later commit does not remove it from history.
