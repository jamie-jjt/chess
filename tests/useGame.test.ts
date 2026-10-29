import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { START_FEN } from '../src/engine';
import { useGame } from '../src/hooks/useGame';

const PAWN_ON_SEVENTH = '8/P7/8/7k/8/8/8/K7 w - - 0 1';
const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';

describe('useGame', () => {
  it('starts from the standard position with White to move', () => {
    const { result } = renderHook(() => useGame());

    expect(result.current.snapshot.fen).toBe(START_FEN);
    expect(result.current.snapshot.turn).toBe('w');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.isGameOver).toBe(false);
    expect(result.current.selectedSquare).toBeNull();
    expect(result.current.legalTargets).toEqual([]);
  });

  it('selects a piece of the side to move and lists its destinations', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.selectSquare('e2');
    });

    expect(result.current.selectedSquare).toBe('e2');
    expect([...result.current.legalTargets].sort()).toEqual(['e3', 'e4']);
  });

  it('ignores a click on an empty square or an opponent piece', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.selectSquare('e4');
    });
    expect(result.current.selectedSquare).toBeNull();

    act(() => {
      result.current.selectSquare('e7');
    });
    expect(result.current.selectedSquare).toBeNull();
  });

  it('plays a move with a second click and passes the turn', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.selectSquare('e2');
    });
    act(() => {
      result.current.selectSquare('e4');
    });

    expect(result.current.snapshot.turn).toBe('b');
    expect(result.current.snapshot.history.map((move) => move.san)).toEqual(['e4']);
    expect(result.current.selectedSquare).toBeNull();
    expect(result.current.canUndo).toBe(true);
  });

  it('deselects when the selected square is clicked again', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.selectSquare('e2');
    });
    act(() => {
      result.current.selectSquare('e2');
    });

    expect(result.current.selectedSquare).toBeNull();
    expect(result.current.snapshot.history).toHaveLength(0);
  });

  it('switches selection when an illegal destination holds another own piece', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.selectSquare('e2');
    });
    act(() => {
      result.current.selectSquare('d2');
    });

    expect(result.current.selectedSquare).toBe('d2');
    expect(result.current.snapshot.history).toHaveLength(0);
  });

  it('rejects an illegal drag and drop without changing the position', () => {
    const { result } = renderHook(() => useGame());
    let accepted = true;

    act(() => {
      accepted = result.current.playMove('e2', 'e5');
    });

    expect(accepted).toBe(false);
    expect(result.current.snapshot.fen).toBe(START_FEN);
  });

  it('accepts a legal drag and drop', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.playMove('g1', 'f3');
    });

    expect(result.current.snapshot.history.map((move) => move.san)).toEqual(['Nf3']);
  });

  it('asks for a promotion piece instead of moving straight away', () => {
    const { result } = renderHook(() => useGame({ initialFen: PAWN_ON_SEVENTH }));

    act(() => {
      result.current.playMove('a7', 'a8');
    });

    expect(result.current.pendingPromotion).toEqual({ from: 'a7', to: 'a8', color: 'w' });
    expect(result.current.snapshot.history).toHaveLength(0);
  });

  it('completes the promotion with the chosen piece', () => {
    const { result } = renderHook(() => useGame({ initialFen: PAWN_ON_SEVENTH }));

    act(() => {
      result.current.playMove('a7', 'a8');
    });
    act(() => {
      result.current.confirmPromotion('n');
    });

    expect(result.current.pendingPromotion).toBeNull();
    expect(result.current.snapshot.history.map((move) => move.san)).toEqual(['a8=N']);
  });

  it('abandons the promotion when cancelled', () => {
    const { result } = renderHook(() => useGame({ initialFen: PAWN_ON_SEVENTH }));

    act(() => {
      result.current.playMove('a7', 'a8');
    });
    act(() => {
      result.current.cancelPromotion();
    });

    expect(result.current.pendingPromotion).toBeNull();
    expect(result.current.snapshot.fen).toBe(PAWN_ON_SEVENTH);
  });

  it('reverts exactly one half-move on undo', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.playMove('e2', 'e4');
    });
    act(() => {
      result.current.playMove('e7', 'e5');
    });
    expect(result.current.snapshot.turn).toBe('w');

    act(() => {
      result.current.undo();
    });

    expect(result.current.snapshot.history.map((move) => move.san)).toEqual(['e4']);
    expect(result.current.snapshot.turn).toBe('b');
  });

  it('does nothing on undo when no move has been played', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.undo();
    });

    expect(result.current.snapshot.fen).toBe(START_FEN);
    expect(result.current.canUndo).toBe(false);
  });

  it('reports check and locates the king', () => {
    const { result } = renderHook(() => useGame({ initialFen: '4k3/8/8/8/8/8/8/4KR2 w - - 0 1' }));

    act(() => {
      result.current.playMove('f1', 'f8');
    });

    expect(result.current.snapshot.isCheck).toBe(true);
    expect(result.current.snapshot.checkedKingSquare).toBe('e8');
  });

  it('ends the game on checkmate and blocks further input', () => {
    const { result } = renderHook(() => useGame({ initialFen: MATE_IN_ONE }));

    act(() => {
      result.current.playMove('a1', 'a8');
    });

    expect(result.current.isGameOver).toBe(true);
    expect(result.current.snapshot.result).toEqual({
      type: 'checkmate',
      winner: 'w',
      loser: 'b',
    });

    act(() => {
      result.current.selectSquare('g8');
    });
    expect(result.current.selectedSquare).toBeNull();
  });

  it('restarts back to the position it was given', () => {
    const { result } = renderHook(() => useGame({ initialFen: MATE_IN_ONE }));

    act(() => {
      result.current.playMove('a1', 'a8');
    });
    act(() => {
      result.current.restart();
    });

    expect(result.current.snapshot.fen).toBe(MATE_IN_ONE);
    expect(result.current.snapshot.history).toHaveLength(0);
    expect(result.current.isGameOver).toBe(false);
  });
});
