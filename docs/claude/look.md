# Themes, logo and icons

Part of the notes in CLAUDE.md (read that first). Covers theme.js, the theme blocks in styles.css, tools/make-icons.py.

- **Logo and icons:** one drawing (a screen with a graph over the keys + − =), in `tools/make-icons.py`: run it after
  changing the drawing and it writes `public/icon.svg`, `favicon.svg` (the tab icon: bolder lines, dark on light browsers
  and light on dark ones), the PNGs (`icon-192/512.png` rounded; `icon-maskable-512.png` and `apple-touch-icon.png` full
  square; `icon-monochrome-512.png` for Android's themed icons) and the small logo by the title in `index.html`
  (`<svg class="brand-mark">`, coloured by theme tokens through `.bm-*` classes, so every theme recolours it). The = sign's
  spacing was chosen by the owner (`EQ_HOME`, `EQ_SMALL`); keep it. No letters in the icon, so it survives a rename.
  iOS can't switch a web app's home screen icon for dark mode, so there is one, opaque and full square. The tests fail
  if the files or the logo differ from what the script draws.
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
