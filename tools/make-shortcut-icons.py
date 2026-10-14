#!/usr/bin/env python3
"""Makes the icons of the home-screen shortcuts (manifest "shortcuts": long-press the app icon on Android, or the app's
icon on a computer, to open a mode straight away). Each is the mode's tab icon (ICONS in public/js/i18n.js, the one
drawing) in the app's blue on the icon's dark background, so it changes with the tab icon.

Writes public/shortcut-<mode>.png (96×96, full square: launchers round them themselves).
Run after changing a tab icon or SHORTCUTS: python3 tools/make-shortcut-icons.py  (needs playwright + chromium)
"""
import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
# the modes with a shortcut, in the order the launcher lists them: [mode, English name, Greek name]
SHORTCUTS = [['currency', 'Currency', 'Νόμισμα'], ['vat', 'VAT', 'ΦΠΑ'], ['units', 'Units', 'Μονάδες'], ['fuel', 'Fuel', 'Καύσιμα']]
BG, INK = '#0f1822', '#6ea8fe'


def manifest_entries():
    return [{'name': f'{en} · {el}', 'short_name': en, 'url': f'./?mode={m}',
             'icons': [{'src': f'shortcut-{m}.png', 'sizes': '96x96', 'type': 'image/png'}]} for m, en, el in SHORTCUTS]


async def main():
    i18n = (PUBLIC / 'js/i18n.js').read_text()
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page(viewport={'width': 96, 'height': 96})
        # read the tab icons the app draws (tabSvg, ICONS) by running i18n.js's top in the page
        icons = await page.evaluate('(()=>{' + re.search(r'(const tabSvg=.*?\n};)', i18n, re.S).group(1) + ';return ICONS})()')
        for m, _, _ in SHORTCUTS:
            glyph = icons[m]
            inner = (glyph if glyph.startswith('<svg') else
                     f'<svg viewBox="0 0 16 16"><text x="8" y="12.6" text-anchor="middle" font-size="13" font-weight="800" '
                     f'font-family="-apple-system,Segoe UI,Inter,DejaVu Sans,sans-serif" fill="currentColor">{glyph}</text></svg>')
            html = (f'<body style="margin:0;background:{BG};width:96px;height:96px;display:grid;place-items:center;color:{INK}">'
                    f'<div style="width:46px;height:46px">{inner}</div>'
                    '<style>svg{width:100%;height:100%;display:block}</style></body>')
            await page.set_content(html)
            await page.screenshot(path=str(PUBLIC / f'shortcut-{m}.png'))
        await b.close()
    manifest = json.loads((PUBLIC / 'manifest.webmanifest').read_text())
    manifest['shortcuts'] = manifest_entries()
    (PUBLIC / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print('wrote', ', '.join(f'shortcut-{m}.png' for m, _, _ in SHORTCUTS), 'and the manifest shortcuts')


if __name__ == '__main__':
    asyncio.run(main())
