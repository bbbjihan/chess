import { makeMove } from './chessEngine.js'

export const PLAYER_MODES = {
  local: 'local',
  computer: 'computer',
}

export function shouldRequestComputerMove(game, playerMode, isThinking) {
  return (
    playerMode === PLAYER_MODES.computer &&
    game.turn === 'black' &&
    game.status !== 'checkmate' &&
    game.status !== 'stalemate' &&
    !isThinking
  )
}

export function applyComputerMove(game, move) {
  return makeMove(game, move.from, move.to)
}
