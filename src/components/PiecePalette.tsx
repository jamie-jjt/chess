import { colorLabel, pieceLabel } from '../engine';
import type { PieceColor, PlacedPiece } from '../engine';
import type { PaletteEntry } from '../hooks/useSetup';
import { Icon } from './Icon';
import { Piece } from './Piece';

interface PiecePaletteProps { readonly palette: readonly PaletteEntry[]; readonly selectedPiece: PlacedPiece | null; readonly onSelect: (piece: PlacedPiece | null) => void; }
function isSame(a: PlacedPiece | null, b: PlacedPiece): boolean { return a !== null && a.color === b.color && a.type === b.type; }

export function PiecePalette({ palette, selectedPiece, onSelect }: PiecePaletteProps): JSX.Element {
  const row = (color: PieceColor): JSX.Element => (
    <div className="palette__row">
      <span className="palette__row-label">{colorLabel(color)}</span>
      <div className="palette__grid">
        {palette.filter((entry) => entry.piece.color === color).map((entry) => {
          const selected = isSame(selectedPiece, entry.piece);
          const name = `${colorLabel(entry.piece.color)} ${pieceLabel(entry.piece.type)}`;
          return (
            <button key={`${entry.piece.color}${entry.piece.type}`} type="button" className={`palette__item${selected ? ' palette__item--selected' : ''}`} aria-pressed={selected} aria-label={`${name}, ${String(entry.count)} on board`} data-testid={`palette-${entry.piece.color}${entry.piece.type}`} onClick={() => onSelect(selected ? null : entry.piece)}>
              <Piece piece={entry.piece} draggable={false} onDragStart={() => undefined} onDragEnd={() => undefined} />
              <span className="palette__count">{entry.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="palette">
      <div className="palette__heading">
        <h2 className="panel__title">Pieces</h2>
        <button type="button" className={`palette__remove${selectedPiece === null ? ' palette__remove--selected' : ''}`} aria-pressed={selectedPiece === null} onClick={() => onSelect(null)}><Icon name="remove"/>Remove</button>
      </div>
      <div role="region" aria-label="Piece palette">{row('w')}{row('b')}</div>
      <p className="palette__hint">
        {selectedPiece === null
          ? 'Remove selected. Click a square to clear it, or choose a piece to place.'
          : `${colorLabel(selectedPiece.color)} ${pieceLabel(selectedPiece.type).toLowerCase()} selected. Click a square to place the ${colorLabel(selectedPiece.color).toLowerCase()} ${pieceLabel(selectedPiece.type)}.`}
      </p>
    </section>
  );
}
