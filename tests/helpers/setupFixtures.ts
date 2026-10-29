import { setupFromFen } from '../../src/engine';
import type { SetupPosition } from '../../src/engine';

/** Builds an editable position from a FEN, failing loudly on a typo in a fixture. */
export function position(fen: string, strictBishops = false): SetupPosition {
  const loaded = setupFromFen(fen, strictBishops);
  if (!loaded.ok) throw new Error(`Bad fixture FEN "${fen}": ${loaded.error}`);
  return loaded.position;
}

export const FIXTURES = {
  /** Bare kings, far apart. Valid for every rule. */
  bareKings: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
  standard: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  emptyBoard: '8/8/8/8/8/8/8/8 w - - 0 1',
  /** Kings side by side on d5 and e5. */
  adjacentKings: '8/8/8/3kK3/8/8/8/8 w - - 0 1',
  /** Kings touching on a diagonal, d5 and e4. */
  diagonalKings: '8/8/8/3k4/4K3/8/8/8 w - - 0 1',
  /** White rook on e2 attacks the black king on e8. */
  blackInCheck: '4k3/8/8/8/8/8/4R3/4K3',
  /** Nine white pawns: eight on rank 2 plus one on a3. */
  ninePawns: '4k3/8/8/8/8/P7/PPPPPPPP/4K3 w - - 0 1',
  eightPawns: '4k3/8/8/8/8/8/PPPPPPPP/4K3 w - - 0 1',
  /** Seventeen white pieces: sixteen knights plus the king, none able to reach e8. */
  seventeenPieces: '4k3/8/8/8/8/N7/NNNNNNNN/NNNNKNNN w - - 0 1',
  /** Sixteen white pieces: fifteen knights plus the king. */
  sixteenPieces: '4k3/8/8/8/8/8/NNNNNNNN/NNNNKNNN w - - 0 1',
  /** Nine white queens — legal after promotions, since only the total is capped. */
  nineQueens: '4k3/8/8/8/8/QQQ5/QQQ5/QQQ1K3 w - - 0 1',
  pawnOnRankEight: 'P3k3/8/8/8/8/8/8/4K3 w - - 0 1',
  pawnOnRankOne: '4k3/8/8/8/8/8/8/P3K3 w - - 0 1',
  /** Both rooks and both kings at home, so all four rights are possible. */
  castlingReady: 'r3k2r/8/8/8/8/8/8/R3K2R',
  /** White king on d1, so neither white right is possible. */
  whiteKingMoved: 'r3k2r/8/8/8/8/8/8/R2K3R',
  /** Black pawn has just pushed d7-d5, so d6 is the target and White is to move. */
  enPassantWhite: '8/8/8/3pP3/8/8/8/K6k w - d6 0 1',
  /** White pawn has just pushed d2-d4, so d3 is the target and Black is to move. */
  enPassantBlack: '8/8/8/8/3Pp3/8/8/K6k b - d3 0 1',
  /** Two white bishops on dark squares (c1, e3) — legal only after a promotion. */
  twoDarkBishops: '4k3/8/8/8/8/4B3/8/2B1K3 w - - 0 1',
  /** Three white bishops: c1 and e3 dark, f1 light. One of them was promoted. */
  promotedBishop: '4k3/8/8/8/8/4B3/8/2B1KB2 w - - 0 1',
  /** One bishop per square colour: c1 dark, f1 light. */
  bishopPair: '4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1',
} as const;
