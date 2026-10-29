import { describe, expect, it } from 'vitest';
import { totalPieces } from '../src/engine';
import { MAX_PIECES_PER_SIDE, pieceCountRule } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

describe('rule: at most sixteen pieces per side', () => {
  it('caps the total at sixteen', () => {
    expect(MAX_PIECES_PER_SIDE).toBe(16);
  });

  it('accepts a full starting army', () => {
    const standard = position(FIXTURES.standard);
    expect(totalPieces(standard, 'w')).toBe(16);
    expect(pieceCountRule.check(standard)).toEqual([]);
  });

  it('accepts sixteen pieces of unusual types', () => {
    const sixteen = position(FIXTURES.sixteenPieces);
    expect(totalPieces(sixteen, 'w')).toBe(16);
    expect(pieceCountRule.check(sixteen)).toEqual([]);
  });

  it('rejects seventeen pieces', () => {
    const seventeen = position(FIXTURES.seventeenPieces);
    expect(totalPieces(seventeen, 'w')).toBe(17);

    const issues = pieceCountRule.check(seventeen);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('piece-count');
    expect(issues[0]?.message).toMatch(/White has 17 pieces/);
    expect(issues[0]?.message).toMatch(/more than 16 in total/);
  });

  it('does not cap any single piece type, because promotions beat the starting count', () => {
    const queens = position(FIXTURES.nineQueens);
    expect(totalPieces(queens, 'w')).toBe(10);
    expect(pieceCountRule.check(queens)).toEqual([]);
  });

  it('reports each side separately', () => {
    const issues = pieceCountRule.check(
      position('nnnnknnn/nnnnnnnn/n7/8/8/N7/NNNNNNNN/NNNNKNNN w - - 0 1'),
    );
    expect(issues).toHaveLength(2);
  });
});
