import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StockfishEngine, createWorkerTransport, difficultyPreset } from '../ai';
import type { Difficulty, DifficultyPreset } from '../ai';
import { oppositeColor } from '../engine';
import type { PieceColor, SquareId } from '../engine';
import { useGame } from './useGame';
import type { UseGameValue } from './useGame';

export interface UseComputerGameOptions {
  readonly playerColor: PieceColor;
  readonly difficulty: Difficulty;
  readonly initialFen?: string;
  /** Replaced in tests with an engine wired to a stub transport. */
  readonly createEngine?: () => StockfishEngine;
  /** Overrides the preset's indicator floor; tests pass 0 to avoid waiting. */
  readonly minVisibleThinkMs?: number;
}

/** The engine's latest read on the position, from White's point of view. */
export interface EngineEvaluation {
  readonly depth: number | null;
  /** Pawns, positive meaning White is better. Null when a mate is seen. */
  readonly pawns: number | null;
  /** Moves to mate, positive meaning White delivers it. */
  readonly mateIn: number | null;
}

export interface UseComputerGameValue extends UseGameValue {
  readonly playerColor: PieceColor;
  readonly engineColor: PieceColor;
  readonly difficulty: DifficultyPreset;
  readonly isThinking: boolean;
  /** True while the 1.8 MB engine is still being fetched and started. */
  readonly isEngineLoading: boolean;
  readonly isPlayerTurn: boolean;
  readonly evaluation: EngineEvaluation | null;
  readonly engineError: string | null;
  readonly dismissEngineError: () => void;
}

