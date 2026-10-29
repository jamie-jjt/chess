import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { GameScreen } from '../src/screens/GameScreen';

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
const PAWN_ON_SEVENTH = '8/P7/8/7k/8/8/8/K7 w - - 0 1';
/** White plays Qc7-f7; Black is then not in check and has no legal move. */
const STALEMATE_IN_ONE = '7k/2Q5/6K1/8/8/8/8/8 w - - 0 1';

function square(id: string): HTMLElement {
  return screen.getByTestId(`square-${id}`);
}

describe('start screen', () => {
  it('offers the three modes and only enables two-player play', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: /Two Players/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Play vs Computer/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Custom Position/ })).toBeEnabled();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
  });

  it('opens the board when two-player is chosen and returns to the menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Two Players/ }));
    expect(screen.getByRole('grid', { name: 'Chess board' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Main menu' }));
    expect(screen.getByRole('button', { name: /Two Players/ })).toBeInTheDocument();
  });
});

describe('two-player game screen', () => {
  it('renders all sixty-four squares with the opening position', () => {
    render(<GameScreen onExit={vi.fn()} />);

    expect(screen.getAllByRole('gridcell')).toHaveLength(64);
    expect(square('e1')).toHaveAttribute('aria-label', 'e1, White king');
    expect(square('e4')).toHaveAttribute('aria-label', 'e4, empty');
    expect(screen.getByRole('status')).toHaveTextContent('White to move');
  });

  it('highlights the selected square and its legal destinations', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} />);

    await user.click(square('e2'));

    expect(square('e2').className).toContain('square--selected');
    expect(square('e3').className).toContain('square--target');
    expect(square('e4').className).toContain('square--target');
    expect(square('e5').className).not.toContain('square--target');
  });

  it('plays a move by clicking a piece and then a destination', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} />);

    await user.click(square('e2'));
    await user.click(square('e4'));

    expect(square('e4')).toHaveAttribute('aria-label', 'e4, White pawn');
    expect(square('e2')).toHaveAttribute('aria-label', 'e2, empty');
    expect(within(screen.getByRole('list')).getByText('e4')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Black to move');
  });

  it('leaves the position unchanged after clicking an illegal destination', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} />);

    await user.click(square('e2'));
    await user.click(square('e5'));

    expect(square('e2')).toHaveAttribute('aria-label', 'e2, White pawn');
    expect(screen.getByText('No moves yet.')).toBeInTheDocument();
  });

  it('undoes one half-move', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();

    await user.click(square('e2'));
    await user.click(square('e4'));
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(square('e2')).toHaveAttribute('aria-label', 'e2, White pawn');
    expect(screen.getByText('No moves yet.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('White to move');
  });

  it('marks a checked king', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen="4k3/8/8/8/8/8/8/4KR2 w - - 0 1" />);

    await user.click(square('f1'));
    await user.click(square('f8'));

    expect(square('e8').className).toContain('square--check');
    expect(screen.getByRole('status')).toHaveTextContent('Check');
  });

  it('asks which piece a promoting pawn becomes', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen={PAWN_ON_SEVENTH} />);

    await user.click(square('a7'));
    await user.click(square('a8'));

    const picker = screen.getByRole('dialog', { name: 'Choose promotion piece' });
    expect(picker).toBeInTheDocument();
    expect(square('a8')).toHaveAttribute('aria-label', 'a8, empty');

    await user.click(within(picker).getByRole('button', { name: /rook/ }));

    expect(square('a8')).toHaveAttribute('aria-label', 'a8, White rook');
    expect(within(screen.getByRole('list')).getByText('a8=R')).toBeInTheDocument();
  });

  it('cancels the promotion and leaves the pawn in place', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen={PAWN_ON_SEVENTH} />);

    await user.click(square('a7'));
    await user.click(square('a8'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(square('a7')).toHaveAttribute('aria-label', 'a7, White pawn');
  });

  it('shows a checkmate modal and restarts from it', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen={MATE_IN_ONE} />);

    await user.click(square('a1'));
    await user.click(square('a8'));

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveTextContent('Checkmate — White wins');

    await user.click(within(modal).getByRole('button', { name: 'Play again' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(square('a1')).toHaveAttribute('aria-label', 'a1, White rook');
  });

  it('shows a stalemate modal', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen={STALEMATE_IN_ONE} />);

    await user.click(square('c7'));
    await user.click(square('f7'));

    expect(screen.getByRole('dialog')).toHaveTextContent('Draw — stalemate');
  });

  it('leaves the main menu to the caller', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<GameScreen onExit={onExit} />);

    await user.click(screen.getByRole('button', { name: 'Main menu' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
