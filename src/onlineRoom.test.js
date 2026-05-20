import { describe, expect, it } from 'vitest'
import { createInitialState, makeMove, squareToCoords } from './chessEngine.js'
import {
  ONLINE_ROOM_QUERY_PARAM,
  applyOnlineMessage,
  buildInviteUrl,
  createOnlineRoom,
  createRealtimeRoomClient,
  getOnlineConfig,
  getRoomIdFromUrl,
  getRoomMetadata,
} from './onlineRoom.js'

describe('online realtime room helpers', () => {
  it('reports Supabase Realtime as unavailable when env config is missing', () => {
    expect(getOnlineConfig({})).toEqual({
      available: false,
      anonKey: '',
      reason: 'Supabase Realtime is unavailable because VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured.',
      supabaseUrl: '',
    })
  })

  it('normalizes configured Supabase env values', () => {
    expect(getOnlineConfig({
      VITE_SUPABASE_ANON_KEY: ' anon-key ',
      VITE_SUPABASE_URL: ' https://project.supabase.co/ ',
    })).toEqual({
      available: true,
      anonKey: 'anon-key',
      reason: '',
      supabaseUrl: 'https://project.supabase.co',
    })
  })

  it('creates URL-safe white-hosted rooms and invite links', () => {
    const room = createOnlineRoom(() => 'fixed-room-id')
    const inviteUrl = buildInviteUrl('https://chess.example/play?debug=1', room.roomId)

    expect(room).toEqual({
      playerColor: 'white',
      roomId: 'fixed-room-id',
    })
    expect(inviteUrl).toBe(`https://chess.example/play?debug=1&${ONLINE_ROOM_QUERY_PARAM}=fixed-room-id`)
  })

  it('joins invite links as black by default', () => {
    const url = 'https://chess.example/play?room=abc_123'

    expect(getRoomIdFromUrl(url)).toBe('abc_123')
    expect(getRoomMetadata(url)).toEqual({
      playerColor: 'black',
      roomId: 'abc_123',
    })
  })

  it('ignores malformed room ids in invite links', () => {
    expect(getRoomIdFromUrl('https://chess.example/play?room=bad room')).toBe('')
    expect(getRoomMetadata('https://chess.example/play')).toBeNull()
  })

  it('applies legal remote move and reset messages', () => {
    const afterWhite = makeMove(createInitialState(), squareToCoords('e2'), squareToCoords('e4'))
    const afterRemoteMove = applyOnlineMessage(afterWhite, {
      type: 'move',
      from: 'e7',
      to: 'e5',
    })

    expect(afterRemoteMove.history.map((move) => move.notation)).toEqual(['e2-e4', 'e7-e5'])

    const afterReset = applyOnlineMessage(afterRemoteMove, { type: 'reset' })

    expect(afterReset.history).toEqual([])
    expect(afterReset.turn).toBe('white')
  })

  it('rejects illegal remote move messages without mutating the current state', () => {
    const state = createInitialState()

    expect(applyOnlineMessage(state, {
      type: 'move',
      from: 'e7',
      to: 'e5',
    })).toBe(state)
  })

  it('uses Supabase Phoenix object frames and waits for join ack before reporting connected', () => {
    const statuses = []
    const messages = []
    const WebSocketImpl = createFakeWebSocket()
    const client = createRealtimeRoomClient({
      anonKey: 'anon-key',
      clientId: 'white-browser',
      onMessage: (message) => messages.push(message),
      onStatus: (status) => statuses.push(status),
      roomId: 'room-123',
      supabaseUrl: 'https://project.supabase.co',
      WebSocketImpl,
    })

    client.connect()
    const socket = WebSocketImpl.instances[0]
    socket.open()

    expect(statuses).toEqual(['connecting'])
    expect(JSON.parse(socket.sent[0])).toMatchObject({
      event: 'phx_join',
      topic: 'realtime:online-chess:room-123',
    })

    socket.receive({
      event: 'phx_reply',
      payload: { status: 'ok' },
      ref: '1',
      topic: 'realtime:online-chess:room-123',
    })

    expect(statuses).toEqual(['connecting', 'connected'])

    client.broadcast({ type: 'move', from: 'e2', to: 'e4' })
    expect(JSON.parse(socket.sent[1])).toMatchObject({
      event: 'broadcast',
      payload: {
        event: 'move',
        payload: {
          clientId: 'white-browser',
          from: 'e2',
          to: 'e4',
          type: 'move',
        },
        type: 'broadcast',
      },
      topic: 'realtime:online-chess:room-123',
    })

    socket.receive({
      event: 'broadcast',
      payload: {
        event: 'move',
        payload: { clientId: 'black-browser', from: 'e7', to: 'e5', type: 'move' },
        type: 'broadcast',
      },
      topic: 'realtime:online-chess:room-123',
    })

    expect(messages).toEqual([{ clientId: 'black-browser', from: 'e7', to: 'e5', type: 'move' }])
  })
})

function createFakeWebSocket() {
  return class FakeWebSocket {
    static OPEN = 1
    static instances = []

    constructor(url) {
      this.listeners = {}
      this.readyState = 0
      this.sent = []
      this.url = url
      FakeWebSocket.instances.push(this)
    }

    addEventListener(event, listener) {
      this.listeners[event] = listener
    }

    send(frame) {
      this.sent.push(frame)
    }

    close() {
      this.readyState = 3
      this.listeners.close?.({})
    }

    open() {
      this.readyState = FakeWebSocket.OPEN
      this.listeners.open?.({})
    }

    receive(frame) {
      this.listeners.message?.({ data: JSON.stringify(frame) })
    }
  }
}
