export const BOARD_SIZE = 8

const WHITE_BACK_RANK = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
const BLACK_BACK_RANK = [...WHITE_BACK_RANK]

export function createInitialState() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))

  board[0] = BLACK_BACK_RANK.map((type) => ({ type, color: 'black' }))
  board[1] = Array.from({ length: BOARD_SIZE }, () => ({ type: 'pawn', color: 'black' }))
  board[6] = Array.from({ length: BOARD_SIZE }, () => ({ type: 'pawn', color: 'white' }))
  board[7] = WHITE_BACK_RANK.map((type) => ({ type, color: 'white' }))

  return {
    board,
    turn: 'white',
    selected: null,
    status: 'active',
    winner: null,
    captured: { white: [], black: [] },
    history: [],
    castlingRights: createCastlingRights(),
    enPassant: null,
  }
}

export function squareToCoords(square) {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1])
  return { row: BOARD_SIZE - rank, col: file }
}

export function coordsToSquare({ row, col }) {
  return `${String.fromCharCode(97 + col)}${BOARD_SIZE - row}`
}

export function cloneState(state) {
  return {
    ...state,
    board: cloneBoard(state.board),
    captured: {
      white: [...state.captured.white],
      black: [...state.captured.black],
    },
    history: [...state.history],
    selected: state.selected ? { ...state.selected } : null,
    castlingRights: cloneCastlingRights(state.castlingRights),
    enPassant: state.enPassant
      ? {
          target: { ...state.enPassant.target },
          pawn: { ...state.enPassant.pawn },
          color: state.enPassant.color,
        }
      : null,
  }
}

export function getLegalMoves(state, from) {
  const piece = getPiece(state.board, from)
  if (!piece || piece.color !== state.turn || isGameComplete(state.status)) return []

  return getPseudoLegalMoves(state, from).filter((to) => {
    const nextBoard = moveOnBoard(state, from, to)
    return !isInCheck(nextBoard, piece.color)
  })
}

export function makeMove(state, from, to) {
  if (isGameComplete(state.status)) {
    throw new Error('Game is already complete')
  }

  const piece = getPiece(state.board, from)
  if (!piece) throw new Error('No piece on the selected square')
  if (piece.color !== state.turn) throw new Error(`It is ${state.turn}'s turn`)

  const legalMoves = getLegalMoves(state, from)
  if (!containsCoord(legalMoves, to)) {
    throw new Error('Illegal move: move would leave the king in check or violates piece movement')
  }

  const next = cloneState(state)
  const capturedPiece = getCapturedPieceForMove(next, from, to)
  next.board = moveOnBoard(next, from, to)

  const movedPiece = getPiece(next.board, to)
  if (movedPiece.type === 'pawn' && (to.row === 0 || to.row === BOARD_SIZE - 1)) {
    next.board[to.row][to.col] = { ...movedPiece, type: 'queen' }
  }

  if (capturedPiece) {
    next.captured[piece.color].push(capturedPiece.type)
  }

  next.turn = opposite(piece.color)
  next.selected = null
  next.castlingRights = updateCastlingRights(next.castlingRights, piece, from, capturedPiece, getCapturedSquareForMove(state, from, to))
  next.enPassant = getNextEnPassant(piece, from, to)
  next.history.push({
    from: coordsToSquare(from),
    to: coordsToSquare(to),
    piece: piece.type,
    captured: capturedPiece?.type ?? null,
    notation: `${coordsToSquare(from)}-${coordsToSquare(to)}`,
  })

  const opponent = next.turn
  const opponentHasMoves = hasAnyLegalMove(next, opponent)
  const opponentInCheck = isInCheck(next.board, opponent)

  if (opponentInCheck && !opponentHasMoves) {
    next.status = 'checkmate'
    next.winner = piece.color
  } else if (!opponentInCheck && !opponentHasMoves) {
    next.status = 'stalemate'
    next.winner = null
  } else {
    next.status = opponentInCheck ? 'check' : 'active'
    next.winner = null
  }

  return next
}

export function isInCheck(board, color) {
  const king = findKing(board, color)
  if (!king) return true
  return isSquareAttacked(board, king, opposite(color))
}

export function getPiece(board, { row, col }) {
  if (!isInside(row, col)) return null
  return board[row][col]
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)))
}

function moveOnBoard(state, from, to) {
  const nextBoard = cloneBoard(state.board)
  const piece = nextBoard[from.row][from.col]
  nextBoard[from.row][from.col] = null

  if (isEnPassantMove(state, from, to)) {
    nextBoard[from.row][to.col] = null
  }

  nextBoard[to.row][to.col] = piece

  if (isCastlingMove(piece, from, to)) {
    const rookFromCol = to.col > from.col ? BOARD_SIZE - 1 : 0
    const rookToCol = to.col > from.col ? to.col - 1 : to.col + 1
    nextBoard[to.row][rookToCol] = nextBoard[to.row][rookFromCol]
    nextBoard[to.row][rookFromCol] = null
  }

  return nextBoard
}

