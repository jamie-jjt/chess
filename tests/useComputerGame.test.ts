import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockfishEngine } from '../src/ai';
import { ChessGame, START_FEN, isValidFen } from '../src/engine';
import type { PieceColor, SquareId } from '../src/engine';
import { useComputerGame } from '../src/hooks/useComputerGame';
import { createFakeStockfish } from './helpers/fakeStockfish';
import type { FakeStockfishOptions } from './helpers/fakeStockfish';

interface HarnessOptions extends FakeStockfishOptions {
  readonly playerColor?: PieceColor;
  readonly initialFen?: string;
}

function harness(options: HarnessOptions = {}) {
  const { playerColor = 'w', initialFen, ...fakeOptions } = options;
  const { factory, log } = createFakeStockfish(fakeOptions);
  const createEngine = (): StockfishEngine =>
    new StockfishEngine({ createTransport: factory, handshakeTimeoutMs: 2000 });

  const rendered = renderHook(() =>
    useComputerGame({
      playerColor,
      difficulty: 'easy',
      createEngine,
      minVisibleThinkMs: 0,
      ...(initialFen === undefined ? {} : { initialFen }),
    }),
  );

  return { ...rendered, log };
}

describe('useComputerGame basics', () => {
  it('waits for the player when the player has White', async () => {
    const { result, log } = harness({ playerColor: 'w' });

    expect(result.current.playerColor).toBe('w');
    expect(result.current.engineColor).toBe('b');
    expect(result.current.isPlayerTurn).toBe(true);
    expect(result.current.snapshot.fen).toBe(START_FEN);

    await waitFor(() => {
      expect(result.current.isThinking).toBe(false);
    });
    expect(log.positions).toEqual([]);
  });

  it('opens the game itself when the player has Black', async () => {
    const { result } = harness({ playerColor: 'b' });

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(1);
    });

    expect(result.current.snapshot.history[0]?.color).toBe('w');
    expect(result.current.snapshot.turn).toBe('b');
    expect(result.current.isPlayerTurn).toBe(true);
    expect(result.current.isThinking).toBe(false);
  });

  it('replies after the player moves', async () => {
    const { result } = harness();

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    expect(result.current.snapshot.turn).toBe('b');

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });

    expect(result.current.snapshot.history.map((move) => move.san)[0]).toBe('e4');
    expect(result.current.snapshot.turn).toBe('w');
    expect(result.current.isPlayerTurn).toBe(true);
  });

  it('exposes the difficulty preset it is playing at', () => {
    const { result } = harness();
    expect(result.current.difficulty.id).toBe('easy');
    expect(result.current.difficulty.skillLevel).toBe(0);
    expect(result.current.difficulty.depth).toBe(2);
  });

  it('shows a thinking flag while the engine searches and clears it after', async () => {
    const { result } = harness({ bestMoveDelayMs: 40 });

    act(() => {
      result.current.playMove('e2', 'e4');
    });

    await waitFor(() => {
      expect(result.current.isThinking).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.isThinking).toBe(false);
    });
    expect(result.current.snapshot.history).toHaveLength(2);
  });

  it('refuses player input while the engine is thinking', async () => {
    const { result } = harness({ bestMoveDelayMs: 60 });

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.isThinking).toBe(true);
    });

    let accepted = true;
    act(() => {
      accepted = result.current.playMove('d2', 'd4');
    });
    expect(accepted).toBe(false);

    act(() => {
      result.current.selectSquare('d2');
    });
    expect(result.current.selectedSquare).toBeNull();

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });
  });

  it('surfaces an engine failure instead of hanging', async () => {
    const { result } = harness({ playerColor: 'b', failOnStart: 'wasm did not load' });

    await waitFor(() => {
      expect(result.current.engineError).toMatch(/wasm did not load/);
    });
    expect(result.current.isThinking).toBe(false);

    act(() => {
      result.current.dismissEngineError();
    });
    expect(result.current.engineError).toBeNull();
  });
});

