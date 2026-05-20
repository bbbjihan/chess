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

## Build-time configuration

- Vite only exposes browser configuration with the `VITE_` prefix at build time.
- CI, preview, and production workflows should pass `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from GitHub repository secrets into `pnpm build` when Supabase OAuth/profile features are enabled.
- Missing Supabase values should not break local or fork PR builds; the app should remain playable and show a concise configuration message.

## Local orchestration

- Vibe-coding orchestration lives outside this app repo in Hermes-side config/skills/scripts.
- App repo files should describe app behavior, tests, and deployment expectations, not host-specific orchestration internals.
