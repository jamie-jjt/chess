import { colorLabel, countOf } from '../engine';
import type { PieceColor, SetupPosition } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

export const MAX_PAWNS_PER_SIDE = 8;

const COLORS: readonly PieceColor[] = ['w', 'b'];

/**
 * Rule 3: at most eight pawns per side.
 *
 * A side starts with eight and can never gain one: promotion removes pawns and
 * captures only reduce the opponent's.
 */
export const pawnCountRule: SetupRule = {
  id: 'pawn-count',
  summary: 'At most 8 pawns per side',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const color of COLORS) {
      const pawns = countOf(position, color, 'p');
      if (pawns > MAX_PAWNS_PER_SIDE) {
        issues.push(
          issue(
            'pawn-count',
            `${colorLabel(color)} has ${String(pawns)} pawns; a side can never have more than ${String(MAX_PAWNS_PER_SIDE)}.`,
          ),
        );
      }
    }

    return issues;
  },
};
