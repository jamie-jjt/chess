import { EvaluationReadout } from '../components/EvaluationReadout';
import { GameView } from '../components/GameView';
import { ThinkingIndicator } from '../components/ThinkingIndicator';
import type { Difficulty, StockfishEngine } from '../ai';
import { colorLabel } from '../engine';
import type { PieceColor } from '../engine';
import { useComputerGame } from '../hooks/useComputerGame';

interface ComputerGameScreenProps {
  readonly playerColor: PieceColor;
  readonly difficulty: Difficulty;
  readonly onExit: () => void;
  readonly initialFen?: string;
  readonly createEngine?: () => StockfishEngine;
  readonly minVisibleThinkMs?: number;
}

export function ComputerGameScreen({ playerColor, difficulty, onExit, initialFen, createEngine, minVisibleThinkMs }: ComputerGameScreenProps): JSX.Element {
  const game = useComputerGame({
    playerColor,
    difficulty,
    ...(initialFen === undefined ? {} : { initialFen }),
    ...(createEngine === undefined ? {} : { createEngine }),
    ...(minVisibleThinkMs === undefined ? {} : { minVisibleThinkMs }),
  });
  const preset = game.difficulty;
  const thinkingLabel = game.isEngineLoading ? 'Stockfish is getting ready…' : `${preset.label} is thinking…`;

  return (
    <GameView
      title={`You play ${colorLabel(playerColor)}`}
      game={game}
      orientation={playerColor}
      onExit={onExit}
      boardLocked={!game.isPlayerTurn}
      topPlayerLabel={`Stockfish · ${preset.label}`}
      bottomPlayerLabel="You"
      fullscreenStatus={game.engineError !== null
        ? 'Stockfish could not continue.'
        : game.isEngineLoading
          ? 'Stockfish is getting ready…'
          : game.isThinking
            ? thinkingLabel
            : undefined}
      headerSlot={<ThinkingIndicator isThinking={game.isThinking} label={thinkingLabel} />}
      noticeSlot={game.engineError === null ? null : (
        <div className="notice notice--error" role="alert">
          <p className="notice__text">Stockfish could not continue: {game.engineError}</p>
          <div className="controls">
            <button type="button" className="button button--ghost" onClick={game.dismissEngineError}>Dismiss</button>
            <button type="button" className="button button--ghost" onClick={onExit}>Return to menu</button>
          </div>
        </div>
      )}
      panelSlot={
        <div className="game__engine-meta">
          <EvaluationReadout evaluation={game.evaluation} />
          <details className="engine-details">
            <summary>Opponent details</summary>
            <p className="game__opponent">
              Stockfish 19 lite · <strong>{preset.label}</strong> · skill {preset.skillLevel}, depth {preset.depth}. Undo takes back your move and the engine&apos;s reply.
            </p>
          </details>
        </div>
      }
    />
  );
}
