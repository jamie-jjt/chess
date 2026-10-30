import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { GameScreen } from '../src/screens/GameScreen';

const MATE_IN_ONE = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';
const PAWN_ON_SEVENTH = '8/P7/8/7k/8/8/8/K7 w - - 0 1';
/** White plays Qc7-f7; Black is then not in check and has no legal move. */
const STALEMATE_IN_ONE = '7k/2Q5/6K1/8/8/8/8/8 w - - 0 1';
const CASTLING_CASES = [
  { name: 'White kingside by click', fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1', king: 'e1', target: 'g1', rookFrom: 'h1', rookTo: 'f1', side: 'kingside', mode: 'click' },
  { name: 'White queenside by keyboard', fen: '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1', king: 'e1', target: 'c1', rookFrom: 'a1', rookTo: 'd1', side: 'queenside', mode: 'keyboard' },
  { name: 'Black kingside by click', fen: '4k2r/8/8/8/8/8/8/4K3 b k - 0 1', king: 'e8', target: 'g8', rookFrom: 'h8', rookTo: 'f8', side: 'kingside', mode: 'click' },
  { name: 'Black queenside by keyboard', fen: 'r3k3/8/8/8/8/8/8/4K3 b q - 0 1', king: 'e8', target: 'c8', rookFrom: 'a8', rookTo: 'd8', side: 'queenside', mode: 'keyboard' },
] as const;

function square(id: string): HTMLElement {
  return screen.getByTestId(`square-${id}`);
}

function enableFullscreen() {
  let activeElement: Element | null = null;
  let requestedElement: HTMLElement | null = null;
  const requestFullscreen = vi.fn(function (this: HTMLElement): Promise<void> {
    requestedElement = this;
    return Promise.resolve();
  });
  const exitFullscreen = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => activeElement });
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: requestFullscreen });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen });
  return {
    exitFullscreen,
    requestFullscreen,
    get requestedElement() { return requestedElement; },
    setActive(value: Element | null) {
      activeElement = value;
      document.dispatchEvent(new Event('fullscreenchange'));
    },
  };
}

afterEach(() => {
  Reflect.deleteProperty(document, 'fullscreenEnabled');
  Reflect.deleteProperty(document, 'fullscreenElement');
  Reflect.deleteProperty(document, 'exitFullscreen');
  Reflect.deleteProperty(HTMLElement.prototype, 'requestFullscreen');
});

