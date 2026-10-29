import { describe, expect, it } from 'vitest';
import {
  goCommand,
  parseBestMoveLine,
  parseInfoLine,
  parseUciMove,
  positionCommand,
  setOptionCommand,
  skillLevelCommand,
  toUciMove,
} from '../src/ai';
import { START_FEN } from '../src/engine';

describe('UCI move parsing', () => {
  it('reads a plain move', () => {
    expect(parseUciMove('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: null });
  });

  it('reads a promotion', () => {
    expect(parseUciMove('a7a8q')).toEqual({ from: 'a7', to: 'a8', promotion: 'q' });
    expect(parseUciMove('h2h1n')).toEqual({ from: 'h2', to: 'h1', promotion: 'n' });
  });

  it.each(['', 'e2', 'e2e9', 'i2i4', 'e2e4k', 'e2e4qq', 'bestmove'])(
    'rejects %s',
    (text: string) => {
      expect(parseUciMove(text)).toBeNull();
    },
  );

  it('writes a move back out', () => {
    expect(toUciMove({ from: 'e2', to: 'e4', promotion: null })).toBe('e2e4');
    expect(toUciMove({ from: 'a7', to: 'a8', promotion: 'r' })).toBe('a7a8r');
  });
});

describe('bestmove lines', () => {
  it('reads the move and ignores the ponder move', () => {
    expect(parseBestMoveLine('bestmove f1c4 ponder g8f6')).toEqual({
      kind: 'move',
      move: { from: 'f1', to: 'c4', promotion: null },
    });
  });

  it('reads a promotion reply', () => {
    expect(parseBestMoveLine('bestmove a7a8q')).toEqual({
      kind: 'move',
      move: { from: 'a7', to: 'a8', promotion: 'q' },
    });
  });

  it.each(['bestmove (none)', 'bestmove none', 'bestmove 0000'])(
    'reads %s as no move',
    (line: string) => {
      expect(parseBestMoveLine(line)).toEqual({ kind: 'none' });
    },
  );

  it('ignores lines that are not bestmove', () => {
    expect(parseBestMoveLine('info depth 10 score cp 31')).toBeNull();
    expect(parseBestMoveLine('readyok')).toBeNull();
  });

  it('rejects a bestmove it cannot parse', () => {
    expect(parseBestMoveLine('bestmove z9z9')).toBeNull();
  });
});

describe('info lines', () => {
  it('reads depth and a centipawn score', () => {
    expect(parseInfoLine('info depth 12 seldepth 18 score cp -45 nodes 1000 pv e2e4')).toEqual({
      depth: 12,
      scoreCp: -45,
      mateIn: null,
    });
  });

  it('reads a mate score', () => {
    expect(parseInfoLine('info depth 9 score mate 3 pv a1a8')).toEqual({
      depth: 9,
      scoreCp: null,
      mateIn: 3,
    });
  });

  it('ignores other lines', () => {
    expect(parseInfoLine('bestmove e2e4')).toBeNull();
  });
});

describe('command building', () => {
  it('builds a position command from a valid FEN', () => {
    expect(positionCommand(START_FEN)).toBe(`position fen ${START_FEN}`);
  });

  it('refuses to build a position command from an invalid FEN', () => {
    expect(() => positionCommand('not a fen')).toThrow(/invalid FEN/i);
    expect(() => positionCommand('')).toThrow(/invalid FEN/i);
    // No kings: legal-looking, still unusable.
    expect(() => positionCommand('8/8/8/8/8/8/8/8 w - - 0 1')).toThrow(/invalid FEN/i);
  });

  it('builds a go command with both limits', () => {
    expect(goCommand(10, 1500)).toBe('go depth 10 movetime 1500');
  });

  it.each([
    [0, 1000],
    [-1, 1000],
    [1.5, 1000],
    [10, 0],
    [10, -5],
  ])('refuses go with depth %s and time %s', (depth: number, time: number) => {
    expect(() => goCommand(depth, time)).toThrow();
  });

  it('builds setoption commands', () => {
    expect(setOptionCommand('Hash', 16)).toBe('setoption name Hash value 16');
    expect(skillLevelCommand(0)).toBe('setoption name Skill Level value 0');
    expect(skillLevelCommand(20)).toBe('setoption name Skill Level value 20');
  });

  it('refuses a skill level outside the range Stockfish accepts', () => {
    expect(() => skillLevelCommand(-1)).toThrow(/0 to 20/);
    expect(() => skillLevelCommand(21)).toThrow(/0 to 20/);
    expect(() => skillLevelCommand(2.5)).toThrow(/0 to 20/);
  });
});
