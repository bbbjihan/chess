# Chess Engine Spec

## Purpose

The chess engine defines board state, legal moves, captures, turn progression, and game-rule behavior used by the UI.

## Current expectations

- Board initialization follows standard chess starting positions.
- Piece movement follows standard chess rules for implemented pieces and situations.
- Illegal moves are rejected without corrupting state.
- Turn state changes only after legal moves.
- Captures, check-related behavior, and special moves must be covered by specs and tests as they are implemented or changed.

## Testing expectations

- Engine behavior changes require Vitest coverage in or near `src/chessEngine.test.js`.
- New or changed engine requirements must observe the SDD+TDD All Red gate before implementation.
- Regression tests should be added for every engine bug fix.
