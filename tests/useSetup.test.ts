import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { START_FEN } from '../src/engine';
import { useSetup } from '../src/hooks/useSetup';
import { FIXTURES } from './helpers/setupFixtures';

function harness(initialFen?: string, writeClipboard?: (text: string) => Promise<void>) {
  return renderHook(() =>
    useSetup({
      ...(initialFen === undefined ? {} : { initialFen }),
      ...(writeClipboard === undefined ? {} : { writeClipboard }),
    }),
  );
}

describe('useSetup opening state', () => {
  it('opens on the standard position, which is ready to play', () => {
    const { result } = harness();

    expect(result.current.fen).toBe(START_FEN);
    expect(result.current.validation.isValid).toBe(true);
    expect(result.current.canStart).toBe(true);
    expect(result.current.selectedPiece).toBeNull();
    expect(result.current.loadError).toBeNull();
  });

  it('opens on a supplied position', () => {
    const { result } = harness(FIXTURES.bareKings);
    expect(result.current.fen).toBe(FIXTURES.bareKings);
  });

  it('falls back to the standard position when the supplied FEN is unreadable', () => {
    const { result } = harness('nonsense');
    expect(result.current.fen).toBe(START_FEN);
  });

  it('builds a board of 64 cells with rank 8 first', () => {
    const { result } = harness();

    expect(result.current.board).toHaveLength(8);
    expect(result.current.board[0]?.[0]).toEqual({
      square: 'a8',
      piece: { color: 'b', type: 'r' },
    });
    expect(result.current.board[7]?.[4]).toEqual({
      square: 'e1',
      piece: { color: 'w', type: 'k' },
    });
  });

  it('offers all twelve piece types with live counts', () => {
    const { result } = harness();

    expect(result.current.palette).toHaveLength(12);
    const whitePawn = result.current.palette.find(
      (entry) => entry.piece.color === 'w' && entry.piece.type === 'p',
    );
    const blackRook = result.current.palette.find(
      (entry) => entry.piece.color === 'b' && entry.piece.type === 'r',
    );

    expect(whitePawn?.count).toBe(8);
    expect(blackRook?.count).toBe(2);
  });
});

describe('placing and removing pieces', () => {
  it('places the selected palette piece on a click', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.selectPiece({ color: 'w', type: 'q' });
    });
    act(() => {
      result.current.useSquare('d4');
    });

    expect(result.current.position.pieces.get('d4')).toEqual({ color: 'w', type: 'q' });
    expect(result.current.fen).toMatch(/^4k3\/8\/8\/8\/3Q4\/8\/8\/4K3 w/);
  });

  it('keeps the selection so several pieces can be placed in a row', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.selectPiece({ color: 'b', type: 'n' });
    });
    act(() => {
      result.current.useSquare('c6');
    });
    act(() => {
      result.current.useSquare('f6');
    });

    expect(result.current.position.pieces.size).toBe(4);
    expect(result.current.selectedPiece).toEqual({ color: 'b', type: 'n' });
  });

  it('updates the palette count as pieces go down', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.selectPiece({ color: 'w', type: 'r' });
    });
    act(() => {
      result.current.useSquare('a1');
    });

    const whiteRook = result.current.palette.find(
      (entry) => entry.piece.color === 'w' && entry.piece.type === 'r',
    );
    expect(whiteRook?.count).toBe(1);
  });

  it('clears a square on a click when nothing is selected', () => {
    const { result } = harness();

    act(() => {
      result.current.useSquare('a1');
    });

    expect(result.current.position.pieces.has('a1')).toBe(false);
  });

  it('drags a piece from one square to another', () => {
    const { result } = harness();

    act(() => {
      result.current.dragPiece('e2', 'e4');
    });

    expect(result.current.position.pieces.has('e2')).toBe(false);
    expect(result.current.position.pieces.get('e4')).toEqual({ color: 'w', type: 'p' });
  });

  it('empties the board but keeps the strict-bishops choice', () => {
    const { result } = harness();

    act(() => {
      result.current.setStrictBishops(true);
    });
    act(() => {
      result.current.clearBoard();
    });

    expect(result.current.position.pieces.size).toBe(0);
    expect(result.current.position.strictBishops).toBe(true);
    expect(result.current.validation.isValid).toBe(false);
    expect(result.current.canStart).toBe(false);
  });

  it('restores the standard position', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.resetToStandard();
    });

    expect(result.current.fen).toBe(START_FEN);
  });
});

