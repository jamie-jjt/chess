import type { DragEvent, KeyboardEvent } from 'react';
import type { BoardCell, SquareId } from '../engine';
import { Piece, describePiece } from './Piece';

interface SquareProps {
  readonly cell: BoardCell;
  readonly shade: 'light' | 'dark';
  readonly isSelected: boolean;
  readonly isLegalTarget: boolean;
  readonly isLastMove: boolean;
  readonly isCheckedKing: boolean;
  readonly isDragOver: boolean;
  readonly canDrag: boolean;
  readonly disabled: boolean;
  readonly tabIndex: number;
  readonly fileLabel: string | null;
  readonly rankLabel: string | null;
  readonly onSelect: (square: SquareId) => void;
  readonly onFocus: (square: SquareId) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, square: SquareId) => void;
  readonly onDragStartPiece: (square: SquareId) => void;
  readonly onDragEndPiece: () => void;
  readonly onDragOverSquare: (square: SquareId) => void;
  readonly onDropPiece: (square: SquareId) => void;
}

export function Square(props: SquareProps): JSX.Element {
  const { cell } = props;
  const occupant = cell.piece === null ? 'empty' : describePiece(cell.piece);
  const classes = ['square', `square--${props.shade}`];
  if (props.isSelected) classes.push('square--selected');
  if (props.isLastMove) classes.push('square--last-move');
  if (props.isCheckedKing) classes.push('square--check');
  if (props.isDragOver) classes.push('square--drag-over');
  if (props.isLegalTarget) classes.push(cell.piece === null ? 'square--target' : 'square--capture');

  const states: string[] = [];
  if (props.isSelected) states.push('selected');
  if (props.isLegalTarget) states.push(cell.piece === null ? 'legal destination' : 'legal capture');
  if (props.isLastMove) states.push('last move');
  if (props.isCheckedKing) states.push('king in check');
  if (props.disabled) states.push('moves currently unavailable');
  const stateId = `square-state-${cell.square}`;

  const handleDragOver = (event: DragEvent<HTMLButtonElement>): void => {
    if (props.disabled) return;
    event.preventDefault();
    props.onDragOverSquare(cell.square);
  };
  const handleDrop = (event: DragEvent<HTMLButtonElement>): void => {
    if (props.disabled) return;
    event.preventDefault();
    props.onDropPiece(cell.square);
  };

  return (
    <button
      type="button"
      className={classes.join(' ')}
      data-square={cell.square}
      data-testid={`square-${cell.square}`}
      aria-label={`${cell.square}, ${occupant}`}
      aria-selected={props.isSelected}
      aria-disabled={props.disabled}
      aria-describedby={states.length > 0 ? stateId : undefined}
      tabIndex={props.tabIndex}
      onFocus={() => props.onFocus(cell.square)}
      onClick={() => { if (!props.disabled) props.onSelect(cell.square); }}
      onKeyDown={(event) => props.onKeyDown(event, cell.square)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {props.rankLabel !== null && <span className="square__rank">{props.rankLabel}</span>}
      {props.fileLabel !== null && <span className="square__file">{props.fileLabel}</span>}
      {cell.piece !== null && (
        <Piece
          piece={cell.piece}
          draggable={props.canDrag}
          onDragStart={() => props.onDragStartPiece(cell.square)}
          onDragEnd={props.onDragEndPiece}
        />
      )}
      {states.length > 0 && <span id={stateId} className="visually-hidden">{states.join(', ')}</span>}
    </button>
  );
}
