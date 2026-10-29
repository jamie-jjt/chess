import { describe, expect, it } from 'vitest';
import { oneKingPerSideRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: exactly one king per side', () => {
  it('accepts one king each', () => {
    expect(oneKingPerSideRule.check(position(FIXTURES.bareKings))).toEqual([]);
    expect(oneKingPerSideRule.check(position(FIXTURES.standard))).toEqual([]);
  });

  it('rejects a missing white king', () => {
    const issues = oneKingPerSideRule.check(position('4k3/8/8/8/8/8/8/8 w - - 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('one-king-per-side');
    expect(issues[0]?.message).toBe('White needs a king.');
  });

  it('rejects a missing black king', () => {
    const issues = oneKingPerSideRule.check(position('8/8/8/8/8/8/8/4K3 w - - 0 1'));
    expect(issues.map((problem) => problem.message)).toEqual(['Black needs a king.']);
  });

  it('rejects two kings of the same colour', () => {
    const issues = oneKingPerSideRule.check(position('4k3/8/8/8/8/8/8/K3K3 w - - 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/White has 2 kings/);
    expect(issues[0]?.message).toMatch(/a1, e1/);
  });

  it('reports both sides when the board is empty', () => {
    const issues = oneKingPerSideRule.check(position(FIXTURES.emptyBoard));
    expect(issues).toHaveLength(2);
  });
});
