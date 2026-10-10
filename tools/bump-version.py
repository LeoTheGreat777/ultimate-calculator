#!/usr/bin/env python3
"""Sets the app version everywhere it is written.

    python3 tools/bump-version.py           # next version: 0.4.141 -> 0.4.142
    python3 tools/bump-version.py 0.5.0     # a version of your choice
    python3 tools/bump-version.py --check   # only checks that every place has the same version

The version is VERSION in public/js/core.js, the footer in public/index.html, and the ?v= on every
script and stylesheet there (it makes browsers load the new files instead of old cached ones).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORE = ROOT / 'public/js/core.js'
PAGE = ROOT / 'public/index.html'
VERSION_RE = re.compile(r"const VERSION='(\d+\.\d+\.\d+)'")


def versions_in_page(html):
    return set(re.findall(r'\?v=(\d+\.\d+\.\d+)"', html)) | set(re.findall(r'id="footerVersion">v(\d+\.\d+\.\d+)<', html))


def main():
    core, html = CORE.read_text(), PAGE.read_text()
    current = VERSION_RE.search(core).group(1)
    found = versions_in_page(html) | {current}
    local_files = re.findall(r'(?:src|href)="([^":?]+\.(?:js|css))"', html)
    if local_files:
        print('Missing ?v= on: ' + ', '.join(local_files))
        sys.exit(1)

    if sys.argv[1:] == ['--check']:
        if len(found) > 1:
            print('Versions differ: ' + ', '.join(sorted(found)))
            sys.exit(1)
        print(f'All versions are {current}')
        return

    if sys.argv[1:]:
        new = sys.argv[1]
        if not re.fullmatch(r'\d+\.\d+\.\d+', new):
            sys.exit('Version must look like 0.4.142')
    else:
        major, minor, patch = current.split('.')
        new = f'{major}.{minor}.{int(patch) + 1}'

    CORE.write_text(VERSION_RE.sub(f"const VERSION='{new}'", core, count=1))
    html = re.sub(r'\?v=\d+\.\d+\.\d+"', f'?v={new}"', html)
    html = re.sub(r'id="footerVersion">v\d+\.\d+\.\d+<', f'id="footerVersion">v{new}<', html)
    PAGE.write_text(html)
    count = len(re.findall(r'\?v=', html))
    print(f'{current} -> {new} (VERSION, footer and {count} ?v= links)')


if __name__ == '__main__':
    main()
