import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_ORDER,
  DIFFICULTY_PRESETS,
  difficultyPreset,
  isDifficulty,
  skillLevelCommand,
} from '../src/ai';

describe('difficulty presets', () => {
  it('covers exactly the four advertised levels', () => {
    expect(DIFFICULTY_ORDER).toEqual(['easy', 'medium', 'hard', 'expert']);
    expect(Object.keys(DIFFICULTY_PRESETS).sort()).toEqual(['easy', 'expert', 'hard', 'medium']);
  });

  it('keeps every skill level inside the range Stockfish accepts', () => {
    for (const id of DIFFICULTY_ORDER) {
      const preset = difficultyPreset(id);
      expect(preset.skillLevel).toBeGreaterThanOrEqual(0);
      expect(preset.skillLevel).toBeLessThanOrEqual(20);
      expect(Number.isInteger(preset.skillLevel)).toBe(true);
      // The command builder is the real gate; this proves the preset passes it.
      expect(() => skillLevelCommand(preset.skillLevel)).not.toThrow();
    }
  });

  it('uses a sensible search depth and time ceiling at every level', () => {
    for (const id of DIFFICULTY_ORDER) {
      const preset = difficultyPreset(id);
      expect(preset.depth).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(preset.depth)).toBe(true);
      expect(preset.maxThinkMs).toBeGreaterThan(0);
      expect(preset.minVisibleThinkMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('gets harder monotonically in both skill and depth', () => {
    const skills = DIFFICULTY_ORDER.map((id) => difficultyPreset(id).skillLevel);
    const depths = DIFFICULTY_ORDER.map((id) => difficultyPreset(id).depth);
    const times = DIFFICULTY_ORDER.map((id) => difficultyPreset(id).maxThinkMs);

    expect(skills).toEqual([...skills].sort((a, b) => a - b));
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(skills).size).toBe(4);
  });

  it('starts at the weakest handicap and ends at full strength', () => {
    expect(difficultyPreset('easy').skillLevel).toBe(0);
    expect(difficultyPreset('expert').skillLevel).toBe(20);
  });

  it('recognises valid difficulty ids and rejects others', () => {
    expect(isDifficulty('hard')).toBe(true);
    expect(isDifficulty('expert')).toBe(true);
    expect(isDifficulty('impossible')).toBe(false);
    expect(isDifficulty('')).toBe(false);
  });

  it('labels and describes every level for the UI', () => {
    for (const id of DIFFICULTY_ORDER) {
      const preset = difficultyPreset(id);
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.blurb.length).toBeGreaterThan(0);
      expect(preset.id).toBe(id);
    }
  });
});
