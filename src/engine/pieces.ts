import type { PieceColor, PieceType, PromotionPiece } from './types';

export const PROMOTION_PIECES: readonly PromotionPiece[] = ['q', 'r', 'b', 'n'];

const PIECE_LABELS: Record<PieceType, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const COLOR_LABELS: Record<PieceColor, string> = {
  w: 'White',
  b: 'Black',
};

export function oppositeColor(color: PieceColor): PieceColor {
  return color === 'w' ? 'b' : 'w';
}

export function pieceLabel(type: PieceType): string {
  return PIECE_LABELS[type];
}

export function colorLabel(color: PieceColor): string {
  return COLOR_LABELS[color];
}

export function isPromotionPiece(value: string): value is PromotionPiece {
  return value === 'q' || value === 'r' || value === 'b' || value === 'n';
}
