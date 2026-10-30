import { useCallback, useMemo, useRef, useState } from 'react';
import { ChessGame, START_FEN } from '../engine';
import type { GameSnapshot, PieceColor, PromotionPiece, SquareId } from '../engine';

export interface PendingPromotion {
  readonly from: SquareId;
  readonly to: SquareId;
  readonly color: PieceColor;
}

export interface UseGameOptions {
  /** Starting position. Defaults to the standard opening setup. */
  readonly initialFen?: string;
  /**
   * Set in computer mode. Undo then rewinds far enough that it is this colour's
   * turn again, which means taking back the engine's reply along with the
   * player's own move. Leave undefined for two-player play, where undo reverts
   * exactly one half-move.
   */
  readonly playerColor?: PieceColor;
}

export interface UseGameValue {
  readonly snapshot: GameSnapshot;
  readonly selectedSquare: SquareId | null;
  readonly legalTargets: readonly SquareId[];
  readonly castlingTargets: readonly SquareId[];
  readonly pendingPromotion: PendingPromotion | null;
  readonly canUndo: boolean;
  readonly isGameOver: boolean;
  /** Click handler for a square: selects, moves, re-selects or clears as appropriate. */
  readonly selectSquare: (square: SquareId) => void;
  /** Direct move attempt (drag and drop). False when the move is illegal. */
  readonly playMove: (from: SquareId, to: SquareId) => boolean;
  /**
   * Plays a move without ever opening the promotion picker. Used for moves that
   * already carry their promotion piece, such as the engine's.
   */
  readonly applyMove: (from: SquareId, to: SquareId, promotion?: PromotionPiece) => boolean;
  readonly confirmPromotion: (piece: PromotionPiece) => void;
  readonly cancelPromotion: () => void;
  readonly undo: () => void;
  readonly restart: () => void;
  /** Current position straight from the engine, for callers that cannot wait for a re-render. */
  readonly currentFen: () => string;
}

/**
 * Owns all two-player game state. Components read from this hook and call its
 * actions; they never touch the engine directly.
 */
export function useGame(options: UseGameOptions = {}): UseGameValue {
  const initialFen = options.initialFen ?? START_FEN;
  const playerColor = options.playerColor;

  const gameRef = useRef<ChessGame | null>(null);
  if (gameRef.current === null) gameRef.current = new ChessGame(initialFen);
  const game = gameRef.current;

  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => game.snapshot());
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, []);

  const refresh = useCallback(() => {
    setSnapshot(game.snapshot());
  }, [game]);

  const legalTargets = useMemo<readonly SquareId[]>(
    () => (selectedSquare === null ? [] : game.legalDestinationsFrom(selectedSquare)),
    // `snapshot` is the render-level proof that the position changed.
    [game, selectedSquare, snapshot],
  );
  const castlingTargets = useMemo<readonly SquareId[]>(
    () => game.legalMoves()
      .filter((move) => move.piece === 'k' && move.san.startsWith('O-O'))
      .map((move) => move.to),
    [game, snapshot],
  );

  const applyMove = useCallback(
    (from: SquareId, to: SquareId, promotion?: PromotionPiece): boolean => {
      const played = game.move(from, to, promotion);
      if (played === null) return false;

      clearSelection();
      refresh();
      return true;
    },
    [clearSelection, game, refresh],
  );

  const playMove = useCallback(
    (from: SquareId, to: SquareId): boolean => {
      if (game.isGameOver()) return false;

      if (game.needsPromotion(from, to)) {
        setSelectedSquare(from);
        setPendingPromotion({ from, to, color: game.turn() });
        return true;
      }

      return applyMove(from, to);
    },
    [applyMove, game],
  );

  const selectSquare = useCallback(
    (square: SquareId): void => {
      if (pendingPromotion !== null) return;
      if (game.isGameOver()) return;

      const piece = game.pieceAt(square);

      if (selectedSquare === null) {
        if (piece !== null && piece.color === game.turn()) setSelectedSquare(square);
        return;
      }

      if (square === selectedSquare) {
        clearSelection();
        return;
      }

      if (playMove(selectedSquare, square)) return;

      // The move was not legal: treat the click as picking a different piece.
      setSelectedSquare(piece !== null && piece.color === game.turn() ? square : null);
    },
    [clearSelection, game, pendingPromotion, playMove, selectedSquare],
  );

  const confirmPromotion = useCallback(
    (piece: PromotionPiece): void => {
      if (pendingPromotion === null) return;
      const played = game.move(pendingPromotion.from, pendingPromotion.to, piece);
      clearSelection();
      if (played !== null) refresh();
    },
    [clearSelection, game, pendingPromotion, refresh],
  );

  const cancelPromotion = useCallback((): void => {
    clearSelection();
  }, [clearSelection]);

  /**
   * Two-player mode takes back one half-move. Computer mode keeps taking back
   * half-moves until it is the player's turn again, which removes the engine's
   * reply together with the player's own move.
   */
  const undo = useCallback((): void => {
    clearSelection();

    const first = game.undo();
    if (first === null) return;

    if (playerColor !== undefined) {
      // At most one further ply is ever needed, but the loop is bounded anyway.
      while (game.turn() !== playerColor) {
        if (game.undo() === null) break;
      }
    }

    refresh();
  }, [clearSelection, game, playerColor, refresh]);

  const restart = useCallback((): void => {
    clearSelection();
    game.reset(initialFen);
    refresh();
  }, [clearSelection, game, initialFen, refresh]);

  const currentFen = useCallback((): string => game.fen(), [game]);

  return {
    snapshot,
    selectedSquare,
    legalTargets,
    castlingTargets,
    pendingPromotion,
    canUndo: snapshot.history.length > 0,
    isGameOver: snapshot.result.type !== 'in-progress',
    selectSquare,
    playMove,
    applyMove,
    confirmPromotion,
    cancelPromotion,
    undo,
    restart,
    currentFen,
  };
}