function getPseudoLegalMoves(state, from) {
  const { board } = state
  const piece = getPiece(board, from)
  if (!piece) return []

  switch (piece.type) {
    case 'pawn':
      return getPawnMoves(state, from, piece.color)
    case 'knight':
      return getJumpMoves(board, from, piece.color, [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ])
    case 'bishop':
      return getSlidingMoves(board, from, piece.color, [[-1, -1], [-1, 1], [1, -1], [1, 1]])
    case 'rook':
      return getSlidingMoves(board, from, piece.color, [[-1, 0], [1, 0], [0, -1], [0, 1]])
    case 'queen':
      return getSlidingMoves(board, from, piece.color, [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ])
    case 'king':
      return getKingMoves(state, from, piece.color)
    default:
      return []
  }
}

function getBasicPseudoLegalMoves(board, from) {
  const piece = getPiece(board, from)
  if (!piece) return []

  switch (piece.type) {
    case 'pawn':
      return getBasicPawnMoves(board, from, piece.color)
    case 'knight':
      return getJumpMoves(board, from, piece.color, [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ])
    case 'bishop':
      return getSlidingMoves(board, from, piece.color, [[-1, -1], [-1, 1], [1, -1], [1, 1]])
    case 'rook':
      return getSlidingMoves(board, from, piece.color, [[-1, 0], [1, 0], [0, -1], [0, 1]])
    case 'queen':
      return getSlidingMoves(board, from, piece.color, [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, 0], [1, 0], [0, -1], [0, 1],
      ])
    case 'king':
      return getJumpMoves(board, from, piece.color, [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1],
      ])
    default:
      return []
  }
}

function getPawnMoves(state, from, color) {
  const moves = getBasicPawnMoves(state.board, from, color)
  const enPassantTarget = getEnPassantMove(state, from, color)
  if (enPassantTarget) moves.push(enPassantTarget)
  return moves
}

function getBasicPawnMoves(board, from, color) {
  const direction = color === 'white' ? -1 : 1
  const startRow = color === 'white' ? 6 : 1
  const moves = []
  const oneStep = { row: from.row + direction, col: from.col }
  const twoStep = { row: from.row + direction * 2, col: from.col }

  if (isInside(oneStep.row, oneStep.col) && !getPiece(board, oneStep)) {
    moves.push(oneStep)
    if (from.row === startRow && !getPiece(board, twoStep)) {
      moves.push(twoStep)
    }
  }

  for (const colDelta of [-1, 1]) {
    const target = { row: from.row + direction, col: from.col + colDelta }
    const targetPiece = getPiece(board, target)
    if (targetPiece && targetPiece.color !== color) {
      moves.push(target)
    }
  }

  return moves
}

function getKingMoves(state, from, color) {
  const moves = getBasicPseudoLegalMoves(state.board, from)

  for (const side of ['kingSide', 'queenSide']) {
    const castlingTarget = getCastlingMove(state, from, color, side)
    if (castlingTarget) moves.push(castlingTarget)
  }

  return moves
}

function getJumpMoves(board, from, color, deltas) {
  return deltas
    .map(([rowDelta, colDelta]) => ({ row: from.row + rowDelta, col: from.col + colDelta }))
    .filter(({ row, col }) => isInside(row, col))
    .filter((target) => !getPiece(board, target) || getPiece(board, target).color !== color)
}

function getSlidingMoves(board, from, color, directions) {
  const moves = []

  for (const [rowDelta, colDelta] of directions) {
    let row = from.row + rowDelta
    let col = from.col + colDelta

    while (isInside(row, col)) {
      const targetPiece = getPiece(board, { row, col })
      if (!targetPiece) {
        moves.push({ row, col })
      } else {
        if (targetPiece.color !== color) moves.push({ row, col })
        break
      }

      row += rowDelta
      col += colDelta
    }
  }

  return moves
}

function isSquareAttacked(board, square, attackingColor) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col]
      if (!piece || piece.color !== attackingColor) continue

      const from = { row, col }
      if (piece.type === 'pawn') {
        const direction = attackingColor === 'white' ? -1 : 1
        if (
          square.row === row + direction &&
          (square.col === col - 1 || square.col === col + 1)
        ) {
          return true
        }
        continue
      }

      if (containsCoord(getBasicPseudoLegalMoves(board, from), square)) {
        return true
      }
    }
  }

  return false
}

