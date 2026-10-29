import { ChessGame, NO_CASTLING, colorLabel, kingSquare, oppositeColor, setupToFen } from '../engine';
import type { SetupPosition } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

/**
 * Rule 6: the side that is not to move must not be in check.
 *
 * Such a position cannot be reached: the player who just moved would have left
 * their own king attacked, which is never legal. It also breaks the game
 * immediately, since the checked king could simply be captured.
 *
 * Attack detection comes from chess.js via `ChessGame.isAttackedBy`. The probe
 * FEN drops the en passant square and the castling rights, neither of which
 * affects what attacks what, so that this rule can still run while those two
 * fields are being edited.
 */
export const sideNotToMoveSafeRule: SetupRule = {
  id: 'side-not-to-move-safe',
  summary: 'The side not to move must not be in check',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const waiting = oppositeColor(position.sideToMove);
    const waitingKing = kingSquare(position, waiting);

    // Without exactly one king each, rule 1 is the one that needs answering.
    if (waitingKing === null) return [];

    const probeFen = setupToFen({
      ...position,
      enPassant: null,
      castling: NO_CASTLING,
      halfMoveClock: 0,
      fullMoveNumber: 1,
    });
    const game = ChessGame.tryFrom(probeFen);

    // Unloadable for some other reason; the rule that explains it will fire.
    if (game === null) return [];
    if (!game.isAttackedBy(waitingKing, position.sideToMove)) return [];

    const attackers = game.attackersOf(waitingKing, position.sideToMove);
    const from = attackers.length === 0 ? '' : ` from ${[...attackers].sort().join(', ')}`;

    return [
      issue(
        'side-not-to-move-safe',
        `${colorLabel(waiting)} is in check${from}, but it is ${colorLabel(position.sideToMove)} to move. ` +
          `The side waiting cannot already be in check — switch the side to move, or move the attacking piece.`,
      ),
    ];
  },
};
