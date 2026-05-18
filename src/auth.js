export const AUTH_STORAGE_KEY = 'chess.supabase.session'

export function getAuthConfig(env = import.meta.env) {
  return {
    supabaseUrl: env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || '',
  }
}

export function isSupabaseConfigured({ supabaseUrl, supabaseAnonKey }) {
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim())
}

export function buildGoogleOAuthUrl({ supabaseUrl, redirectTo }) {
  const baseUrl = supabaseUrl.replace(/\/+$/, '')
  const url = new URL(`${baseUrl}/auth/v1/authorize`)
  url.searchParams.set('provider', 'google')
  url.searchParams.set('redirect_to', redirectTo)
  return url.toString()
}

export function extractSessionFromUrl(urlString) {
  const url = new URL(urlString)
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  const params = new URLSearchParams(hash || url.search)
  const accessToken = params.get('access_token')

  if (!accessToken) return null

  const expiresIn = Number(params.get('expires_in') || 0)

  return {
    accessToken,
    refreshToken: params.get('refresh_token') || '',
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : 0,
  }
}

export function readStoredSession(storage = window.localStorage) {
  const value = storage.getItem(AUTH_STORAGE_KEY)
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function storeSession(session, storage = window.localStorage) {
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession(storage = window.localStorage) {
  storage.removeItem(AUTH_STORAGE_KEY)
}

export async function fetchSupabaseUser({ supabaseUrl, supabaseAnonKey, accessToken }) {
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Unable to load Supabase user profile.')
  }

  return response.json()
}

export async function signOutSupabase({ supabaseUrl, supabaseAnonKey, accessToken }) {
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Unable to sign out of Supabase.')
  }
}

export function formatUserProfile(user) {
  const metadata = user?.user_metadata || {}
  const email = user?.email || ''
  const name = metadata.full_name || metadata.name || metadata.user_name || metadata.preferred_username || email || 'Signed-in player'
  const avatarUrl = metadata.avatar_url || metadata.picture || ''

  return { name, email, avatarUrl }
}
