import { describe, expect, it } from 'vitest';
import { sideNotToMoveSafeRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: the side not to move must not be in check', () => {
  it('accepts a position with no checks', () => {
    expect(sideNotToMoveSafeRule.check(position(FIXTURES.bareKings))).toEqual([]);
    expect(sideNotToMoveSafeRule.check(position(FIXTURES.standard))).toEqual([]);
  });

  it('accepts the side *to* move being in check', () => {
    // Black is in check from the rook on e2 and it is Black's turn: normal.
    const issues = sideNotToMoveSafeRule.check(position(`${FIXTURES.blackInCheck} b - - 0 1`));
    expect(issues).toEqual([]);
  });

  it('rejects the side *not* to move being in check', () => {
    const issues = sideNotToMoveSafeRule.check(position(`${FIXTURES.blackInCheck} w - - 0 1`));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('side-not-to-move-safe');
    expect(issues[0]?.message).toMatch(/Black is in check/);
    expect(issues[0]?.message).toMatch(/from e2/);
    expect(issues[0]?.message).toMatch(/White to move/);
  });

  it('rejects White waiting in check with Black to move', () => {
    const issues = sideNotToMoveSafeRule.check(position('4k3/8/8/8/8/8/4r3/4K3 b - - 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/White is in check/);
    expect(issues[0]?.message).toMatch(/Black to move/);
  });

  it('names every attacking square', () => {
    const issues = sideNotToMoveSafeRule.check(position('4k3/8/8/8/8/8/4R2R/4K3 w - - 0 1'));
    // Only the e-file rook attacks e8; h2 does not.
    expect(issues[0]?.message).toMatch(/from e2/);
    expect(issues[0]?.message).not.toMatch(/h2/);
  });

  it('still runs while the en passant square is inconsistent', () => {
    // A bogus target would stop the position loading if the probe kept it.
    const issues = sideNotToMoveSafeRule.check(position(`${FIXTURES.blackInCheck} w - a6 0 1`));
    expect(issues).toHaveLength(1);
  });

  it('still runs while castling rights are impossible', () => {
    const issues = sideNotToMoveSafeRule.check(position(`${FIXTURES.blackInCheck} w KQkq - 0 1`));
    expect(issues).toHaveLength(1);
  });

  it('stays quiet when a side does not have exactly one king', () => {
    expect(sideNotToMoveSafeRule.check(position(FIXTURES.emptyBoard))).toEqual([]);
    expect(sideNotToMoveSafeRule.check(position('4k3/8/8/8/8/8/4R3/8 w - - 0 1'))).toEqual([]);
  });
});
