import { PROMOTION_PIECES, colorLabel, pieceLabel } from '../engine';
import type { PieceColor, PromotionPiece } from '../engine';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { Piece } from './Piece';

interface PromotionPickerProps {
  readonly color: PieceColor;
  readonly targetSquare: string;
  readonly onChoose: (piece: PromotionPiece) => void;
  readonly onCancel: () => void;
}

export function PromotionPicker({ color, targetSquare, onChoose, onCancel }: PromotionPickerProps): JSX.Element {
  const ref = useDialogFocus<HTMLDivElement>({ onEscape: onCancel, initialFocusSelector: '[data-promotion="q"]' });
  return (
    <div ref={ref} className="promotion" role="dialog" aria-modal="true" aria-labelledby="promotion-title" aria-describedby="promotion-detail">
      <p className="modal__eyebrow">Pawn promotion</p>
      <h2 className="promotion__title" id="promotion-title">Choose promotion piece</h2>
      <p className="promotion__detail" id="promotion-detail">{colorLabel(color)} pawn reached {targetSquare}.</p>
      <div className="promotion__options">
        {PROMOTION_PIECES.map((type) => (
          <button key={type} type="button" className="promotion__option" data-promotion={type} onClick={() => onChoose(type)}>
            <Piece piece={{ color, type }} draggable={false} onDragStart={() => undefined} onDragEnd={() => undefined} />
            <span className="promotion__label">{pieceLabel(type)}</span>
          </button>
        ))}
      </div>
      <button type="button" className="button button--ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}
