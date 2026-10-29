import type { Color, PieceSymbol, Square } from 'chess.js';

/** 'w' | 'b' */
export type PieceColor = Color;

/** 'p' | 'n' | 'b' | 'r' | 'q' | 'k' */
export type PieceType = PieceSymbol;

/** 'a1' ... 'h8' — the exact 64-member union from chess.js. */
export type SquareId = Square;

/** The four pieces a pawn may promote to. */
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface PlacedPiece {
  readonly color: PieceColor;
  readonly type: PieceType;
}

/** One board square, always carrying its own id so components never do index maths. */
export interface BoardCell {
  readonly square: SquareId;
  readonly piece: PlacedPiece | null;
}

/** Row 0 is rank 8, column 0 is file a. */
export type BoardMatrix = readonly (readonly BoardCell[])[];

/** A completed move, flattened from the chess.js `Move` object. */
export interface MoveRecord {
  readonly san: string;
  readonly from: SquareId;
  readonly to: SquareId;
  readonly color: PieceColor;
  readonly piece: PieceType;
  readonly captured: PieceType | null;
  readonly promotion: PromotionPiece | null;
  readonly isCapture: boolean;
  readonly isEnPassant: boolean;
  readonly isCastle: boolean;
  readonly isPromotion: boolean;
  readonly fenBefore: string;
  readonly fenAfter: string;
}

/** A move offered by the generator. */
export interface LegalMove {
  readonly from: SquareId;
  readonly to: SquareId;
  readonly piece: PieceType;
  readonly promotion: PromotionPiece | null;
  readonly isCapture: boolean;
  readonly san: string;
}

export type DrawReason =
  | 'stalemate'
  | 'threefold-repetition'
  | 'fifty-move-rule'
  | 'insufficient-material';

export type GameResult =
  | { readonly type: 'in-progress' }
  | { readonly type: 'checkmate'; readonly winner: PieceColor; readonly loser: PieceColor }
  | { readonly type: 'draw'; readonly reason: DrawReason };

/** Everything the UI needs for one render, derived from the engine in a single pass. */
export interface GameSnapshot {
  readonly fen: string;
  readonly turn: PieceColor;
  readonly board: BoardMatrix;
  readonly history: readonly MoveRecord[];
  readonly lastMove: MoveRecord | null;
  readonly result: GameResult;
  readonly isCheck: boolean;
  readonly checkedKingSquare: SquareId | null;
  readonly legalMoveCount: number;
  readonly halfMoveClock: number;
  readonly fullMoveNumber: number;
}
