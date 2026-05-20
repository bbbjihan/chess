# Online Realtime Chess Spec

## Purpose

The app supports a Supabase Realtime based 1:1 online chess MVP on top of the local chess engine.

## MVP scope

- The browser reads Supabase configuration from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- When either value is missing, the app remains fully playable offline and shows a clear unavailable state for online play.
- A player can create a room, receive a shareable invite link containing a room id, and play as white.
- A player opening an invite link joins the room as black by default.
- Room ids are opaque, URL-safe ids generated client-side.
- Room state is synchronized through Supabase Realtime broadcast messages scoped to the room topic.
- Moves are still validated locally by the existing chess engine before being sent or applied.
- Remote moves, resets, and synchronization messages must update the local board without requiring a page refresh.
- Realtime WebSocket frames must use the Phoenix object envelope expected by Supabase Realtime, and the UI may report `connected` only after the channel join receives an `ok` reply.
- If realtime transport disconnects or cannot start, local play remains available and the online panel reports the failure.

## User-facing expectations

- The online panel exposes create-room, invite-link, copy-link, and leave-room controls.
- The panel displays whether the current browser is offline/local, connecting, connected, or unavailable.
- The board prevents a remote player from moving the opponent's pieces while online role assignment is known.
- The UI copy should be concise and user-actionable.

## Testing expectations

- Realtime configuration parsing, invite URL parsing, room metadata, and inbound message application require focused Vitest coverage.
- UI behavior should be covered through pure state helpers where browser rendering tests are not already available.
