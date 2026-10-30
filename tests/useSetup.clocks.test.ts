import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSetup } from '../src/hooks/useSetup';
import { FIXTURES } from './helpers/setupFixtures';

function harness(initialFen?: string) {
  return renderHook(() => useSetup(initialFen === undefined ? {} : { initialFen }));
}

describe('clocks', () => {
  it('starts at zero and move one', () => {
    const { result } = harness(FIXTURES.bareKings);

    expect(result.current.position.halfMoveClock).toBe(0);
    expect(result.current.position.fullMoveNumber).toBe(1);
    expect(result.current.fen).toMatch(/ 0 1$/);
  });

  it('writes the half-move clock into the FEN', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.setHalfMoveClock(99);
    });

    expect(result.current.fen).toMatch(/ 99 1$/);
  });

  it('writes the move number into the FEN', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.setFullMoveNumber(42);
    });

    expect(result.current.fen).toMatch(/ 0 42$/);
  });

  it('clamps a negative or empty half-move clock to zero', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.setHalfMoveClock(-5);
    });
    expect(result.current.position.halfMoveClock).toBe(0);

    // An emptied number input reports NaN.
    act(() => {
      result.current.setHalfMoveClock(Number.NaN);
    });
    expect(result.current.position.halfMoveClock).toBe(0);
  });

  it('clamps the move number to at least one', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.setFullMoveNumber(0);
    });
    expect(result.current.position.fullMoveNumber).toBe(1);

    act(() => {
      result.current.setFullMoveNumber(Number.NaN);
    });
    expect(result.current.position.fullMoveNumber).toBe(1);
  });

  it('rounds a fractional value down', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.setHalfMoveClock(7.9);
    });
    expect(result.current.position.halfMoveClock).toBe(7);
  });

  it('reads the clocks out of a loaded FEN', () => {
    const { result } = harness();

    act(() => {
      result.current.loadFen('4k3/8/8/8/8/8/8/R3K3 w - - 100 60');
    });

    expect(result.current.position.halfMoveClock).toBe(100);
    expect(result.current.position.fullMoveNumber).toBe(60);
    expect(result.current.fen).toMatch(/ 100 60$/);
  });

  it('warns without blocking when the clock has already reached a hundred', () => {
    const { result } = harness('4k3/8/8/8/8/8/8/R3K3 w - - 100 60');

    expect(result.current.canStart).toBe(true);
    expect(result.current.validation.errors).toEqual([]);
    expect(result.current.validation.warnings[0]?.message).toMatch(/fifty-move/i);
  });

  it('rejects a FEN whose clocks are not numbers', () => {
    const { result } = harness(FIXTURES.bareKings);

    act(() => {
      result.current.loadFen('4k3/8/8/8/8/8/8/4K3 w - - x 1');
    });

    expect(result.current.loadError).toMatch(/half-move clock must be a whole number/);
    expect(result.current.position.halfMoveClock).toBe(0);
  });

  it('resets the clocks when the board is cleared', () => {
    const { result } = harness('4k3/8/8/8/8/8/8/R3K3 w - - 100 60');

    act(() => {
      result.current.clearBoard();
    });

    expect(result.current.position.halfMoveClock).toBe(0);
    expect(result.current.position.fullMoveNumber).toBe(1);
  });
});

describe('board orientation', () => {
  it('starts with White at the bottom', () => {
    const { result } = harness();
    expect(result.current.orientation).toBe('w');
  });

  it('flips and flips back', () => {
    const { result } = harness();

    act(() => {
      result.current.flipBoard();
    });
    expect(result.current.orientation).toBe('b');

    act(() => {
      result.current.flipBoard();
    });
    expect(result.current.orientation).toBe('w');
  });

  it('does not change the position when flipping', () => {
    const { result } = harness(FIXTURES.bareKings);
    const before = result.current.fen;

    act(() => {
      result.current.flipBoard();
    });

    expect(result.current.fen).toBe(before);
  });
});
