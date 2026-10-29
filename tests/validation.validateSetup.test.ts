import { describe, expect, it } from 'vitest';
import { ChessGame } from '../src/engine';
import { SETUP_RULES, validateSetup } from '../src/validation';
import type { RuleId } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

function ruleIds(fen: string, strictBishops = false): readonly RuleId[] {
  return validateSetup(position(fen, strictBishops)).issues.map((problem) => problem.rule);
}

describe('validateSetup', () => {
  it('runs all nine rules', () => {
    expect(SETUP_RULES).toHaveLength(9);
    expect(SETUP_RULES.map((rule) => rule.id)).toEqual([
      'one-king-per-side',
      'kings-not-adjacent',
      'pawns-off-back-ranks',
      'pawn-count',
      'piece-count',
      'side-not-to-move-safe',
      'castling-rights',
      'en-passant-square',
      'strict-bishops',
    ]);
    expect(new Set(SETUP_RULES.map((rule) => rule.id)).size).toBe(9);
  });

  it('gives every rule a plain-language summary for the editor', () => {
    for (const rule of SETUP_RULES) {
      expect(rule.summary.length).toBeGreaterThan(0);
    }
  });

  it('accepts the standard starting position', () => {
    const result = validateSetup(position(FIXTURES.standard));
    expect(result.issues).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('accepts bare kings and both en passant fixtures', () => {
    expect(validateSetup(position(FIXTURES.bareKings)).isValid).toBe(true);
    expect(validateSetup(position(FIXTURES.enPassantWhite)).isValid).toBe(true);
    expect(validateSetup(position(FIXTURES.enPassantBlack)).isValid).toBe(true);
  });

  it('reports an empty board as missing both kings', () => {
    const result = validateSetup(position(FIXTURES.emptyBoard));

    expect(result.isValid).toBe(false);
    expect(result.issues.map((problem) => problem.rule)).toEqual([
      'one-king-per-side',
      'one-king-per-side',
    ]);
  });

  it('collects problems from several rules at once', () => {
    // Adjacent kings, a pawn on rank 8 and an impossible castling right.
    const ids = ruleIds('P2kK3/8/8/8/8/8/8/8 w KQ - 0 1');

    expect(ids).toContain('kings-not-adjacent');
    expect(ids).toContain('pawns-off-back-ranks');
    expect(ids).toContain('castling-rights');
  });

  it('phrases every message as a sentence a player can act on', () => {
    for (const problem of validateSetup(position(FIXTURES.emptyBoard)).issues) {
      expect(problem.message).toMatch(/^[A-Z]/);
      expect(problem.message).toMatch(/\.$/);
    }
  });
});

describe('promoted bishops', () => {
  it('passes in standard mode, where a third bishop is simply a promotion', () => {
    const result = validateSetup(position(FIXTURES.promotedBishop, false));

    expect(result.issues).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('passes in standard mode with two bishops on the same square colour', () => {
    expect(validateSetup(position(FIXTURES.twoDarkBishops, false)).isValid).toBe(true);
  });

  it('fails the very same position once strict bishops is switched on', () => {
    const result = validateSetup(position(FIXTURES.promotedBishop, true));

    expect(result.isValid).toBe(false);
    expect(result.issues.map((problem) => problem.rule)).toEqual(['strict-bishops']);
  });

  it('produces a position the engine can actually play', () => {
    const fen = `${FIXTURES.promotedBishop.split(' ')[0] ?? ''} w - - 0 1`;
    const game = ChessGame.tryFrom(fen);

    expect(game).not.toBeNull();
    expect(game?.legalMoves().length).toBeGreaterThan(0);
  });
});

describe('every valid position is loadable by the engine', () => {
  it.each([
    ['standard', FIXTURES.standard],
    ['bare kings', FIXTURES.bareKings],
    ['en passant for White', FIXTURES.enPassantWhite],
    ['en passant for Black', FIXTURES.enPassantBlack],
    ['castling ready', `${FIXTURES.castlingReady} w KQkq - 0 1`],
    ['promoted bishop', FIXTURES.promotedBishop],
    ['nine queens', FIXTURES.nineQueens],
  ])('%s', (_name, fen: string) => {
    expect(validateSetup(position(fen)).isValid).toBe(true);
    expect(ChessGame.tryFrom(fen)).not.toBeNull();
  });
});
