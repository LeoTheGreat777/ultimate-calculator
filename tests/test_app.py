#!/usr/bin/env python3
"""Browser tests for Ultimate Calculator. Run before every push (GitHub runs them too, before deploying):

    pip install playwright && python3 -m playwright install chromium   # once
    python3 tests/test_app.py

Serves public/ on a free port, checks the app in Chromium at desktop and phone sizes, in both languages and
themes, and exits with an error if anything fails. Add a check here when you add or fix a feature.
"""
import asyncio
import functools
import http.server
import re
import socketserver
import sys
import threading
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
VERSION = re.search(r"const VERSION='([^']+)'", (PUBLIC / 'js/core.js').read_text()).group(1)
results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    if not ok or '-v' in sys.argv:
        print(('PASS ' if ok else 'FAIL ') + name + (f'  | {detail}' if detail != '' else ''))


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(PUBLIC))
    server = socketserver.TCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{server.server_address[1]}/'


SEED = "if(!sessionStorage.getItem('seeded')){localStorage.clear();localStorage.setItem('uc-defaults','1');" \
       "localStorage.setItem('uc-lang','%s');localStorage.setItem('uc-theme','%s');sessionStorage.setItem('seeded','1')}"
R = "document.querySelector('#result').textContent"
X = "document.querySelector('#expression').textContent"


async def new_page(browser, url, lang='en', theme='dark', phone=False, size=None):
    w, h = size or ((390, 844) if phone else (1280, 860))
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=phone, has_touch=phone)
    await ctx.add_init_script(SEED % (lang, theme))
    page = await ctx.new_page()
    page.errors = []
    page.on('pageerror', lambda e: page.errors.append(str(e)))
    await page.goto(url)
    await page.wait_for_timeout(300)
    return page


async def calc(page, keys):
    await page.keyboard.press('Escape')
    await page.keyboard.type(keys)
    await page.keyboard.press('Enter')
    await page.wait_for_timeout(20)
    return await page.evaluate(R)


