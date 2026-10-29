import { describe, expect, it } from 'vitest';
import {
  ChessGame,
  EMPTY_FEN,
  START_FEN,
  checkFen,
  isValidFen,
  parseFen,
  squareShade,
  toSquareId,
} from '../src/engine';

describe('FEN handling', () => {
  it('accepts the standard starting position', () => {
    expect(isValidFen(START_FEN)).toBe(true);
    expect(checkFen(START_FEN).error).toBeNull();
  });

  it('rejects malformed input with a message', () => {
    const result = checkFen('not a fen');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(parseFen('not a fen')).toBeNull();
  });

  it('splits the six FEN fields', () => {
    expect(parseFen(START_FEN)).toEqual({
      placement: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      sideToMove: 'w',
      castling: 'KQkq',
      enPassant: null,
      halfMoveClock: 0,
      fullMoveNumber: 1,
    });
  });

  it('reads the side to move and the clocks', () => {
    const fields = parseFen('8/8/8/3p4/4P3/8/8/K6k b - - 7 42');
    expect(fields?.sideToMove).toBe('b');
    expect(fields?.castling).toBe('-');
    expect(fields?.enPassant).toBeNull();
    expect(fields?.halfMoveClock).toBe(7);
    expect(fields?.fullMoveNumber).toBe(42);
  });

  it('reads the en passant square', () => {
    expect(parseFen('8/8/8/3pP3/8/8/8/K6k w - d6 0 1')?.enPassant).toBe('d6');
  });

  it('round-trips a position through the engine', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    expect(new ChessGame(fen).fen()).toBe(fen);
  });

  it('refuses to construct a game from an invalid FEN', () => {
    expect(() => new ChessGame('rubbish')).toThrow(/invalid FEN/i);
    expect(() => new ChessGame().reset('rubbish')).toThrow(/invalid FEN/i);
  });

  it('rejects a board with no kings, including the empty-board FEN', () => {
    // Stage 3's "Clear board" starts from EMPTY_FEN, which is why the setup
    // editor cannot hand it straight to the engine.
    expect(isValidFen(EMPTY_FEN)).toBe(false);
    expect(checkFen(EMPTY_FEN).error).toMatch(/king/i);
    expect(() => new ChessGame(EMPTY_FEN)).toThrow(/invalid FEN/i);
  });

  it('shades the board with a1 dark and h1 light', () => {
    expect(squareShade('a1')).toBe('dark');
    expect(squareShade('h1')).toBe('light');
    expect(squareShade('a8')).toBe('light');
    expect(squareShade('e4')).toBe('light');
    expect(squareShade('d4')).toBe('dark');
  });

  it('builds square ids from a file and a rank', () => {
    expect(toSquareId('a', 1)).toBe('a1');
    expect(toSquareId('h', 8)).toBe('h8');
  });

  it('restarts from the position it was created with', () => {
    const game = new ChessGame();
    game.moveSan('e4');
    game.reset();
    expect(game.fen()).toBe(START_FEN);
    expect(game.history()).toHaveLength(0);
  });
});
