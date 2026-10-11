# Ultimate Calculator – notes for Claude

An all-in-one calculator web app: calculator, graph, unit converter, currency converter, VAT, percent/discount/tip, interest (loan/savings), dates, fuel, energy and subnet (IPv4) tools.
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
| `charts.js` | drawing helpers, tool charts, History chart |
| `graph.js` | Graph mode (parser, pan/zoom, key points, drawing) |
| `calculator.js` | calculator keys (`digit`, `operator`, brackets, `negate`, `equals`, C/AC), display, explanation |
| `history.js` | saved calculations, the History sheet and its gestures |
| `units.js` | unit data and names, conversion, the two values, `unitKeyInput` |
| `currency.js` | Currency: ECB rates (fetched, saved, shipped snapshot), `units.currency`, money and rate formats, the rate line |
| `tools.js` | VAT, Percent, Interest, Fuel, Energy: fields, saved values, calculations, switches, `toolKeyInput`, tool field events |
| `dates.js` | Dates: day numbers, date pickers, Orthodox Easter and Greek public holidays, working days, the details list, the Working days chip |
| `net.js` | Subnet: IPv4 parsing (`parseIp`, `parsePrefix` takes /24 or a mask), `dottedKey`, the details grid, the Subnet calculations |
| `layout.js` | `fitLayout` (fits every mode to the screen), long text (`fitDisplayText`, `refuseKey`), zoom on big screens |
| `theme.js` | themes: the ready-made ones, own themes (`deriveTheme`), Match device (`themePair`), the theme menu and the own theme editor |
| `ui.js` | `setLanguage`/`applyLanguage`, modes and tabs (`switchMode`, `renderTool`), dialogs, hold keys, install |
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
  expression lines, Units values, tool fields and Subnet's details. A fitted element is watched (`fitWatch`, a
  ResizeObserver): when its own width changes it is fitted again, so turning the phone never leaves a number sized for
  the old width (iOS reports the new width late, after the resize event).
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
- **Logo and icons:** one drawing (a screen with a graph over the keys + − =), in `tools/make-icons.py`: run it after
  changing the drawing and it writes `public/icon.svg`, `favicon.svg` (the tab icon: bolder lines, dark on light browsers
  and light on dark ones), the PNGs (`icon-192/512.png` rounded; `icon-maskable-512.png` and `apple-touch-icon.png` full
  square; `icon-monochrome-512.png` for Android's themed icons) and the small logo by the title in `index.html`
  (`<svg class="brand-mark">`, coloured by theme tokens through `.bm-*` classes, so every theme recolours it). The = sign's
  spacing was chosen by the owner (`EQ_HOME`, `EQ_SMALL`); keep it. No letters in the icon, so it survives a rename.
  iOS can't switch a web app's home screen icon for dark mode, so there is one, opaque and full square. The tests fail
  if the files or the logo differ from what the script draws.
- **Credits:** the footer names come from `AUTHORS` in `i18n.js`, in Greek and English (first name first in both);
  the English names are also in `index.html` (footer and `<meta name="author">`) and both in the README.
  Change them in all places together.
- **Tool modes** are `TOOL_MODES` (core.js): use it rather than listing them. Defaults (VAT rate 24, Subnet /24, Dates today)
  are `TOOL_DEFAULTS`, filled in on entering the mode and after AC. Percent (discount, change, tip), Interest (`loan`:
  loan, payoff, savings) Dates (between, add) and Subnet (`net`: subnet, hosts) have kinds on a switch above their fields: `KIND_FIELDS`, `KIND_LABELS`, `toolKind[mode]`, `setToolKind`,
  `kindPanelHtml`; switching kinds re-renders only the fields, AC (and changing kind) clears the kind on screen. In
  landscape a kind's fields share one row (`.kind-grid`, `--f`, one-line labels); the tip always does (`ONE_ROW_KINDS`). `FIELD_TYPE` marks fields that aren't plain numbers:
  'count' (People: digits only; the , key is dimmed), 'int' (Dates' days: may be negative; the , key becomes ±),
  'date' (the device's own date picker, `<input type="date">`, value YYYY-MM-DD, not on the keypad), 'ip'/'mask'
  (`dottedField`: digits and dots, each part ≤ 255, via `dottedKey`, which adds the dot itself after a third digit or
  before a digit that can't fit, and ignores a dot typed right after one; the , key types a dot;
  / in the address jumps to the prefix, a pasted 10.0.0.5/16 fills both). The tip has nothing filled in (the owner asked): People left empty means one person, and its
  grey hint says 1. A tip split between people is rounded
  up to the cent (`ratCentsUp`) so the shares cover the bill. Interest (`loanNumbers`, floats like Fuel/Energy): yearly
  rate, interest monthly, months = round(years × 12) up to 1200; a loan's payment is rounded to cents; savings deposits
  come at the end of each month, an empty starting amount or deposit counts as 0. Payoff (`payoffNumbers`): months to
  pay a loan with a given payment (the last one smaller), or `never` when the payment doesn't cover a month's interest. Dates (dates.js) count days in UTC
  (`dayNumber`), years 1000–9999; From and Date start at today (`TOOL_DEFAULTS`). The "Working days" chip on the
  display (`renderDateBar`, `dateCount`, saved as a choice) counts Monday–Friday without Greek public holidays
  (`greekHolidays`, `orthodoxEaster`): "between" counts both dates, "add" skips non-working days from the day after.
  "Between" has no number to type, so `#keypad.date-details` shows a details list instead of keys.
  With a mouse (`ownCalendar`), a date is a button (`datePickHtml`, its `value` is YYYY-MM-DD) opening the app's
  calendar (`openCalendar`, `#calPop`: days/months/years views, holidays dotted); touch devices keep `<input type="date">`.
  Subnet (net.js): /31 = 2 addresses, /32 = 1, else 2^(32−p) − 2. Its details grid (`#netDetails`, `renderNetDetails`)
  always shows its cells (– until a result) so the layout doesn't jump; a long value (255.255.255.192) gets a smaller font,
  never "…". Sideways the left side is wider (Subnet's keypad has three columns) and the details are two columns of
  "label  value" lines, readable on a big iPhone; on shorter screens `fitLandscape` hides them (`fit-no-details`)
  and the working under ? still has it. "Between" in Dates says "Pick two dates." until both are picked, also sideways.
- **Switches** (VAT add/remove, the kinds of Percent, Interest and Dates) are one generic segmented control: `TOGGLES`, `toggleHtml`,
  `renderToggles`, `setupToggleSlide` (tap, drag, swipe, ← →), `.seg-toggle` in styles.css (`--n` options, `--i` chosen).
- **Changing mode clears the mode you leave** (`resetModeInput`, called by `switchMode`): numbers typed and results
  go, in every mode (Percent, Interest, Dates: also changing kind; Graph goes back to `graphDefault`). Only Calculator -> Units carries
  the number. Kept: choices (units picked, VAT add/remove, the kinds, Deg/Rad, f(x)), History. Typed values are
  not saved across visits; `saveTools`/`loadTools` keep only those choices. AC clears a tool.
- **Storage:** all in the browser (`uc-history`, `uc-tools`, `uc-rates`, `uc-lang`,
  `uc-theme`, `uc-theme-pair`, `uc-custom-themes`, `uc-theme-recent`). Use `store.get/set` – localStorage can throw.
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
  `html.landscape` in styles.css). Sideways the keys are the biggest that fit (a halving search, tools up to 84px), so every
  tab's keys are the same size even when the left side is the taller one, and once everything fits the card is stretched
  to the bottom (`html.land-fill`), so there is no empty strip below. iOS reports a turned phone's new size late, after
  'resize': a ResizeObserver on the page fires 'resize' again when the width really changes (layout.js), and one on the
  tabs re-measures their bar (ui.js). The app is not
  locked to portrait (iPhones can't be), so both must work.
- **Scientific:** a view of the Calculator, not a mode: the f(x) switch on the display (`sciMode`, `uc-sci`; the only chip
  there, the angle unit is the keypad's Deg/Rad key; at the display's top-left in line with History, styled like ?, and
  Dates' Working days chip sits in the same place) adds 15
  keys above the basic ones (beside them in landscape; `sciKeysHtml`, `.keypad.sci`). Functions apply to the value
  just typed / the result / the bracket just closed (`sciKey`, `lastValueStart`), else open `sin(`. x², xʸ, ʸ√x and x! take the whole value, so a negative one or a power gets brackets: (−3)², (9²)². 2nd swaps keys
  for inverses; Deg/Rad is `angleUnit` (`uc-angle`). The engine (numbers.js: `evalExpr`, `ratPow`, `sciFunction`)
  stays exact where the answer is exact and rounds floats to 15 digits otherwise. Shown with superscripts and sin⁻¹
  (`sciPretty`). Keyboard: ^ and !.
- **Modes are tabs:** a strip of tabs at the top of the card (`MODE_LABELS`, `renderModeTabs`, `switchMode`), one tap
  each, scrolling sideways when they don't fit; Alt+1…9 on a keyboard (Energy and Subnet, the last two, have none). When they don't all fit, a slim bar under them
  (`.tabs-scrollbar`, `syncTabEdges`, `flashTabsBar`) shows while they move and briefly on start; it can be dragged
  or pressed (`setupTabsBar`), spans the whole strip; with a mouse it shows while the mouse is over the tabs or its strip and
  fades out shortly after (the tabs can be mouse-dragged too). Phones keep their overscroll bounce; past an end (negative/over-max `scrollLeft`, or `tabsPull` measured from
  touch for Android's stretch) the thumb shrinks against that end; and with a mouse
  ‹ › buttons appear on hover at the edges that have more tabs. Add a new mode to `MODE_LABELS`, `ICONS`
  and `MODE_TRANSLATIONS`. Units is its own tab after Calculator. Going Calculator -> Units moves the calculator's
  number into the Units value last typed in (`unitSource`) and resets the calculator; nothing moves back.
- **Currency** is the Units mode with `unitView==='currency'` (core.js): tab id `currency`, `mode` stays `'units'`;
  `currentTab()` gives the tab on screen (tabs, Tips use it), `switchMode('currency')` sets the view. The category menu
  is hidden (Units' own menu leaves `currency` out) and `#rateInfo` shows the pair's rate and the rates' date; tap
  to update. Rates (currency.js): ECB reference rates per euro from `https://api.frankfurter.dev/v1/latest` (CORS),
  fetched at most hourly in the background (on start, and with `checkForUpdate` whenever the app comes back to the
  screen: `backOnScreen` in main.js) and on entering the tab; saved in `uc-rates`; `RATES_SNAPSHOT` before
  the first fetch (update it now and then). The rate line says "offline" by itself when the last fetch failed or the
  device has no connection (`ratesOffline`, `online`/`offline` events; back online it fetches again). Strings, converted with fractions (`currencyRate`). Values show as money
  (`formatMoneyValue`: 2 decimals, more under 1); on phones the closed menus show only the code. Tests stub the URL.
- **iPhone home-screen app:** iOS draws a soft blur under the status bar over the page, which made the title look
  blurred. The `<head>` script sets `html.ios-app` when `navigator.standalone` (Apple's own), and held upright the page
  starts 28px below the safe area (styles.css). Can't be seen in desktop browsers; the tests fake `navigator.standalone`.
- **Symbols iOS turns into emoji:** don't use characters like ☀ ☾ for icons (iPhone draws ☀ as a colour emoji): draw
  them (the theme button's `THEME_ICONS`), or add U+FE0E after an arrow or symbol in text. The tab icons are drawn too
  (`ICONS`, `tabSvg` in i18n.js, 16×16): symbol characters like ↔ ◷ came out tiny and low on iPhone; only € % $ stay text.
- **Big screens:** on large desktop screens the whole app is scaled with CSS `zoom` on `<html>` (`applyUiZoom`,
  `window.__uiZoom`, CSS var `--z`). Viewport units must be written `calc(100dvh / var(--z,1))`, and any code that
  turns screen coordinates (clientX/Y, getBoundingClientRect, innerHeight) into CSS sizes must divide by
  `window.__uiZoom` (see `chZoom` in charts.js, `Z` in history.js).
- **Themes** (theme.js): ready-made ones, light: Light, Paper; dark: Dark, Black (OLED) (`LIGHT_PRESETS`, `DARK_PRESETS`);
  and an own theme in each group, `custom-light` / `custom-dark`, for everything else. Rose, Sky, Ocean, Violet, Ember
  and Forest were removed on purpose in 0.14.2 (Graphite and Retro before them): don't add colourful presets back;
  `REMOVED_THEMES` turns a saved one into the own theme with the same colours. Every colour is a
  token in the theme blocks at the top of styles.css (`html[data-theme]`); never write a colour into a rule, add a token
  instead. `theme` is one theme or `'auto'` (**Match device**, a switch at the top of the menu): then the device picks
  between a light and a dark theme, `themePair` (`uc-theme-pair`), and a tap in the menu sets that group's one (the menu
  stays open). `resolvedTheme()` is what is on screen; an own theme that isn't made falls back to `light`/`dark`. The
  `<head>` script in index.html repeats this logic before the first paint, so change both together.
  **Own themes** are made from a background and an accent only: `deriveTheme(group,bg,accent)` works out every other
  token and keeps it readable (text ≥ 7:1, muted ≥ 4.5, accent and chart lines ≥ 3 on the card and keys, text on the
  accent ≥ 4.5; tested for many colours); `clampThemeBg` keeps a background in its group (by luminance). Saved in
  `uc-custom-themes` with their tokens (`vars`, re-made on every start), which the `<head>` script turns into
  `<style id="customThemes">` rules (`writeCustomCss` later), so they work like the ready-made ones, swatches included.
  The editor (`openThemeEditor`, `#themeEditor`) is a panel at the bottom without dimming, so the app shows the colours
  live (`themeDraft`); swatches plus "any colour" (`<input type="color">`). No Save/Cancel: every change is kept when it
  closes (×, Esc, Enter, a press outside: `closeThemeEditor`; also saved when the app goes to the background), and
  Recent (`themeRecent`, `uc-theme-recent`, 8 pairs per group, where you started included) brings back an earlier look.
  The panel is built once per opening (`renderThemeEditor`) and then only updated in place (`updateThemeEditor`): never
  replace the colour inputs while it is open, or the device's colour picker closes in the middle of a drag. Keys don't
  reach the calculator while it is open; ← → move through a row of swatches. A new ready-made theme: a block in styles.css, its name in `LIGHT_PRESETS` or
  `DARK_PRESETS` and in the `<head>` script, texts in `T` (`themeX`). Sideways phones get shorter menu rows so it fits. Charts and graph lines read the tokens (`chColors`,
  `--series1..3`). Check a new theme's contrast (text on card and keys, text on the accent) and look at it in every
  mode. Changing theme: circle reveal from the theme button (View Transitions, `transitionTheme`), fade fallback,
  instant with reduced motion.
- **A press outside closes it** (theme menu, own theme editor, Dates calendar, History's "Delete all?"): check with
  `eventInside(e,selector)` (core.js), never `e.target.closest`: a handler may already have re-drawn the pressed element,
  and a detached target looks like a press outside (the menu closed when its own switch was pressed).
- **Dropdowns:** on desktop Chrome/Edge the unit menus use `appearance: base-select`, styled like the app; phones keep
  native pickers. While a dropdown has focus the global keydown handler leaves keys to it.
- **Pressing keys** (`setupPressFeedback`, ui.js), the same with a mouse and a finger, like the iPhone's calculator:
  every key in `#keypad` lights up the moment it's pressed (`.pressed`, a `::after` layer of `--text`, so it suits every
  key colour and theme), held a moment longer it grows (after .09s, easing out over .3s, to scale 1.12, over its neighbours, `will-change`
  set as it's pressed so the move starts smoothly; the owner tuned it: a quick tap only lights up), and let go it
  fades and settles back. No `:active` shrink anywhere on the keypad. On phones a tick: Android `navigator.vibrate(8)` on
  pointerdown. iPhone has no vibrate for websites; its own switch (`<input type="checkbox" switch>`, iOS 18+) ticks, but
  since iOS 26.5 only when a finger toggles it (a script's `label.click()` is silent). So on iPhone every key holds an
  invisible `<label class="key-tick">` over its face with a hidden switch inside (`addKeyTicks`, kept on re-drawn and
  re-labelled keys by a MutationObserver): the tap lands on the label, which toggles its switch (the tick), and the same
  click goes on to the keypad as the key press (the switch's own click is stopped). Apple doesn't document it; if it
  stops, nothing breaks. No sounds (the owner said no). `selectstart` is blocked outside fields: a fast double tap on iOS
  otherwise starts selecting a key's label and shows the magnifier bubble.
- **± and holding keys:** holding ⌫ or C clears everything (C turns into AC while still held and big, like the iPhone's
  calculator; in the tools C stays C, AC is its own key), holding − flips the sign (`negate`, Units: `unitKeyInput('negate')`);
  F9 does ± on a keyboard. A tap on − is always minus. A minus made with ± is stored as `−` (U+2212), one typed with
  the − key as `-`; the maths reads both the same (`tokenize`, `normalizeUnitExpression`). Display (`formatInputDisplay`):
  after an operator any negative number is in brackets, `5×(−25)`; at the start only a ± one is, `(−5)`, a typed one
  stays `-5`. A result turned negative with ± carries on as `(−84)+2` (`resultNegated`). Finished results stay plain.
  Units has the same keypad as the calculator, including ( ).
- **Tips:** a sheet per mode (`HELP`, `showHelp`), opened from the footer "Tips" link or the ? key; its keyboard
  shortcuts section only shows on devices with a keyboard. When behaviour changes, update the tips in both languages.
- **No fuel log:** the save/saved-entries buttons in Fuel were removed on purpose (0.15.5); don't add them back.
- **Copying:** tapping a finished result copies it (calculator and tools), so the copy button can be hidden
  on short screens.
- **Offline:** `public/sw.js` (registered at the end of main.js) keeps a copy of the app in the cache `uc-app`. The page
  comes from the network first (`no-cache`), the saved copy only offline or after 3 s; `?v=` files from the saved copy
  first; each fresh page saves the files it links to and deletes other versions' `?v=` files. Nothing to update per
  version, but every file the app needs must be linked from index.html with `?v=`, and the app must not fetch anything
  else it needs to start. Coming back to the screen (`visibilitychange`, `focus`, bfcache `pageshow`) runs
  `checkForUpdate` (main.js, at most once a minute): it fetches the page with `no-store` (sw.js leaves those alone) and
  reloads if its footer version differs from `VERSION`. Not while the own theme editor is open (the reload would close
  the colour picker); the editor's colours are also kept on `pagehide`, so a reload never loses them. Test with `offline()` in tests/test_app.py.
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
