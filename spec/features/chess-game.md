# Chess Game Spec

## Current scope

The app provides a browser-playable chess game built with React and Vite.

## User-facing expectations

- Show an interactive chess board.
- Let players select and move pieces according to legal chess rules implemented by the engine.
- Keep visual feedback clear enough for normal play.
- Preserve responsive behavior for desktop and mobile-sized screens when practical.

## Development expectations

- UI behavior changes must update this spec or create a more focused feature spec.
- Changes to chess rules must also update `spec/features/chess-engine.md`.
- User-visible behavior changes require tests when practical; engine behavior requires tests.