function findKing(board, color) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col]
      if (piece?.type === 'king' && piece.color === color) return { row, col }
    }
  }
  return null
}

function hasAnyLegalMove(state, color) {
  const candidateState = { ...state, turn: color, status: 'active' }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = candidateState.board[row][col]
      if (piece?.color === color && getLegalMoves(candidateState, { row, col }).length > 0) {
        return true
      }
    }
  }

  return false
}

function isGameComplete(status) {
  return status === 'checkmate' || status === 'stalemate'
}

function createCastlingRights() {
  return {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true },
  }
}

function cloneCastlingRights(castlingRights) {
  if (!castlingRights) {
    return {
      white: { kingSide: false, queenSide: false },
      black: { kingSide: false, queenSide: false },
    }
  }

  return {
    white: { ...castlingRights.white },
    black: { ...castlingRights.black },
  }
}

function getCastlingMove(state, from, color, side) {
  const rights = state.castlingRights?.[color]
  if (!rights?.[side]) return null

  const homeRow = color === 'white' ? 7 : 0
  if (from.row !== homeRow || from.col !== 4) return null
  if (isInCheck(state.board, color)) return null

  const rookCol = side === 'kingSide' ? 7 : 0
  const targetCol = side === 'kingSide' ? 6 : 2
  const transitCol = side === 'kingSide' ? 5 : 3
  const emptyCols = side === 'kingSide' ? [5, 6] : [1, 2, 3]
  const rook = getPiece(state.board, { row: homeRow, col: rookCol })

  if (rook?.type !== 'rook' || rook.color !== color) return null
  if (emptyCols.some((col) => getPiece(state.board, { row: homeRow, col }))) return null
  if (isSquareAttacked(state.board, { row: homeRow, col: transitCol }, opposite(color))) return null
  if (isSquareAttacked(state.board, { row: homeRow, col: targetCol }, opposite(color))) return null

  return { row: homeRow, col: targetCol }
}

function updateCastlingRights(castlingRights, piece, from, capturedPiece, capturedSquare) {
  const nextRights = cloneCastlingRights(castlingRights)

  if (piece.type === 'king') {
    nextRights[piece.color].kingSide = false
    nextRights[piece.color].queenSide = false
  }

  if (piece.type === 'rook') {
    removeRookCastlingRight(nextRights, piece.color, from)
  }

  if (capturedPiece?.type === 'rook' && capturedSquare) {
    removeRookCastlingRight(nextRights, capturedPiece.color, capturedSquare)
  }

  return nextRights
}

function removeRookCastlingRight(castlingRights, color, square) {
  const homeRow = color === 'white' ? 7 : 0
  if (square.row !== homeRow) return

  if (square.col === 0) {
    castlingRights[color].queenSide = false
  } else if (square.col === BOARD_SIZE - 1) {
    castlingRights[color].kingSide = false
  }
}

function getNextEnPassant(piece, from, to) {
  if (piece.type !== 'pawn' || Math.abs(to.row - from.row) !== 2) return null

  return {
    target: { row: (from.row + to.row) / 2, col: from.col },
    pawn: { ...to },
    color: piece.color,
  }
}

function getEnPassantMove(state, from, color) {
  if (!state.enPassant || state.enPassant.color === color) return null

  const direction = color === 'white' ? -1 : 1
  const target = state.enPassant.target
  if (target.row !== from.row + direction || Math.abs(target.col - from.col) !== 1) return null

  const vulnerablePawn = getPiece(state.board, state.enPassant.pawn)
  if (vulnerablePawn?.type !== 'pawn' || vulnerablePawn.color === color) return null

  return { ...target }
}

function isEnPassantMove(state, from, to) {
  const piece = getPiece(state.board, from)
  if (piece?.type !== 'pawn') return false
  if (getPiece(state.board, to)) return false
  return Boolean(getEnPassantMove(state, from, piece.color) && coordsEqual(state.enPassant.target, to))
}

function getCapturedPieceForMove(state, from, to) {
  if (isEnPassantMove(state, from, to)) {
    return getPiece(state.board, { row: from.row, col: to.col })
  }

  return getPiece(state.board, to)
}

function getCapturedSquareForMove(state, from, to) {
  if (isEnPassantMove(state, from, to)) {
    return { row: from.row, col: to.col }
  }

  return to
}

function isCastlingMove(piece, from, to) {
  return piece?.type === 'king' && Math.abs(to.col - from.col) === 2
}

function containsCoord(coords, target) {
  return coords.some(({ row, col }) => row === target.row && col === target.col)
}

function coordsEqual(a, b) {
  return a.row === b.row && a.col === b.col
}

function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

function opposite(color) {
  return color === 'white' ? 'black' : 'white'
}
