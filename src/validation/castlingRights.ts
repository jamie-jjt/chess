import { NO_CASTLING } from '../engine';
import type { CastlingFlag, CastlingRights, PieceColor, SetupPosition, SquareId } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

export interface CastlingRequirement {
  readonly flag: CastlingFlag;
  readonly color: PieceColor;
  readonly kingSquare: SquareId;
  readonly rookSquare: SquareId;
  /** How the right is written in a FEN. */
  readonly letter: string;
  readonly label: string;
}

export const CASTLING_REQUIREMENTS: readonly CastlingRequirement[] = [
  {
    flag: 'whiteKingSide',
    color: 'w',
    kingSquare: 'e1',
    rookSquare: 'h1',
    letter: 'K',
    label: 'White kingside',
  },
  {
    flag: 'whiteQueenSide',
    color: 'w',
    kingSquare: 'e1',
    rookSquare: 'a1',
    letter: 'Q',
    label: 'White queenside',
  },
  {
    flag: 'blackKingSide',
    color: 'b',
    kingSquare: 'e8',
    rookSquare: 'h8',
    letter: 'k',
    label: 'Black kingside',
  },
  {
    flag: 'blackQueenSide',
    color: 'b',
    kingSquare: 'e8',
    rookSquare: 'a8',
    letter: 'q',
    label: 'Black queenside',
  },
];

function isSatisfied(position: SetupPosition, requirement: CastlingRequirement): boolean {
  const king = position.pieces.get(requirement.kingSquare);
  const rook = position.pieces.get(requirement.rookSquare);

  return (
    king !== undefined &&
    king.type === 'k' &&
    king.color === requirement.color &&
    rook !== undefined &&
    rook.type === 'r' &&
    rook.color === requirement.color
  );
}

/**
 * Which castling rights the current placement could support. The editor uses
 * this to enable or disable each checkbox, and to drop rights that a piece move
 * has just invalidated.
 */
export function availableCastlingRights(position: SetupPosition): CastlingRights {
  const available: Record<CastlingFlag, boolean> = { ...NO_CASTLING };
  for (const requirement of CASTLING_REQUIREMENTS) {
    available[requirement.flag] = isSatisfied(position, requirement);
  }
  return available;
}

/**
 * Rule 7: a castling right needs the king and that side's rook still on their
 * starting squares. Neither can have moved, so both must be at home.
 */
export const castlingRightsRule: SetupRule = {
  id: 'castling-rights',
  summary: 'Castling rights need the king and rook on their starting squares',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const requirement of CASTLING_REQUIREMENTS) {
      if (!position.castling[requirement.flag]) continue;
      if (isSatisfied(position, requirement)) continue;

      issues.push(
        issue(
          'castling-rights',
          `${requirement.label} castling (${requirement.letter}) needs the king on ${requirement.kingSquare} and a rook on ${requirement.rookSquare}.`,
        ),
      );
    }

    return issues;
  },
};
