import { areAdjacent, kingSquare } from '../engine';
import type { SetupPosition } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

/**
 * Rule 2: the kings may not stand on touching squares.
 *
 * Two adjacent kings cannot arise in a real game, because the side that moved
 * last would have moved into check.
 */
export const kingsNotAdjacentRule: SetupRule = {
  id: 'kings-not-adjacent',
  summary: 'Kings not on adjacent squares',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const white = kingSquare(position, 'w');
    const black = kingSquare(position, 'b');

    // With no single king per side, rule 1 already reports the problem.
    if (white === null || black === null) return [];
    if (!areAdjacent(white, black)) return [];

    return [
      issue(
        'kings-not-adjacent',
        `The kings are touching (${white} and ${black}). Kings must always stay at least one square apart.`,
      ),
    ];
  },
};
