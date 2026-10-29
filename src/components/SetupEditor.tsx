import { useState } from 'react';
import { CASTLING_FLAGS, colorLabel } from '../engine';
import type { CastlingFlag, PieceColor, SquareId } from '../engine';
import type { UseSetupValue } from '../hooks/useSetup';
import type { CustomStart } from '../screens/SetupScreen';
import { CASTLING_REQUIREMENTS, SETUP_RULES } from '../validation';
import { Board } from './Board';
import { PiecePalette } from './PiecePalette';

interface SetupEditorProps {
  readonly setup: UseSetupValue;
  readonly onStartTwoPlayer: (start: CustomStart) => void;
  readonly onStartVsComputer: (start: CustomStart) => void;
  readonly onExit: () => void;
}

const SIDES: readonly PieceColor[] = ['w', 'b'];

function castlingLabel(flag: CastlingFlag): string {
  const requirement = CASTLING_REQUIREMENTS.find((candidate) => candidate.flag === flag);
  return requirement === undefined ? flag : `${requirement.label} (${requirement.letter})`;
}

export function SetupEditor({
  setup,
  onStartTwoPlayer,
  onStartVsComputer,
  onExit,
}: SetupEditorProps): JSX.Element {
  const [fenInput, setFenInput] = useState('');
  const { validation } = setup;
  const start: CustomStart = { fen: setup.fen, orientation: setup.orientation };

  return (
    <main className="setup-editor">
      <header className="setup-editor__header">
        <h1 className="game__title">Custom position</h1>
        <div className="controls">
          <button
            type="button"
            className="button button--primary"
            disabled={!setup.canStart}
            onClick={() => onStartTwoPlayer(start)}
          >
            Start game
          </button>
          <button
            type="button"
            className="button"
            disabled={!setup.canStart}
            onClick={() => onStartVsComputer(start)}
          >
            Play vs computer
          </button>
          <button type="button" className="button button--ghost" onClick={onExit}>
            Main menu
          </button>
        </div>
      </header>

      <div className="setup-editor__layout">
        <div className="setup-editor__board">
          <Board
            board={setup.board}
            orientation={setup.orientation}
            draggable="both"
            selectedSquare={null}
            legalTargets={[]}
            lastMove={null}
            checkedKingSquare={null}
            disabled={false}
            onSquareSelect={setup.useSquare}
            onPieceDrop={setup.dragPiece}
          />
          <div className="controls setup-editor__board-actions">
            <button type="button" className="button" onClick={setup.clearBoard}>
              Clear board
            </button>
            <button type="button" className="button" onClick={setup.resetToStandard}>
              Standard position
            </button>
            <button type="button" className="button" onClick={setup.flipBoard}>
              Flip board
            </button>
          </div>
        </div>

        <aside className="setup-editor__panel">
          <PiecePalette
            palette={setup.palette}
            selectedPiece={setup.selectedPiece}
            onSelect={setup.selectPiece}
          />

          <fieldset className="setup__group">
            <legend className="setup__legend">Side to move</legend>
            <div className="setup__options">
              {SIDES.map((color) => (
                <label className="setup__option" key={color}>
                  <input
                    type="radio"
                    name="side-to-move"
                    value={color}
                    checked={setup.position.sideToMove === color}
                    onChange={() => setup.setSideToMove(color)}
                  />
                  <span>{colorLabel(color)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="setup__group">
            <legend className="setup__legend">Castling rights</legend>
            <div className="setup__options setup__options--stacked">
              {CASTLING_FLAGS.map((flag) => {
                const enabled = setup.availableCastling[flag];
                return (
                  <label
                    className={`setup__option${enabled ? '' : ' setup__option--off'}`}
                    key={flag}
                  >
                    <input
                      type="checkbox"
                      checked={setup.position.castling[flag]}
                      disabled={!enabled}
                      onChange={() => setup.toggleCastling(flag)}
                    />
                    <span>{castlingLabel(flag)}</span>
                  </label>
                );
              })}
            </div>
            <p className="setup__hint">
              A right can only be ticked while that king and rook sit on their starting squares.
            </p>
          </fieldset>

          <fieldset className="setup__group">
            <legend className="setup__legend">En passant square</legend>
            <label className="setup__field">
              <span className="setup__field-label">Target</span>
              <select
                value={setup.position.enPassant ?? ''}
                onChange={(event) =>
                  setup.setEnPassant(
                    event.target.value === '' ? null : (event.target.value as SquareId),
                  )
                }
              >
                <option value="">None</option>
                {setup.enPassantOptions.map((square) => (
                  <option key={square} value={square}>
                    {square}
                  </option>
                ))}
              </select>
            </label>
            <p className="setup__hint">
              Only meaningful when the other side has just pushed a pawn two squares.
            </p>
          </fieldset>

          <fieldset className="setup__group">
            <legend className="setup__legend">Clocks</legend>
            <label className="setup__field">
              <span className="setup__field-label">Half-move clock</span>
              <input
                type="number"
                min={0}
                value={setup.position.halfMoveClock}
                onChange={(event) => setup.setHalfMoveClock(event.target.valueAsNumber)}
              />
            </label>
            <label className="setup__field">
              <span className="setup__field-label">Move number</span>
              <input
                type="number"
                min={1}
                value={setup.position.fullMoveNumber}
                onChange={(event) => setup.setFullMoveNumber(event.target.valueAsNumber)}
              />
            </label>
            <p className="setup__hint">
              The half-move clock counts moves since the last capture or pawn move; at 100 the game
              is a draw. Set it near 100 to start a position close to the fifty-move rule.
            </p>
          </fieldset>

          <fieldset className="setup__group">
            <legend className="setup__legend">Options</legend>
            <label className="setup__option">
              <input
                type="checkbox"
                checked={setup.position.strictBishops}
                onChange={(event) => setup.setStrictBishops(event.target.checked)}
              />
              <span>Strict bishops</span>
            </label>
            <p className="setup__hint">
              Off by default, because promoting a pawn can legally give a side two bishops on the
              same square colour. Tick this to require the starting one-per-colour pair.
            </p>
          </fieldset>

          <fieldset className="setup__group">
            <legend className="setup__legend">FEN</legend>
            <p className="setup-editor__fen" data-testid="setup-fen">
              {setup.fen}
            </p>
            <div className="controls">
              <button type="button" className="button" onClick={setup.copyFen}>
                Copy FEN
              </button>
              <span
                className="setup__hint setup__hint--inline"
                role="status"
                aria-label="Clipboard status"
              >
                {setup.copyState === 'copied' && 'Copied.'}
                {setup.copyState === 'failed' &&
                  'Could not reach the clipboard — select the text above.'}
              </span>
            </div>
            <label className="setup__field">
              <span className="setup__field-label">Load FEN</span>
              <input
                type="text"
                value={fenInput}
                placeholder="Paste a FEN"
                onChange={(event) => setFenInput(event.target.value)}
              />
            </label>
            <div className="controls">
              <button
                type="button"
                className="button"
                onClick={() => {
                  if (setup.loadFen(fenInput)) setFenInput('');
                }}
              >
                Load FEN
              </button>
            </div>
            {setup.loadError !== null && (
              <p className="notice notice--error" role="alert">
                {setup.loadError}
              </p>
            )}
          </fieldset>
        </aside>
      </div>

      <section
        className={`setup-errors${validation.isValid ? ' setup-errors--ok' : ''}`}
        aria-label="Position problems"
      >
        {validation.errors.length === 0 ? (
          <p className="setup-errors__ok" role="status" aria-label="Position status">
            This position is ready to play.
          </p>
        ) : (
          <>
            <h2 className="panel__title">
              {validation.errors.length === 1
                ? 'One thing to fix before you can start'
                : `${String(validation.errors.length)} things to fix before you can start`}
            </h2>
            <ul className="setup-errors__list">
              {validation.errors.map((problem) => (
                <li key={`${problem.rule}-${problem.message}`} className="setup-errors__item">
                  {problem.message}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {validation.warnings.length > 0 && (
        <section className="setup-warnings" aria-label="Position warnings">
          <h2 className="panel__title">Worth knowing</h2>
          <ul className="setup-errors__list">
            {validation.warnings.map((problem) => (
              <li key={`${problem.rule}-${problem.message}`} className="setup-errors__item">
                {problem.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="setup-rules">
        <summary>What is checked</summary>
        <ul className="setup-rules__list">
          {SETUP_RULES.map((rule) => (
            <li key={rule.id}>
              {rule.summary}
              {rule.severity === 'warning' && ' (warning only)'}
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
