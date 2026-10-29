import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { StockfishEngine } from '../src/ai';
import { useComputerGame } from '../src/hooks/useComputerGame';
import { createFakeStockfish } from './helpers/fakeStockfish';
import type { FakeStockfishOptions } from './helpers/fakeStockfish';

/**
 * src/main.tsx wraps the app in StrictMode, which double-invokes effects in
 * development: mount, tear down, mount again.
 *
 * This regression suite exists because a first implementation created the
 * engine during render and disposed it in a mount-keyed cleanup. StrictMode
 * then disposed the engine while its opening search was still in flight, the
 * rejection surfaced as "The chess engine was shut down.", and the guard
 * against searching one position twice blocked any retry — so the engine never
 * moved. Production builds do not double-invoke effects, so the bug appeared
 * only under `npm run dev`.
 */
function strictHarness(options: FakeStockfishOptions & { playerColor?: 'w' | 'b' } = {}) {
  const { playerColor = 'b', ...fakeOptions } = options;
  const { factory, log } = createFakeStockfish(fakeOptions);
  const createEngine = (): StockfishEngine =>
    new StockfishEngine({ createTransport: factory, handshakeTimeoutMs: 2000 });

  const rendered = renderHook(
    () =>
      useComputerGame({
        playerColor,
        difficulty: 'easy',
        createEngine,
        minVisibleThinkMs: 0,
      }),
    { wrapper: StrictMode },
  );

  return { ...rendered, log };
}

describe('useComputerGame under StrictMode', () => {
  it('still opens the game when the player has Black', async () => {
    const { result } = strictHarness({ playerColor: 'b' });

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(1);
    });

    expect(result.current.engineError).toBeNull();
    expect(result.current.snapshot.turn).toBe('b');
    expect(result.current.isPlayerTurn).toBe(true);
  });

  it('starts exactly one worker and reports no teardown error', async () => {
    const { result, log } = strictHarness({ playerColor: 'b' });

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(1);
    });

    // StrictMode builds two engine objects and discards the first. Because the
    // search effect only runs once an engine is committed to state, the
    // discarded one never opens a transport, so the 1.8 MB WASM engine is
    // started exactly once and no search is ever cut short by its disposal.
    expect(log.created()).toBe(1);
    expect(log.terminatedCount()).toBe(0);
    expect(log.commands.filter((command) => command === 'uci')).toHaveLength(1);
    expect(result.current.engineError).toBeNull();
  });

  it('still replies to the player and stops thinking afterwards', async () => {
    const { result } = strictHarness({ playerColor: 'w' });

    act(() => {
      result.current.playMove('e2', 'e4');
    });

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });

    expect(result.current.engineError).toBeNull();
    expect(result.current.isThinking).toBe(false);
    expect(result.current.isPlayerTurn).toBe(true);
  });

  it('still takes back both half-moves on undo', async () => {
    const { result } = strictHarness({ playerColor: 'w' });

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.snapshot.turn).toBe('w');
    expect(result.current.snapshot.history).toHaveLength(0);
    expect(result.current.engineError).toBeNull();
  });

  it('still searches only the live position, once', async () => {
    const { result, log } = strictHarness({ playerColor: 'w' });

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });

    expect(log.positions).toHaveLength(1);
    expect(log.invalidPositions).toEqual([]);
    expect(log.commands.filter((command) => command.startsWith('go '))).toHaveLength(1);
  });

  it('still surfaces a genuine engine failure', async () => {
    const { result } = strictHarness({ playerColor: 'b', failOnStart: 'wasm did not load' });

    await waitFor(() => {
      expect(result.current.engineError).toMatch(/wasm did not load/);
    });
    expect(result.current.isThinking).toBe(false);
  });
});
