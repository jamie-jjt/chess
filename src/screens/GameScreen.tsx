import { GameView } from '../components/GameView';
import type { PieceColor } from '../engine';
import { useGame } from '../hooks/useGame';

interface GameScreenProps {
  readonly onExit: () => void;
  /** Starting position; defaults to the standard setup. */
  readonly initialFen?: string;
  /** Which side sits at the bottom of the board. */
  readonly orientation?: PieceColor;
}

/** Two players sharing one device. Undo reverts a single half-move. */
export function GameScreen({
  onExit,
  initialFen,
  orientation = 'w',
}: GameScreenProps): JSX.Element {
  const game = useGame(initialFen === undefined ? {} : { initialFen });

  return (
    <GameView title="Two players" game={game} orientation={orientation} onExit={onExit} />
  );
}
