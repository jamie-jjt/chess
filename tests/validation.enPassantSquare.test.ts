import { describe, expect, it } from 'vitest';
import { enPassantCandidates, enPassantSquareRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: the en passant square must match a two-square pawn move', () => {
  it('accepts no en passant square at all', () => {
    expect(enPassantSquareRule.check(position(FIXTURES.standard))).toEqual([]);
    expect(enPassantSquareRule.check(position(FIXTURES.bareKings))).toEqual([]);
  });

  it('accepts a target that matches a black pawn on d5, White to move', () => {
    expect(enPassantSquareRule.check(position(FIXTURES.enPassantWhite))).toEqual([]);
  });

  it('accepts a target that matches a white pawn on d4, Black to move', () => {
    expect(enPassantSquareRule.check(position(FIXTURES.enPassantBlack))).toEqual([]);
  });

  it('rejects a target on the wrong rank for the side to move', () => {
    const issues = enPassantSquareRule.check(position('8/8/8/8/3Pp3/8/8/K6k w - d3 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('en-passant-square');
    expect(issues[0]?.message).toMatch(/must be on rank 6/);
    expect(issues[0]?.message).toMatch(/d3 is on rank 3/);
  });

  it('rejects a target with no pawn standing beyond it', () => {
    const issues = enPassantSquareRule.check(position('4k3/8/8/8/8/8/8/4K3 w - d6 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/standing on d5/);
  });

  it('rejects a target with a pawn of the wrong colour beyond it', () => {
    // A white pawn on d5 cannot have made Black's double move.
    const issues = enPassantSquareRule.check(position('4k3/8/8/3P4/8/8/8/4K3 w - d6 0 1'));
    expect(issues).toHaveLength(1);
  });

  it('rejects an occupied target square', () => {
    const issues = enPassantSquareRule.check(position('4k3/8/3r4/3p4/8/8/8/4K3 w - d6 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/has to be empty/);
  });

  it('rejects a target whose origin square is still occupied', () => {
    // A pawn still sits on d7, so nothing can have moved from there.
    const issues = enPassantSquareRule.check(position('4k3/3p4/8/3p4/8/8/8/4K3 w - d6 0 1'));

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/d7 must be empty/);
  });
});

describe('enPassantCandidates, which fills the editor picker', () => {
  it('offers rank 6 when White is to move', () => {
    expect(enPassantCandidates('w')).toEqual(['a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6']);
  });

  it('offers rank 3 when Black is to move', () => {
    expect(enPassantCandidates('b')).toEqual(['a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3']);
  });
});
