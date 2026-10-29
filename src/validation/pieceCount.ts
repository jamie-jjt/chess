import { colorLabel, totalPieces } from '../engine';
import type { PieceColor, SetupPosition } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

export const MAX_PIECES_PER_SIDE = 16;

const COLORS: readonly PieceColor[] = ['w', 'b'];

/**
 * Rule 4: at most sixteen pieces per side, counted together.
 *
 * There is deliberately no per-type limit. Promotion can leave a side with
 * three knights or two queens, so only the total is capped.
 */
export const pieceCountRule: SetupRule = {
  id: 'piece-count',
  summary: 'At most 16 pieces per side in total',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const color of COLORS) {
      const total = totalPieces(position, color);
      if (total > MAX_PIECES_PER_SIDE) {
        issues.push(
          issue(
            'piece-count',
            `${colorLabel(color)} has ${String(total)} pieces; a side can never have more than ${String(MAX_PIECES_PER_SIDE)} in total.`,
          ),
        );
      }
    }

    return issues;
  },
};
