import { describe, expect, it } from 'vitest';
import { promotionAccounting, promotionAccountingRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: extra pieces must be paid for by missing pawns', () => {
  it('accepts the starting material', () => {
    expect(promotionAccountingRule.check(position(FIXTURES.standard))).toEqual([]);
  });

  it('accepts a board with less material than the start', () => {
    expect(promotionAccountingRule.check(position(FIXTURES.bareKings))).toEqual([]);
  });

  it('accepts nine queens when every pawn is gone', () => {
    // Eight promotions, eight pawns missing: exactly affordable.
    const account = promotionAccounting(position(FIXTURES.nineQueens), 'w');
    expect(account.promotionsNeeded).toBe(8);
    expect(account.missingPawns).toBe(8);
    expect(promotionAccountingRule.check(position(FIXTURES.nineQueens))).toEqual([]);
  });

  it('rejects three queens alongside a full set of pawns', () => {
    const fen = '4k3/8/8/8/8/QQ6/PPPPPPPP/3QK3 w - - 0 1';
    const issues = promotionAccountingRule.check(position(fen));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('promotion-accounting');
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.message).toMatch(/White has 2 extra queens/);
    expect(issues[0]?.message).toMatch(/needs 2 promoted pawns/);
    expect(issues[0]?.message).toMatch(/only 0 of its 8 pawns are missing/);
  });

  it('rejects a third rook alongside a full set of pawns', () => {
    const issues = promotionAccountingRule.check(
      position('4k3/8/8/8/8/R7/PPPPPPPP/R3K2R w - - 0 1'),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/1 extra rook,/);
  });

  it('counts bishops per square colour, not as a single total', () => {
    // One bishop on each colour is the starting pair and costs nothing.
    const pair = promotionAccounting(position('4k3/8/8/8/8/8/PPPPPPPP/2B1KB2 w - - 0 1'), 'w');
    expect(pair.promotionsNeeded).toBe(0);

    // Two dark-squared bishops needs a promotion even though there are only two.
    const sameColour = promotionAccounting(
      position('4k3/8/8/8/8/4B3/PPPPPPPP/2B1K3 w - - 0 1'),
      'w',
    );
    expect(sameColour.promotionsNeeded).toBe(1);
  });

  it('rejects two same-coloured bishops when no pawn is missing', () => {
    const issues = promotionAccountingRule.check(
      position('4k3/8/8/8/8/4B3/PPPPPPPP/2B1K3 w - - 0 1'),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/1 extra dark-squared bishop,/);
  });

  it('accepts two same-coloured bishops once a pawn is missing to pay for it', () => {
    expect(
      promotionAccountingRule.check(position('4k3/8/8/8/8/4B3/PPPPPPP1/2B1K3 w - - 0 1')),
    ).toEqual([]);
  });

  it('still accepts the promoted-bishop fixtures, which have no pawns at all', () => {
    expect(promotionAccountingRule.check(position(FIXTURES.promotedBishop))).toEqual([]);
    expect(promotionAccountingRule.check(position(FIXTURES.twoDarkBishops))).toEqual([]);
  });

  it('checks each side independently', () => {
    const issues = promotionAccountingRule.check(
      position('2b1kb2/pppppppp/4b3/8/8/8/8/4K3 w - - 0 1'),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/Black has 1 extra light-squared bishop/);
  });

  it('reports several kinds of surplus in one message', () => {
    const issues = promotionAccountingRule.check(
      position('4k3/8/8/8/8/QN6/PPPPPPPP/2NQKN2 w - - 0 1'),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/extra queen/);
    expect(issues[0]?.message).toMatch(/extra knight/);
    expect(issues[0]?.message).toMatch(/ and /);
  });

  it('stays quiet when a side has more than eight pawns, which is rule 3 to answer', () => {
    expect(promotionAccountingRule.check(position(FIXTURES.ninePawns))).toEqual([]);
  });
});