describe('the three state fields', () => {
  it('switches the side to move', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.setSideToMove('b');
    });

    expect(result.current.position.sideToMove).toBe('b');
    expect(result.current.fen).toMatch(/ b /);
  });

  it('drops the en passant square when the side to move changes', () => {
    const { result } = harness(FIXTURES.enPassantWhite);

    expect(result.current.position.enPassant).toBe('d6');

    act(() => {
      result.current.setSideToMove('b');
    });

    expect(result.current.position.enPassant).toBeNull();
  });

  it('offers en passant targets on the rank that matches the side to move', () => {
    const { result } = harness(FIXTURES.bareKings);

    expect(result.current.enPassantOptions[0]).toBe('a6');

    act(() => {
      result.current.setSideToMove('b');
    });

    expect(result.current.enPassantOptions[0]).toBe('a3');
  });

  it('sets and clears the en passant square', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.setEnPassant('d6');
    });
    expect(result.current.fen).toMatch(/ d6 /);
    // No pawn to justify it, so the rule objects.
    expect(result.current.validation.issues.map((problem) => problem.rule)).toContain(
      'en-passant-square',
    );

    act(() => {
      result.current.setEnPassant(null);
    });
    expect(result.current.fen).toMatch(/ - 0 1$/);
    expect(result.current.validation.isValid).toBe(true);
  });

  it('allows only the castling rights the placement supports', () => {
    const { result } = harness(FIXTURES.bareKings);

    expect(result.current.availableCastling).toEqual({
      whiteKingSide: false,
      whiteQueenSide: false,
      blackKingSide: false,
      blackQueenSide: false,
    });

    const { result: ready } = harness(`${FIXTURES.castlingReady} w - - 0 1`);
    expect(ready.current.availableCastling.whiteKingSide).toBe(true);
  });

  it('toggles a castling right that the placement supports', () => {
    const { result } = harness(`${FIXTURES.castlingReady} w - - 0 1`);

    act(() => {
      result.current.toggleCastling('whiteKingSide');
    });

    expect(result.current.position.castling.whiteKingSide).toBe(true);
    expect(result.current.fen).toMatch(/ K /);
    expect(result.current.validation.isValid).toBe(true);
  });

  it('withdraws a castling right as soon as the king leaves its square', () => {
    const { result } = harness(`${FIXTURES.castlingReady} w KQkq - 0 1`);

    expect(result.current.position.castling.whiteKingSide).toBe(true);

    act(() => {
      result.current.dragPiece('e1', 'd1');
    });

    expect(result.current.position.castling.whiteKingSide).toBe(false);
    expect(result.current.position.castling.whiteQueenSide).toBe(false);
    expect(result.current.position.castling.blackKingSide).toBe(true);
    // Pruned rather than left to fail validation.
    expect(result.current.validation.isValid).toBe(true);
  });

  it('withdraws a castling right when the rook is removed', () => {
    const { result } = harness(`${FIXTURES.castlingReady} w KQkq - 0 1`);

    act(() => {
      result.current.useSquare('h1');
    });

    expect(result.current.position.castling.whiteKingSide).toBe(false);
    expect(result.current.position.castling.whiteQueenSide).toBe(true);
  });

  it('turns strict bishops on and off, changing what is allowed', () => {
    const { result } = harness(FIXTURES.promotedBishop);

    expect(result.current.validation.isValid).toBe(true);

    act(() => {
      result.current.setStrictBishops(true);
    });
    expect(result.current.validation.isValid).toBe(false);
    expect(result.current.canStart).toBe(false);

    act(() => {
      result.current.setStrictBishops(false);
    });
    expect(result.current.validation.isValid).toBe(true);
  });
});

describe('loading and copying FEN', () => {
  it('loads a valid FEN', () => {
    const { result } = harness();
    let accepted = false;

    act(() => {
      accepted = result.current.loadFen(FIXTURES.enPassantWhite);
    });

    expect(accepted).toBe(true);
    expect(result.current.fen).toBe(FIXTURES.enPassantWhite);
    expect(result.current.loadError).toBeNull();
  });

  it('tolerates surrounding whitespace', () => {
    const { result } = harness();

    act(() => {
      result.current.loadFen(`   ${FIXTURES.bareKings}   `);
    });

    expect(result.current.fen).toBe(FIXTURES.bareKings);
  });

  it('refuses an unreadable FEN and leaves the board alone', () => {
    const { result } = harness();
    let accepted = true;

    act(() => {
      accepted = result.current.loadFen('this is not a fen');
    });

    expect(accepted).toBe(false);
    expect(result.current.loadError).toBeTruthy();
    expect(result.current.fen).toBe(START_FEN);
  });

  it('loads a readable but unplayable FEN so the validator can explain it', () => {
    const { result } = harness();

    act(() => {
      result.current.loadFen('8/8/8/8/8/8/8/8 w - - 0 1');
    });

    expect(result.current.loadError).toBeNull();
    expect(result.current.canStart).toBe(false);
    expect(result.current.validation.issues.map((problem) => problem.message)).toEqual([
      'White needs a king.',
      'Black needs a king.',
    ]);
  });

  it('clears a previous load error on the next good FEN', () => {
    const { result } = harness();

    act(() => {
      result.current.loadFen('rubbish');
    });
    expect(result.current.loadError).toBeTruthy();

    act(() => {
      result.current.loadFen(FIXTURES.bareKings);
    });
    expect(result.current.loadError).toBeNull();
  });

  it('copies the current FEN', async () => {
    const writeClipboard = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    const { result } = harness(FIXTURES.bareKings, writeClipboard);

    act(() => {
      result.current.copyFen();
    });

    await waitFor(() => {
      expect(result.current.copyState).toBe('copied');
    });
    expect(writeClipboard).toHaveBeenCalledWith(FIXTURES.bareKings);
  });

  it('reports a clipboard that refuses', async () => {
    const writeClipboard = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('denied'));
    const { result } = harness(FIXTURES.bareKings, writeClipboard);

    act(() => {
      result.current.copyFen();
    });

    await waitFor(() => {
      expect(result.current.copyState).toBe('failed');
    });
  });

  it('forgets the copied state once the position changes', async () => {
    const writeClipboard = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    const { result } = harness(FIXTURES.bareKings, writeClipboard);

    act(() => {
      result.current.copyFen();
    });
    await waitFor(() => {
      expect(result.current.copyState).toBe('copied');
    });

    act(() => {
      result.current.setSideToMove('b');
    });

    expect(result.current.copyState).toBe('idle');
  });
});
