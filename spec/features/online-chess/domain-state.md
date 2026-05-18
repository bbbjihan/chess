# Online Chess Domain and State Model

## Purpose

Online chess extends the local chess game with authenticated players, invitations, realtime game synchronization, move records, and post-game records. This spec defines shared terminology and durable state expectations for sibling tasks.

## Canonical terms

- **Profile**: one application user backed by Supabase Auth.
- **Invite**: a request to start a game with another profile or an open opponent slot.
- **Game**: one chess match with exactly one white participant and one black participant when play starts.
- **Participant**: a profile, guest placeholder, or computer opponent assigned to one game color.
- **Move**: one legal half-move, ordered by `ply` starting at `1`.
- **Rules engine**: the only source of truth for legal moves, check, checkmate, stalemate, and future chess-rule additions.
- **Snapshot**: the compact board/rules state after a move, stored for recovery and realtime reconciliation.
- **Record**: immutable completed-game outcome used by stats and rating features.

## Shared value sets

Colors are `white` and `black`.

Game status values:

- `waiting` — game exists but both colors are not ready.
- `active` — legal moves may be submitted.
- `check` — active game where the side to move is in check.
- `checkmate` — terminal win.
- `stalemate` — terminal draw.
- `resigned` — terminal win for the opponent of the resigning participant.
- `draw_agreed` — terminal draw accepted by both participants.
- `abandoned` — terminal outcome assigned by timeout, disconnect policy, or moderation.

Invite status values:

- `pending` — visible and acceptable by the intended recipient or eligible open opponent.
- `accepted` — consumed into a game.
- `cancelled` — closed by creator or system before acceptance.
- `expired` — closed by time policy.
- `declined` — closed by the recipient.

Participant kinds:

- `human` — authenticated Supabase profile.
- `computer` — local or server-generated opponent controlled by the computer-opponent feature.

## Game aggregate

The online game aggregate must be reconstructable from `games`, `game_participants`, and ordered `moves`.

Required aggregate fields:

- `game.id`
- `game.status`
- `game.turn_color`
- `game.current_ply`
- `game.result`
- `game.result_reason`
- `game.initial_position`
- `game.current_position`
- `participants.white`
- `participants.black`
- `moves[]` ordered by `ply`

`initial_position` and `current_position` should use FEN or another rules-engine-approved compact notation. The existing local board array remains an implementation detail of `src/chessEngine.js` until the rules-engine task defines a stronger public model.

## Move contract

Every persisted move must include:

- `game_id`
- `ply`
- `color`
- `from_square` and `to_square` in algebraic square form, such as `e2` and `e4`.
- `promotion_piece` when a pawn promotion chooses a piece.
- `notation` when the rules engine can provide it.
- `position_after`
- `created_by`
- `created_at`

The submitter must match the participant whose color equals `game.turn_color`. A move is accepted only after the rules engine validates it against the latest game snapshot and ordered move history.

## Result model

Terminal games must set:

- `status` to one terminal status,
- `result` to `white_win`, `black_win`, or `draw`,
- `result_reason` to a stable reason such as `checkmate`, `resignation`, `stalemate`, `agreement`, `timeout`, or `abandoned`,
- `ended_at`.

Stats and rating features must consume terminal game records rather than infer outcomes from UI state.

## Non-goals

- Defining a complete chess notation implementation.
- Replacing the current local chess engine in this foundation task.
- Defining anti-cheat, clocks, tournaments, chat, payments, moderation UI, or production deployment behavior.
