# Spec Index

This directory is the source of truth for repository specs. Read this index first for every work request, then open the relevant documents below.

## Workflow specs

- [`workflow/sdd-tdd.md`](workflow/sdd-tdd.md) — deterministic Spec Driven Development and Test Driven Development workflow for all implementation work.
- [`workflow/agent-context.md`](workflow/agent-context.md) — rules for keeping `AGENTS.md` and specs compact, living, and portable across agent frameworks.

## Product and feature specs

- [`features/chess-game.md`](features/chess-game.md) — current user-facing chess game behavior.
- [`features/auth-profile.md`](features/auth-profile.md) — Supabase OAuth sign-in/out and user profile display behavior.
- [`features/chess-engine.md`](features/chess-engine.md) — chess rules engine behavior and testing focus.
- [`features/online-chess/domain-state.md`](features/online-chess/domain-state.md) — shared online chess terminology, state model, move contract, and result model.
- [`features/online-chess/supabase-schema.md`](features/online-chess/supabase-schema.md) — expected Supabase tables, RLS, RPCs, and realtime channels for online chess.
- [`features/online-chess/app-architecture.md`](features/online-chess/app-architecture.md) — app architecture boundaries, sibling task ownership, integration contracts, and online non-goals.
- [`operations/vibecoding-deployments.md`](operations/vibecoding-deployments.md) — deployment and preview behavior for vibe-coding workflows.

## How to maintain this index

- Add a link whenever a new feature/domain spec is created.
- Update descriptions when scope changes.
- Keep entries concise; detailed requirements belong in the linked spec documents.
