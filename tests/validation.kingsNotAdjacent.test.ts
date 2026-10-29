import { describe, expect, it } from 'vitest';
import { kingsNotAdjacentRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: kings not on adjacent squares', () => {
  it('accepts kings that are apart', () => {
    expect(kingsNotAdjacentRule.check(position(FIXTURES.bareKings))).toEqual([]);
    expect(kingsNotAdjacentRule.check(position(FIXTURES.standard))).toEqual([]);
  });

  it('accepts kings two files apart on the same rank', () => {
    expect(kingsNotAdjacentRule.check(position('8/8/8/2k1K3/8/8/8/8 w - - 0 1'))).toEqual([]);
  });

  it('rejects kings side by side', () => {
    const issues = kingsNotAdjacentRule.check(position(FIXTURES.adjacentKings));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('kings-not-adjacent');
    expect(issues[0]?.message).toMatch(/touching/);
    expect(issues[0]?.message).toMatch(/d5/);
    expect(issues[0]?.message).toMatch(/e5/);
  });

  it('rejects kings touching on a diagonal', () => {
    expect(kingsNotAdjacentRule.check(position(FIXTURES.diagonalKings))).toHaveLength(1);
  });

  it('stays quiet when a side does not have exactly one king', () => {
    expect(kingsNotAdjacentRule.check(position(FIXTURES.emptyBoard))).toEqual([]);
    expect(kingsNotAdjacentRule.check(position('3kk3/8/8/8/8/8/8/4K3 w - - 0 1'))).toEqual([]);
  });
});
