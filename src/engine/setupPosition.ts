import { FILES, RANKS, isSquareId, toSquareId } from './fen';
import type { FileLetter, RankNumber } from './fen';
import type { PieceColor, PieceType, PlacedPiece, SquareId } from './types';

export interface CastlingRights {
  readonly whiteKingSide: boolean;
  readonly whiteQueenSide: boolean;
  readonly blackKingSide: boolean;
  readonly blackQueenSide: boolean;
}

export type CastlingFlag = keyof CastlingRights;

export const CASTLING_FLAGS: readonly CastlingFlag[] = [
  'whiteKingSide',
  'whiteQueenSide',
  'blackKingSide',
  'blackQueenSide',
];

export const NO_CASTLING: CastlingRights = {
  whiteKingSide: false,
  whiteQueenSide: false,
  blackKingSide: false,
  blackQueenSide: false,
};

export const ALL_CASTLING: CastlingRights = {
  whiteKingSide: true,
  whiteQueenSide: true,
  blackKingSide: true,
  blackQueenSide: true,
};

export type PiecePlacement = ReadonlyMap<SquareId, PlacedPiece>;

/**
 * A position being edited.
 *
 * Deliberately not a `ChessGame`: a board with no kings is a perfectly normal
 * state halfway through building a position, but chess.js refuses to load it.
 * This model therefore holds anything the editor can express, and the validator
 * decides whether it is playable.
 */
export interface SetupPosition {
  readonly pieces: PiecePlacement;
  readonly sideToMove: PieceColor;
  readonly castling: CastlingRights;
  readonly enPassant: SquareId | null;
  /** Half-moves since the last capture or pawn move; 100 is a draw. */
  readonly halfMoveClock: number;
  readonly fullMoveNumber: number;
  /** Editor-only switch; it has no FEN field and no effect on play. */
  readonly strictBishops: boolean;
}

export const EMPTY_SETUP: SetupPosition = {
  pieces: new Map(),
  sideToMove: 'w',
  castling: NO_CASTLING,
  enPassant: null,
  halfMoveClock: 0,
  fullMoveNumber: 1,
  strictBishops: false,
};

const PIECE_TO_CHAR: Record<PieceType, string> = {
  p: 'p',
  n: 'n',
  b: 'b',
  r: 'r',
  q: 'q',
  k: 'k',
};

const CHAR_TO_PIECE = new Map<string, PlacedPiece>();
for (const [type, char] of Object.entries(PIECE_TO_CHAR) as [PieceType, string][]) {
  CHAR_TO_PIECE.set(char, { color: 'b', type });
  CHAR_TO_PIECE.set(char.toUpperCase(), { color: 'w', type });
}

export function pieceToChar(piece: PlacedPiece): string {
  const char = PIECE_TO_CHAR[piece.type];
  return piece.color === 'w' ? char.toUpperCase() : char;
}

export function charToPiece(char: string): PlacedPiece | null {
  return CHAR_TO_PIECE.get(char) ?? null;
}

// ------------------------------------------------------------------ queries

export interface PlacedEntry {
  readonly square: SquareId;
  readonly piece: PlacedPiece;
}

export function entriesOf(position: SetupPosition): readonly PlacedEntry[] {
  return [...position.pieces].map(([square, piece]) => ({ square, piece }));
}

export function entriesOfColor(
  position: SetupPosition,
  color: PieceColor,
): readonly PlacedEntry[] {
  return entriesOf(position).filter((entry) => entry.piece.color === color);
}

export function squaresOf(
  position: SetupPosition,
  color: PieceColor,
  type: PieceType,
): readonly SquareId[] {
  return entriesOf(position)
    .filter((entry) => entry.piece.color === color && entry.piece.type === type)
    .map((entry) => entry.square);
}

export function countOf(position: SetupPosition, color: PieceColor, type: PieceType): number {
  return squaresOf(position, color, type).length;
}

