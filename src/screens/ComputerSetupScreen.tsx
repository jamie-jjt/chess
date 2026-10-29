import { useState } from 'react';
import { DIFFICULTY_ORDER, DIFFICULTY_PRESETS } from '../ai';
import type { Difficulty } from '../ai';
import { colorLabel } from '../engine';
import type { PieceColor } from '../engine';

export type ColorChoice = 'w' | 'b' | 'random';

export interface ComputerGameConfig {
  readonly playerColor: PieceColor;
  readonly difficulty: Difficulty;
}

/** Resolves the colour choice, flipping a coin for 'random'. */
export function resolveColorChoice(choice: ColorChoice, random: () => number = Math.random): PieceColor {
  if (choice === 'w' || choice === 'b') return choice;
  return random() < 0.5 ? 'w' : 'b';
}

const COLOR_CHOICES: readonly { readonly value: ColorChoice; readonly label: string }[] = [
  { value: 'w', label: 'White' },
  { value: 'b', label: 'Black' },
  { value: 'random', label: 'Random' },
];

interface ComputerSetupScreenProps {
  readonly onStart: (config: ComputerGameConfig) => void;
  readonly onBack: () => void;
  /** Named when the game will start from something other than the usual position. */
  readonly positionLabel?: string;
}

export function ComputerSetupScreen({
  onStart,
  onBack,
  positionLabel,
}: ComputerSetupScreenProps): JSX.Element {
  const [colorChoice, setColorChoice] = useState<ColorChoice>('w');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  return (
    <main className="setup">
      <h1 className="setup__title">Play vs Computer</h1>
      <p className="setup__subtitle">
        Stockfish 19 (lite, single-threaded) runs locally in a Web Worker. Nothing is sent
        anywhere.
        {positionLabel !== undefined && ` The game starts from ${positionLabel}.`}
      </p>

      <fieldset className="setup__group">
        <legend className="setup__legend">Your colour</legend>
        <div className="setup__options">
          {COLOR_CHOICES.map((choice) => (
            <label className="setup__option" key={choice.value}>
              <input
                type="radio"
                name="color"
                value={choice.value}
                checked={colorChoice === choice.value}
                onChange={() => setColorChoice(choice.value)}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </div>
        <p className="setup__hint">
          {colorChoice === 'random'
            ? 'A coin flip decides when the game starts.'
            : `You move ${colorLabel(colorChoice) === 'White' ? 'first' : 'second'}.`}
        </p>
      </fieldset>

      <fieldset className="setup__group">
        <legend className="setup__legend">Difficulty</legend>
        <div className="setup__options setup__options--stacked">
          {DIFFICULTY_ORDER.map((id) => {
            const preset = DIFFICULTY_PRESETS[id];
            return (
              <label className="setup__option setup__option--wide" key={id}>
                <input
                  type="radio"
                  name="difficulty"
                  value={id}
                  checked={difficulty === id}
                  onChange={() => setDifficulty(id)}
                />
                <span className="setup__option-body">
                  <span className="setup__option-title">{preset.label}</span>
                  <span className="setup__option-blurb">{preset.blurb}</span>
                  <span className="setup__option-meta">
                    skill {preset.skillLevel} · depth {preset.depth} · up to{' '}
                    {(preset.maxThinkMs / 1000).toFixed(1)}s
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="setup__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={() => onStart({ playerColor: resolveColorChoice(colorChoice), difficulty })}
        >
          Start game
        </button>
        <button type="button" className="button button--ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </main>
  );
}
