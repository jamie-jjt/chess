/**
 * The engine is reached only through this interface, so the UCI logic above it
 * can be driven by a real Web Worker in the browser and by a stub in tests.
 */
export interface EngineTransport {
  readonly send: (command: string) => void;
  readonly terminate: () => void;
}

export interface TransportHandlers {
  readonly onLine: (line: string) => void;
  readonly onError: (error: Error) => void;
}

export type TransportFactory = (handlers: TransportHandlers) => EngineTransport;

/**
 * Served from public/engine/ by scripts/copy-engine.mjs. The .wasm file must
 * sit beside the .js file, which is how the emscripten glue finds it.
 */
export const ENGINE_SCRIPT = 'engine/stockfish-19-lite-single.js';

/** Absolute URL of the engine script, honouring Vite's configured base path. */
export function engineScriptUrl(): string {
  const base = import.meta.env.BASE_URL;
  return new URL(`${base}${ENGINE_SCRIPT}`.replace(/\/{2,}/g, '/'), document.baseURI).href;
}

/**
 * Runs Stockfish in a dedicated Web Worker. Every UCI command and reply crosses
 * the worker boundary via postMessage, so a deep search never blocks the UI
 * thread, however long it takes.
 */
export const createWorkerTransport: TransportFactory = ({ onLine, onError }) => {
  if (typeof Worker === 'undefined') {
    throw new Error('This browser does not support Web Workers, so the engine cannot run.');
  }

  const worker = new Worker(engineScriptUrl());

  worker.onmessage = (event: MessageEvent<unknown>): void => {
    const data: unknown = event.data;
    if (typeof data !== 'string') return;
    for (const line of data.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.length > 0) onLine(trimmed);
    }
  };

  worker.onerror = (event: ErrorEvent): void => {
    onError(new Error(event.message || 'The chess engine failed to load.'));
  };

  return {
    send: (command: string) => {
      worker.postMessage(command);
    },
    terminate: () => {
      worker.terminate();
    },
  };
};
