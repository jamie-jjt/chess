import { Icon } from './Icon';

interface GameControlsProps {
  readonly canUndo: boolean;
  readonly onUndo: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
  readonly undoLabel?: string;
}

export function GameControls({ canUndo, onUndo, onRestart, onExit, undoLabel = 'Undo move' }: GameControlsProps): JSX.Element {
  return (
    <div className="controls game-actions" aria-label="Game actions">
      <button type="button" className="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
        <Icon name="undo"/><span>{undoLabel}</span>
      </button>
      <button type="button" className="button" onClick={onRestart}>
        <Icon name="restart"/><span>Restart</span>
      </button>
      <button type="button" className="button button--ghost" onClick={onExit}>
        <Icon name="menu"/><span>Main menu</span>
      </button>
    </div>
  );
}
