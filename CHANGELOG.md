# Changelog

What changed in each version of Ultimate Calculator, newest first.

Versions are `MAJOR.MINOR.PATCH`: a new feature raises the middle number (0.5.0 → 0.6.0), a fix or small
tweak the last one (0.5.0 → 0.5.1). The first number stays 0 until the app is ready for everyone (1.0.0).
Each version lists what was **Added**, **Changed** and **Fixed**, written for the people using the app.

## 0.25.0 – 2026-10-17

### Added
- Statistics mode (under ⊞, More): type numbers one at a time and press Add (or Enter), or paste a whole column.
  It shows the average, median, standard deviation (s for a sample, σ for a whole population), smallest, largest and
  sum; ? shows the working, with the variance, range and mode too. Tap a number in the list to take it out.

## 0.24.7 – 2026-10-17

### Changed
- The app opens faster the first time: its scripts now arrive as one smaller file instead of about 25, and the
  self-hosted (Docker) version sends its files compressed, about a quarter of the size.

## 0.24.6 – 2026-10-17

### Changed
- History's Clear all asks in a smoother way: the button itself turns into a red “Delete all?”, and a second press
  deletes. Nothing moves any more (the long question used to push the list down). A press elsewhere, or 4 seconds, takes it back.

## 0.24.5 – 2026-10-17

### Fixed
- History's Clear all is dimmed when there is nothing to clear, and the chart button when there are fewer than 2
  calculations to draw (in the History sheet and the panel on big screens).

## 0.24.4 – 2026-10-17

### Changed
- On big screens, where History and the working are shown beside the app, the History, ? and chart buttons are gone:
  they only opened the same things again. History's chart and Clear all are now at the top of the History panel.
  Phones and smaller windows keep the buttons.

## 0.24.3 – 2026-10-17

### Changed
- The working panel on big screens and the ? dialog now have the same title, “How was this calculated?” (it said “How it was worked out” in the panel); Tips say “calculated” too.

### Fixed
- The Equations tab's x= icon sat higher than the text; it is now centred like the other tab icons.

## 0.24.2 – 2026-10-17

### Changed
- Complex numbers show in both forms at once, with nothing to press: the result as a + bi and under it the size and
  angle (98 + 25i, and 101,138519 ∠ 14,311041°). It already shows while you type: pressing i shows the polar form
  straight away, and a longer calculation shows its value as it stands (= 5 − i · 5,09902 ∠ −11,31°). The a+bi button
  is gone. The working under ? ends with how the size and angle are found.

### Fixed
- MC and MR sat a little lower than the other memory keys while memory was empty.

## 0.24.1 – 2026-10-17

### Changed
- The memory keys moved into Scientific (f(x)), as their own row of keys above sin, cos and tan (sideways, the first
  column), like on the iPhone. The basic calculator stays clean; the M chip and the Ctrl shortcuts work in both.
- Sideways, the scientific keys' labels now fit on small phones.

### Fixed
- iPhone: a long press or a quick double tap on a key no longer shows the magnifying glass, in any mode.
- ? no longer shows when there is nothing to work out, like a complex number typed on its own (25 − 25i).

## 0.24.0 – 2026-10-16

### Added
- Numbers: the GCD and LCM of two or three numbers, with their prime factors, and the prime factors of one number with
  its divisors and their sum (up to 15 digits: 999.999.794.345.459 = 3.162.277 × 316.227.767).
- Equations: ax² + bx + c = 0 with two real, one double or two complex roots (x² + 2x + 5 = 0 gives −1 ± 2i), the exact
  roots in the working (x = −1 ± √2), and a system of two equations with two unknowns. ± beside 0 for negative numbers.
- Both are under ⊞ (pin them to have them as tabs), with Tips and History like the other modes.

## 0.23.0 – 2026-10-16

