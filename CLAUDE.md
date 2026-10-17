# Ultimate Calculator – notes for Claude

An all-in-one calculator web app: calculator (scientific, complex numbers, memory), graph, unit converter, currency converter, VAT, percent/discount/tip, interest (loan/savings), dates, fuel, energy, subnet (IPv4), numbers (GCD/LCM, prime factors), equations and statistics tools.
Plain HTML/CSS/vanilla JS, no framework, no backend, and nothing to build while editing: `public/` runs as it is
(the deploy minifies it, see Git and deploying). English and Greek; new users start
in English and dark theme (people who used the app before keep Greek / their theme, see the script in the
`<head>` of `public/index.html`). Numbers always use Greek formatting: `1.234,56`.

Two people work on this repo, each with their own Claude sessions, and both push to `main`.

## Git and deploying

- Every push to `main` runs `.github/workflows/deploy.yml`: it builds the site (`tools/build.mjs`: every script
  `index.html` loads is joined into one minified `js/app.js`, styles.css minified, the rest copied), runs the browser
  tests on that build, and only if they pass deploys it to GitHub Pages (https://uc.kampaxis.com) and the Docker image
  `ghcr.io/leothegreat777/ultimate-calculator:latest` (its Dockerfile runs the same build). If the tests fail nothing is deployed. Still: only push working, tested code.
- Before pushing: `git fetch origin main` and rebase onto it if it moved. If the other person changed
  the same code, resolve it carefully, re-test, and say what you merged.
- Never force push, never rewrite `main`'s history.
- Keep scratch files (one-off test scripts, screenshots) out of the repo; use a temp/scratch folder.
- Commit messages: a short summary line, then what changed and why in plain words.
- **Trying something first:** the `preview` branch (uc.kampaxis.com/preview/), never main. How it works and how to
  merge or reset it: `docs/claude/preview.md`.

## Version and changelog

Versions are `MAJOR.MINOR.PATCH` (semantic versioning). Once per push that changes app files (not for docs-only
changes), pick one: `python3 tools/bump-version.py patch` for fixes and small tweaks (0.5.0 -> 0.5.1),
`minor` for a new feature (0.5.1 -> 0.6.0), `major` only when the owner says (1.0.0 = ready for everyone).
It updates `VERSION` in `public/js/core.js`, the footer and every `?v=` in `public/index.html` (the `?v=` makes
browsers load the new files), and adds a `## X.Y.Z – date` heading to `CHANGELOG.md`. Under it, write what changed
for the people using the app (not the code), in `### Added` / `### Changed` / `### Fixed`; keep it short.
CHANGELOG.md is long and newest-first: read only its top (`head -40 CHANGELOG.md`), never the whole file.
Every push of app changes gets its own version and entry. `--check` (run by GitHub before
deploying) fails if the versions disagree or the changelog has no entry for the current version.

## Files

Everything the app serves is in `public/` (the web root for both GitHub Pages and the Docker image):

- `index.html` – page shell, the `<head>` script (theme/language before first paint), keypad markup.
- `styles.css` – all styles, one rule per line, themes, phone and wide-desktop layouts. Later rules win,
  so add a change to the section it belongs to, or at the end.
- `js/` – plain scripts (no modules) that share globals, loaded in this order by `index.html`:

| File | What is in it |
|---|---|
| `core.js` | `VERSION`, `$`, `store`, `esc`, the saved language and theme, the app's state variables |
| `i18n.js` | interface text `T` (`t(key)`), mode names and icons, `AUTHORS` (credits) |
| `numbers.js` | exact fractions (`rat`...), `evalExpr`, number formatting (`fmt`, `formatRat`, `money`...) |
| `charts.js` | drawing helpers, tool charts, History chart |
| `graph.js` | Graph mode (parser, pan/zoom, key points, drawing) |
| `complex.js` | complex numbers: `{re, im}` values, `vAdd`… `vPow`, `sciFunctionV`, `vPolar`, `fmtCx` (a+bi, or r∠θ with 'polar'), `vToStore`/`vFromStore`, `carryCx` |
| `calculator.js` | calculator keys (`digit`, `operator`, brackets, `negate`, `equals`, C/AC), display, explanation |
| `explain.js` | the working under ?: `explanationForExpression` (the calculation read into a tree like `evalExpr`, worked out step by step in school order, each step with its reason and the shorter calculation, `\u0001`/`\u0002` around the new number), `unitsHow` (Units/Currency), `howHtml` (draws any working, Subnet's bits too) |
| `memory.js` | the memory keys MC MR M+ M− MS (`memKey`, `memKeysHtml`, `uc-memory`; dimmed with `.mem-empty`, not `.empty`, a list style), the M chip beside f(x), Ctrl shortcuts |
| `funcs.js` | the ⋯ sheet: every function and constant by group, with a search (`openFunctions`, `.fn-open` on the ? dialog) |
| `history.js` | saved calculations, the History sheet and its gestures; every other mode's own History (`recordModeHistory`) |
| `units.js` | unit data and names, conversion, the two values, `unitKeyInput` |
| `currency.js` | Currency: ECB rates (fetched, saved, shipped snapshot), `units.currency`, money and rate formats, the rate line |
| `tools.js` | VAT, Percent, Interest, Fuel, Energy: fields, saved values, calculations, switches, `toolKeyInput`, tool field events |
| `dates.js` | Dates: day numbers, date pickers, Orthodox Easter and Greek public holidays, working days, the details list, the Working days chip |
| `numtools.js` | Numbers (GCD and LCM, prime factors with Miller–Rabin and Pollard's rho, divisors) and Equations (ax² + bx + c = 0, real or complex roots, exact √Δ; a 2×2 system by Cramer's rule): `numbersCalculate`, `equationCalculate` |
| `stats.js` | Statistics: the list of numbers (`statList` in the tool's inputs, chips in one box with the field: `statAdd`, `statRemove`, `statTakeBack`, pasting several), `statsCalculate` (exact average, median, s and σ) |
| `net.js` | Subnet: IPv4 parsing (`parseIp`, `parsePrefix` takes /24 or a mask), `dottedKey`, the details grid, the Subnet calculations |
| `layout.js` | `fitLayout` (fits every mode to the screen), long text (`fitDisplayText`, `refuseKey`), zoom on big screens |
| `theme.js` | themes: the ready-made ones, own themes (`deriveTheme`), Match device (`themePair`), the theme menu and the own theme editor |
| `ui.js` | `setLanguage`/`applyLanguage`, modes and tabs (`switchMode`, `renderTool`), dialogs, hold keys, install |
| `modes.js` | the All modes sheet (⊞): groups, search, pins (`uc-pins`), which tabs the strip shows (`stripModes`) |
| `side.js` | big screens: History (left) and the working (right) beside the card, live (`refreshSide`, `renderSide`, `html.side-panels`) |
| `help.js` | Tips & shortcuts text (`HELP`) and `showHelp` |
| `main.js` | keypad and button wiring, the desktop keyboard handler, start-up. Loaded last |

  Top-level code runs in that order, so a script may only *call* things from earlier scripts while loading;
  inside functions anything can be used. A new script goes into `public/js/`, gets a `<script>` line with `?v=`
  in `index.html`, and is deployed automatically (the build joins every script `index.html` loads, in that order; it
  fails if a file in `public/js/` isn't loaded).

Outside `public/`: `tests/test_app.py` (browser tests), `tools/bump-version.py`, `tools/build.mjs` + `package.json`
(the deploy build, esbuild), `Dockerfile` + `nginx.conf` (the Docker image), `docker-compose.yml` (for self-hosting), `.github/workflows/deploy.yml`.

## Notes by topic: read the one you need before changing that part

How the code works is split into topic files so this file stays short (it is loaded into every session). Before you
change something, read the topic file for it; read more than one when a change crosses parts. Each holds the decisions
the owner made there, so don't skip it.

| File | Read it before changing |
|---|---|
| `docs/claude/calculator.md` | the Calculator: exact maths, limits, errors, carry, brackets, C/AC, ± and holding keys, Scientific, complex numbers, Memory, the working (?), copying (numbers.js, calculator.js, complex.js, explain.js, memory.js, funcs.js) |
| `docs/claude/tools.md` | the tools (VAT, Percent, Interest, Dates, Fuel, Energy, Subnet, Numbers, Equations), Units, Currency, tool fields, switches, History per mode, tool charts (tools.js, units.js, currency.js, dates.js, numtools.js, net.js, history.js, charts.js) |
| `docs/claude/screen.md` | layout and sizes: fitting the screen, long text, sideways phones, foldables, big screens (zoom), side panels, the tabs and All modes, pressing keys, dropdowns, the iPhone home-screen app (layout.js, side.js, modes.js, ui.js, styles.css) |
| `docs/claude/look.md` | themes and own themes, the logo and icons, colours (theme.js, styles.css theme blocks, tools/make-icons.py) |
| `docs/claude/app.md` | start-up and offline (sw.js, updates), home-screen shortcuts, the keyboard, Tips, screen readers (main.js, sw.js, help.js) |
| `docs/claude/preview.md` | the `preview` branch |

When you change how something works, update its topic file (not this one, unless it is a rule for the whole app).

## Rules for every change

- **Colours:** every colour is a token in the theme blocks at the top of styles.css; never write a colour into a rule.
- **Sizes:** don't add fixed pixel heights per screen or device; `fitLayout()` sizes everything, call it after anything
  that changes the layout's height. On big screens the app is zoomed (`window.__uiZoom`): divide screen coordinates by it.
- **Limits:** a key that can't do more calls `refuseKey()`; never put "Error" into `current` (see calculator.md).
- **Number formatting:** use the existing helpers (`fmt`, `formatRat`, `formatGroupedNumber`,
  `formatExpressionDisplay`, `money`), never `toString()` or `toFixed()` for anything shown.
  Money is always 2 decimals (`money`). VAT is rounded to cents like invoices (`vatNumbers`).
- **Phones:** the app's own keypad replaces the native keyboard (tool inputs are `readonly` with
  `inputmode="none"` on touch devices). Don't let the native keyboard open.
- **Symbols iOS turns into emoji:** don't use characters like ☀ ☾ for icons (iPhone draws ☀ as a colour emoji): draw
  them (the theme button's `THEME_ICONS`), or add U+FE0E after an arrow or symbol in text. The tab icons are drawn too
  (`ICONS`, `tabSvg` in i18n.js, 16×16): symbol characters like ↔ ◷ came out tiny and low on iPhone; only € % $ stay text.
- **A press outside closes it** (theme menu, own theme editor, Dates calendar, History's "Delete all?"): check with
  `eventInside(e,selector)` (core.js), never `e.target.closest`: a handler may already have re-drawn the pressed element,
  and a detached target looks like a press outside (the menu closed when its own switch was pressed).
- **Text:** every visible string needs Greek and English. Most live in `T.el`/`T.en` (use `t(key)`);
  some modes have their own small tables (`gText`, `cText`, `fText`, and `HELP` for Tips & shortcuts).
  Switching language happens in place (`setLanguage` -> `applyLanguage`), no reload: anything that shows text
  must be re-rendered by `applyLanguage`, and a new text must look the same after a live switch as after a fresh load.
- **Credits:** the owner, Leonidas Kampaxis, is the app's only credited author (his decision): `AUTHORS` in `i18n.js`, in
  Greek and English, the English name also in `index.html` (footer and `<meta name="author">`) and both in the README.
  Don't add other names anywhere (footer, README, changelog). Change them in all places together.
- **Storage:** all in the browser (`uc-history`, `uc-history-modes`, `uc-tools`, `uc-rates`, `uc-lang`, `uc-pins`, `uc-memory`,
  `uc-theme`, `uc-theme-pair`, `uc-custom-themes`, `uc-theme-recent`). Use `store.get/set` – localStorage can throw.

## Testing before every push

`python3 tests/test_app.py` (needs `pip install playwright` and `python3 -m playwright install chromium` once;
Claude Code cloud sessions get it from `.claude/hooks/session-start.sh`: playwright 1.56.0, matching their Chromium).
It serves `public/` itself and checks the calculator basics, brackets, C/AC, Units, the tools, History, tabs,
the language switch, and that nothing is cut off at phone sizes, in both languages and themes. Add a check there
for what you add or fix. GitHub runs the same tests on the built site before every deploy; to do that yourself
(after changing the build, or if something only breaks once deployed): `npm ci && node tools/build.mjs && python3 tests/test_app.py --site build`.

For a change you can see, also look at it yourself in a browser (`python3 -m http.server 8099 -d public`,
Playwright screenshots are fine) at desktop (1280×860) and phone (390×844, touch) sizes, both languages and themes.

## Style of the app

The owner cares about consistent behaviour across the whole app: when fixing a bug, fix it
everywhere the same pattern appears, not only where it was reported. Keep the UI compact and
polished, like a native calculator rather than a web form.
