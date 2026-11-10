# Layout, tabs and devices

Part of the notes in CLAUDE.md (read that first). Covers layout.js, side.js, modes.js, ui.js, styles.css.

- **Long text:** `fitDisplayText(el,minSize,showEnd)` shrinks text that is more than 1px too wide (2px already cuts a digit) to minSize, then scrolls it: a result shows its
  start, a calculation (typed or above a result) its end; the cut-off side fades (`fade-start`/`fade-end`). Used for the result and
  expression lines, Units values, tool fields and Subnet's details. A fitted element is watched (`fitWatch`, a
  ResizeObserver): when its own width changes it is fitted again, so turning the phone never leaves a number sized for
  the old width (iOS reports the new width late, after the resize event).
- **Bigger keys on phones held upright** (`html.big-keys`: touch, upright, at most 500px wide, or a tablet; not Graph): the keys grow into
  the room the screen leaves (`bigSpec`: up to 100px tall, Scientific 62px), the display giving way down to
  150px first; digits grow with them (the tools' keys too); the footer is on one line (`fit-small`). Every keypad's keys may be as tall as
  the Calculator's (a quarter of the keypad's width) and never taller than they are wide, so the round keys (look.md) are circles
  where they can be and pills where they are wider (the tools' three columns, tablets): the keypads look the same in every mode.
  **The keys sit at the bottom in every mode:** once everything fits, the display takes the height left over (`--disp` grows), so
  nothing is left empty under the keypad; extra room shows above the result. Dates (a list, no keys) keeps its display and its
  list reaches the bottom instead (`min-height` on `#keypad.date-details`), so the date fields don't move when the list appears.
  **Computers too** (mouse, not touch, not the sideways layout: `html.desk`; not Graph for the keys): one key height for
  the window in every mode (`deskKey()`: (height − `DESK.reserve` 570) / 5, at least 56; what Interest, two rows of fields,
  has room for, so Subnet gets a few px less and Scientific keeps its own 62 at most). The tools' display gives way to its
  smallest before their keys do (`dispFirst`), and the display takes the height left over, so the keys sit at the bottom.
  The column's width follows the keys (`--desk-w`: keys about 1.2 times as wide as tall, the card 520–652px), so tall
  windows get near-round keys; digits grow with the keys. Units and Currency: their two values sit just above the keys,
  where the Calculator's result is, the category or rate bar stays at the top. No card frame (look.md). The footer is
  on one line in every mode, Graph too (`fit-small`, as on phones and tablets), also when the page scrolls.
  `keys_fill_the_bottom` in the tests checks every mode on phones, an iPad and computers (1024×768 to 1920×1080).
- **Tablets upright** (`html.tablet`, `fitLayout`: a touch screen wider than 500px, not in the sideways layout, narrower than
  `TABLET_MAX_W` 1264px, where the side panels fit): the app takes the whole width (up to 1100px) like the iPad's calculator,
  gets `big-keys` (up to 124px; Scientific 80), bigger digits and result, the footer on one line (`fit-small`, as on phones),
  and like phones the display takes the height left over, so the keys sit at the bottom (Units: its two values just above the keys).
- **Tablets sideways** (`html.land-tablet`: touch, at least 6:5 wide, over 500px high, narrower than `TABLET_MAX_W`) get the
  phones' sideways layout (`html.landscape`, `fitLandscape`): result and tabs on the left, keys on the right, Scientific's six
  columns beside the basic four (`html.sci-side`). Keys up to 130px but never taller than wide (circles), at the bottom
  (`align-self:end`) when they don't fill the height; bigger digits and gaps. An iPad Pro 13" sideways (1366px) keeps the
  column with the side panels. `PHONES` in the tests has iPads (mini, Pro 11, Pro 13, upright and sideways) and a Galaxy Tab.
- **Phones sideways look like upright:** a big result (`clamp(40px,16vh,96px)`), digits sized by the key (`--k`), and no card
  frame (look.md).
- **Fitting the screen:** `fitLayout()` sizes keys (`--k`) and the display (`--disp`) to the screen in every
  mode, and switches the tools to their compact layout when needed; only if nothing fits does the page scroll
  (`html.page-scroll`). Small phones upright (320×568, 360×640, an iPhone SE in Safari 375×553): when the normal limits
  don't fit, `fitLayout` tries tighter ones (`FIT.tight`): tools get less padding and a smaller result (`fit-tight`), the footer
  goes on one line (`html.fit-small`), display and keys get smaller (tool keys down to 30px; Units' values stay readable, `--urow`), then a kind's fields share one row
  with short labels (`fit-row`), then Equations' form line and Subnet's and Statistics' details go (`fit-no-form`, `fit-no-details`; ? shows
  them), and Dates' note under its list goes and the list scrolls in its own space (`fit-list`, at least 150px of it). If even that
  doesn't fit (Scientific's ten rows of keys at 320×568 and in Safari on an iPhone SE, 375×553) it goes back to the normal sizes and
  the page scrolls. The one-line footer (`fit-small`, sideways) drops the app's name when it would still take two lines (`fitFooter`,
  `html.fit-footer`: Greek on an iPhone SE). Anything that changes a tab's height after it was fitted calls `fitLayoutSoon()`
  (Dates' list replacing its "pick two dates" note does).
  `upright_small_phones` in the tests checks every tab there.
- **The title** (`fitBrand`): beside the top buttons it shrinks to 14px; if it still doesn't fit (344px and narrower, or a wide
  font) the logo goes (`.brand.no-mark`) and it may shrink to 12px. Never "…".