### Added
- Complex numbers. The i key (and i on a keyboard) types the imaginary unit: (3 + 2i) × (1 − i) = 5 − i, exactly. With
  2nd it becomes ∠ for polar form: 2∠30 is size 2 at 30°. Every function works on them, √ and ln of negative numbers
  give their complex value (√−4 = 2i, e^(iπ) = −1), and a complex result goes on into the next calculation, into History
  and into memory.
- After a complex result, a+bi beside f(x) switches it to r∠θ (size and angle) and back.
- The working explains them: i² = −1 when multiplying, the conjugate when dividing, and the polar form.

### Changed
- φ moved from its key to ⋯ (with π and e), to make room for i.

## 0.22.0 – 2026-10-16

### Added
- Scientific has a new row: hyp (sinh, cosh, tanh and their inverses), nCr and nPr (combinations, permutations), mod
  (the remainder) and |x|, φ (the golden ratio), and ⋯.
- ⋯ opens every function and constant, with a search: cot, sec, csc and their inverses, the six hyperbolic functions and
  their inverses, and 41 physical constants (speed of light, Planck, Avogadro, Boltzmann, electron mass …, CODATA 2018).
- The working under ? explains them too: 5 C 2 = 5! ÷ (2! × 3!) = 10, 17 mod 5 = 2 (17 = 3 × 5 + 2).

## 0.21.0 – 2026-10-16

### Added
- Memory keys in the Calculator: MS keeps the number on screen, M+ and M− add it or take it away, MR brings it back,
  MC clears it. While something is in memory it shows beside f(x) (tap it to bring it back), and it stays there after
  you close the app. On a computer: Ctrl+M, Ctrl+P, Ctrl+Q, Ctrl+R and Ctrl+L, as in Windows' calculator.

## 0.20.0 – 2026-10-16

### Added
- On a computer screen with room beside the app, History sits on the left and the working on the right, both updating
  as you go: no need to open them. In VAT, Fuel, Energy and Interest the chart is under the working; in Graph, the key
  points.

### Changed
- Foldables: the inner screen of a foldable held sideways (iPhone Duo, Galaxy Fold, Pixel Fold) gets the sideways layout
  with big keys, so no tab needs scrolling. Half open like a book, the fold falls between the display and the keypad.

## 0.19.0 – 2026-10-16

### Changed
- ? explains calculations step by step, the way it's taught: brackets first, then powers, then × ÷, then + −. Each step
  says why ("Multiply first") and shows the calculation again, shorter, with the new number marked.
- Scientific calculations are explained too: sin(30°) = 0,5, 2³ = 2 × 2 × 2, √9 = 3 because 3 × 3 = 9, 5! written out.
- Rounded numbers in the working end in … (1 ÷ 3 = 0,333333…), so the next step doesn't look wrong.
- Subnet: ? shows the bits lined up, the network part and the host part in two colours, and fits on a phone without
  scrolling.
- Interest says what "i" is (the monthly rate); Dates says which weekend days and holidays were skipped.

### Added
- Units and Currency have a ? too: the factor or the rate used (through euros between two other currencies), and how
  temperatures are converted.

## 0.18.1 – 2026-10-16

### Changed
- On a computer screen, ? and Tips show everything without scrolling: Tips put the keyboard shortcuts beside the tips,
  and a long list goes into two columns.
- Holding AC clears everything as soon as it's held, like holding C or ⌫ (the VAT rate goes back to 24%). In Graph,
  holding AC clears every function.

## 0.18.0 – 2026-10-14

### Added
- Every mode has its own History: VAT shows past VAT results, Fuel past trips, Units and Currency past conversions,
  Graph past functions. A result is kept when you leave the mode, press AC or Esc, or copy it; tap one to bring its
  numbers back. The Calculator's History is as before.
- Shortcuts: long-press the app's icon on Android (or on a computer, once installed) to open Currency, VAT, Units or
  Fuel straight away.

### Changed
- The currency rates the app carries for when it can't go online are from 13 October.

## 0.17.2 – 2026-10-14

### Changed
- Esc clears everything in every mode, like the AC key (it already did in Calculator, Units and Graph).

