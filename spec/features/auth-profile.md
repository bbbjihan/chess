# Auth Profile Spec

## Current scope

The app supports Supabase OAuth authentication with Google as the first provider. Authentication is optional for playing the local chess game, but the UI must make sign-in state visible.

## User-facing expectations

- Show a Google OAuth login control when no Supabase session is available.
- Start the Google OAuth flow through the configured Supabase project and return the user to the current app URL after login.
- After login, show the user's profile name, email, and avatar when those values are provided by Supabase user metadata.
- Fall back to the email address or a generic label when a display name is unavailable.
- Show a logout control while authenticated and clear local session state after logout.
- Keep the chess board playable whether the user is signed in or signed out.
- If Supabase environment variables are missing, keep the game usable and show a concise configuration message instead of a broken OAuth button.

## Configuration expectations

- Required Vite environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- The Supabase project must have Google enabled as an auth provider and allow the app URL as an OAuth redirect URL.

## Development expectations

- Auth/profile behavior should be covered by focused tests for configuration checks, OAuth URL construction, session parsing, and profile formatting.
- UI changes must remain responsive for desktop and mobile-sized screens when practical.
