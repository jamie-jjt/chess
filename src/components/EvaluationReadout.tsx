import { colorLabel } from '../engine';
import type { EngineEvaluation } from '../hooks/useComputerGame';

/**
 * Renders a score the way chess software conventionally does: signed pawns from
 * White's point of view, or a mate distance when one is forced.
 */
export function formatEvaluation(evaluation: EngineEvaluation): string {
  if (evaluation.mateIn !== null) {
    const moves = Math.abs(evaluation.mateIn);
    const winner = colorLabel(evaluation.mateIn > 0 ? 'w' : 'b');
    return moves === 0 ? `${winner} has mated` : `Mate in ${String(moves)} for ${winner}`;
  }

  if (evaluation.pawns === null) return 'Even';

  const rounded = Math.abs(evaluation.pawns) < 0.05 ? 0 : evaluation.pawns;
  if (rounded === 0) return 'Level';

  const sign = rounded > 0 ? '+' : '\u2212';
  return `${sign}${Math.abs(rounded).toFixed(2)}`;
}

interface EvaluationReadoutProps {
  readonly evaluation: EngineEvaluation | null;
}

export function EvaluationReadout({ evaluation }: EvaluationReadoutProps): JSX.Element | null {
  if (evaluation === null) return null;

  return (
    <p className="evaluation" data-testid="evaluation">
      <span className="evaluation__label">Engine sees</span>
      <strong className="evaluation__score">{formatEvaluation(evaluation)}</strong>
      {evaluation.depth !== null && (
        <span className="evaluation__depth">at depth {evaluation.depth}</span>
      )}
      <span className="evaluation__note">Positive favours White.</span>
    </p>
  );
}
