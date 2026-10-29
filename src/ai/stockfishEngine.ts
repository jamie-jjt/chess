import type { EngineTransport, TransportFactory } from './engineTransport';
import {
  goCommand,
  parseBestMoveLine,
  parseInfoLine,
  positionCommand,
  setOptionCommand,
  skillLevelCommand,
} from './uci';
import type { UciInfo, UciMove } from './uci';

export type EngineState = 'created' | 'starting' | 'ready' | 'thinking' | 'failed' | 'disposed';

export interface SearchRequest {
  readonly fen: string;
  readonly depth: number;
  readonly maxThinkMs: number;
  readonly skillLevel: number;
}

export type SearchOutcome =
  | { readonly status: 'move'; readonly move: UciMove }
  /** The engine reported `bestmove (none)`: the position is already over. */
  | { readonly status: 'no-move' }
  /** A newer request or `stop()` superseded this search. */
  | { readonly status: 'cancelled' };

export interface StockfishEngineOptions {
  readonly createTransport: TransportFactory;
  /** Hash table size in MB. 16 is plenty for the shallow searches used here. */
  readonly hashMb?: number;
  /** How long to wait for `uciok` / `readyok` before giving up. */
  readonly handshakeTimeoutMs?: number;
  readonly onInfo?: (info: UciInfo) => void;
}

interface Waiter {
  readonly matches: (line: string) => boolean;
  readonly resolve: (line: string) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Promise-based UCI client for Stockfish.
 *
 * Responsibilities: the handshake, applying options, running one search at a
 * time, cancelling a search, and refusing to send a position the FEN validator
 * rejects. It owns no chess knowledge beyond that.
 */
export class StockfishEngine {
  private readonly options: StockfishEngineOptions;
  private transport: EngineTransport | null = null;
  private waiters: Waiter[] = [];
  private state: EngineState = 'created';
  private startPromise: Promise<void> | null = null;
  private appliedSkillLevel: number | null = null;
  private searchGeneration = 0;
  private failure: Error | null = null;
  private infoListener: ((info: UciInfo) => void) | null = null;

  constructor(options: StockfishEngineOptions) {
    this.options = options;
    this.infoListener = options.onInfo ?? null;
  }

  getState(): EngineState {
    return this.state;
  }

  /**
   * Receives every `info` line of the current search. Set to null to stop
   * listening. Used for the evaluation readout; the search does not depend on
   * anyone listening.
   */
  setInfoListener(listener: ((info: UciInfo) => void) | null): void {
    this.infoListener = listener;
  }

  /** Starts the worker and completes the UCI handshake. Safe to call repeatedly. */
  async start(): Promise<void> {
    if (this.state === 'disposed') throw new Error('The chess engine has been shut down.');
    if (this.state === 'failed') throw this.failure ?? new Error('The chess engine failed.');
    if (this.state === 'ready' || this.state === 'thinking') return;
    if (this.startPromise !== null) return this.startPromise;

    this.startPromise = this.runHandshake();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  private async runHandshake(): Promise<void> {
    this.state = 'starting';
    const timeout = this.options.handshakeTimeoutMs ?? 30_000;

    try {
      this.transport = this.options.createTransport({
        onLine: (line) => this.handleLine(line),
        onError: (error) => this.handleFailure(error),
      });

      this.send('uci');
      await this.waitFor((line) => line === 'uciok', timeout, 'uciok');

      this.send(setOptionCommand('Hash', this.options.hashMb ?? 16));
      this.send(setOptionCommand('MultiPV', 1));
      this.send('isready');
      await this.waitFor((line) => line === 'readyok', timeout, 'readyok');

      this.state = 'ready';
    } catch (error) {
      this.handleFailure(asError(error));
      throw this.failure ?? asError(error);
    }
  }

  /** Clears the engine's state between games. */
  async newGame(): Promise<void> {
    await this.start();
    this.send('ucinewgame');
    this.send('isready');
    await this.waitFor(
      (line) => line === 'readyok',
      this.options.handshakeTimeoutMs ?? 30_000,
      'readyok',
    );
  }

  /**
   * Searches `request.fen` and resolves with the engine's choice.
   *
   * Throws on an invalid FEN, a transport failure, or a search that never
   * answers. A superseded search resolves with `cancelled` rather than
   * throwing, because cancelling is a normal part of undo and restart.
   */
  async findBestMove(request: SearchRequest): Promise<SearchOutcome> {
    // Built before the engine is even touched: an invalid FEN throws here and
    // nothing is sent.
    const position = positionCommand(request.fen);
    const go = goCommand(request.depth, request.maxThinkMs);
    const skill = skillLevelCommand(request.skillLevel);

    await this.start();

    const generation = ++this.searchGeneration;

    if (this.appliedSkillLevel !== request.skillLevel) {
      this.send(skill);
      this.appliedSkillLevel = request.skillLevel;
    }

    this.state = 'thinking';
    this.send(position);
    this.send(go);

    const line = await this.waitFor(
      (candidate) => candidate.startsWith('bestmove'),
      request.maxThinkMs + 60_000,
      'bestmove',
    );

    if (this.state === 'thinking') this.state = 'ready';
    if (generation !== this.searchGeneration) return { status: 'cancelled' };

    const parsed = parseBestMoveLine(line);
    if (parsed === null) {
      throw new Error(`The engine returned a move that could not be read: "${line}"`);
    }
    return parsed.kind === 'none' ? { status: 'no-move' } : { status: 'move', move: parsed.move };
  }

  /**
   * Abandons the current search. Its `bestmove` is still consumed so the engine
   * returns to idle, but the caller receives `cancelled`.
   */
  stop(): void {
    if (this.state !== 'thinking') return;
    this.searchGeneration += 1;
    this.send('stop');
  }

  dispose(): void {
    if (this.state === 'disposed') return;
    const error = new Error('The chess engine was shut down.');
    this.rejectAll(error);
    this.transport?.terminate();
    this.transport = null;
    this.state = 'disposed';
  }

  // ----------------------------------------------------------------- plumbing

  private send(command: string): void {
    if (this.transport === null) {
      throw new Error('The chess engine is not running.');
    }
    this.transport.send(command);
  }

  private handleLine(line: string): void {
    if (this.infoListener !== null && line.startsWith('info ')) {
      const info = parseInfoLine(line);
      if (info !== null) this.infoListener(info);
    }

    const index = this.waiters.findIndex((waiter) => waiter.matches(line));
    if (index === -1) return;

    const waiter = this.waiters[index];
    if (waiter === undefined) return;
    this.waiters.splice(index, 1);
    clearTimeout(waiter.timer);
    waiter.resolve(line);
  }

  private handleFailure(error: Error): void {
    this.failure = error;
    this.state = 'failed';
    this.rejectAll(error);
    this.transport?.terminate();
    this.transport = null;
  }

  private rejectAll(error: Error): void {
    const pending = this.waiters;
    this.waiters = [];
    for (const waiter of pending) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }

  private waitFor(
    matches: (line: string) => boolean,
    timeoutMs: number,
    description: string,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((candidate) => candidate.timer !== timer);
        reject(new Error(`The chess engine did not reply with ${description} in time.`));
      }, timeoutMs);

      this.waiters.push({ matches, resolve, reject, timer });
    });
  }
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
