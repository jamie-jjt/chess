import type { SetupPosition } from '../engine';
import { castlingRightsRule } from './castlingRights';
import { enPassantSquareRule } from './enPassantSquare';
import { gameAlreadyOverRule } from './gameAlreadyOver';
import { kingsNotAdjacentRule } from './kingsNotAdjacent';
import { oneKingPerSideRule } from './oneKingPerSide';
import { pawnCountRule } from './pawnCount';
import { pawnsOffBackRanksRule } from './pawnsOffBackRanks';
import { pieceCountRule } from './pieceCount';
import { promotionAccountingRule } from './promotionAccounting';
import { sideNotToMoveSafeRule } from './sideNotToMoveSafe';
import { strictBishopsRule } from './strictBishops';
import type { SetupRule, SetupValidation, ValidationIssue } from './types';

/**
 * Every rule, in the order their messages read best: what is on the board,
 * then how much of it, then the state fields, then the optional one, and the
 * warning last.
 */
export const SETUP_RULES: readonly SetupRule[] = [
  oneKingPerSideRule,
  kingsNotAdjacentRule,
  pawnsOffBackRanksRule,
  pawnCountRule,
  pieceCountRule,
  promotionAccountingRule,
  sideNotToMoveSafeRule,
  castlingRightsRule,
  enPassantSquareRule,
  strictBishopsRule,
  gameAlreadyOverRule,
];

/**
 * Runs every rule. Errors block play; warnings are reported but do not.
 */
export function validateSetup(position: SetupPosition): SetupValidation {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (const rule of SETUP_RULES) {
    for (const problem of rule.check(position)) {
      if (problem.severity === 'warning') warnings.push(problem);
      else errors.push(problem);
    }
  }

  return {
    issues: [...errors, ...warnings],
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

export { castlingRightsRule, availableCastlingRights, CASTLING_REQUIREMENTS } from './castlingRights';
export type { CastlingRequirement } from './castlingRights';
export { enPassantSquareRule, enPassantCandidates, enPassantGeometry } from './enPassantSquare';
export { gameAlreadyOverRule } from './gameAlreadyOver';
export { kingsNotAdjacentRule } from './kingsNotAdjacent';
export { oneKingPerSideRule } from './oneKingPerSide';
export { MAX_PAWNS_PER_SIDE, pawnCountRule } from './pawnCount';
export { pawnsOffBackRanksRule } from './pawnsOffBackRanks';
export { MAX_PIECES_PER_SIDE, pieceCountRule } from './pieceCount';
export { promotionAccounting, promotionAccountingRule } from './promotionAccounting';
export { sideNotToMoveSafeRule } from './sideNotToMoveSafe';
export { strictBishopsRule } from './strictBishops';
export { issue, warning } from './types';
export type {
  IssueSeverity,
  RuleId,
  SetupRule,
  SetupValidation,
  ValidationIssue,
} from './types';
