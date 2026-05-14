import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  getLegalMoves,
  makeMove,
  squareToCoords,
} from './chessEngine.js'

describe('chess engine', () => {
  it('starts with a standard chess position and white to move', () => {
    const state = createInitialState()

    expect(state.turn).toBe('white')
    expect(state.board[squareToCoords('e1').row][squareToCoords('e1').col]).toEqual({ type: 'king', color: 'white' })
    expect(state.board[squareToCoords('d8').row][squareToCoords('d8').col]).toEqual({ type: 'queen', color: 'black' })
    expect(state.captured.white).toEqual([])
    expect(state.captured.black).toEqual([])
  })

  it('allows a pawn to move one or two squares from its starting rank', () => {
    const state = createInitialState()

    expect(getLegalMoves(state, squareToCoords('e2'))).toEqual(
      expect.arrayContaining([squareToCoords('e3'), squareToCoords('e4')]),
    )
  })

  it('alternates turns and records move history', () => {
    const afterWhite = makeMove(createInitialState(), squareToCoords('e2'), squareToCoords('e4'))
    const afterBlack = makeMove(afterWhite, squareToCoords('e7'), squareToCoords('e5'))

    expect(afterWhite.turn).toBe('black')
    expect(afterBlack.turn).toBe('white')
    expect(afterBlack.history.map((move) => move.notation)).toEqual(['e2-e4', 'e7-e5'])
  })

  it('rejects moving into check', () => {
    const state = {
      ...createInitialState(),
      board: Array.from({ length: 8 }, () => Array(8).fill(null)),
      turn: 'black',
    }
    state.board[squareToCoords('e8').row][squareToCoords('e8').col] = { type: 'king', color: 'black' }
    state.board[squareToCoords('a1').row][squareToCoords('a1').col] = { type: 'king', color: 'white' }
    state.board[squareToCoords('e1').row][squareToCoords('e1').col] = { type: 'rook', color: 'white' }
    state.board[squareToCoords('e7').row][squareToCoords('e7').col] = { type: 'rook', color: 'black' }

    expect(() => makeMove(state, squareToCoords('e7'), squareToCoords('d7'))).toThrow(/check/i)
  })

  it('detects checkmate with scholar mate', () => {
    const state = createInitialState()
    const moves = [
      ['e2', 'e4'],
      ['e7', 'e5'],
      ['d1', 'h5'],
      ['b8', 'c6'],
      ['f1', 'c4'],
      ['g8', 'f6'],
      ['h5', 'f7'],
    ]

    const finalState = moves.reduce(
      (current, [from, to]) => makeMove(current, squareToCoords(from), squareToCoords(to)),
      state,
    )

    expect(finalState.status).toBe('checkmate')
    expect(finalState.winner).toBe('white')
  })
})
