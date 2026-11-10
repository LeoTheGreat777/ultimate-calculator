# Calculator: the maths and the keys

Part of the notes in CLAUDE.md (read that first). Covers numbers.js, calculator.js, complex.js, explain.js, memory.js, funcs.js.

- **Exact math:** the calculator uses fractions (`rat`, `ratAdd`, ... with BigInt), never floats.
  `evalExpr` parses with operator precedence; `50+10%` = 55, `50×10%` = 5. Results show rounded to
  6 decimals and at most 16 significant digits (`formatRat`); from 10¹⁶ up, and for values that would round to 0,
  `1,234567 × 10²⁰` (`ratScientific`, superscript exponent). The same in Units, tools (`money`) and charts (`chNum`).
  The Calculator's finished result shows up to 10 decimals when they fit at 70% of the display's font size or more
  (`#result` data-long / data-short, picked by `fitDisplayText`, again when the width changes), like the iPhone: 1 ÷ 7 =
  0,1428571429; copying copies what is shown, and carrying on shows it the same way (`shownResult`, `carry.plain` for ⌫).
  History keeps 6. The working (?) shows real numbers with up to 10 decimals (`HOW_DECIMALS`, `ratShown`, `howResult`;
  e + 5 = 7,7182818285 as on the display), complex parts keep 6 like the display; Units' working shows
  numbers like the converted value (`formatUnitResult`). A Result over 18 characters gets `.longer` (smaller) to fit a phone.
  Numbers the 6-decimal form writes with a power of ten keep it (`formatRatLong`, display and working: 3,33715 × 10⁻¹⁰,
  not 0,0000000003). The working's first step says what each symbol is worth (`symbolsStep`: e, π, φ with their
  names, i = √(−1), physical constants with unit and name), each once, in the order typed. Tests read the result after its frame, or accept either form.
