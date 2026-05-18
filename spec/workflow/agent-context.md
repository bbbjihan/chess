# Agent Context Spec

## Purpose

Repository context must remain portable across agent frameworks. Agents should be able to understand current behavior and workflow by reading committed files, not prior chat history.

## `AGENTS.md`

- Keep `AGENTS.md` compact because it is intended for always-loaded context windows.
- Include only repository-wide rules that every coding agent must know.
- Move detailed product behavior, feature requirements, and operational procedures into `spec/` documents.
- Update `AGENTS.md` when the always-loaded operating model changes.

## `spec/`

- Treat `spec/` as living archived context.
- Organize specs by feature or domain.
- Keep `spec/index.md` as the discovery map for all specs.
- Update specs during work whenever requirements, acceptance criteria, or workflows change.
- Prefer concise, durable requirements over long transcripts or stale task logs.

## Work handoff rule

A future agent should be able to continue work by reading:

1. `AGENTS.md`,
2. `spec/index.md`,
3. the task-relevant spec documents,
4. tests related to those specs,
5. and current git diff/history.
