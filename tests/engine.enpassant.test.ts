import { describe, expect, it } from 'vitest';
import { ChessGame, parseFen } from '../src/engine';

/** 1. e4 a6 2. e5 d5 — Black's two-square push creates the d6 target. */
function positionWithEnPassantTarget(): ChessGame {
  const game = new ChessGame();
  for (const san of ['e4', 'a6', 'e5', 'd5']) game.moveSan(san);
  return game;
}

describe('en passant', () => {
  it('records the target square after a two-square pawn push', () => {
    const game = positionWithEnPassantTarget();
    expect(parseFen(game.fen())?.enPassant).toBe('d6');
    expect(game.history().at(-1)?.to).toBe('d5');
  });

  it('offers the capture to the adjacent pawn', () => {
    const game = positionWithEnPassantTarget();
    expect([...game.legalDestinationsFrom('e5')].sort()).toEqual(['d6', 'e6']);
  });

  it('removes the captured pawn from the square behind the target', () => {
    const game = positionWithEnPassantTarget();
    const move = game.move('e5', 'd6');

    expect(move?.san).toBe('exd6');
    expect(move?.isEnPassant).toBe(true);
    expect(game.pieceAt('d6')).toEqual({ color: 'w', type: 'p' });
    expect(game.pieceAt('d5')).toBeNull();
  });

  it('works from a FEN that carries the target square', () => {
    const game = new ChessGame('8/8/8/3pP3/8/8/8/K6k w - d6 0 1');
    expect(game.isLegal('e5', 'd6')).toBe(true);
    expect(game.move('e5', 'd6')?.isEnPassant).toBe(true);
    expect(game.pieceAt('d5')).toBeNull();
  });

  it('reports en passant as a capture even though chess.js flags it separately', () => {
    const game = positionWithEnPassantTarget();
    const move = game.move('e5', 'd6');

    expect(move?.isCapture).toBe(true);
    expect(move?.captured).toBe('p');
  });

  it('expires if the capture is not played immediately', () => {
    const game = positionWithEnPassantTarget();
    game.moveSan('Nf3');
    game.moveSan('Nc6');

    expect(parseFen(game.fen())?.enPassant).toBeNull();
    expect(game.isLegal('e5', 'd6')).toBe(false);
    expect(game.move('e5', 'd6')).toBeNull();
  });

  it('puts the captured pawn back when undone', () => {
    const game = positionWithEnPassantTarget();
    const before = game.fen();
    game.move('e5', 'd6');
    const undone = game.undo();

    expect(undone?.isEnPassant).toBe(true);
    expect(game.fen()).toBe(before);
    expect(game.pieceAt('d5')).toEqual({ color: 'b', type: 'p' });
  });

  it('allows black to capture en passant too', () => {
    const game = new ChessGame();
    for (const san of ['Nf3', 'e5', 'Nc3', 'e4', 'd4']) game.moveSan(san);

    expect(parseFen(game.fen())?.enPassant).toBe('d3');
    expect(game.move('e4', 'd3')?.isEnPassant).toBe(true);
    expect(game.pieceAt('d4')).toBeNull();
  });
});
