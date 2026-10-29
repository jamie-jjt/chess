import { describe, expect, it } from 'vitest';
import { ChessGame } from '../src/engine';
import type { PromotionPiece } from '../src/engine';

// The black king sits off the a8-h1 diagonal and off rank 8 and file a, so no
// promotion piece gives check and the SAN carries no '+'.
const PAWN_ON_SEVENTH = '8/P7/8/7k/8/8/8/K7 w - - 0 1';
const PROMOTION_CAPTURE = '1n6/P7/8/7k/8/8/8/K7 w - - 0 1';

describe('promotion', () => {
  it('reports that a push to the last rank needs a promotion piece', () => {
    const game = new ChessGame(PAWN_ON_SEVENTH);
    expect(game.needsPromotion('a7', 'a8')).toBe(true);
  });

  it('reports that an ordinary move does not need a promotion piece', () => {
    const game = new ChessGame();
    expect(game.needsPromotion('e2', 'e4')).toBe(false);
  });

  it('offers all four promotion pieces for the same destination', () => {
    const game = new ChessGame(PAWN_ON_SEVENTH);
    const promotions = game
      .legalMovesFrom('a7')
      .filter((move) => move.to === 'a8')
      .map((move) => move.promotion);

    expect(promotions.sort()).toEqual(['b', 'n', 'q', 'r']);
  });

  it('refuses the move when no promotion piece is supplied', () => {
    const game = new ChessGame(PAWN_ON_SEVENTH);
    expect(game.move('a7', 'a8')).toBeNull();
    expect(game.history()).toHaveLength(0);
  });

  it.each<[PromotionPiece, string]>([
    ['q', 'a8=Q'],
    ['r', 'a8=R'],
    ['b', 'a8=B'],
    ['n', 'a8=N'],
  ])('promotes to %s and writes %s in SAN', (piece, san) => {
    const game = new ChessGame(PAWN_ON_SEVENTH);
    const move = game.move('a7', 'a8', piece);

    expect(move?.san).toBe(san);
    expect(move?.isPromotion).toBe(true);
    expect(move?.promotion).toBe(piece);
    expect(game.pieceAt('a8')).toEqual({ color: 'w', type: piece });
    expect(game.pieceAt('a7')).toBeNull();
  });

  it('promotes while capturing', () => {
    const game = new ChessGame(PROMOTION_CAPTURE);
    const move = game.move('a7', 'b8', 'q');

    expect(move?.san).toBe('axb8=Q');
    expect(move?.isCapture).toBe(true);
    expect(move?.captured).toBe('n');
    expect(game.pieceAt('b8')).toEqual({ color: 'w', type: 'q' });
  });

  it('takes a promotion back cleanly', () => {
    const game = new ChessGame(PAWN_ON_SEVENTH);
    game.move('a7', 'a8', 'q');
    const undone = game.undo();

    expect(undone?.isPromotion).toBe(true);
    expect(game.fen()).toBe(PAWN_ON_SEVENTH);
    expect(game.pieceAt('a7')).toEqual({ color: 'w', type: 'p' });
    expect(game.pieceAt('a8')).toBeNull();
  });

  it('promotes black pawns on rank 1', () => {
    const game = new ChessGame('K6k/8/8/8/8/8/7p/8 b - - 0 1');
    expect(game.needsPromotion('h2', 'h1')).toBe(true);
    expect(game.move('h2', 'h1', 'n')?.san).toBe('h1=N');
    expect(game.pieceAt('h1')).toEqual({ color: 'b', type: 'n' });
  });
});
