import { checkFen, isPromotionPiece, isSquareId } from '../engine';
import type { PromotionPiece, SquareId } from '../engine';

/** A move in UCI long algebraic form, e.g. `e2e4` or `e7e8q`. */
export interface UciMove {
  readonly from: SquareId;
  readonly to: SquareId;
  readonly promotion: PromotionPiece | null;
}

export type BestMoveLine =
  | { readonly kind: 'move'; readonly move: UciMove }
  /** `bestmove (none)` — the engine has no move, i.e. mate or stalemate. */
  | { readonly kind: 'none' };

export interface UciInfo {
  readonly depth: number | null;
  /** Score in centipawns from the moving side's point of view. */
  readonly scoreCp: number | null;
  /** Mate distance in moves; negative means the engine is being mated. */
  readonly mateIn: number | null;
}

export function toUciMove(move: UciMove): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

/** Parses `e2e4` / `e7e8q`. Returns null for anything else. */
export function parseUciMove(text: string): UciMove | null {
  const trimmed = text.trim();
  if (trimmed.length !== 4 && trimmed.length !== 5) return null;

  const from = trimmed.slice(0, 2);
  const to = trimmed.slice(2, 4);
  if (!isSquareId(from) || !isSquareId(to)) return null;

  if (trimmed.length === 4) return { from, to, promotion: null };

  const promotion = trimmed.slice(4, 5);
  if (!isPromotionPiece(promotion)) return null;
  return { from, to, promotion };
}

/** Parses a `bestmove ...` line. Returns null when the line is something else. */
export function parseBestMoveLine(line: string): BestMoveLine | null {
  const match = /^bestmove\s+(\S+)/.exec(line.trim());
  if (match === null) return null;

  const token = match[1];
  if (token === undefined) return null;
  if (token === '(none)' || token === 'none' || token === '0000') return { kind: 'none' };

  const move = parseUciMove(token);
  return move === null ? null : { kind: 'move', move };
}

/** Parses the fields of an `info ...` line that the UI can show. */
export function parseInfoLine(line: string): UciInfo | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('info ')) return null;

  const depth = /\bdepth\s+(\d+)/.exec(trimmed)?.[1];
  const cp = /\bscore\s+cp\s+(-?\d+)/.exec(trimmed)?.[1];
  const mate = /\bscore\s+mate\s+(-?\d+)/.exec(trimmed)?.[1];

  return {
    depth: depth === undefined ? null : Number(depth),
    scoreCp: cp === undefined ? null : Number(cp),
    mateIn: mate === undefined ? null : Number(mate),
  };
}

/**
 * Builds `position fen <fen>`, refusing anything the FEN validator rejects.
 * This is the single choke point for what reaches the engine's `position`
 * command, so a malformed position can never be sent.
 */
export function positionCommand(fen: string): string {
  const check = checkFen(fen);
  if (!check.ok) {
    throw new Error(`Refusing to send an invalid FEN to the engine: ${check.error ?? 'unknown'}`);
  }
  return `position fen ${fen}`;
}

export function goCommand(depth: number, maxThinkMs: number): string {
  if (!Number.isInteger(depth) || depth < 1) {
    throw new Error(`Search depth must be a positive integer, received ${String(depth)}.`);
  }
  if (!Number.isInteger(maxThinkMs) || maxThinkMs < 1) {
    throw new Error(`Think time must be a positive integer, received ${String(maxThinkMs)}.`);
  }
  return `go depth ${String(depth)} movetime ${String(maxThinkMs)}`;
}

export function setOptionCommand(name: string, value: string | number): string {
  return `setoption name ${name} value ${String(value)}`;
}

export function skillLevelCommand(skillLevel: number): string {
  if (!Number.isInteger(skillLevel) || skillLevel < 0 || skillLevel > 20) {
    throw new Error(`Skill level must be an integer from 0 to 20, received ${String(skillLevel)}.`);
  }
  return setOptionCommand('Skill Level', skillLevel);
}
