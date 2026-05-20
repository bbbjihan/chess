import { describe, expect, it } from 'vitest'
import {
  AUTH_STORAGE_KEY,
  buildGoogleOAuthUrl,
  clearStoredSession,
  extractSessionFromUrl,
  formatUserProfile,
  isSupabaseConfigured,
  readStoredSession,
  storeSession,
} from './auth.js'

const env = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
}

describe('auth helpers', () => {
  it('requires both Supabase URL and anonymous key', () => {
    expect(isSupabaseConfigured(env)).toBe(true)
    expect(isSupabaseConfigured({ supabaseUrl: env.supabaseUrl, supabaseAnonKey: '' })).toBe(false)
    expect(isSupabaseConfigured({ supabaseUrl: '', supabaseAnonKey: env.supabaseAnonKey })).toBe(false)
  })

  it('builds a Google OAuth URL for the configured Supabase project', () => {
    const url = new URL(buildGoogleOAuthUrl({
      ...env,
      redirectTo: 'https://chess.example/play?room=1',
    }))

    expect(url.origin).toBe(env.supabaseUrl)
    expect(url.pathname).toBe('/auth/v1/authorize')
    expect(url.searchParams.get('provider')).toBe('google')
    expect(url.searchParams.get('redirect_to')).toBe('https://chess.example/play?room=1')
  })

  it('extracts a Supabase session from OAuth callback hash parameters', () => {
    expect(extractSessionFromUrl('https://chess.example/#access_token=abc&refresh_token=def&expires_in=3600')).toEqual({
      accessToken: 'abc',
      refreshToken: 'def',
      expiresIn: 3600,
    })
  })

  it('stores, reads, and clears OAuth sessions from browser storage', () => {
    const storage = createMemoryStorage()
    const session = { accessToken: 'abc', refreshToken: 'def', expiresIn: 3600 }

    storeSession(session, storage)

    expect(storage.getItem(AUTH_STORAGE_KEY)).toBe(JSON.stringify(session))
    expect(readStoredSession(storage)).toEqual(session)

    clearStoredSession(storage)

    expect(readStoredSession(storage)).toBeNull()
  })

  it('removes malformed stored session JSON', () => {
    const storage = createMemoryStorage()
    storage.setItem(AUTH_STORAGE_KEY, '{bad json')

    expect(readStoredSession(storage)).toBeNull()
    expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('tolerates unavailable default browser storage', () => {
    expect(readStoredSession()).toBeNull()
    expect(() => storeSession({ accessToken: 'abc' })).not.toThrow()
    expect(() => clearStoredSession()).not.toThrow()
  })

  it('formats profile fields from Supabase user metadata', () => {
    const profile = formatUserProfile({
      email: 'player@example.com',
      user_metadata: {
        full_name: 'Ada Player',
        avatar_url: 'https://example.com/avatar.png',
      },
    })

    expect(profile).toEqual({
      name: 'Ada Player',
      email: 'player@example.com',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })

  it('falls back when profile metadata is sparse', () => {
    expect(formatUserProfile({ email: 'player@example.com', user_metadata: {} })).toEqual({
      name: 'player@example.com',
      email: 'player@example.com',
      avatarUrl: '',
    })
  })
})

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}