## 0.17.1 – 2026-10-13

### Fixed
- All modes: with a mouse, the whole tile lights up under the pointer, pin included.
- All modes on a computer: long Greek names (Αριθμομηχανή, Ημερομηνίες) are no longer cut.

## 0.17.0 – 2026-10-13

### Added
- All modes: the new button next to History opens every mode, grouped, with a search ("tip", "loan", "καυσ"…).
  On a computer, Ctrl+K opens it.
- Pin the modes you use: the bar at the top shows only your pinned ones (Calculator, Units, Currency and VAT to
  start with), plus the one you're in. When they don't all fit, the others show as icons.

## 0.16.5 – 2026-10-13

### Fixed
- Phone held sideways, in Greek: Energy's "hours a day" label fits on small phones. (0.16.3 and 0.16.4 didn't go
  live because of this; they do now, with this version.)

## 0.16.4 – 2026-10-13

### Changed
- Behind the scenes: test versions can be tried at uc.kampaxis.com/preview/ before they reach the app (marked
  "Preview"). Nothing changes in the app itself.

## 0.16.3 – 2026-10-12

### Fixed
- Phone held sideways:
  - Dates: the details list no longer runs off the right edge, and the public holidays wrap instead of being cut.
  - Fuel and Energy put their fields in one row like the other tools; a label too long for its space gets a shorter one.
  - On small phones (iPhone SE size) every tab fits without scrolling, with keys as big as in the Calculator.

## 0.16.2 – 2026-10-11

### Changed
- The Tips link has a lightbulb instead of a ?.

### Fixed
- Screen readers: keys like + − × ÷ = % and the Graph keys are read by name in Greek and English, the language button
  says which language is on, chart bars are skipped, and "Up to 50%" is read out when a field's limit is reached.

## 0.16.1 – 2026-10-11

### Changed
- Number fields show thousands as you type: 10000 becomes 10.000. Pasted numbers work with dots either way.
- Fields have sensible limits: VAT and interest rates up to 50%, discount and tip up to 100%, up to 24 hours a day,
  100 years and 100 L/100 km. Going past one shakes the field and its label says how far it goes.
- Prices, rates, distances and years can't be made negative.

## 0.16.0 – 2026-10-11

### Changed
- The charts answer more useful questions:
  - Fuel: what the trip costs at a slightly different price or consumption, and the return trip.
  - VAT: the same amount at 24%, 13% and 6%.
  - Energy: cost and kWh per hour, day, month and year.
  - Interest: for a loan, the interest you pay each year and what's left to pay.

## 0.15.5 – 2026-10-11

### Changed
- Fuel no longer has the save and saved-entries buttons; anything saved there is cleared. The chart and ? stay.

## 0.15.4 – 2026-10-11

### Fixed
- The tab icons look the same on every device: on iPhone some (Units, Dates, Interest) were tiny and sat too low.
  Dates now has a calendar icon.
- Colours you were picking for your own theme are no longer lost when the app updates itself or the page reloads.

## 0.15.3 – 2026-10-11

### Added
- Holding C clears everything, like the iPhone's calculator: while you hold it, it turns into AC. (Holding ⌫ still
  does the same.)

### Changed
- A held key now grows smoothly instead of jumping to its bigger size.

## 0.15.2 – 2026-10-11

### Changed
- Holding a key makes it grow sooner, faster and a bit bigger; a quick tap still only lights it up.

## 0.15.1 – 2026-10-11

### Changed
- Keys feel the same on phones and computers, like the iPhone's calculator: they light up when pressed and grow a
  little if you hold them a moment. (Computers no longer shrink the key.)

### Fixed
- iPhone: the small haptic tick on key presses works again on iOS 26.5 and later.

## 0.15.0 – 2026-10-11

### Added
- Keys respond when you press them: they light up the moment you touch them and fade as you let go, on phones and
  computers. Phones also give a small tick (vibration on Android, the system's haptic tick on iPhones with iOS 18 or
  later).

