# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Project documentation: `LICENSE`, `SECURITY.md`, `PRIVACY.md`, `TERMS.md`,
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.env.example`,
  `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, and a PR template.
- Playwright end-to-end test suite (`e2e/`) and `docs/TEST_PLAN.md`.

### Changed
- Standardized on Bun; regenerated `bun.lock` against the public npm registry.

### Removed
- Lovable integration and all related artifacts (`.lovable/` plan docs,
  `lovable-tagger`, the preview auth storage helper) and `package-lock.json`.

### Security
- Stopped tracking `.env` and `supabase/.temp/`; added them to `.gitignore`.

---

<!--
Template for future releases:

## [1.0.0] - YYYY-MM-DD
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
-->
