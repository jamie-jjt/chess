import { colorLabel, describeResult } from '../engine';
import type { GameResult, PieceColor } from '../engine';

interface TurnIndicatorProps {
  readonly turn: PieceColor;
  readonly isCheck: boolean;
  readonly result: GameResult;
  readonly prefix?: string;
}

export function TurnIndicator({ turn, isCheck, result, prefix }: TurnIndicatorProps): JSX.Element {
  const finished = describeResult(result, turn);
  const text = finished === null ? `${colorLabel(turn)} to move` : finished.headline;
  return (
    <div className="status" role="status" aria-live="off" aria-label="Game status">
      <span className={`status__dot status__dot--${turn === 'w' ? 'white' : 'black'}`} aria-hidden="true" />
      <div className="status__copy">
        {prefix !== undefined && <span className="status__prefix">{prefix}</span>}
        <span className="status__text">{text}</span>
      </div>
      {finished === null && isCheck && <span className="status__check">Check</span>}
    </div>
  );
}
