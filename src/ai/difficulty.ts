export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyPreset {
  readonly id: Difficulty;
  readonly label: string;
  /** Stockfish `Skill Level`, 0 to 20. Below 20 the engine mis-picks on purpose. */
  readonly skillLevel: number;
  /** Plies given to `go depth`. */
  readonly depth: number;
  /** Wall-clock ceiling passed as `movetime`; whichever limit hits first wins. */
  readonly maxThinkMs: number;
  /** Floor on how long the thinking indicator stays visible, so it cannot flash. */
  readonly minVisibleThinkMs: number;
  readonly blurb: string;
}

/**
 * Two knobs, two different jobs.
 *
 * `Skill Level` is Stockfish's own handicap: under 20 it picks a deliberately
 * weaker move from its candidate list, with the error growing as the level
 * drops, which reads as human-like blundering. `depth` caps the search tree,
 * limiting foresight and bounding the time spent. Skill alone at full depth
 * plays slightly-off grandmaster chess; depth alone at skill 20 never errs
 * inside its horizon. Together they form a believable ladder.
 */
export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    skillLevel: 0,
    depth: 2,
    maxThinkMs: 400,
    minVisibleThinkMs: 350,
    blurb: 'Blunders freely and sees only the next reply.',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    skillLevel: 5,
    depth: 5,
    maxThinkMs: 800,
    minVisibleThinkMs: 350,
    blurb: 'Spots simple tactics but still makes mistakes.',
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    skillLevel: 12,
    depth: 10,
    maxThinkMs: 1500,
    minVisibleThinkMs: 250,
    blurb: 'Rarely blunders and punishes loose play.',
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    skillLevel: 20,
    depth: 16,
    maxThinkMs: 3000,
    minVisibleThinkMs: 0,
    blurb: 'Full strength, no handicap. You will lose.',
  },
};

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export function isDifficulty(value: string): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard' || value === 'expert';
}

export function difficultyPreset(difficulty: Difficulty): DifficultyPreset {
  return DIFFICULTY_PRESETS[difficulty];
}
