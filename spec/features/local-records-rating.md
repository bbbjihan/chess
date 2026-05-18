# Local Records and Rating Spec

## Scope

The chess app keeps local-browser records for the two seat profiles, White and Black. This feature has no server, auth, sharing, or production deployment scope.

## Profile identity

- The app exposes two built-in local profiles: `White` and `Black`.
- Profiles are keyed by seat color, not by login identity.
- Each profile starts at Elo 1200 with zero games, wins, losses, draws, and checkmates.
- Profile records persist in `localStorage` and survive page reloads in the same browser.

## Completed game persistence

- A completed game is recorded when a game first reaches `checkmate` or `stalemate`.
- Checkmate records a decisive result for the winning color and a loss for the other color.
- Stalemate records a draw for both profiles.
- A completed game must be recorded only once even if the UI re-renders or the user clicks around after completion.
- Starting a new game resets the board only; it does not clear stored records.

## Elo ratings

- Ratings use a local Elo update with K-factor 32.
- Checkmate uses score 1 for the winner and 0 for the loser.
- Stalemate uses score 0.5 for both profiles.
- Rating values are rounded to whole numbers after each completed game.

## Recent games

- The app stores a recent game list in `localStorage`.
- Each recent game includes a unique id, completion timestamp, result, winner when any, reason, move count, final notation when any, and before/after ratings for White and Black.
- The recent list is newest first and capped at 10 games.

## Reset and clear controls

- The app provides a board reset/new game control that keeps local records.
- The app provides a clear records control that restores both profiles and recent games to their initial local state.
