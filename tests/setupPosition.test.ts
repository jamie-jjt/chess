import { describe, expect, it } from 'vitest';
import {
  ALL_CASTLING,
  EMPTY_SETUP,
  NO_CASTLING,
  START_FEN,
  areAdjacent,
  castlingToFen,
  charToPiece,
  countOf,
  kingSquare,
  movePiece,
  pieceToChar,
  placePiece,
  removePiece,
  setupFromFen,
  setupToFen,
  standardSetup,
  totalPieces,
} from '../src/engine';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('square geometry', () => {
  it('knows which squares touch', () => {
    expect(areAdjacent('d4', 'e5')).toBe(true);
    expect(areAdjacent('d4', 'd5')).toBe(true);
    expect(areAdjacent('d4', 'c3')).toBe(true);
    expect(areAdjacent('d4', 'd6')).toBe(false);
    expect(areAdjacent('a1', 'h8')).toBe(false);
  });

  it('does not count a square as adjacent to itself', () => {
    expect(areAdjacent('d4', 'd4')).toBe(false);
  });
});

describe('piece letters', () => {
  it('writes white in upper case and black in lower case', () => {
    expect(pieceToChar({ color: 'w', type: 'n' })).toBe('N');
    expect(pieceToChar({ color: 'b', type: 'n' })).toBe('n');
    expect(pieceToChar({ color: 'w', type: 'p' })).toBe('P');
  });

  it('reads letters back', () => {
    expect(charToPiece('K')).toEqual({ color: 'w', type: 'k' });
    expect(charToPiece('q')).toEqual({ color: 'b', type: 'q' });
    expect(charToPiece('x')).toBeNull();
    expect(charToPiece('9')).toBeNull();
  });
});

describe('editing a position', () => {
  it('starts empty', () => {
    expect(EMPTY_SETUP.pieces.size).toBe(0);
    expect(EMPTY_SETUP.sideToMove).toBe('w');
    expect(EMPTY_SETUP.enPassant).toBeNull();
    expect(EMPTY_SETUP.castling).toEqual(NO_CASTLING);
  });

  it('places a piece without touching the original', () => {
    const next = placePiece(EMPTY_SETUP, 'e4', { color: 'w', type: 'q' });

    expect(next.pieces.get('e4')).toEqual({ color: 'w', type: 'q' });
    expect(EMPTY_SETUP.pieces.size).toBe(0);
  });

  it('overwrites whatever stood on the square', () => {
    const first = placePiece(EMPTY_SETUP, 'e4', { color: 'w', type: 'q' });
    const second = placePiece(first, 'e4', { color: 'b', type: 'n' });

    expect(second.pieces.get('e4')).toEqual({ color: 'b', type: 'n' });
    expect(second.pieces.size).toBe(1);
  });

  it('removes a piece, and does nothing on an empty square', () => {
    const placed = placePiece(EMPTY_SETUP, 'e4', { color: 'w', type: 'q' });

    expect(removePiece(placed, 'e4').pieces.size).toBe(0);
    expect(removePiece(placed, 'a1')).toBe(placed);
  });

  it('moves a piece and overwrites the destination', () => {
    const start = placePiece(
      placePiece(EMPTY_SETUP, 'e4', { color: 'w', type: 'q' }),
      'e5',
      { color: 'b', type: 'p' },
    );
    const moved = movePiece(start, 'e4', 'e5');

    expect(moved.pieces.get('e5')).toEqual({ color: 'w', type: 'q' });
    expect(moved.pieces.has('e4')).toBe(false);
    expect(moved.pieces.size).toBe(1);
  });

  it('ignores a move from an empty square or onto itself', () => {
    const placed = placePiece(EMPTY_SETUP, 'e4', { color: 'w', type: 'q' });

    expect(movePiece(placed, 'a1', 'a2')).toBe(placed);
    expect(movePiece(placed, 'e4', 'e4')).toBe(placed);
  });
});

