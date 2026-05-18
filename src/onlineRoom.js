import { createInitialState, makeMove, squareToCoords } from './chessEngine.js'

export const ONLINE_ROOM_QUERY_PARAM = 'room'
export const ONLINE_ROOM_TOPIC_PREFIX = 'online-chess'

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/
const REALTIME_PATH = '/realtime/v1/websocket'
const HEARTBEAT_INTERVAL_MS = 25_000

export function getOnlineConfig(env = import.meta.env ?? {}) {
  const supabaseUrl = String(env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !anonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean)

  return {
    available: missing.length === 0,
    anonKey,
    reason: missing.length
      ? `Supabase Realtime is unavailable because ${formatList(missing)} ${missing.length === 1 ? 'is' : 'are'} not configured.`
      : '',
    supabaseUrl,
  }
}

export function createOnlineRoom(idGenerator = generateRoomId) {
  return {
    playerColor: 'white',
    roomId: idGenerator(),
  }
}

export function getRoomMetadata(url) {
  const roomId = getRoomIdFromUrl(url)
  if (!roomId) return null

  return {
    playerColor: 'black',
    roomId,
  }
}

export function getRoomIdFromUrl(url) {
  try {
    const parsed = new URL(url)
    const roomId = parsed.searchParams.get(ONLINE_ROOM_QUERY_PARAM) ?? ''
    return ROOM_ID_PATTERN.test(roomId) ? roomId : ''
  } catch {
    return ''
  }
}

export function buildInviteUrl(baseUrl, roomId) {
  const parsed = new URL(baseUrl)
  parsed.searchParams.set(ONLINE_ROOM_QUERY_PARAM, roomId)
  return parsed.toString()
}

export function applyOnlineMessage(state, message) {
  if (!message || typeof message !== 'object') return state

  if (message.type === 'reset') {
    return createInitialState()
  }

  if (message.type === 'state' && message.game) {
    return message.game
  }

  if (message.type !== 'move') return state

  try {
    return makeMove(state, squareToCoords(message.from), squareToCoords(message.to))
  } catch {
    return state
  }
}

export function getMovePayload(lastMove) {
  if (!lastMove) return null

  return {
    type: 'move',
    from: lastMove.from,
    to: lastMove.to,
  }
}

export function createRealtimeRoomClient({
  anonKey,
  clientId,
  onMessage,
  onStatus,
  roomId,
  supabaseUrl,
  WebSocketImpl = globalThis.WebSocket,
}) {
  let socket = null
  let ref = 0
  let heartbeatTimer = null
  const topic = `realtime:${ONLINE_ROOM_TOPIC_PREFIX}:${roomId}`

  function nextRef() {
    ref += 1
    return String(ref)
  }

  function sendFrame(event, payload = {}) {
    if (!socket || socket.readyState !== WebSocketImpl.OPEN) return false
    socket.send(JSON.stringify([null, nextRef(), topic, event, payload]))
    return true
  }

  function connect() {
    if (!WebSocketImpl) {
      onStatus?.('unavailable', 'This browser does not support WebSocket realtime connections.')
      return
    }

    onStatus?.('connecting', '')
    socket = new WebSocketImpl(buildRealtimeSocketUrl(supabaseUrl, anonKey))

    socket.addEventListener('open', () => {
      sendFrame('phx_join', {
        access_token: anonKey,
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: clientId },
          postgres_changes: [],
        },
      })
      heartbeatTimer = globalThis.setInterval(() => {
        if (socket?.readyState === WebSocketImpl.OPEN) {
          socket.send(JSON.stringify([null, nextRef(), 'phoenix', 'heartbeat', {}]))
        }
      }, HEARTBEAT_INTERVAL_MS)
      onStatus?.('connected', '')
    })

    socket.addEventListener('message', (event) => {
      const frame = parseRealtimeFrame(event.data)
      const payload = frame?.payload
      if (frame?.event !== 'broadcast' || payload?.payload?.clientId === clientId) return
      onMessage?.(payload.payload)
    })

    socket.addEventListener('close', () => {
      stopHeartbeat()
      onStatus?.('disconnected', 'Realtime disconnected. Local play is still available.')
    })

    socket.addEventListener('error', () => {
      onStatus?.('unavailable', 'Realtime connection failed. Check Supabase env configuration.')
    })
  }

  function broadcast(payload) {
    return sendFrame('broadcast', {
      event: payload.type,
      type: 'broadcast',
      payload: { ...payload, clientId },
    })
  }

  function disconnect() {
    stopHeartbeat()
    if (socket) socket.close()
    socket = null
  }

  function stopHeartbeat() {
    if (heartbeatTimer) globalThis.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  return {
    broadcast,
    connect,
    disconnect,
  }
}

export function buildRealtimeSocketUrl(supabaseUrl, anonKey) {
  const url = new URL(REALTIME_PATH, supabaseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('apikey', anonKey)
  url.searchParams.set('vsn', '1.0.0')
  return url.toString()
}

function parseRealtimeFrame(data) {
  try {
    const frame = JSON.parse(data)
    if (!Array.isArray(frame)) return null
    const [, ref, topic, event, payload] = frame
    return { event, payload, ref, topic }
  } catch {
    return null
  }
}

function generateRoomId() {
  const bytes = new Uint8Array(12)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 18)
}

function formatList(items) {
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}