describe('start screen', () => {
  it('keeps fullscreen off the menu and targets only a playable board', async () => {
    const fullscreenApi = enableFullscreen();
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Chess' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Two Players/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Play vs Computer/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Custom Position/ })).toBeEnabled();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /full screen/i })).not.toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole('button', { name: /Two Players/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /Play vs Computer/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /Custom Position/ })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /Two Players/ }));
    const stage = screen.getByTestId('board-fullscreen-stage');
    const fullscreen = await screen.findByRole('button', { name: 'Enter board full screen' });
    expect(fullscreen).toHaveAttribute('aria-pressed', 'false');

    await user.click(fullscreen);
    expect(fullscreenApi.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(fullscreenApi.requestedElement).toBe(stage);
    expect(fullscreenApi.requestedElement).not.toBe(document.documentElement);

    fullscreenApi.setActive(stage);
    const exit = await screen.findByRole('button', { name: 'Exit board full screen' });
    expect(exit).toHaveAttribute('aria-pressed', 'true');
    await user.click(exit);
    expect(fullscreenApi.exitFullscreen).toHaveBeenCalledTimes(1);

    fullscreenApi.setActive(null);
    expect(await screen.findByRole('button', { name: 'Enter board full screen' })).toHaveAttribute('aria-pressed', 'false');
    fullscreenApi.requestFullscreen.mockRejectedValueOnce(new Error('denied'));
    await user.click(screen.getByRole('button', { name: 'Enter board full screen' }));
    expect(await screen.findByText('Full screen could not be opened. The game still fills this window.')).toBeInTheDocument();
  });

  it('omits board fullscreen when the API is unavailable', () => {
    render(<GameScreen onExit={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /board full screen/i })).not.toBeInTheDocument();
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
    expect(screen.getAllByTestId(/^square-/).filter((item) => item.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(square('e1')).toHaveAttribute('aria-label', 'e1, White king');
    expect(square('e4')).toHaveAttribute('aria-label', 'e4, empty');
    expect(screen.getByRole('status')).toHaveTextContent('White to move');
  });

  it('highlights the selected square and its legal destinations', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} />);

    square('e2').focus();
    await user.keyboard('{Enter}');

    expect(square('e2').className).toContain('square--selected');
    expect(square('e2')).toHaveAttribute('aria-describedby', 'square-state-e2');
    expect(square('e3').className).toContain('square--target');
    expect(square('e4').className).toContain('square--target');
    expect(square('e5').className).not.toContain('square--target');

    await user.keyboard('{Escape}');
    expect(square('e2').className).not.toContain('square--selected');
  });

  it.each(CASTLING_CASES)('casts $name and moves the rook', async ({ fen, king, target, rookFrom, rookTo, side, mode }) => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen={fen} />);

    expect(document.querySelector('.game__castle-availability')).toHaveTextContent(
      `Castling available — select your king, then ${target}.`,
    );
    expect(document.querySelector('.game__castle-help')).toHaveTextContent(/king and rook must be unmoved/i);
    expect([...document.querySelectorAll('[aria-live="polite"]')].filter((item) => item.textContent?.includes('Castling available'))).toHaveLength(1);

    if (mode === 'click') {
      await user.click(square(king));
    } else {
      square(king).focus();
      await user.keyboard('{Enter}');
    }

    expect(square(target)).toHaveAccessibleDescription(`legal destination, castle ${side}`);
    expect(square(target)).toHaveClass('square--castle');

    if (mode === 'click') {
      await user.click(square(target));
    } else {
      square(target).focus();
      await user.keyboard('{Enter}');
    }

    expect(square(target)).toHaveAttribute('aria-label', expect.stringMatching(/king$/));
    expect(square(rookFrom)).toHaveAttribute('aria-label', `${rookFrom}, empty`);
    expect(square(rookTo)).toHaveAttribute('aria-label', expect.stringMatching(/rook$/));
    expect(within(screen.getByRole('list')).getByText(side === 'kingside' ? 'O-O' : 'O-O-O')).toBeInTheDocument();
    expect(document.querySelector('.game__castle-availability')).not.toBeInTheDocument();
  });

  it('keeps click, drag and keyboard moves working in board fullscreen', async () => {
    const fullscreenApi = enableFullscreen();
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} />);

    const stage = screen.getByTestId('board-fullscreen-stage');
    await user.click(await screen.findByRole('button', { name: 'Enter board full screen' }));
    fullscreenApi.setActive(stage);

    await user.click(square('e2'));
    await user.click(square('e4'));
    expect(square('e4')).toHaveAttribute('aria-label', 'e4, White pawn');

    const blackPawn = square('e7').querySelector<HTMLElement>('[data-piece]');
    expect(blackPawn).not.toBeNull();
    fireEvent.dragStart(blackPawn as HTMLElement);
    fireEvent.dragOver(square('e5'));
    fireEvent.drop(square('e5'));
    expect(square('e5')).toHaveAttribute('aria-label', 'e5, Black pawn');

    square('g1').focus();
    await user.keyboard('{Enter}');
    square('f3').focus();
    await user.keyboard('{Enter}');
    expect(square('f3')).toHaveAttribute('aria-label', 'f3, White knight');
    expect(document.fullscreenElement).toBe(stage);
  });

  it('plays a keyboard move and contains and restores confirmation focus', async () => {
    enableFullscreen();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Two Players/ }));

    square('e2').focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(square('e3')).toHaveAttribute('aria-label', 'e3, White pawn'));
    expect(square('e3')).toHaveFocus();
    expect(square('e2')).toHaveAttribute('aria-label', 'e2, empty');
    expect(within(screen.getByRole('list')).getByText('e3')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Game status' })).toHaveTextContent('Black to move');

    const restart = screen.getByRole('button', { name: 'Restart' });
    await user.click(restart);
    const dialog = screen.getByRole('dialog', { name: 'Restart this game?' });
    const surface = document.getElementById('app-surface');
    expect(surface?.inert).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Restart game' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(surface?.inert).toBe(false);
    expect(restart).toHaveFocus();
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

  it('keeps promotion inside the fullscreen stage and restores square focus', async () => {
    const fullscreenApi = enableFullscreen();
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen={PAWN_ON_SEVENTH} />);

    const stage = screen.getByTestId('board-fullscreen-stage');
    await user.click(await screen.findByRole('button', { name: 'Enter board full screen' }));
    fullscreenApi.setActive(stage);
    await user.click(square('a7'));
    await user.click(square('a8'));

    const picker = screen.getByRole('dialog', { name: 'Choose promotion piece' });
    expect(stage).toContainElement(picker);
    expect(stage.querySelector('.game__board-stage-background')).toHaveProperty('inert', true);
    expect(square('a8')).toHaveAttribute('aria-label', 'a8, empty');

    await user.click(within(picker).getByRole('button', { name: /rook/ }));

    expect(square('a8')).toHaveAttribute('aria-label', 'a8, White rook');
    expect(square('a8')).toHaveFocus();
    expect(within(screen.getByRole('list')).getByText('a8=R')).toBeInTheDocument();
  });

  it('cancels the promotion and leaves the pawn in place', async () => {
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen={PAWN_ON_SEVENTH} />);

    await user.click(square('a7'));
    await user.click(square('a8'));
    expect(screen.getByRole('button', { name: /queen/i })).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(square('a7')).toHaveAttribute('aria-label', 'a7, White pawn');
    await waitFor(() => expect(square('a7')).toHaveFocus());
  });

  it('keeps game over inside fullscreen and relocates it after native exit', async () => {
    const fullscreenApi = enableFullscreen();
    const user = userEvent.setup();
    render(<GameScreen onExit={vi.fn()} initialFen={MATE_IN_ONE} />);

    const stage = screen.getByTestId('board-fullscreen-stage');
    await user.click(await screen.findByRole('button', { name: 'Enter board full screen' }));
    fullscreenApi.setActive(stage);
    await user.click(square('a1'));
    await user.click(square('a8'));

    let modal = screen.getByRole('dialog');
    expect(modal).toHaveTextContent('Checkmate — White wins');
    expect(stage).toContainElement(modal);
    expect(within(modal).getByRole('button', { name: 'Play again' })).toHaveFocus();

    fullscreenApi.setActive(null);
    await waitFor(() => {
      modal = screen.getByRole('dialog');
      expect(stage).not.toContainElement(modal);
      expect(document.body).toContainElement(modal);
    });
    expect(within(modal).getByRole('button', { name: 'Play again' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(modal).toBeInTheDocument();

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
