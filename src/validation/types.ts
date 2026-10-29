import type { SetupPosition } from '../engine';

export type RuleId =
  | 'one-king-per-side'
  | 'kings-not-adjacent'
  | 'pawn-count'
  | 'piece-count'
  | 'pawns-off-back-ranks'
  | 'side-not-to-move-safe'
  | 'castling-rights'
  | 'en-passant-square'
  | 'promotion-accounting'
  | 'strict-bishops'
  | 'game-already-over';

/**
 * An error means the position cannot be played and blocks the start button.
 * A warning means the position is legal but worth knowing about, and does not
 * block anything.
 */
export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly rule: RuleId;
  readonly severity: IssueSeverity;
  /** Plain language, addressed to whoever is building the position. */
  readonly message: string;
}

export interface SetupRule {
  readonly id: RuleId;
  /** What the rule enforces, for the editor's rule list. */
  readonly summary: string;
  /** Warning-only rules are listed separately in the editor. */
  readonly severity: IssueSeverity;
  readonly check: (position: SetupPosition) => readonly ValidationIssue[];
}

export interface SetupValidation {
  /** Everything reported, errors first. */
  readonly issues: readonly ValidationIssue[];
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  /** True when nothing blocks play. Warnings do not count. */
  readonly isValid: boolean;
}

export function issue(rule: RuleId, message: string): ValidationIssue {
  return { rule, severity: 'error', message };
}

export function warning(rule: RuleId, message: string): ValidationIssue {
  return { rule, severity: 'warning', message };
}
