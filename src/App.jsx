import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { createInitialState, coordsToSquare, getLegalMoves, makeMove } from './chessEngine.js'
import {
  clearStoredRecords,
  loadRecords,
  recordCompletedGame,
  saveRecords,
} from './localRecords.js'

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
  const [records, setRecords] = useState(() => loadRecords())
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('White to move. Choose a piece to begin.')
  const recordedGameRef = useRef(null)

  const legalMoves = useMemo(
    () => (selected ? getLegalMoves(game, selected) : []),
    [game, selected],
  )

  const statusText = getStatusText(game)
  const recentGames = records.recentGames

  useEffect(() => {
    if (game.status !== 'checkmate' && game.status !== 'stalemate') {
      recordedGameRef.current = null
      return
    }

    const finalNotation = game.history.at(-1)?.notation ?? 'none'
    const completionKey = `${game.status}:${game.winner ?? 'draw'}:${game.history.length}:${finalNotation}`
    if (recordedGameRef.current === completionKey) return

    setRecords((current) => {
      const nextRecords = recordCompletedGame(current, game)
      saveRecords(nextRecords)
      return nextRecords
    })
    recordedGameRef.current = completionKey
  }, [game])

  function handleSquareClick(row, col) {
    const target = { row, col }
    const piece = game.board[row][col]

    if (game.status === 'checkmate' || game.status === 'stalemate') return

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
      setMessage(buildMoveMessage(nextGame))
    } catch (error) {
      setMessage(error.message)
    }
  }

  function resetGame() {
    setGame(createInitialState())
    setSelected(null)
    recordedGameRef.current = null
    setMessage('New game started. White to move.')
  }

  function clearRecords() {
    const nextRecords = clearStoredRecords()
    setRecords(nextRecords)
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

          <div className="records-section" aria-label="Local profile records">
            <div className="section-heading">
              <p className="panel-label">프로필 기록</p>
              <button className="text-button" onClick={clearRecords} type="button">
                기록 초기화
              </button>
            </div>
            <div className="profile-grid">
              {(['white', 'black']).map((color) => {
                const profile = records.profiles[color]

                return (
                  <article className="profile-card" key={color}>
                    <div className="profile-card-header">
                      <span className={`turn-dot ${color}`} />
                      <div>
                        <h3>{profile.name}</h3>
                        <strong>{profile.rating}</strong>
                      </div>
                    </div>
                    <dl>
                      <div>
                        <dt>전적</dt>
                        <dd>{profile.wins}W {profile.losses}L {profile.draws}D</dd>
                      </div>
                      <div>
                        <dt>게임</dt>
                        <dd>{profile.games}</dd>
                      </div>
                      <div>
                        <dt>체크메이트</dt>
                        <dd>{profile.checkmates}</dd>
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </div>

          <button className="reset-button" onClick={resetGame} type="button">
            새 게임 시작
          </button>

          <div className="recent-games">
            <p className="panel-label">최근 대국</p>
            {recentGames.length === 0 ? (
              <p className="empty-history">저장된 완료 대국이 없습니다.</p>
            ) : (
              <ol>
                {recentGames.map((recentGame) => (
                  <li key={recentGame.id}>
                    <div>
                      <strong>{formatRecentResult(recentGame)}</strong>
                      <span>{formatGameDate(recentGame.completedAt)}</span>
                    </div>
                    <p>
                      {recentGame.moveCount} moves
                      {recentGame.finalNotation ? ` · ${recentGame.finalNotation}` : ''}
                    </p>
                    <em>
                      W {formatRatingDelta(recentGame.ratings.white)} · B {formatRatingDelta(recentGame.ratings.black)}
                    </em>
                  </li>
                ))}
              </ol>
            )}
          </div>

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

function formatRecentResult(game) {
  if (game.result === 'draw') return 'Draw by stalemate'
  return `${capitalize(game.result)} won by checkmate`
}

function formatGameDate(completedAt) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(completedAt))
}

function formatRatingDelta({ before, after }) {
  const delta = after - before
  const sign = delta > 0 ? '+' : ''
  return `${after} (${sign}${delta})`
}

function sameSquare(a, b) {
  return a?.row === b?.row && a?.col === b?.col
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default App
