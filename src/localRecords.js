export const RECORDS_STORAGE_KEY = 'chess.localRecords.v1'
export const INITIAL_RATING = 1200
export const ELO_K_FACTOR = 32
export const MAX_RECENT_GAMES = 10

export function createInitialRecords() {
  return {
    profiles: {
      white: createProfile('White'),
      black: createProfile('Black'),
    },
    recentGames: [],
  }
}

export function loadRecords(storage = getDefaultStorage()) {
  if (!storage) return createInitialRecords()

  try {
    const raw = storage.getItem(RECORDS_STORAGE_KEY)
    if (!raw) return createInitialRecords()

    return normalizeRecords(JSON.parse(raw))
  } catch {
    return createInitialRecords()
  }
}

export function saveRecords(records, storage = getDefaultStorage()) {
  const normalized = normalizeRecords(records)
  try {
    if (storage) {
      storage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(normalized))
    }
  } catch {
    return normalized
  }
  return normalized
}

export function clearStoredRecords(storage = getDefaultStorage()) {
  try {
    if (storage) storage.removeItem(RECORDS_STORAGE_KEY)
  } catch {
    return createInitialRecords()
  }
  return createInitialRecords()
}

export function recordCompletedGame(records, game, options = {}) {
  if (!isRecordableGame(game)) return normalizeRecords(records)

  const current = normalizeRecords(records)
  const reason = game.status
  const result = reason === 'stalemate' ? 'draw' : game.winner
  const whiteScore = result === 'draw' ? 0.5 : result === 'white' ? 1 : 0
  const blackScore = 1 - whiteScore
  const whiteBefore = current.profiles.white.rating
  const blackBefore = current.profiles.black.rating
  const whiteAfter = calculateElo(whiteBefore, blackBefore, whiteScore)
  const blackAfter = calculateElo(blackBefore, whiteBefore, blackScore)
  const completedAt = options.completedAt ?? new Date().toISOString()
  const id = options.id ?? createGameId(completedAt)
  const finalMove = game.history?.at(-1) ?? null

  const next = {
    profiles: {
      white: updateProfile(current.profiles.white, {
        rating: whiteAfter,
        result,
        color: 'white',
        reason,
      }),
      black: updateProfile(current.profiles.black, {
        rating: blackAfter,
        result,
        color: 'black',
        reason,
      }),
    },
    recentGames: [
      {
        id,
        completedAt,
        result,
        winner: result === 'draw' ? null : result,
        reason,
        moveCount: game.history?.length ?? 0,
        finalNotation: finalMove?.notation ?? null,
        ratings: {
          white: { before: whiteBefore, after: whiteAfter },
          black: { before: blackBefore, after: blackAfter },
        },
      },
      ...current.recentGames,
    ].slice(0, MAX_RECENT_GAMES),
  }

  return next
}

function createProfile(name) {
  return {
    name,
    rating: INITIAL_RATING,
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    checkmates: 0,
  }
}

function updateProfile(profile, { rating, result, color, reason }) {
  const won = result === color
  const lost = result !== 'draw' && result !== color

  return {
    ...profile,
    rating,
    games: profile.games + 1,
    wins: profile.wins + (won ? 1 : 0),
    losses: profile.losses + (lost ? 1 : 0),
    draws: profile.draws + (result === 'draw' ? 1 : 0),
    checkmates: profile.checkmates + (won && reason === 'checkmate' ? 1 : 0),
  }
}

function calculateElo(playerRating, opponentRating, score) {
  const expected = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400))
  return Math.round(playerRating + ELO_K_FACTOR * (score - expected))
}

function normalizeRecords(records) {
  const initial = createInitialRecords()
  const white = normalizeProfile(records?.profiles?.white, initial.profiles.white)
  const black = normalizeProfile(records?.profiles?.black, initial.profiles.black)
  const recentGames = Array.isArray(records?.recentGames)
    ? records.recentGames.slice(0, MAX_RECENT_GAMES)
    : []

  return {
    profiles: { white, black },
    recentGames,
  }
}

function normalizeProfile(profile, fallback) {
  return {
    ...fallback,
    ...profile,
    rating: Number.isFinite(profile?.rating) ? profile.rating : fallback.rating,
    games: Number.isFinite(profile?.games) ? profile.games : fallback.games,
    wins: Number.isFinite(profile?.wins) ? profile.wins : fallback.wins,
    losses: Number.isFinite(profile?.losses) ? profile.losses : fallback.losses,
    draws: Number.isFinite(profile?.draws) ? profile.draws : fallback.draws,
    checkmates: Number.isFinite(profile?.checkmates) ? profile.checkmates : fallback.checkmates,
  }
}

function isRecordableGame(game) {
  return game?.status === 'checkmate' || game?.status === 'stalemate'
}

function createGameId(completedAt) {
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `${completedAt}-${randomPart}`
}

function getDefaultStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}
