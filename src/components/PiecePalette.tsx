import { colorLabel, pieceLabel } from '../engine';
import type { PlacedPiece } from '../engine';
import type { PaletteEntry } from '../hooks/useSetup';
import { Piece } from './Piece';

interface PiecePaletteProps {
  readonly palette: readonly PaletteEntry[];
  readonly selectedPiece: PlacedPiece | null;
  readonly onSelect: (piece: PlacedPiece | null) => void;
}

function isSame(a: PlacedPiece | null, b: PlacedPiece): boolean {
  return a !== null && a.color === b.color && a.type === b.type;
}

/**
 * All twelve piece types with a live count of each on the board. Picking one
 * arms it for placement; picking it again disarms, which is how you get back to
 * click-to-remove.
 */
export function PiecePalette({
  palette,
  selectedPiece,
  onSelect,
}: PiecePaletteProps): JSX.Element {
  return (
    <section className="palette" aria-label="Piece palette">
      <h2 className="panel__title">Pieces</h2>
      <div className="palette__grid">
        {palette.map((entry) => {
          const selected = isSame(selectedPiece, entry.piece);
          const name = `${colorLabel(entry.piece.color)} ${pieceLabel(entry.piece.type)}`;

          return (
            <button
              key={`${entry.piece.color}${entry.piece.type}`}
              type="button"
              className={`palette__item${selected ? ' palette__item--selected' : ''}`}
              aria-pressed={selected}
              aria-label={`${name}, ${String(entry.count)} on board`}
              data-testid={`palette-${entry.piece.color}${entry.piece.type}`}
              onClick={() => onSelect(selected ? null : entry.piece)}
            >
              <Piece
                piece={entry.piece}
                draggable={false}
                onDragStart={() => undefined}
                onDragEnd={() => undefined}
              />
              <span className="palette__count">{entry.count}</span>
            </button>
          );
        })}
      </div>
      <p className="palette__hint">
        {selectedPiece === null
          ? 'Click a square to clear it, or pick a piece above to place one. Pieces already on the board can be dragged.'
          : `Click a square to place the ${colorLabel(selectedPiece.color).toLowerCase()} ${pieceLabel(selectedPiece.type)}. Click the piece again to stop placing.`}
      </p>
    </section>
  );
}
