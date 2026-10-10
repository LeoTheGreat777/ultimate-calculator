# Ultimate Calculator – notes for Claude

An all-in-one calculator web app: calculator, graph, unit converter, VAT, fuel and energy tools.
Plain HTML/CSS/vanilla JS, no framework, no build step, no backend. English and Greek; new users start
in English and dark theme (people who used the app before keep Greek / their theme, see the first script in
`index.html`). Numbers always use Greek formatting: `1.234,56`.

Two people work on this repo, each with their own Claude sessions, and both push to `main`.

## Git and deploying

- Every push to `main` deploys straight to production: GitHub Pages and the Docker image
  `ghcr.io/leothegreat777/ultimate-calculator:latest`. Only push working, tested code.
- Before pushing: `git fetch origin main` and rebase onto it if it moved. If the other person changed
  the same code, resolve it carefully, re-test, and say what you merged.
- Never force push, never rewrite `main`'s history.
- Keep test scripts, screenshots and other scratch files out of the repo (use a temp/scratch folder).
- Commit messages: a short summary line, then what changed and why in plain words.

## Version

Bump the version once per push that changes app files (not for docs-only changes).
Format `0.4.N`, so the next one after `0.4.128` is `0.4.129`. It appears in 6 places, update all of them:
- `app.js`: `const VERSION=...`
- `index.html`: footer text, and `?v=` on `styles.css`, `charts.js`, `app.js`, `history-interaction.js`

The `?v=` makes browsers load the new files, so a missed one serves an old file.

## Files

- `index.html` – page shell, early scripts (theme, language), keypad markup.
- `app.js` – almost everything: calculator engine, modes, tools, units, history, translations, keyboard.
- `charts.js` – loaded BEFORE `app.js`; only defines things. Graph mode, tool charts, History chart,
  fuel log. Its functions use `app.js` globals at call time.
- `history-interaction.js` – History sheet drag/scroll gestures.
- `styles.css` – all styles, dark/light themes, phone and wide-desktop layouts.
- `Dockerfile` + `nginx.conf` – the Docker image: nginx, with only the app's files copied into it.
- `.github/workflows/deploy-pages.yml` – publishes only the files listed in its "Collect site files" step.

Adding a new file the app loads? Add it to the `COPY` line in the `Dockerfile`, the Pages copy step,
and the file checks in `publish-image.yml`, or it works locally and 404s in production.

## How the code works

- **Exact math:** the calculator uses fractions (`rat`, `ratAdd`, ... with BigInt), never floats.
  `evalExpr` parses with operator precedence; `50+10%` = 55, `50×10%` = 5. Results show rounded to
  6 decimals (`formatRat`), with scientific notation for very small/large values.
- **Carry:** continuing after a result uses its full-precision value (`carryText`, `carry`), but the
  screen shows it rounded via `formatExpressionDisplay`. Use that function to display expressions.
- **Number formatting:** use the existing helpers (`fmt`, `formatRat`, `formatGroupedNumber`,
  `formatExpressionDisplay`, `money`), never `toString()` or `toFixed()` for anything shown.
  Money is always 2 decimals (`money`). VAT is rounded to cents like invoices (`vatNumbers`).
- **Text:** every visible string needs Greek and English. Most live in `T.el`/`T.en` (use `t(key)`);
  some modes have their own small tables (`gText`, `cText`, `fText`, and `HELP` for Tips & shortcuts).
  Switching language happens in place (`setLanguage` -> `applyLanguage`), no reload: anything that shows text
  must be re-rendered by `applyLanguage`, and a new text must look the same after a live switch as after a fresh load.
- **Logo:** `icon.svg` is the source of the app icons; the PNGs (`icon-192/512.png`, `icon-maskable-512.png`,
  `apple-touch-icon.png`) are rendered from it, so regenerate them together after changing it. The small logo by
  the title is an inline SVG in `index.html` coloured by theme tokens (`.bm-*` classes), so new themes recolour it.
