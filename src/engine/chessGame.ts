import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { FILES, RANKS, START_FEN, checkFen, parseFen, toSquareId } from './fen';
import { isPromotionPiece, oppositeColor } from './pieces';
import type {
  BoardCell,
  BoardMatrix,
  GameResult,
  GameSnapshot,
  LegalMove,
  MoveRecord,
  PieceColor,
  PieceType,
  PlacedPiece,
  PromotionPiece,
  SquareId,
} from './types';

/**
 * The single seam between the application and chess.js.
 *
 * Nothing outside this file imports chess.js, so move generation, legality,
 * check/mate/draw detection and FEN handling all come from the library and
 * never from hand-written rules.
 */
export class ChessGame {
  private readonly chess: Chess;

  constructor(fen: string = START_FEN) {
    const check = checkFen(fen);
    if (!check.ok) {
      throw new Error(`Cannot start a game from an invalid FEN: ${check.error ?? 'unknown error'}`);
    }
    this.chess = new Chess(fen);
  }

  /**
   * Loads a position without throwing. Returns null when chess.js will not
   * accept the FEN, which lets callers probe a half-finished position.
   */
  static tryFrom(fen: string): ChessGame | null {
    if (!checkFen(fen).ok) return null;
    return new ChessGame(fen);
  }

  /** True when `color` attacks `square`, whoever is to move. */
  isAttackedBy(square: SquareId, color: PieceColor): boolean {
    return this.chess.isAttacked(square, color);
  }

  /** Squares from which `color` attacks `square`. */
  attackersOf(square: SquareId, color: PieceColor): readonly SquareId[] {
    return this.chess.attackers(square, color);
  }

  // ---------------------------------------------------------------- position

  fen(): string {
    return this.chess.fen();
  }

  turn(): PieceColor {
    return this.chess.turn();
  }

  pieceAt(square: SquareId): PlacedPiece | null {
    const piece = this.chess.get(square);
    return piece === undefined ? null : { color: piece.color, type: piece.type };
  }

  /** Row 0 is rank 8; every cell carries its square id. */
  board(): BoardMatrix {
    const raw = this.chess.board();
    const rows: BoardCell[][] = [];

    for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
      const rank = RANKS[7 - rowIndex];
      const rawRow = raw[rowIndex];
      const row: BoardCell[] = [];

      for (let colIndex = 0; colIndex < 8; colIndex += 1) {
        const file = FILES[colIndex];
        if (file === undefined || rank === undefined) continue;
        const entry = rawRow?.[colIndex] ?? null;
        row.push({
          square: entry === null ? toSquareId(file, rank) : entry.square,
          piece: entry === null ? null : { color: entry.color, type: entry.type },
        });
      }
      rows.push(row);
    }