- **Limits** (numbers.js, as on Windows' calculator): typed numbers have at most 15 digits (`MAX_DIGITS`, `digitCount`)
  in every mode, a calculation at most 150 characters (`MAX_INPUT`; Graph functions 120), and every step of a
  calculation must stay below 10¹⁰⁰⁰⁰ and (unless 0) above 10⁻¹⁰⁰⁰⁰ (`ratLimit`), else "Too large"/"Too small".
  That also keeps everything fast: exact powers only up to 40000 bits, beyond that logarithms (`ratPowApprox`).
  A key that can't do more calls `refuseKey()` (a small shake, a short vibration) and does nothing.
- **Errors:** `calcError` ('DIV0', 'BIG', 'SMALL', 'MATH'; texts `errDiv0`… via `ERROR_TEXT`) shows the reason in place
  of the result with the calculation above it, until the next key, which goes on from the calculation (AC clears).
  Units shows the reason on the other value (`unitError`). Never put "Error" into `current`.
- **Carry:** continuing after a result uses its full-precision value (`carryText`, `carry`), but the
  screen shows it rounded via `formatExpressionDisplay`. Use that function to display expressions.
- **Brackets:** useless ones are dropped (`tidyParens`, `closeParen`): `((5))` -> `5`, open ones at the end
  are dropped on =. A number or `(` after `)`, and a number after `%`, adds `×` first. Same in Units.
  With no bracket open, `)` (Scientific, keyboard) and the basic pad's ( ) after a calculation put brackets around
  everything before the cursor: 5+5 -> (5+5) (`wrapAll`; only when an operator stands outside brackets, `topOperator`, so after
  a single value ( ) still opens one, 5 -> 5×(). Same in Units.
- **C / AC:** the key shows C while anything is typed (5, 5+, 5+5), AC with nothing typed, after a result or an error.
  C clears the number being typed (with the cursor in a number, the whole number); with none (5+), everything. Same in
  Units (`unitTyped` for the label, `unitEntry` for what C clears). Delete = C, Esc = AC on a keyboard.
- **The cursor** (`caretTail`, `caretOn`): a tap on the calculation being typed (`caretFromPoint`, the nearest of
  `caretStops`) or ← → Home End (`moveCaret`) puts a cursor in it (`.caret`, kept in view by `fitDisplayText`). What is before
  it stays `expression` + `current`, so every key works there as at the end; what is after it is `caretTail`, and
  `typedText()` is the whole calculation (use it, not expression+current, for anything that reads what is typed). Where the
  two meet, a × goes between two values (2 before (5+5) -> 2×(5+5)) and an operator typed before another replaces it;
  `caretTo` makes that real when the cursor moves. It never stands inside a function's name, a constant, a power's digits or
  a carried result; a digit right after a carried result edits it as shown (`carry.plain`). = works out everything and drops
  the cursor, as do AC and a result; it also hides when it goes back to the end (a tap at the end, End, → to the end:
  `caretTo` sets `caretOn` only before the end). The display marks the cursor with `CARET` (U+0007), which `formatInputDisplay` keeps in
  place (grouping stays right: 1.2|34.567).
- **Scientific:** a view of the Calculator, not a mode: the f(x) switch on the display (`sciMode`, `uc-sci`; the only chip
  there, the angle unit is the keypad's Deg/Rad key; at the display's top-left in line with History, styled like ?, and
  Dates' Working days chip sits in the same place) adds the
  five memory keys and 24 more in six columns above the basic ones (`sciKeysHtml`, `.keypad.sci`, the memory keys in `.mem-row`; labels size with
  the pad's width, `cqw`, and labels over 4 characters get `.long`, so sinh⁻¹ fits a 320px phone). Sideways they stand beside the basic keys
  in five rows: memory the first column, the rest placed by `SCI_LAND` (`--lr`/`--lc`; ⋯ two columns wide).
  Rows: 2nd Deg sin cos tan hyp · x² xʸ √x ln log log₂ · ( ) 1/x x! π e · EE nCr mod i ∠ ⋯. In Scientific the basic pad's
  ( ) key is ± (`negate`), as ( and ) are keys there; ) with nothing open is refused. Rand (2nd on ∠) types a number from 0 to 1 with up to
  10 decimals like MR (it replaces a number being typed; after a value it adds ×). log₂ is a function (`log₂(`), exact for powers of 2. Functions apply to the value
  just typed / the result / the bracket just closed (`sciKey`, `lastValueStart`), else open `sin(`. x², xʸ, ʸ√x and x! take the whole value, so a negative one or a power gets brackets: (−3)², (9²)². 2nd swaps keys
  for inverses (x³ ʸ√x ∛x eˣ 10ˣ 2ˣ); Deg/Rad is `angleUnit` (`uc-angle`). The engine (numbers.js: `evalExpr`, `ratPow`, `sciFunction`)
  stays exact where the answer is exact and rounds floats to 15 digits otherwise. Shown with superscripts and sin⁻¹
  (`sciPretty`). Keyboard: ^ and !.
  A fourth row: **hyp** (`sciHyp`: sin cos tan become sinh cosh tanh, 2nd their inverses), **nCr** (2nd nPr), **mod** (2nd |x|), **i**, **∠** (2nd Rand; it needs a size before it, else `refuseKey`, like x², xʸ, x!)
  and **⋯** (φ is there, with π and e) (funcs.js: every function, cot sec csc and the hyperbolic ones with inverses, abs, and the constants, with a search).
  Key labels are the same in Greek and English, as on calculators (hyp, 2nd, Deg/Rad, EE and sin cos tan, no ημ συν εφ);
  `sciAria` says in words what each key does, in the language (trig names from `FN_TITLE`, explain.js).
  Functions are `FN_NAMES` (numbers.js, longest first; `FN_ALT`, `FN_END`, `FN_OPEN_END` build the regexes, so a new one is added
  in one place). nCr, nPr and mod are one-letter operators in the calculation: `C`, `P` (above × ÷, like Casio) and `m` (at × ÷;
  shown " mod "); `OP_END`/`OP_OPEN_END` know them, `VALUE_END` knows φ and constants. Constants (`CONSTS`, CODATA 2018, the
  exact ones in `CONST_EXACT`) are `⟨id⟩` in the calculation and their symbol on screen (`constPretty`); ⌫ removes one whole.
- **± and holding keys:** holding ⌫, C or AC clears everything while still held (`HOLD_KEYS`, `clearEverything`; C turns into AC
  while still held and big, like the iPhone's calculator; in the tools C stays C, AC is its own key; in Graph every function), holding − flips the sign (`negate`, Units: `unitKeyInput('negate')`);
  F9 or Shift + − (`_`) does ± on a keyboard. A tap on − is always minus. A minus made with ± is stored as `−` (U+2212), one typed with
  the − key as `-`; the maths reads both the same (`tokenize`, `normalizeUnitExpression`). Display (`formatInputDisplay`):
  after an operator any negative number is in brackets, `5×(−25)`; at the start only a ± one is, `(−5)`, a typed one
  stays `-5`. A result turned negative with ± carries on as `(−84)+2` (`resultNegated`). Finished results stay plain.
  Units has the same keypad as the calculator, including ( ).
- **The working (?)** (explain.js): a tool's `how` is `{formula, steps:[{title, text, line?, bits?}], result, legend?, rule?}`, drawn by
  `howHtml`. The Calculator's comes from `explanationForExpression`, which recomputes every step with the same exact maths and
  returns null (no ?) rather than working that doesn't end in the result on screen, and with no steps (25 − 25i alone) ? is hidden; a rounded number in it ends in …
  (`ratShown`). Worked-out numbers keep the plain - like results; powers are superscripts (`supText`); trig steps say
  degrees or radians. Units/Currency compute theirs when ? is pressed (`unitsHow`, the `#unitHow` button in their toolbar).
  Arrows shown in text get U+FE0E (→\uFE0E), or iOS may draw them as emoji. On phones the dialog may use the whole height.
- **Complex numbers** (complex.js): a value is a fraction when real, `{re, im}` (im ≠ 0) when not; `cx()` turns one with im 0
  back into a fraction, so real calculations never see the difference. `evalExpr` uses `vAdd`, `vMul`, `vPow`,
  `sciFunctionV`… (exact + − × ÷ and whole powers; floats rounded to 15 digits for the rest, a part under 1e−13 of the size
  is 0). √, even roots and ln/log of a negative number are complex (√−4 = 2i); other real domain errors stay errors. `i` is a
  number in the calculation (`2×i` shows as 2i), `∠` an operator as tight as ^ (r∠θ, θ in the angle unit). In degrees sin and cos of a non-quarter angle come from one
  quarter turn (`degSinCos`: sin x = cos(90° − x) is the same number), so sin 45° − cos 45° = 0 and (5 + 5i) × 1∠45 = 7,071068i exactly
  on screen, not 5 × 10⁻¹⁵ + 7,071068i. A complex result
  carried on is `⟪⟫` (`carryCx`; shown without spaces like a typed one, `(5+5i)×2`; History stores it written out, `expandCarry`); History and memory keep `re|im` strings
  (`vToStore`/`vFromStore`). `fmt` shows complex values as a+bi; the Calculator shows r∠θ under it at the same time, no button
  (`renderResultAlt`, `#resultAlt`, `.has-alt` makes the result a little smaller): under a complex result, and while a
  calculation with i, ∠ or a carried complex is typed its value as it stands (`liveValue`; "= 5 − i  ·  5,09902 ∠ …", the
  a+bi part left out when it is what was typed). Real calculations never get the line; other modes remove it (`renderTool`).
  Room for it on short phones (Pixel 9a in Scientific): Scientific's display never goes below 116px (94px on the smallest
  phones, `FIT.sci`/`FIT.tight.sci`; `compact` there turns on the compact sizes too), and in a compact display a finished
  complex result gets a lower calculation row (28px) and its size is capped by the display's height (`container-type:size`,
  `100cqh`), so the result and the line never overlap.
  The working ends a complex result with its polar form (r = √(a² + b²), θ = atan2(b; a)). Mod, nCr, nPr and ! of a complex number are errors. The working folds 2 × i and 3 + 2i into written numbers.
- **Memory** (memory.js): one exact number (`memory`, saved in `uc-memory`). The number
  on screen (`memScreenValue`) is the result, else the number being typed, else what is typed so far. MR types the memory as a
  number of up to 15 significant digits (very large/small ones as `(1.2×10^20)`); after any memory key the next digit starts
  a new number (`memFresh`). The keys are the first row of the scientific keys (`memKeysHtml`, `.mem-key`, `data-mem`;
  Scientific only, like the iPhone): the basic keypad has none, sideways they are the first column. The M chip
  sits in `#sciBar` beside f(x) whenever something is kept, and the keyboard works either way: Ctrl+M MS, Ctrl+P M+,
  Ctrl+Q M−, Ctrl+R MR, Ctrl+L MC (`memKeydown`).
- **Copy and Paste** (clip.js; there is no copy button): pressing and holding a number (480 ms, `CLIP_HOLD`) or
  right-clicking it opens a small menu with Copy and Paste (`openClipMenu`, `#clipMenu`, above the finger; a press
  outside or Esc closes it, and the click that ends the hold does nothing else, so it never moves the cursor). Where:
  the Calculator's display, Units' two values, a tool's result, and tool fields that are read-only (touch screens; on a
  computer a field is a text box and keeps the browser's own menu) (`clipTarget`). Copy takes what the screen shows
  (`copyValue`: the result, the calculation being typed, Units' converted value, a tool's result); a tap on a finished
  result still copies it. Paste (`navigator.clipboard.readText`; hidden where the browser has none) reads one number
  written in any common way (`readPastedNumber` in numbers.js: 1.234,56, 1,234.56, € 12, −3,5, (1.000) negative; one
  comma is a decimal comma, one dot a thousands dot only in 1.234) and types it through the keys, so every limit holds
  (15 digits, a field's top): in the Calculator it replaces the number being typed or starts the next one
  (`pasteCalc`), in Units it becomes the value converted from (`pasteUnits`), in a field it replaces the value as a
  keyboard paste would (`pasteIntoField`; Programmer and IP fields take the text as it is, Statistics several numbers).
  Text that isn't a number is refused (`refuseKey`). Ctrl+C / Ctrl+V do the same when no text box is in use (the
  `copy`/`paste` events). Without the Clipboard API (http) Copy uses a hidden text box.
