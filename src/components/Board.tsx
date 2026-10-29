import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { BoardCell, BoardMatrix, MoveRecord, PieceColor, SquareId } from '../engine';
import { squareShade } from '../engine';
import { Square } from './Square';

interface BoardProps {
  readonly board: BoardMatrix;
  readonly orientation: PieceColor;
  readonly draggable: PieceColor | 'both' | 'none';
  readonly selectedSquare: SquareId | null;
  readonly legalTargets: readonly SquareId[];
  readonly lastMove: MoveRecord | null;
  readonly checkedKingSquare: SquareId | null;
  readonly disabled: boolean;
  readonly onSquareSelect: (square: SquareId) => void;
  readonly onPieceDrop: (from: SquareId, to: SquareId) => void;
}

function canDragPiece(draggable: PieceColor | 'both' | 'none', piece: BoardCell['piece']): boolean {
  if (piece === null || draggable === 'none') return false;
  return draggable === 'both' || piece.color === draggable;
}

export function Board(props: BoardProps): JSX.Element {
  const [dragFrom, setDragFrom] = useState<SquareId | null>(null);
  const [dragOver, setDragOver] = useState<SquareId | null>(null);
  const rows = useMemo<readonly (readonly BoardCell[])[]>(() => {
    if (props.orientation === 'w') return props.board;
    return props.board.map((row) => [...row].reverse()).reverse();
  }, [props.board, props.orientation]);
  const visualSquares = useMemo(() => rows.flat().map((cell) => cell.square), [rows]);
  const [activeSquare, setActiveSquare] = useState<SquareId>(() => visualSquares[0] ?? 'a8');
  const targets = useMemo(() => new Set<SquareId>(props.legalTargets), [props.legalTargets]);

  const moveFocus = (index: number): void => {
    const target = visualSquares[Math.max(0, Math.min(63, index))];
    if (target === undefined) return;
    setActiveSquare(target);
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-testid="square-${target}"]`)?.focus();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, square: SquareId): void => {
    const index = visualSquares.indexOf(square);
    if (index < 0) return;
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = index % 8 === 0 ? index : index - 1;
    if (event.key === 'ArrowRight') next = index % 8 === 7 ? index : index + 1;
    if (event.key === 'ArrowUp') next = index < 8 ? index : index - 8;
    if (event.key === 'ArrowDown') next = index > 55 ? index : index + 8;
    if (event.key === 'Home') next = event.ctrlKey ? 0 : Math.floor(index / 8) * 8;
    if (event.key === 'End') next = event.ctrlKey ? 63 : Math.floor(index / 8) * 8 + 7;
    if (next !== null) {
      event.preventDefault();
      moveFocus(next);
      return;
    }
    if (event.key === 'Escape' && props.selectedSquare !== null && !props.disabled) {
      event.preventDefault();
      props.onSquareSelect(props.selectedSquare);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && !props.disabled) {
      event.preventDefault();
      props.onSquareSelect(square);
    }
  };

  const handleDrop = (to: SquareId): void => {
    const from = dragFrom;
    setDragFrom(null);
    setDragOver(null);
    if (!props.disabled && from !== null && from !== to) props.onPieceDrop(from, to);
  };

  return (
    <div className="board-scroll" role="group" aria-label="Chess board viewport">
      <p className="board-scroll__hint">Scroll sideways to see the full board.</p>
      <div
        className="board"
        role="grid"
        aria-label="Chess board"
        aria-describedby="board-instructions"
        aria-disabled={props.disabled}
      >
        <span id="board-instructions" className="visually-hidden">
          Use arrow keys to inspect squares. Press Enter or Space to select and move. Press Escape to clear a selection.
        </span>
        {rows.map((row, rowIndex) => (
          <div className="board__row" role="row" key={`row-${String(rowIndex)}`}>
            {row.map((cell, colIndex) => (
              <div role="gridcell" className="board__cell" key={cell.square}>
                <Square
                  cell={cell}
                  shade={squareShade(cell.square)}
                  isSelected={props.selectedSquare === cell.square}
                  isLegalTarget={targets.has(cell.square)}
                  isLastMove={props.lastMove !== null && (props.lastMove.from === cell.square || props.lastMove.to === cell.square)}
                  isCheckedKing={props.checkedKingSquare === cell.square}
                  isDragOver={dragOver === cell.square}
                  canDrag={!props.disabled && canDragPiece(props.draggable, cell.piece)}
                  disabled={props.disabled}
                  tabIndex={activeSquare === cell.square ? 0 : -1}
                  fileLabel={rowIndex === 7 ? (cell.square[0] ?? null) : null}
                  rankLabel={colIndex === 0 ? (cell.square[1] ?? null) : null}
                  onFocus={setActiveSquare}
                  onKeyDown={handleKeyDown}
                  onSelect={props.onSquareSelect}
                  onDragStartPiece={setDragFrom}
                  onDragEndPiece={() => { setDragFrom(null); setDragOver(null); }}
                  onDragOverSquare={setDragOver}
                  onDropPiece={handleDrop}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