### Fixed
- iPhone: pressing a key twice quickly no longer brings up the magnifier bubble.

## 0.14.8 – 2026-10-11

### Fixed
- Going from Dates to the Calculator left the Working days button on the display, behind f(x).

## 0.14.7 – 2026-10-11

### Changed
- Subnet, phone sideways: the details are two easy-to-read columns, and the keys are as big as in the other tabs.
- Tip has nothing filled in any more: type the bill and the tip %. With no number of people it's for one.
- f(x) is a quieter button in line with the History button, matching the ? on the other side; Dates' Working days
  sits in the same place.

### Fixed
- The bar under the tabs ran across the keys after turning the phone.

## 0.14.6 – 2026-10-11

### Changed
- Scientific: only f(x) sits on the display now; the Deg/Rad key on the keypad already shows and changes the unit.
- Currency says "offline" by itself as soon as there's no connection, without tapping the date, and updates the rates
  when the connection comes back.
- Phones held sideways: the app fills the screen to the bottom in every tab, and Subnet shows its details too
  (on very short screens they stay under ?).

### Fixed
- Subnet: a long mask like 255.255.255.192 was cut off with "…"; it now gets a smaller font.
- Turning the phone could leave a result too big for the space and cut off (192.168.1.0/2…); numbers now re-fit.
- Dates, sideways: the right half was empty before both dates were picked; it now says "Pick two dates."

## 0.14.5 – 2026-10-11

### Fixed
- iPhone, app on the home screen: the title looked blurred, because iOS blurs a strip under the status bar. The app
  now starts just below it.
- The theme button's sun and moon look the same on every device; on iPhone the sun was a yellow emoji and the moon
  in a different style. The arrows on the Units and Interest tabs can't turn into emoji either.

## 0.14.4 – 2026-10-11

### Changed
- **New app icon:** a screen with a graph over the + − = keys, no letters. The small logo next to the title takes
  your theme's colours, your own themes too.
- The browser tab icon is bolder and follows your browser: dark in light mode, light in dark mode.
- On Android phones that colour their icons to match the wallpaper, the app's icon now joins in.
- If you added the app to your home screen before, remove it and add it again to get the new icon there.

## 0.14.3 – 2026-10-11

### Fixed
- The theme menu closed when you pressed its Match device switch, or picked the theme for the other half of the day.
  It now stays open until you tap outside it. The same check is now used for the Dates calendar and History's
  "Delete all?", so they can't close by mistake either.

## 0.14.2 – 2026-10-11

### Changed
- Fewer ready-made themes: Light, Paper, Dark and Black. Rose, Sky, Ocean, Violet, Ember and Forest are gone, since
  your own theme can make any of them. If you used one, it becomes your own theme with the same colours, so nothing
  changes on your screen; you can tweak it with ✎.
- The theme menu is shorter and fits on phones without scrolling.

## 0.14.1 – 2026-10-11

### Changed
- Your own theme: the panel has no Save or Cancel any more. Every change shows at once and is kept; close the panel
  with ×, Esc or a tap anywhere outside it.
- New **Recent** row in the panel with the colour pairs you used last (and the look you started from), to go back
  to one with a tap.
- "Custom…" has a new palette icon; in Greek it reads "Προσαρμοσμένο", and the accent is "Χρώμα έμφασης".
- With a keyboard, ← and → move through a row of colours.

### Fixed
- Picking your own colour closed the colour picker straight away; now you can drag in it and watch the app recolour.

## 0.14.0 – 2026-10-11

### Added
- **Your own themes:** "Custom…" at the end of the light and the dark themes. Pick a background and an accent colour
  (from the swatches or any colour you like) and the whole app recolours as you pick; the app works out the rest and
  keeps everything easy to read. Save it, or change it later with the ✎ next to it.

### Changed
- **Match device** is now a switch at the top of the theme menu. With it on, you choose one light and one dark theme
  (your own ones too) and the app follows your device between them, instead of always Light and Dark. With it off,
  you pick a single theme as before.