export function totalPieces(position: SetupPosition, color: PieceColor): number {
  return entriesOfColor(position, color).length;
}

/** The square a king of this colour stands on, or null when there is not exactly one. */
export function kingSquare(position: SetupPosition, color: PieceColor): SquareId | null {
  const kings = squaresOf(position, color, 'k');
  return kings.length === 1 ? (kings[0] ?? null) : null;
}

// ------------------------------------------------------------------ mutation

function withPieces(position: SetupPosition, pieces: PiecePlacement): SetupPosition {
  return { ...position, pieces };
}

export function placePiece(
  position: SetupPosition,
  square: SquareId,
  piece: PlacedPiece,
): SetupPosition {
  const pieces = new Map(position.pieces);
  pieces.set(square, piece);
  return withPieces(position, pieces);
}

export function removePiece(position: SetupPosition, square: SquareId): SetupPosition {
  if (!position.pieces.has(square)) return position;
  const pieces = new Map(position.pieces);
  pieces.delete(square);
  return withPieces(position, pieces);
}

/** Moves a piece, overwriting whatever stood on the destination. */
export function movePiece(
  position: SetupPosition,
  from: SquareId,
  to: SquareId,
): SetupPosition {
  const piece = position.pieces.get(from);
  if (piece === undefined || from === to) return position;
  const pieces = new Map(position.pieces);
  pieces.delete(from);
  pieces.set(to, piece);
  return withPieces(position, pieces);
}

// ----------------------------------------------------------------- FEN output

export function castlingToFen(rights: CastlingRights): string {
  const text =
    (rights.whiteKingSide ? 'K' : '') +
    (rights.whiteQueenSide ? 'Q' : '') +
    (rights.blackKingSide ? 'k' : '') +
    (rights.blackQueenSide ? 'q' : '');
  return text === '' ? '-' : text;
}

export function placementToFen(pieces: PiecePlacement): string {
  const rows: string[] = [];

  for (let rankIndex = RANKS.length - 1; rankIndex >= 0; rankIndex -= 1) {
    const rank = RANKS[rankIndex];
    if (rank === undefined) continue;

    let row = '';
    let gap = 0;

    for (const file of FILES) {
      const piece = pieces.get(toSquareId(file, rank));
      if (piece === undefined) {
        gap += 1;
        continue;
      }
      if (gap > 0) {
        row += String(gap);
        gap = 0;
      }
      row += pieceToChar(piece);
    }

    if (gap > 0) row += String(gap);
    rows.push(row);
  }

  return rows.join('/');
}

export function setupToFen(position: SetupPosition): string {
  return [
    placementToFen(position.pieces),
    position.sideToMove,
    castlingToFen(position.castling),
    position.enPassant ?? '-',
    String(position.halfMoveClock),
    String(position.fullMoveNumber),
  ].join(' ');
}

// ------------------------------------------------------------------ FEN input

export type SetupFromFen =
  | { readonly ok: true; readonly position: SetupPosition }
  | { readonly ok: false; readonly error: string };

/**
 * Reads a FEN into an editable position, checking only that it is *readable*.
 *
 * Anything structurally sound is accepted even when it is not playable — a
 * kingless board loads fine and the validator then explains what is wrong,
 * which is far more useful than refusing the paste outright.
 */
