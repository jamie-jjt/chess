import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { PROMOTION_PIECES, colorLabel, pieceLabel } from '../engine';
import type { PieceColor, PromotionPiece } from '../engine';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { Piece } from './Piece';

interface PromotionPickerProps {
  readonly color: PieceColor;
  readonly sourceSquare: string;
  readonly targetSquare: string;
  readonly onChoose: (piece: PromotionPiece) => void;
  readonly onCancel: () => void;
  readonly inertTarget?: HTMLElement | null | undefined;
}

interface PromotionPosition extends CSSProperties {
  readonly '--promotion-anchor-inline'?: string;
}

type PlacementSide = 'above' | 'below';

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
);

export function PromotionPicker({ color, sourceSquare, targetSquare, onChoose, onCancel, inertTarget }: PromotionPickerProps): JSX.Element {
  const [position, setPosition] = useState<PromotionPosition>();
  const [placementSide, setPlacementSide] = useState<PlacementSide>('below');
  const cancel = (): void => {
    onCancel();
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-testid="square-${sourceSquare}"]`)?.focus());
  };
  const choose = (piece: PromotionPiece): void => {
    onChoose(piece);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-testid="square-${targetSquare}"]`)?.focus());
  };
  const ref = useDialogFocus<HTMLDivElement>({ onEscape: cancel, initialFocusSelector: '[data-promotion="q"]', inertBackground: true, inertTarget });

  useLayoutEffect(() => {
    const dialog = ref.current;
    const board = document.querySelector<HTMLElement>('.game__board-area .board');
    const target = document.querySelector<HTMLElement>(`.game__board-area [data-testid="square-${targetSquare}"]`);
    if (dialog === null || board === null || target === null) return;

    const updatePosition = (): void => {
      if (window.innerWidth <= 560) {
        setPosition(undefined);
        return;
      }

      const boardRect = board.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const dialogRect = dialog.getBoundingClientRect();
      const inset = 10;
      const gap = Math.max(8, targetRect.height * 0.12);
      const targetCenter = targetRect.left + targetRect.width / 2;
      const left = clamp(
        targetCenter - dialogRect.width / 2,
        boardRect.left + inset,
        boardRect.right - dialogRect.width - inset,
      );
      const roomBelow = boardRect.bottom - targetRect.bottom;
      const roomAbove = targetRect.top - boardRect.top;
      const placeBelow = roomBelow >= dialogRect.height + gap || roomBelow >= roomAbove;
      const preferredTop = placeBelow
        ? targetRect.bottom + gap
        : targetRect.top - dialogRect.height - gap;
      const top = clamp(
        preferredTop,
        boardRect.top + inset,
        boardRect.bottom - dialogRect.height - inset,
      );
      const anchorInline = clamp(targetCenter - left, 24, dialogRect.width - 24);

      setPlacementSide(placeBelow ? 'below' : 'above');
      setPosition({
        left,
        top,
        '--promotion-anchor-inline': `${String(anchorInline)}px`,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    observer?.observe(board);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      observer?.disconnect();
    };
  }, [ref, targetSquare]);

  return (
    <div
      ref={ref}
      className="promotion promotion--board-anchored"
      style={position}
      data-placement={placementSide}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promotion-title"
      aria-describedby="promotion-detail"
    >
      <p className="modal__eyebrow">Pawn promotion</p>
      <h2 className="promotion__title" id="promotion-title">Choose promotion piece</h2>
      <p className="promotion__detail" id="promotion-detail">{colorLabel(color)} pawn reached {targetSquare}.</p>
      <div className="promotion__options">
        {PROMOTION_PIECES.map((type) => (
          <button key={type} type="button" className="promotion__option" data-promotion={type} onClick={() => choose(type)}>
            <Piece piece={{ color, type }} draggable={false} onDragStart={() => undefined} onDragEnd={() => undefined} />
            <span className="promotion__label">{pieceLabel(type)}</span>
          </button>
        ))}
      </div>
      <button type="button" className="button button--ghost" onClick={cancel}>Cancel</button>
    </div>
  );
}
