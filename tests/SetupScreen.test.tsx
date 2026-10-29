import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { SetupScreen } from '../src/screens/SetupScreen';
import { FIXTURES } from './helpers/setupFixtures';

function square(id: string): HTMLElement {
  return screen.getByTestId(`square-${id}`);
}

function palette(code: string): HTMLElement {
  return screen.getByTestId(`palette-${code}`);
}

function renderSetup(initialFen?: string, writeClipboard?: (text: string) => Promise<void>) {
  const onStart = vi.fn<(fen: string) => void>();
  const onExit = vi.fn();
  render(
    <SetupScreen
      onStart={onStart}
      onExit={onExit}
      {...(initialFen === undefined ? {} : { initialFen })}
      {...(writeClipboard === undefined ? {} : { writeClipboard })}
    />,
  );
  return { onStart, onExit };
}

describe('reaching the setup editor', () => {
  it('is offered on the start screen and opens', async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole('button', { name: /Custom Position/ });
    expect(button).toBeEnabled();

    await user.click(button);
    expect(screen.getByRole('heading', { name: 'Custom position' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Chess board' })).toBeInTheDocument();
  });

  it('returns to the main menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Custom Position/ }));
    await user.click(screen.getByRole('button', { name: 'Main menu' }));

    expect(screen.getByRole('button', { name: /Two Players/ })).toBeInTheDocument();
  });

  it('starts a two-player game from the position that was built', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Custom Position/ }));
    await user.click(screen.getByRole('button', { name: 'Clear board' }));

    // An empty board cannot start.
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();

    await user.click(palette('wk'));
    await user.click(square('e1'));
    await user.click(palette('bk'));
    await user.click(square('e8'));
    await user.click(palette('wq'));
    await user.click(square('d1'));

    const start = screen.getByRole('button', { name: 'Start game' });
    expect(start).toBeEnabled();
    await user.click(start);

    expect(screen.getByRole('heading', { name: 'Two players' })).toBeInTheDocument();
    expect(square('d1')).toHaveAttribute('aria-label', 'd1, White queen');
    expect(square('a1')).toHaveAttribute('aria-label', 'a1, empty');
    expect(screen.getByRole('status', { name: 'Game status' })).toHaveTextContent('White to move');
  });
});

describe('the palette', () => {
  it('shows all twelve piece types with a count for each', () => {
    renderSetup();

    const items = within(screen.getByRole('region', { name: 'Piece palette' })).getAllByRole(
      'button',
    );
    expect(items).toHaveLength(12);
    expect(palette('wp')).toHaveAccessibleName('White pawn, 8 on board');
    expect(palette('bn')).toHaveAccessibleName('Black knight, 2 on board');
    expect(palette('wk')).toHaveAccessibleName('White king, 1 on board');
  });

  it('places the picked piece and keeps the count up to date', async () => {
    const user = userEvent.setup();
    renderSetup(FIXTURES.bareKings);

    expect(palette('wq')).toHaveAccessibleName('White queen, 0 on board');

    await user.click(palette('wq'));
    expect(palette('wq')).toHaveAttribute('aria-pressed', 'true');

    await user.click(square('d4'));

    expect(square('d4')).toHaveAttribute('aria-label', 'd4, White queen');
    expect(palette('wq')).toHaveAccessibleName('White queen, 1 on board');
  });

  it('clears a square when no palette piece is held', async () => {
    const user = userEvent.setup();
    renderSetup();

    await user.click(square('a1'));
    expect(square('a1')).toHaveAttribute('aria-label', 'a1, empty');
  });

  it('lets the same palette piece be unpicked so clicks remove again', async () => {
    const user = userEvent.setup();
    renderSetup();

    await user.click(palette('wq'));
    await user.click(palette('wq'));
    expect(palette('wq')).toHaveAttribute('aria-pressed', 'false');

    await user.click(square('a1'));
    expect(square('a1')).toHaveAttribute('aria-label', 'a1, empty');
  });

  it('explains what a click will do', async () => {
    const user = userEvent.setup();
    renderSetup();

    expect(screen.getByText(/Click a square to clear it/)).toBeInTheDocument();

    await user.click(palette('wr'));
    expect(screen.getByText(/Click a square to place the white rook/)).toBeInTheDocument();
  });
});

