import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { createInitialState, coordsToSquare, getLegalMoves, makeMove } from './chessEngine.js'
import {
  PLAYER_MODES,
  applyComputerMove,
  shouldRequestComputerMove,
} from './computerOpponent.js'
import {
  DIFFICULTY_SETTINGS,
  StockfishClient,
  describeComputerMove,
  formatFen,
} from './stockfishClient.js'

const PIECES = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
}

const PIECE_NAMES = {
  king: 'King',
  queen: 'Queen',
  rook: 'Rook',
  bishop: 'Bishop',
  knight: 'Knight',
  pawn: 'Pawn',
}

function App() {
  const [game, setGame] = useState(() => createInitialState())
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('White to move. Choose a piece to begin.')
  const [playerMode, setPlayerMode] = useState(PLAYER_MODES.local)
  const [difficulty, setDifficulty] = useState('normal')
  const [isComputerThinking, setIsComputerThinking] = useState(false)
  const [computerError, setComputerError] = useState('')
  const stockfishClientRef = useRef(null)

  const legalMoves = useMemo(
    () => (selected ? getLegalMoves(game, selected) : []),
    [game, selected],
  )

  const statusText = getStatusText(game)
  const isComputerMode = playerMode === PLAYER_MODES.computer
  const isHumanInputLocked = isComputerThinking || (isComputerMode && game.turn === 'black')

  useEffect(() => {
    if (!(isComputerMode && game.turn === 'black' && isComputerThinking)) return undefined

    let cancelled = false

    if (!stockfishClientRef.current) {
      stockfishClientRef.current = new StockfishClient()
    }

    stockfishClientRef.current
      .getBestMove({ fen: formatFen(game), difficulty })
      .then((move) => {
        if (cancelled) return

        setGame((currentGame) => {
          try {
            if (currentGame.turn !== 'black' || currentGame.status === 'checkmate' || currentGame.status === 'stalemate') {
              return currentGame
            }

            const nextGame = applyComputerMove(currentGame, move)
            setSelected(null)
            setMessage(`Stockfish played ${describeComputerMove(move)}. ${getStatusText(nextGame)}.`)
            return nextGame
          } catch (error) {
            setComputerError(error.message)
            setMessage(`Computer move failed: ${error.message}`)
            return currentGame
          }
        })
      })
      .catch((error) => {
        if (cancelled) return
        setComputerError(error.message)
        setMessage(`Stockfish unavailable. Switch to local two-player mode to continue. ${error.message}`)
      })
      .finally(() => {
        if (!cancelled) setIsComputerThinking(false)
      })

    return () => {
      cancelled = true
    }
  }, [difficulty, game, isComputerMode, isComputerThinking])

  useEffect(() => () => stockfishClientRef.current?.terminate(), [])

  function handleSquareClick(row, col) {
    const target = { row, col }
    const piece = game.board[row][col]

    if (game.status === 'checkmate' || game.status === 'stalemate') return
    if (isHumanInputLocked) {
      setMessage(isComputerThinking ? 'Stockfish is thinking...' : 'Computer opponent is playing black.')
      return
    }

    if (!selected) {
      if (piece?.color === game.turn) {
        setSelected(target)
        setMessage(`${capitalize(game.turn)} ${PIECE_NAMES[piece.type]} selected at ${coordsToSquare(target)}.`)
      }
      return
    }

    if (sameSquare(selected, target)) {
      setSelected(null)
      setMessage(`${capitalize(game.turn)} to move.`)
      return
    }

    if (piece?.color === game.turn) {
      setSelected(target)
      setMessage(`${capitalize(game.turn)} ${PIECE_NAMES[piece.type]} selected at ${coordsToSquare(target)}.`)
      return
    }

    try {
      const nextGame = makeMove(game, selected, target)
      setGame(nextGame)
      setSelected(null)
      if (shouldRequestComputerMove(nextGame, playerMode, false)) {
        setComputerError('')
        setIsComputerThinking(true)
        setMessage('Stockfish is thinking...')
      } else {
        setMessage(buildMoveMessage(nextGame))
      }
    } catch (error) {
      setMessage(error.message)
    }
  }

  function resetGame() {
    setGame(createInitialState())
    setSelected(null)
    setComputerError('')
    setIsComputerThinking(false)
    setMessage('New game started. White to move.')
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">chess.jihan.kr</p>
        <div className="hero-copy">
          <h1>Chess, shipped by vibe coding.</h1>
          <p className="lead">
            로컬 2인용 체스입니다. 말을 클릭하고 이동할 칸을 선택하세요. 체크,
            체크메이트, 스테일메이트를 감지하고 폰은 마지막 랭크에서 자동 퀸으로 승급합니다.
          </p>
        </div>
      </section>

      <section className="game-layout" aria-label="Interactive chess game">
        <div className="board-wrap">
          <div className="board-frame">
            <div className="file-labels top" aria-hidden="true">
              {'abcdefgh'.split('').map((file) => <span key={file}>{file}</span>)}
            </div>
            <div className="board-with-ranks">
              <div className="rank-labels" aria-hidden="true">
                {[8, 7, 6, 5, 4, 3, 2, 1].map((rank) => <span key={rank}>{rank}</span>)}
              </div>
              <div className="chess-board" role="grid" aria-label="Chess board">
                {game.board.map((row, rowIndex) =>
                  row.map((piece, colIndex) => {
                    const coords = { row: rowIndex, col: colIndex }
                    const square = coordsToSquare(coords)
                    const isSelected = selected && sameSquare(selected, coords)
                    const isLegal = legalMoves.some((move) => sameSquare(move, coords))
                    const isDark = (rowIndex + colIndex) % 2 === 1
                    const label = `${square}${piece ? ` ${piece.color} ${piece.type}` : ''}`

                    return (
                      <button
                        aria-label={label}
                        className={[
                          'square',
                          isDark ? 'dark' : 'light',
                          isSelected ? 'selected' : '',
                          isLegal ? 'legal' : '',
                        ].filter(Boolean).join(' ')}
                        key={square}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                        role="gridcell"
                        type="button"
                      >
                        {piece && (
                          <span className={`piece ${piece.color}`} aria-hidden="true">
                            {PIECES[piece.color][piece.type]}
                          </span>
                        )}
                      </button>
                    )
                  }),
                )}
              </div>
              <div className="rank-labels right" aria-hidden="true">
                {[8, 7, 6, 5, 4, 3, 2, 1].map((rank) => <span key={rank}>{rank}</span>)}
              </div>
            </div>
            <div className="file-labels" aria-hidden="true">
              {'abcdefgh'.split('').map((file) => <span key={file}>{file}</span>)}
            </div>
          </div>
        </div>

        <aside className="panel game-panel">
          <div className="status-card">
            <span className={`turn-dot ${game.turn}`} />
            <div>
              <p className="panel-label">현재 상태</p>
              <h2>{statusText}</h2>
            </div>
          </div>

          <p className="message" role="status">{message}</p>

          <div className="control-group" aria-label="Game mode">
            <p className="panel-label">상대</p>
            <div className="segmented-control">
              <button
                aria-pressed={playerMode === PLAYER_MODES.local}
                className={playerMode === PLAYER_MODES.local ? 'active' : ''}
                onClick={() => {
                  setPlayerMode(PLAYER_MODES.local)
                  setComputerError('')
                  setMessage(`${capitalize(game.turn)} to move.`)
                }}
                type="button"
              >
                2인
              </button>
              <button
                aria-pressed={playerMode === PLAYER_MODES.computer}
                className={playerMode === PLAYER_MODES.computer ? 'active' : ''}
                onClick={() => {
                  setPlayerMode(PLAYER_MODES.computer)
                  setComputerError('')
                  if (game.turn === 'black' && game.status !== 'checkmate' && game.status !== 'stalemate') {
                    setIsComputerThinking(true)
                    setMessage('Stockfish is thinking...')
                  } else {
                    setMessage('Computer opponent enabled. You play white.')
                  }
                }}
                type="button"
              >
                컴퓨터
              </button>
            </div>
          </div>

          <label className="select-field">
            <span className="panel-label">난이도</span>
            <select
              disabled={!isComputerMode || isComputerThinking}
              onChange={(event) => setDifficulty(event.target.value)}
              value={difficulty}
            >
              {Object.entries(DIFFICULTY_SETTINGS).map(([value, settings]) => (
                <option key={value} value={value}>{settings.label}</option>
              ))}
            </select>
          </label>

          {isComputerThinking && <p className="engine-note">Stockfish is calculating in a browser worker.</p>}
          {computerError && <p className="engine-error" role="alert">{computerError}</p>}

          <div className="stats-grid">
            <div>
              <span>White captured</span>
              <strong>{formatCaptured(game.captured.white)}</strong>
            </div>
            <div>
              <span>Black captured</span>
              <strong>{formatCaptured(game.captured.black)}</strong>
            </div>
          </div>

          <button className="reset-button" onClick={resetGame} type="button">
            새 게임 시작
          </button>

          <div className="move-list">
            <p className="panel-label">기보</p>
            {game.history.length === 0 ? (
              <p className="empty-history">아직 이동이 없습니다.</p>
            ) : (
              <ol>
                {game.history.map((move, index) => (
                  <li key={`${move.notation}-${index}`}>
                    <span>{index + 1}.</span> {move.notation}
                    {move.captured && <em> x {move.captured}</em>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

function getStatusText(game) {
  if (game.status === 'checkmate') return `${capitalize(game.winner)} wins by checkmate`
  if (game.status === 'stalemate') return 'Draw by stalemate'
  if (game.status === 'check') return `${capitalize(game.turn)} is in check`
  return `${capitalize(game.turn)} to move`
}

function buildMoveMessage(game) {
  const lastMove = game.history.at(-1)
  if (game.status === 'checkmate') return `${lastMove.notation}. Checkmate — ${capitalize(game.winner)} wins.`
  if (game.status === 'stalemate') return `${lastMove.notation}. Stalemate.`
  if (game.status === 'check') return `${lastMove.notation}. Check!`
  return `${lastMove.notation}. ${capitalize(game.turn)} to move.`
}

function formatCaptured(captured) {
  return captured.length ? captured.map((piece) => PIECE_NAMES[piece]).join(', ') : '—'
}

function sameSquare(a, b) {
  return a?.row === b?.row && a?.col === b?.col
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default App
