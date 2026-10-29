import { describe, expect, it } from 'vitest';
import { CASTLING_REQUIREMENTS, availableCastlingRights, castlingRightsRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: castling rights need the king and rook at home', () => {
  it('accepts all four rights when both kings and all four rooks are home', () => {
    expect(castlingRightsRule.check(position(`${FIXTURES.castlingReady} w KQkq - 0 1`))).toEqual([]);
    expect(castlingRightsRule.check(position(FIXTURES.standard))).toEqual([]);
  });

  it('accepts a position that claims no rights at all', () => {
    expect(castlingRightsRule.check(position(FIXTURES.bareKings))).toEqual([]);
    expect(castlingRightsRule.check(position(`${FIXTURES.whiteKingMoved} w - - 0 1`))).toEqual([]);
  });

  it('rejects a right claimed with no rook', () => {
    const issues = castlingRightsRule.check(position('4k3/8/8/8/8/8/8/4K3 w K - 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('castling-rights');
    expect(issues[0]?.message).toBe(
      'White kingside castling (K) needs the king on e1 and a rook on h1.',
    );
  });

  it('rejects both white rights once the king has left e1', () => {
    const issues = castlingRightsRule.check(position(`${FIXTURES.whiteKingMoved} w KQkq - 0 1`));

    expect(issues).toHaveLength(2);
    expect(issues.map((problem) => problem.message).join(' ')).toMatch(/White kingside/);
    expect(issues.map((problem) => problem.message).join(' ')).toMatch(/White queenside/);
  });

  it('rejects only the side whose rook has moved', () => {
    // The h1 rook sits on h2 instead.
    const issues = castlingRightsRule.check(position('r3k2r/8/8/8/8/8/7R/R3K3 w KQkq - 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/White kingside/);
  });

  it('rejects a right backed by the wrong colour of rook', () => {
    const issues = castlingRightsRule.check(position('4k3/8/8/8/8/8/8/4K2r w K - 0 1'));
    expect(issues).toHaveLength(1);
  });

  it('rejects a right backed by a piece that is not a rook', () => {
    const issues = castlingRightsRule.check(position('4k3/8/8/8/8/8/8/4K2Q w K - 0 1'));
    expect(issues).toHaveLength(1);
  });
});

describe('availableCastlingRights, which the editor uses to enable the checkboxes', () => {
  it('offers every right when both sides are fully at home', () => {
    expect(availableCastlingRights(position(`${FIXTURES.castlingReady} w - - 0 1`))).toEqual({
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    });
  });

  it('offers nothing on a board of bare kings', () => {
    expect(availableCastlingRights(position(FIXTURES.bareKings))).toEqual({
      whiteKingSide: false,
      whiteQueenSide: false,
      blackKingSide: false,
      blackQueenSide: false,
    });
  });

  it('withdraws both of a side\u2019s rights when its king moves', () => {
    const available = availableCastlingRights(position(`${FIXTURES.whiteKingMoved} w - - 0 1`));

    expect(available.whiteKingSide).toBe(false);
    expect(available.whiteQueenSide).toBe(false);
    expect(available.blackKingSide).toBe(true);
    expect(available.blackQueenSide).toBe(true);
  });

  it('withdraws one right when a single rook moves', () => {
    const available = availableCastlingRights(position('r3k2r/8/8/8/8/8/8/4K2R w - - 0 1'));

    expect(available.whiteKingSide).toBe(true);
    expect(available.whiteQueenSide).toBe(false);
  });

  it('describes all four rights for the UI', () => {
    expect(CASTLING_REQUIREMENTS).toHaveLength(4);
    expect(CASTLING_REQUIREMENTS.map((requirement) => requirement.letter)).toEqual([
      'K',
      'Q',
      'k',
      'q',
    ]);
  });
});