- **Credits:** the footer names come from `AUTHORS` in `app.js`; the same names are in `index.html`
  (footer and `<meta name="author">`) and the README. Change them in all places together.
- **Tools** (fuel, energy, VAT, units) remember their values per tool in localStorage
  (`saveTools`/`loadTools`); AC clears a tool. Field values are stored under the field's `id`.
- **Storage:** all in the browser (`uc-history`, `uc-tools`, `uc-fuel-log`, `uc-graph`, `uc-lang`,
  `uc-theme`). Use `store.get/set` – localStorage can throw.
- **Phones:** the app's own keypad replaces the native keyboard (tool inputs are `readonly` with
  `inputmode="none"` on touch devices). Don't let the native keyboard open.
- **Fitting the screen:** `fitLayout()` sizes keys (`--k`) and the display (`--disp`) to the screen in every
  mode, and switches the tools to their compact layout when needed; only if nothing fits does the page scroll
  (`html.page-scroll`). Don't add fixed pixel heights per screen size or device; let `fitLayout` handle it,
  and call it after anything that changes the layout's height.
- **Modes are tabs:** a strip of tabs at the top of the card (`MODE_LABELS`, `renderModeTabs`, `switchMode`), one tap
  each, scrolling sideways when they don't fit; Alt+1…6 on a keyboard. Add a new mode to `MODE_LABELS`, `ICONS`
  and `MODE_TRANSLATIONS`. Units is its own tab after Calculator. Going Calculator -> Units moves the calculator's
  number into the Units value last typed in (`unitSource`) and resets the calculator; nothing moves back.
- **Big screens:** on large desktop screens the whole app is scaled with CSS `zoom` on `<html>` (`applyUiZoom`,
  `window.__uiZoom`, CSS var `--z`). Viewport units must be written `calc(100dvh / var(--z,1))`, and any code that
  turns screen coordinates (clientX/Y, getBoundingClientRect, innerHeight) into CSS sizes must divide by
  `window.__uiZoom` (see charts.js `chZoom`, history-interaction.js `Z`).
- **Theme change:** circle reveal from the theme button (View Transitions), fade fallback, instant with reduced motion.
- **Dropdowns:** on desktop Chrome/Edge the unit menus use `appearance: base-select`, styled like the app; phones keep
  native pickers. While a dropdown has focus the global keydown handler leaves keys to it.
- **± and holding keys:** holding ⌫ clears everything, holding − flips the sign (`negate`, units: `toolKeyInput('negate')`);
  F9 does ± on a keyboard. A tap on − is always minus. Negative numbers inside a calculation display as `5×(−25)`
  (`formatInputDisplay`). Units has the same keypad as the calculator, including ( ).
- **Tips:** a sheet per mode (`HELP`, `showHelp`), opened from the footer "Tips" link or the ? key; its keyboard
  shortcuts section only shows on devices with a keyboard. When behaviour changes, update the tips in both languages.
- **Copying:** tapping a finished result copies it (calculator and tools), so the copy button can be hidden
  on short screens.
- **Keyboard:** desktop typing is handled in the `window` `keydown` listener at the end of `app.js`.
  Keys that do nothing in a mode are ignored.

## Testing before every push

Serve the app (`python3 -m http.server 8099`) and check it in a real browser (Playwright is fine)
at desktop (1280×860) and phone (390×844, touch) sizes:
- no JavaScript errors in the console
- the changed feature works, in both Greek and English, light and dark theme
- calculator basics still give these results: `0.1+0.2` = 0,3 · `1/3` = 0,333333 · `50+10%` = 55 ·
  `2×-3` = -6 · `(2+3)×4` = 20 · `2+3==` = 8
- nothing is cut off or overflowing on the phone size

## Style of the app

The owner cares about consistent behaviour across the whole app: when fixing a bug, fix it
everywhere the same pattern appears, not only where it was reported. Keep the UI compact and
polished, like a native calculator rather than a web form.
