import { describe, expect, it } from 'vitest';
import { squareShade } from '../src/engine';
import { strictBishopsRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: strict bishops (opt-in)', () => {
  it('confirms the fixture really does have two bishops on one colour', () => {
    expect(squareShade('c1')).toBe('dark');
    expect(squareShade('e3')).toBe('dark');
    expect(squareShade('f1')).toBe('light');
  });

  it('does nothing at all while the option is off', () => {
    expect(strictBishopsRule.check(position(FIXTURES.twoDarkBishops, false))).toEqual([]);
    expect(strictBishopsRule.check(position(FIXTURES.promotedBishop, false))).toEqual([]);
  });

  it('accepts one bishop per square colour while the option is on', () => {
    expect(strictBishopsRule.check(position(FIXTURES.bishopPair, true))).toEqual([]);
    expect(strictBishopsRule.check(position(FIXTURES.standard, true))).toEqual([]);
  });

  it('accepts a single bishop while the option is on', () => {
    expect(strictBishopsRule.check(position('4k3/8/8/8/8/8/8/2B1K3 w - - 0 1', true))).toEqual([]);
  });

  it('rejects two same-coloured bishops while the option is on', () => {
    const issues = strictBishopsRule.check(position(FIXTURES.twoDarkBishops, true));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('strict-bishops');
    expect(issues[0]?.message).toMatch(/White has 2 bishops on dark squares/);
    expect(issues[0]?.message).toMatch(/c1, e3/);
    expect(issues[0]?.message).toMatch(/untick "strict bishops"/);
  });

  it('reports light and dark separately', () => {
    // c1 and e3 dark; f1 and h3 light.
    const issues = strictBishopsRule.check(
      position('4k3/8/8/8/8/4B2B/8/2B1KB2 w - - 0 1', true),
    );

    expect(issues).toHaveLength(2);
    expect(issues.map((problem) => problem.message).join(' ')).toMatch(/dark squares/);
    expect(issues.map((problem) => problem.message).join(' ')).toMatch(/light squares/);
  });

  it('reports each side separately', () => {
    const issues = strictBishopsRule.check(
      position('2b1kb2/4b3/8/8/8/4B3/8/2B1KB2 w - - 0 1', true),
    );

    expect(issues).toHaveLength(2);
    expect(issues.map((problem) => problem.message).join(' ')).toMatch(/White has 2 bishops/);
    expect(issues.map((problem) => problem.message).join(' ')).toMatch(/Black has 2 bishops/);
  });
});
