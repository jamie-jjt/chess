import { colorLabel, squareShade, squaresOf } from '../engine';
import type { PieceColor, SetupPosition, SquareId } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

const COLORS: readonly PieceColor[] = ['w', 'b'];
const SHADES: readonly ('light' | 'dark')[] = ['light', 'dark'];

/**
 * Rule 9, opt-in: at most one bishop per square colour per side.
 *
 * This is *not* a rule of chess. A side legitimately ends up with two
 * dark-squared bishops after promoting a pawn, so the rule only applies when
 * the editor's "strict bishops" box is ticked — someone building a textbook
 * position who wants the starting bishop pair enforced.
 */
export const strictBishopsRule: SetupRule = {
  id: 'strict-bishops',
  summary: 'Strict bishops: at most one bishop per square colour per side',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    if (!position.strictBishops) return [];

    const issues: ValidationIssue[] = [];

    for (const color of COLORS) {
      const bishops = squaresOf(position, color, 'b');

      for (const shade of SHADES) {
        const onShade: readonly SquareId[] = bishops.filter(
          (square) => squareShade(square) === shade,
        );
        if (onShade.length <= 1) continue;

        issues.push(
          issue(
            'strict-bishops',
            `${colorLabel(color)} has ${String(onShade.length)} bishops on ${shade} squares (${[...onShade].sort().join(', ')}). ` +
              `That is legal after a promotion — untick "strict bishops" to allow it.`,
          ),
        );
      }
    }

    return issues;
  },
};
