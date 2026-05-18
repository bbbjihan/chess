# Agent Instructions

This repository uses Spec Driven Development (SDD) plus Test Driven Development (TDD).

## Living specs

- All product features, behavior specs, and workflow specs live under `spec/`, grouped by feature/domain.
- Start every work request by reading `spec/index.md`, then read the task-relevant spec documents listed there.
- If a request changes expected behavior, constraints, or workflow, update or add the relevant spec document before implementation.
- Treat `spec/` as living archived context: keep it current so any agent or framework can continue work from repository state alone.
- Keep this `AGENTS.md` living too, but compact: only repository-wide instructions that must always be in context belong here.

## Deterministic SDD + TDD workflow

1. Update specs first when the request requires new or changed specification.
2. From the relevant specs, check whether tests exist. Add missing tests or update existing tests when the spec changed.
3. Before implementation, run the new/required tests and confirm the relevant set is **All Red** for the expected reason.
4. Implement the smallest change that satisfies the specs.
5. Completion requires **All Green**. If implementation is done but tests fail, fix implementation, not tests.
   - Tests may be revised after implementation only when repeated failures prove the initial test has a spec-logic error or environment issue.
   - Any such test revision must be justified in the related spec or work notes.
6. When practical, parallelize spec-based test writing and spec-based implementation with distinct agent roles: spec steward, test author, implementer, and reviewer.

## Project checks

- Package manager: `pnpm`.
- Use `COREPACK_HOME=/tmp/hermes-corepack` for pnpm/Corepack commands to avoid repo-local tool cache files.
- Typical verification: `COREPACK_HOME=/tmp/hermes-corepack pnpm test` and `COREPACK_HOME=/tmp/hermes-corepack pnpm build`.
