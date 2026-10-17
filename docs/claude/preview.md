# The preview branch

Part of the notes in CLAUDE.md (read that first). Read this before pushing to `preview` or merging it.

- **Trying something first: the `preview` branch.** Anything the owner wants to see before it reaches the app goes on the
  branch `preview` (from main), never on main. A push to `preview` is tested (together with main); then, since only main
  may publish to Pages, its run starts the workflow on main (`ask-main-to-publish`, `preview_only`), which publishes the site
  with https://uc.kampaxis.com/preview/; the app at the root and the Docker image are untouched. It is marked "Preview" in
  the footer (main.js) and has its own offline copy (sw.js: one cache per address). It shares the browser's storage with
  the app (same site), so settings carry over; new storage keys there must not break the app. When the owner approves,
  merge `preview` into main (bump the version on main then); if not, reset `preview` to main or delete it.