## 0.13.1 – 2026-10-11

### Changed
- The currency rates now update in the background whenever the app opens or comes back to the screen while online,
  on any tab (at most once an hour), so the rates kept for offline use are always from your last time in the app.

## 0.13.0 – 2026-10-11

### Added
- **Currency** tab, next to Units: euro, dollar, pound, franc and about 30 more, with the European Central Bank's
  official daily rates. It works like Units: two values, the ⇄ swap, and calculations inside a value. The rate and
  its date show at the top (tap to update). Without internet it uses the last rates it downloaded. Going from the
  Calculator to Currency brings the number along.

### Changed
- Subnet has a new icon (three linked computers). Alt+3 now opens Currency, so Alt+1–9 reaches up to Fuel.

## 0.12.1 – 2026-10-11

### Changed
- Subnet: the dots in an address or mask appear by themselves after three digits, or when the next digit can't fit
  (19216811 becomes 192.168.1.1), instead of the key being refused. Typing the dots yourself still works.

### Fixed
- Greek: "Milliliter" in Units is now "Χιλιοστόλιτρο", and Subnet's first and last host read "Πρώτη IP" / "Τελευταία IP".
- English: a Graph function that can't be read had an empty tooltip.

## 0.12.0 – 2026-10-11

### Added
- **Subnet** tab (IPv4), with two kinds:
  - **Subnet:** an IP address with a prefix (24) or a mask (255.255.255.0) gives the network, the broadcast, the first
    and last host, the mask, the wildcard and the number of hosts, and says whether the address is private or public.
    ? shows the working in binary.
  - **Hosts:** how many hosts you need gives the smallest subnet that fits them, with its mask.
  The keypad's . key types the dots; on a keyboard, / after the address goes to the prefix, and pasting 10.0.0.5/16
  fills both fields.

## 0.11.3 – 2026-10-11

### Changed
- On a computer the bar under the tabs is hidden again until the mouse is over the tabs or the bar's own strip; it
  fades out a moment after the mouse leaves.

## 0.11.2 – 2026-10-11

### Changed
- The bar under the tabs now spans the whole tab strip and is thicker. On a computer it always shows, easy to grab, and
  the tabs themselves can also be dragged sideways with the mouse.
- On phones the tabs bounce past their ends again; while they do, the bar shrinks against that end instead of moving
  out of the card, and grows back when you let go.

## 0.11.1 – 2026-10-10

### Changed
- The bar under the tabs can be grabbed: drag it with the mouse or a finger, or press it to jump there. It gets thicker
  under the mouse, and pulled past an end it shrinks instead of sliding off; the tabs no longer bounce past their ends.
- On computers, Dates opens the app's own calendar instead of the browser's: months with the public holidays dotted
  and today ringed, a tap on the title for months and years, a Today button, the mouse wheel and the keyboard.
  Phones keep their own date picker.

## 0.11.0 – 2026-10-10

### Changed
- **Dates** redesigned. Dates are picked with your device's own calendar (the scroll wheels on iPhone, a calendar
  on Android and on computers) instead of being typed, and the start is today.
  - **Between:** the days between two dates, with a list of the details where the keypad was: weeks, months,
    working days, weekend days and the public holidays inside.
  - **Add days:** the date so many days later; the ± key goes back.
  - A **Working days** switch on the display counts only Monday to Friday without public holidays, in both:
    "10 working days from Friday" skips the weekend and 28 October.
- Age was removed from Dates.

## 0.10.0 – 2026-10-10

### Added
- Interest: a new **Payoff time** kind. Enter a loan, its interest rate and the monthly payment you can afford to see
  how long you'll pay (10.000 € at 4% with 300 € a month: 3 years) and the total interest. If the payment doesn't
  even cover the interest, it says so.
- When the tabs don't all fit, a slim bar under them shows there are more: it appears while they move and for a
  moment when the app opens. With a mouse, ‹ › buttons appear at the edges.

