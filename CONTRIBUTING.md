# Contributing

Thanks for contributing to DeskPal HQ. This guide covers how to set up the
project, the conventions we follow, and how to propose changes.

## Getting started

```bash
bun install          # install dependencies (Bun is the package manager)
cp .env.example .env # then fill in your Supabase values
bun run dev          # start the dev server at http://localhost:8080
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for backend/migration setup and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the system fits together.

## Development workflow

1. Create a branch off `main`:
   ```bash
   git checkout -b feature/short-description
   ```
2. Make your change in small, focused commits.
3. Run the checks below before pushing.
4. Open a pull request against `main` and fill in the PR template.

## Checks to run before a PR

```bash
bun run lint     # ESLint
bun run test     # Vitest unit tests
bun run build    # production build must succeed
bun run e2e      # Playwright e2e (needs SUPABASE_SERVICE_ROLE_KEY)
```

## Conventions

- **TypeScript + React.** Match the style of the surrounding code.
- **UI:** use the shared design-system tokens and components described in
  [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Do not introduce raw palette
  colors, one-off radii, or bespoke button styles.
- **Authorization lives in the database.** When adding a feature, enforce access
  with RLS / security-definer functions in a migration — not only in the UI.
- **Database changes** go in a new file under `supabase/migrations/` via
  `supabase migration new <name>`. Never edit an already-applied migration.
- **Do not edit** `src/integrations/supabase/types.ts` by hand (it is generated).
- **Never commit secrets.** `.env` is git-ignored; use `.env.example` for new
  variables.

## Commit messages

Write clear, imperative messages ("Add leave carry-forward run", not "added").
Reference an issue number where relevant. Keep unrelated changes in separate
commits.

## Reporting bugs and vulnerabilities

- Functional bugs: open a GitHub issue with steps to reproduce.
- Security issues: **do not** open a public issue — follow
  [SECURITY.md](SECURITY.md).

## Code of conduct

By participating you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).
