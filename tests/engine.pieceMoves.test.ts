import { describe, expect, it } from 'vitest';
import { ChessGame, START_FEN } from '../src/engine';
import type { SquareId } from '../src/engine';

function destinations(fen: string, square: SquareId): SquareId[] {
  return [...new ChessGame(fen).legalDestinationsFrom(square)].sort();
}

describe('legal move generation per piece type', () => {
  it('generates one- and two-square pawn advances from the starting rank', () => {
    expect(destinations(START_FEN, 'e2')).toEqual(['e3', 'e4']);
  });

  it('generates pawn captures on both diagonals', () => {
    const fen = 'k7/8/8/8/3p1p2/4P3/8/7K w - - 0 1';
    expect(destinations(fen, 'e3')).toEqual(['d4', 'e4', 'f4']);
  });

  it('gives a blocked pawn no moves', () => {
    const fen = 'k7/8/8/8/8/4p3/4P3/7K w - - 0 1';
    expect(destinations(fen, 'e2')).toEqual([]);
  });

  it('generates eight knight moves from the centre and two from a corner', () => {
    expect(destinations('k7/8/8/8/3N4/8/8/7K w - - 0 1', 'd4')).toEqual([
      'b3',
      'b5',
      'c2',
      'c6',
      'e2',
      'e6',
      'f3',
      'f5',
    ]);
    expect(destinations('k7/8/8/8/8/8/8/N6K w - - 0 1', 'a1')).toEqual(['b3', 'c2']);
  });

  it('generates thirteen bishop moves from d4 on an empty board', () => {
    const moves = destinations('k7/8/8/8/3B4/8/8/7K w - - 0 1', 'd4');
    expect(moves).toHaveLength(13);
    expect(moves).toEqual(expect.arrayContaining(['a1', 'h8', 'a7', 'g1']));
    expect(moves).not.toContain('d5');
  });

  it('generates fourteen rook moves from d4 on an empty board', () => {
    const moves = destinations('k7/8/8/8/3R4/8/8/7K w - - 0 1', 'd4');
    expect(moves).toHaveLength(14);
    expect(moves).toEqual(expect.arrayContaining(['a4', 'h4', 'd1', 'd8']));
    expect(moves).not.toContain('e5');
  });

  it('generates twenty-seven queen moves from d4 on an empty board', () => {
    const moves = destinations('k7/8/8/8/3Q4/8/8/7K w - - 0 1', 'd4');
    expect(moves).toHaveLength(27);
    expect(moves).toEqual(expect.arrayContaining(['d8', 'h4', 'a1', 'h8']));
  });

  it('generates eight king moves from the centre', () => {
    expect(destinations('8/8/8/3K4/8/8/8/7k w - - 0 1', 'd5')).toEqual([
      'c4',
      'c5',
      'c6',
      'd4',
      'd6',
      'e4',
      'e5',
      'e6',
    ]);
  });

  it('offers twenty legal moves in the starting position', () => {
    const game = new ChessGame();
    expect(game.legalMoves()).toHaveLength(20);
    expect(game.snapshot().legalMoveCount).toBe(20);
    expect(game.turn()).toBe('w');
  });

  it('rejects a move that no piece can make', () => {
    const game = new ChessGame();
    expect(game.move('e2', 'e5')).toBeNull();
    expect(game.history()).toHaveLength(0);
    expect(game.fen()).toBe(START_FEN);
  });

  it('reports the board with rank 8 first and square ids attached', () => {
    const board = new ChessGame().board();
    expect(board[0]?.[0]).toEqual({ square: 'a8', piece: { color: 'b', type: 'r' } });
    expect(board[7]?.[4]).toEqual({ square: 'e1', piece: { color: 'w', type: 'k' } });
    expect(board[4]?.[4]).toEqual({ square: 'e4', piece: null });
  });
});
