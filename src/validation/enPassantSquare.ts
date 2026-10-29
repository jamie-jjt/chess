import { FILES, colorLabel, oppositeColor, rankOf, toSquareId } from '../engine';
import type { FileLetter, PieceColor, RankNumber, SetupPosition, SquareId } from '../engine';
import { issue } from './types';
import type { SetupRule, ValidationIssue } from './types';

interface EnPassantGeometry {
  /** Rank the target square sits on. */
  readonly targetRank: RankNumber;
  /** Rank the pawn that just moved now stands on. */
  readonly pawnRank: RankNumber;
  /** Rank the pawn started from; it must now be empty. */
  readonly originRank: RankNumber;
  /** Colour of the pawn that made the double move. */
  readonly pawnColor: PieceColor;
}

/**
 * With White to move, Black must have just played a two-square push: from rank
 * 7, through rank 6 (the target), landing on rank 5. Mirror image for Black.
 */
export function enPassantGeometry(sideToMove: PieceColor): EnPassantGeometry {
  return sideToMove === 'w'
    ? { targetRank: 6, pawnRank: 5, originRank: 7, pawnColor: 'b' }
    : { targetRank: 3, pawnRank: 4, originRank: 2, pawnColor: 'w' };
}

/** The eight squares that could legitimately be the target, for the editor's picker. */
export function enPassantCandidates(sideToMove: PieceColor): readonly SquareId[] {
  const { targetRank } = enPassantGeometry(sideToMove);
  return FILES.map((file: FileLetter) => toSquareId(file, targetRank));
}

/**
 * Rule 8: an en passant target must match a pawn that has just made a
 * two-square move.
 *
 * Four things have to line up: the target is on the right rank for the side to
 * move, the target square is empty, the moving pawn stands immediately beyond
 * it, and the square it came from is empty.
 */
export const enPassantSquareRule: SetupRule = {
  id: 'en-passant-square',
  summary: 'En passant square must match a pawn that just moved two squares',
  severity: 'error',
  check(position: SetupPosition): readonly ValidationIssue[] {
    const target = position.enPassant;
    if (target === null) return [];

    const mover = colorLabel(position.sideToMove);
    const geometry = enPassantGeometry(position.sideToMove);
    const pusher = colorLabel(oppositeColor(position.sideToMove));

    if (rankOf(target) !== geometry.targetRank) {
      return [
        issue(
          'en-passant-square',
          `With ${mover} to move, the en passant square must be on rank ${String(geometry.targetRank)}, because the pawn that just moved would be ${pusher}'s. ${target} is on rank ${String(rankOf(target))}.`,
        ),
      ];
    }

    const file = target[0];
    if (file === undefined) return [];
    const fileLetter = file as FileLetter;

    const pawnSquare = toSquareId(fileLetter, geometry.pawnRank);
    const originSquare = toSquareId(fileLetter, geometry.originRank);

    if (position.pieces.has(target)) {
      return [
        issue(
          'en-passant-square',
          `${target} is the en passant square, so it has to be empty — the pawn that just moved passed over it.`,
        ),
      ];
    }

    const pawn = position.pieces.get(pawnSquare);
    if (pawn === undefined || pawn.type !== 'p' || pawn.color !== geometry.pawnColor) {
      return [
        issue(
          'en-passant-square',
          `${target} can only be the en passant square if a ${pusher.toLowerCase()} pawn has just moved two squares and is standing on ${pawnSquare}.`,
        ),
      ];
    }

    if (position.pieces.has(originSquare)) {
      return [
        issue(
          'en-passant-square',
          `The pawn now on ${pawnSquare} would have come from ${originSquare}, so ${originSquare} must be empty.`,
        ),
      ];
    }

    return [];
  },
};
