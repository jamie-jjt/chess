import { colorLabel, countOf, squareShade, squaresOf } from '../engine';
import type { PieceColor, SetupPosition } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

const COLORS: readonly PieceColor[] = ['w', 'b'];
const STARTING_PAWNS = 8;

interface Accounting {
  readonly pawns: number;
  readonly missingPawns: number;
  readonly promotionsNeeded: number;
  readonly reasons: readonly string[];
}

/**
 * How many promotions a side's material would require, and how many pawns it
 * has spare to pay for them.
 *
 * Bishops are counted per square colour rather than as a single total: one
 * light and one dark bishop is the starting pair and needs no promotion, while
 * two dark-squared bishops needs one, however few bishops there are overall.
 */
export function promotionAccounting(position: SetupPosition, color: PieceColor): Accounting {
  const pawns = countOf(position, color, 'p');
  const bishops = squaresOf(position, color, 'b');
  const dark = bishops.filter((square) => squareShade(square) === 'dark').length;
  const light = bishops.length - dark;

  const extras: readonly { readonly count: number; readonly label: string }[] = [
    { count: Math.max(0, countOf(position, color, 'q') - 1), label: 'queen' },
    { count: Math.max(0, countOf(position, color, 'r') - 2), label: 'rook' },
    { count: Math.max(0, countOf(position, color, 'n') - 2), label: 'knight' },
    { count: Math.max(0, dark - 1), label: 'dark-squared bishop' },
    { count: Math.max(0, light - 1), label: 'light-squared bishop' },
  ];

  const promotionsNeeded = extras.reduce((total, entry) => total + entry.count, 0);
  const reasons = extras
    .filter((entry) => entry.count > 0)
    .map((entry) => `${String(entry.count)} extra ${entry.label}${entry.count === 1 ? '' : 's'}`);

  return {
    pawns,
    missingPawns: Math.max(0, STARTING_PAWNS - pawns),
    promotionsNeeded,
    reasons,
  };
}

/**
 * Rule 9: material beyond the starting set has to be paid for by missing pawns.
 *
 * A side starts with one queen, two rooks, two knights and a bishop on each
 * square colour. Anything extra can only have come from promoting a pawn, and
 * each promotion costs one pawn. So a side holding three queens needs two
 * pawns to be gone, and a side with all eight pawns cannot have any extras at
 * all.
 *
 * This is not full retrograde analysis — it will not notice that the captures
 * needed to reach a position are impossible — but it catches the common case
 * of material that simply cannot exist.
 */
export const promotionAccountingRule: SetupRule = {
  id: 'promotion-accounting',
  summary: 'Extra pieces must be paid for by missing pawns',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const color of COLORS) {
      // More than eight pawns is rule 3's problem, and the sums below would be
      // meaningless.
      if (countOf(position, color, 'p') > STARTING_PAWNS) continue;

      const account = promotionAccounting(position, color);
      if (account.promotionsNeeded <= account.missingPawns) continue;

      issues.push(
        issue(
          'promotion-accounting',
          `${colorLabel(color)} has ${account.reasons.join(' and ')}, which needs ` +
            `${String(account.promotionsNeeded)} promoted ${account.promotionsNeeded === 1 ? 'pawn' : 'pawns'}, ` +
            `but only ${String(account.missingPawns)} of its ${String(STARTING_PAWNS)} pawns ` +
            `${account.missingPawns === 1 ? 'is' : 'are'} missing.`,
        ),
      );
    }

    return issues;
  },
};