export function setupFromFen(text: string, strictBishops = false): SetupFromFen {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'Paste a FEN first.' };

  const fields = trimmed.split(/\s+/);
  if (fields.length < 2) {
    return {
      ok: false,
      error: 'A FEN needs at least a board layout and a side to move, separated by a space.',
    };
  }

  const [
    placement,
    side,
    castlingField = '-',
    enPassantField = '-',
    halfMoveField = '0',
    fullMoveField = '1',
  ] = fields;
  if (placement === undefined || side === undefined) {
    return { ok: false, error: 'That FEN is missing some fields.' };
  }

  const pieces = parsePlacement(placement);
  if (!pieces.ok) return { ok: false, error: pieces.error };

  if (side !== 'w' && side !== 'b') {
    return { ok: false, error: `The side to move must be "w" or "b", not "${side}".` };
  }

  const castling = parseCastling(castlingField);
  if (!castling.ok) return { ok: false, error: castling.error };

  if (enPassantField !== '-' && !isSquareId(enPassantField)) {
    return {
      ok: false,
      error: `"${enPassantField}" is not a square, so it cannot be the en passant target.`,
    };
  }

  const halfMoveClock = parseCount(halfMoveField, 0, 'half-move clock');
  if (!halfMoveClock.ok) return { ok: false, error: halfMoveClock.error };

  const fullMoveNumber = parseCount(fullMoveField, 1, 'move number');
  if (!fullMoveNumber.ok) return { ok: false, error: fullMoveNumber.error };

  return {
    ok: true,
    position: {
      pieces: pieces.value,
      sideToMove: side,
      castling: castling.value,
      enPassant: enPassantField === '-' ? null : enPassantField,
      halfMoveClock: halfMoveClock.value,
      fullMoveNumber: fullMoveNumber.value,
      strictBishops,
    },
  };
}

function parseCount(field: string, minimum: number, label: string): Parsed<number> {
  if (!/^\d+$/.test(field)) {
    return { ok: false, error: `The ${label} must be a whole number, not "${field}".` };
  }
  const value = Number(field);
  if (value < minimum) {
    return { ok: false, error: `The ${label} cannot be below ${String(minimum)}.` };
  }
  return { ok: true, value };
}

type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

function parsePlacement(placement: string): Parsed<PiecePlacement> {
  const rows = placement.split('/');
  if (rows.length !== 8) {
    return {
      ok: false,
      error: `The board layout needs 8 rows separated by "/", but this one has ${String(rows.length)}.`,
    };
  }

  const pieces = new Map<SquareId, PlacedPiece>();

  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    const row = rows[rowIndex];
    const rank = RANKS[7 - rowIndex];
    if (row === undefined || rank === undefined) continue;

    let fileIndex = 0;

    for (const char of row) {
      if (char >= '1' && char <= '8') {
        fileIndex += Number(char);
        continue;
      }

      const piece = charToPiece(char);
      if (piece === null) {
        return { ok: false, error: `"${char}" is not a piece letter the board understands.` };
      }

      const file: FileLetter | undefined = FILES[fileIndex];
      if (file === undefined) {
        return { ok: false, error: `Row ${String(rank)} of the board describes more than 8 squares.` };
      }

      pieces.set(toSquareId(file, rank as RankNumber), piece);
      fileIndex += 1;
    }

    if (fileIndex !== 8) {
      return {
        ok: false,
        error: `Row ${String(rank)} of the board describes ${String(fileIndex)} squares instead of 8.`,
      };
    }
  }

  return { ok: true, value: pieces };
}

function parseCastling(field: string): Parsed<CastlingRights> {
  if (field === '-' || field === '') return { ok: true, value: NO_CASTLING };

  const seen = new Set<string>();
  for (const char of field) {
    if (!'KQkq'.includes(char)) {
      return { ok: false, error: `"${char}" is not a castling right; use K, Q, k, q or "-".` };
    }
    if (seen.has(char)) {
      return { ok: false, error: `The castling rights repeat "${char}".` };
    }
    seen.add(char);
  }

  return {
    ok: true,
    value: {
      whiteKingSide: seen.has('K'),
      whiteQueenSide: seen.has('Q'),
      blackKingSide: seen.has('k'),
      blackQueenSide: seen.has('q'),
    },
  };
}

/** The standard opening position, as an editable setup. */
export function standardSetup(): SetupPosition {
  const loaded = setupFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  if (!loaded.ok) throw new Error('The standard starting position failed to load.');
  return loaded.position;
}
