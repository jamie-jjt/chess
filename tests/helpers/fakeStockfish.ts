import type { EngineTransport, TransportFactory, TransportHandlers } from '../../src/ai';
import { toUciMove } from '../../src/ai';
import { ChessGame, isValidFen } from '../../src/engine';

export interface FakeEngineLog {
  /** Every command the engine sent, in order. */
  readonly commands: string[];
  /** The FEN from each `position fen <fen>` command, in order. */
  readonly positions: string[];
  /** FENs that were not valid when they arrived. Must always stay empty. */
  readonly invalidPositions: string[];
  /** How many transports were created; StrictMode makes this more than one. */
  readonly created: () => number;
  /** How many transports were terminated. */
  readonly terminatedCount: () => number;
}

export interface FakeStockfishOptions {
  /**
   * Chooses the reply. Defaults to the first legal move in the position, which
   * keeps tests deterministic. Return null to answer `bestmove (none)`.
   */
  readonly chooseMove?: (fen: string) => string | null;
  /** Delay before `bestmove`, so cancellation can be exercised. */
  readonly bestMoveDelayMs?: number;
  /** Fails the handshake instead of answering `uciok`. */
  readonly failOnStart?: string;
}

/**
 * Stands in for the Stockfish worker.
 *
 * It speaks the same UCI subset over the same transport interface and always
 * answers asynchronously, exactly as `postMessage` from a real Web Worker
 * does. Replies are derived from chess.js, so the move it returns is genuinely
 * legal in the position it was given — which also means the fake would blow up
 * if the engine were ever handed a FEN it could not load.
 */
export function createFakeStockfish(options: FakeStockfishOptions = {}): {
  readonly factory: TransportFactory;
  readonly log: FakeEngineLog;
} {
  const commands: string[] = [];
  const positions: string[] = [];
  const invalidPositions: string[] = [];
  let created = 0;
  let terminatedCount = 0;

  const factory: TransportFactory = ({ onLine, onError }: TransportHandlers): EngineTransport => {
    // Per-instance state: each transport is an independent worker, so one being
    // terminated must not silence another. React's StrictMode creates two.
    let terminated = false;
    let currentFen: string | null = null;
    created += 1;

    const emit = (line: string, delayMs = 0): void => {
      setTimeout(() => {
        if (!terminated) onLine(line);
      }, delayMs);
    };

    const send = (command: string): void => {
      commands.push(command);

      if (command === 'uci') {
        if (options.failOnStart !== undefined) {
          const message = options.failOnStart;
          setTimeout(() => {
            if (!terminated) onError(new Error(message));
          }, 0);
          return;
        }
        emit('id name FakeFish 1.0');
        emit('uciok');
        return;
      }

      if (command === 'isready') {
        emit('readyok');
        return;
      }

      if (command.startsWith('position fen ')) {
        const fen = command.slice('position fen '.length);
        positions.push(fen);
        if (!isValidFen(fen)) invalidPositions.push(fen);
        currentFen = fen;
        return;
      }

      if (command.startsWith('go ')) {
        emit('info depth 1 score cp 24 nodes 42 pv e2e4');
        emit(bestMoveLine(), options.bestMoveDelayMs ?? 0);
        return;
      }

      if (command === 'stop') {
        // Stockfish answers a stop with the best move it has so far.
        emit(bestMoveLine());
      }
    };

    const bestMoveLine = (): string => {
      if (currentFen === null) return 'bestmove (none)';

      if (options.chooseMove !== undefined) {
        const chosen = options.chooseMove(currentFen);
        return chosen === null ? 'bestmove (none)' : `bestmove ${chosen}`;
      }

      // Throws if the FEN is unusable, which is the behaviour we want from a
      // test double: an invalid position must not pass silently.
      const move = new ChessGame(currentFen).legalMoves()[0];
      return move === undefined
        ? 'bestmove (none)'
        : `bestmove ${toUciMove({ from: move.from, to: move.to, promotion: move.promotion })}`;
    };

    return {
      send,
      terminate: () => {
        if (!terminated) terminatedCount += 1;
        terminated = true;
      },
    };
  };

  return {
    factory,
    log: {
      commands,
      positions,
      invalidPositions,
      created: () => created,
      terminatedCount: () => terminatedCount,
    },
  };
}
