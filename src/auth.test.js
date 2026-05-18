import { describe, expect, it } from 'vitest'
import {
  buildGoogleOAuthUrl,
  extractSessionFromUrl,
  formatUserProfile,
  isSupabaseConfigured,
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
