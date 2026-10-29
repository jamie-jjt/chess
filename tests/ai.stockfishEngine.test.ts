import { describe, expect, it } from 'vitest';
import { StockfishEngine } from '../src/ai';
import { ChessGame, START_FEN, isValidFen } from '../src/engine';
import { createFakeStockfish } from './helpers/fakeStockfish';
import type { FakeStockfishOptions } from './helpers/fakeStockfish';

function makeEngine(options: FakeStockfishOptions = {}) {
  const { factory, log } = createFakeStockfish(options);
  const engine = new StockfishEngine({ createTransport: factory, handshakeTimeoutMs: 2000 });
  return { engine, log };
}

const EASY = { depth: 2, maxThinkMs: 400, skillLevel: 0 } as const;

describe('StockfishEngine handshake', () => {
  it('completes the UCI handshake and applies the base options', async () => {
    const { engine, log } = makeEngine();
    await engine.start();

    expect(log.commands).toEqual([
      'uci',
      'setoption name Hash value 16',
      'setoption name MultiPV value 1',
      'isready',
    ]);
    expect(engine.getState()).toBe('ready');
  });

  it('starts only once however many times it is called', async () => {
    const { engine, log } = makeEngine();
    await Promise.all([engine.start(), engine.start(), engine.start()]);

    expect(log.commands.filter((command) => command === 'uci')).toHaveLength(1);
  });

  it('reports a transport failure and stays failed', async () => {
    const { engine } = makeEngine({ failOnStart: 'wasm did not load' });

    await expect(engine.start()).rejects.toThrow(/wasm did not load/);
    expect(engine.getState()).toBe('failed');
    await expect(engine.start()).rejects.toThrow(/wasm did not load/);
  });

  it('clears its state for a new game', async () => {
    const { engine, log } = makeEngine();
    await engine.newGame();
    expect(log.commands).toContain('ucinewgame');
  });

  it('refuses to work once disposed', async () => {
    const { engine, log } = makeEngine();
    await engine.start();
    engine.dispose();

    expect(engine.getState()).toBe('disposed');
    expect(log.terminatedCount()).toBe(1);
    await expect(engine.start()).rejects.toThrow(/shut down/);
  });
});

describe('StockfishEngine search', () => {
  it('sends the position and the search limits, then returns the move', async () => {
    const { engine, log } = makeEngine();
    const outcome = await engine.findBestMove({ fen: START_FEN, ...EASY });

    expect(outcome).toEqual({ status: 'move', move: { from: 'a2', to: 'a3', promotion: null } });
    expect(log.commands).toContain('setoption name Skill Level value 0');
    expect(log.commands).toContain(`position fen ${START_FEN}`);
    expect(log.commands).toContain('go depth 2 movetime 400');
  });

  it('maps difficulty settings straight onto the search commands', async () => {
    const { engine, log } = makeEngine();
    await engine.findBestMove({ fen: START_FEN, depth: 16, maxThinkMs: 3000, skillLevel: 20 });

    expect(log.commands).toContain('setoption name Skill Level value 20');
    expect(log.commands).toContain('go depth 16 movetime 3000');
  });

  it('only resends the skill level when it changes', async () => {
    const { engine, log } = makeEngine();
    await engine.findBestMove({ fen: START_FEN, ...EASY });
    await engine.findBestMove({ fen: START_FEN, ...EASY });
    await engine.findBestMove({ fen: START_FEN, depth: 5, maxThinkMs: 800, skillLevel: 5 });

    const skillCommands = log.commands.filter((command) => command.startsWith('setoption name Skill'));
    expect(skillCommands).toEqual([
      'setoption name Skill Level value 0',
      'setoption name Skill Level value 5',
    ]);
  });

  it('returns no-move when the engine answers bestmove (none)', async () => {
    const { engine } = makeEngine({ chooseMove: () => null });
    const outcome = await engine.findBestMove({ fen: START_FEN, ...EASY });

    expect(outcome).toEqual({ status: 'no-move' });
  });

  it('reports a cancelled search after stop', async () => {
    const { engine, log } = makeEngine({ bestMoveDelayMs: 50 });
    await engine.start();

    const pending = engine.findBestMove({ fen: START_FEN, ...EASY });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(engine.getState()).toBe('thinking');

    engine.stop();

    expect(await pending).toEqual({ status: 'cancelled' });
    expect(log.commands).toContain('stop');
  });

  it('keeps working after a cancelled search', async () => {
    const { engine } = makeEngine({ bestMoveDelayMs: 30 });
    await engine.start();

    const abandoned = engine.findBestMove({ fen: START_FEN, ...EASY });
    await new Promise((resolve) => setTimeout(resolve, 5));
    engine.stop();
    await abandoned;

    const outcome = await engine.findBestMove({ fen: START_FEN, ...EASY });
    expect(outcome.status).toBe('move');
  });

  it('rejects a reply it cannot parse', async () => {
    const { engine } = makeEngine({ chooseMove: () => 'z9z9' });
    await expect(engine.findBestMove({ fen: START_FEN, ...EASY })).rejects.toThrow(
      /could not be read/,
    );
  });
});

describe('the engine never receives an invalid FEN', () => {
  it.each([
    ['empty string', ''],
    ['prose', 'not a fen'],
    ['truncated placement', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1'],
    ['no kings', '8/8/8/8/8/8/8/8 w - - 0 1'],
    ['two white kings', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBKR w KQkq - 0 1'],
    ['bad side to move', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1'],
  ])('refuses to search a position with %s, and sends nothing', async (_name, fen: string) => {
    const { engine, log } = makeEngine();

    await expect(engine.findBestMove({ fen, ...EASY })).rejects.toThrow(/invalid FEN/i);
    // The guard runs before the worker is even created.
    expect(log.commands).toEqual([]);
    expect(log.positions).toEqual([]);
  });

  it('only ever sends FENs that the validator accepts, across a whole game', async () => {
    const { engine, log } = makeEngine();
    const game = new ChessGame();

    for (let ply = 0; ply < 24; ply += 1) {
      if (game.isGameOver()) break;
      const outcome = await engine.findBestMove({ fen: game.fen(), ...EASY });
      if (outcome.status !== 'move') break;
      const played = game.move(outcome.move.from, outcome.move.to, outcome.move.promotion ?? undefined);
      expect(played).not.toBeNull();
    }

    expect(log.positions.length).toBeGreaterThan(10);
    expect(log.invalidPositions).toEqual([]);
    for (const fen of log.positions) {
      expect(isValidFen(fen)).toBe(true);
    }
  });

  it('refuses an out-of-range skill level before sending anything', async () => {
    const { engine, log } = makeEngine();

    await expect(
      engine.findBestMove({ fen: START_FEN, depth: 2, maxThinkMs: 400, skillLevel: 99 }),
    ).rejects.toThrow(/0 to 20/);
    expect(log.commands).toEqual([]);
  });
});
