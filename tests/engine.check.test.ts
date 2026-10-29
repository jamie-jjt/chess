import { describe, expect, it } from 'vitest';
import { ChessGame } from '../src/engine';

const ROOK_CHECK = '4k3/8/8/8/8/8/4R3/4K3 b - - 0 1';
const PINNED_ROOK = '4k3/4r3/8/8/8/8/4R3/4K3 b - - 0 1';

describe('check detection', () => {
  it('reports no check in the starting position', () => {
    const snapshot = new ChessGame().snapshot();
    expect(snapshot.isCheck).toBe(false);
    expect(snapshot.checkedKingSquare).toBeNull();
    expect(snapshot.result).toEqual({ type: 'in-progress' });
  });

  it('flags the checked side and locates its king', () => {
    const snapshot = new ChessGame(ROOK_CHECK).snapshot();
    expect(snapshot.isCheck).toBe(true);
    expect(snapshot.turn).toBe('b');
    expect(snapshot.checkedKingSquare).toBe('e8');
    expect(snapshot.result).toEqual({ type: 'in-progress' });
  });

  it('only generates moves that answer the check', () => {
    const game = new ChessGame(ROOK_CHECK);
    expect([...game.legalDestinationsFrom('e8')].sort()).toEqual(['d7', 'd8', 'f7', 'f8']);
    expect(game.legalMoves()).toHaveLength(4);
    // e7 stays on the checking file, so it is not offered.
    expect(game.isLegal('e8', 'e7')).toBe(false);
    expect(game.move('e8', 'e7')).toBeNull();
  });

  it('keeps a pinned piece on the pinning line', () => {
    const game = new ChessGame(PINNED_ROOK);
    expect([...game.legalDestinationsFrom('e7')].sort()).toEqual(['e2', 'e3', 'e4', 'e5', 'e6']);
    expect(game.move('e7', 'a7')).toBeNull();
  });

  it('records a checking move and keeps the game in progress', () => {
    const game = new ChessGame('4k3/8/8/8/8/8/8/4KR2 w - - 0 1');
    const move = game.move('f1', 'f8');
    expect(move?.san).toBe('Rf8+');
    expect(game.isCheck()).toBe(true);
    expect(game.result().type).toBe('in-progress');
  });
});
