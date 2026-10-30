import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockfishEngine } from '../src/ai';
import { useComputerGame } from '../src/hooks/useComputerGame';
import { formatEvaluation } from '../src/components/EvaluationReadout';
import { createFakeStockfish } from './helpers/fakeStockfish';
import type { FakeStockfishOptions } from './helpers/fakeStockfish';

function harness(options: FakeStockfishOptions & { playerColor?: 'w' | 'b' } = {}) {
  const { playerColor = 'w', ...fakeOptions } = options;
  const { factory, log } = createFakeStockfish(fakeOptions);
  const createEngine = (): StockfishEngine =>
    new StockfishEngine({ createTransport: factory, handshakeTimeoutMs: 2000 });

  const rendered = renderHook(() =>
    useComputerGame({ playerColor, difficulty: 'easy', createEngine, minVisibleThinkMs: 0 }),
  );
  return { ...rendered, log };
}

describe('engine loading state', () => {
  it('is not loading before the engine is needed', () => {
    const { result } = harness({ playerColor: 'w' });
    expect(result.current.isEngineLoading).toBe(false);
  });

  it('reports loading while the engine starts, separately from thinking', async () => {
    const { result } = harness({ playerColor: 'b', handshakeDelayMs: 80 });

    await waitFor(() => {
      expect(result.current.isEngineLoading).toBe(true);
    });
    // Starting the engine is not the same as searching.
    expect(result.current.snapshot.history).toHaveLength(0);

    await waitFor(() => {
      expect(result.current.isEngineLoading).toBe(false);
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(1);
    });
  });

  it('only loads once, so later moves go straight to thinking', async () => {
    const { result } = harness({ playerColor: 'w', handshakeDelayMs: 30 });

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });

    act(() => {
      result.current.playMove('d2', 'd4');
    });
    expect(result.current.isEngineLoading).toBe(false);

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(4);
    });
  });

  it('clears the loading flag when the engine fails to start', async () => {
    const { result } = harness({ playerColor: 'b', failOnStart: 'wasm did not load' });

    await waitFor(() => {
      expect(result.current.engineError).toMatch(/wasm did not load/);
    });
    expect(result.current.isEngineLoading).toBe(false);
    expect(result.current.isThinking).toBe(false);
  });
});

describe('engine evaluation', () => {
  it('has nothing to show before the engine has searched', () => {
    const { result } = harness();
    expect(result.current.evaluation).toBeNull();
  });

  it('reads the score out of the engine info lines', async () => {
    const { result } = harness({ playerColor: 'b' });

    await waitFor(() => {
      expect(result.current.evaluation).not.toBeNull();
    });

    // The fake reports "score cp 24" at depth 1 for the White engine.
    expect(result.current.evaluation?.depth).toBe(1);
    expect(result.current.evaluation?.pawns).toBeCloseTo(0.24);
    expect(result.current.evaluation?.mateIn).toBeNull();
  });

  it('negates the score when the engine plays Black, so positive always favours White', async () => {
    const { result } = harness({ playerColor: 'w' });

    act(() => {
      result.current.playMove('e2', 'e4');
    });

    await waitFor(() => {
      expect(result.current.evaluation).not.toBeNull();
    });
    expect(result.current.evaluation?.pawns).toBeCloseTo(-0.24);
  });

  it('forgets the score on undo, because it described a different position', async () => {
    const { result } = harness({ playerColor: 'w' });

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });
    expect(result.current.evaluation).not.toBeNull();

    act(() => {
      result.current.undo();
    });

    expect(result.current.evaluation).toBeNull();
  });
});

describe('formatEvaluation', () => {
  it('signs the score from White point of view', () => {
    expect(formatEvaluation({ depth: 10, pawns: 0.35, mateIn: null })).toBe('+0.35');
    expect(formatEvaluation({ depth: 10, pawns: -1.2, mateIn: null })).toBe('\u22121.20');
  });

  it('calls a tiny score level', () => {
    expect(formatEvaluation({ depth: 10, pawns: 0.01, mateIn: null })).toBe('Level');
    expect(formatEvaluation({ depth: 10, pawns: 0, mateIn: null })).toBe('Level');
  });

  it('prefers a mate announcement over a score', () => {
    expect(formatEvaluation({ depth: 12, pawns: 9, mateIn: 3 })).toBe('Mate in 3 for White');
    expect(formatEvaluation({ depth: 12, pawns: null, mateIn: -2 })).toBe('Mate in 2 for Black');
  });

  it('names no winner for an already-delivered mate, where the sign says nothing', () => {
    // UCI sends `mate 0`; normalising to White's view multiplies by a sign,
    // which carries no information at zero.
    expect(formatEvaluation({ depth: 1, pawns: null, mateIn: 0 })).toBe('Mate on the board');
  });

  it('falls back when there is no score at all', () => {
    expect(formatEvaluation({ depth: null, pawns: null, mateIn: null })).toBe('Even');
  });
});
