import { colorLabel, squaresOf } from '../engine';
import type { PieceColor, SetupPosition } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

const COLORS: readonly PieceColor[] = ['w', 'b'];

/** Rule 1: each side must have exactly one king. */
export const oneKingPerSideRule: SetupRule = {
  id: 'one-king-per-side',
  summary: 'Exactly one king per side',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const color of COLORS) {
      const kings = squaresOf(position, color, 'k');

      if (kings.length === 0) {
        issues.push(issue('one-king-per-side', `${colorLabel(color)} needs a king.`));
      } else if (kings.length > 1) {
        issues.push(
          issue(
            'one-king-per-side',
            `${colorLabel(color)} has ${String(kings.length)} kings (on ${kings.join(', ')}); only one is allowed.`,
          ),
        );
      }
    }

    return issues;
  },
};