describe('the state controls', () => {
  it('switches the side to move', async () => {
    const user = userEvent.setup();
    renderSetup(FIXTURES.bareKings);

    await user.click(screen.getByRole('radio', { name: 'Black' }));

    expect(screen.getByTestId('setup-fen')).toHaveTextContent('4k3/8/8/8/8/8/8/4K3 b - - 0 1');
  });

  it('disables a castling right whose king and rook are not at home', () => {
    renderSetup(FIXTURES.bareKings);

    expect(screen.getByRole('checkbox', { name: /White kingside/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Black queenside/ })).toBeDisabled();
  });

  it('enables and ticks a castling right once the pieces are in place', async () => {
    const user = userEvent.setup();
    renderSetup(`${FIXTURES.castlingReady} w - - 0 1`);

    const whiteKingSide = screen.getByRole('checkbox', { name: /White kingside/ });
    expect(whiteKingSide).toBeEnabled();
    expect(whiteKingSide).not.toBeChecked();

    await user.click(whiteKingSide);

    expect(whiteKingSide).toBeChecked();
    expect(screen.getByTestId('setup-fen')).toHaveTextContent('w K -');
  });

  it('unticks and disables a castling right when the rook is taken off', async () => {
    const user = userEvent.setup();
    renderSetup(`${FIXTURES.castlingReady} w KQkq - 0 1`);

    expect(screen.getByRole('checkbox', { name: /White kingside/ })).toBeChecked();

    await user.click(square('h1'));

    const whiteKingSide = screen.getByRole('checkbox', { name: /White kingside/ });
    expect(whiteKingSide).toBeDisabled();
    expect(whiteKingSide).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /White queenside/ })).toBeChecked();
  });

  it('offers en passant targets for the side to move and reports a bad one', async () => {
    const user = userEvent.setup();
    renderSetup(FIXTURES.bareKings);

    const select = screen.getByRole('combobox');
    expect(within(select).getByRole('option', { name: 'd6' })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: 'd3' })).not.toBeInTheDocument();

    await user.selectOptions(select, 'd6');

    expect(screen.getByTestId('setup-fen')).toHaveTextContent('w - d6');
    expect(screen.getByText(/standing on d5/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
  });

  it('accepts an en passant square that matches a real pawn push', () => {
    renderSetup(FIXTURES.enPassantWhite);

    expect(screen.getByRole('status', { name: 'Position status' })).toHaveTextContent(
      'This position is ready to play.',
    );
    expect(screen.getByRole('button', { name: 'Start game' })).toBeEnabled();
  });
});

