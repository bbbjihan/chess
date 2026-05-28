# Vibe-Coding Deployment Spec

## Purpose

Deployment behavior must keep GitHub as the source of truth while allowing Discord-thread-scoped work and PR previews.

## Production

- Production URL: `https://chess.jihan.kr`.
- Production follows `main` only.
- Production deployment or destructive production changes require explicit approval.

## PR previews

- Pull requests should receive preview URLs following `https://pr-<number>.chess.jihan.kr`.
- Preview work must stay isolated from production.
- Preview builds must inject non-service-role browser configuration from repository secrets when features depend on Vite build-time environment variables, including `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Supabase OAuth.
- Preview deployment changes should be documented here when behavior changes.

## Build-time environment

- Preview, production, and CI builds must pass Vite public Supabase configuration into `pnpm build` when online features are enabled:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- These values are GitHub Actions secrets for this repository. They are public browser configuration once bundled, but using secrets keeps workflow configuration consistent and avoids committing environment-specific values.
- When either value is unset, the build still succeeds and the deployed app must show online play as unavailable while preserving offline/local play.

## Local orchestration

- Vibe-coding orchestration lives outside this app repo in Hermes-side config/skills/scripts.
- App repo files should describe app behavior, tests, and deployment expectations, not host-specific orchestration internals.
