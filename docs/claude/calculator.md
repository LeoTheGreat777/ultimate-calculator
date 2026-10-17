# Calculator: the maths and the keys

Part of the notes in CLAUDE.md (read that first). Covers numbers.js, calculator.js, complex.js, explain.js, memory.js, funcs.js.

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
- **Carry:** continuing after a result uses its full-precision value (`carryText`, `carry`), but the
  screen shows it rounded via `formatExpressionDisplay`. Use that function to display expressions.
- **Brackets:** useless ones are dropped (`tidyParens`, `closeParen`): `((5))` -> `5`, open ones at the end
  are dropped on =. A number or `(` after `)`, and a number after `%`, adds `×` first. Same in Units.
- **C / AC:** the key shows C while a number is being typed (C clears just that number), otherwise AC
  (clears everything). Same in Units (`unitEntry`). Delete = C, Esc = AC on a keyboard.
- **Scientific:** a view of the Calculator, not a mode: the f(x) switch on the display (`sciMode`, `uc-sci`; the only chip
  there, the angle unit is the keypad's Deg/Rad key; at the display's top-left in line with History, styled like ?, and
  Dates' Working days chip sits in the same place) adds 25
  keys above the basic ones (beside them in landscape, five columns whose labels size with the keys; `sciKeysHtml`, `.keypad.sci`). Functions apply to the value
  just typed / the result / the bracket just closed (`sciKey`, `lastValueStart`), else open `sin(`. x², xʸ, ʸ√x and x! take the whole value, so a negative one or a power gets brackets: (−3)², (9²)². 2nd swaps keys
  for inverses; Deg/Rad is `angleUnit` (`uc-angle`). The engine (numbers.js: `evalExpr`, `ratPow`, `sciFunction`)
  stays exact where the answer is exact and rounds floats to 15 digits otherwise. Shown with superscripts and sin⁻¹
  (`sciPretty`). Keyboard: ^ and !.
  A fourth row: **hyp** (`sciHyp`: sin cos tan become sinh cosh tanh, 2nd their inverses), **nCr** (2nd nPr), **mod** (2nd |x|), **i** (2nd ∠)
  and **⋯** (φ is there, with π and e) (funcs.js: every function, cot sec csc and the hyperbolic ones with inverses, abs, and the constants, with a search).
  Functions are `FN_NAMES` (numbers.js, longest first; `FN_ALT`, `FN_END`, `FN_OPEN_END` build the regexes, so a new one is added
  in one place). nCr, nPr and mod are one-letter operators in the calculation: `C`, `P` (above × ÷, like Casio) and `m` (at × ÷;
  shown " mod "); `OP_END`/`OP_OPEN_END` know them, `VALUE_END` knows φ and constants. Constants (`CONSTS`, CODATA 2018, the
  exact ones in `CONST_EXACT`) are `⟨id⟩` in the calculation and their symbol on screen (`constPretty`); ⌫ removes one whole.
- **± and holding keys:** holding ⌫, C or AC clears everything while still held (`HOLD_KEYS`, `clearEverything`; C turns into AC
  while still held and big, like the iPhone's calculator; in the tools C stays C, AC is its own key; in Graph every function), holding − flips the sign (`negate`, Units: `unitKeyInput('negate')`);
  F9 does ± on a keyboard. A tap on − is always minus. A minus made with ± is stored as `−` (U+2212), one typed with
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
  number in the calculation (`2×i` shows as 2i), `∠` an operator as tight as ^ (r∠θ, θ in the angle unit). A complex result
  carried on is `⟪⟫` (`carryCx`; History stores it written out, `expandCarry`); History and memory keep `re|im` strings
  (`vToStore`/`vFromStore`). `fmt` shows complex values as a+bi; the Calculator shows r∠θ under it at the same time, no button (the owner
  asked; `renderResultAlt`, `#resultAlt`, `.has-alt` makes the result a little smaller): under a complex result, and while a
  calculation with i, ∠ or a carried complex is typed its value as it stands (`liveValue`; "= 5 − i  ·  5,09902 ∠ …", the
  a+bi part left out when it is what was typed). Real calculations never get the line; other modes remove it (`renderTool`).
  The working ends a complex result with its polar form (r = √(a² + b²), θ = atan2(b; a)). Mod, nCr, nPr and ! of a complex number are errors. The working folds 2 × i and 3 + 2i into written numbers.
- **Memory** (memory.js; the owner asked for it after first declining): one exact number (`memory`, saved in `uc-memory`). The number
  on screen (`memScreenValue`) is the result, else the number being typed, else what is typed so far. MR types the memory as a
  number of up to 15 significant digits (very large/small ones as `(1.2×10^20)`); after any memory key the next digit starts
  a new number (`memFresh`). The keys are the first row of the scientific keys (`memKeysHtml`, `.mem-key`, `data-mem`;
  Scientific only, like the iPhone): the basic keypad has none, sideways they are the first column. The M chip
  sits in `#sciBar` beside f(x) whenever something is kept, and the keyboard works either way: Ctrl+M MS, Ctrl+P M+,
  Ctrl+Q M−, Ctrl+R MR, Ctrl+L MC (`memKeydown`).
- **Copying:** tapping a finished result copies it (calculator and tools), so the copy button can be hidden
  on short screens.
