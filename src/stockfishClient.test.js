import { describe, expect, it, vi } from 'vitest'
import {
  DIFFICULTY_SETTINGS,
  StockfishClient,
  formatFen,
  parseUciMove,
} from './stockfishClient.js'
import { createInitialState, makeMove, squareToCoords } from './chessEngine.js'

class FakeWorker {
  static instances = []

  constructor() {
    this.messages = []
    this.terminated = false
    FakeWorker.instances.push(this)
  }

  postMessage(message) {
    this.messages.push(message)
  }

  emit(message) {
    this.onmessage?.({ data: message })
  }

  fail(message = 'worker failed') {
    this.onerror?.({ message })
  }

  terminate() {
    this.terminated = true
  }
}

describe('stockfish client', () => {
  it('serializes the current game state to FEN for Stockfish', () => {
    const afterWhite = makeMove(createInitialState(), squareToCoords('e2'), squareToCoords('e4'))
    const afterBlack = makeMove(afterWhite, squareToCoords('c7'), squareToCoords('c5'))

    expect(formatFen(createInitialState())).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')
    expect(formatFen(afterWhite)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b - - 0 1')
    expect(formatFen(afterBlack)).toBe('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w - - 0 2')
  })

  it('parses long algebraic UCI moves into engine coordinates', () => {
    expect(parseUciMove('e7e5')).toEqual({
      from: squareToCoords('e7'),
      to: squareToCoords('e5'),
      promotion: null,
    })
    expect(parseUciMove('a7a8q')).toEqual({
      from: squareToCoords('a7'),
      to: squareToCoords('a8'),
      promotion: 'q',
    })
  })

  it('sends bounded difficulty settings and resolves the bestmove response', async () => {
    FakeWorker.instances = []
    const client = new StockfishClient({
      WorkerCtor: FakeWorker,
      timeoutMs: 1000,
    })

    const pendingMove = client.getBestMove({
      fen: formatFen(createInitialState()),
      difficulty: 'easy',
    })

    const worker = FakeWorker.instances[0]
    worker.emit('uciok')
    await Promise.resolve()
    worker.emit('readyok')
    await vi.waitFor(() => {
      expect(worker.messages).toContain(`go depth ${DIFFICULTY_SETTINGS.easy.depth} movetime ${DIFFICULTY_SETTINGS.easy.moveTime}`)
    })
    worker.emit('bestmove e7e5 ponder g1f3')

    await expect(pendingMove).resolves.toEqual({
      from: squareToCoords('e7'),
      to: squareToCoords('e5'),
      promotion: null,
      uci: 'e7e5',
    })
    expect(worker.messages).toContain('uci')
    expect(worker.messages).toContain(`setoption name Skill Level value ${DIFFICULTY_SETTINGS.easy.skillLevel}`)
    expect(worker.messages).toContain(`position fen ${formatFen(createInitialState())}`)
    expect(worker.messages).toContain(`go depth ${DIFFICULTY_SETTINGS.easy.depth} movetime ${DIFFICULTY_SETTINGS.easy.moveTime}`)
  })

  it('rejects with a clear unavailable error when the worker cannot answer', async () => {
    vi.useFakeTimers()
    const client = new StockfishClient({
      WorkerCtor: FakeWorker,
      timeoutMs: 50,
    })

    const pendingMove = client.getBestMove({
      fen: formatFen(createInitialState()),
      difficulty: 'normal',
    })

    vi.advanceTimersByTime(51)

    await expect(pendingMove).rejects.toThrow(/unavailable/i)
    vi.useRealTimers()
  })
})
