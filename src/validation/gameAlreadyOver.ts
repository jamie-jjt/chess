import { ChessGame, describeResult, setupToFen } from '../engine';
import type { SetupPosition } from '../engine';
import { warning } from './types';
import type { SetupRule, ValidationIssue } from './types';

/**
 * A warning, not an error: the position is legal but the game is already
 * decided, so it will end the moment it starts.
 *
 * Setting up a finished position on purpose is perfectly reasonable — a
 * stalemate to study, a mate to show someone — so this never blocks the start
 * button. It just means nobody is surprised by the modal that appears
 * immediately.
 */
export const gameAlreadyOverRule: SetupRule = {
  id: 'game-already-over',
  summary: 'Warns when the position is already finished',
  severity: 'warning',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const game = ChessGame.tryFrom(setupToFen(position));

    // Unloadable: an error-level rule explains why.
    if (game === null) return [];

    const result = game.result();
    if (result.type === 'in-progress') return [];

    const described = describeResult(result, position.sideToMove);
    if (described === null) return [];

    return [
      warning(
        'game-already-over',
        `This position is already over — ${described.headline.toLowerCase()}. ${described.detail} ` +
          `You can still start it, but the result shows straight away.`,
      ),
    ];
  },
};
