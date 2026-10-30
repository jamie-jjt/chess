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

The twelve locally bundled piece SVGs use the public-domain **Meridian Shaded**
set, whose restrained tonal drawing fits the tournament-table direction while
remaining clear at small board sizes. Source and license details are retained in
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md), and no piece artwork is
loaded from the network at runtime.

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

### What the engine reports

The first move of a game has to fetch and compile the 1.8 MB WASM binary, which
takes noticeably longer than a search, so that wait is reported separately as
"Loading engine…" rather than as thinking.

While the engine searches, its `info` lines feed an evaluation readout: a score
in pawns, always signed from White's point of view, or a mate distance when one
is forced. UCI reports scores from the moving side's view, so a Black engine's
scores are negated. An already-delivered mate arrives as `mate 0`, where that
sign carries no information, so no winner is named in that one case.

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

See [Credits and licences](#credits-and-licences) — Stockfish is GPL-3.0, which
has consequences for anything you publish.

## Custom positions

"Custom Position" opens an editor that builds a position from scratch and hands
it to a two-player game once it is playable.

- **Palette.** All twelve piece types, each showing how many are on the board.
  Pick one and click squares to place it; pick it again to put it down. With
  nothing held, a click clears the square. Pieces already on the board can be
  dragged.
- **State fields.** Side to move, the four castling rights, an optional en
  passant target, and both clocks. A castling checkbox is enabled only while
  that king and rook stand on their starting squares, and a right is dropped
  automatically when a piece move invalidates it. The en passant picker offers
  only the rank that matches the side to move. Setting the half-move clock near
  100 starts a position close to the fifty-move draw.
- **Flip board** swaps which side sits at the bottom, and that choice carries
  into the game you start.
- **Start game** or **Play vs computer**: a custom position can be played
  against Stockfish, with the usual colour and difficulty choice.
- **Clear board / Standard position / Copy FEN / Load FEN.** A pasted FEN is
  applied whenever it is *readable*, even when the position is not playable —
  the validator then explains the problem, which is more useful than refusing
  the paste. Only malformed FEN is rejected outright.
- **Start game** stays disabled while any rule reports a problem.

### The validator

`validateSetup` runs eleven rules, each in its own file under `src/validation`
with its own test file. Ten are errors, which block the start button; one is a
warning, which does not.

| Rule | Severity | File |
| --- | --- | --- |
| Exactly one king per side | error | `oneKingPerSide.ts` |
| Kings not on adjacent squares | error | `kingsNotAdjacent.ts` |
| No pawns on rank 1 or rank 8 | error | `pawnsOffBackRanks.ts` |
| At most 8 pawns per side | error | `pawnCount.ts` |
| At most 16 pieces per side in total | error | `pieceCount.ts` |
| Extra pieces paid for by missing pawns | error | `promotionAccounting.ts` |
| The side not to move must not be in check | error | `sideNotToMoveSafe.ts` |
| Castling rights need the king and rook at home | error | `castlingRights.ts` |
| En passant square must match a two-square pawn move | error | `enPassantSquare.ts` |
| Strict bishops (opt-in) | error | `strictBishops.ts` |
| The position is already finished | **warning** | `gameAlreadyOver.ts` |

Three points worth knowing:

**There is no per-type limit.** Promotion can leave a side with three knights
or nine queens, so only the 16-piece total is capped — but see the next point.

**Extra material has to be paid for.** A side starts with one queen, two rooks,
two knights and one bishop per square colour; anything beyond that must come
from a promoted pawn, and each promotion costs a pawn. So nine queens with no
pawns is fine (eight promotions, eight pawns gone) while three queens alongside
all eight pawns is not. Bishops are counted per square colour, so two
dark-squared bishops costs a promotion even though it is only two bishops. This
is not full retrograde analysis — it will not notice that the captures needed to
reach a position are impossible — but it rules out material that simply cannot
exist.

**An already-finished position is a warning, not an error.** Setting up a mate
or a stalemate on purpose is reasonable, so the editor says the result will show
immediately and lets you start anyway.

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

## Interface

- **Pieces** are the `meridian_shaded` SVG set in
  `src/assets/pieces/meridian_shaded/`, loaded as twelve static files by
  `ChessPieceSvg.tsx`. They are artwork, not generated or inferred at runtime;
  see [Credits and licences](#credits-and-licences).
- **Keyboard play.** The board is a grid of buttons with roving focus: arrow
  keys move between squares, Home and End jump along a rank (with Ctrl, to the
  first or last square), Enter or Space selects and moves, Escape clears a
  selection. Each square carries an `aria-label` such as `e1, White king` plus a
  description of its state (selected, legal destination, king in check).
- **Dialogs** (promotion, game over, confirmations) trap and restore focus via
  `useDialogFocus`, so keyboard and screen-reader users are not dropped back at
  the top of the page.
- **`GameAnnouncer`** keeps a polite live region in sync with the game state, so
  checks, captures and results are spoken rather than only drawn.
- **Confirmations.** Actions that throw work away — restarting a game, clearing
  the board — route through `ConfirmDialog` rather than firing immediately.

- **Board fullscreen.** Playable games can place the board alone in browser
  fullscreen. The upright square board keeps its current orientation, controls
  and board-local dialogs, while the menu, setup screens and move ledger stay
  outside the fullscreen surface.

## Deploying to GitHub Pages

The workflow is already written: `.github/workflows/deploy.yml`. It builds on
every push to `main` (and on demand from the Actions tab), runs the type check
and the full test suite first, verifies that the engine files actually made it
into `dist/`, then publishes.

Two one-time steps on GitHub:

1. **Settings → Pages → Source** → *GitHub Actions*.
2. Push `main`.

The site then lives at:

```
https://jamie-jjt.github.io/chess/
```

That follows from the `origin` remote (`github.com/jamie-jjt/chess`): a project
site is served at `https://<owner>.github.io/<repo>/`. Rename the repository and
the path changes with it; name it `jamie-jjt.github.io` instead and it would be
served from the domain root.

No path configuration is needed because `vite.config.ts` sets `base: './'`, so
every asset reference is relative and works from a subpath. The app is a single
screen with no router, so there are no deep links to rewrite either.

If you would rather publish by hand, the free `gh-pages` helper does it without
any Actions setup:

```bash
npm run build
npx gh-pages -d dist
```

## Credits and licences

Everything here is free of charge. One component is copyleft, which is a
condition rather than a cost, and it is the one that matters when you publish.

| Component | Version | Licence |
| --- | --- | --- |
| [chess.js](https://github.com/jhlywa/chess.js) — all the rules | 1.4.0 | BSD-2-Clause |
| [Stockfish.js](https://github.com/nmrugg/stockfish.js) — the opponent | 19.0.1 | **GPL-3.0** |
| React, Vite, Vitest and the test libraries | — | MIT |
| `meridian_shaded` piece artwork | — | Public domain dedication |

**Stockfish is GPL-3.0**, and the published npm package is GPL-3.0 because it
contains the engine. Deploying this app distributes those engine files, so the
licence applies to what you publish: keep `public/engine/LICENSE-stockfish.txt`
in place (the copy script puts it there, and the deploy workflow fails if it is
missing), and license your own distribution accordingly. The usual choice is to
release the whole app under GPL-3.0.

**The piece artwork is public domain.** `src/assets/pieces/meridian_shaded/LICENSE`
is a Creative Commons public-domain dedication: the author relinquished all
copyright, so there is no attribution requirement and no restriction on
commercial use. The credit above is courtesy, not obligation.

**Nothing in this project was trained, and no model is bundled.** There are no
weights, datasets or inference steps in the application code. The only neural
network anywhere near it is Stockfish's NNUE evaluation network, which is
compiled into the 1.8 MB WASM binary; it was trained by the Stockfish project
and is used here exactly as published.

## Notes

- No browser storage is used: nothing is written to `localStorage`,
  `sessionStorage`, cookies or IndexedDB. Refreshing the page starts a new game.
- No network calls at runtime either. The engine is a local static file; no
  position ever leaves the browser.
- Copy FEN uses the asynchronous Clipboard API, which needs a secure context.
  When the browser refuses, the editor says so and the FEN stays selectable so
  it can be copied by hand.
- A custom position that is already finished is allowed, with a warning. The
  validator checks that a position is *legal*; whether a game remains in it is
  the player's business.
- TypeScript runs with `strict`, plus `noUncheckedIndexedAccess`,
  `noUnusedLocals`, `noUnusedParameters` and `verbatimModuleSyntax`. There is no
  `any` in `src/` or `tests/`.
