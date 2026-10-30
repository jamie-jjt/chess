import { describe, expect, it } from 'vitest';
import { ChessGame } from '../src/engine';
import { SETUP_RULES, validateSetup } from '../src/validation';
import type { RuleId } from '../src/validation';
import { FIXTURES, position } from './helpers/setupFixtures';

function ruleIds(fen: string, strictBishops = false): readonly RuleId[] {
  return validateSetup(position(fen, strictBishops)).issues.map((problem) => problem.rule);
}

describe('validateSetup', () => {
  it('runs all eleven rules', () => {
    expect(SETUP_RULES).toHaveLength(11);
    expect(SETUP_RULES.map((rule) => rule.id)).toEqual([
      'one-king-per-side',
      'kings-not-adjacent',
      'pawns-off-back-ranks',
      'pawn-count',
      'piece-count',
      'promotion-accounting',
      'side-not-to-move-safe',
      'castling-rights',
      'en-passant-square',
      'strict-bishops',
      'game-already-over',
    ]);
    expect(new Set(SETUP_RULES.map((rule) => rule.id)).size).toBe(11);
  });

  it('gives every rule a plain-language summary and a severity', () => {
    for (const rule of SETUP_RULES) {
      expect(rule.summary.length).toBeGreaterThan(0);
      expect(['error', 'warning']).toContain(rule.severity);
    }
  });

  it('has exactly one warning-level rule; the rest block play', () => {
    const warnings = SETUP_RULES.filter((rule) => rule.severity === 'warning');
    expect(warnings.map((rule) => rule.id)).toEqual(['game-already-over']);
  });

  it('tags every issue a rule produces with that rule severity', () => {
    for (const rule of SETUP_RULES) {
      for (const problem of rule.check(position(FIXTURES.emptyBoard))) {
        expect(problem.severity).toBe(rule.severity);
      }
    }
  });

  it('accepts the standard starting position', () => {
    const result = validateSetup(position(FIXTURES.standard));
    expect(result.issues).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('accepts bare kings and both en passant fixtures', () => {
    // Bare kings is legal, so it is valid — but it is also already a dead
    // draw, which earns a warning rather than an error.
    const bare = validateSetup(position(FIXTURES.bareKings));
    expect(bare.isValid).toBe(true);
    expect(bare.errors).toEqual([]);
    expect(bare.warnings.map((problem) => problem.rule)).toEqual(['game-already-over']);

    expect(validateSetup(position(FIXTURES.enPassantWhite)).issues).toEqual([]);
    expect(validateSetup(position(FIXTURES.enPassantBlack)).issues).toEqual([]);
  });

  it('reports an empty board as missing both kings', () => {
    const result = validateSetup(position(FIXTURES.emptyBoard));

    expect(result.isValid).toBe(false);
    expect(result.errors.map((problem) => problem.rule)).toEqual([
      'one-king-per-side',
      'one-king-per-side',
    ]);
    expect(result.warnings).toEqual([]);
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

  it('carries the clocks through to the FEN it validates', () => {
    const result = validateSetup(position('4k3/8/8/8/8/8/8/R3K3 w - - 100 60'));

    expect(result.isValid).toBe(true);
    expect(result.warnings.map((problem) => problem.rule)).toEqual(['game-already-over']);
    expect(result.warnings[0]?.message).toMatch(/fifty-move/i);
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
    expect(result.errors.map((problem) => problem.rule)).toEqual(['strict-bishops']);
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
    expect(validateSetup(position(fen)).errors).toEqual([]);
    expect(ChessGame.tryFrom(fen)).not.toBeNull();
  });
});
