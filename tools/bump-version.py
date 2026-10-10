#!/usr/bin/env python3
"""Sets the app version everywhere it is written, and starts its section in CHANGELOG.md.

    python3 tools/bump-version.py patch     # a fix or small tweak:  0.5.0 -> 0.5.1
    python3 tools/bump-version.py minor     # a new feature:         0.5.1 -> 0.6.0
    python3 tools/bump-version.py major     # the big one:           0.9.3 -> 1.0.0
    python3 tools/bump-version.py 0.7.0     # a version of your choice
    python3 tools/bump-version.py --check   # only checks (GitHub runs this before deploying)

The version is VERSION in public/js/core.js, the footer in public/index.html, and the ?v= on every
script and stylesheet there (it makes browsers load the new files instead of old cached ones).
CHANGELOG.md gets a heading for the new version; write what changed under it (Added / Changed / Fixed).
--check fails if the places disagree or the changelog has no section for the current version.
"""
import datetime
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT / 'public/js/core.js'
PAGE = ROOT / 'public/index.html'
CHANGELOG = ROOT / 'CHANGELOG.md'
VERSION_RE = re.compile(r"const VERSION='(\d+\.\d+\.\d+)'")


def versions_in_page(html):
    return set(re.findall(r'\?v=(\d+\.\d+\.\d+)"', html)) | set(re.findall(r'id="footerVersion">v(\d+\.\d+\.\d+)<', html))


def has_changelog_entry(version):
    return re.search(rf'^## {re.escape(version)}(\s|$)', CHANGELOG.read_text(), re.M) is not None


def add_changelog_heading(version):
    if has_changelog_entry(version):
        return False
    text = CHANGELOG.read_text()
    heading = f'## {version} – {datetime.date.today().isoformat()}\n\n'
    first = re.search(r'^## ', text, re.M)
    at = first.start() if first else len(text)
    CHANGELOG.write_text(text[:at] + heading + text[at:])
    return True


def main():
    core, html = CORE.read_text(), PAGE.read_text()
    current = VERSION_RE.search(core).group(1)
    local_files = re.findall(r'(?:src|href)="([^":?]+\.(?:js|css))"', html)
    if local_files:
        sys.exit('Missing ?v= on: ' + ', '.join(local_files))

    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    if arg == '--check':
        found = versions_in_page(html) | {current}
        if len(found) > 1:
            sys.exit('Versions differ: ' + ', '.join(sorted(found)))
        if not has_changelog_entry(current):
            sys.exit(f'CHANGELOG.md has no "## {current}" section: say what changed in this version.')
        text = CHANGELOG.read_text()
        start = re.search(rf'^## {re.escape(current)}(\s|$)', text, re.M).end()
        nxt = re.search(r'^## ', text[start:], re.M)
        if not re.search(r'^- ', text[start:start + nxt.start()] if nxt else text[start:], re.M):
            sys.exit(f'The "## {current}" section of CHANGELOG.md is empty: say what changed in this version.')
        print(f'All versions are {current}, and CHANGELOG.md has its section')
        return

    major, minor, patch = map(int, current.split('.'))
    if arg == 'patch':
        new = f'{major}.{minor}.{patch + 1}'
    elif arg == 'minor':
        new = f'{major}.{minor + 1}.0'
    elif arg == 'major':
        new = f'{major + 1}.0.0'
    elif re.fullmatch(r'\d+\.\d+\.\d+', arg):
        new = arg
    else:
        sys.exit(__doc__)

    CORE.write_text(VERSION_RE.sub(f"const VERSION='{new}'", core, count=1))
    html = re.sub(r'\?v=\d+\.\d+\.\d+"', f'?v={new}"', html)
    html = re.sub(r'id="footerVersion">v\d+\.\d+\.\d+<', f'id="footerVersion">v{new}<', html)
    PAGE.write_text(html)
    added = add_changelog_heading(new)
    print(f'{current} -> {new}' + (' (CHANGELOG.md: write what changed under its new heading)' if added else ''))


if __name__ == '__main__':
    main()
