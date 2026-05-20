# Online Chess App Architecture and Work Boundaries

## Purpose

This spec defines how online chess work should be split so sibling tasks can build independently without changing each other's contracts.

## Current baseline

The app is a React + Vite browser app with a local chess engine in `src/chessEngine.js`. Online work must preserve local play until an explicit feature spec changes it.

## Proposed source boundaries

Future implementation should keep these boundaries:

- `src/chessEngine.js`: rules-engine behavior and pure move validation.
- `src/online/domain/`: shared online types, value constants, aggregate builders, and serialization helpers.
- `src/online/supabase/`: Supabase client setup, query functions, RPC wrappers, and realtime subscription helpers.
- `src/online/state/`: React hooks or stores that compose domain helpers and Supabase adapters.
- `src/profile/`: auth session, profile display/editing, and profile-specific data access.
- `src/records/`: completed-game records, stats, and rating presentation.
- `src/computer/`: computer-opponent strategy and move producer integration.

These paths are guidance for future implementation; this foundation task does not require creating empty modules.

## Sibling task ownership

### `rules-engine`

Owns legal move generation, board snapshots, status transitions, notation, and promotion rules. It must expose a stable validation path usable by local UI, online move submission, and computer opponents.

Expected integration output:

- Validate a candidate move from a compact position and move history.
- Return the next position snapshot.
- Return game status, result, result reason, and notation when available.

### `auth-profile`

Owns Supabase Auth wiring, profile creation, profile editing, and session-aware UI state. It must not own chess rules or move submission.

Expected integration output:

- Current authenticated profile.
- Profile read/update functions.
- A clear signed-out state for online features.

### `online-realtime`

Owns invite flows, game joining, move submission through approved RPC/query paths, realtime subscriptions, optimistic UI reconciliation, and stale-version handling.

Expected integration output:

- Invite list and invite actions.
- Game aggregate loader.
- Move submission API that reports validation, authorization, and conflict errors distinctly.
- Reconnect/refetch behavior for missed events.

### `computer-opponent`

Owns selecting computer moves and representing computer participants. It must call the same rules-engine contract as human moves and must persist accepted computer moves through the online move path when a game is online.

Expected integration output:

- Computer participant metadata.
- Candidate move selection for a given legal position.
- No direct stats mutation.

### `records-rating`

Owns completed-game record views, player stats, and rating calculations. It consumes terminal game outcomes and move history, but must not decide live-game legality.

Expected integration output:

- Read models for history and profile records.
- Derived stats/rating updates from terminal game records.
- Rebuildable calculations where practical.

## Integration contracts

- The rules engine is authoritative for chess legality.
- Supabase is authoritative for online persistence and realtime recovery.
- React state may be optimistic, but must converge to the latest aggregate from Supabase.
- Moves are append-only and ordered by `ply`.
- Terminal game records are immutable except for administrative repair work outside normal client flows.
- Public UI copy and player-facing workflows require a feature spec update before implementation.

## Error categories

Online flows should distinguish:

- `unauthenticated` — user must sign in.
- `forbidden` — signed-in user is not allowed to perform the action.
- `conflict` — stale version, duplicate accept, duplicate move, or game already terminal.
- `invalid_move` — rules engine rejected the move.
- `network` — request or realtime connection failed.
- `server` — unexpected backend failure.

## Testing expectations

- Pure domain helpers require Vitest coverage.
- Rules-engine behavior changes require tests in or near the engine tests.
- Supabase RPC/query wrappers should be tested with mocks unless a local Supabase test harness is explicitly introduced.
- Realtime hooks should test conflict and reconnect reconciliation when implemented.
- This foundation documentation task does not require tests because it adds no executable schema or model code.

## Explicit non-goals

- Production deploys or preview infrastructure changes.
- Adding Supabase credentials or environment-specific secrets.
- Replacing React/Vite.
- Building full online UI flows.
- Choosing a rating algorithm beyond the `player_stats.rating` storage contract.
- Defining chess clocks, matchmaking queues, tournaments, spectators, chat, or moderation workflows.
