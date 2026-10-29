import type { PlacedPiece } from '../engine';
import { colorLabel, pieceLabel } from '../engine';
import { ChessPieceSvg } from './ChessPieceSvg';

export function describePiece(piece: PlacedPiece): string {
  return `${colorLabel(piece.color)} ${pieceLabel(piece.type)}`;
}

interface PieceProps {
  readonly piece: PlacedPiece;
  readonly draggable: boolean;
  readonly onDragStart: () => void;
  readonly onDragEnd: () => void;
}

export function Piece({ piece, draggable, onDragStart, onDragEnd }: PieceProps): JSX.Element {
  return (
    <span
      className={`piece piece--${piece.color === 'w' ? 'white' : 'black'}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-piece={`${piece.color}${piece.type}`}
      aria-hidden="true"
    >
      <ChessPieceSvg type={piece.type} color={piece.color} />
    </span>
  );
}
