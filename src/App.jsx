import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { createInitialState, coordsToSquare, getLegalMoves, makeMove } from './chessEngine.js'
import {
  applyOnlineMessage,
  buildInviteUrl,
  createOnlineRoom,
  createRealtimeRoomClient,
  getMovePayload,
  getOnlineConfig,
  getRoomMetadata,
} from './onlineRoom.js'

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
  const onlineConfig = useMemo(() => getOnlineConfig(), [])
  const [onlineRoom, setOnlineRoom] = useState(() => {
    if (typeof window === 'undefined') return null
    return getRoomMetadata(window.location.href)
  })
  const [connectionStatus, setConnectionStatus] = useState(() => {
    if (!onlineConfig.available) return 'unavailable'
    return onlineRoom ? 'connecting' : 'local'
  })
  const [onlineNotice, setOnlineNotice] = useState(() => onlineConfig.reason)
  const onlineClientRef = useRef(null)
  const gameRef = useRef(game)
  const clientIdRef = useRef(createClientId())

  const legalMoves = useMemo(
    () => (selected ? getLegalMoves(game, selected) : []),
    [game, selected],
  )

  const statusText = getStatusText(game)
  const inviteLink = useMemo(() => {
    if (!onlineRoom || typeof window === 'undefined') return ''
    return buildInviteUrl(window.location.href, onlineRoom.roomId)
  }, [onlineRoom])

  useEffect(() => {
    gameRef.current = game
  }, [game])

  const handleOnlineMessage = useCallback((payload) => {
    if (payload?.type === 'sync-request') {
      onlineClientRef.current?.broadcast({ type: 'state', game: gameRef.current })
      return
    }

    setGame((current) => {
      const nextGame = applyOnlineMessage(current, payload)
      if (nextGame !== current) {
        gameRef.current = nextGame
        setSelected(null)
        setMessage(payload.type === 'reset' ? '상대가 새 게임을 시작했습니다.' : buildMoveMessage(nextGame))
      }
      return nextGame
    })
  }, [])

  useEffect(() => {
    if (!onlineRoom || !onlineConfig.available) return undefined

    const client = createRealtimeRoomClient({
      ...onlineConfig,
      clientId: clientIdRef.current,
      onMessage: handleOnlineMessage,
      onStatus: (status, notice) => {
        setConnectionStatus(status)
        setOnlineNotice(notice)
      },
      roomId: onlineRoom.roomId,
    })

    onlineClientRef.current = client
    client.connect()
    const syncTimer = globalThis.setTimeout(() => {
      client.broadcast({ type: 'sync-request' })
    }, 800)

    return () => {
      globalThis.clearTimeout(syncTimer)
      client.disconnect()
      onlineClientRef.current = null
    }
  }, [handleOnlineMessage, onlineConfig, onlineRoom])

  function handleSquareClick(row, col) {
    const target = { row, col }
    const piece = game.board[row][col]

    if (game.status === 'checkmate' || game.status === 'stalemate') return
    if (onlineRoom && game.turn !== onlineRoom.playerColor) {
      setMessage(`온라인 대국에서 ${capitalize(game.turn)} 차례입니다. 상대의 수를 기다리세요.`)
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
      const lastMove = nextGame.history.at(-1)
      setGame(nextGame)
      setSelected(null)
      setMessage(buildMoveMessage(nextGame))
      onlineClientRef.current?.broadcast(getMovePayload(lastMove))
    } catch (error) {
      setMessage(error.message)
    }
  }

  function resetGame() {
    const nextGame = createInitialState()
    setGame(nextGame)
    setSelected(null)
    setMessage('New game started. White to move.')
    onlineClientRef.current?.broadcast({ type: 'reset' })
  }

  function startOnlineRoom() {
    if (!onlineConfig.available) {
      setOnlineNotice(onlineConfig.reason)
      setConnectionStatus('unavailable')
      return
    }

    const room = createOnlineRoom()
    setGame(createInitialState())
    setSelected(null)
    setMessage('온라인 방을 만들었습니다. 초대 링크를 공유하세요.')
    setOnlineRoom(room)
    updateRoomUrl(room.roomId)
  }

  function leaveOnlineRoom() {
    setOnlineRoom(null)
    setOnlineNotice(onlineConfig.reason)
    setConnectionStatus(onlineConfig.available ? 'local' : 'unavailable')
    removeRoomUrl()
  }

  async function copyInviteLink() {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
      setOnlineNotice('Invite link copied.')
    } catch {
      setOnlineNotice(inviteLink)
    }
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

          <button className="reset-button" onClick={resetGame} type="button">
            새 게임 시작
          </button>

          <div className="online-panel">
            <div>
              <p className="panel-label">온라인 대국</p>
              <h2>{getOnlineStatusText(connectionStatus)}</h2>
            </div>

            {onlineRoom ? (
              <>
                <p className="online-copy">
                  {capitalize(onlineRoom.playerColor)}로 접속 중입니다. 초대 링크로 1:1 대국을 이어갑니다.
                </p>
                <div className="invite-row">
                  <input aria-label="Invite link" readOnly value={inviteLink} />
                  <button onClick={copyInviteLink} type="button">복사</button>
                </div>
                <button className="secondary-button" onClick={leaveOnlineRoom} type="button">
                  온라인 방 나가기
                </button>
              </>
            ) : (
              <>
                <p className="online-copy">
                  {onlineConfig.available
                    ? '초대 링크를 만들어 흰색으로 시작하거나, 받은 링크를 열어 검은색으로 참가하세요.'
                    : onlineConfig.reason}
                </p>
                <button
                  className="secondary-button"
                  disabled={!onlineConfig.available}
                  onClick={startOnlineRoom}
                  type="button"
                >
                  초대 링크 만들기
                </button>
              </>
            )}

            {onlineNotice && <p className="online-notice">{onlineNotice}</p>}
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

function getOnlineStatusText(status) {
  if (status === 'connected') return 'Realtime connected'
  if (status === 'connecting') return 'Connecting'
  if (status === 'disconnected') return 'Disconnected'
  if (status === 'unavailable') return 'Online unavailable'
  return 'Local play'
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

function createClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function updateRoomUrl(roomId) {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', buildInviteUrl(window.location.href, roomId))
}

function removeRoomUrl() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  window.history.replaceState(null, '', url.toString())
}

export default App
