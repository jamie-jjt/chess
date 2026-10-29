import { Icon } from '../components/Icon';

export type GameMode = 'two-player' | 'computer' | 'custom';
interface StartScreenProps { readonly onSelectMode: (mode: GameMode) => void; readonly availableModes: readonly GameMode[]; }

const MODE_COPY: Record<GameMode, { title: string; blurb: string }> = {
  'two-player': { title: 'Two Players', blurb: 'Share this board and play from the standard position.' },
  computer: { title: 'Play vs Computer', blurb: 'Choose your side and set Stockfish’s playing strength.' },
  custom: { title: 'Custom Position', blurb: 'Arrange the pieces, check the position, then begin.' },
};
const MODE_ORDER: readonly GameMode[] = ['two-player', 'computer', 'custom'];

export function StartScreen({ onSelectMode, availableModes }: StartScreenProps): JSX.Element {
  return (
    <main className="start">
      <section className="start__intro" aria-labelledby="start-title">
        <div className="start__motif" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <span key={index} />)}</div>
        <p className="start__kicker">A board for this table</p>
        <h1 className="start__title" id="start-title">Chess</h1>
        <p className="start__subtitle">Play here, with a friend or against Stockfish.</p>
        <p className="start__local-note">Runs locally. No account or server.</p>
      </section>
      <nav className="start__modes" aria-label="Game modes">
        {MODE_ORDER.map((mode, index) => {
          const enabled = availableModes.includes(mode);
          const copy = MODE_COPY[mode];
          return (
            <button key={mode} type="button" className="start__mode" disabled={!enabled} onClick={() => onSelectMode(mode)} aria-describedby={`mode-${mode}-description`}>
              <span className="start__mode-number">0{index + 1}</span>
              <span className="start__mode-copy">
                <span className="start__mode-title">{copy.title}</span>
                <span className="start__mode-blurb" id={`mode-${mode}-description`}>{copy.blurb}</span>
                {!enabled && <span className="start__unavailable">Unavailable</span>}
              </span>
              <Icon name="arrow" />
            </button>
          );
        })}
      </nav>
    </main>
  );
}
