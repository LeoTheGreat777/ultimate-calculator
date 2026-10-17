# Layout, tabs and devices

Part of the notes in CLAUDE.md (read that first). Covers layout.js, side.js, modes.js, ui.js, styles.css.

- **Long text:** `fitDisplayText(el,minSize,showEnd)` shrinks text to minSize, then scrolls it: a result shows its
  start, a calculation (typed or above a result) its end; the cut-off side fades (`fade-start`/`fade-end`). Used for the result and
  expression lines, Units values, tool fields and Subnet's details. A fitted element is watched (`fitWatch`, a
  ResizeObserver): when its own width changes it is fitted again, so turning the phone never leaves a number sized for
  the old width (iOS reports the new width late, after the resize event).
- **Fitting the screen:** `fitLayout()` sizes keys (`--k`) and the display (`--disp`) to the screen in every
  mode, and switches the tools to their compact layout when needed; only if nothing fits does the page scroll
  (`html.page-scroll`). Small phones upright (320×568, 360×640, an iPhone SE in Safari 375×553): when the normal limits
  don't fit, `fitLayout` tries tighter ones (`FIT.tight`): tools get less padding and a smaller result (`fit-tight`), the footer
  goes on one line (`html.fit-small`), display and keys get smaller (keys down to 32px), then a kind's fields share one row
  with short labels (`fit-row`), then Equations' form line and Subnet's and Statistics' details go (`fit-no-form`, `fit-no-details`; ? shows
  them). If even that doesn't fit (Scientific at 320×568) it goes back to the normal sizes and the page scrolls.
  `upright_small_phones` in the tests checks every tab there. Field labels count as cut by exact width (`labelCut`). Don't add fixed pixel heights per screen size or device; let `fitLayout` handle it,
  and call it after anything that changes the layout's height. Phones held sideways (any window wider than tall and
  at most 500px high, or a foldable's wide inner screen: Foldables below) get the landscape layout: keypad on the right, the rest on the left (`fitLandscape`,
  `html.landscape` in styles.css). Sideways the keys are the biggest that fit (a halving search, tools up to 84px), so every
  tab's keys are the same size even when the left side is the taller one, and once everything fits the card is stretched
  to the bottom (`html.land-fill`), so there is no empty strip below. On a very short screen (an iPhone SE in Safari, 667×330) `fitLandscape` first hides the copy
  button, then tightens the tools (`fit-tight`: less padding, a smaller ? row) before letting the page scroll. Fuel and Energy
  share one row sideways like the kinds (`kind-grid`, `--f:3/4`); a label that doesn't fit its one line switches to its short
  form (`FIELD_SHORT`, `fitShortLabels`, run by `fitLayout`). `sideways_every_tab` in the tests checks every tab at 667×330
  and 814×409: no scrolling, nothing off screen, no cut label, the same key size. iOS reports a turned phone's new size late, after
  'resize': a ResizeObserver on the page fires 'resize' again when the width really changes (layout.js), and one on the
  tabs re-measures their bar (ui.js). The app is not
  locked to portrait (iPhones can't be), so both must work.
- **All modes** (modes.js): the ⊞ button beside History (`#modesButton`) opens a sheet (`#modesModal`, `openModes`) with
  every mode in groups (`MODE_GROUPS`) and a search (`modeMatches`: names in both languages plus `MODE_WORDS`, word
  starts, accents and capitals ignored; Enter opens the first; Ctrl+K / ⌘K opens it, Esc closes, a press outside closes).
  The strip shows only the pinned modes (`pinnedModes`, `uc-pins`, default Calculator, Units, Currency, VAT; the pin on
  each tile) in `MODE_LABELS` order, plus the mode on screen while it isn't pinned (`.unpinned`, dashed). When they don't
  all fit, the tabs not on screen show only their icon (`.mode-tabs.icons`; names in aria-label/title). A new mode: also
  a group in `MODE_GROUPS` and words in `MODE_WORDS`. On phones the search isn't focused (no keyboard popping up); long
  names shrink a little (`fitModeNames`), never "…".
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
- **Side panels** (side.js, option A chosen by the owner): when there is room for a 260–300px panel on each side of the card
  (a 1280px-wide window and up; never in the sideways layout or when the page scrolls), `html.side-panels` shows this mode's
  History on the left (`historyRowsHtml`, the same list and `historyClick` as the sheet) and on the right the working
  (`howHtml`; Units `unitsHow`; Graph `graphPointsHtml`) with a tool's chart under it (`toolChartHtml(false)`,
  `drawToolChart(box)`: the dialog's chart parts keep their ids, the panel's have classes only). They are `position:fixed`
  level with the card (`--side-l/r/top/h/w`). Anything that changes the screen calls `refreshSide()` (once per frame; the
  calculator's `render`, `renderToolDisplay`, `updateUnitsDisplay`, Graph's points, History, `fitLayout`, language, theme).
  With the panels showing (the owner chose this), the History, ? and chart buttons are hidden (`html.side-panels #historyButton…`
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
  stops, nothing breaks. No sounds (the owner said no). `selectstart` is blocked outside fields you can type in (`SELECTABLE`): a fast double tap or a long press on iOS
  otherwise starts a selection and shows the magnifier bubble. The key-tick switches and read-only fields (phones) are
  inputs too, so they are excluded in both the handler and the CSS (`user-select:none`); `no_magnifier` tests it.
