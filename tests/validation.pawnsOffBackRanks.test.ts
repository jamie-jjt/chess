import { describe, expect, it } from 'vitest';
import { pawnsOffBackRanksRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: no pawns on rank 1 or rank 8', () => {
  it('accepts pawns anywhere between rank 2 and rank 7', () => {
    expect(pawnsOffBackRanksRule.check(position(FIXTURES.standard))).toEqual([]);
    expect(pawnsOffBackRanksRule.check(position('4k3/p7/8/8/8/8/7P/4K3 w - - 0 1'))).toEqual([]);
  });

  it('rejects a white pawn on rank 8', () => {
    const issues = pawnsOffBackRanksRule.check(position(FIXTURES.pawnOnRankEight));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('pawns-off-back-ranks');
    expect(issues[0]?.message).toBe('A pawn is on a8. Pawns cannot stand on rank 1 or rank 8.');
  });

  it('rejects a black pawn on rank 1', () => {
    const issues = pawnsOffBackRanksRule.check(position('4k3/8/8/8/8/8/8/p3K3 w - - 0 1'));
    expect(issues[0]?.message).toMatch(/A pawn is on a1/);
  });

  it('lists every offending square in one message', () => {
    const issues = pawnsOffBackRanksRule.check(
      position('P3k2P/8/8/8/8/8/8/p3K3 w - - 0 1'),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/a1, a8, h8/);
  });

  it('ignores non-pawns on the back ranks', () => {
    expect(pawnsOffBackRanksRule.check(position(FIXTURES.castlingReady + ' w KQkq - 0 1'))).toEqual(
      [],
    );
  });
});
