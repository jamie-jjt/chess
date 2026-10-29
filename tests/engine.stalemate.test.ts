import { describe, expect, it } from 'vitest';
import { ChessGame, describeResult } from '../src/engine';

describe('stalemate detection', () => {
  it('detects the queen-and-king stalemate', () => {
    const game = new ChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');

    expect(game.result()).toEqual({ type: 'draw', reason: 'stalemate' });
    expect(game.isCheck()).toBe(false);
    expect(game.legalMoves()).toHaveLength(0);
    expect(game.isGameOver()).toBe(true);
  });

  it('detects the blocked-pawn stalemate in the corner', () => {
    const game = new ChessGame('k7/P7/K7/8/8/8/8/8 b - - 0 1');
    expect(game.result()).toEqual({ type: 'draw', reason: 'stalemate' });
  });

  it('describes stalemate as a draw for the side with no move', () => {
    const game = new ChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    const snapshot = game.snapshot();
    const described = describeResult(snapshot.result, snapshot.turn);

    expect(described?.headline).toBe('Draw — stalemate');
    expect(described?.detail).toContain('Black');
  });

  it('is not stalemate while a legal move exists', () => {
    // The queen on f5 leaves g7 and g8 free.
    const game = new ChessGame('7k/8/8/5Q2/8/8/8/K7 b - - 0 1');
    expect(game.result()).toEqual({ type: 'in-progress' });
    expect(game.legalMoves().length).toBeGreaterThan(0);
  });
});
