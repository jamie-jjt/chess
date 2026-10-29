/**
 * Copies the single-threaded Stockfish WASM engine out of node_modules into
 * public/engine/, where Vite serves it as a static asset.
 *
 * The "lite single-threaded" flavour is deliberate: the multi-threaded builds
 * need SharedArrayBuffer, which requires the Cross-Origin-Opener-Policy and
 * Cross-Origin-Embedder-Policy headers. Static hosts such as GitHub Pages
 * cannot send those, so the single-threaded engine is the only flavour that
 * works there. The engine's .js file loads its .wasm from its own directory,
 * which is why both files are copied side by side.
 */
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE_FILES = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];

/**
 * The engine is GPL-3.0, so its licence text is shipped next to it. Deploying
 * this app distributes Stockfish; see the licensing note in the README.
 */
const LICENSE_FILE = { from: 'Copying.txt', to: 'LICENSE-stockfish.txt' };

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const source = join(projectRoot, 'node_modules', 'stockfish', 'bin');
const destination = join(projectRoot, 'public', 'engine');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(source))) {
    console.warn('[copy-engine] node_modules/stockfish not found; skipping.');
    return;
  }

  await mkdir(destination, { recursive: true });

  for (const file of ENGINE_FILES) {
    const from = join(source, file);
    if (!(await exists(from))) {
      throw new Error(`[copy-engine] missing engine file: ${from}`);
    }
    await copyFile(from, join(destination, file));
    console.log(`[copy-engine] ${file} -> public/engine/`);
  }

  const licenseFrom = join(projectRoot, 'node_modules', 'stockfish', LICENSE_FILE.from);
  if (await exists(licenseFrom)) {
    await copyFile(licenseFrom, join(destination, LICENSE_FILE.to));
    console.log(`[copy-engine] ${LICENSE_FILE.to} -> public/engine/`);
  }
}

await main();
