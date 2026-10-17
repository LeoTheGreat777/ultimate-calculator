# Start-up, offline, keyboard, Tips, screen readers

Part of the notes in CLAUDE.md (read that first). Covers main.js, sw.js, help.js, the manifest, tools/make-shortcut-icons.py.

- **Home-screen shortcuts:** the manifest's `shortcuts` (long-press the app icon on Android or a computer) open
  `./?mode=vat` etc.; main.js switches to that mode at start and puts the address back to `./`. The list and the icons
  (each the mode's tab icon on the dark background) come from `tools/make-shortcut-icons.py`; run it after changing
  them or a tab icon (the tests compare the manifest with it). iPhones don't offer shortcuts for web apps.
- **Tips:** a sheet per mode (`HELP`, `showHelp`), opened from the footer "Tips" link or the ? key; its keyboard
  shortcuts section only shows on devices with a keyboard. On big screens (≥ 900×600) the
  dialog uses the whole height, so ? and Tips don't scroll; Tips put the shortcuts beside the tips, and when that still doesn't
  fit the tips go into two columns in a wider sheet (`fitHelp`, `help-wide`). When behaviour changes, update the tips in both languages.
- **Screen readers:** keys showing only a symbol get a spoken name in the language on screen (`KEY_NAMES`, `nameKeys` in
  ui.js, re-run by a MutationObserver on `#keypad` and in `applyLanguage`); a key with its own `aria-label` (⌫, scientific
  keys) keeps it. A new symbol key: add it to `KEY_NAMES`. Icon-only buttons need an `aria-label` in both languages,
  drawn decoration `aria-hidden` (chart bars), and a message that only shows visually is also put in `#srNote`
  (aria-live), as `refuseLimit` does. The Tips link's icon is a drawn lightbulb (the owner didn't want a ?).
- **Offline:** `public/sw.js` (registered at the end of main.js) keeps a copy of the app in the cache `uc-app`. The page
  comes from the network first (`no-cache`), the saved copy only offline or after 3 s; `?v=` files from the saved copy
  first; each fresh page saves the files it links to and deletes other versions' `?v=` files. Nothing to update per
  version, but every file the app needs must be linked from index.html with `?v=`, and the app must not fetch anything
  else it needs to start (the deployed site is the same, with one js/app.js instead of the scripts). Coming back to the screen (`visibilitychange`, `focus`, bfcache `pageshow`) runs
  `checkForUpdate` (main.js, at most once a minute): it fetches the page with `no-store` (sw.js leaves those alone) and
  reloads if its footer version differs from `VERSION`. Not while the own theme editor is open (the reload would close
  the colour picker); the editor's colours are also kept on `pagehide`, so a reload never loses them. Test with `offline()` in tests/test_app.py.
- **Keyboard:** desktop typing is handled in the `window` `keydown` listener in `main.js`.
  Keys that do nothing in a mode are ignored.
- **Deploy build (`tools/build.mjs`):** GitHub Pages and the Docker image serve `public/` built by `node tools/build.mjs`
  (needs `npm ci` once; esbuild pinned in package-lock.json): every `<script src="js/…?v=">` in index.html, in order, is
  joined into one minified `js/app.js?v=VERSION` (one download instead of ~25), styles.css is minified, everything else is
  copied. The scripts share globals, and esbuild keeps top-level names when not bundling modules, so inline handlers,
  tests and `window` names keep working. The build fails if a file in `public/js/` isn't loaded by index.html. GitHub tests
  the build (`tests/test_app.py --site build`, which also checks it with `built_site`); the Dockerfile builds it in a
  first stage; nginx gzips text files (Pages already does). Editing and running locally stay as before, from `public/`.
