# Online Chess Supabase Schema and Realtime Spec

## Purpose

This spec defines the expected Supabase persistence, RLS, and channel boundaries for online chess. It is a contract for future migrations and client code, not a production database change.

## Tables

### `profiles`

Application profile for each authenticated user.

| Column | Expectation |
| --- | --- |
| `id uuid primary key` | References `auth.users.id`. |
| `display_name text` | Public user-visible name. |
| `avatar_url text null` | Optional public avatar. |
| `created_at timestamptz` | Insert timestamp. |
| `updated_at timestamptz` | Last profile update timestamp. |

### `invites`

Tracks pending game requests before a game is created or joined.

| Column | Expectation |
| --- | --- |
| `id uuid primary key` | Invite id. |
| `created_by uuid` | References `profiles.id`. |
| `recipient_id uuid null` | References `profiles.id`; null means open invite. |
| `preferred_color text null` | `white`, `black`, or null for random/system choice. |
| `status text` | One of the invite status values in `domain-state.md`. |
| `message text null` | Optional invite note; no secrets. |
| `expires_at timestamptz null` | Expiration policy input. |
| `accepted_by uuid null` | Profile that accepted the invite. |
| `game_id uuid null` | Created game after acceptance. |
| `created_at timestamptz` | Insert timestamp. |
| `updated_at timestamptz` | Last status update timestamp. |

### `games`

One row per game aggregate.

| Column | Expectation |
| --- | --- |
| `id uuid primary key` | Game id. |
| `status text` | One of the game status values in `domain-state.md`. |
| `turn_color text` | `white` or `black`; null only before play starts. |
| `current_ply integer` | Latest accepted half-move number, starting at `0`. |
| `initial_position text` | Initial compact position, normally standard starting FEN. |
| `current_position text` | Latest compact position snapshot. |
| `result text null` | `white_win`, `black_win`, or `draw` for terminal games. |
| `result_reason text null` | Stable terminal reason. |
| `created_by uuid` | Profile that created the game or source invite. |
| `started_at timestamptz null` | Set when both participants are ready. |
| `ended_at timestamptz null` | Set for terminal games. |
| `created_at timestamptz` | Insert timestamp. |
| `updated_at timestamptz` | Last aggregate update timestamp. |

### `game_participants`

One row per game color.

| Column | Expectation |
| --- | --- |
| `id uuid primary key` | Participant row id. |
| `game_id uuid` | References `games.id`. |
| `profile_id uuid null` | References `profiles.id`; null for computer participant. |
| `participant_kind text` | `human` or `computer`. |
| `color text` | `white` or `black`. |
| `ready_at timestamptz null` | Set when participant can begin. |
| `resigned_at timestamptz null` | Set on resignation. |
| `created_at timestamptz` | Insert timestamp. |

Constraint expectations:

- Unique `(game_id, color)`.
- Unique `(game_id, profile_id)` where `profile_id` is not null.
- Human participants require `profile_id`; computer participants require `profile_id` null.

### `moves`

Append-only accepted move log.

| Column | Expectation |
| --- | --- |
| `id uuid primary key` | Move id. |
| `game_id uuid` | References `games.id`. |
| `ply integer` | Half-move number starting at `1`. |
| `color text` | `white` or `black`. |
| `from_square text` | Algebraic square. |
| `to_square text` | Algebraic square. |
| `promotion_piece text null` | Promotion choice when applicable. |
| `notation text null` | Engine-generated notation when available. |
| `position_after text` | Compact snapshot after this move. |
| `created_by uuid` | Profile id for human moves; service actor for computer moves. |
| `created_at timestamptz` | Insert timestamp. |

Constraint expectations:

- Unique `(game_id, ply)`.
- `ply` must be greater than `0`.
- Direct updates and deletes are not allowed for clients.

### `player_stats`

Derived stats for records/rating work.

| Column | Expectation |
| --- | --- |
| `profile_id uuid primary key` | References `profiles.id`. |
| `games_played integer` | Derived count. |
| `wins integer` | Derived count. |
| `losses integer` | Derived count. |
| `draws integer` | Derived count. |
| `rating integer` | Rating feature controlled value. |
| `updated_at timestamptz` | Last derived update timestamp. |

Stats are derived from terminal games and may be rebuilt. Client code must not treat stats as the source of truth for game outcomes.

## RLS expectations

- Profiles are readable by authenticated users; each user may update only their own profile.
- Invite creators may create, view, cancel, and see status changes for their invites.
- Invite recipients may view, decline, and accept invites addressed to them.
- Authenticated users may view pending open invites, but accepting must be atomic.
- Game participants may read their games, participants, and moves.
- Move insertion must go through an RPC or trusted server path that validates turn, participant, latest ply, and rules-engine legality.
- Clients may not update or delete `moves`.
- Clients may not directly write terminal game results or stats except through approved RPC/server paths.

## RPC expectations

Future schema work should prefer transactional RPCs for multi-row state changes:

- `create_invite(...)`
- `cancel_invite(invite_id)`
- `accept_invite(invite_id)`
- `submit_move(game_id, from_square, to_square, promotion_piece)`
- `resign_game(game_id)`
- `offer_or_accept_draw(game_id)` when draw workflow is introduced

`accept_invite` must prevent double acceptance. `submit_move` must be idempotent for retries or fail with a clear conflict when the client used a stale game version.

## Realtime channel expectations

- `invite:{invite_id}`: invite status changes for creator and recipient.
- `profile:{profile_id}:invites`: incoming invite list updates for one profile.
- `game:{game_id}`: game aggregate, participant, and move inserts for participants.
- `open-invites`: pending open invite list for authenticated users.

Realtime clients must reconcile by refetching the authoritative game aggregate after reconnects, missed events, conflict responses, or version gaps.

## Non-goals

- Creating actual Supabase migrations in this foundation task.
- Storing Supabase keys or production credentials.
- Defining a full backend deployment model.
- Exposing public read access to private game records by default.
