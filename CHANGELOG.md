# Changelog

What changed in each version of Ultimate Calculator, newest first.

Versions are `MAJOR.MINOR.PATCH`: a new feature raises the middle number (0.5.0 → 0.6.0), a fix or small
tweak the last one (0.5.0 → 0.5.1). The first number stays 0 until the app is ready for everyone (1.0.0).
Each version lists what was **Added**, **Changed** and **Fixed**, written for the people using the app.

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
