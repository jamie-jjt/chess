import { validateFen } from 'chess.js';
import type { PieceColor, SquareId } from './types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type FileLetter = (typeof FILES)[number];
export type RankNumber = (typeof RANKS)[number];

export function toSquareId(file: FileLetter, rank: RankNumber): SquareId {
  return `${file}${rank}`;
}

/** All 64 squares, a1 first, h8 last. */
export const ALL_SQUARES: readonly SquareId[] = RANKS.flatMap((rank) =>
  FILES.map((file) => toSquareId(file, rank)),
);

const SQUARE_SET: ReadonlySet<string> = new Set<string>(ALL_SQUARES);

export function isSquareId(value: string): value is SquareId {
  return SQUARE_SET.has(value);
}

/** 0 for the a-file, 7 for the h-file. */
export function fileIndexOf(square: SquareId): number {
  return square.charCodeAt(0) - 'a'.charCodeAt(0);
}

/** 1 to 8. */
export function rankOf(square: SquareId): number {
  return Number(square[1]);
}

/** True when the two squares touch, including diagonally. A square is not adjacent to itself. */
export function areAdjacent(a: SquareId, b: SquareId): boolean {
  if (a === b) return false;
  const fileGap = Math.abs(fileIndexOf(a) - fileIndexOf(b));
  const rankGap = Math.abs(rankOf(a) - rankOf(b));
  return fileGap <= 1 && rankGap <= 1;
}

/** 'light' | 'dark' — a1 is dark. */
export function squareShade(square: SquareId): 'light' | 'dark' {
  return (fileIndexOf(square) + rankOf(square)) % 2 === 0 ? 'light' : 'dark';
}

export interface FenFields {
  readonly placement: string;
  readonly sideToMove: PieceColor;
  readonly castling: string;
  readonly enPassant: SquareId | null;
  readonly halfMoveClock: number;
  readonly fullMoveNumber: number;
}

export interface FenCheck {
  readonly ok: boolean;
  readonly error: string | null;
}

/** Thin pass-through to the chess.js validator, normalised to a non-optional shape. */
export function checkFen(fen: string): FenCheck {
  const result = validateFen(fen);
  return { ok: result.ok, error: result.ok ? null : (result.error ?? 'Invalid FEN.') };
}

export function isValidFen(fen: string): boolean {
  return checkFen(fen).ok;
}

/** Splits a FEN into its six fields. Returns null when the FEN is not valid. */
export function parseFen(fen: string): FenFields | null {
  if (!isValidFen(fen)) return null;

  const parts = fen.trim().split(/\s+/);
  const placement = parts[0];
  const sideToMove = parts[1];
  const castling = parts[2];
  const enPassant = parts[3];
  if (
    placement === undefined ||
    sideToMove === undefined ||
    castling === undefined ||
    enPassant === undefined
  ) {
    return null;
  }

  return {
    placement,
    sideToMove: sideToMove === 'b' ? 'b' : 'w',
    castling,
    enPassant: enPassant === '-' ? null : (enPassant as SquareId),
    halfMoveClock: Number(parts[4] ?? 0),
    fullMoveNumber: Number(parts[5] ?? 1),
  };
}
