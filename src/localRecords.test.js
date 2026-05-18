import { describe, expect, it } from 'vitest'
import {
  clearStoredRecords,
  createInitialRecords,
  loadRecords,
  recordCompletedGame,
  saveRecords,
} from './localRecords.js'

describe('local records and Elo ratings', () => {
  it('starts White and Black profiles at 1200 with empty recent games', () => {
    const records = createInitialRecords()

    expect(records.profiles.white).toMatchObject({
      name: 'White',
      rating: 1200,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      checkmates: 0,
    })
    expect(records.profiles.black).toMatchObject({
      name: 'Black',
      rating: 1200,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      checkmates: 0,
    })
    expect(records.recentGames).toEqual([])
  })

  it('records a checkmate win, updates profile stats, and applies Elo', () => {
    const records = createInitialRecords()
    const next = recordCompletedGame(records, {
      status: 'checkmate',
      winner: 'white',
      history: [{ notation: 'h5-f7' }],
    }, {
      id: 'game-1',
      completedAt: '2026-05-18T12:00:00.000Z',
    })

    expect(next.profiles.white).toMatchObject({
      rating: 1216,
      games: 1,
      wins: 1,
      losses: 0,
      draws: 0,
      checkmates: 1,
    })
    expect(next.profiles.black).toMatchObject({
      rating: 1184,
      games: 1,
      wins: 0,
      losses: 1,
      draws: 0,
      checkmates: 0,
    })
    expect(next.recentGames[0]).toMatchObject({
      id: 'game-1',
      completedAt: '2026-05-18T12:00:00.000Z',
      result: 'white',
      winner: 'white',
      reason: 'checkmate',
      moveCount: 1,
      finalNotation: 'h5-f7',
      ratings: {
        white: { before: 1200, after: 1216 },
        black: { before: 1200, after: 1184 },
      },
    })
  })

  it('records stalemate as a draw without changing equal ratings', () => {
    const next = recordCompletedGame(createInitialRecords(), {
      status: 'stalemate',
      winner: null,
      history: [{ notation: 'a1-a2' }, { notation: 'h8-h7' }],
    }, {
      id: 'draw-1',
      completedAt: '2026-05-18T12:05:00.000Z',
    })

    expect(next.profiles.white).toMatchObject({ rating: 1200, games: 1, draws: 1 })
    expect(next.profiles.black).toMatchObject({ rating: 1200, games: 1, draws: 1 })
    expect(next.recentGames[0]).toMatchObject({
      result: 'draw',
      winner: null,
      reason: 'stalemate',
      moveCount: 2,
      finalNotation: 'h8-h7',
    })
  })

  it('keeps only the 10 newest recent games', () => {
    const records = Array.from({ length: 12 }, (_, index) => index).reduce((current, index) => (
      recordCompletedGame(current, {
        status: 'checkmate',
        winner: index % 2 === 0 ? 'white' : 'black',
        history: [{ notation: `m${index}` }],
      }, {
        id: `game-${index}`,
        completedAt: `2026-05-18T12:${String(index).padStart(2, '0')}:00.000Z`,
      })
    ), createInitialRecords())

    expect(records.recentGames).toHaveLength(10)
    expect(records.recentGames.map((game) => game.id)).toEqual([
      'game-11',
      'game-10',
      'game-9',
      'game-8',
      'game-7',
      'game-6',
      'game-5',
      'game-4',
      'game-3',
      'game-2',
    ])
  })

  it('loads, saves, and clears records from localStorage-compatible storage', () => {
    const storage = createMemoryStorage()
    const records = recordCompletedGame(createInitialRecords(), {
      status: 'checkmate',
      winner: 'black',
      history: [{ notation: 'd8-h4' }],
    }, {
      id: 'black-win',
      completedAt: '2026-05-18T12:10:00.000Z',
    })

    saveRecords(records, storage)

    expect(loadRecords(storage)).toEqual(records)
    expect(clearStoredRecords(storage)).toEqual(createInitialRecords())
    expect(loadRecords(storage)).toEqual(createInitialRecords())
  })
})

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}
