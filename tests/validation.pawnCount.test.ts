import { describe, expect, it } from 'vitest';
import { MAX_PAWNS_PER_SIDE, pawnCountRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: at most eight pawns per side', () => {
  it('caps the count at eight', () => {
    expect(MAX_PAWNS_PER_SIDE).toBe(8);
  });

  it('accepts a full set of eight', () => {
    expect(pawnCountRule.check(position(FIXTURES.eightPawns))).toEqual([]);
    expect(pawnCountRule.check(position(FIXTURES.standard))).toEqual([]);
  });

  it('accepts a board with no pawns at all', () => {
    expect(pawnCountRule.check(position(FIXTURES.bareKings))).toEqual([]);
  });

  it('rejects nine white pawns', () => {
    const issues = pawnCountRule.check(position(FIXTURES.ninePawns));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('pawn-count');
    expect(issues[0]?.message).toMatch(/White has 9 pawns/);
    expect(issues[0]?.message).toMatch(/more than 8/);
  });

  it('rejects nine black pawns', () => {
    const issues = pawnCountRule.check(position('4k3/pppppppp/p7/8/8/8/8/4K3 w - - 0 1'));
    expect(issues[0]?.message).toMatch(/Black has 9 pawns/);
  });

  it('reports each side separately', () => {
    const issues = pawnCountRule.check(
      position('4k3/pppppppp/p7/8/8/P7/PPPPPPPP/4K3 w - - 0 1'),
    );
    expect(issues).toHaveLength(2);
  });
});
