# Chess

A chess web app built with React 18, TypeScript (strict) and Vite. All rules —
move generation, legality, check, checkmate, stalemate, draws and FEN handling —
come from [chess.js](https://github.com/jhlywa/chess.js). No move generator is
written by hand, and nothing in the project needs a paid API or a server.

All three stages are complete: a two-player game, a Stockfish opponent running
in a Web Worker, and a custom position editor backed by a nine-rule validator.

## Requirements

Node.js 20 or newer (built and tested on Node 24).

## Setup

```bash
npm install
```

`postinstall` copies the Stockfish engine out of `node_modules` into
`public/engine/` (see [The engine](#the-engine)). `npm run copy-engine` repeats
that step on demand; `predev` and `prebuild` run it automatically.

## Run

```bash
npm run dev          # dev server on http://localhost:5173
```

## Test

```bash
npm test             # one run, all tests
npm run test:watch   # watch mode
```

Vitest runs on the `vmThreads` pool. Each test file still gets its own isolated
environment, but jsdom is built once per worker instead of once per file, which
took the suite from about 125 seconds down to 26.

## Build

```bash
npm run build        # tsc --noEmit, then vite build into dist/
npm run preview      # serve the built output locally
npm run typecheck    # type check only
```

## Project layout

```
scripts/
  copy-engine.mjs   puts the Stockfish files in public/engine/
src/
  engine/       chess.js wrapper, FEN helpers, game types, result wording
  ai/           UCI client, Web Worker transport, difficulty presets
  validation/   setup validator, one file per rule                (Stage 3)
  components/   Board, Square, Piece, PromotionPicker, GameControls,
                MoveList, TurnIndicator, ThinkingIndicator, GameOverModal,
                GameView
  hooks/        useGame, useComputerGame (useSetup arrives in Stage 3)
  screens/      StartScreen, GameScreen, ComputerSetupScreen,
                ComputerGameScreen (SetupScreen in Stage 3)
  App.tsx
tests/
  helpers/      fakeStockfish.ts — a UCI test double for the engine
```

Four rules keep the layers apart:

- **`src/engine/chessGame.ts` is the only file that imports `chess.js`.** Every
  other module works with the plain types in `src/engine/types.ts`.
- **Components hold no game logic.** They render props and call callbacks.
- **Hooks own state.** `useGame` keeps the `ChessGame` instance, the selection
  and the pending promotion; `useComputerGame` adds the engine on top and hands
  components the same shape plus `isThinking` and `engineError`.
- **The engine is reached through a transport interface.** `StockfishEngine`
  never mentions `Worker`: it is handed a `TransportFactory`, which is
  `createWorkerTransport` in the browser and a UCI stub in tests. That is what
  makes the engine testable without loading 1.8 MB of WASM.

### Board UI

The board is a hand-written grid of `<button>` elements rather than
`react-chessboard`. The library's public API changed shape between v4 and v5, so
pinning against it is fragile; the board also needs custom selection
highlighting, legal-move dots, a check ring and an anchored promotion overlay,
which is most of the work anyway. Every square exposes `data-square` and an
`aria-label` such as `e1, White king`, which keeps it testable and screen-reader
friendly. Click-to-move is the primary interaction; dragging uses the native
HTML5 drag API.

## The engine

The opponent is [Stockfish.js](https://github.com/nmrugg/stockfish.js) 19, the
`lite single-threaded` flavour: 28 KB of glue plus a 1.8 MB WASM binary.

That flavour is a deliberate choice. The multi-threaded builds need
`SharedArrayBuffer`, which a page only gets when the server sends
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`. Static hosts such as GitHub Pages
cannot send headers, so the multi-threaded engine would simply fail there. The
single-threaded engine runs with no headers at all — verified in Chrome with
`crossOriginIsolated === false`. The full-strength net is also published, but
its WASM file is 99 MB, which is not a reasonable download for a web page.

`scripts/copy-engine.mjs` copies the two files (plus the engine's licence) into
`public/engine/`, so Vite serves them as plain static assets and the `.wasm`
sits next to the `.js` where the emscripten loader expects it. The directory is
git-ignored and regenerated from `node_modules` on install and before any build.

The engine runs inside a dedicated `Web Worker`: every UCI command and reply
crosses `postMessage`, so a deep search never blocks rendering or input.

### Difficulty mapping

| Difficulty | `Skill Level` | `go depth` | Time ceiling |
| --- | --- | --- | --- |
| Easy | 0 | 2 | 400 ms |
| Medium | 5 | 5 | 800 ms |
| Hard | 12 | 10 | 1500 ms |
| Expert | 20 | 16 | 3000 ms |

The two knobs do different jobs. `Skill Level` (0–20) is Stockfish's own
handicap: below 20 it deliberately picks a weaker move from its candidate list,
and the error grows as the level drops, which reads as human-like blundering.
`depth` caps how far it looks ahead, limiting both foresight and time. Skill
alone at full depth gives slightly-off grandmaster moves; depth alone at skill
20 gives a bot that never errs inside its horizon. Together they form a
believable ladder. The ceiling is sent as `go depth N movetime M`, so the search
ends at whichever limit comes first and a slow device cannot stall the game.

### Undo against the computer

Undo rewinds until it is the player's turn again, which takes back the player's
move together with the engine's reply. If the engine is still thinking, the
search is stopped first and a reply that arrives for a position the board has
already left is discarded rather than played.

Undo is offered only once the player has a move of their own on the board. When
the engine has opened the game and the player has not replied, there is nothing
to take back — rewinding the engine's opening move would just make it play
another one, which reads as the computer changing its mind.

### Engine lifecycle and StrictMode

`src/main.tsx` wraps the app in `StrictMode`, which in development mounts every
component, tears it down and mounts it again. The engine is therefore created
*and* disposed inside a single effect in `useComputerGame`, and the search
effect only runs once an engine is committed to state.

This is not incidental tidiness. Creating the engine during render and disposing
it in a mount-keyed cleanup makes StrictMode dispose the engine while its first
search is still running; the rejection surfaces as "The chess engine was shut
down." and the engine never moves. Production builds do not double-invoke
effects, so that failure appears under `npm run dev` only.
`tests/useComputerGame.strictMode.test.ts` renders the hook inside `StrictMode`
to keep it from coming back. A side benefit of the current shape: the engine
object StrictMode discards never opens a transport, so the 1.8 MB WASM binary is
loaded exactly once.

### Engine licensing

Stockfish is **GPL-3.0**, and the published `stockfish` npm package is GPL-3.0
because it contains the engine. Deploying this app distributes those engine
files, so the GPL applies to what you publish: keep
`public/engine/LICENSE-stockfish.txt` in place (the copy script puts it there),
and license your own distribution accordingly — the usual choice is to release
the whole app under GPL-3.0. Nothing here costs money; this is a copyleft
obligation, not a fee.

## Custom positions

"Custom Position" opens an editor that builds a position from scratch and hands
it to a two-player game once it is playable.

- **Palette.** All twelve piece types, each showing how many are on the board.
  Pick one and click squares to place it; pick it again to put it down. With
  nothing held, a click clears the square. Pieces already on the board can be
  dragged.
- **State fields.** Side to move, the four castling rights, and an optional en
  passant target. A castling checkbox is enabled only while that king and rook
  stand on their starting squares, and a right is dropped automatically when a
  piece move invalidates it. The en passant picker offers only the rank that
  matches the side to move.
- **Clear board / Standard position / Copy FEN / Load FEN.** A pasted FEN is
  applied whenever it is *readable*, even when the position is not playable —
  the validator then explains the problem, which is more useful than refusing
  the paste. Only malformed FEN is rejected outright.
- **Start game** stays disabled while any rule reports a problem.

### The validator

`validateSetup` runs nine rules, each in its own file under `src/validation`
with its own test file:

| Rule | File |
| --- | --- |
| Exactly one king per side | `oneKingPerSide.ts` |
| Kings not on adjacent squares | `kingsNotAdjacent.ts` |
| No pawns on rank 1 or rank 8 | `pawnsOffBackRanks.ts` |
| At most 8 pawns per side | `pawnCount.ts` |
| At most 16 pieces per side in total | `pieceCount.ts` |
| The side not to move must not be in check | `sideNotToMoveSafe.ts` |
| Castling rights need the king and rook at home | `castlingRights.ts` |
| En passant square must match a two-square pawn move | `enPassantSquare.ts` |
| Strict bishops (opt-in) | `strictBishops.ts` |

Two points worth knowing:

**There is no per-type limit.** Promotion can leave a side with three knights
or nine queens, so only the 16-piece total is capped.

**Strict bishops is off by default and is not a rule of chess.** A side can
legally hold two dark-squared bishops after promoting a pawn, so a position like
that passes in standard mode and is rejected only when the box is ticked.

`chess.js` does the one piece of real chess reasoning involved: rule 6 builds a
probe FEN (en passant and castling cleared, since neither affects what attacks
what) and asks `isAttacked`. Everything else is counting and geometry.

The editor needs a model `chess.js` cannot provide. A board with no kings is a
normal state halfway through building a position but an invalid FEN, so
`src/engine/setupPosition.ts` holds the position being edited and reads FEN at
the syntax level only. For the record, `chess.js`'s own `validateFen` catches
just missing or duplicate kings and pawns on the edge ranks; it accepts nine
pawns, seventeen pieces, adjacent kings, the side not to move in check, bogus en
passant squares and castling rights with no rook. Hence the validator.

## Deploying to GitHub Pages

`vite.config.ts` sets `base: './'`, so the built `dist/` works from a repository
subpath such as `https://<user>.github.io/<repo>/` with no further
configuration. The app is a single screen with no router, so there are no deep
links to rewrite.

Either push `dist/` with the free `gh-pages` helper:

```bash
npx gh-pages -d dist
```

…or let Actions build it. Set **Settings → Pages → Source** to *GitHub Actions*
and add `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

## Notes

- No browser storage is used: nothing is written to `localStorage`,
  `sessionStorage`, cookies or IndexedDB. Refreshing the page starts a new game.
- No network calls at runtime either. The engine is a local static file; no
  position ever leaves the browser.
- Copy FEN uses the asynchronous Clipboard API, which needs a secure context.
  When the browser refuses, the editor says so and the FEN stays selectable so
  it can be copied by hand.
- A custom position that is already finished behaves correctly rather than
  specially: starting a bare king-versus-king board opens the game and
  immediately shows "Draw — insufficient material". The validator checks that a
  position is *legal*, not that it still has a game left in it.
- TypeScript runs with `strict`, plus `noUncheckedIndexedAccess`,
  `noUnusedLocals`, `noUnusedParameters` and `verbatimModuleSyntax`. There is no
  `any` in `src/` or `tests/`.
