import { useState } from 'react';
import type { ReactNode } from 'react';
import { colorLabel, oppositeColor } from '../engine';
import type { PieceColor } from '../engine';
import type { UseGameValue } from '../hooks/useGame';
import { Board } from './Board';
import { ConfirmDialog } from './ConfirmDialog';
import { GameAnnouncer } from './GameAnnouncer';
import { GameControls } from './GameControls';
import { GameOverModal } from './GameOverModal';
import { MoveList } from './MoveList';
import { PromotionPicker } from './PromotionPicker';
import { TurnIndicator } from './TurnIndicator';

interface GameViewProps {
  readonly title: string;
  readonly game: UseGameValue;
  readonly orientation: PieceColor;
  readonly onExit: () => void;
  readonly undoLabel?: string;
  readonly headerSlot?: ReactNode;
  readonly noticeSlot?: ReactNode;
  readonly boardLocked?: boolean;
  readonly panelSlot?: ReactNode;
  readonly topPlayerLabel?: string;
  readonly bottomPlayerLabel?: string;
}

type PendingAction = 'restart' | 'exit' | null;

function PlayerStrip({ color, label, active, complete }: { readonly color: PieceColor; readonly label: string; readonly active: boolean; readonly complete: boolean }): JSX.Element {
  return (
    <div className={`player-strip${active ? ' player-strip--active' : ''}`}>
      <span className={`player-strip__piece player-strip__piece--${color === 'w' ? 'white' : 'black'}`} aria-hidden="true" />
      <span className="player-strip__name">{label}</span>
      <span className="player-strip__state">{complete ? 'game complete' : active ? 'to move' : 'waiting'}</span>
    </div>
  );
}

export function GameView({
  title,
  game,
  orientation,
  onExit,
  undoLabel = 'Undo move',
  headerSlot,
  noticeSlot,
  boardLocked = false,
  panelSlot,
  topPlayerLabel,
  bottomPlayerLabel,
}: GameViewProps): JSX.Element {
  const { snapshot } = game;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const topColor = oppositeColor(orientation);
  const complete = game.isGameOver;
  const hasMoves = snapshot.history.length > 0;

  const requestRestart = (): void => {
    if (!hasMoves) game.restart();
    else setPendingAction('restart');
  };
  const requestExit = (): void => {
    if (!hasMoves || complete) onExit();
    else setPendingAction('exit');
  };
  const confirmAction = (): void => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'restart') game.restart();
    if (action === 'exit') onExit();
  };

  return (
    <main className="game">
      <GameAnnouncer history={snapshot.history} turn={snapshot.turn} isCheck={snapshot.isCheck} result={snapshot.result} />
      <div className="game__layout">
        <section className="game__play" aria-label="Game board">
          <PlayerStrip color={topColor} label={topPlayerLabel ?? colorLabel(topColor)} active={!complete && snapshot.turn === topColor} complete={complete} />
          <div className="game__board-stage">
            <div className="game__board-area">
              <Board
                board={snapshot.board}
                orientation={orientation}
                draggable={snapshot.turn}
                selectedSquare={game.selectedSquare}
                legalTargets={game.legalTargets}
                lastMove={snapshot.lastMove}
                checkedKingSquare={snapshot.checkedKingSquare}
                disabled={complete || game.pendingPromotion !== null || boardLocked}
                onSquareSelect={game.selectSquare}
                onPieceDrop={game.playMove}
              />
              {game.pendingPromotion !== null && (
                <div className="board-overlay">
                  <PromotionPicker color={game.pendingPromotion.color} targetSquare={game.pendingPromotion.to} onChoose={game.confirmPromotion} onCancel={game.cancelPromotion} />
                </div>
              )}
            </div>
          </div>
          <PlayerStrip color={orientation} label={bottomPlayerLabel ?? colorLabel(orientation)} active={!complete && snapshot.turn === orientation} complete={complete} />
        </section>

        <aside className="game__panel" aria-label="Game ledger">
          <div className="game__status-block">
            <p className="panel__title">Game status</p>
            <h1 className="game__title">{title}</h1>
            <TurnIndicator turn={snapshot.turn} isCheck={snapshot.isCheck} result={snapshot.result} />
            <p className="game__instruction">{boardLocked ? 'You can inspect the board while you wait.' : 'Select a piece, then choose a marked square.'}</p>
            {headerSlot}
          </div>
          {noticeSlot}
          <MoveList history={snapshot.history} />
          <div className="game__actions-block">
            <p className="panel__title">Game actions</p>
            <GameControls canUndo={game.canUndo} onUndo={game.undo} onRestart={requestRestart} onExit={requestExit} undoLabel={undoLabel} />
          </div>
          {panelSlot}
          <details className="position-details">
            <summary>Position details</summary>
            <p className="game__fen" aria-label="Current FEN">{snapshot.fen}</p>
          </details>
          <p className="game__key-hint">Arrow keys move focus · Enter selects · Esc clears</p>
        </aside>
      </div>

      <GameOverModal result={snapshot.result} sideToMove={snapshot.turn} onRestart={game.restart} onExit={onExit} />
      {pendingAction !== null && (
        <ConfirmDialog
          title={pendingAction === 'restart' ? 'Restart this game?' : 'Return to the main menu?'}
          detail={pendingAction === 'restart' ? 'The current moves will be cleared.' : 'The current game will be left without saving.'}
          confirmLabel={pendingAction === 'restart' ? 'Restart game' : 'Return to menu'}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </main>
  );
}
