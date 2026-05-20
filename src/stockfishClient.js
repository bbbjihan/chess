import { coordsToSquare, squareToCoords } from './chessEngine.js'

export const DEFAULT_STOCKFISH_WORKER_URL = '/stockfish/stockfish.js'

export const DIFFICULTY_SETTINGS = {
  easy: {
    label: 'Easy',
    skillLevel: 1,
    depth: 3,
    moveTime: 250,
  },
  normal: {
    label: 'Normal',
    skillLevel: 7,
    depth: 6,
    moveTime: 600,
  },
  hard: {
    label: 'Hard',
    skillLevel: 15,
    depth: 10,
    moveTime: 1200,
  },
}

const PIECE_TO_FEN = {
  white: {
    king: 'K',
    queen: 'Q',
    rook: 'R',
    bishop: 'B',
    knight: 'N',
    pawn: 'P',
  },
  black: {
    king: 'k',
    queen: 'q',
    rook: 'r',
    bishop: 'b',
    knight: 'n',
    pawn: 'p',
  },
}

export class StockfishUnavailableError extends Error {
  constructor(message = 'Stockfish engine is unavailable') {
    super(message)
    this.name = 'StockfishUnavailableError'
  }
}

export class StockfishClient {
  constructor({
    WorkerCtor = globalThis.Worker,
    workerUrl = DEFAULT_STOCKFISH_WORKER_URL,
    timeoutMs = 45000,
  } = {}) {
    this.WorkerCtor = WorkerCtor
    this.workerUrl = workerUrl
    this.timeoutMs = timeoutMs
    this.worker = null
    this.ready = false
    this.waiters = new Set()
    this.lines = []
  }

  async getBestMove({ fen, difficulty = 'normal' }) {
    const settings = DIFFICULTY_SETTINGS[difficulty] ?? DIFFICULTY_SETTINGS.normal

    await this.ensureReady()
    this.post(`setoption name Skill Level value ${settings.skillLevel}`)
    this.post('ucinewgame')
    this.post('isready')
    await this.waitFor((line) => line === 'readyok')
    this.lines = []
    this.post(`position fen ${fen}`)
    this.post(`go depth ${settings.depth} movetime ${settings.moveTime}`)

    const bestMoveLine = await this.waitFor((line) => line.startsWith('bestmove '))
    const uci = bestMoveLine.split(/\s+/)[1]
    const move = parseUciMove(uci)

    if (!move) {
      throw new StockfishUnavailableError('Stockfish returned no legal move')
    }

    return { ...move, uci }
  }

  terminate() {
    this.worker?.terminate?.()
    this.worker = null
    this.ready = false
    this.rejectWaiters(new StockfishUnavailableError('Stockfish engine was stopped'))
  }

  async ensureReady() {
    this.ensureWorker()
    if (this.ready) return

    this.post('uci')
    await this.waitFor((line) => line === 'uciok')
    this.ready = true
  }

  ensureWorker() {
    if (!this.WorkerCtor) {
      throw new StockfishUnavailableError('This browser does not support Web Workers')
    }

    if (this.worker) return

    try {
      this.worker = new this.WorkerCtor(this.workerUrl)
    } catch (error) {
      throw new StockfishUnavailableError(error.message)
    }

    this.worker.onmessage = (event) => this.receive(event.data)
    this.worker.onerror = (event) => {
      this.rejectWaiters(new StockfishUnavailableError(event.message || 'Stockfish worker failed'))
    }
  }

  post(command) {
    this.worker.postMessage(command)
  }

  receive(message) {
    const line = String(message).trim()
    if (!line) return

    this.lines.push(line)
    for (const waiter of [...this.waiters]) {
      if (waiter.predicate(line)) {
        waiter.resolve(line)
      }
    }
  }

  waitFor(predicate) {
    const existingLine = this.lines.find(predicate)
    if (existingLine) return Promise.resolve(existingLine)

    return new Promise((resolve, reject) => {
      const waiter = {
        predicate,
        resolve: (line) => {
          clearTimeout(timer)
          this.waiters.delete(waiter)
          resolve(line)
        },
        reject: (error) => {
          clearTimeout(timer)
          this.waiters.delete(waiter)
          reject(error)
        },
      }
      const timer = setTimeout(() => {
        waiter.reject(new StockfishUnavailableError('Stockfish engine is unavailable or did not respond'))
      }, this.timeoutMs)

      this.waiters.add(waiter)
    })
  }

  rejectWaiters(error) {
    for (const waiter of [...this.waiters]) {
      waiter.reject(error)
    }
  }
}

export function formatFen(state) {
  const board = state.board
    .map((row) => {
      let emptyCount = 0
      let rank = ''

      for (const piece of row) {
        if (!piece) {
          emptyCount += 1
          continue
        }

        if (emptyCount > 0) {
          rank += String(emptyCount)
          emptyCount = 0
        }
        rank += PIECE_TO_FEN[piece.color][piece.type]
      }

      return `${rank}${emptyCount > 0 ? emptyCount : ''}`
    })
    .join('/')
  const fullMove = Math.floor(state.history.length / 2) + 1

  return `${board} ${state.turn[0]} - - 0 ${fullMove}`
}

export function parseUciMove(uci) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null

  return {
    from: squareToCoords(uci.slice(0, 2)),
    to: squareToCoords(uci.slice(2, 4)),
    promotion: uci[4] ?? null,
  }
}

export function describeComputerMove(move) {
  return `${coordsToSquare(move.from)}-${coordsToSquare(move.to)}`
}