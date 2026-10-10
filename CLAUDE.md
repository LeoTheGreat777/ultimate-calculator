# Ultimate Calculator – notes for Claude

An all-in-one calculator web app: calculator, graph, unit converter, VAT, percent/discount/tip, fuel and energy tools.
Plain HTML/CSS/vanilla JS, no framework, no build step, no backend. English and Greek; new users start
in English and dark theme (people who used the app before keep Greek / their theme, see the script in the
`<head>` of `public/index.html`). Numbers always use Greek formatting: `1.234,56`.

Two people work on this repo, each with their own Claude sessions, and both push to `main`.

## Git and deploying

- Every push to `main` runs `.github/workflows/deploy.yml`: the browser tests first, and only if they pass,
  GitHub Pages (https://uc.kampaxis.com) and the Docker image `ghcr.io/leothegreat777/ultimate-calculator:latest`.
  If the tests fail nothing is deployed. Still: only push working, tested code.
- Before pushing: `git fetch origin main` and rebase onto it if it moved. If the other person changed
  the same code, resolve it carefully, re-test, and say what you merged.
- Never force push, never rewrite `main`'s history.
- Keep scratch files (one-off test scripts, screenshots) out of the repo; use a temp/scratch folder.
- Commit messages: a short summary line, then what changed and why in plain words.

## Version and changelog

Versions are `MAJOR.MINOR.PATCH` (semantic versioning). Once per push that changes app files (not for docs-only
changes), pick one: `python3 tools/bump-version.py patch` for fixes and small tweaks (0.5.0 -> 0.5.1),
`minor` for a new feature (0.5.1 -> 0.6.0), `major` only when the owner says (1.0.0 = ready for everyone).
It updates `VERSION` in `public/js/core.js`, the footer and every `?v=` in `public/index.html` (the `?v=` makes
browsers load the new files), and adds a `## X.Y.Z – date` heading to `CHANGELOG.md`. Under it, write what changed
for the people using the app (not the code), in `### Added` / `### Changed` / `### Fixed`; keep it short.
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
| `charts.js` | drawing helpers, tool charts, History chart, fuel log |
| `graph.js` | Graph mode (parser, pan/zoom, key points, drawing) |
| `calculator.js` | calculator keys (`digit`, `operator`, brackets, `negate`, `equals`, C/AC), display, explanation |
| `history.js` | saved calculations, the History sheet and its gestures |
| `units.js` | unit data and names, conversion, the two values, `unitKeyInput` |
| `tools.js` | VAT, Percent, Fuel, Energy: fields, saved values, calculations, switches, `toolKeyInput`, tool field events |
| `layout.js` | `fitLayout` (fits every mode to the screen), long text (`fitDisplayText`, `refuseKey`), zoom on big screens |
| `ui.js` | theme, `setLanguage`/`applyLanguage`, modes and tabs (`switchMode`, `renderTool`), dialogs, hold keys, install |
| `help.js` | Tips & shortcuts text (`HELP`) and `showHelp` |
| `main.js` | keypad and button wiring, the desktop keyboard handler, start-up. Loaded last |

  Top-level code runs in that order, so a script may only *call* things from earlier scripts while loading;
  inside functions anything can be used. A new script goes into `public/js/`, gets a `<script>` line with `?v=`
  in `index.html`, and is deployed automatically (Pages and Docker take the whole `public/` folder).

Outside `public/`: `tests/test_app.py` (browser tests), `tools/bump-version.py`, `Dockerfile` + `nginx.conf`
(the Docker image), `docker-compose.yml` (for self-hosting), `.github/workflows/deploy.yml`.

## How the code works

- **Exact math:** the calculator uses fractions (`rat`, `ratAdd`, ... with BigInt), never floats.
  `evalExpr` parses with operator precedence; `50+10%` = 55, `50×10%` = 5. Results show rounded to
  6 decimals and at most 16 significant digits (`formatRat`); from 10¹⁶ up, and for values that would round to 0,
  `1,234567 × 10²⁰` (`ratScientific`, superscript exponent). The same in Units, tools (`money`) and charts (`chNum`).
- **Limits** (numbers.js, as on Windows' calculator): typed numbers have at most 15 digits (`MAX_DIGITS`, `digitCount`)
  in every mode, a calculation at most 150 characters (`MAX_INPUT`; Graph functions 120), and every step of a
  calculation must stay below 10¹⁰⁰⁰⁰ and (unless 0) above 10⁻¹⁰⁰⁰⁰ (`ratLimit`), else "Too large"/"Too small".
  That also keeps everything fast: exact powers only up to 40000 bits, beyond that logarithms (`ratPowApprox`).
  A key that can't do more calls `refuseKey()` (a small shake, a short vibration) and does nothing.
- **Errors:** `calcError` ('DIV0', 'BIG', 'SMALL', 'MATH'; texts `errDiv0`… via `ERROR_TEXT`) shows the reason in place
  of the result with the calculation above it, until the next key, which goes on from the calculation (AC clears).
  Units shows the reason on the other value (`unitError`). Never put "Error" into `current`.
- **Long text:** `fitDisplayText(el,minSize,showEnd)` shrinks text to minSize, then scrolls it: a result shows its
  start, a calculation (typed or above a result) its end; the cut-off side fades (`fade-start`/`fade-end`). Used for the result and
  expression lines, Units values and tool fields.
- **Carry:** continuing after a result uses its full-precision value (`carryText`, `carry`), but the
  screen shows it rounded via `formatExpressionDisplay`. Use that function to display expressions.
- **Brackets:** useless ones are dropped (`tidyParens`, `closeParen`): `((5))` -> `5`, open ones at the end
  are dropped on =. A number or `(` after `)`, and a number after `%`, adds `×` first. Same in Units.
- **C / AC:** the key shows C while a number is being typed (C clears just that number), otherwise AC
  (clears everything). Same in Units (`unitEntry`). Delete = C, Esc = AC on a keyboard.
- **Number formatting:** use the existing helpers (`fmt`, `formatRat`, `formatGroupedNumber`,
  `formatExpressionDisplay`, `money`), never `toString()` or `toFixed()` for anything shown.
  Money is always 2 decimals (`money`). VAT is rounded to cents like invoices (`vatNumbers`).
- **Text:** every visible string needs Greek and English. Most live in `T.el`/`T.en` (use `t(key)`);
  some modes have their own small tables (`gText`, `cText`, `fText`, and `HELP` for Tips & shortcuts).
  Switching language happens in place (`setLanguage` -> `applyLanguage`), no reload: anything that shows text
  must be re-rendered by `applyLanguage`, and a new text must look the same after a live switch as after a fresh load.
- **Logo:** `public/icon.svg` is the source of the app icons; the PNGs (`icon-192/512.png`, `icon-maskable-512.png`,
  `apple-touch-icon.png`) are rendered from it, so regenerate them together after changing it. The small logo by
  the title is an inline SVG in `index.html` coloured by theme tokens (`.bm-*` classes), so new themes recolour it.
- **Credits:** the footer names come from `AUTHORS` in `i18n.js`, in Greek and English (first name first in both);
  the English names are also in `index.html` (footer and `<meta name="author">`) and both in the README.
  Change them in all places together.
- **Tool modes** are `TOOL_MODES` (core.js): use it rather than listing them. Defaults (VAT rate 24, tip 10% for 1 person)
  are `TOOL_DEFAULTS`, filled in on entering the mode and after AC. Percent has three kinds (`pctAction`: discount,
  change, tip), each with its own fields (`PCT_FIELDS`); switching kinds re-renders only the fields, AC (and changing kind)
  clears the kind on screen. Fields in `WHOLE_NUMBER_FIELDS` (People) refuse , . and −. A tip split between people is rounded
  up to the cent (`ratCentsUp`) so the shares cover the bill.
- **Switches** (VAT add/remove, Percent's kinds) are one generic segmented control: `TOGGLES`, `toggleHtml`,
  `renderToggles`, `setupToggleSlide` (tap, drag, swipe, ← →), `.seg-toggle` in styles.css (`--n` options, `--i` chosen).
- **Changing mode clears the mode you leave** (`resetModeInput`, called by `switchMode`): numbers typed and results
  go, in every mode (Percent: also changing kind; Graph goes back to `graphDefault`). Only Calculator -> Units carries
  the number. Kept: choices (units picked, VAT add/remove, Percent's kind, Deg/Rad, f(x)), History, the fuel log. Typed values are
  not saved across visits; `saveTools`/`loadTools` keep only those choices. AC clears a tool.
- **Storage:** all in the browser (`uc-history`, `uc-tools`, `uc-fuel-log`, `uc-lang`,
  `uc-theme`). Use `store.get/set` – localStorage can throw.
- **Tool fields on a computer** edit like text boxes: a focused field keeps the browser's own Backspace, Delete and
  cursor (selection respected); the global handler only takes over when no field has the focus (keys go to the
  highlighted field, at the end). Comma and − are still the app's (one comma; − changes the sign).
- **Phones:** the app's own keypad replaces the native keyboard (tool inputs are `readonly` with
  `inputmode="none"` on touch devices). Don't let the native keyboard open.
- **Fitting the screen:** `fitLayout()` sizes keys (`--k`) and the display (`--disp`) to the screen in every
  mode, and switches the tools to their compact layout when needed; only if nothing fits does the page scroll
  (`html.page-scroll`). Don't add fixed pixel heights per screen size or device; let `fitLayout` handle it,
  and call it after anything that changes the layout's height. Phones held sideways (any window wider than tall and
  at most 500px high) get the landscape layout: keypad on the right, the rest on the left (`fitLandscape`,
  `html.landscape` in styles.css). The app is not locked to portrait (iPhones can't be), so both must work.
- **Scientific:** a view of the Calculator, not a mode: the f(x) switch on the display (`sciMode`, `uc-sci`) adds 15
  keys above the basic ones (beside them in landscape; `sciKeysHtml`, `.keypad.sci`). Functions apply to the value
  just typed / the result / the bracket just closed (`sciKey`, `lastValueStart`), else open `sin(`. x², xʸ, ʸ√x and x! take the whole value, so a negative one or a power gets brackets: (−3)², (9²)². 2nd swaps keys
  for inverses; Deg/Rad is `angleUnit` (`uc-angle`). The engine (numbers.js: `evalExpr`, `ratPow`, `sciFunction`)
  stays exact where the answer is exact and rounds floats to 15 digits otherwise. Shown with superscripts and sin⁻¹
  (`sciPretty`). Keyboard: ^ and !.
- **Modes are tabs:** a strip of tabs at the top of the card (`MODE_LABELS`, `renderModeTabs`, `switchMode`), one tap
  each, scrolling sideways when they don't fit; Alt+1…7 on a keyboard. Add a new mode to `MODE_LABELS`, `ICONS`
  and `MODE_TRANSLATIONS`. Units is its own tab after Calculator. Going Calculator -> Units moves the calculator's
  number into the Units value last typed in (`unitSource`) and resets the calculator; nothing moves back.
- **Big screens:** on large desktop screens the whole app is scaled with CSS `zoom` on `<html>` (`applyUiZoom`,
  `window.__uiZoom`, CSS var `--z`). Viewport units must be written `calc(100dvh / var(--z,1))`, and any code that
  turns screen coordinates (clientX/Y, getBoundingClientRect, innerHeight) into CSS sizes must divide by
  `window.__uiZoom` (see `chZoom` in charts.js, `Z` in history.js).
- **Themes:** Auto (follows the device); light: Light, Paper, Rose, Sky; dark: Dark, Black (OLED), Ocean, Violet, Ember, Forest. Every colour is a token in the theme blocks at the
  top of styles.css (`html[data-theme]`); never write a colour into a rule, add a token instead. The `<head>` script and
  `applyTheme` (ui.js) set `data-theme`; the theme button opens a menu (`THEMES`, `openThemeMenu`), each swatch shows the
  theme's real colours via `[data-theme-preview]`. A new theme: a block in styles.css, its name in `THEMES`, texts in
  `T` (`themeX`). Charts and graph lines read the tokens (`chColors`, `--series1..3`).
  Check a new theme's contrast (text on card and keys, text on the accent) and look at it in every mode. Changing theme: circle reveal from the theme button (View
  Transitions), fade fallback, instant with reduced motion.
- **Dropdowns:** on desktop Chrome/Edge the unit menus use `appearance: base-select`, styled like the app; phones keep
  native pickers. While a dropdown has focus the global keydown handler leaves keys to it.
- **± and holding keys:** holding ⌫ clears everything, holding − flips the sign (`negate`, Units: `unitKeyInput('negate')`);
  F9 does ± on a keyboard. A tap on − is always minus. A minus made with ± is stored as `−` (U+2212), one typed with
  the − key as `-`; the maths reads both the same (`tokenize`, `normalizeUnitExpression`). Display (`formatInputDisplay`):
  after an operator any negative number is in brackets, `5×(−25)`; at the start only a ± one is, `(−5)`, a typed one
  stays `-5`. A result turned negative with ± carries on as `(−84)+2` (`resultNegated`). Finished results stay plain.
  Units has the same keypad as the calculator, including ( ).
- **Tips:** a sheet per mode (`HELP`, `showHelp`), opened from the footer "Tips" link or the ? key; its keyboard
  shortcuts section only shows on devices with a keyboard. When behaviour changes, update the tips in both languages.
- **Copying:** tapping a finished result copies it (calculator and tools), so the copy button can be hidden
  on short screens.
- **Offline:** `public/sw.js` (registered at the end of main.js) keeps a copy of the app in the cache `uc-app`. The page
  comes from the network first (`no-cache`), the saved copy only offline or after 3 s; `?v=` files from the saved copy
  first; each fresh page saves the files it links to and deletes other versions' `?v=` files. Nothing to update per
  version, but every file the app needs must be linked from index.html with `?v=`, and the app must not fetch anything
  else it needs to start. Coming back to the screen (`visibilitychange`, `focus`, bfcache `pageshow`) runs
  `checkForUpdate` (main.js, at most once a minute): it fetches the page with `no-store` (sw.js leaves those alone) and
  reloads if its footer version differs from `VERSION`. Test with `offline()` in tests/test_app.py.
- **Keyboard:** desktop typing is handled in the `window` `keydown` listener in `main.js`.
  Keys that do nothing in a mode are ignored.

## Testing before every push

`python3 tests/test_app.py` (needs `pip install playwright` and `python3 -m playwright install chromium` once).
It serves `public/` itself and checks the calculator basics, brackets, C/AC, Units, the tools, History, tabs,
the language switch, and that nothing is cut off at phone sizes, in both languages and themes. Add a check there
for what you add or fix. GitHub runs the same tests before every deploy.

For a change you can see, also look at it yourself in a browser (`python3 -m http.server 8099 -d public`,
Playwright screenshots are fine) at desktop (1280×860) and phone (390×844, touch) sizes, both languages and themes.

## Style of the app

The owner cares about consistent behaviour across the whole app: when fixing a bug, fix it
everywhere the same pattern appears, not only where it was reported. Keep the UI compact and
polished, like a native calculator rather than a web form.
