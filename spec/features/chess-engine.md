# Chess Engine Spec

## Purpose

The chess engine defines board state, legal moves, captures, turn progression, and game-rule behavior used by the UI.

## Current expectations

- Board initialization follows standard chess starting positions.
- Piece movement follows standard chess rules for implemented pieces and situations.
- Illegal moves are rejected without corrupting state.
- Turn state changes only after legal moves.
- Captures, check-related behavior, and special moves must be covered by specs and tests as they are implemented or changed.

## Standard-rule coverage

- Castling is legal only when the king and castling rook have not moved, the squares between them are empty, the king is not currently in check, and the king does not pass through or land on an attacked square.
- A legal castling move moves both the king and the rook to their standard castled squares and records the move without changing the public UI API.
- Castling rights are lost when a king moves, when a rook moves from its original square, or when a rook is captured on its original square.
- En passant is available only on the immediately following half-move after an opposing pawn advances two squares next to a pawn on its fifth rank. The capturing pawn moves diagonally to the passed-over square and the advanced pawn is removed and recorded as captured.
- Pawn promotion currently keeps the existing automatic queen behavior: a pawn that reaches the last rank is immediately replaced by a queen of the same color.
- A player whose state status is `check` may still generate and make legal moves that escape check.

## Testing expectations

- Engine behavior changes require Vitest coverage in or near `src/chessEngine.test.js`.
- New or changed engine requirements must observe the SDD+TDD All Red gate before implementation.
- Regression tests should be added for every engine bug fix.
