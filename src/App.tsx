import { useState } from 'react';
import type { Difficulty } from './ai';
import { AppFrame } from './components/AppFrame';
import { START_FEN } from './engine';
import type { PieceColor } from './engine';
import { ComputerGameScreen } from './screens/ComputerGameScreen';
import { ComputerSetupScreen } from './screens/ComputerSetupScreen';
import { GameScreen } from './screens/GameScreen';
import { SetupScreen } from './screens/SetupScreen';
import type { CustomStart } from './screens/SetupScreen';
import { StartScreen } from './screens/StartScreen';
import type { GameMode } from './screens/StartScreen';

interface CustomContext { readonly fen: string; readonly orientation: PieceColor; }
type Screen =
  | { readonly name: 'start' }
  | { readonly name: 'two-player'; readonly initialFen?: string; readonly orientation?: PieceColor }
  | { readonly name: 'computer-setup'; readonly custom?: CustomContext }
  | { readonly name: 'computer'; readonly playerColor: PieceColor; readonly difficulty: Difficulty; readonly custom?: CustomContext }
  | { readonly name: 'custom-setup'; readonly initialFen?: string };

const AVAILABLE_MODES: readonly GameMode[] = ['two-player', 'computer', 'custom'];
function screenContext(screen: Screen): string {
  if (screen.name === 'start') return 'Choose a game';
  if (screen.name === 'computer-setup') return 'Match setup';
  if (screen.name === 'computer') return 'Vs computer';
  if (screen.name === 'custom-setup') return 'Position editor';
  return 'Two players';
}

export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'start' });
  const toStart = (): void => setScreen({ name: 'start' });
  let content: JSX.Element;

  switch (screen.name) {
    case 'two-player':
      content = <GameScreen key={screen.initialFen ?? 'standard'} onExit={toStart} {...(screen.initialFen === undefined ? {} : { initialFen: screen.initialFen })} {...(screen.orientation === undefined ? {} : { orientation: screen.orientation })} />;
      break;
    case 'computer-setup':
      content = (
        <ComputerSetupScreen
          {...(screen.custom === undefined ? {} : { positionLabel: 'your custom position' })}
          onBack={() => { if (screen.custom === undefined) toStart(); else setScreen({ name: 'custom-setup', initialFen: screen.custom.fen }); }}
          onStart={({ playerColor, difficulty }) => setScreen({ name: 'computer', playerColor, difficulty, ...(screen.custom === undefined ? {} : { custom: screen.custom }) })}
        />
      );
      break;
    case 'computer':
      content = <ComputerGameScreen key={`${screen.playerColor}-${screen.difficulty}-${screen.custom?.fen ?? START_FEN}`} playerColor={screen.playerColor} difficulty={screen.difficulty} onExit={toStart} {...(screen.custom === undefined ? {} : { initialFen: screen.custom.fen })} />;
      break;
    case 'custom-setup':
      content = (
        <SetupScreen
          onExit={toStart}
          {...(screen.initialFen === undefined ? {} : { initialFen: screen.initialFen })}
          onStartTwoPlayer={({ fen, orientation }: CustomStart) => setScreen({ name: 'two-player', initialFen: fen, orientation })}
          onStartVsComputer={({ fen, orientation }: CustomStart) => setScreen({ name: 'computer-setup', custom: { fen, orientation } })}
        />
      );
      break;
    case 'start':
      content = <StartScreen availableModes={AVAILABLE_MODES} onSelectMode={(mode) => { if (mode === 'two-player') setScreen({ name: 'two-player' }); if (mode === 'computer') setScreen({ name: 'computer-setup' }); if (mode === 'custom') setScreen({ name: 'custom-setup' }); }} />;
  }
  return <AppFrame context={screenContext(screen)}>{content}</AppFrame>;
}
