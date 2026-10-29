import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StockfishEngine } from '../src/ai';
import { App } from '../src/App';
import { ComputerGameScreen } from '../src/screens/ComputerGameScreen';
import { resolveColorChoice } from '../src/screens/ComputerSetupScreen';
import { createFakeStockfish } from './helpers/fakeStockfish';
import type { FakeStockfishOptions } from './helpers/fakeStockfish';

function engineFactory(options: FakeStockfishOptions = {}) {
  const { factory, log } = createFakeStockfish(options);
  return {
    log,
    createEngine: (): StockfishEngine =>
      new StockfishEngine({ createTransport: factory, handshakeTimeoutMs: 2000 }),
  };
}

function square(id: string): HTMLElement {
  return screen.getByTestId(`square-${id}`);
}

describe('colour choice', () => {
  it('passes a concrete colour straight through', () => {
    expect(resolveColorChoice('w')).toBe('w');
    expect(resolveColorChoice('b')).toBe('b');
  });

  it('flips a coin for random', () => {
    expect(resolveColorChoice('random', () => 0.1)).toBe('w');
    expect(resolveColorChoice('random', () => 0.9)).toBe('b');
  });
});

describe('computer setup screen', () => {
  it('offers three colours and four difficulties, with Medium preselected', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Play vs Computer/ }));

    expect(screen.getByRole('radio', { name: 'White' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Black' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Random' })).toBeInTheDocument();

    expect(screen.getByRole('radio', { name: /Medium/ })).toBeChecked();
    for (const level of ['Easy', 'Medium', 'Hard', 'Expert']) {
      expect(screen.getByRole('radio', { name: new RegExp(level) })).toBeInTheDocument();
    }
  });

  it('shows the skill level and depth behind each difficulty', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Play vs Computer/ }));

    expect(screen.getByRole('radio', { name: /Easy/ })).toHaveAccessibleName(
      /skill 0 · depth 2/,
    );
    expect(screen.getByRole('radio', { name: /Expert/ })).toHaveAccessibleName(
      /skill 20 · depth 16/,
    );
  });

  it('starts a game with the chosen colour and difficulty', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Play vs Computer/ }));
    await user.click(screen.getByRole('radio', { name: 'White' }));
    await user.click(screen.getByRole('radio', { name: /Hard/ }));
    await user.click(screen.getByRole('button', { name: 'Start game' }));

    expect(screen.getByRole('heading', { name: 'You play White' })).toBeInTheDocument();
    expect(screen.getByText(/skill 12, depth 10/)).toBeInTheDocument();
  });

  it('goes back to the main menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Play vs Computer/ }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('button', { name: /Two Players/ })).toBeInTheDocument();
  });
});

describe('computer game screen under StrictMode', () => {
  it('plays its opening move with no error banner', async () => {
    const { createEngine } = engineFactory();
    render(
      <StrictMode>
        <ComputerGameScreen
          playerColor="b"
          difficulty="easy"
          onExit={vi.fn()}
          createEngine={createEngine}
          minVisibleThinkMs={0}
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.queryByText('No moves yet.')).not.toBeInTheDocument();
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Game status' })).toHaveTextContent('Black to move');
  });
});

describe('computer game screen', () => {
  it('shows the board with the player colour at the bottom', () => {
    const { createEngine } = engineFactory();
    render(
      <ComputerGameScreen
        playerColor="b"
        difficulty="easy"
        onExit={vi.fn()}
        createEngine={createEngine}
        minVisibleThinkMs={0}
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    // Black at the bottom means rank 1 is rendered first, h-file leftmost.
    expect(cells[0]).toContainElement(square('h1'));
    expect(cells[63]).toContainElement(square('a8'));
  });

  it('shows a thinking indicator while the engine searches, then its move', async () => {
    const user = userEvent.setup();
    const { createEngine } = engineFactory({ bestMoveDelayMs: 60 });
    render(
      <ComputerGameScreen
        playerColor="w"
        difficulty="easy"
        onExit={vi.fn()}
        createEngine={createEngine}
        minVisibleThinkMs={0}
      />,
    );

    await user.click(square('e2'));
    await user.click(square('e4'));

    await waitFor(() => {
      expect(screen.getByTestId('thinking-indicator')).toHaveTextContent(/thinking/i);
    });

    await waitFor(() => {
      expect(screen.getByTestId('thinking-indicator')).toBeEmptyDOMElement();
    });

    expect(within(screen.getByRole('list')).getByText('e4')).toBeInTheDocument();
    // The engine answered, so it is the player's turn again.
    expect(screen.getByRole('status', { name: 'Game status' })).toHaveTextContent(
      'White to move',
    );
    expect(screen.getByRole('list').textContent).toMatch(/1\./);
  });

  it('locks the board while the engine is thinking', async () => {
    const user = userEvent.setup();
    const { createEngine } = engineFactory({ bestMoveDelayMs: 120 });
    render(
      <ComputerGameScreen
        playerColor="w"
        difficulty="easy"
        onExit={vi.fn()}
        createEngine={createEngine}
        minVisibleThinkMs={0}
      />,
    );

    await user.click(square('e2'));
    await user.click(square('e4'));

    await waitFor(() => {
      expect(square('d2')).toBeDisabled();
    });

    await waitFor(() => {
      expect(square('d2')).toBeEnabled();
    });
  });

  it('undo returns the board to the player with both moves removed', async () => {
    const user = userEvent.setup();
    const { createEngine } = engineFactory();
    render(
      <ComputerGameScreen
        playerColor="w"
        difficulty="easy"
        onExit={vi.fn()}
        createEngine={createEngine}
        minVisibleThinkMs={0}
      />,
    );

    await user.click(square('e2'));
    await user.click(square('e4'));

    // Wait until the engine has answered: two half-moves on the board.
    await waitFor(() => {
      expect(screen.getByRole('list').textContent ?? '').toMatch(/1\.\s*\S+\s*\S+/);
    });

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('No moves yet.')).toBeInTheDocument();
    expect(square('e2')).toHaveAttribute('aria-label', 'e2, White pawn');
    expect(screen.getByRole('status', { name: 'Game status' })).toHaveTextContent(
      'White to move',
    );
    expect(square('e2')).toBeEnabled();
  });

  it('reports an engine that fails to load, and the error can be dismissed', async () => {
    const user = userEvent.setup();
    const { createEngine } = engineFactory({ failOnStart: 'engine.wasm could not be fetched' });
    render(
      <ComputerGameScreen
        playerColor="b"
        difficulty="easy"
        onExit={vi.fn()}
        createEngine={createEngine}
        minVisibleThinkMs={0}
      />,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/engine.wasm could not be fetched/);

    await user.click(within(alert).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains what undo does in computer mode', () => {
    const { createEngine } = engineFactory();
    render(
      <ComputerGameScreen
        playerColor="w"
        difficulty="expert"
        onExit={vi.fn()}
        createEngine={createEngine}
        minVisibleThinkMs={0}
      />,
    );

    expect(screen.getByText(/Undo takes back your move and the engine/)).toBeInTheDocument();
    expect(screen.getByText(/skill 20, depth 16/)).toBeInTheDocument();
  });
});