function defaultEngine(): StockfishEngine {
  return new StockfishEngine({ createTransport: createWorkerTransport });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Two-player game state plus a Stockfish opponent.
 *
 * The engine runs in a Web Worker, so a search never blocks rendering. Player
 * input is locked while the engine thinks; undo and restart stop the search in
 * flight; and a reply that arrives for a position the board has already left is
 * discarded instead of played.
 */
export function useComputerGame(options: UseComputerGameOptions): UseComputerGameValue {
  const { createEngine, difficulty, initialFen, playerColor } = options;
  const engineColor = oppositeColor(playerColor);
  const preset = useMemo(() => difficultyPreset(difficulty), [difficulty]);
  const thinkFloorMs = options.minVisibleThinkMs ?? preset.minVisibleThinkMs;

  const base = useGame(
    initialFen === undefined ? { playerColor } : { playerColor, initialFen },
  );

  /**
   * The engine is created and destroyed by one effect, so creation and teardown
   * stay symmetric. React's StrictMode mounts, tears down and mounts again in
   * development; this shape survives that cycle with a live engine, where
   * creating it during render and disposing it in a mount-keyed cleanup would
   * leave a disposed engine behind.
   */
  const [engine, setEngine] = useState<StockfishEngine | null>(null);

  useEffect(() => {
    const instance = createEngine === undefined ? defaultEngine() : createEngine();
    setEngine(instance);
    return () => {
      instance.dispose();
      setEngine((current) => (current === instance ? null : current));
    };
  }, [createEngine]);

  const [isThinking, setIsThinking] = useState(false);
  const [isEngineLoading, setIsEngineLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  /**
   * Streams the engine's `info` lines into the evaluation readout. UCI scores
   * are from the moving side's point of view, and the engine is the one
   * moving, so a Black engine's scores are negated to read as White-positive.
   */
  useEffect(() => {
    if (engine === null) return;

    engine.setInfoListener((info) => {
      const sign = engineColor === 'w' ? 1 : -1;
      setEvaluation({
        depth: info.depth,
        pawns: info.scoreCp === null ? null : (sign * info.scoreCp) / 100,
        mateIn: info.mateIn === null ? null : sign * info.mateIn,
      });
    });

    return () => {
      engine.setInfoListener(null);
    };
  }, [engine, engineColor]);

  /**
   * The search in flight, identified by engine instance as well as position: a
   * replacement engine must be allowed to search a position its predecessor
   * had already started.
   */
  const activeSearchRef = useRef<{ engine: StockfishEngine; fen: string } | null>(null);

  const { snapshot, applyMove, currentFen, pendingPromotion } = base;
  const gameOver = snapshot.result.type !== 'in-progress';
  const engineToMove = snapshot.turn === engineColor && !gameOver;

  useEffect(() => {
    if (engine === null) return;
    if (!engineToMove) return;
    if (pendingPromotion !== null) return;

    const fen = snapshot.fen;
    const active = activeSearchRef.current;
    if (active !== null && active.engine === engine && active.fen === fen) return;

    const isCurrent = (): boolean =>
      activeSearchRef.current?.engine === engine && activeSearchRef.current.fen === fen;

    activeSearchRef.current = { engine, fen };
    setIsThinking(true);

    const run = async (): Promise<void> => {
      const startedAt = Date.now();
      try {
        // Starting the engine means fetching and compiling the WASM binary,
        // which only happens once but takes noticeably longer than a search.
        // Reported separately so the player is told what the wait is for.
        if (engine.getState() === 'created' || engine.getState() === 'starting') {
          setIsEngineLoading(true);
          try {
            await engine.start();
          } finally {
            setIsEngineLoading(false);
          }
        }

        const outcome = await engine.findBestMove({
          fen,
          depth: preset.depth,
          maxThinkMs: preset.maxThinkMs,
          skillLevel: preset.skillLevel,
        });

        const elapsed = Date.now() - startedAt;
        if (elapsed < thinkFloorMs) await delay(thinkFloorMs - elapsed);

        // Undo, restart, a cancelled search or a replaced engine may have moved
        // the game on since this search began.
        if (outcome.status !== 'move' || !isCurrent() || currentFen() !== fen) return;

        const { from, to, promotion } = outcome.move;
        const accepted = applyMove(from, to, promotion ?? undefined);
        if (!accepted) {
          setEngineError(`The engine chose a move that is not legal here: ${from}${to}.`);
        }
      } catch (error) {
        // A disposed engine rejects its pending work by design. That is
        // teardown, not a failure, so it is never shown to the player.
        if (engine.getState() === 'disposed' || !isCurrent()) return;
        setEngineError(error instanceof Error ? error.message : String(error));
      } finally {
        if (isCurrent()) {
          activeSearchRef.current = null;
          setIsThinking(false);
        }
      }
    };

    void run();
  }, [
    applyMove,
    currentFen,
    engine,
    engineToMove,
    pendingPromotion,
    preset,
    snapshot.fen,
    thinkFloorMs,
  ]);

  const stopThinking = useCallback((): void => {
    engine?.stop();
    activeSearchRef.current = null;
    setIsThinking(false);
    // The old score describes a position that is no longer on the board.
    setEvaluation(null);
  }, [engine]);

  const isPlayerTurn = snapshot.turn === playerColor && !gameOver;
  const inputLocked = isThinking || !isPlayerTurn;

  /**
   * Only the player's own moves can be taken back. When the engine has opened
   * the game and the player has not replied yet there is nothing to undo —
   * without this, undo would rewind the engine's opening move and the engine
   * would simply play another one, which reads as the computer changing its
   * mind.
   */
  const canUndo = useMemo(
    () => snapshot.history.some((move) => move.color === playerColor),
    [playerColor, snapshot.history],
  );

  const selectSquare = useCallback(
    (square: SquareId): void => {
      if (inputLocked) return;
      base.selectSquare(square);
    },
    [base, inputLocked],
  );

  const playMove = useCallback(
    (from: SquareId, to: SquareId): boolean => {
      if (inputLocked) return false;
      return base.playMove(from, to);
    },
    [base, inputLocked],
  );

  const undo = useCallback((): void => {
    if (!snapshot.history.some((move) => move.color === playerColor)) return;
    stopThinking();
    base.undo();
  }, [base, playerColor, snapshot.history, stopThinking]);

  const restart = useCallback((): void => {
    stopThinking();
    setEngineError(null);
    base.restart();
    void engine?.newGame().catch(() => {
      // A failed reset surfaces on the next search attempt.
    });
  }, [base, engine, stopThinking]);

  const dismissEngineError = useCallback((): void => {
    setEngineError(null);
  }, []);

  return {
    ...base,
    canUndo,
    selectSquare,
    playMove,
    undo,
    restart,
    playerColor,
    engineColor,
    difficulty: preset,
    isThinking,
    isEngineLoading,
    isPlayerTurn,
    evaluation,
    engineError,
    dismissEngineError,
  };
}
