import { createPortal } from 'react-dom';
import { describeResult } from '../engine';
import type { GameResult, PieceColor } from '../engine';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface GameOverModalProps {
  readonly result: GameResult;
  readonly sideToMove: PieceColor;
  readonly onRestart: () => void;
  readonly onExit: () => void;
}

function ResultDialog({ headline, detail, onRestart, onExit }: { readonly headline: string; readonly detail: string; readonly onRestart: () => void; readonly onExit: () => void }): JSX.Element {
  const ref = useDialogFocus<HTMLDivElement>({ initialFocusSelector: '[data-play-again]', inertBackground: true });
  return createPortal(
    <div className="modal-backdrop">
      <div ref={ref} className="modal modal--result" role="dialog" aria-modal="true" aria-labelledby="game-over-title" aria-describedby="game-over-detail">
        <p className="modal__eyebrow">Game complete</p>
        <h2 className="modal__title" id="game-over-title">{headline}</h2>
        <p className="modal__detail" id="game-over-detail">{detail}</p>
        <div className="modal__actions">
          <button type="button" className="button button--primary" onClick={onRestart} data-play-again>Play again</button>
          <button type="button" className="button button--ghost" onClick={onExit}>Main menu</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function GameOverModal({ result, sideToMove, onRestart, onExit }: GameOverModalProps): JSX.Element | null {
  const description = describeResult(result, sideToMove);
  if (description === null) return null;
  return <ResultDialog headline={description.headline} detail={description.detail} onRestart={onRestart} onExit={onExit} />;
}