- **Popular phone sizes** (`phone_sizes` in the tests, `--phones` runs only it): every tab and kind filled with long values
  (`PHONE_TABS`; Scientific with 2nd and a complex result too) and every sheet and popup (`PHONE_SHEETS`: All modes, History,
  ⋯, the working, Tips, theme menu, own theme editor) on the phones in `PHONES`, in both languages, each checked by
  `tests/layout_probe.js`: text over other text, text cut by a box that hides (not one that scrolls, not `fade-start/-end`
  scrolling, not a line clamp), text or boxes off the screen, text wider than its button, a number cut in its field, keys under
  30px and buttons or fields under 30×30 (sideways 24, like the kind switches). Sizes are what the browser leaves the page with
  its bars showing (Safari, Chrome). Android phones get DejaVu Sans, wider than Roboto and the font GitHub's runner has, so CI
  and the phones agree. Page scrolling fails the check except where `PHONES` allows it: Scientific on an iPhone SE,
  everything on the iPhone Duo's outer screen in Safari (466×490) and a Galaxy S held sideways (732×290), shorter than any
  layout fits. A new tab or kind goes into `PHONE_TABS`, a new sheet or popup into `PHONE_SHEETS`.
- **Touch areas:** every button and field is at least 30×30 px to a finger (`touch_areas` and `phone_sizes` in the tests; Statistics' chips are 30px tall, All modes' All | Default | None switch has a hit area). Small buttons (Tips,
  ?, Graph's buttons) look the same but get an invisible hit area (`::after`, "Bigger touch areas" at the end of styles.css;
  a static button becomes `position:relative;inset:auto` for it: without inset:auto its right/bottom from the absolute layout move it, which put ? on the mode tabs); Units' unit names are taller transparent boxes with negative margins.
  A kind switch is at least 30px tall upright, even when tightened (sideways 24px). Field labels and kind switch buttons count as cut by exact width (`labelCut`); a cut one takes its short form, then a smaller font (`fitShortLabels`, run at the end of `fitLayout`). The tests also check 320×568 with a wider font (the GitHub runner's fonts measure wider). Don't add fixed pixel heights per screen size or device; let `fitLayout` handle it,
  and call it after anything that changes the layout's height. Phones held sideways (any window wider than tall and
  at most 500px high, or a foldable's wide inner screen: Foldables below) get the landscape layout: keypad on the right, the rest on the left (`fitLandscape`,
  `html.landscape` in styles.css). Sideways the keys are the biggest that fit (a halving search, tools up to 84px), so every
  tab's keys are the same size even when the left side is the taller one, and once everything fits the card is stretched
  to the bottom (`html.land-fill`), so there is no empty strip below. On a very short screen (an iPhone SE in Safari, 667×330) `fitLandscape` first tightens the tools (`fit-tight`: less padding, a smaller ? row) before letting the page scroll. Fuel and Energy
  share one row sideways like the kinds (`kind-grid`, `--f:3/4`; Transfer's row gives Size, Speed and Time more room than Overhead %, `.xf-grid`); a label that doesn't fit its one line switches to its short
  form (`FIELD_SHORT`, `fitShortLabels`, run by `fitLayout`). `sideways_every_tab` in the tests checks every tab at 667×330
  and 814×409: no scrolling, nothing off screen, no cut label, the same key size. iOS reports a turned phone's new size late, after
  'resize': a ResizeObserver on the page fires 'resize' again when the width really changes (layout.js), and one on the
  tabs re-measures their bar (ui.js). The app is not
  locked to portrait (iPhones can't be), so both must work.
- **The buttons at the top** (Install, All modes, language, theme): hover and a pressed look (`.pressed` from `setupTopPress`,
  ui.js, held at least 110 ms so a quick tap shows), and lit with the accent while their menu or window is open
  (`aria-expanded`, `#themeButton.open` while the own theme editor is open); styles at the end of styles.css.
  `setupTopPress` also gives the f(x) and M chips on the display (`.sci-bar button`) the same `.pressed` look and a hover.
  The scientific keys need their own hover rule (`.key.sci-key:hover`, after their colour, which would win over `.key:hover`).
- **All modes** (modes.js): the ⊞ button at the top beside the language button (`#modesButton`, `.icon-button` like EN and the theme button; so the tab row starts with History and the tabs; the title shrinks to fit beside it, `fitBrand`) opens a sheet (`#modesModal`, `openModes`) with
  every mode in groups (`MODE_GROUPS`) and a search (`modeMatches`: names in both languages plus `MODE_WORDS`, word
  starts, accents and capitals ignored; Enter opens the first; Ctrl+K / ⌘K opens it, Esc closes, a press outside closes).
  The strip shows only the pinned modes (`pinnedModes`, `uc-pins`, default Calculator, Units, Currency, VAT; the pin on
  each tile) in `MODE_LABELS` order, plus the mode on screen while it isn't pinned (`.unpinned`, dashed). When they don't
  all fit, the tabs not on screen show only their icon (`.mode-tabs.icons`; names in aria-label/title). A new mode: also
  a group in `MODE_GROUPS` and words in `MODE_WORDS`. On phones the search isn't focused (no keyboard popping up); long
  names shrink a little (`fitModeNames`, to 11px, then a little tighter down to 10px), never "…".
  The header has an **All | Default | None** switch (`#modesPins`, `PIN_SETS`, `savePins`): it pins every mode, the starting four, or none; the matching choice is lit
  (`pinSetNow`), none when pinned by hand. When the title and the switch don't fit on one line (Greek on a phone) the
  switch moves to its own full-width line under the title (`fitModesHead`, `.seg-below`). The mode on screen is marked
  with a soft accent fill (`.mode-tile.on`), not an outline (an outline looks like keyboard focus).
- **Modes are tabs:** a strip of tabs at the top of the card (`MODE_LABELS`, `renderModeTabs`, `switchMode`), one tap
  each, scrolling sideways when they don't fit; Alt+1…9 on a keyboard (Energy, Subnet, Programmer, Numbers, Equations and Statistics, the last six, have none). When they don't all fit, a slim bar under them
  (`.tabs-scrollbar`, `syncTabEdges`, `flashTabsBar`) shows while they move and briefly on start; it can be dragged
  or pressed (`setupTabsBar`), spans the whole strip; with a mouse it shows while the mouse is over the tabs or its strip and
  fades out shortly after (the tabs can be mouse-dragged too). Phones keep their overscroll bounce; past an end (negative/over-max `scrollLeft`, or `tabsPull` measured from
  touch for Android's stretch) the thumb shrinks against that end; and with a mouse
  ‹ › buttons appear on hover at the edges that have more tabs. Add a new mode to `MODE_LABELS`, `ICONS`
  and `MODE_TRANSLATIONS`. Units is its own tab after Calculator. Going Calculator -> Units moves the calculator's
  number into the Units value last typed in (`unitSource`) and resets the calculator; nothing moves back.
- **iPhone home-screen app:** iOS draws a soft blur under the status bar over the page, which made the title look
  blurred. The `<head>` script sets `html.ios-app` when `navigator.standalone` (Apple's own), and held upright the page
  starts 28px below the safe area (styles.css). Can't be seen in desktop browsers; the tests fake `navigator.standalone`.
- **Side panels** (side.js): when there is room for a 260–300px panel on each side of the card
  (a 1280px-wide window and up; never in the sideways layout or when the page scrolls), `html.side-panels` shows this mode's
  History on the left (`historyRowsHtml`, the same list and `historyClick` as the sheet) and on the right the working
  (`howHtml`; Units `unitsHow`; Graph `graphPointsHtml`) with a tool's chart under it (`toolChartHtml(false)`,
  `drawToolChart(box)`: the dialog's chart parts keep their ids, the panel's have classes only). They are `position:fixed`
  level with the card (`--side-l/r/top/h/w`) and as tall as it (`height:var(--side-h)`, the list scrolls inside): no
  boxes, the page's colour, a thin line (`--border`) on the calculator's side, like the frameless keypad. The title bar
  stays over the calculator's column. Anything that changes the screen calls `refreshSide()` (once per frame; the
  calculator's `render`, `renderToolDisplay`, `updateUnitsDisplay`, Graph's points, History, `fitLayout`, language, theme).
  With the panels showing, the History, ? and chart buttons are hidden (`html.side-panels #historyButton…`
  in styles.css) and the History sheet's `#historyClearWrap` (chart button, Clear all) and `#historyChartWrap` move into the
  History panel's header (`sideTools`, the same elements, back to the sheet when the panels go); `syncHistoryChart` hides the
  chart outside the Calculator.
  In tests, scope selectors to the dialog or sheet (`#howContent …`, `#historyList …`): the panels have the same classes.
- **Foldables:** `LANDSCAPE` (layout.js) also matches a touch screen at least 6:5 wide and at most 720px high (a foldable's inner
  screen held sideways, e.g. iPhone Duo ~924×693, Galaxy Fold, Pixel Fold); there the sideways keys may grow to 96px
  (`tall` in `fitLandscape`). Half open like a book, the browser reports two screen segments side by side
  (`window.viewport.segments`, Chrome on Android; Safari has no such API yet): `html.hinge-v` forces the sideways layout
  across the whole width with the column gap over the fold (`--hinge-w`). The tests emulate a fold with CDP
  (`Emulation.setDeviceMetricsOverride` + `displayFeature`; a Playwright screenshot resets it). Not done: half open like a
  laptop (segments one above the other).
- **Big screens:** on large desktop screens the whole app is scaled with CSS `zoom` on `<html>` (`applyUiZoom`,
  `window.__uiZoom`, CSS var `--z`). Viewport units must be written `calc(100dvh / var(--z,1))`, and any code that
  turns screen coordinates (clientX/Y, getBoundingClientRect, innerHeight) into CSS sizes must divide by
  `window.__uiZoom` (see `chZoom` in charts.js, `Z` in history.js).
- **Dropdowns:** on desktop Chrome/Edge the unit menus (Units, Currency, Transfer's units) use `appearance: base-select`,
  styled like the app; phones keep native pickers. While a dropdown has focus the global keydown handler leaves keys to it.
  Transfer's selects have clear text and lie over the unit shown (tools.md): their general rule sets `appearance:none`, so
  the base-select rule for them needs the higher specificity it has; their menus have group titles (`optgroup`).
- **Pressing keys** (`setupPressFeedback`, ui.js), the same with a mouse and a finger, like the iPhone's calculator:
  every key in `#keypad` lights up the moment it's pressed (`.pressed`, a `::after` layer of `--text`, so it suits every
  key colour and theme), held a moment longer it grows (after .09s, easing out over .3s, to scale 1.12, over its neighbours, `will-change`
  set as it's pressed so the move starts smoothly; a quick tap only lights up), and let go it
  fades and settles back. No `:active` shrink anywhere on the keypad. On phones a tick: Android (any touch screen but iPhone)
  one light `navigator.vibrate(KEY_TICK_MS)` (1 ms: the web can't set strength, a longer pulse buzzed hard and felt like two
  knocks on a Pixel 9a; never two ticks within 80 ms) on touchstart, once per press, and the key is pressed when the finger
  lets go (`setupTouchRelease`): touchend is cancelled and the key gets its click from there if the finger is still on it
  (moved over 24 px or off the key: no press). Android sends no click after a long press, so a held key did nothing
  otherwise; the long-press context menu (and its buzz) is blocked. A hold key that fired ticks once more (2 ms) and its
  release does nothing. iPhone has no vibrate for websites; its own switch (`<input type="checkbox" switch>`, iOS 18+) ticks, but
  since iOS 26.5 only when a finger toggles it (a script's `label.click()` is silent). So on iPhone every key holds an
  invisible `<label class="key-tick">` over its face with a hidden switch inside (`addKeyTicks`, kept on re-drawn and
  re-labelled keys by a MutationObserver): the tap lands on the label, which toggles its switch (the tick), and the same
  click goes on to the keypad as the key press (the switch's own click is stopped). Apple doesn't document it; if it
  stops, nothing breaks. No sounds. `selectstart` is blocked outside fields you can type in (`SELECTABLE`): a fast double tap or a long press on iOS
  otherwise starts a selection and shows the magnifier bubble. The key-tick switches and read-only fields (phones) are
  inputs too, so they are excluded in both the handler and the CSS (`user-select:none`); `no_magnifier` tests it.
