import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { colorLabel, describeResult, oppositeColor } from '../engine';
import type { PieceColor } from '../engine';
import type { UseGameValue } from '../hooks/useGame';
import { useFullscreen } from '../hooks/useFullscreen';
import { Board } from './Board';
import { ConfirmDialog } from './ConfirmDialog';
import { FullscreenButton } from './FullscreenButton';
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
  readonly fullscreenStatus?: string | undefined;
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
  fullscreenStatus,
}: GameViewProps): JSX.Element {
  const { snapshot } = game;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [stageBackground, setStageBackground] = useState<HTMLDivElement | null>(null);
  const [localOverlayHost, setLocalOverlayHost] = useState<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(stageRef);
  const topColor = oppositeColor(orientation);
  const complete = game.isGameOver;
  const hasMoves = snapshot.history.length > 0;
  const resultDescription = describeResult(snapshot.result, snapshot.turn);
  const castlingHint = game.castlingTargets.length === 0
    ? null
    : `Castling available — select your king, then ${game.castlingTargets.join(' or ')}.`;
  const boardStatus = fullscreenStatus
    ?? castlingHint
    ?? resultDescription?.headline
    ?? `${colorLabel(snapshot.turn)} to move${snapshot.isCheck ? ' · Check' : ''}`;
  const localPortalTarget = fullscreen.active && localOverlayHost !== null
    ? localOverlayHost
    : document.getElementById('dialog-root') ?? document.body;
  const localInertTarget = fullscreen.active ? stageBackground : undefined;

  const focusSquare = (square: string): void => {
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-testid="square-${square}"]`)?.focus());
  };
  const undoMove = (): void => {
    const target = snapshot.lastMove?.from ?? (orientation === 'w' ? 'a8' : 'h1');
    game.undo();
    focusSquare(target);
  };
  const restartGame = (): void => {
    game.restart();
    focusSquare(orientation === 'w' ? 'a8' : 'h1');
  };
  const requestRestart = (): void => {
    if (!hasMoves) restartGame();
    else setPendingAction('restart');
  };
  const requestExit = (): void => {
    if (!hasMoves || complete) onExit();
    else setPendingAction('exit');
  };
  const confirmAction = (): void => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'restart') restartGame();
    if (action === 'exit') onExit();
  };

  return (
    <main className="game">
      <div className="game__layout">
        <section className="game__play" aria-label="Game board">
          <PlayerStrip color={topColor} label={topPlayerLabel ?? colorLabel(topColor)} active={!complete && snapshot.turn === topColor} complete={complete} />
          <div ref={stageRef} className="game__board-stage" data-testid="board-fullscreen-stage">
            <div ref={setStageBackground} className="game__board-stage-background">
              <GameAnnouncer history={snapshot.history} turn={snapshot.turn} isCheck={snapshot.isCheck} result={snapshot.result} />
              <div className="visually-hidden" aria-live="polite" aria-atomic="true">
                {castlingHint}
              </div>
              <div className="visually-hidden" aria-live="polite" aria-atomic="true">
                {fullscreen.active ? fullscreenStatus : null}
              </div>
              <div className="game__board-area">
                <Board
                  board={snapshot.board}
                  orientation={orientation}
                  draggable={snapshot.turn}
                  selectedSquare={game.selectedSquare}
                  legalTargets={game.legalTargets}
                  castlingTargets={game.castlingTargets}
                  lastMove={snapshot.lastMove}
                  checkedKingSquare={snapshot.checkedKingSquare}
                  disabled={complete || game.pendingPromotion !== null || boardLocked}
                  onSquareSelect={game.selectSquare}
                  onPieceDrop={game.playMove}
                />
              </div>
              <div className="game__fullscreen-control">
                <FullscreenButton fullscreen={fullscreen} />
              </div>
              <p className="game__fullscreen-status" aria-live="off">{boardStatus}</p>
            </div>
            <div ref={setLocalOverlayHost} className="game__local-overlays" />
            {game.pendingPromotion !== null && createPortal(
              <div className="board-overlay">
                <PromotionPicker
                  color={game.pendingPromotion.color}
                  sourceSquare={game.pendingPromotion.from}
                  targetSquare={game.pendingPromotion.to}
                  onChoose={game.confirmPromotion}
                  onCancel={game.cancelPromotion}
                  inertTarget={localInertTarget}
                />
              </div>,
              localPortalTarget,
            )}
          </div>
          <PlayerStrip color={orientation} label={bottomPlayerLabel ?? colorLabel(orientation)} active={!complete && snapshot.turn === orientation} complete={complete} />
        </section>

        <aside className="game__panel" aria-label="Game ledger">
          <div className="game__status-block">
            <p className="panel__title">Game status</p>
            <h1 className="game__title">{title}</h1>
            <TurnIndicator turn={snapshot.turn} isCheck={snapshot.isCheck} result={snapshot.result} />
            <p className="game__instruction">{boardLocked ? 'You can inspect the board while you wait.' : 'Select a piece, then choose a marked square.'}</p>
            {castlingHint !== null && <p className="game__castle-availability">{castlingHint}</p>}
            <p className="game__castle-help">
              <strong>How to castle:</strong> select your king, then c1 or g1 for White, or c8 or g8 for Black. The king and rook must be unmoved, the path clear, the king out of check, and its transit and destination squares unattacked.
            </p>
            {headerSlot}
          </div>
          {noticeSlot}
          <details className="game__moves-details" open>
            <summary>Move ledger</summary>
            <MoveList history={snapshot.history} />
          </details>
          <div className="game__actions-block">
            <p className="panel__title">Game actions</p>
            <GameControls canUndo={game.canUndo} onUndo={undoMove} onRestart={requestRestart} onExit={requestExit} undoLabel={undoLabel} />
          </div>
          {panelSlot}
          <details className="position-details">
            <summary>Position details</summary>
            <p className="game__fen" aria-label="Current FEN">{snapshot.fen}</p>
          </details>
          <p className="game__key-hint">Arrow keys move focus · Enter selects · Esc clears</p>
        </aside>
      </div>

      <GameOverModal
        result={snapshot.result}
        sideToMove={snapshot.turn}
        onRestart={restartGame}
        onExit={onExit}
        portalTarget={fullscreen.active ? localOverlayHost : undefined}
        inertTarget={localInertTarget}
      />
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
