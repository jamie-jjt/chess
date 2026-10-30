import { useRef, useState } from 'react';
import { CASTLING_FLAGS, colorLabel, pieceLabel } from '../engine';
import type { CastlingFlag, PieceColor, SquareId } from '../engine';
import type { UseSetupValue } from '../hooks/useSetup';
import { CASTLING_REQUIREMENTS, SETUP_RULES } from '../validation';
import { Board } from './Board';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { PiecePalette } from './PiecePalette';

interface SetupEditorProps {
  readonly setup: UseSetupValue;
  readonly onStartTwoPlayer: (start: { readonly fen: string; readonly orientation: PieceColor }) => void;
  readonly onStartVsComputer?: (start: { readonly fen: string; readonly orientation: PieceColor }) => void;
  readonly onExit: () => void;
}
const SIDES: readonly PieceColor[] = ['w', 'b'];
function castlingLabel(flag: CastlingFlag): string {
  const requirement = CASTLING_REQUIREMENTS.find((candidate) => candidate.flag === flag);
  return requirement === undefined ? flag : `${requirement.label} (${requirement.letter})`;
}

export function SetupEditor({ setup, onStartTwoPlayer, onStartVsComputer, onExit }: SetupEditorProps): JSX.Element {
  const [fenInput, setFenInput] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [boardAnnouncement, setBoardAnnouncement] = useState('');
  const fenInputRef = useRef<HTMLInputElement>(null);
  const { validation } = setup;
  const blockerCount = validation.errors.length;
  const summary = blockerCount === 0 ? 'Ready to play.' : blockerCount === 1 ? '1 problem to fix' : `${String(blockerCount)} problems to fix`;

  return (
    <main className="setup-editor">
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">{boardAnnouncement}</div>
      <header className="setup-editor__header">
        <div><p className="screen-kicker">Position workshop</p><h1 className="game__title">Custom position</h1></div>
        <button type="button" className="button button--ghost" onClick={onExit}>Main menu</button>
      </header>

      <div className="setup-editor__layout">
        <section className="setup-editor__board" aria-label="Position board">
          <div className="setup-editor__board-stage">
            <Board board={setup.board} orientation={setup.orientation} draggable="both" selectedSquare={null} legalTargets={[]} castlingTargets={[]} lastMove={null} checkedKingSquare={null} disabled={false} onSquareSelect={(square) => {
              const selected = setup.selectedPiece;
              setup.useSquare(square);
              setBoardAnnouncement(selected === null ? `Removed the piece from ${square}.` : `${colorLabel(selected.color)} ${pieceLabel(selected.type).toLowerCase()} placed on ${square}.`);
            }} onPieceDrop={(from, to) => {
              setup.dragPiece(from, to);
              setBoardAnnouncement(`Piece moved from ${from} to ${to}.`);
            }} />
          </div>
          <div className="controls setup-editor__board-actions">
            <button type="button" className="button" onClick={() => setConfirmClear(true)}>Clear board</button>
            <button type="button" className="button" onClick={setup.resetToStandard}>Standard position</button>
            <button type="button" className="button button--ghost" onClick={setup.flipBoard}><Icon name="flip"/>Flip board</button>
          </div>
        </section>

        <aside className="setup-editor__panel">
          <section className={`setup-summary${validation.isValid ? ' setup-summary--ready' : ''}`}>
            <div><p className="panel__title">Position status</p><p className="setup-summary__text" id="setup-status-summary">{summary}</p></div>
            <div className="setup-summary__actions">
              <button type="button" className="button button--primary" disabled={!setup.canStart} aria-describedby="setup-status-summary" onClick={() => onStartTwoPlayer({ fen: setup.fen, orientation: setup.orientation })}>Start game</button>
              {onStartVsComputer !== undefined && <button type="button" className="button" disabled={!setup.canStart} aria-describedby="setup-status-summary" onClick={() => onStartVsComputer({ fen: setup.fen, orientation: setup.orientation })}>Play vs Computer</button>}
            </div>
          </section>

          <div className="setup-editor__scroll">
            <PiecePalette palette={setup.palette} selectedPiece={setup.selectedPiece} onSelect={setup.selectPiece} />

            <fieldset className="setup__group">
              <legend className="setup__legend">Turn</legend>
              <div className="setup__options setup__options--segments">
                {SIDES.map((color) => (
                  <label className="setup__option" key={color}>
                    <input type="radio" name="side-to-move" value={color} checked={setup.position.sideToMove === color} onChange={() => setup.setSideToMove(color)} />
                    <span>{colorLabel(color)}</span><span className="setup__checkmark" aria-hidden="true">✓</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <details className="inspector-details" open>
              <summary>Position rules</summary>
              <div className="inspector-details__body">
                <fieldset className="setup__group">
                  <legend className="setup__legend">Castling rights</legend>
                  <div className="setup__options setup__options--stacked">
                    {CASTLING_FLAGS.map((flag) => {
                      const enabled = setup.availableCastling[flag];
                      return (
                        <label className={`setup__option${enabled ? '' : ' setup__option--off'}`} key={flag}>
                          <input type="checkbox" checked={setup.position.castling[flag]} disabled={!enabled} onChange={() => setup.toggleCastling(flag)} />
                          <span>{castlingLabel(flag)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="setup__hint">A right is available only while that king and rook remain on their starting squares.</p>
                </fieldset>

                <fieldset className="setup__group">
                  <legend className="setup__legend">En passant square</legend>
                  <label className="setup__field"><span className="setup__field-label">Target</span>
                    <select value={setup.position.enPassant ?? ''} onChange={(event) => setup.setEnPassant(event.target.value === '' ? null : (event.target.value as SquareId))}>
                      <option value="">None</option>{setup.enPassantOptions.map((square) => <option key={square} value={square}>{square}</option>)}
                    </select>
                  </label>
                  <p className="setup__hint">Use only when the other side just pushed a pawn two squares.</p>
                </fieldset>

                <fieldset className="setup__group">
                  <legend className="setup__legend">Options</legend>
                  <label className="setup__option"><input type="checkbox" checked={setup.position.strictBishops} onChange={(event) => setup.setStrictBishops(event.target.checked)} /><span>Strict bishops</span></label>
                  <p className="setup__hint">Requires the starting one-per-square-colour bishop pair. Leave off for legal promoted bishops.</p>
                </fieldset>
              </div>
            </details>

            <section className={`setup-errors${blockerCount === 0 ? ' setup-errors--ok' : ''}`} aria-label="Position problems" id="position-problems">
              {blockerCount === 0 ? (
                <p className="setup-errors__ok" role="status" aria-label="Position status">This position is ready to play.</p>
              ) : (
                <><h2 className="panel__title">{blockerCount === 1 ? 'One thing to fix before you can start' : `${String(blockerCount)} things to fix before you can start`}</h2>
                <ul className="setup-errors__list">{validation.errors.map((problem) => <li key={`${problem.rule}-${problem.message}`} className="setup-errors__item">{problem.message}</li>)}</ul></>
              )}
              {validation.warnings.length > 0 && (
                <div className="setup-warnings">
                  <h2 className="panel__title">Worth knowing</h2>
                  <ul className="setup-errors__list">{validation.warnings.map((warning) => <li key={`${warning.rule}-${warning.message}`} className="setup-errors__item">{warning.message}</li>)}</ul>
                </div>
              )}
            </section>

            <details className="inspector-details fen-tools">
              <summary>FEN tools</summary>
              <div className="inspector-details__body">
                <p className="setup-editor__fen" data-testid="setup-fen">{setup.fen}</p>
                <div className="controls"><button type="button" className="button" onClick={setup.copyFen}>Copy FEN</button>
                  <span className="setup__hint setup__hint--inline" role="status" aria-label="Clipboard status">{setup.copyState === 'copied' && 'FEN copied.'}{setup.copyState === 'failed' && 'Could not reach the clipboard — select the text above.'}</span>
                </div>
                <label className="setup__field"><span className="setup__field-label">Load FEN</span>
                  <input ref={fenInputRef} type="text" value={fenInput} placeholder="Paste a FEN" aria-describedby={setup.loadError === null ? undefined : 'fen-load-error'} onChange={(event) => setFenInput(event.target.value)} />
                </label>
                <div className="controls"><button type="button" className="button" onClick={() => { if (setup.loadFen(fenInput)) setFenInput(''); else fenInputRef.current?.focus(); }}>Load FEN</button></div>
                {setup.loadError !== null && <p className="notice notice--error" role="alert" id="fen-load-error">{setup.loadError}</p>}
                <div className="setup__number-fields">
                  <label className="setup__field"><span className="setup__field-label">Halfmove clock</span><input type="number" min="0" value={setup.position.halfMoveClock} onChange={(event) => setup.setHalfMoveClock(event.target.valueAsNumber)} /></label>
                  <label className="setup__field"><span className="setup__field-label">Fullmove number</span><input type="number" min="1" value={setup.position.fullMoveNumber} onChange={(event) => setup.setFullMoveNumber(event.target.valueAsNumber)} /></label>
                </div>
              </div>
            </details>

            <details className="setup-rules"><summary>What is checked</summary><ul className="setup-rules__list">{SETUP_RULES.map((rule) => <li key={rule.id}>{rule.summary}</li>)}</ul></details>
          </div>
        </aside>
      </div>

      {confirmClear && <ConfirmDialog title="Clear every piece?" detail="Position settings will be reset." confirmLabel="Clear board" onConfirm={() => { setConfirmClear(false); setup.clearBoard(); }} onCancel={() => setConfirmClear(false)} />}
    </main>
  );
}