### Changed
- Interest's kinds are now Payment, Payoff time and Savings.

## 0.9.0 – 2026-10-10

### Added
- **Dates** tab, with three kinds on a switch. Dates are typed as digits (25122026 → 25/12/2026), and a field
  showing "Today" can stay empty.
  - **Between:** the days between two dates and how many are working days: Monday to Friday, without Greek
    public holidays, including Clean Monday, Good Friday, Easter Monday and Whit Monday each year.
  - **Add days:** the date so many days later, or earlier with −, and its weekday.
  - **Age:** years since a birth date and the days to the next birthday.
- Alt+1–9 switches tabs on a keyboard.

### Changed
- The , key is dimmed when the field can't take a decimal (People, dates, days).

## 0.8.0 – 2026-10-10

### Added
- **Interest** tab, with two kinds on a switch:
  - **Loan:** the monthly payment for an amount, yearly interest rate and years, and the total interest. Its chart
    shows how much of what you pay back is interest.
  - **Savings:** what a starting amount and a monthly deposit grow to, and how much of it is interest. Its chart
    shows the total growing over the years against what you put in.
- Alt+1–8 switches tabs on a keyboard.

### Fixed
- In the VAT and Interest charts, a large total in the middle of the ring no longer runs over its edges.

## 0.7.4 – 2026-10-10

### Fixed
- An app left open in the background (on a phone, or a browser tab) now updates to the new version when you come
  back to it, instead of only after closing it completely.

## 0.7.3 – 2026-10-10

### Changed
- Graph also starts over when you leave it, with its example function, and doesn't keep functions after closing the app.

## 0.7.2 – 2026-10-10

### Changed
- Changing tab now starts the tab you leave over, so switching is a quick way to clear: the numbers and results
  are gone when you come back (your calculations stay in History). Going from the Calculator to Units still takes
  the number along. The same for Percent's Discount / Change / Tip.
- Typed values are no longer kept after closing the app. Your choices are (units picked, VAT add/remove,
  Percent's kind), and so are Graph's functions and the fuel log.

## 0.7.1 – 2026-10-10

### Fixed
- In the VAT, Percent, Fuel and Energy fields on a computer, Backspace now deletes the selected text, or the digit
  before the cursor, instead of always the last digit. A comma typed over a selection replaces it, and − changes
  the sign instead of landing in the middle of the number.

## 0.7.0 – 2026-10-10

### Added
- **Percent** tab, with three kinds on a switch:
  - **Discount:** the price after a discount, and how much you save.
  - **Change:** how much a value went up or down, in percent (80 → 100 is +25%).
  - **Tip:** the tip on a bill and, for more than one person, what each pays. It starts at 10% for one person;
    shares are rounded up to the cent so the bill is covered.

### Changed
- The VAT tab's icon is now €, since % is the new Percent tab. Alt+1–7 switches tabs on a keyboard.

### Fixed
- Typing a second decimal comma into a VAT, Fuel or Energy field on a keyboard no longer gives a wrong number.

## 0.6.0 – 2026-10-10

### Added
- The app works without internet: once opened, it keeps a copy on the device, so it still opens in airplane mode
  or with no signal. When online it always loads the latest version, as before, and replaces the saved copy.

## 0.5.1 – 2026-10-10

### Changed
- A number can have up to 15 digits, and a calculation up to 150 characters, in every mode. A key that can't add
  more gives a small shake instead of doing nothing silently.
- Very large and very small numbers show with a proper power of ten, 1,234567 × 10²⁹, in results, Units, the tools and
  graph labels. Results show up to 16 digits in full.
- When a calculation can't be done, the reason shows (Can't divide by 0, Too large, Too small, Error) with the
  calculation above it. It stays until the next key, so you can fix it with ⌫ or start over with AC.
- Results above 10¹⁰⁰⁰⁰ say "Too large", as on Windows' calculator. 3248! is the largest factorial.

