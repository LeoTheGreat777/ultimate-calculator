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
import shutil
import socketserver
import sys
import tempfile
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


def serve(directory=PUBLIC):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(directory))
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


def t(en, el, lang):
    return el if lang == 'el' else en


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
    check(L + 'F9 changes the sign: 5+(−3)', await p.evaluate(R) == '5+(−3)', await p.evaluate(R))

    # negative numbers: one made with ± (hold −, F9) shows in brackets, (−5); one typed with − first stays -5;
    # after an operator always in brackets, 5×(−3); finished results plain
    await p.keyboard.press('Escape')
    await p.keyboard.type('5')
    await p.keyboard.press('F9')
    check(L + '5 then ± shows (−5)', await p.evaluate(R) == '(−5)', await p.evaluate(R))
    await p.keyboard.type('*3')
    await p.keyboard.press('Enter')
    check(L + '(−5)×3 = -15, shown with brackets above', await p.evaluate(R) == '-15' and await p.evaluate(X) == '(−5)×3',
          [await p.evaluate(R), await p.evaluate(X)])
    await p.keyboard.type('+2')
    check(L + 'a computed negative result carries on plain: -15+2', await p.evaluate(R) == '-15+2', await p.evaluate(R))
    await p.keyboard.press('Enter')
    steps = await p.evaluate("howData.steps.map(s=>s.text||s).join(' | ')")
    check(L + 'explanation step: -15 + 2 = -13', '-15 + 2 = -13' in steps, steps)
    await p.keyboard.press('Escape')
    await p.keyboard.type('-5*-3')
    check(L + 'typed − first: -5×(−3)', await p.evaluate(R) == '-5×(−3)', await p.evaluate(R))
    await p.keyboard.press('Escape')
    await p.keyboard.type('12*7=')
    await p.keyboard.press('F9')
    await p.keyboard.type('+2')
    check(L + 'a result turned negative with ± carries on in brackets: (−84)+2', await p.evaluate(R) == '(−84)+2', await p.evaluate(R))
    await p.keyboard.press('Escape')
    await p.keyboard.type('(5')
    await p.keyboard.press('F9')
    await p.keyboard.type(')')
    check(L + '( 5 ± ) keeps the ± number together', await p.evaluate('[expression,current]') == ['', '−5'], await p.evaluate('[expression,current]'))

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
    await p.keyboard.press('Escape')
    await p.keyboard.type('5')
    await p.keyboard.press('F9')
    check(L + 'Units: 5 then ± shows (−5)', await p.evaluate('unitValueFrom.value') == '(−5)', await p.evaluate('unitValueFrom.value'))
    await p.keyboard.press('Escape')
    await p.keyboard.type('-5')
    check(L + 'Units: typed − first stays -5', await p.evaluate('unitValueFrom.value') == '-5', await p.evaluate('unitValueFrom.value'))

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
    # a tool field edits like a text box: Backspace deletes the selection or the character before the cursor
    await p.evaluate("switchMode('vat')")
    await p.click('.tool-key[data-action="clear-all"]')
    await p.click('#amount')
    await p.keyboard.type('123456')
    await p.evaluate("amount.setSelectionRange(1,3)")
    await p.keyboard.press('Backspace')
    check(L + 'tool field: Backspace deletes the selection', await p.evaluate('amount.value') == '1456', await p.evaluate('amount.value'))
    await p.evaluate("amount.setSelectionRange(2,2)")
    await p.keyboard.press('Backspace')
    check(L + 'tool field: Backspace deletes before the cursor', await p.evaluate('amount.value') == '156', await p.evaluate('amount.value'))
    await p.keyboard.type('7,')
    check(L + 'tool field: typing goes in at the cursor', await p.evaluate('amount.value') == '17,56', await p.evaluate('amount.value'))
    await p.evaluate("amount.setSelectionRange(2,3)")
    await p.keyboard.type(',')
    check(L + 'tool field: a comma can replace the selected comma', await p.evaluate('amount.value') == '17,56', await p.evaluate('amount.value'))
    await p.keyboard.press('-')
    check(L + 'tool field: − changes the sign', await p.evaluate('amount.value') == '-17,56', await p.evaluate('amount.value'))
    await p.evaluate("amount.select()")
    await p.keyboard.press('Backspace')
    check(L + 'tool field: select all and Backspace empties it', await p.evaluate('amount.value') == '' and await p.evaluate(R) == '0', [await p.evaluate('amount.value'), await p.evaluate(R)])
    await p.keyboard.type('1234,56')
    # VAT switch still slides between add and remove
    await p.evaluate("switchMode('vat')")
    await p.click('[data-choice="remove"]')
    check(L + 'VAT switch: remove', await p.evaluate('vatAction') == 'remove' and await p.evaluate(R) == '995,61 €', await p.evaluate(R))
    await p.click('[data-choice="add"]')
    # Percent: discount, % change, tip
    await p.evaluate("switchMode('pct');setPctAction('discount')")
    await p.click('.tool-key[data-action="clear-all"]')
    await p.keyboard.type('80')
    await p.keyboard.press('Tab')
    await p.keyboard.type('25')
    check(L + 'Percent: 25% off 80', [await p.evaluate(R), await p.evaluate(X)] == ['60,00 €', t('You save: 20,00 €', 'Κερδίζεις: 20,00 €', lang)],
          [await p.evaluate(R), await p.evaluate(X)])
    box = await p.locator('.seg-toggle').bounding_box()
    await p.mouse.move(box['x'] + 40, box['y'] + box['height'] / 2)
    await p.mouse.down()
    await p.mouse.move(box['x'] + 120, box['y'] + box['height'] / 2, steps=8)
    await p.wait_for_timeout(150)
    await p.mouse.up()
    check(L + 'Percent: dragging the switch picks Change', await p.evaluate('pctAction') == 'change' and await p.locator('#pctFrom').count() == 1)
    await p.click('#pctFrom')
    await p.keyboard.type('80')
    await p.keyboard.press('Tab')
    await p.keyboard.type('100')
    check(L + 'Percent: 80 to 100 is +25%', await p.evaluate(R) == '+25%', await p.evaluate(R))
    await p.keyboard.press('Control+a')
    await p.keyboard.type('60')
    check(L + 'Percent: 80 to 60 is -25%', await p.evaluate(R) == '-25%', await p.evaluate(R))
    await p.click('[data-choice="tip"]')
    await p.click('#tipBill')
    await p.keyboard.type('100')
    check(L + 'Tip: 10% on 100 for one', await p.evaluate(R) == '110,00 €', await p.evaluate(R))
    await p.click('#tipPeople')
    await p.keyboard.press('Backspace')
    await p.keyboard.type('3,5')
    check(L + 'Tip: people take whole numbers only', await p.evaluate('tipPeople.value') == '35', await p.evaluate('tipPeople.value'))
    await p.keyboard.press('Backspace')
    check(L + 'Tip: split 3 ways rounds up to the cent', await p.evaluate(R) == '36,67 €', await p.evaluate(R))
    await p.click('.tool-key[data-action="clear-all"]')
    st = await p.evaluate("[tipBill.value,tipRate.value,tipPeople.value,toolState.pct.inputs.pctFrom]")
    check(L + 'Percent: AC clears only the kind on screen', st == ['', '10', '1', '80'], st)
    await p.evaluate("setPctAction('discount')")
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
    await p.keyboard.press('Escape')

    # themes: the menu from the theme button; Black is kept after a reload
    T = 'document.documentElement.dataset.theme'
    check(L + f'theme on start is {theme}', await p.evaluate(T) == theme)
    await p.click('#themeButton')
    check(L + 'theme menu lists every theme', await p.locator('#themeMenu .theme-option').count() == await p.evaluate('THEMES.length'))
    for name in await p.evaluate("THEMES.filter(n=>n!=='auto')"):
        await p.click(f'[data-theme-pick="{name}"]')
        await p.wait_for_timeout(650)
        got = await p.evaluate("[document.documentElement.dataset.theme, getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()]")
        check(L + f'theme {name} applies', got[0] == name and got[2] != '', got)
        await p.click('#themeButton')
    await p.click('[data-theme-pick="black"]')
    await p.wait_for_timeout(700)
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'Black theme kept after reload', await p.evaluate(T) == 'black'
          and await p.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(0, 0, 0)')
    await p.click('#themeButton')
    await p.click(f'[data-theme-pick="{theme}"]')
    await p.wait_for_timeout(700)
    check(L + 'back to the first theme', await p.evaluate(T) == theme and not await p.evaluate('themeMenuOpen()'))
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def scientific(browser, url, lang, theme):
    """The Scientific calculator: the f(x) switch, the keys (by tapping, like on a phone), Deg/Rad, the keyboard."""
    p = await new_page(browser, url, lang, theme)
    L = f'[scientific {lang} {theme}] '
    check(L + 'starts in Basic, no scientific keys', await p.locator('.sci-key').count() == 0)
    await p.click('[data-bar="sci"]')
    check(L + 'f(x) shows 15 scientific keys and DEG', await p.locator('.sci-key').count() == 15
          and 'DEG' in await p.inner_text('#sciBar'))

    async def keys(*seq):
        """tap keys: digits/operators by value, scientific ones as 'sci:name', '=' and 'AC'"""
        await p.evaluate('clearAll()')
        for k in seq:
            if k.startswith('sci:'):
                await p.click(f'[data-sci="{k[4:]}"]')
            elif k == '=':
                await p.click('.key[data-action="equals"]')
            elif k == '( )':
                await p.click('.key[data-action="paren"]')
            elif k == '±':
                await p.keyboard.press('F9')
            else:
                await p.click(f'.key[data-value="{k}"]')
        return [await p.evaluate(X), await p.evaluate(R)]

    cases = [
        (('3', '0', 'sci:sin', '='), ['sin(30)', '0,5']),
        (('sci:sin', '3', '0', '='), ['sin(30)', '0,5']),
        (('2', '+', '3', '0', 'sci:sin', '='), ['2+sin(30)', '2,5']),
        (('2', 'sci:pow', '1', '0', '='), ['2¹⁰', '1.024']),
        (('9', 'sci:sqrt', '='), ['√(9)', '3']),
        (('5', 'sci:fact', '='), ['5!', '120']),
        (('2', '/', '4', 'sci:inv', '='), ['2÷(1÷4)', '8']),
        (('1', ',', '5', 'sci:ee', '3', '='), ['1,5×10³', '1.500']),
        (('1', '0', '0', '0', 'sci:log', '='), ['log(1.000)', '3']),
        (('2', 'sci:pi', '='), ['2×π', '6,283185']),
        (('3', '0', '±', 'sci:sin', '='), ['sin(−30)', '-0,5']),
        (('2', 'sci:sq', '+', '1', '='), ['2²+1', '5']),
    ]
    for seq, want in cases:
        got = await keys(*seq)
        check(L + ' '.join(seq) + f' -> {want[0]} = {want[1]}', got == want, got)
    # a result continues: 1÷3 = then x² is (1/3)², exactly 1/9
    await keys('1', '/', '3', '=', 'sci:sq', '=')
    check(L + 'result then x²: 0,333333² = 0,111111', [await p.evaluate(X), await p.evaluate(R)] == ['0,333333²', '0,111111'],
          [await p.evaluate(X), await p.evaluate(R)])
    # 2nd: inverse functions; Deg/Rad
    await p.click('[data-sci="2nd"]')
    got = await keys('0', ',', '5', 'sci:asin', '=')
    check(L + '2nd sin = sin⁻¹: sin⁻¹(0,5) = 30°', got == ['sin⁻¹(0,5)', '30'], got)
    await p.click('[data-sci="2nd"]')
    await p.click('[data-sci="angle"]')
    check(L + 'Rad on', 'RAD' in await p.inner_text('#sciBar'))
    got = await keys('sci:pi', 'sci:sin', '=')
    check(L + 'sin(π) = 0 in radians', got[1] == '0', got)
    await p.click('[data-sci="angle"]')
    # mistakes give Error, not nonsense
    got = await keys('1', '±', 'sci:sqrt', '=')
    check(L + '√(−1) = Error', got[1] == ('Σφάλμα' if lang == 'el' else 'Error'), got)
    # backspace takes a function away whole
    await keys('sci:sin')
    await p.click('.key[data-action="backspace"]')
    check(L + 'backspace removes "sin(" at once', await p.evaluate('expression+current') == '')
    # keyboard: ^ and !
    await p.keyboard.press('Escape')
    await p.keyboard.type('2^10=')
    check(L + 'keyboard 2^10 = 1.024', await p.evaluate(R) == '1.024', await p.evaluate(R))
    await p.keyboard.press('Escape')
    await p.keyboard.type('5!=')
    check(L + 'keyboard 5! = 120', await p.evaluate(R) == '120', await p.evaluate(R))
    # History and the explanation keep the scientific text
    await p.keyboard.press('Escape')
    await keys('3', '0', 'sci:sin', '=')
    check(L + 'History shows sin(30)', await p.evaluate("document.querySelector('.history-expression').textContent") == 'sin(30)')
    check(L + 'explanation: sin(30) = 0,5', 'sin(30) = 0,5' in await p.evaluate("howData.steps.map(s=>s.text||s).join('|')"))
    # the choice is remembered; Units keeps its own keypad
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'Scientific kept after reload', await p.locator('.sci-key').count() == 15)
    await p.evaluate("switchMode('units')")
    await p.wait_for_timeout(150)
    check(L + 'Units has no scientific keys', await p.locator('.sci-key').count() == 0)
    await p.evaluate("switchMode('calc')")
    await p.wait_for_timeout(150)
    await p.click('[data-bar="sci"]')
    check(L + 'f(x) again: back to Basic', await p.locator('.sci-key').count() == 0)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def limits(browser, url, lang, theme, phone=False):
    """Someone trying to break it: very long numbers and calculations, huge and tiny results, errors, in every mode."""
    p = await new_page(browser, url, lang, theme, phone=phone)
    L = f'[limits {lang} {theme}{" phone" if phone else ""}] '
    el = lang == 'el'
    T = lambda key: p.evaluate(f"t('{key}')")
    run = lambda js: p.evaluate(f"(()=>{{switchMode('calc');clearAll();{js};return [{X},{R}]}})()")
    # a number has at most 15 digits; a 16th digit (or a comma after it) shakes the display and does nothing
    got = await run("for(let i=0;i<20;i++)digit('7');digit(',');digit('5')")
    check(L + '15 digits at most', got[1] == '777.777.777.777.777', got)
    check(L + 'a refused key shakes the display', await p.evaluate("document.querySelector('#result').classList.contains('refused')"))
    # a calculation has at most 150 characters; while typing, its end stays in view and the start fades
    await run("for(let i=0;i<60;i++){digit('9');digit('9');digit('9');operator('+')}")
    await p.wait_for_timeout(120)
    st = await p.evaluate("[inputLength(),(()=>{const r=document.querySelector('#result');return [r.scrollLeft+r.clientWidth>=r.scrollWidth-2,r.classList.contains('fade-start')]})()]")
    check(L + 'calculation stops at 150 characters', st[0] <= 150, st)
    check(L + 'long calculation shows its end, start faded', st[1] == [True, True], st)
    # results: up to 16 digits in full, then × 10ⁿ
    for js, want in [("for(const c of '999999999999999')digit(c);operator('+');digit('1');equals()", '1.000.000.000.000.000'),
                     ("for(const c of '999999999999999')digit(c);operator('×');for(const c of '999999999999999')digit(c);equals()", '1 × 10³⁰'),
                     ("digit('1');operator('÷');for(const c of '7000000')digit(c);equals()", '1,428571 × 10⁻⁷')]:
        got = await run(js)
        check(L + f'result {want}', got[1] == want, got)
    # errors say why, keep the calculation on screen, and the next key goes on from it
    got = await run("digit('8');operator('÷');digit('0');equals()")
    check(L + "8÷0: can't divide by 0, calculation stays", got == ['8÷0', await T('errDiv0')], got)
    check(L + 'error: the key is AC', await p.evaluate("document.querySelector('#clearButton').textContent") == 'AC')
    if phone:
        fits = await p.evaluate("document.documentElement.scrollHeight<=innerHeight+1&&!document.documentElement.classList.contains('page-scroll')")
        check(L + 'the error and its calculation fit the screen', fits)
    await p.evaluate("setLanguage('" + ('en' if el else 'el') + "')")
    await p.wait_for_timeout(400)
    check(L + 'error text follows a language switch', await p.evaluate(R) == await T('errDiv0'), await p.evaluate(R))
    await p.evaluate(f"setLanguage('{lang}')")
    await p.wait_for_timeout(400)
    got = await p.evaluate(f"(()=>{{backspace();digit('2');equals();return [{X},{R}]}})()")
    check(L + 'after the error: ⌫ 2 = gives 8÷2 = 4', got == ['8÷2', '4'], got)
    # scientific: too large, too small, big but fine, powers of negatives and of powers
    await p.evaluate("sciMode||toggleSci()")
    for js, want in [("for(const c of '3249')digit(c);sciKey('fact');equals()", await T('errBig')),
                     ("for(const c of '3248')digit(c);sciKey('fact');equals()", '1,973634 × 10⁹⁹⁹⁷'),
                     ("digit('1');digit('0');sciKey('pow');operator('-');for(const c of '99999')digit(c);equals()", await T('errSmall')),
                     ("digit('9');sciKey('pow');smartParen();digit('9');sciKey('pow');digit('9');equals()", await T('errBig')),
                     ("digit('9');sciKey('pow');digit('9');sciKey('pow');digit('9');equals()", '1,966271 × 10⁷⁷'),  # (9⁹)⁹, like a calculator
                     ("for(const c of '1000')digit(c);sciKey('exp');equals()", '1,970071 × 10⁴³⁴'),
                     ("digit('3');negate();sciKey('sq');equals()", '9'),
                     ("digit('9');sciKey('sq');sciKey('sq');sciKey('sq');equals()", '43.046.721'),
                     ("digit('0');operator('-');digit('8');digit('4');equals();sciKey('sq');equals()", '7.056')]:
        got = await run(js)
        check(L + f'{js[:40]}… = {want}', got[1] == want, got)
    got = await run("digit('3');negate();sciKey('sq')")
    check(L + '(−3)² is shown with its brackets', got[1] == '(−3)²', got)
    # a tiny result carries on exactly and is kept in History with its digits
    got = await run("digit('1');operator('÷');digit('1');digit('0');sciKey('pow');digit('4');digit('0');equals();operator('+');digit('0');equals()")
    check(L + 'tiny result + 0 stays 1 × 10⁻⁴⁰', got[1] == '1 × 10⁻⁴⁰', got)
    check(L + 'History keeps a tiny result', await p.evaluate("ratFromString(historyItems()[0].result).n!==0n"))
    # ⌫ on a huge carried result removes it whole
    got = await run("digit('2');sciKey('pow');digit('2');digit('0');digit('0');equals();operator('+');backspace();backspace()")
    check(L + '⌫ removes a huge carried result whole', got[1] == '0', got)
    await p.evaluate("toggleSci()")
    # Units: the same limits; huge values as × 10ⁿ; an error shows on the other side
    unit = lambda keys: p.evaluate("(keys)=>{switchMode('units');toolKeyInput('clear');for(const k of keys)toolKeyInput(k);return [unitValueFrom.value,unitValueTo.value]}", list(keys))
    await p.evaluate("(()=>{switchMode('units');const c=document.querySelector('#unitCategory');c.value='length';c.dispatchEvent(new Event('change'));unitFrom.value='km';unitFrom.dispatchEvent(new Event('change'));unitTo.value='mm';unitTo.dispatchEvent(new Event('change'))})()")
    got = await unit('9' * 20)
    check(L + 'Units: 15 digits, huge result as × 10ⁿ', got == ['999.999.999.999.999', '1 × 10²¹'], got)
    got = await unit('1/0')
    check(L + "Units: 1÷0 says can't divide by 0", got[1] == await T('errDiv0'), got)
    got = await unit('(' * 200)
    check(L + 'Units: 150 characters at most', len(got[0]) <= 150, len(got[0]))
    # tools: 15 digits a field; huge money as × 10ⁿ, never ∞
    await p.evaluate("(()=>{switchMode('vat');clearToolFields();setActiveToolInput(document.querySelector('#amount'));for(let i=0;i<40;i++)toolKeyInput('9')})()")
    got = await p.evaluate(f"[document.querySelector('#amount').value,{R}]")
    check(L + 'VAT: 15 digits, total as × 10ⁿ', got == ['999999999999999', '1,24 × 10¹⁵ €'], got)
    # Graph: functions of up to 120 characters; the view stays where numbers are precise
    got = await p.evaluate("(()=>{switchMode('graph');graphKey('clear');for(let i=0;i<100;i++){graphKey('x');graphKey('+')}graph.view={cx:1e15,cy:0,ux:1e9,uy:40};drawGraph();return [graph.fns[graph.active].length,graph.view.cx,graph.view.ux]})()")
    check(L + 'Graph: 120 characters, view limited', got[0] <= 120 and got[1] == 1e12 and got[2] <= 0.1, got)
    await p.evaluate("graphKey('clear');graph.view=null")
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def phone(browser, url, lang, theme, size):
    p = await new_page(browser, url, lang, theme, phone=True, size=size)
    L = f'[phone {size[0]}x{size[1]} {lang} {theme}] '
    for key in ['5', '+', '3']:
        await p.tap(f'.key[data-value="{key}"]')
    await p.tap('.key[data-action="equals"]')
    check(L + 'keypad works', await p.evaluate(R) == '8')
    for m in ['calc', 'sci', 'units', 'graph', 'vat', 'pct', 'tip', 'fuel', 'energy']:
        # 'sci' is the Calculator with the scientific keys on
        # 'tip' is Percent's tip, the kind with the most fields
        await p.evaluate("switchMode('calc');if(!sciMode)toggleSci()" if m == 'sci' else "switchMode('pct');setPctAction('tip')" if m == 'tip' else f"switchMode('{m}')")
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
    await p.tap('#themeButton')
    menu = await p.evaluate("(()=>{const r=themeMenu.getBoundingClientRect();return [r.top>=0,r.right<=innerWidth+1,r.bottom<=innerHeight+1,themeMenu.scrollHeight>themeMenu.clientHeight]})()")
    check(L + 'theme menu fits on the screen', all(menu[:3]), menu)
    if menu[3]:
        await p.evaluate("themeMenu.scrollTop=themeMenu.scrollHeight")
    last = await p.evaluate('THEMES[THEMES.length-1]')
    await p.tap(f'[data-theme-pick="{last}"]')
    await p.wait_for_timeout(300)
    check(L + 'last theme in the menu can be picked', await p.evaluate('document.documentElement.dataset.theme') == last)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def offline(browser):
    """The app opens without internet (sw.js), and still updates: a new version replaces the saved copy."""
    folder = Path(tempfile.mkdtemp())
    shutil.copytree(PUBLIC, folder, dirs_exist_ok=True)
    url = serve(folder)
    ctx = await browser.new_context(viewport={'width': 1280, 'height': 860})
    await ctx.add_init_script(SEED % ('en', 'dark'))
    p = await ctx.new_page()
    errors = []
    p.on('pageerror', lambda e: errors.append(str(e)))
    await p.goto(url)
    await p.evaluate("navigator.serviceWorker.ready")
    await p.wait_for_function("navigator.serviceWorker.controller!==null", timeout=5000)
    saved = "caches.open('uc-app').then(c=>c.keys()).then(k=>k.map(r=>r.url.replace(location.origin,'')))"
    await p.wait_for_function(f"{saved}.then(k=>k.some(u=>u.includes('main.js')))", timeout=5000)

    async def works(want_version):
        await p.wait_for_timeout(300)
        footer = await p.inner_text('.app-footer')
        r = await calc(p, '6*7')
        return ('v' + want_version) in footer and r == '42'

    await ctx.set_offline(True)
    await p.reload()
    check('offline: the app opens and calculates', await works(VERSION))
    await ctx.set_offline(False)

    # A new version on the server: the next load (online) shows it, and the old version's files are deleted.
    html = (folder / 'index.html').read_text().replace(f'?v={VERSION}"', '?v=9.9.9"').replace(f'>v{VERSION}<', '>v9.9.9<')
    (folder / 'index.html').write_text(html)
    (folder / 'js/core.js').write_text((folder / 'js/core.js').read_text().replace(f"VERSION='{VERSION}'", "VERSION='9.9.9'"))
    await p.reload()
    check('offline: a new version shows on the next load', await works('9.9.9'))
    await p.wait_for_timeout(500)
    keys = await p.evaluate(saved)
    check('offline: old versions are removed from the saved copy',
          not any(f'v={VERSION}' in k for k in keys) and any('v=9.9.9' in k for k in keys), keys)
    await ctx.set_offline(True)
    await p.reload()
    check('offline: the new version opens offline too', await works('9.9.9'))
    check('offline: no JavaScript errors', not errors, errors)
    await ctx.close()
    shutil.rmtree(folder, ignore_errors=True)


async def main():
    url = serve()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        for lang, theme in [('en', 'dark'), ('el', 'light')]:
            await desktop(browser, url, lang, theme)
            await scientific(browser, url, lang, theme)
            await limits(browser, url, lang, theme)
        await limits(browser, url, 'en', 'dark', phone=True)
        for lang, theme, size in [('en', 'dark', (390, 844)), ('el', 'light', (360, 740)), ('en', 'light', (820, 1180)),
                                  ('el', 'dark', (844, 390)), ('en', 'light', (740, 360))]:  # the last two: phones held sideways
            await phone(browser, url, lang, theme, size)
        await offline(browser)
        await browser.close()
    print(f'{sum(results)}/{len(results)} checks passed')
    sys.exit(0 if all(results) else 1)


if __name__ == '__main__':
    asyncio.run(main())
