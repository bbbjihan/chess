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
- Preview deployment changes should be documented here when behavior changes.

## Local orchestration

- Vibe-coding orchestration lives outside this app repo in Hermes-side config/skills/scripts.
- App repo files should describe app behavior, tests, and deployment expectations, not host-specific orchestration internals.
