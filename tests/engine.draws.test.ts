import { describe, expect, it } from 'vitest';
import { ChessGame, describeResult } from '../src/engine';

describe('draws', () => {
  it('detects threefold repetition after the same position occurs three times', () => {
    const game = new ChessGame();
    const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];

    for (const san of shuffle) game.moveSan(san);
    expect(game.result()).toEqual({ type: 'in-progress' });

    for (const san of shuffle) game.moveSan(san);
    expect(game.result()).toEqual({ type: 'draw', reason: 'threefold-repetition' });
    expect(game.isGameOver()).toBe(true);
  });

  it('detects the fifty-move rule when the half-move clock reaches 100', () => {
    const game = new ChessGame('7R/8/8/3k4/8/8/8/3K4 w - - 99 60');
    expect(game.result()).toEqual({ type: 'in-progress' });

    const move = game.move('h8', 'h7');

    expect(move?.san).toBe('Rh7');
    expect(game.snapshot().halfMoveClock).toBe(100);
    expect(game.result()).toEqual({ type: 'draw', reason: 'fifty-move-rule' });
  });

  it('resets the half-move clock on a pawn move', () => {
    const game = new ChessGame('7R/8/8/3k4/8/8/P7/3K4 w - - 99 60');
    game.move('a2', 'a3');

    expect(game.snapshot().halfMoveClock).toBe(0);
    expect(game.result()).toEqual({ type: 'in-progress' });
  });

  it.each([
    ['king against king', '8/8/8/4k3/8/8/8/4K3 w - - 0 1'],
    ['king and knight against king', '8/8/8/4k3/8/8/8/3NK3 w - - 0 1'],
    ['king and bishop against king', '8/8/8/4k3/8/8/8/3BK3 w - - 0 1'],
  ])('detects insufficient material: %s', (_name, fen) => {
    const game = new ChessGame(fen);
    expect(game.result()).toEqual({ type: 'draw', reason: 'insufficient-material' });
  });

  it('does not call a draw while a mate can still be forced', () => {
    const game = new ChessGame('8/8/8/4k3/8/8/8/3QK3 w - - 0 1');
    expect(game.result()).toEqual({ type: 'in-progress' });
  });

  it('prefers stalemate over insufficient material when both apply', () => {
    const game = new ChessGame('k7/P7/K7/8/8/8/8/8 b - - 0 1');
    expect(game.result()).toEqual({ type: 'draw', reason: 'stalemate' });
  });

  it('describes every draw reason in plain language', () => {
    expect(describeResult({ type: 'draw', reason: 'fifty-move-rule' }, 'w')?.detail).toContain(
      'Fifty moves',
    );
    expect(
      describeResult({ type: 'draw', reason: 'threefold-repetition' }, 'w')?.headline,
    ).toContain('threefold');
    expect(
      describeResult({ type: 'draw', reason: 'insufficient-material' }, 'w')?.headline,
    ).toContain('insufficient material');
    expect(describeResult({ type: 'in-progress' }, 'w')).toBeNull();
  });
});
