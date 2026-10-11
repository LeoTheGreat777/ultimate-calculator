#!/usr/bin/env python3
"""Makes every app icon from one drawing: a screen with a graph over three keys (+ − =).

Writes, in public/:
  icon.svg               the icon (rounded), also listed in the manifest
  favicon.svg            the browser tab icon: bolder lines; dark on light browsers, light on dark ones
  icon-192.png, icon-512.png   rounded, transparent corners (manifest "any")
  icon-maskable-512.png  full square, drawing inside Android's round safe zone (manifest "maskable")
  icon-monochrome-512.png  one colour, for Android's themed icons (manifest "monochrome")
  apple-touch-icon.png   180×180, full square: iOS rounds it itself
and replaces the small logo by the title in index.html (<svg class="brand-mark">), drawn with theme tokens (.bm-*).

Run after changing the drawing: python3 tools/make-icons.py  (needs playwright + chromium, like the tests)
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
CURVE = 'M100 230C150 230 178 104 238 112C292 119 300 214 352 206C384 201 396 150 412 108'
EQ_X, EQ_Y = 391.33, 374
# The = sign, chosen by hand with the tuner (space between the lines, line thickness, line length; 512 grid).
EQ_HOME = dict(space=13, thick=24, length=54)
EQ_SMALL = dict(space=29, thick=26, length=68)   # tab icon and the logo by the title: bolder, for 16–32 px

DARK = dict(screen='#0f1822', edge='#2a3646', grid='#22303f', curve='#6ea8fe', dot='#f5a65b', key='url(#k)', lit='url(#lit)', sym='#b5d0ff', ink='#0a1320')
LIGHT = dict(screen='#141c27', edge=None, grid='#233042', curve='#6ea8fe', dot='#f5a65b', key='url(#kl)', lit='url(#lit)', sym='#3d6fb8', ink='#ffffff')
DEFS = ('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151c27"/><stop offset="1" stop-color="#090c11"/></linearGradient>'
        '<linearGradient id="bgl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9edf3"/></linearGradient>'
        '<linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#263142"/><stop offset="1" stop-color="#1b2330"/></linearGradient>'
        '<linearGradient id="kl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1f6"/><stop offset="1" stop-color="#dfe5ee"/></linearGradient>'
        '<linearGradient id="lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fbeff"/><stop offset="1" stop-color="#3d82f0"/></linearGradient>')
KEYS_X = [62, 197.33, 332.67]


def n(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.')


def line(x1, y1, x2, y2, w, paint):
    """paint: a colour, or a class name for the theme-coloured logo ('.bm-sym')."""
    attr = f'class="{paint[1:]}"' if paint.startswith('.') else f'stroke="{paint}"'
    return f'<path d="M{n(x1)} {n(y1)}L{n(x2)} {n(y2)}" {attr} stroke-width="{n(w)}" stroke-linecap="round" fill="none"/>'


def equals(eq, paint):
    d, h = (eq['space'] + eq['thick']) / 2, eq['length'] / 2
    return line(EQ_X - h, EQ_Y - d, EQ_X + h, EQ_Y - d, eq['thick'], paint) + line(EQ_X - h, EQ_Y + d, EQ_X + h, EQ_Y + d, eq['thick'], paint)


def drawing(c, small):
    """The icon's drawing on a 512 grid. c: colours, or None for the logo's theme classes."""
    p = (lambda k, colour: colour) if c else (lambda k, colour: k)
    sym_w = 32 if small else 22
    if c:
        s = f'<rect x="62" y="62" width="388" height="214" rx="52" fill="{c["screen"]}"' + (f' stroke="{c["edge"]}" stroke-width="5"' if c['edge'] else '') + '/>'
        if not small:
            s += f'<path d="M104 152H408M256 92V246" stroke="{c["grid"]}" stroke-width="5" stroke-linecap="round"/>'
        s += f'<path d="{CURVE}" stroke="{c["curve"]}" stroke-width="{30 if small else 18}" stroke-linecap="round" fill="none"/>'
        s += f'<circle cx="238" cy="112" r="{22 if small else 15}" fill="{c["dot"]}"/>'  # bigger on the bolder curve
        s += ''.join(f'<rect x="{x}" y="298" width="117.33" height="152" rx="42" fill="{c["lit"] if i == 2 else c["key"]}"/>' for i, x in enumerate(KEYS_X))
        sym, ink = c['sym'], c['ink']
    else:  # the logo by the title: theme tokens through .bm-* classes (styles.css)
        s = '<rect x="62" y="62" width="388" height="214" rx="52" class="bm-screen"/><rect x="62" y="62" width="388" height="214" rx="52" class="bm-edge" stroke-width="5"/>'
        s += f'<path d="{CURVE}" class="bm-curve" stroke-width="30" stroke-linecap="round" fill="none"/><circle cx="238" cy="112" r="22" class="bm-dot"/>'
        s += ''.join(f'<rect x="{x}" y="298" width="117.33" height="152" rx="42" class="{"bm-lit" if i == 2 else "bm-key"}"/>' for i, x in enumerate(KEYS_X))
        sym, ink = '.bm-sym', '.bm-ink'
    s += line(93.67, 374, 147.67, 374, sym_w, sym) + line(120.67, 347, 120.67, 401, sym_w, sym) + line(229, 374, 283, 374, sym_w, sym)
    s += equals(EQ_SMALL if small else EQ_HOME, ink)
    return s


def svg(body, bg='url(#bg)', rx=112, extra=''):
    r = f' rx="{rx}"' if rx else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>{DEFS}</defs>{extra}<rect width="512" height="512"{r} fill="{bg}"/>{body}</svg>'


def scaled(body, k):
    o = 256 * (1 - k)
    return f'<g transform="translate({n(o)} {n(o)}) scale({k})">{body}</g>'


ICON = svg(drawing(DARK, False))
FULL = svg(drawing(DARK, False), rx=0)
MASKABLE = svg(scaled(drawing(DARK, False), .74), rx=0)
MONO = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' + scaled(
    '<rect x="62" y="62" width="388" height="214" rx="52" fill="none" stroke="#fff" stroke-width="22"/>'
    f'<path d="{CURVE}" stroke="#fff" stroke-width="26" stroke-linecap="round" fill="none"/>'
    + ''.join(f'<rect x="{x}" y="298" width="117.33" height="152" rx="42" fill="#fff" opacity="{1 if i == 2 else .55}"/>' for i, x in enumerate(KEYS_X)),
    .7) + '</svg>')
FAVICON = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>' + DEFS + '</defs>'
           '<style>.l{display:none}@media (prefers-color-scheme:dark){.d{display:none}.l{display:inline}}</style>'
           f'<g class="d"><rect width="512" height="512" rx="112" fill="url(#bg)"/>{drawing(DARK, True)}</g>'
           f'<g class="l"><rect width="512" height="512" rx="112" fill="url(#bgl)"/>{drawing(LIGHT, True)}</g></svg>')
LOGO = f'<svg class="brand-mark" viewBox="56 56 400 400" aria-hidden="true">{drawing(None, True)}</svg>'


def main():
    (PUBLIC / 'icon.svg').write_text(ICON)
    (PUBLIC / 'favicon.svg').write_text(FAVICON)
    html = (PUBLIC / 'index.html').read_text()
    html, count = re.subn(r'<svg class="brand-mark".*?</svg>', LOGO, html, count=1, flags=re.S)
    assert count == 1, 'the logo by the title (<svg class="brand-mark">) was not found in index.html'
    (PUBLIC / 'index.html').write_text(html)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={'width': 512, 'height': 512})
        for name, source, size in [('icon-512.png', ICON, 512), ('icon-192.png', ICON, 192), ('icon-maskable-512.png', MASKABLE, 512),
                                   ('icon-monochrome-512.png', MONO, 512), ('apple-touch-icon.png', FULL, 180)]:
            page.set_viewport_size({'width': size, 'height': size})
            page.set_content(f'<style>html,body{{margin:0;background:transparent}}svg{{display:block;width:{size}px;height:{size}px}}</style>{source}')
            page.screenshot(path=str(PUBLIC / name), omit_background=True)
        browser.close()
    from PIL import Image  # the full-square ones have no transparent pixels: save them without an alpha channel
    for name in ['icon-maskable-512.png', 'apple-touch-icon.png']:
        Image.open(PUBLIC / name).convert('RGB').save(PUBLIC / name, optimize=True)
    print('icons written: icon.svg, favicon.svg, 5 PNGs, and the logo in index.html')


if __name__ == '__main__':
    main()