async def desktop(browser, url, lang, theme):
    p = await new_page(browser, url, lang, theme)
    L = f'[{lang} {theme}] '
    check(L + 'footer shows v' + VERSION, ('v' + VERSION) in await p.inner_text('.app-footer'))

    # calculator basics
    for keys, want in [('0.1+0.2', '0,3'), ('1/3', '0,333333'), ('50+10%', '55'), ('50*10%', '5'), ('2*-3', '-6'),
                       ('(2+3)*4', '20'), ('1234.5*2', '2.469'), ('200-15%', '170')]:
        got = await calc(p, keys)
        check(L + f'{keys} = {want}', got == want, got)
    await calc(p, '2+3')
    await p.keyboard.press('Enter')
    check(L + '2+3== gives 8', await p.evaluate(R) == '8')
    await calc(p, '1/3')
    await p.keyboard.type('*3')
    await p.keyboard.press('Enter')
    check(L + 'carry keeps full precision: 1/3 then ×3 = 1', await p.evaluate(R) == '1', await p.evaluate(X))

    # brackets
    await calc(p, '((((((55551))))))*((((')
    check(L + 'useless brackets removed', await p.evaluate(R) == '55.551' and '(' not in await p.evaluate(X))
    await calc(p, '2*(8+9)896')
    check(L + 'number after ) is multiplied', (await p.evaluate(X)).startswith('2×(8+9)×896'), await p.evaluate(X))
    await calc(p, '2-(-5)')
    check(L + '2−(−5) = 7', await p.evaluate(R) == '7')

    # C / AC
    state = "[expression+current, document.querySelector('#clearButton').textContent]"
    await p.keyboard.press('Escape')
    await p.keyboard.type('5+3')
    check(L + 'C shown while typing a number', (await p.evaluate(state))[1] == 'C')
    await p.click('#clearButton')
    check(L + 'C clears only the number, then shows AC', await p.evaluate(state) == ['5+', 'AC'])
    await p.keyboard.type('3')
    await p.keyboard.press('F9')
    check(L + 'F9 changes the sign', (await p.evaluate(state))[0] == '5+-3')

    # history
    await calc(p, '7*6')
    saved = await p.evaluate("historyItems()[0]")
    check(L + 'history saved', saved['expression'] in ('7×6', '7*6') and saved['result'] == '42', saved)

    # tabs, Units transfer
    await calc(p, '12')
    await p.keyboard.press('Alt+2')
    await p.wait_for_timeout(150)
    check(L + 'Alt+2 opens Units', await p.evaluate('mode') == 'units')
    check(L + 'number moved to Units', await p.evaluate('unitExpressions[unitSource]') == '12')
    await p.select_option('#unitCategory', 'length')
    await p.select_option('#unitFrom', 'm')
    await p.select_option('#unitTo', 'cm')
    await p.click('#unitValueFrom')
    await p.keyboard.type('(1+2)*4')
    await p.wait_for_timeout(50)
    check(L + 'Units converts an expression', await p.evaluate('unitValueTo.value') == '1.200', await p.evaluate('unitValueTo.value'))
    await p.keyboard.press('Delete')
    check(L + 'Units Delete = C', await p.evaluate('unitExpressions.from') == '(1+2)*')

    # tools
    await p.evaluate("switchMode('vat')")
    await p.click('.tool-key[data-action="clear-all"]')
    await p.keyboard.type('1234,56')
    await p.wait_for_timeout(50)
    check(L + 'VAT added (24%)', await p.evaluate(R) == '1.530,85 €', await p.evaluate(R))
    await p.evaluate("switchMode('fuel')")
    await p.click('.tool-key[data-action="clear-all"]')
    await p.click('#fuelD')
    for v in ['250', '7,2', '1,85']:
        await p.keyboard.type(v)
        await p.keyboard.press('Tab')
    await p.wait_for_timeout(50)
    check(L + 'fuel cost', await p.evaluate(R) == '33,30 €', await p.evaluate(R))
    await p.evaluate("switchMode('graph')")
    await p.wait_for_timeout(150)
    check(L + 'graph has a canvas', await p.evaluate('graphCanvas.clientHeight > 100'))
    # typing a formula: keypad, and keyboards with other layouts (Greek letters, a "dead" ^ key that waits for a letter)
    await p.evaluate("graphKey('clear')")
    for k in ['x', '^', 'e']:
        await p.click(f'.key[data-g="{k}"]')
    check(L + 'graph keypad: x^e', await p.evaluate('graph.fns[graph.active]') == 'x^e')
    send = "([k,c,sh])=>window.dispatchEvent(new KeyboardEvent('keydown',{key:k,code:c,shiftKey:!!sh,bubbles:true,cancelable:true}))"
    for layout, keys in [('US', [('x', 'KeyX', 0), ('^', 'Digit6', 1), ('e', 'KeyE', 0)]),
                         ('Greek', [('χ', 'KeyX', 0), ('^', 'Digit6', 1), ('ε', 'KeyE', 0)]),
                         ('dead ^', [('x', 'KeyX', 0), ('Dead', 'Digit6', 1), ('ê', 'KeyE', 0)])]:
        await p.evaluate("graphKey('clear')")
        for key in keys:
            await p.evaluate(send, list(key))
        got = await p.evaluate("[graph.fns[graph.active], document.querySelector('.graph-fn.active').classList.contains('invalid')]")
        check(L + f'graph keyboard ({layout} layout): x^e', got == ['x^e', False], got)
    await p.evaluate("graphKey('clear')")

    # language switch in place, tips
    other = 'en' if lang == 'el' else 'el'
    await p.evaluate(f"switchMode('calc');setLanguage('{other}')")
    await p.wait_for_timeout(400)
    names = 'Δημιουργοί: Λεωνίδας Κάμπαξης' if other == 'el' else 'Created by Leonidas Kampaxis'
    check(L + 'language switches in place', names in await p.inner_text('#createdBy') and await p.evaluate('lang') == other)
    await p.keyboard.press('?')
    await p.wait_for_timeout(150)
    check(L + 'tips open with ?', not await p.evaluate("howModal.classList.contains('hidden')"))
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def phone(browser, url, lang, theme, size):
    p = await new_page(browser, url, lang, theme, phone=True, size=size)
    L = f'[phone {size[0]}x{size[1]} {lang} {theme}] '
    for key in ['5', '+', '3']:
        await p.tap(f'.key[data-value="{key}"]')
    await p.tap('.key[data-action="equals"]')
    check(L + 'keypad works', await p.evaluate(R) == '8')
    for m in ['calc', 'units', 'graph', 'vat', 'fuel', 'energy']:
        await p.evaluate(f"switchMode('{m}')")
        await p.wait_for_timeout(200)
        # compared with the real screen size: a phone browser widens the page to fit content that is too wide
        fits = await p.evaluate("""([vw,vh])=>{const scroll=document.documentElement.classList.contains('page-scroll');
            const out=[...document.querySelectorAll('.app-shell *')].filter(e=>{const r=e.getBoundingClientRect();
              return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'&&(r.right>vw+1||(!scroll&&r.bottom>vh+1))&&!e.closest('#modeTabs,#historyPanel,.modal')});
            return out.slice(0,3).map(e=>e.className||e.tagName)}""", list(size))
        check(L + f'{m}: nothing outside the screen', not fits, fits)
        if size[0] > size[1] and size[1] <= 500:
            st = await p.evaluate("[document.documentElement.classList.contains('landscape'), document.documentElement.dataset.fitOver]")
            check(L + f'{m}: landscape layout fits without scrolling', st == [True, '0'], st)
    width = await p.evaluate('document.documentElement.scrollWidth')
    check(L + 'no sideways scrolling', width <= size[0], width)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def main():
    url = serve()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        for lang, theme in [('en', 'dark'), ('el', 'light')]:
            await desktop(browser, url, lang, theme)
        for lang, theme, size in [('en', 'dark', (390, 844)), ('el', 'light', (360, 740)), ('en', 'light', (820, 1180)),
                                  ('el', 'dark', (844, 390)), ('en', 'light', (740, 360))]:  # the last two: phones held sideways
            await phone(browser, url, lang, theme, size)
        await browser.close()
    print(f'{sum(results)}/{len(results)} checks passed')
    sys.exit(0 if all(results) else 1)


if __name__ == '__main__':
    asyncio.run(main())
