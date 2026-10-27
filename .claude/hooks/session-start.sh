#!/bin/bash
# Claude Code on the web: install what tests/test_app.py needs when a session starts.
# The cloud machines already have Chromium in /opt/pw-browsers; the Python playwright must be the same version as the machine's Node one,
# so only the Python package is installed (never `playwright install`). Does nothing on other computers.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# The machine's own Playwright (Node) tells which version its Chromium is for; 1.56.0 if it can't be read.
V=$(node -e "console.log(require('playwright/package.json').version)" 2>/dev/null || echo 1.56.0)
if ! python3 -c "import playwright, importlib.metadata as m; assert m.version('playwright') == '$V'" 2>/dev/null; then
  python3 -m pip install --quiet --disable-pip-version-check --root-user-action=ignore "playwright==$V"
fi
