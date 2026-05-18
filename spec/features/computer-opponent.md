# Computer Opponent Spec

## Purpose

The app can play a local human-vs-computer game by asking a browser-side Stockfish engine for the black move after each legal white move.

## User-facing expectations

- The side panel includes a difficulty selector with `Easy`, `Normal`, and `Hard` options.
- Players can choose between local two-player mode and computer opponent mode.
- In computer opponent mode:
  - The human plays white and Stockfish plays black.
  - The board ignores human input while the computer is thinking.
  - After a legal white move, the app asks Stockfish for the next black move and applies the returned legal move.
  - Status text tells the player when the computer is thinking, when it moved, or when the engine is unavailable.
- If the Stockfish worker, WASM support, or worker communication fails, the game remains usable in local two-player mode and shows a clear fallback/error state instead of breaking the board.

## Engine integration expectations

- Stockfish runs through a browser `Worker` using UCI commands.
- The default worker asset path is `/stockfish/stockfish.js`; deployments must provide that same-origin worker and any WASM files it loads.
- The app sends the current position as FEN and reads `bestmove` responses.
- Difficulty maps to bounded Stockfish search settings so lower levels respond quickly and higher levels search deeper.
- Returned moves are validated by the local chess engine before being applied.

## Testing expectations

- FEN serialization and Stockfish/UCI client behavior should have focused Vitest coverage.
- Computer-opponent orchestration should be tested without requiring a real Stockfish binary.
- UI changes should be kept small and should preserve existing local two-player behavior.