describe('counting', () => {
  it('counts a type for one colour', () => {
    const standard = position(FIXTURES.standard);

    expect(countOf(standard, 'w', 'p')).toBe(8);
    expect(countOf(standard, 'b', 'r')).toBe(2);
    expect(countOf(standard, 'w', 'k')).toBe(1);
    expect(countOf(standard, 'w', 'q')).toBe(1);
  });

  it('counts a whole army', () => {
    const standard = position(FIXTURES.standard);
    expect(totalPieces(standard, 'w')).toBe(16);
    expect(totalPieces(standard, 'b')).toBe(16);
  });

  it('finds the king only when there is exactly one', () => {
    expect(kingSquare(position(FIXTURES.standard), 'w')).toBe('e1');
    expect(kingSquare(position(FIXTURES.emptyBoard), 'w')).toBeNull();
    expect(kingSquare(position('4k3/8/8/8/8/8/8/K3K3 w - - 0 1'), 'w')).toBeNull();
  });
});

describe('writing FEN', () => {
  it('round-trips the standard position', () => {
    expect(setupToFen(standardSetup())).toBe(START_FEN);
  });

  it('writes an empty board', () => {
    expect(setupToFen(EMPTY_SETUP)).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
  });

  it('writes castling rights in KQkq order', () => {
    expect(castlingToFen(ALL_CASTLING)).toBe('KQkq');
    expect(castlingToFen(NO_CASTLING)).toBe('-');
    expect(castlingToFen({ ...NO_CASTLING, whiteQueenSide: true, blackKingSide: true })).toBe('Qk');
  });

  it('writes the clocks it was given', () => {
    expect(setupToFen(position(FIXTURES.enPassantWhite))).toMatch(/ 0 1$/);
    expect(setupToFen(position('4k3/8/8/8/8/8/8/4K3 b - - 99 60'))).toMatch(/ 99 60$/);
  });

  it('round-trips every fixture', () => {
    for (const fen of Object.values(FIXTURES)) {
      const full = fen.includes(' w ') || fen.includes(' b ') ? fen : `${fen} w - - 0 1`;
      expect(setupToFen(position(full))).toBe(full);
    }
  });
});

describe('reading FEN', () => {
  it('accepts a position chess.js would refuse, so the validator can explain it', () => {
    const loaded = setupFromFen('8/8/8/8/8/8/8/8 w - - 0 1');

    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.position.pieces.size).toBe(0);
  });

  it('reads the side to move, castling rights and en passant square', () => {
    const loaded = setupFromFen('r3k2r/8/8/3pP3/8/8/8/R3K2R b Kq d6 0 1');

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.position.sideToMove).toBe('b');
    expect(loaded.position.castling).toEqual({
      whiteKingSide: true,
      whiteQueenSide: false,
      blackKingSide: false,
      blackQueenSide: true,
    });
    expect(loaded.position.enPassant).toBe('d6');
  });

  it('accepts a FEN with the clocks left off', () => {
    const loaded = setupFromFen('4k3/8/8/8/8/8/8/4K3 w - -');
    expect(loaded.ok).toBe(true);
  });

  it('accepts a FEN with only a layout and a side to move', () => {
    const loaded = setupFromFen('4k3/8/8/8/8/8/8/4K3 w');
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.position.castling).toEqual(NO_CASTLING);
  });

  it('carries the strict-bishops flag through', () => {
    const loaded = setupFromFen(FIXTURES.standard, true);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.position.strictBishops).toBe(true);
  });

  it.each([
    ['empty input', '', /Paste a FEN/],
    ['one field only', 'rnbqkbnr', /at least a board layout and a side to move/],
    ['seven rows', '8/8/8/8/8/8/8 w - - 0 1', /8 rows/],
    ['nine rows', '8/8/8/8/8/8/8/8/8 w - - 0 1', /8 rows/],
    ['unknown letter', '4k3/8/8/8/8/8/8/4X3 w - - 0 1', /not a piece letter/],
    ['short row', '4k3/8/8/8/8/8/8/4K2 w - - 0 1', /7 squares instead of 8/],
    ['long row', '4k3/8/8/8/8/8/8/4K42 w - - 0 1', /more than 8 squares|squares instead of 8/],
    ['bad side', '4k3/8/8/8/8/8/8/4K3 x - - 0 1', /must be "w" or "b"/],
    ['bad castling letter', '4k3/8/8/8/8/8/8/4K3 w Kx - 0 1', /not a castling right/],
    ['repeated castling letter', '4k3/8/8/8/8/8/8/4K3 w KK - 0 1', /repeat/],
    ['bad en passant square', '4k3/8/8/8/8/8/8/4K3 w - z9 0 1', /not a square/],
  ])('rejects %s', (_name, fen: string, pattern: RegExp) => {
    const loaded = setupFromFen(fen);

    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toMatch(pattern);
  });
});
