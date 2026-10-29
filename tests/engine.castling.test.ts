import { describe, expect, it } from 'vitest';
import { ChessGame, parseFen } from '../src/engine';

const ALL_RIGHTS = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
const ALL_RIGHTS_BLACK = 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1';
const F1_G1_ATTACKED = 'r3k2r/8/8/8/8/8/6q1/R3K2R w KQkq - 0 1';
const KING_IN_CHECK = 'r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1';
/** Same as ALL_RIGHTS plus two black pawns, so Black has a waiting move. */
const WITH_SPARE_PAWNS = 'r3k2r/p6p/8/8/8/8/8/R3K2R w KQkq - 0 1';

describe('castling', () => {
  it('offers both castles when the squares are clear and the rights are intact', () => {
    const game = new ChessGame(ALL_RIGHTS);
    const sans = game.legalMovesFrom('e1').map((move) => move.san);

    expect(sans).toContain('O-O');
    expect(sans).toContain('O-O-O');
  });

  it('moves the king and the rook when castling kingside', () => {
    const game = new ChessGame(ALL_RIGHTS);
    const move = game.move('e1', 'g1');

    expect(move?.san).toBe('O-O');
    expect(move?.isCastle).toBe(true);
    expect(game.pieceAt('g1')).toEqual({ color: 'w', type: 'k' });
    expect(game.pieceAt('f1')).toEqual({ color: 'w', type: 'r' });
    expect(game.pieceAt('e1')).toBeNull();
    expect(game.pieceAt('h1')).toBeNull();
  });

  it('moves the king and the rook when castling queenside', () => {
    const game = new ChessGame(ALL_RIGHTS);
    const move = game.move('e1', 'c1');

    expect(move?.san).toBe('O-O-O');
    expect(game.pieceAt('c1')).toEqual({ color: 'w', type: 'k' });
    expect(game.pieceAt('d1')).toEqual({ color: 'w', type: 'r' });
    expect(game.pieceAt('a1')).toBeNull();
  });

  it('castles for black as well', () => {
    const game = new ChessGame(ALL_RIGHTS_BLACK);
    expect(game.move('e8', 'g8')?.san).toBe('O-O');
    expect(game.pieceAt('g8')).toEqual({ color: 'b', type: 'k' });
    expect(game.pieceAt('f8')).toEqual({ color: 'b', type: 'r' });
  });

  it('refuses to castle through an attacked square', () => {
    const game = new ChessGame(F1_G1_ATTACKED);
    const sans = game.legalMovesFrom('e1').map((move) => move.san);

    expect(sans).not.toContain('O-O');
    expect(sans).toContain('O-O-O');
    expect(game.move('e1', 'g1')).toBeNull();
  });

  it('refuses to castle out of check', () => {
    const game = new ChessGame(KING_IN_CHECK);
    const sans = game.legalMovesFrom('e1').map((move) => move.san);

    expect(game.isCheck()).toBe(true);
    expect(sans).not.toContain('O-O');
    expect(sans).not.toContain('O-O-O');
  });

  it('loses the castling rights once the king moves', () => {
    // Black answers with pawn moves so that only White's rights change.
    const game = new ChessGame(WITH_SPARE_PAWNS);
    game.move('e1', 'e2');
    game.move('a7', 'a6');
    game.move('e2', 'e1');
    game.move('h7', 'h6');

    expect(parseFen(game.fen())?.castling).toBe('kq');
    expect(game.move('e1', 'g1')).toBeNull();
  });

  it('loses only one side of the rights when a rook moves', () => {
    const game = new ChessGame(WITH_SPARE_PAWNS);
    game.move('h1', 'h2');
    game.move('a7', 'a6');

    expect(parseFen(game.fen())?.castling).toBe('Qkq');
    expect(game.legalMovesFrom('e1').map((move) => move.san)).toContain('O-O-O');
    expect(game.legalMovesFrom('e1').map((move) => move.san)).not.toContain('O-O');
  });

  it('restores the rook and the rights when a castle is undone', () => {
    const game = new ChessGame(ALL_RIGHTS);
    game.move('e1', 'g1');
    game.undo();

    expect(game.fen()).toBe(ALL_RIGHTS);
  });
});