describe('undo returns the player to their turn', () => {
  it('takes back the engine reply together with the player move (player White)', async () => {
    const { result } = harness({ playerColor: 'w' });

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
    expect(result.current.isPlayerTurn).toBe(true);
    expect(result.current.snapshot.history).toHaveLength(0);
    expect(result.current.snapshot.fen).toBe(START_FEN);
  });

  it('leaves the engine opening move in place (player Black)', async () => {
    const { result } = harness({ playerColor: 'b' });

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(1);
    });

    act(() => {
      result.current.playMove('e7', 'e5');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(3);
    });

    act(() => {
      result.current.undo();
    });

    // Back to Black's turn, with White's opening move still on the board.
    expect(result.current.snapshot.turn).toBe('b');
    expect(result.current.isPlayerTurn).toBe(true);
    expect(result.current.snapshot.history).toHaveLength(1);
  });

  it('returns the player to their turn even mid-search', async () => {
    const { result } = harness({ bestMoveDelayMs: 500 });

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.isThinking).toBe(true);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.snapshot.turn).toBe('w');
    expect(result.current.isPlayerTurn).toBe(true);
    expect(result.current.isThinking).toBe(false);
    expect(result.current.snapshot.history).toHaveLength(0);

    // The abandoned search must not land a move on the restored position.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(result.current.snapshot.history).toHaveLength(0);
    expect(result.current.snapshot.turn).toBe('w');
  });

  it('keeps undo available until the board is back at the start', async () => {
    const { result } = harness();

    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.snapshot.fen).toBe(START_FEN);
  });

  it('offers no undo while only the engine has moved', async () => {
    const { result, log } = harness({ playerColor: 'b' });

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(1);
    });

    // The player has nothing to take back yet.
    expect(result.current.canUndo).toBe(false);

    const searchesBefore = log.positions.length;
    act(() => {
      result.current.undo();
    });

    // Undo is a no-op, so the engine's opening move stands and it does not
    // start a second search for a position it has already answered.
    expect(result.current.snapshot.history).toHaveLength(1);
    expect(result.current.snapshot.turn).toBe('b');
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(log.positions.length).toBe(searchesBefore);
  });

  it('offers undo again only once the player has replied', async () => {
    const { result } = harness({ playerColor: 'b' });

    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(1);
    });
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.playMove('e7', 'e5');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(3);
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.snapshot.history).toHaveLength(1);
    expect(result.current.canUndo).toBe(false);
  });

  it('restarts to the player side and an empty move list', async () => {
    const { result } = harness();

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });

    act(() => {
      result.current.restart();
    });

    expect(result.current.snapshot.fen).toBe(START_FEN);
    expect(result.current.snapshot.history).toHaveLength(0);
    expect(result.current.isPlayerTurn).toBe(true);
  });
});

describe('the engine never receives an invalid FEN', () => {
  it('sends only positions the validator accepts, and only the live one', async () => {
    const { result, log } = harness({ playerColor: 'b' });

    const playerMoves: readonly (readonly [SquareId, SquareId])[] = [
      ['e7', 'e5'],
      ['d7', 'd5'],
      ['g8', 'f6'],
    ];

    for (const [from, to] of playerMoves) {
      await waitFor(() => {
        expect(result.current.isPlayerTurn).toBe(true);
        expect(result.current.isThinking).toBe(false);
      });

      let accepted = false;
      act(() => {
        accepted = result.current.playMove(from, to);
      });
      if (!accepted) break;

      await waitFor(() => {
        expect(result.current.snapshot.turn).toBe('b');
      });
    }

    expect(log.positions.length).toBeGreaterThanOrEqual(3);
    expect(log.invalidPositions).toEqual([]);
    for (const fen of log.positions) {
      expect(isValidFen(fen)).toBe(true);
      // Every FEN sent must be loadable, i.e. a real position.
      expect(() => new ChessGame(fen)).not.toThrow();
    }
  });

  it('never sends a position where it is the player to move', async () => {
    const { result, log } = harness({ playerColor: 'w' });

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });
    act(() => {
      result.current.playMove('d2', 'd4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(4);
    });

    expect(log.positions).toHaveLength(2);
    for (const fen of log.positions) {
      expect(new ChessGame(fen).turn()).toBe('b');
    }
  });

  it('does not search the same position twice', async () => {
    const { result, log } = harness();

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    await waitFor(() => {
      expect(result.current.snapshot.history).toHaveLength(2);
    });

    expect(log.positions).toHaveLength(1);
    expect(log.commands.filter((command) => command.startsWith('go '))).toHaveLength(1);
  });
});
