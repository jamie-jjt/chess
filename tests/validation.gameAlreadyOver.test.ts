import { describe, expect, it } from 'vitest';
import { gameAlreadyOverRule, validateSetup } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

/** Black king on g8 is mated by the rook on a8, with Black to move. */
const CHECKMATE = 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1';
/** Black has no legal move and is not in check. */
const STALEMATE = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
/** The half-move clock has reached 100. */
const FIFTY_MOVES = '4k3/8/8/8/8/8/8/R3K3 w - - 100 60';

describe('rule: warn when the position is already finished', () => {
  it('is a warning-level rule, so it never blocks play', () => {
    expect(gameAlreadyOverRule.severity).toBe('warning');
  });

  it('says nothing about a game still in progress', () => {
    expect(gameAlreadyOverRule.check(position(FIXTURES.standard))).toEqual([]);
    expect(gameAlreadyOverRule.check(position(FIXTURES.enPassantWhite))).toEqual([]);
  });

  it('warns about a position that is already checkmate', () => {
    const issues = gameAlreadyOverRule.check(position(CHECKMATE));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.message).toMatch(/already over/);
    expect(issues[0]?.message).toMatch(/checkmate/i);
    expect(issues[0]?.message).toMatch(/white wins/i);
  });

  it('warns about a position that is already stalemate', () => {
    const issues = gameAlreadyOverRule.check(position(STALEMATE));
    expect(issues[0]?.message).toMatch(/stalemate/i);
  });

  it('warns about bare kings, which cannot be won', () => {
    const issues = gameAlreadyOverRule.check(position(FIXTURES.bareKings));
    expect(issues[0]?.message).toMatch(/insufficient material/i);
  });

  it('warns when the half-move clock has already reached a hundred', () => {
    const issues = gameAlreadyOverRule.check(position(FIFTY_MOVES));
    expect(issues[0]?.message).toMatch(/fifty-move rule/i);
  });

  it('stays quiet when the position cannot be loaded at all', () => {
    expect(gameAlreadyOverRule.check(position(FIXTURES.emptyBoard))).toEqual([]);
  });
});

describe('warnings do not block the start button', () => {
  it('reports checkmate as a warning while leaving the position valid', () => {
    const result = validateSetup(position(CHECKMATE));

    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.rule).toBe('game-already-over');
  });

  it('lists errors before warnings in the combined issue list', () => {
    // Bare kings with an impossible castling right: one error, one warning.
    const result = validateSetup(position('4k3/8/8/8/8/8/8/4K3 w K - 0 1'));

    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.issues.map((problem) => problem.severity)).toEqual(['error', 'warning']);
    expect(result.isValid).toBe(false);
  });

  it('keeps the standard position free of both', () => {
    const result = validateSetup(position(FIXTURES.standard));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.isValid).toBe(true);
  });
});
