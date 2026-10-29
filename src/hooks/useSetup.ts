import { useCallback, useMemo, useState } from 'react';
import {
  EMPTY_SETUP,
  movePiece as movePieceOn,
  placePiece,
  removePiece,
  setupFromFen,
  setupToFen,
  standardSetup,
  countOf,
} from '../engine';
import type {
  BoardCell,
  BoardMatrix,
  CastlingFlag,
  CastlingRights,
  PieceColor,
  PieceType,
  PlacedPiece,
  SetupPosition,
  SquareId,
} from '../engine';
import { FILES, RANKS, toSquareId } from '../engine';
import { availableCastlingRights, enPassantCandidates, validateSetup } from '../validation';
import type { SetupValidation } from '../validation';

export interface PaletteEntry {
  readonly piece: PlacedPiece;
  /** How many of this exact piece are on the board right now. */
  readonly count: number;
}

export type CopyState = 'idle' | 'copied' | 'failed';

export interface UseSetupOptions {
  /** Position to open with. Defaults to the standard opening setup. */
  readonly initialFen?: string;
  /** Injected in tests, where `navigator.clipboard` does not exist. */
  readonly writeClipboard?: (text: string) => Promise<void>;
}

export interface UseSetupValue {
  readonly position: SetupPosition;
  readonly board: BoardMatrix;
  readonly fen: string;
  readonly validation: SetupValidation;
  readonly palette: readonly PaletteEntry[];
  readonly selectedPiece: PlacedPiece | null;
  /** Which castling checkboxes the current placement allows. */
  readonly availableCastling: CastlingRights;
  readonly enPassantOptions: readonly SquareId[];
  /** Which side sits at the bottom of the editor board. */
  readonly orientation: PieceColor;
  readonly loadError: string | null;
  readonly copyState: CopyState;
  readonly canStart: boolean;
  readonly selectPiece: (piece: PlacedPiece | null) => void;
  /** Places the selected palette piece, or clears the square when nothing is selected. */
  readonly useSquare: (square: SquareId) => void;
  readonly dragPiece: (from: SquareId, to: SquareId) => void;
  readonly clearBoard: () => void;
  readonly resetToStandard: () => void;
  readonly flipBoard: () => void;
  readonly setSideToMove: (color: PieceColor) => void;
  readonly toggleCastling: (flag: CastlingFlag) => void;
  readonly setEnPassant: (square: SquareId | null) => void;
  readonly setHalfMoveClock: (value: number) => void;
  readonly setFullMoveNumber: (value: number) => void;
  readonly setStrictBishops: (enabled: boolean) => void;
  readonly loadFen: (text: string) => boolean;
  readonly copyFen: () => void;
}

const PIECE_ORDER: readonly PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];
const COLOR_ORDER: readonly PieceColor[] = ['w', 'b'];

function toBoard(position: SetupPosition): BoardMatrix {
  const rows: BoardCell[][] = [];

  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    const rank = RANKS[7 - rowIndex];
    if (rank === undefined) continue;

    const row: BoardCell[] = [];
    for (const file of FILES) {
      const square = toSquareId(file, rank);
      row.push({ square, piece: position.pieces.get(square) ?? null });
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Drops any castling right the placement no longer supports.
 *
 * Moving the king off e1 has to take White's rights with it; leaving them set
 * would be an error the user never chose to make.
 */
function pruneCastling(position: SetupPosition): SetupPosition {
  const available = availableCastlingRights(position);
  const castling: CastlingRights = {
    whiteKingSide: position.castling.whiteKingSide && available.whiteKingSide,
    whiteQueenSide: position.castling.whiteQueenSide && available.whiteQueenSide,
    blackKingSide: position.castling.blackKingSide && available.blackKingSide,
    blackQueenSide: position.castling.blackQueenSide && available.blackQueenSide,
  };

  const unchanged =
    castling.whiteKingSide === position.castling.whiteKingSide &&
    castling.whiteQueenSide === position.castling.whiteQueenSide &&
    castling.blackKingSide === position.castling.blackKingSide &&
    castling.blackQueenSide === position.castling.blackQueenSide;

  return unchanged ? position : { ...position, castling };
}

function openingPosition(initialFen: string | undefined): SetupPosition {
  if (initialFen === undefined) return standardSetup();
  const loaded = setupFromFen(initialFen);
  return loaded.ok ? loaded.position : standardSetup();
}

async function defaultWriteClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
    throw new Error('The clipboard is not available in this browser.');
  }
  await navigator.clipboard.writeText(text);
}

/**
 * All custom-position state: the board being built, the three FEN state fields,
 * the palette selection and the validation result. Components read this and
 * call its actions; the rules live in `src/validation`.
 */
