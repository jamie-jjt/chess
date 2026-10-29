import { SetupEditor } from '../components/SetupEditor';
import { useSetup } from '../hooks/useSetup';
import type { PieceColor } from '../engine';

export interface CustomStart {
  readonly fen: string;
  /** Which side the editor had at the bottom, carried into the game. */
  readonly orientation: PieceColor;
}

interface SetupScreenProps {
  readonly onStartTwoPlayer: (start: CustomStart) => void;
  readonly onStartVsComputer: (start: CustomStart) => void;
  readonly onExit: () => void;
  /** Position to open with; defaults to the standard setup. */
  readonly initialFen?: string;
}

export function SetupScreen({
  onStartTwoPlayer,
  onStartVsComputer,
  onExit,
  initialFen,
}: SetupScreenProps): JSX.Element {
  const setup = useSetup(initialFen === undefined ? {} : { initialFen });

  return (
    <SetupEditor
      setup={setup}
      onStartTwoPlayer={onStartTwoPlayer}
      onStartVsComputer={onStartVsComputer}
      onExit={onExit}
    />
  );
}