describe('strict bishops', () => {
  it('accepts a promoted third bishop by default', () => {
    renderSetup(FIXTURES.promotedBishop);

    expect(screen.getByText('This position is ready to play.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Strict bishops' })).not.toBeChecked();
  });

  it('rejects the same position once strict bishops is ticked', async () => {
    const user = userEvent.setup();
    renderSetup(FIXTURES.promotedBishop);

    await user.click(screen.getByRole('checkbox', { name: 'Strict bishops' }));

    expect(screen.getByText(/bishops on dark squares/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
  });
});

describe('problem reporting', () => {
  it('lists what is wrong and blocks the start button', async () => {
    const user = userEvent.setup();
    renderSetup();

    await user.click(screen.getByRole('button', { name: 'Clear board' }));

    const problems = screen.getByRole('region', { name: 'Position problems' });
    expect(within(problems).getByText('White needs a king.')).toBeInTheDocument();
    expect(within(problems).getByText('Black needs a king.')).toBeInTheDocument();
    expect(problems).toHaveTextContent('2 things to fix');
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
  });

  it('uses the singular when only one thing is wrong', async () => {
    const user = userEvent.setup();
    renderSetup(FIXTURES.bareKings);

    await user.click(square('e1'));

    expect(screen.getByRole('region', { name: 'Position problems' })).toHaveTextContent(
      'One thing to fix',
    );
  });

  it('reports touching kings in plain language', async () => {
    const user = userEvent.setup();
    renderSetup(FIXTURES.bareKings);

    await user.click(palette('wk'));
    await user.click(square('d8'));
    // The old king is still on e1, so remove it to leave exactly one each.
    await user.click(palette('wk'));
    await user.click(square('e1'));

    expect(screen.getByText(/The kings are touching/)).toBeInTheDocument();
  });

  it('reports the side not to move being in check', async () => {
    const user = userEvent.setup();
    renderSetup(FIXTURES.bareKings);

    await user.click(palette('wr'));
    await user.click(square('e2'));

    expect(screen.getByText(/Black is in check/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();

    // Handing the move to Black makes the same board legal.
    await user.click(screen.getByRole('radio', { name: 'Black' }));
    expect(screen.getByText('This position is ready to play.')).toBeInTheDocument();
  });

  it('lists every rule it checks', () => {
    renderSetup();

    expect(screen.getByText('What is checked')).toBeInTheDocument();
    expect(screen.getByText('Exactly one king per side')).toBeInTheDocument();
    expect(screen.getByText('At most 16 pieces per side in total')).toBeInTheDocument();
  });
});

describe('FEN controls', () => {
  it('shows the FEN for the position being built', () => {
    renderSetup(FIXTURES.bareKings);
    expect(screen.getByTestId('setup-fen')).toHaveTextContent(FIXTURES.bareKings);
  });

  it('loads a pasted FEN', async () => {
    const user = userEvent.setup();
    renderSetup();

    await user.type(screen.getByRole('textbox'), FIXTURES.enPassantWhite);
    await user.click(screen.getByRole('button', { name: 'Load FEN' }));

    expect(screen.getByTestId('setup-fen')).toHaveTextContent(FIXTURES.enPassantWhite);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('explains an unreadable FEN and leaves the board alone', async () => {
    const user = userEvent.setup();
    renderSetup(FIXTURES.bareKings);

    await user.type(screen.getByRole('textbox'), 'not a fen at all');
    await user.click(screen.getByRole('button', { name: 'Load FEN' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('setup-fen')).toHaveTextContent(FIXTURES.bareKings);
  });

  it('loads a readable FEN that is not playable, then explains why', async () => {
    const user = userEvent.setup();
    renderSetup();

    await user.type(screen.getByRole('textbox'), '8/8/8/8/8/8/8/8 w - - 0 1');
    await user.click(screen.getByRole('button', { name: 'Load FEN' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('White needs a king.')).toBeInTheDocument();
  });

  it('copies the FEN and says so', async () => {
    const user = userEvent.setup();
    const writeClipboard = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    renderSetup(FIXTURES.bareKings, writeClipboard);

    await user.click(screen.getByRole('button', { name: 'Copy FEN' }));

    await waitFor(() => {
      expect(screen.getByText('Copied.')).toBeInTheDocument();
    });
    expect(writeClipboard).toHaveBeenCalledWith(FIXTURES.bareKings);
  });

  it('falls back to a hint when the clipboard refuses', async () => {
    const user = userEvent.setup();
    const writeClipboard = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValue(new Error('denied'));
    renderSetup(FIXTURES.bareKings, writeClipboard);

    await user.click(screen.getByRole('button', { name: 'Copy FEN' }));

    await waitFor(() => {
      expect(screen.getByText(/Could not reach the clipboard/)).toBeInTheDocument();
    });
  });
});
