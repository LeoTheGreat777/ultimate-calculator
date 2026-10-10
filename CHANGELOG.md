# Changelog

What changed in each version of Ultimate Calculator, newest first.

Versions are `MAJOR.MINOR.PATCH`: a new feature raises the middle number (0.5.0 → 0.6.0), a fix or small
tweak the last one (0.5.0 → 0.5.1). The first number stays 0 until the app is ready for everyone (1.0.0).
Each version lists what was **Added**, **Changed** and **Fixed**, written for the people using the app.

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

The first versions built with Efstathios Konstantinos Tsakiris.

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
