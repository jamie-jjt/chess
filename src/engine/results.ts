import { colorLabel } from './pieces';
import type { GameResult, PieceColor } from './types';

export interface ResultDescription {
  readonly headline: string;
  readonly detail: string;
}

/**
 * Plain-language wording for a finished game. Returns null while the game is
 * still in progress, so components can render on truthiness alone.
 */
export function describeResult(
  result: GameResult,
  sideToMove: PieceColor,
): ResultDescription | null {
  switch (result.type) {
    case 'in-progress':
      return null;

    case 'checkmate':
      return {
        headline: `Checkmate — ${colorLabel(result.winner)} wins`,
        detail: `${colorLabel(result.loser)} is in check and has no legal move.`,
      };

    case 'draw':
      switch (result.reason) {
        case 'stalemate':
          return {
            headline: 'Draw — stalemate',
            detail: `${colorLabel(sideToMove)} has no legal move but is not in check.`,
          };
        case 'threefold-repetition':
          return {
            headline: 'Draw — threefold repetition',
            detail: 'The same position has occurred three times.',
          };
        case 'fifty-move-rule':
          return {
            headline: 'Draw — fifty-move rule',
            detail: 'Fifty moves have passed with no capture and no pawn move.',
          };
        case 'insufficient-material':
          return {
            headline: 'Draw — insufficient material',
            detail: 'Neither side has enough material to force a checkmate.',
          };
      }
  }
}
