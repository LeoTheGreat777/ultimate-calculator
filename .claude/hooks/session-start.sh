#!/bin/bash
# Claude Code on the web: install what tests/test_app.py needs when a session starts.
# The cloud machines already have Chromium in /opt/pw-browsers; playwright 1.56.0 is the version that matches it,
# so only the Python package is installed (never `playwright install`). Does nothing on other computers.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! python3 -c 'import playwright, importlib.metadata as m; assert m.version("playwright") == "1.56.0"' 2>/dev/null; then
  python3 -m pip install --quiet --disable-pip-version-check --root-user-action=ignore playwright==1.56.0
fi
