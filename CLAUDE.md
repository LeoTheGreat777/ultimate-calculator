# Ultimate Calculator – notes for Claude

An all-in-one calculator web app: calculator, graph, unit converter, VAT, fuel and energy tools.
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

## Version

Once per push that changes app files (not for docs-only changes): `python3 tools/bump-version.py`
(0.4.141 -> 0.4.142). It updates `VERSION` in `public/js/core.js`, the footer and every `?v=` in
`public/index.html` (the `?v=` makes browsers load the new files). `--check` only checks they all match.

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
| `tools.js` | VAT, Fuel, Energy: fields, saved values, calculations, `toolKeyInput`, tool field events |
| `layout.js` | `fitLayout` (fits every mode to the screen), long results, zoom on big screens |
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
  6 decimals (`formatRat`), with scientific notation for very small/large values.
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
- **Tools** (fuel, energy, VAT, units) remember their values per tool in localStorage
  (`saveTools`/`loadTools`); AC clears a tool. Field values are stored under the field's `id`.
- **Storage:** all in the browser (`uc-history`, `uc-tools`, `uc-fuel-log`, `uc-graph`, `uc-lang`,
  `uc-theme`). Use `store.get/set` – localStorage can throw.
- **Phones:** the app's own keypad replaces the native keyboard (tool inputs are `readonly` with
  `inputmode="none"` on touch devices). Don't let the native keyboard open.
- **Fitting the screen:** `fitLayout()` sizes keys (`--k`) and the display (`--disp`) to the screen in every
  mode, and switches the tools to their compact layout when needed; only if nothing fits does the page scroll
  (`html.page-scroll`). Don't add fixed pixel heights per screen size or device; let `fitLayout` handle it,
  and call it after anything that changes the layout's height. Phones held sideways (any window wider than tall and
  at most 500px high) get the landscape layout: keypad on the right, the rest on the left (`fitLandscape`,
  `html.landscape` in styles.css). The app is not locked to portrait (iPhones can't be), so both must work.
- **Modes are tabs:** a strip of tabs at the top of the card (`MODE_LABELS`, `renderModeTabs`, `switchMode`), one tap
  each, scrolling sideways when they don't fit; Alt+1…6 on a keyboard. Add a new mode to `MODE_LABELS`, `ICONS`
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
  F9 does ± on a keyboard. A tap on − is always minus. Negative numbers inside a calculation display as `5×(−25)`
  (`formatInputDisplay`), and one at the start as `(−5)` (`negativeInBrackets`), in every calculation shown (typing,
  the line above a result, History, explanation steps, the typed Units value); finished results stay plain (`-15`).
  Units has the same keypad as the calculator, including ( ).
- **Tips:** a sheet per mode (`HELP`, `showHelp`), opened from the footer "Tips" link or the ? key; its keyboard
  shortcuts section only shows on devices with a keyboard. When behaviour changes, update the tips in both languages.
- **Copying:** tapping a finished result copies it (calculator and tools), so the copy button can be hidden
  on short screens.
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
