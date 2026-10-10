# Ultimate Calculator – notes for Claude

An all-in-one calculator web app: calculator, graph, unit converter, VAT, fuel and energy tools.
Plain HTML/CSS/vanilla JS, no framework, no build step, no backend. Greek is the default language
(English optional) and numbers use Greek formatting: `1.234,56`.

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
  some modes have their own small tables (`gText`, `cText`, `fText`, `SIDE_TIPS`, `SIDE_KEYS`).
  Switching language reloads the page and restores state (`saveReloadState`/`restoreReloadState`).
- **Tools** (fuel, energy, VAT, units) remember their values per tool in localStorage
  (`saveTools`/`loadTools`); AC clears a tool. Field values are stored under the field's `id`.
- **Storage:** all in the browser (`uc-history`, `uc-tools`, `uc-fuel-log`, `uc-graph`, `uc-lang`,
  `uc-theme`). Use `store.get/set` – localStorage can throw.
- **Phones:** the app's own keypad replaces the native keyboard (tool inputs are `readonly` with
  `inputmode="none"` on touch devices). Don't let the native keyboard open.
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
