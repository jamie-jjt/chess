import { useState } from 'react';
import type { Difficulty } from './ai';
import { START_FEN } from './engine';
import type { PieceColor } from './engine';
import { ComputerGameScreen } from './screens/ComputerGameScreen';
import { ComputerSetupScreen } from './screens/ComputerSetupScreen';
import { GameScreen } from './screens/GameScreen';
import { SetupScreen } from './screens/SetupScreen';
import type { CustomStart } from './screens/SetupScreen';
import { StartScreen } from './screens/StartScreen';
import type { GameMode } from './screens/StartScreen';

interface CustomContext {
  readonly fen: string;
  readonly orientation: PieceColor;
}

type Screen =
  | { readonly name: 'start' }
  | {
      readonly name: 'two-player';
      readonly initialFen?: string;
      readonly orientation?: PieceColor;
    }
  | { readonly name: 'computer-setup'; readonly custom?: CustomContext }
  | {
      readonly name: 'computer';
      readonly playerColor: PieceColor;
      readonly difficulty: Difficulty;
      readonly custom?: CustomContext;
    }
  | { readonly name: 'custom-setup'; readonly initialFen?: string };

const AVAILABLE_MODES: readonly GameMode[] = ['two-player', 'computer', 'custom'];

export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });
  const toStart = (): void => setScreen({ name: 'start' });

  switch (screen.name) {
    case 'two-player':
      return (
        <GameScreen
          // A new starting position means a new game, not a reused one.
          key={screen.initialFen ?? 'standard'}
          onExit={toStart}
          {...(screen.initialFen === undefined ? {} : { initialFen: screen.initialFen })}
          {...(screen.orientation === undefined ? {} : { orientation: screen.orientation })}
        />
      );

    case 'computer-setup':
      return (
        <ComputerSetupScreen
          {...(screen.custom === undefined ? {} : { positionLabel: 'your custom position' })}
          onBack={() => {
            // Back goes where the player came from, keeping their work.
            if (screen.custom === undefined) toStart();
            else setScreen({ name: 'custom-setup', initialFen: screen.custom.fen });
          }}
          onStart={({ playerColor, difficulty }) => {
            setScreen({
              name: 'computer',
              playerColor,
              difficulty,
              ...(screen.custom === undefined ? {} : { custom: screen.custom }),
            });
          }}
        />
      );

    case 'computer':
      return (
        <ComputerGameScreen
          // Remounts on a colour, difficulty or position change: fresh game,
          // fresh engine.
          key={`${screen.playerColor}-${screen.difficulty}-${screen.custom?.fen ?? START_FEN}`}
          playerColor={screen.playerColor}
          difficulty={screen.difficulty}
          onExit={toStart}
          {...(screen.custom === undefined ? {} : { initialFen: screen.custom.fen })}
        />
      );

    case 'custom-setup':
      return (
        <SetupScreen
          onExit={toStart}
          {...(screen.initialFen === undefined ? {} : { initialFen: screen.initialFen })}
          onStartTwoPlayer={({ fen, orientation }: CustomStart) => {
            setScreen({ name: 'two-player', initialFen: fen, orientation });
          }}
          onStartVsComputer={({ fen, orientation }: CustomStart) => {
            setScreen({ name: 'computer-setup', custom: { fen, orientation } });
          }}
        />
      );

    case 'start':
      return (
        <StartScreen
          availableModes={AVAILABLE_MODES}
          onSelectMode={(mode) => {
            if (mode === 'two-player') setScreen({ name: 'two-player' });
            if (mode === 'computer') setScreen({ name: 'computer-setup' });
            if (mode === 'custom') setScreen({ name: 'custom-setup' });
          }}
        />
      );
  }
}
