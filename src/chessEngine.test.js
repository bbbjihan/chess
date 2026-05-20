import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  getLegalMoves,
  makeMove,
  squareToCoords,
} from './chessEngine.js'

describe('chess engine', () => {
  function emptyState(overrides = {}) {
    return {
      ...createInitialState(),
      board: Array.from({ length: 8 }, () => Array(8).fill(null)),
      selected: null,
      status: 'active',
      winner: null,
      captured: { white: [], black: [] },
      history: [],
      ...overrides,
    }
  }

  function place(state, square, piece) {
    const { row, col } = squareToCoords(square)
    state.board[row][col] = piece
  }

  function pieceAt(state, square) {
    const { row, col } = squareToCoords(square)
    return state.board[row][col]
  }

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

  it('allows a checked player to make a legal move that escapes check', () => {
    const state = {
      ...createInitialState(),
      board: Array.from({ length: 8 }, () => Array(8).fill(null)),
      turn: 'black',
      status: 'check',
    }
    state.board[squareToCoords('e8').row][squareToCoords('e8').col] = { type: 'king', color: 'black' }
    state.board[squareToCoords('a1').row][squareToCoords('a1').col] = { type: 'king', color: 'white' }
    state.board[squareToCoords('e1').row][squareToCoords('e1').col] = { type: 'rook', color: 'white' }
    state.board[squareToCoords('a7').row][squareToCoords('a7').col] = { type: 'rook', color: 'black' }

    expect(getLegalMoves(state, squareToCoords('a7'))).toEqual(
      expect.arrayContaining([squareToCoords('e7')]),
    )

    const next = makeMove(state, squareToCoords('a7'), squareToCoords('e7'))

    expect(next.status).toBe('active')
    expect(next.turn).toBe('white')
  })

  it('allows kingside castling and moves the rook with the king', () => {
    const state = emptyState({ turn: 'white' })
    place(state, 'e1', { type: 'king', color: 'white' })
    place(state, 'h1', { type: 'rook', color: 'white' })
    place(state, 'e8', { type: 'king', color: 'black' })

    expect(getLegalMoves(state, squareToCoords('e1'))).toEqual(
      expect.arrayContaining([squareToCoords('g1')]),
    )

    const next = makeMove(state, squareToCoords('e1'), squareToCoords('g1'))

    expect(pieceAt(next, 'g1')).toEqual({ type: 'king', color: 'white' })
    expect(pieceAt(next, 'f1')).toEqual({ type: 'rook', color: 'white' })
    expect(pieceAt(next, 'e1')).toBeNull()
    expect(pieceAt(next, 'h1')).toBeNull()
  })

  it('rejects castling through an attacked square', () => {
    const state = emptyState({ turn: 'white' })
    place(state, 'e1', { type: 'king', color: 'white' })
    place(state, 'h1', { type: 'rook', color: 'white' })
    place(state, 'a8', { type: 'king', color: 'black' })
    place(state, 'f8', { type: 'rook', color: 'black' })

    expect(getLegalMoves(state, squareToCoords('e1'))).not.toEqual(
      expect.arrayContaining([squareToCoords('g1')]),
    )
  })

  it('loses castling rights after the rook moves from its original square', () => {
    const state = emptyState({ turn: 'white' })
    place(state, 'e1', { type: 'king', color: 'white' })
    place(state, 'h1', { type: 'rook', color: 'white' })
    place(state, 'a8', { type: 'king', color: 'black' })

    const afterRookMove = makeMove(state, squareToCoords('h1'), squareToCoords('h2'))
    const afterBlackMove = makeMove(afterRookMove, squareToCoords('a8'), squareToCoords('a7'))
    const afterRookReturn = makeMove(afterBlackMove, squareToCoords('h2'), squareToCoords('h1'))
    const afterBlackReturn = makeMove(afterRookReturn, squareToCoords('a7'), squareToCoords('a8'))

    expect(getLegalMoves(afterBlackReturn, squareToCoords('e1'))).not.toEqual(
      expect.arrayContaining([squareToCoords('g1')]),
    )
  })

  it('allows en passant only on the immediate reply and removes the captured pawn', () => {
    const afterWhitePush = makeMove(createInitialState(), squareToCoords('e2'), squareToCoords('e4'))
    const afterBlackWaitingMove = makeMove(afterWhitePush, squareToCoords('a7'), squareToCoords('a6'))
    const afterWhiteAdvance = makeMove(afterBlackWaitingMove, squareToCoords('e4'), squareToCoords('e5'))
    const afterBlackDoublePush = makeMove(afterWhiteAdvance, squareToCoords('d7'), squareToCoords('d5'))

    expect(getLegalMoves(afterBlackDoublePush, squareToCoords('e5'))).toEqual(
      expect.arrayContaining([squareToCoords('d6')]),
    )

    const afterEnPassant = makeMove(afterBlackDoublePush, squareToCoords('e5'), squareToCoords('d6'))

    expect(pieceAt(afterEnPassant, 'd6')).toEqual({ type: 'pawn', color: 'white' })
    expect(pieceAt(afterEnPassant, 'd5')).toBeNull()
    expect(afterEnPassant.captured.white).toContain('pawn')
  })

  it('does not allow en passant after another move has been played', () => {
    const afterWhitePush = makeMove(createInitialState(), squareToCoords('e2'), squareToCoords('e4'))
    const afterBlackWaitingMove = makeMove(afterWhitePush, squareToCoords('a7'), squareToCoords('a6'))
    const afterWhiteAdvance = makeMove(afterBlackWaitingMove, squareToCoords('e4'), squareToCoords('e5'))
    const afterBlackDoublePush = makeMove(afterWhiteAdvance, squareToCoords('d7'), squareToCoords('d5'))
    const afterWhiteWaitingMove = makeMove(afterBlackDoublePush, squareToCoords('h2'), squareToCoords('h3'))
    const afterBlackWaitingMoveAgain = makeMove(afterWhiteWaitingMove, squareToCoords('a6'), squareToCoords('a5'))

    expect(getLegalMoves(afterBlackWaitingMoveAgain, squareToCoords('e5'))).not.toEqual(
      expect.arrayContaining([squareToCoords('d6')]),
    )
  })

  it('promotes a pawn to a queen automatically on the last rank', () => {
    const state = emptyState({ turn: 'white' })
    place(state, 'e1', { type: 'king', color: 'white' })
    place(state, 'h8', { type: 'king', color: 'black' })
    place(state, 'a7', { type: 'pawn', color: 'white' })

    const next = makeMove(state, squareToCoords('a7'), squareToCoords('a8'))

    expect(pieceAt(next, 'a8')).toEqual({ type: 'queen', color: 'white' })
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