### Fixed
- Long calculations no longer disappear off the edge: the text gets smaller, then the end you're typing stays in view
  and the start fades out (swipe to see it). The same for the calculation above a result, Units values and tool fields.
- 10^−99999 showed "× 10^0", and very small values in Units showed "0,".
- e^1000 and similar large powers made the app pause for about 2 seconds; they're now instant.
- "Error" disappeared after a moment and took the last number typed with it.
- Huge amounts in VAT, Fuel and Energy showed "∞ €" or 40-digit figures.
- Units: 1 ÷ 0 kept showing the previous conversion.
- Graph: axis labels overlapped when zoomed far out, and labels hid behind the buttons; far from 0 curves turned
  into steps. Pan and zoom now stop where the graph is still accurate.
- History and the explanation wrap long calculations instead of cutting them off.
- x², xʸ and x! now apply to the whole value: −3 then x² gave −9 instead of 9, and x² three times on 9 gave 9¹⁶
  instead of 9⁸.

## 0.5.0 – 2026-10-10

### Added
- Scientific calculator: tap **f(x)** on the calculator's display. sin, cos, tan and their inverses, ln, log,
  powers, roots, 1/x, x!, π, e and EE, in degrees or radians. Answers stay exact wherever they are exact
  (2¹⁰, √(9/4), sin 30°), so sin 180° is exactly 0. Functions apply to the number just typed: 30 then sin gives sin(30).
- Themes: a menu on the theme button with Match device, Light, Paper, Rose, Sky, Dark, Black (true black for
  OLED screens), Ocean, Violet, Ember and Forest. Graphs and charts take the theme's colours.
- Phones held sideways get their own layout, with the keypad beside the display; the app now rotates on Android too.
- One-tap mode tabs (Calculator, Units, Graph, VAT, Fuel, Energy); Alt+1–6 on a keyboard.
- Tips & shortcuts for every mode, from the footer or the ? key.
- Install button, with a short Add to Home Screen guide on iPhone.
- New logo: "UC" on a calculator display.
- Hold ⌫ to clear everything; hold − (or F9) to change the sign.
- Delete clears the number being typed and Esc clears everything, in the Calculator and in Units.
- On big desktop screens (such as 4K) the whole app is shown larger.

### Changed
- New users start in English with the dark theme.
- Changing language or theme happens in place, without reloading; the theme spreads out in a circle from its button.
- Going from the Calculator to Units brings the number along.
- Brackets that change nothing are removed (((5)) → 5), and a number typed after ")" is multiplied.
- C clears only the number being typed; when there is none, the key shows AC and clears everything.
- A number made negative with ± shows in brackets: (−5).
- The Greek credits use the Greek names.
- On desktop Chrome and Edge the unit menus look like the rest of the app.
- The app's address is now https://uc.kampaxis.com.

### Fixed
- Screens of every common size (phones, iPad, laptops, 4K) fit without anything being cut off.
- History: the mouse wheel scrolls the right way and works from anywhere on the screen.
- Graph: typing with the Greek keyboard layout, or with a ^ key that waits for the next letter.
- The step-by-step explanation now explains calculations with negative numbers.
- Several cases where brackets or C could split a negative number from its minus sign.

## 0.4 – 7 to 9 October 2026

- Graph mode: up to three functions, with roots, minima, maxima and intersections marked; pan, zoom, and save as an image.
- Charts in the VAT, Fuel and Energy tools, and a chart of the History.
- Fuel: save calculations and see the averages.
- On phones the app's own keypad replaces the phone's keyboard.
- VAT add/remove became a sliding switch.
- Results are rounded instead of cut off, and continuing after a result keeps its exact value.
- A smart ( ) key; − after × ÷ ( starts a negative number.
- Fixes to security, input handling, units and the display.

## Before 0.4 – up to 6 October 2026

The first versions: the calculator with exact maths, the unit converter, the VAT, Fuel and Energy tools,
History, Greek and English, and dark and light themes. Not listed in detail.