    return rows;
  }

  kingSquare(color: PieceColor): SquareId | null {
    const squares = this.chess.findPiece({ type: 'k', color });
    return squares[0] ?? null;
  }

  // ------------------------------------------------------------ move queries

  legalMoves(): readonly LegalMove[] {
    return this.chess.moves({ verbose: true }).map(toLegalMove);
  }

  legalMovesFrom(square: SquareId): readonly LegalMove[] {
    return this.chess.moves({ verbose: true, square }).map(toLegalMove);
  }

  /** Distinct destination squares reachable from `square`. */
  legalDestinationsFrom(square: SquareId): readonly SquareId[] {
    const seen = new Set<SquareId>();
    for (const move of this.legalMovesFrom(square)) seen.add(move.to);
    return [...seen];
  }

  /** True when every legal move from→to is a promotion, i.e. the UI must ask which piece. */
  needsPromotion(from: SquareId, to: SquareId): boolean {
    const candidates = this.legalMovesFrom(from).filter((move) => move.to === to);
    return candidates.length > 0 && candidates.every((move) => move.promotion !== null);
  }

  isLegal(from: SquareId, to: SquareId, promotion?: PromotionPiece): boolean {
    return this.legalMovesFrom(from).some(
      (move) => move.to === to && (promotion === undefined || move.promotion === promotion),
    );
  }

  // ------------------------------------------------------------- move making

  /**
   * Plays a move. Returns null — never throws — when the move is illegal or
   * when a promotion piece is required but missing.
   */
  move(from: SquareId, to: SquareId, promotion?: PromotionPiece): MoveRecord | null {
    try {
      const played = this.chess.move(
        promotion === undefined ? { from, to } : { from, to, promotion },
      );
      return toMoveRecord(played);
    } catch {
      return null;
    }
  }

  /** Plays a move written in SAN, e.g. 'Nf3' or 'exd6'. Returns null if illegal. */
  moveSan(san: string): MoveRecord | null {
    try {
      return toMoveRecord(this.chess.move(san));
    } catch {
      return null;
    }
  }

  /** Reverts one half-move. Returns the move that was taken back, or null. */
  undo(): MoveRecord | null {
    const undone = this.chess.undo();
    return undone === null ? null : toMoveRecord(undone);
  }

  /** Reverts up to `plies` half-moves; returns the moves taken back, newest first. */
  undoPlies(plies: number): readonly MoveRecord[] {
    const undone: MoveRecord[] = [];
    for (let i = 0; i < plies; i += 1) {
      const move = this.undo();
      if (move === null) break;
      undone.push(move);
    }
    return undone;
  }

  reset(fen: string = START_FEN): void {
    const check = checkFen(fen);
    if (!check.ok) {
      throw new Error(`Cannot reset to an invalid FEN: ${check.error ?? 'unknown error'}`);
    }
    this.chess.load(fen);
  }

  // ----------------------------------------------------------------- results

  history(): readonly MoveRecord[] {
    return this.chess.history({ verbose: true }).map(toMoveRecord);
  }

  isCheck(): boolean {
    return this.chess.isCheck();
  }

  isGameOver(): boolean {
    return this.result().type !== 'in-progress';
  }

  /**
   * Terminal state of the position, checked in the order the rules apply:
   * checkmate, then stalemate, then the three drawing conditions.
   */
  result(): GameResult {
    if (this.chess.isCheckmate()) {
      const loser = this.chess.turn();
      return { type: 'checkmate', winner: oppositeColor(loser), loser };
    }
    if (this.chess.isStalemate()) return { type: 'draw', reason: 'stalemate' };
    if (this.chess.isInsufficientMaterial()) {
      return { type: 'draw', reason: 'insufficient-material' };
    }
    if (this.chess.isThreefoldRepetition()) {
      return { type: 'draw', reason: 'threefold-repetition' };
    }
    if (this.chess.isDrawByFiftyMoves()) return { type: 'draw', reason: 'fifty-move-rule' };
    return { type: 'in-progress' };
  }

  /** One consistent read of the whole position for a single render. */
  snapshot(): GameSnapshot {
    const fen = this.fen();
    const fields = parseFen(fen);
    const history = this.history();
    const turn = this.turn();
    const isCheck = this.isCheck();

    return {
      fen,
      turn,
      board: this.board(),
      history,
      lastMove: history.length === 0 ? null : (history[history.length - 1] ?? null),
      result: this.result(),
      isCheck,
      checkedKingSquare: isCheck ? this.kingSquare(turn) : null,
      legalMoveCount: this.chess.moves().length,
      halfMoveClock: fields?.halfMoveClock ?? 0,
      fullMoveNumber: fields?.fullMoveNumber ?? 1,
    };
  }

  /** Text board, handy when debugging a failing test. */
  ascii(): string {
    return this.chess.ascii();
  }
}

function readPromotion(value: string | undefined): PromotionPiece | null {
  if (value === undefined) return null;
  return isPromotionPiece(value) ? value : null;
}

/**
 * chess.js sets only the en-passant flag on an en-passant move, so its
 * `isCapture()` returns false there. Treat it as the capture it is.
 */
function isCapture(move: Move): boolean {
  return move.isCapture() || move.isEnPassant();
}

function toLegalMove(move: Move): LegalMove {
  return {
    from: move.from,
    to: move.to,
    piece: move.piece as PieceType,
    promotion: readPromotion(move.promotion),
    isCapture: isCapture(move),
    san: move.san,
  };
}

function toMoveRecord(move: Move): MoveRecord {
  return {
    san: move.san,
    from: move.from,
    to: move.to,
    color: move.color,
    piece: move.piece as PieceType,
    captured: move.captured === undefined ? null : (move.captured as PieceType),
    promotion: readPromotion(move.promotion),
    isCapture: isCapture(move),
    isEnPassant: move.isEnPassant(),
    // chess.js 1.4 exposes the two sides separately; `isCastle` is not public.
    isCastle: move.isKingsideCastle() || move.isQueensideCastle(),
    isPromotion: move.isPromotion(),
    fenBefore: move.before,
    fenAfter: move.after,
  };
}