export function useSetup(options: UseSetupOptions = {}): UseSetupValue {
  const writeClipboard = options.writeClipboard ?? defaultWriteClipboard;

  const [position, setPosition] = useState<SetupPosition>(() =>
    openingPosition(options.initialFen),
  );
  const [selectedPiece, setSelectedPiece] = useState<PlacedPiece | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [orientation, setOrientation] = useState<PieceColor>('w');

  const update = useCallback((next: SetupPosition): void => {
    setPosition(pruneCastling(next));
    setCopyState('idle');
  }, []);

  const fen = useMemo(() => setupToFen(position), [position]);
  const validation = useMemo(() => validateSetup(position), [position]);
  const board = useMemo(() => toBoard(position), [position]);
  const availableCastling = useMemo(() => availableCastlingRights(position), [position]);
  const enPassantOptions = useMemo(
    () => enPassantCandidates(position.sideToMove),
    [position.sideToMove],
  );

  const palette = useMemo<readonly PaletteEntry[]>(
    () =>
      COLOR_ORDER.flatMap((color) =>
        PIECE_ORDER.map((type) => ({
          piece: { color, type },
          count: countOf(position, color, type),
        })),
      ),
    [position],
  );

  const selectPiece = useCallback((piece: PlacedPiece | null): void => {
    setSelectedPiece(piece);
  }, []);

  const useSquare = useCallback(
    (square: SquareId): void => {
      if (selectedPiece !== null) {
        update(placePiece(position, square, selectedPiece));
        return;
      }
      // Nothing held: a click clears the square.
      update(removePiece(position, square));
    },
    [position, selectedPiece, update],
  );

  const dragPiece = useCallback(
    (from: SquareId, to: SquareId): void => {
      update(movePieceOn(position, from, to));
    },
    [position, update],
  );

  const clearBoard = useCallback((): void => {
    setSelectedPiece(null);
    setLoadError(null);
    update({ ...EMPTY_SETUP, strictBishops: position.strictBishops });
  }, [position.strictBishops, update]);

  const resetToStandard = useCallback((): void => {
    setSelectedPiece(null);
    setLoadError(null);
    update({ ...standardSetup(), strictBishops: position.strictBishops });
  }, [position.strictBishops, update]);

  const setSideToMove = useCallback(
    (color: PieceColor): void => {
      if (color === position.sideToMove) return;
      // The en passant target belongs to the other side once the mover flips.
      update({ ...position, sideToMove: color, enPassant: null });
    },
    [position, update],
  );

  const toggleCastling = useCallback(
    (flag: CastlingFlag): void => {
      update({
        ...position,
        castling: { ...position.castling, [flag]: !position.castling[flag] },
      });
    },
    [position, update],
  );

  const setEnPassant = useCallback(
    (square: SquareId | null): void => {
      update({ ...position, enPassant: square });
    },
    [position, update],
  );

  const setHalfMoveClock = useCallback(
    (value: number): void => {
      // The editor's number input can produce NaN and negatives; clamp rather
      // than let an unusable FEN reach the engine.
      const clamped = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      update({ ...position, halfMoveClock: clamped });
    },
    [position, update],
  );

  const setFullMoveNumber = useCallback(
    (value: number): void => {
      const clamped = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
      update({ ...position, fullMoveNumber: clamped });
    },
    [position, update],
  );

  const flipBoard = useCallback((): void => {
    setOrientation((current) => (current === 'w' ? 'b' : 'w'));
  }, []);

  const setStrictBishops = useCallback(
    (enabled: boolean): void => {
      update({ ...position, strictBishops: enabled });
    },
    [position, update],
  );

  const loadFen = useCallback(
    (text: string): boolean => {
      const loaded = setupFromFen(text, position.strictBishops);
      if (!loaded.ok) {
        setLoadError(loaded.error);
        return false;
      }
      setLoadError(null);
      setSelectedPiece(null);
      update(loaded.position);
      return true;
    },
    [position.strictBishops, update],
  );

  const copyFen = useCallback((): void => {
    void writeClipboard(fen).then(
      () => setCopyState('copied'),
      () => setCopyState('failed'),
    );
  }, [fen, writeClipboard]);

  return {
    position,
    board,
    fen,
    validation,
    palette,
    selectedPiece,
    availableCastling,
    enPassantOptions,
    orientation,
    loadError,
    copyState,
    canStart: validation.isValid,
    selectPiece,
    useSquare,
    dragPiece,
    clearBoard,
    resetToStandard,
    flipBoard,
    setSideToMove,
    toggleCastling,
    setEnPassant,
    setHalfMoveClock,
    setFullMoveNumber,
    setStrictBishops,
    loadFen,
    copyFen,
  };
}
