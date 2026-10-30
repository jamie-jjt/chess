import { SetupEditor } from '../components/SetupEditor';
import type { PieceColor } from '../engine';
import { useSetup } from '../hooks/useSetup';

export interface CustomStart { readonly fen: string; readonly orientation: PieceColor; }
interface SetupScreenProps {
  readonly onStartTwoPlayer?: (start: CustomStart) => void;
  readonly onStartVsComputer?: (start: CustomStart) => void;
  /** Backward-compatible local-game callback used by direct screen consumers. */
  readonly onStart?: (fen: string) => void;
  readonly onExit: () => void;
  readonly initialFen?: string;
  readonly writeClipboard?: (text: string) => Promise<void>;
}

export function SetupScreen({ onStartTwoPlayer, onStartVsComputer, onStart, onExit, initialFen, writeClipboard }: SetupScreenProps): JSX.Element {
  const setup = useSetup({
    ...(initialFen === undefined ? {} : { initialFen }),
    ...(writeClipboard === undefined ? {} : { writeClipboard }),
  });
  const startTwoPlayer = (start: CustomStart): void => {
    if (onStartTwoPlayer !== undefined) onStartTwoPlayer(start);
    else onStart?.(start.fen);
  };
  return <SetupEditor setup={setup} onStartTwoPlayer={startTwoPlayer} {...(onStartVsComputer === undefined ? {} : { onStartVsComputer })} onExit={onExit} />;
}
