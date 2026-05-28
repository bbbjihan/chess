import { describe, expect, it } from 'vitest'
import { createInitialState, makeMove, squareToCoords } from './chessEngine.js'
import { applyComputerMove, shouldRequestComputerMove } from './computerOpponent.js'

describe('computer opponent orchestration', () => {
  it('requests a computer move only for black to move in computer mode', () => {
    const initial = createInitialState()
    const afterWhite = makeMove(initial, squareToCoords('e2'), squareToCoords('e4'))

    expect(shouldRequestComputerMove(initial, 'computer', false)).toBe(false)
    expect(shouldRequestComputerMove(afterWhite, 'computer', false)).toBe(true)
    expect(shouldRequestComputerMove(afterWhite, 'local', false)).toBe(false)
    expect(shouldRequestComputerMove(afterWhite, 'computer', true)).toBe(false)
  })

  it('applies a mocked Stockfish move through the local chess engine', () => {
    const afterWhite = makeMove(createInitialState(), squareToCoords('e2'), squareToCoords('e4'))
    const next = applyComputerMove(afterWhite, {
      from: squareToCoords('e7'),
      to: squareToCoords('e5'),
      uci: 'e7e5',
    })

    expect(next.turn).toBe('white')
    expect(next.history.map((move) => move.notation)).toEqual(['e2-e4', 'e7-e5'])
  })
})
