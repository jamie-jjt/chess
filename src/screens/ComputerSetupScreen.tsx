import { useState } from 'react';
import { DIFFICULTY_ORDER, DIFFICULTY_PRESETS } from '../ai';
import type { Difficulty } from '../ai';
import { ChessPieceSvg } from '../components/ChessPieceSvg';
import { colorLabel } from '../engine';
import type { PieceColor } from '../engine';

export type ColorChoice = 'w' | 'b' | 'random';
export interface ComputerGameConfig { readonly playerColor: PieceColor; readonly difficulty: Difficulty; }

export function resolveColorChoice(choice: ColorChoice, random: () => number = Math.random): PieceColor {
  if (choice === 'w' || choice === 'b') return choice;
  return random() < 0.5 ? 'w' : 'b';
}

const COLOR_CHOICES: readonly { readonly value: ColorChoice; readonly label: string }[] = [
  { value: 'w', label: 'White' }, { value: 'b', label: 'Black' }, { value: 'random', label: 'Random' },
];
interface ComputerSetupScreenProps { readonly onStart: (config: ComputerGameConfig) => void; readonly onBack: () => void; readonly positionLabel?: string; }

export function ComputerSetupScreen({ onStart, onBack, positionLabel }: ComputerSetupScreenProps): JSX.Element {
  const [colorChoice, setColorChoice] = useState<ColorChoice>('w');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const previewColor: PieceColor = colorChoice === 'b' ? 'b' : 'w';

  return (
    <main className="match-setup">
      <section className="match-setup__preview" aria-hidden="true">
        <div className={`preview-board preview-board--${previewColor === 'b' ? 'black' : 'white'}`}>
          {Array.from({ length: 16 }, (_, index) => <span className="preview-board__square" key={index} />)}
          <span className="preview-board__you"><ChessPieceSvg type="k" color={previewColor} /></span>
          <span className="preview-board__engine"><ChessPieceSvg type="n" color={previewColor === 'w' ? 'b' : 'w'} /></span>
        </div>
        <p className="preview-board__caption">Your side faces the tournament table.</p>
      </section>

      <section className="match-setup__form">
        <header className="match-setup__header">
          <p className="screen-kicker">New match</p>
          <h1 className="setup__title">Play vs Computer</h1>
          <p className="setup__subtitle">Choose your side and how much time Stockfish gets to think{positionLabel === undefined ? '' : ` from ${positionLabel}`}. The engine runs on this device.</p>
        </header>

        <fieldset className="setup__group setup__group--color">
          <legend className="setup__legend">Your colour</legend>
          <div className="setup__options setup__options--segments">
            {COLOR_CHOICES.map((choice) => (
              <label className="setup__option" key={choice.value}>
                <input type="radio" name="color" value={choice.value} checked={colorChoice === choice.value} onChange={() => setColorChoice(choice.value)} />
                <span>{choice.label}</span><span className="setup__checkmark" aria-hidden="true">✓</span>
              </label>
            ))}
          </div>
          <p className="setup__hint">{colorChoice === 'random' ? 'Your side is chosen when the game starts.' : `You move ${colorLabel(colorChoice) === 'White' ? 'first' : 'second'}.`}</p>
        </fieldset>

        <fieldset className="setup__group setup__group--difficulty">
          <legend className="setup__legend">Difficulty</legend>
          <div className="setup__options setup__options--stacked">
            {DIFFICULTY_ORDER.map((id) => {
              const preset = DIFFICULTY_PRESETS[id];
              return (
                <label className="setup__option setup__option--wide" key={id}>
                  <input type="radio" name="difficulty" value={id} checked={difficulty === id} onChange={() => setDifficulty(id)} />
                  <span className="setup__option-body">
                    <span className="setup__option-title">{preset.label}</span>
                    <span className="setup__option-blurb">{preset.blurb}</span>
                  </span>
                  <span className="setup__option-meta">skill {preset.skillLevel} · depth {preset.depth} · up to {(preset.maxThinkMs / 1000).toFixed(1)}s</span>
                  <span className="setup__checkmark" aria-hidden="true">✓</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="setup__actions match-setup__actions">
          <button type="button" className="button button--primary" onClick={() => onStart({ playerColor: resolveColorChoice(colorChoice), difficulty })}>Start game</button>
          <button type="button" className="button button--ghost" onClick={onBack}>Back</button>
        </div>
      </section>
    </main>
  );
}
