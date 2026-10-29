import { entriesOf, rankOf } from '../engine';
import type { SetupPosition } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

/**
 * Rule 5: no pawn may stand on rank 1 or rank 8.
 *
 * A pawn reaching the far rank must promote, and no pawn can move backwards to
 * its own first rank.
 */
export const pawnsOffBackRanksRule: SetupRule = {
  id: 'pawns-off-back-ranks',
  summary: 'No pawns on rank 1 or rank 8',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const offenders = entriesOf(position)
      .filter((entry) => entry.piece.type === 'p')
      .filter((entry) => rankOf(entry.square) === 1 || rankOf(entry.square) === 8)
      .map((entry) => entry.square)
      .sort();

    if (offenders.length === 0) return [];

    return [
      issue(
        'pawns-off-back-ranks',
        offenders.length === 1
          ? `A pawn is on ${offenders[0] ?? ''}. Pawns cannot stand on rank 1 or rank 8.`
          : `Pawns are on ${offenders.join(', ')}. Pawns cannot stand on rank 1 or rank 8.`,
      ),
    ];
  },
};
