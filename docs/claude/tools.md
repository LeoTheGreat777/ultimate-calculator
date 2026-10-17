# Tools, Units and Currency

Part of the notes in CLAUDE.md (read that first). Covers tools.js, units.js, currency.js, dates.js, numtools.js, net.js, history.js, the tool charts in charts.js.

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
  Numbers (numtools.js; kinds `gcd`: a, b, c optional; `factors`: n) works on whole numbers with BigInt ('count' fields, up to
  15 digits): GCD and LCM through the prime factorisations, the factors by trial division to 100000 and then Pollard's rho
  with a Miller–Rabin test, the divisors' count and sum. Equations (kinds `quad`: a, b, c, an empty one counts as 0, a = 0
  is the linear case; `sys2`: a₁ b₁ c₁ / a₂ b₂ c₂) are exact fractions: Δ exact, √Δ simplified in the working (x = −1 ± √2),
  complex roots as a + bi (complex.js); a system with D = 0 has no or infinitely many solutions. The form line above the
  fields (`eqForm`) goes on a very short sideways screen (`fit-no-form`); sideways the system's six fields share one row.
  Their keypad has ± beside 0.
- **Switches** (VAT add/remove, the kinds of Percent, Interest and Dates) are one generic segmented control: `TOGGLES`, `toggleHtml`,
  `renderToggles`, `setupToggleSlide` (tap, drag, swipe, ← →), `.seg-toggle` in styles.css (`--n` options, `--i` chosen).
- **Changing mode clears the mode you leave** (`resetModeInput`, called by `switchMode`): numbers typed and results
  go, in every mode (Percent, Interest, Dates: also changing kind; Graph goes back to `graphDefault`). Only Calculator -> Units carries
  the number. Kept: choices (units picked, VAT add/remove, the kinds, Deg/Rad, f(x)), History. Typed values are
  not saved across visits; `saveTools`/`loadTools` keep only those choices. AC clears a tool.
- **History per mode** (history.js): the Calculator keeps its calculations in `uc-history` (its chart too); every other mode
  keeps its own in `uc-history-modes` ({tab: entries}, 50 each): a tool's kind, choices and fields with its line in both
  languages (`modeSnapshot` runs the tool once per language), Units'/Currency's category, units and values, Graph's
  functions. Tools have no =, so `recordModeHistory` saves what is finished when you leave the mode, press AC/Esc, change
  kind, copy the result, or the app goes to the background (also = in Units, AC in Graph); the same one twice is kept
  once. The sheet shows the mode on screen (`History · VAT`); tapping an entry brings its numbers back
  (`restoreModeEntry`), Delete all empties that mode only. A new mode: make `modeSnapshot`/`restoreModeEntry` know it.
- **Number fields** (every tool field but dates and IP/mask, `groupedField`) show thousands as they are typed: 10000 ->
  10.000 (`groupDigits` in the `input` handler, the cursor kept in place). In them a dot is always a thousands dot and the
  comma the decimal, so read a field with `fieldValue(id)` (the text without dots), never `.value`; `liveToolNumber` and
  `ratField` already do. A paste may use dots either way (`pastedNumber`: 12.5 is a decimal, 1.234 and 1.234,5 thousands).
  Backspace/Delete next to a dot removes the digit beyond it. **Limits:** `FIELD_MAX` gives some fields a top (rates
  50%, discount and tip 100%, hours 24, years 100, L/100 km 100, days 36500): a key past it is refused and the label
  says "Up to 50%" for a moment (`refuseLimit`). `POSITIVE_FIELDS` refuse − (prices, rates, distances…; VAT's amount
  and % change's values may be negative).
- **Tool fields on a computer** edit like text boxes: a focused field keeps the browser's own Backspace, Delete and
  cursor (selection respected); the global handler only takes over when no field has the focus (keys go to the
  highlighted field, at the end). Comma and − are still the app's (one comma; − changes the sign).
- **Currency** is the Units mode with `unitView==='currency'` (core.js): tab id `currency`, `mode` stays `'units'`;
  `currentTab()` gives the tab on screen (tabs, Tips use it), `switchMode('currency')` sets the view. The category menu
  is hidden (Units' own menu leaves `currency` out) and `#rateInfo` shows the pair's rate and the rates' date; tap
  to update. Rates (currency.js): ECB reference rates per euro from `https://api.frankfurter.dev/v1/latest` (CORS),
  fetched at most hourly in the background (on start, and with `checkForUpdate` whenever the app comes back to the
  screen: `backOnScreen` in main.js) and on entering the tab; saved in `uc-rates`; `RATES_SNAPSHOT` before
  the first fetch (update it now and then). The rate line says "offline" by itself when the last fetch failed or the
  device has no connection (`ratesOffline`, `online`/`offline` events; back online it fetches again). Strings, converted with fractions (`currencyRate`). Values show as money
  (`formatMoneyValue`: 2 decimals, more under 1); on phones the closed menus show only the code. Tests stub the URL.
- **Tool charts** (the bars button, `showToolChart`/`drawToolChart` in charts.js) answer a question rather than redraw
  the result, mostly as HTML so numbers stay sharp: Fuel a 3×3 grid of the cost at ±0,10 €/L and ±0,5 L/100 km (the
  middle is the result) plus return trip and per 100 km; VAT the same amount at 24, 13 and 6% (and the rate typed);
  Energy cost and kWh per hour, day, month, year (the days typed highlighted); a loan or payoff year by year
  (`loanYears`: interest per year, rounded so the years add up to the result's interest, and what's left). Bar rows
  are `chRows` (`.chart-body` grid, `.crow`). Savings keeps its canvas line chart (`chLineChart`).
- **No fuel log:** the save/saved-entries buttons in Fuel were removed on purpose (0.15.5); don't add them back.
