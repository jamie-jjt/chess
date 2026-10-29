import { describe, expect, it } from 'vitest';
import { ChessGame } from '../src/engine';

describe('checkmate detection', () => {
  it("detects Fool's mate played as SAN", () => {
    const game = new ChessGame();
    for (const san of ['f3', 'e5', 'g4', 'Qh4']) {
      expect(game.moveSan(san)).not.toBeNull();
    }

    expect(game.result()).toEqual({ type: 'checkmate', winner: 'b', loser: 'w' });
    expect(game.isGameOver()).toBe(true);
    expect(game.isCheck()).toBe(true);
    expect(game.legalMoves()).toHaveLength(0);
    expect(game.history().at(-1)?.san).toBe('Qh4#');
  });

  it('detects a back-rank mate and names the winner', () => {
    const game = new ChessGame('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    const move = game.move('a1', 'a8');

    expect(move?.san).toBe('Ra8#');
    expect(game.result()).toEqual({ type: 'checkmate', winner: 'w', loser: 'b' });
    expect(game.snapshot().checkedKingSquare).toBe('g8');
  });

  it('does not report a draw when the position is checkmate', () => {
    const game = new ChessGame('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    game.move('a1', 'a8');
    expect(game.result().type).not.toBe('draw');
  });

  it('refuses further moves once the game is over', () => {
    const game = new ChessGame('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    game.move('a1', 'a8');
    expect(game.move('g8', 'h8')).toBeNull();
  });
});
