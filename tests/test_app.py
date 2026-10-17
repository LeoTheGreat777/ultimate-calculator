#!/usr/bin/env python3
"""Browser tests for Ultimate Calculator. Run before every push (GitHub runs them too, before deploying):

    pip install playwright && python3 -m playwright install chromium   # once
    python3 tests/test_app.py
    python3 tests/test_app.py --site build   # the deployed version instead: after `node tools/build.mjs` (GitHub does this)

Serves public/ (or the --site folder) on a free port, checks the app in Chromium at desktop and phone sizes, in both languages and
themes, and exits with an error if anything fails. Add a check here when you add or fix a feature.
"""
import asyncio
import os
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
# What is tested: public/ as it is, or with --site DIR the site tools/build.mjs made (its scripts joined into js/app.js).
SITE = (ROOT / sys.argv[sys.argv.index('--site') + 1]).resolve() if '--site' in sys.argv else PUBLIC
SCRIPTS = re.findall(r'<script src="(js/[^"?]+)\?v=', (SITE / 'index.html').read_text())
LAST_SCRIPT = SCRIPTS[-1]  # js/main.js, or js/app.js in a built site
results = []


def check(name, ok, detail=''):
    results.append(bool(ok))
    if not ok or '-v' in sys.argv:
        print(('PASS ' if ok else 'FAIL ') + name + (f'  | {detail}' if detail != '' else ''))
    if not ok and os.environ.get('GITHUB_ACTIONS'):
        # on GitHub a failed check is also an annotation on the run, readable without opening the log
        print('::error title=' + name.replace(':', ' ').replace(',', ' ')[:200] + '::' + str(detail).replace('\n', ' ')[:900])


def serve(directory=SITE):
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
# Currency: fixed rates instead of the live ones (Frankfurter, the ECB's daily rates)
RATES_JSON = '{"amount":1.0,"base":"EUR","date":"2026-10-09","rates":{"USD":1.1206,"GBP":0.84763,"JPY":177.34,"CHF":0.9313,"TRY":55.1033}}'
X = "document.querySelector('#expression').textContent"


async def new_page(browser, url, lang='en', theme='dark', phone=False, size=None):
    w, h = size or ((390, 844) if phone else (1280, 860))
    ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=phone, has_touch=phone)
    await ctx.add_init_script(SEED % (lang, theme))
    await ctx.route('https://api.frankfurter.dev/**', lambda r: r.fulfill(status=200, content_type='application/json', body=RATES_JSON,
                                                                          headers={'Access-Control-Allow-Origin': '*'}))
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
    for keys, want in [('0.1+0.2', '0,3'), ('1/3', '0,3333333333'), ('50+10%', '55'), ('50*10%', '5'), ('2*-3', '-6'),
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
    check(L + 'tool field: thousands dots as you type', await p.evaluate('amount.value') == '123.456', await p.evaluate('amount.value'))
    await p.evaluate("amount.setSelectionRange(1,3)")
    await p.keyboard.press('Backspace')
    check(L + 'tool field: Backspace deletes the selection', await p.evaluate('amount.value') == '1.456', await p.evaluate('amount.value'))
    await p.evaluate("amount.setSelectionRange(2,2)")
    await p.keyboard.press('Backspace')
    check(L + 'tool field: Backspace right after a thousands dot deletes the digit before it', await p.evaluate('amount.value') == '456', await p.evaluate('amount.value'))
    await p.keyboard.type('1')
    check(L + 'tool field: typing keeps the cursor in place around new dots', await p.evaluate('[amount.value,amount.selectionStart]') == ['1.456', 1], await p.evaluate('[amount.value,amount.selectionStart]'))
    await p.evaluate("amount.setSelectionRange(3,3)")
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
    await p.evaluate("switchMode('pct');setToolKind('pct','discount')")
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
    check(L + 'Percent: dragging the switch picks Change', await p.evaluate('toolKind.pct') == 'change' and await p.locator('#pctFrom').count() == 1)
    await p.click('#pctFrom')
    await p.keyboard.type('80')
    await p.keyboard.press('Tab')
    await p.keyboard.type('100')
    check(L + 'Percent: 80 to 100 is +25%', await p.evaluate(R) == '+25%', await p.evaluate(R))
    await p.keyboard.press('Control+a')
    await p.keyboard.type('60')
    check(L + 'Percent: 80 to 60 is -25%', await p.evaluate(R) == '-25%', await p.evaluate(R))
    await p.click('[data-choice="tip"]')
    st = await p.evaluate("[tipBill.value,tipRate.value,tipPeople.value,tipRate.placeholder,tipPeople.placeholder]")
    check(L + 'Tip: nothing filled in, only grey hints', st[:3] == ['', '', ''] and st[3] and st[4] == '1', st)
    await p.click('#tipBill')
    await p.keyboard.type('100')
    check(L + 'Tip: no result before a tip % is typed', await p.evaluate(R) in ('', '0', '0,00 €'), await p.evaluate(R))
    await p.click('#tipRate')
    await p.keyboard.type('10')
    check(L + 'Tip: 10% on 100, People empty = one person', await p.evaluate(R) == '110,00 €', await p.evaluate(R))
    await p.click('#tipPeople')
    await p.keyboard.press('Backspace')
    await p.keyboard.type('3,5')
    check(L + 'Tip: people take whole numbers only', await p.evaluate('tipPeople.value') == '35', await p.evaluate('tipPeople.value'))
    await p.keyboard.press('Backspace')
    check(L + 'Tip: split 3 ways rounds up to the cent', await p.evaluate(R) == '36,67 €', await p.evaluate(R))
    await p.click('.tool-key[data-action="clear-all"]')
    st = await p.evaluate("[tipBill.value,tipRate.value,tipPeople.value,toolState.pct.inputs.pctFrom??'']")
    check(L + 'Percent: AC and changing kind start over (nothing filled back in)', st == ['', '', '', ''], st)
    await p.evaluate("setToolKind('pct','discount')")
    # Interest: loan payment and savings
    await p.evaluate("switchMode('loan');setToolKind('loan','loan')")
    await p.click('#loanAmount')
    for v in ['10000', '4', '5']:
        await p.keyboard.type(v)
        await p.keyboard.press('Tab')
    st = [await p.evaluate(R), await p.evaluate(X)]
    check(L + 'Interest: 10.000 at 4% for 5 years', st == ['184,17 €', t('Monthly payment · Interest: 1.050,20 €', 'Μηνιαία δόση · Τόκοι: 1.050,20 €', lang)], st)
    await p.evaluate("loanRate.value='0';loanRate.dispatchEvent(new Event('input',{bubbles:true}))")
    check(L + 'Interest: a 0% loan', await p.evaluate(R) == '166,67 €', await p.evaluate(R))
    await p.click('[data-choice="payoff"]')
    await p.click('#payAmount')
    for v in ['10000', '4', '300']:
        await p.keyboard.type(v)
        await p.keyboard.press('Tab')
    st = [await p.evaluate(R), await p.evaluate(X)]
    check(L + 'Interest: 10.000 at 4% paying 300 a month', st == [t('3 years', '3 χρόνια', lang), t('36 payments · Interest: 618,25 €', '36 δόσεις · Τόκοι: 618,25 €', lang)], st)
    await p.evaluate("payMonthly.value='30';payMonthly.dispatchEvent(new Event('input',{bubbles:true}))")
    check(L + 'Interest: a payment below the interest says so', await p.evaluate(R) == '—' and '33,33' in await p.evaluate(X), [await p.evaluate(R), await p.evaluate(X)])
    await p.evaluate("setToolKind('loan','loan');loanAmount.value='10000';loanAmount.dispatchEvent(new Event('input',{bubbles:true}))")
    await p.click('[data-choice="savings"]')
    check(L + 'Interest: changing kind clears the loan', await p.evaluate("toolState.loan.inputs.loanAmount??''") == '' and await p.locator('#saveStart').count() == 1)
    await p.click('#saveMonthly')
    for v in ['100', '3', '10']:
        await p.keyboard.type(v)
        await p.keyboard.press('Tab')
    st = [await p.evaluate(R), await p.evaluate(X)]
    check(L + 'Interest: 100 a month at 3% for 10 years', st == ['13.974,14 €', t('Of which interest: 1.974,14 €', 'Από αυτά τόκοι: 1.974,14 €', lang)], st)
    await p.evaluate('chartButton.click()')  # hidden beside the side panels; the phone tests press it
    await p.wait_for_timeout(200)
    check(L + 'Interest: the chart opens', await p.evaluate("!howModal.classList.contains('hidden')&&toolChart.width>0"))
    await p.keyboard.press('Escape')
    # Dates: date pickers; between (with working days, Greek holidays) and add days, all days or working days only
    check(L + 'Dates: Orthodox Easter 2025-2027', await p.evaluate("[2025,2026,2027].map(y=>dateText(orthodoxEaster(y))).join()") == '20/04/2025,12/04/2026,02/05/2027')
    pick = "(v)=>{for(const[k,x] of Object.entries(v)){const i=document.getElementById(k);i.value=x;i.dispatchEvent(new Event('input',{bubbles:true}))}}"
    await p.evaluate("switchMode('dates');setToolKind('dates','between');setDateCount('all')")
    check(L + 'Dates: starts from today, with details instead of keys', await p.evaluate("dateFrom.value===isoDate(todayNumber())&&keypad.classList.contains('date-details')&&!keypad.querySelector('button')"))
    await p.evaluate(pick, {'dateFrom': '2026-01-01', 'dateTo': '2026-12-31'})
    st = [await p.evaluate(R), await p.evaluate(X), await p.evaluate("keypad.textContent.includes('251')")]
    check(L + 'Dates: 2026 has 364 days between and 251 working days', st == [t('364 days', '364 ημέρες', lang), t('Working days: 251', 'Εργάσιμες: 251', lang), True], st)
    await p.click('#dateBar button')
    st = [await p.evaluate(R), await p.evaluate(X)]
    check(L + 'Dates: working days only', st == [t('251 working days', '251 εργάσιμες', lang), t('364 days in all', '364 ημέρες συνολικά', lang)], st)
    await p.evaluate(pick, {'dateTo': '2025-12-31'})
    check(L + 'Dates: dates the other way round', await p.evaluate(R) == t('1 working day', '1 εργάσιμη', lang), await p.evaluate(R))
    # on a computer: the app's own calendar
    await p.click('#dateTo')
    await p.click('.cal-nav[data-cal="next"]')
    await p.click('.cal-title')
    await p.click('.cal-title')
    await p.click('.cal-cell[data-year="2027"]')
    await p.click('.cal-cell[data-month="3"]')
    await p.click('.cal-day:not(.other)[data-day] >> text="25"')
    st = [await p.evaluate('dateTo.value'), await p.evaluate("!!document.getElementById('calPop')"), await p.evaluate("dateTo.textContent.includes('25/03/2027')")]
    check(L + 'Dates: picking 25/03/2027 in the calendar', st == ['2027-03-25', False, True], st)
    await p.click('#dateTo')
    await p.keyboard.press('ArrowRight')
    await p.keyboard.press('Enter')
    check(L + 'Dates: the calendar works with the keyboard', await p.evaluate('dateTo.value') == '2027-03-26', await p.evaluate('dateTo.value'))
    await p.click('[data-choice="add"]')
    check(L + 'Dates: Add days has the keypad, with ±', await p.evaluate("!!keypad.querySelector('.tool-key[data-value=\",\"]')&&keypad.querySelector('.tool-key[data-value=\",\"]').textContent==='±'"))
    await p.evaluate(pick, {'dateStart': '2026-10-23'})
    await p.click('.tool-key[data-value="5"]')
    st = [await p.evaluate(R), await p.evaluate(X)]
    check(L + 'Dates: 5 working days after Fri 23/10/2026 skip 28 October', st == ['02/11/2026', t('Monday · 10 days in all', 'Δευτέρα · 10 ημέρες συνολικά', lang)], st)
    await p.click('#dateBar button')
    await p.click('.tool-key[data-value=","]')
    st = [await p.evaluate('dateDays.value'), await p.evaluate(R), await p.evaluate(X)]
    check(L + 'Dates: ± goes back', st == ['-5', '18/10/2026', t('Sunday', 'Κυριακή', lang)], st)
    # Subnet: address + prefix or mask, a / jumps to the prefix; hosts -> prefix
    await p.evaluate("switchMode('net');setToolKind('net','subnet')")
    await p.click('#netIp')
    await p.keyboard.type('192.168.1.130')
    await p.keyboard.press('/')
    await p.keyboard.type('255.255.255.192')
    st = [await p.evaluate(R), await p.evaluate(X), await p.evaluate("netDetails.textContent.includes('192.168.1.191')")]
    check(L + 'Subnet: 192.168.1.130 with 255.255.255.192', st == ['192.168.1.128/26', t('62 hosts · Private · Class C', '62 συσκευές · Ιδιωτική · Κλάση C', lang), True], st)
    await p.evaluate("netPrefix.value='31';netPrefix.dispatchEvent(new Event('input',{bubbles:true}))")
    check(L + 'Subnet: /31 has 2 addresses', (await p.evaluate(X)).startswith('2 '), await p.evaluate(X))
    clear_ip = "netIp.value='';toolState.net.inputs.netIp='';setActiveToolInput(netIp)"
    await p.evaluate(clear_ip)
    await p.click('#netIp')
    await p.keyboard.type('1921681105')
    check(L + 'Subnet: dots come by themselves after three digits', await p.evaluate('netIp.value') == '192.168.110.5', await p.evaluate('netIp.value'))
    await p.evaluate(clear_ip)
    await p.keyboard.type('10.300')
    check(L + 'Subnet: a digit that would pass 255 starts the next part', await p.evaluate('netIp.value') == '10.30.0', await p.evaluate('netIp.value'))
    await p.evaluate(clear_ip)
    await p.keyboard.type('192.168.1.1')
    check(L + 'Subnet: typing the dots too still works', await p.evaluate('netIp.value') == '192.168.1.1', await p.evaluate('netIp.value'))
    await p.keyboard.type('234.')
    check(L + 'Subnet: no fifth part', await p.evaluate('netIp.value') == '192.168.1.123', await p.evaluate('netIp.value'))
    await p.evaluate(clear_ip)
    for k in ['1', '0', ',', '0', '0', '1']:
        await p.click(f'.tool-key[data-value="{k}"]')
    check(L + 'Subnet: the keypad , key types the dot', await p.evaluate('netIp.value') == '10.0.0.1', await p.evaluate('netIp.value'))
    await p.click('[data-choice="hosts"]')
    await p.click('#netHosts')
    await p.keyboard.type('50')
    st = [await p.evaluate(R), await p.evaluate(X)]
    check(L + 'Subnet: 50 hosts need a /26', st == ['/26', t('255.255.255.192 · 62 hosts', '255.255.255.192 · 62 συσκευές', lang)], st)
    await p.evaluate("setToolKind('net','subnet')")
    # Currency: the calculator's number comes along; ECB rates (stubbed above)
    await p.evaluate("switchMode('calc')")
    await calc(p, '100')
    await p.evaluate("switchMode('currency')")
    await p.wait_for_function("!rateInfo.classList.contains('loading')")
    st = await p.evaluate("[currentTab(),unitValueFrom.value,unitValueTo.value,unitFrom.value,unitTo.value,rateInfo.textContent.includes('09/10/2026'),document.querySelector('.mode-tab.active').dataset.mode]")
    check(L + 'Currency: 100 EUR is 112,06 USD', st == ['currency', '100,00', '112,06', 'EUR', 'USD', True, 'currency'], st)
    await p.evaluate("unitTo.value='JPY';unitTo.dispatchEvent(new Event('change'))")
    check(L + 'Currency: to JPY', await p.evaluate('unitValueTo.value') == '17.734,00', await p.evaluate('unitValueTo.value'))
    await p.click('#unitSwap')
    await p.click('#unitValueFrom')
    await p.keyboard.type('1')
    check(L + 'Currency: 1 JPY in EUR shows enough decimals', await p.evaluate('[unitValueFrom.value,unitValueTo.value]') == ['1', '0,005639'], await p.evaluate('[unitValueFrom.value,unitValueTo.value]'))
    await p.evaluate("switchMode('units')")
    st = await p.evaluate("[[...unitCategory.options].some(o=>o.value==='currency'),document.querySelector('.mode-tab.active').dataset.mode,!document.getElementById('rateInfo')]")
    check(L + 'Currency: Units keeps its own categories', st == [False, 'units', True], st)
    # changing mode clears the mode you leave (only Calculator -> Units carries the number)
    await p.evaluate("switchMode('vat')")
    await p.click('.tool-key[data-action="clear-all"]')
    await p.keyboard.type('50')
    await p.evaluate("switchMode('fuel');switchMode('vat')")
    st = await p.evaluate("[amount.value,vatRate.value,document.querySelector('#result').textContent]")
    # the strip's scrolling, with every mode pinned so they don't all fit
    await p.evaluate("pinnedModes=MODE_LABELS.slice();document.querySelector('.app-shell').style.width='330px';renderModeTabs()")
    await p.wait_for_timeout(100)
    bar = await p.evaluate("(()=>{const n=modeTabs,t=n.querySelector('.mode-tabs-track');t.scrollLeft=9999;t.dispatchEvent(new Event('scroll'));return [n.classList.contains('show-bar'),n.classList.contains('at-end'),!!n.querySelector('.tabs-scrollbar span').style.width]})()")
    check(L + 'tabs: the scroll bar shows while they move', bar == [True, True, True], bar)
    await p.evaluate("modeTabs.querySelector('.mode-tabs-track').scrollLeft=0")
    await p.hover('#modeTabs .mode-tab')
    tb = await p.locator('.tabs-scrollbar span').bounding_box()
    await p.mouse.move(tb['x'] + 4, tb['y'] + 1)
    await p.mouse.down()
    await p.mouse.move(tb['x'] + 600, tb['y'] + 1, steps=6)
    await p.mouse.up()
    dragged = await p.evaluate("(()=>{const t=modeTabs.querySelector('.mode-tabs-track');return t.scrollLeft>=t.scrollWidth-t.clientWidth-1})()")
    check(L + 'tabs: the bar can be dragged with the mouse', dragged)
    g = await p.evaluate("(()=>{const b=modeTabs.querySelector('.tabs-scrollbar').getBoundingClientRect(),t=modeTabs.querySelector('.mode-tabs-track').getBoundingClientRect();return [Math.round(b.left-t.left),Math.round(b.right-t.right)]})()")
    check(L + 'tabs: the bar spans the whole tab strip', g == [0, 0], g)
    await p.evaluate("modeTabs.querySelector('.mode-tabs-track').scrollLeft=0")
    tab = await p.locator('.mode-tab[data-mode="graph"]').bounding_box()
    await p.mouse.move(tab['x'] + 20, tab['y'] + 10)
    await p.mouse.down()
    await p.mouse.move(tab['x'] - 150, tab['y'] + 10, steps=6)
    await p.mouse.up()
    moved = [await p.evaluate("modeTabs.querySelector('.mode-tabs-track').scrollLeft>100"), await p.evaluate('mode')]
    check(L + 'tabs: dragging the tabs with the mouse scrolls them without switching', moved == [True, 'vat'], moved)
    pulled = await p.evaluate("(()=>{const t=modeTabs.querySelector('.mode-tabs-track');t.scrollLeft=0;syncTabEdges();const s=modeTabs.querySelector('.tabs-scrollbar span'),w=s.getBoundingClientRect().width;tabsPull=30;syncTabEdges();const r=[s.getBoundingClientRect().width<w-20,Math.round(s.getBoundingClientRect().left-modeTabs.querySelector('.tabs-scrollbar').getBoundingClientRect().left)];tabsPull=0;syncTabEdges();return r})()")
    check(L + 'tabs: pulled past the start, the thumb shrinks against it', pulled == [True, 0], pulled)
    await p.evaluate("pinnedModes=readPins();document.querySelector('.app-shell').style.width='';renderModeTabs()")
    check(L + 'mode change: VAT starts empty again', st == ['', '24', '0'], st)
    await p.evaluate("switchMode('calc')")
    await calc(p, '5+3')
    await p.evaluate("switchMode('vat');switchMode('calc')")
    check(L + 'mode change: Calculator starts at 0 again', [await p.evaluate(R), await p.evaluate(X)] == ['0', ''], [await p.evaluate(R), await p.evaluate(X)])
    await p.keyboard.type('12')
    await p.evaluate("switchMode('units')")
    moved = await p.evaluate("unitExpressions[unitSource]")
    await p.evaluate("switchMode('calc');switchMode('units')")
    check(L + 'mode change: Calculator -> Units carries the number, leaving Units clears it',
          moved == '12' and await p.evaluate("unitExpressions[unitSource]") == '0', [moved, await p.evaluate("unitExpressions")])
    await p.evaluate("switchMode('vat')")
    await p.keyboard.type('77')
    await p.reload()
    await p.wait_for_timeout(300)
    await p.evaluate("switchMode('vat')")
    check(L + 'typed values are not kept after a reload', await p.evaluate('amount.value') == '', await p.evaluate('amount.value'))
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
    names = 'Δημιουργός: Λεωνίδας Κάμπαξης' if other == 'el' else 'Created by Leonidas Kampaxis'
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
    for name in await p.evaluate("[...LIGHT_PRESETS,...DARK_PRESETS]"):
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
    check(L + 'f(x) shows 25 scientific keys (memory included), the Deg key, and no second chip on the display', await p.locator('.sci-key').count() == 25
          and await p.inner_text('[data-sci="angle"]') == 'Deg' and await p.locator('#sciBar button').count() == 1)

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
    await p.wait_for_timeout(100)
    check(L + 'result then x²: 0,333333² = 0,111111 (10 decimals each when they fit)', [await p.evaluate(X), await p.evaluate(R)] in (['0,333333²', '0,111111'], ['0,3333333333²', '0,1111111111']),
          [await p.evaluate(X), await p.evaluate(R)])
    # 2nd: inverse functions; Deg/Rad
    await p.click('[data-sci="2nd"]')
    got = await keys('0', ',', '5', 'sci:asin', '=')
    check(L + '2nd sin = sin⁻¹: sin⁻¹(0,5) = 30°', got == ['sin⁻¹(0,5)', '30'], got)
    await p.click('[data-sci="2nd"]')
    await p.click('[data-sci="angle"]')
    check(L + 'Rad on', await p.inner_text('[data-sci="angle"]') == 'Rad')
    got = await keys('sci:pi', 'sci:sin', '=')
    check(L + 'sin(π) = 0 in radians', got[1] == '0', got)
    await p.click('[data-sci="angle"]')
    # mistakes give Error, not nonsense
    got = await keys('1', '±', 'sci:sqrt', '=')
    check(L + '√(−1) = i (complex numbers)', got[1] == 'i', got)
    await p.keyboard.press('Escape')
    got = await keys('0', 'sci:ln', '=')
    check(L + 'ln(0) = Error', got[1] == ('Σφάλμα' if lang == 'el' else 'Error'), got)
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
    check(L + 'History shows sin(30)', await p.evaluate("document.querySelector('#historyList .history-expression').textContent") == 'sin(30)')
    check(L + 'explanation: sin(30°) = 0,5', 'sin(30°) = 0,5' in await p.evaluate("howData.steps.map(s=>s.text||s).join('|')"))
    # the choice is remembered; Units keeps its own keypad
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'Scientific kept after reload', await p.locator('.sci-key').count() == 25)
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
    check(L + 'VAT: 15 digits, total as × 10ⁿ', got == ['999.999.999.999.999', '1,24 × 10¹⁵ €'], got)
    # Graph: functions of up to 120 characters; the view stays where numbers are precise
    got = await p.evaluate("(()=>{switchMode('graph');graphKey('clear');for(let i=0;i<100;i++){graphKey('x');graphKey('+')}graph.view={cx:1e15,cy:0,ux:1e9,uy:40};drawGraph();return [graph.fns[graph.active].length,graph.view.cx,graph.view.ux]})()")
    check(L + 'Graph: 120 characters, view limited', got[0] <= 120 and got[1] == 1e12 and got[2] <= 0.1, got)
    await p.evaluate("graphKey('clear');graph.view=null")
    await p.evaluate("graphKey('x');switchMode('calc');switchMode('graph')")
    st = await p.evaluate("[graph.fns.join('|'), localStorage.getItem('uc-graph')]")
    check(L + 'mode change: Graph goes back to its example', st == ['x^2-2x-3', None], st)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def phone(browser, url, lang, theme, size):
    p = await new_page(browser, url, lang, theme, phone=True, size=size)
    L = f'[phone {size[0]}x{size[1]} {lang} {theme}] '
    for key in ['5', '+', '3']:
        await p.tap(f'.key[data-value="{key}"]')
    await p.tap('.key[data-action="equals"]')
    check(L + 'keypad works', await p.evaluate(R) == '8')
    for m in ['calc', 'sci', 'units', 'currency', 'graph', 'vat', 'pct', 'tip', 'loan', 'savings', 'dates', 'fuel', 'energy', 'net', 'prog', 'numbers', 'factors', 'equation', 'sys2', 'stats']:
        # 'sci' is the Calculator with the scientific keys on
        # 'tip' is Percent's tip, the kind with the most fields
        await p.evaluate("switchMode('calc');if(!sciMode)toggleSci()" if m == 'sci' else "switchMode('pct');setToolKind('pct','tip')" if m == 'tip'
                         else "switchMode('loan');setToolKind('loan','savings')" if m == 'savings'
                         else "switchMode('numbers');setToolKind('numbers','factors')" if m == 'factors'
                         else "switchMode('equation');setToolKind('equation','sys2')" if m == 'sys2'
                         else "switchMode('prog');progHex.value='DEADBEEFCAFE';progHex.dispatchEvent(new Event('input',{bubbles:true}))" if m == 'prog'
                         else "switchMode('stats');for(const v of ['12','1234,75','-3','15,5','9']){statX.value=v;statX.dispatchEvent(new Event('input',{bubbles:true}));statAdd()}" if m == 'stats'
                         else "switchMode('net');setToolKind('net','subnet');for(const[k,v] of [['netIp','10.0.0.5'],['netPrefix','16']]){const i=document.getElementById(k);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}" if m == 'net' else f"switchMode('{m}')")
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
            gap = await p.evaluate("innerHeight-document.querySelector('.app-footer').getBoundingClientRect().bottom")
            check(L + f'{m}: sideways the card reaches the bottom (no empty strip)', gap <= 14, gap)
        if m == 'stats':
            cut = await p.evaluate("[...document.querySelectorAll('#statDetails strong,#statDetails span')].filter(s=>s.offsetParent&&s.scrollWidth>s.clientWidth+1).map(s=>s.textContent)")
            check(L + 'stats: no detail is cut off', not cut, cut)
        if m == 'net':
            cut = await p.evaluate("[...document.querySelectorAll('#netDetails strong')].filter(s=>s.offsetParent&&s.scrollWidth>s.clientWidth+1).map(s=>s.textContent)")
            check(L + 'net: no detail value is cut off', not cut, cut)
    width = await p.evaluate('document.documentElement.scrollWidth')
    check(L + 'no sideways scrolling', width <= size[0], width)
    await p.tap('#themeButton')
    menu = await p.evaluate("(()=>{const r=themeMenu.getBoundingClientRect();return [r.top>=0,r.right<=innerWidth+1,r.bottom<=innerHeight+1,themeMenu.scrollHeight>themeMenu.clientHeight]})()")
    check(L + 'theme menu fits on the screen', all(menu[:3]), menu)
    if menu[3]:
        await p.evaluate("themeMenu.scrollTop=themeMenu.scrollHeight")
    last = await p.evaluate('DARK_PRESETS[DARK_PRESETS.length-1]')
    await p.tap(f'[data-theme-pick="{last}"]')
    await p.wait_for_timeout(300)
    check(L + 'last theme in the menu can be picked', await p.evaluate('document.documentElement.dataset.theme') == last)
    # the own theme editor (the menu's last item) fits on the screen
    await p.tap('#themeButton')
    await p.evaluate("themeMenu.scrollTop=themeMenu.scrollHeight")
    await p.tap('[data-theme-pick="custom-dark"]')
    await p.wait_for_timeout(200)
    ed = await p.evaluate("(()=>{const r=themeEditor.getBoundingClientRect(),b=document.querySelector('#themeEditor [data-te-close]').getBoundingClientRect();return [r.left>=0,r.right<=innerWidth+1,r.top>=0,r.bottom<=innerHeight+1,b.top>=0]})()")
    check(L + 'own theme editor fits on the screen', all(ed), ed)
    await p.tap('#themeEditor [data-te-close]')
    check(L + 'own theme editor: × closes it', not await p.evaluate('themeEditorOpen()'))
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def preview_site(browser):
    """The test version (preview branch) is published at /preview/ on the same site: it works from there, is marked
    Preview, and the app at / and the one at /preview/ keep separate offline copies that don't delete each other's files."""
    L = '[preview] '
    folder = Path(tempfile.mkdtemp())
    shutil.copytree(SITE, folder, dirs_exist_ok=True)
    shutil.copytree(SITE, folder / 'preview', dirs_exist_ok=True)
    url = serve(folder)
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    await ctx.add_init_script(SEED % ('en', 'dark'))
    p = await ctx.new_page()
    errors = []
    p.on('pageerror', lambda e: errors.append(str(e)))
    await p.goto(url)
    await p.evaluate("navigator.serviceWorker.ready")
    check(L + 'the app at / has no Preview mark', not await p.evaluate("!!document.querySelector('.preview-badge')"))
    await p.goto(url + 'preview/')
    await p.evaluate("navigator.serviceWorker.ready")
    await p.wait_for_timeout(300)
    got = await p.evaluate("[document.querySelector('.preview-badge')?.textContent,document.title]")
    check(L + 'the version at /preview/ is marked Preview', got[0] == 'Preview' and got[1].endswith('(preview)'), got)
    check(L + 'it calculates', await calc(p, '6*7') == '42')
    await p.evaluate("setLanguage('el')")
    await p.wait_for_timeout(600)
    check(L + 'the mark follows the language', await p.evaluate("document.querySelector('.preview-badge').textContent") == 'Δοκιμαστική')
    keys = lambda name: f"caches.open('{name}').then(c=>c.keys()).then(k=>k.map(r=>new URL(r.url).pathname))"
    await p.wait_for_function(f"{keys('uc-app/preview/')}.then(k=>k.some(u=>u.endsWith('/preview/{LAST_SCRIPT}')))", timeout=5000)
    await p.goto(url)
    await p.wait_for_timeout(800)
    got = await p.evaluate(f"Promise.all([{keys('uc-app')},{keys('uc-app/preview/')}])")
    check(L + 'separate offline copies: / has no /preview/ files, and /preview/ keeps its own',
          any(u == '/' + LAST_SCRIPT for u in got[0]) and not any(u.startswith('/preview/') for u in got[0]) and any(u.endswith('/preview/' + LAST_SCRIPT) for u in got[1]), got)
    check(L + 'no JavaScript errors', not errors, errors)
    await ctx.close()


async def offline(browser):
    """The app opens without internet (sw.js), and still updates: a new version replaces the saved copy."""
    folder = Path(tempfile.mkdtemp())
    shutil.copytree(SITE, folder, dirs_exist_ok=True)
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
    await p.wait_for_function(f"{saved}.then(k=>k.some(u=>u.includes('{LAST_SCRIPT}')))", timeout=5000)

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
    for js in SCRIPTS:  # VERSION is in core.js, or in app.js (written VERSION="...") in a built site
        (folder / js).write_text(re.sub(r'VERSION=([\'"])' + re.escape(VERSION) + r'\1', 'VERSION="9.9.9"', (folder / js).read_text()))
    # an app left open (a phone in the background) updates when it comes back to the screen
    await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    await p.wait_for_function("document.querySelector('#footerVersion').textContent==='v9.9.9'", timeout=5000)
    check('offline: an app left open updates when it comes back to the screen', await works('9.9.9'))
    await p.evaluate("window.__stayed=1;document.dispatchEvent(new Event('visibilitychange'))")
    await p.wait_for_timeout(800)
    check('offline: no reload when the version is current', await p.evaluate("window.__stayed===1&&lastVersionCheck>0"))
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


async def currency_offline(browser, url):
    """No internet: Currency still converts, with the rates shipped with the app, and says it's offline."""
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    await ctx.add_init_script(SEED % ('en', 'dark'))
    await ctx.route('https://api.frankfurter.dev/**', lambda r: r.abort())
    p = await ctx.new_page()
    await p.goto(url)
    await p.evaluate("switchMode('currency')")
    await p.wait_for_function("!rateInfo.classList.contains('loading')")
    for k in ['1', '0']:
        await p.tap(f'.key[data-value="{k}"]')
    st = await p.evaluate("[unitValueTo.value!=='0',rateInfo.textContent.includes('offline'),unitTo.options[unitTo.selectedIndex].textContent]")
    check('Currency offline: converts with the shipped rates and says offline', st == [True, True, 'USD'], st)
    await ctx.unroute('https://api.frankfurter.dev/**')
    await ctx.route('https://api.frankfurter.dev/**', lambda r: r.fulfill(status=200, content_type='application/json', body=RATES_JSON.replace('2026-10-09', '2026-10-10'),
                                                                          headers={'Access-Control-Allow-Origin': '*'}))
    await p.evaluate("switchMode('calc');rates.checked=0;document.dispatchEvent(new Event('visibilitychange'))")
    await p.wait_for_function("JSON.parse(localStorage.getItem('uc-rates')||'{}').date==='2026-10-10'", timeout=5000)
    check('Currency: back online, new rates are saved in the background on any tab', True)
    await ctx.close()


async def own_themes(browser, url):
    """Own themes: made from a background and an accent, the editor, Match device with a light and a dark theme."""
    L = '[own themes] '
    p = await new_page(browser, url, 'en', 'dark')
    T = 'document.documentElement.dataset.theme'
    var = "getComputedStyle(document.documentElement).getPropertyValue('%s').trim()"
    await p.keyboard.type('12')
    await p.click('#themeButton')
    check(L + 'own themes not made yet read "Custom…"', await p.locator('[data-theme-pick="custom-dark"]').inner_text() == 'Custom…'
          and await p.locator('[data-theme-edit]').count() == 0)
    await p.click('[data-theme-pick="custom-dark"]')
    check(L + 'tapping it opens the editor and shows it live', await p.evaluate("themeEditorOpen()&&!themeMenuOpen()") and await p.evaluate(T) == 'custom-dark')
    check(L + 'it starts from the colours of the theme in use', await p.evaluate("[themeDraft.bg,themeDraft.accent]") == ['#070a0f', '#6ea8fe'])
    check(L + 'no Save or Cancel buttons, only ×', await p.locator('#themeEditor button:not(.te-sw)').count() == 1)
    await p.click('[data-te-row="accent"] [data-te-colour="#ff4fa3"]')
    await p.wait_for_timeout(50)
    check(L + 'a swatch recolours the app at once', await p.evaluate(var % '--accent') == '#ff4fa3')
    await p.keyboard.press('5')
    check(L + 'keys go to the editor, not the calculator', await p.evaluate(R) == '12')
    # the device's colour picker sends many changes while dragging: the input must stay (else the picker closes)
    st = await p.evaluate("""(async()=>{const i=document.querySelector('[data-te-pick=accent]');
      for(const c of ['#ff0000','#ff8800','#22cc66']){i.value=c;i.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>requestAnimationFrame(r))}
      await new Promise(r=>requestAnimationFrame(r));
      return [i.isConnected,document.querySelector('[data-te-pick=accent]')===i,themeEditorOpen(),themeDraft.accent,
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),i.closest('.te-any').classList.contains('on')]})()""")
    check(L + 'dragging in the colour picker keeps it open and recolours live', st[:4] == [True, True, True, '#22cc66'] and st[4] != '#ff4fa3' and st[5], st)
    await p.keyboard.press('Escape')
    st = await p.evaluate("[themeEditorOpen(),theme,document.documentElement.dataset.theme,JSON.parse(localStorage.getItem('uc-custom-themes')).dark.accent]")
    check(L + 'Esc closes and keeps the colours', st == [False, 'custom-dark', 'custom-dark', '#22cc66'], st)
    await p.click('#themeButton')
    await p.click('[data-theme-edit="dark"]')
    recent = await p.evaluate("[...document.querySelectorAll('[data-te-recent]')].map(b=>[b.style.getPropertyValue('--b'),b.style.getPropertyValue('--c'),b.getAttribute('aria-checked')])")
    check(L + 'Recent has the new colours and where you started', recent == [['#070a0f', '#22cc66', 'true'], ['#070a0f', '#6ea8fe', 'false']], recent)
    await p.click('[data-te-recent="1"]')
    await p.wait_for_timeout(50)
    check(L + 'a Recent pair brings those colours back', await p.evaluate("[themeDraft.bg,themeDraft.accent]") == ['#070a0f', '#6ea8fe']
          and await p.evaluate(var % '--accent') == '#6ea8fe')
    await p.click('[data-te-row="bg"] [data-te-colour="#1c1030"]')
    await p.click('[data-te-row="accent"] [data-te-colour="#a3e635"]')
    await p.mouse.click(400, 300)  # outside the panel
    st = await p.evaluate("[themeEditorOpen(),theme,localStorage.getItem('uc-theme'),document.documentElement.dataset.theme,getComputedStyle(document.body).backgroundColor]")
    check(L + 'a tap outside closes it and keeps the own theme', st == [False, 'custom-dark', 'custom-dark', 'custom-dark', 'rgb(28, 16, 48)'], st)
    check(L + 'Recent keeps at most 8, newest first', await p.evaluate("themeRecent.dark.length<=8&&themeRecent.dark[0].bg==='#1c1030'"))
    accent = await p.evaluate(var % '--accent')
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'kept after a reload (the <head> script applies it before the first paint)',
          await p.evaluate(T) == 'custom-dark' and await p.evaluate(var % '--accent') == accent)
    await p.click('#themeButton')
    check(L + 'a made own theme shows its colours, a check and an edit button',
          await p.locator('[data-theme-pick="custom-dark"]').inner_text() == 'Custom\n✓' and await p.locator('[data-theme-edit="dark"]').count() == 1
          and await p.evaluate("getComputedStyle(document.querySelector('[data-theme-pick=custom-dark] .theme-swatch')).backgroundColor") == 'rgb(28, 16, 48)')
    await p.click('[data-theme-edit="dark"]')
    check(L + 'the edit button opens the editor with the saved colours',
          await p.evaluate("[...document.querySelectorAll('#themeEditor [data-te-colour][aria-checked=true]')].map(e=>e.dataset.teColour)") == ['#1c1030', '#a3e635'])
    await p.keyboard.press('ArrowRight')
    check(L + '→ picks the next swatch in the row', await p.evaluate("themeDraft.bg") == '#0c2018')
    await p.evaluate("setLanguage('el')")
    await p.wait_for_timeout(500)
    check(L + 'the editor changes language in place', await p.locator('#themeEditorTitle').inner_text() == 'Προσαρμοσμένο σκοτεινό θέμα' and await p.evaluate('themeEditorOpen()'))
    await p.evaluate("setLanguage('en')")
    await p.wait_for_timeout(500)
    # any colour: a background is kept in its group (a white one for a dark theme becomes dark)
    await p.evaluate("(()=>{const i=document.querySelector('[data-te-pick=bg]');i.value='#ffffff';i.dispatchEvent(new Event('input',{bubbles:true}))})()")
    st = await p.evaluate("[themeDraft.bg,relLum(hexRgb(themeDraft.bg))<=0.021,document.querySelector('#themeEditor .te-any').classList.contains('on')]")
    check(L + 'any colour: a dark theme\'s background stays dark', st[1:] == [True, True], st)
    await p.click('#themeEditor [data-te-close]')
    check(L + '× closes it', not await p.evaluate('themeEditorOpen()'))
    # readable whatever is picked: text, muted text, the accent on keys, text on the accent
    bad = await p.evaluate("""(()=>{const bad=[];
      for(const g of ['light','dark'])for(const bg of ['#ffffff','#000000','#ff0000','#ffff00','#0000ff','#808080'])
       for(const a of ['#ffff00','#000000','#ffffff','#808080','#00ff00','#0000ff','#ff4fa3','#3478e5']){
        const v=deriveTheme(g,bg,a),c=k=>hexRgb(v[k]),r=(x,y)=>contrastRatio(c(x),c(y));
        const ok=r('--text','--card')>=7&&r('--text','--key')>=7&&r('--muted','--card')>=4.5&&r('--accent','--card')>=3&&r('--accent','--key')>=3
          &&r('--on-accent','--accent')>=4.5&&['--series2','--series3'].every(s=>r(s,'--card')>=3)&&(g==='dark')===(relLum(c('--bg'))<0.2);
        if(!ok)bad.push([g,bg,a]);}
      return bad})()""")
    check(L + 'every derived theme is readable', not bad, bad[:5])
    # Match device: on keeps the theme in use as its group's choice; then one light and one dark theme
    await p.click('#themeButton')
    await p.click('[data-theme-auto]')
    await p.wait_for_timeout(650)
    st = await p.evaluate("[theme,themePair.dark,themeMenuOpen(),document.querySelector('[data-theme-auto]').getAttribute('aria-checked')]")
    check(L + 'Match device on: the own theme becomes the dark one, the menu stays open', st == ['auto', 'custom-dark', True, 'true'], st)
    await p.click('[data-theme-pick="paper"]')
    await p.wait_for_timeout(650)
    checked = await p.evaluate("[...document.querySelectorAll('#themeMenu [data-theme-pick][aria-checked=true]')].map(e=>e.dataset.themePick)")
    check(L + 'with Match device one light and one dark are checked', checked == ['paper', 'custom-dark'] and await p.evaluate('themeMenuOpen()'), checked)
    await p.emulate_media(color_scheme='light')
    await p.wait_for_timeout(100)
    check(L + 'a light device shows the light one', await p.evaluate(T) == 'paper')
    await p.emulate_media(color_scheme='dark')
    await p.wait_for_timeout(100)
    check(L + 'a dark device shows the dark one', await p.evaluate(T) == 'custom-dark')
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'Match device kept after a reload', await p.evaluate(T) == 'custom-dark' and await p.evaluate("themePair.light") == 'paper')
    await p.emulate_media(color_scheme='light')
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'the <head> script picks the light one on a light device', await p.evaluate(T) == 'paper')
    await p.click('#themeButton')
    await p.click('[data-theme-pick="custom-light"]')
    await p.click('[data-te-row="accent"] [data-te-colour="#ef4444"]')
    await p.keyboard.press('Enter')
    check(L + 'Enter closes; with Match device the own light theme becomes the light one',
          await p.evaluate("[theme,themePair.light,document.documentElement.dataset.theme,document.querySelector('#themeButton').dataset.icon]") == ['auto', 'custom-light', 'custom-light', 'sun'])
    await p.click('#themeButton')
    await p.click('[data-theme-auto]')
    await p.wait_for_timeout(100)
    check(L + 'Match device off: the theme on screen stays', await p.evaluate("[theme,document.documentElement.dataset.theme]") == ['custom-light', 'custom-light'])
    # broken or old saved values fall back safely
    for saved, pair, expect in [('custom-light', None, 'light'), ('auto', '{"light":"black","dark":"paper"}', 'light'), ('nonsense', None, 'dark')]:
        await p.evaluate(f"localStorage.removeItem('uc-custom-themes');localStorage.setItem('uc-theme','{saved}');" +
                         (f"localStorage.setItem('uc-theme-pair','{pair}')" if pair else "localStorage.removeItem('uc-theme-pair')"))
        await p.reload()
        await p.wait_for_timeout(200)
        check(L + f'saved theme {saved} {pair or ""} falls back to {expect}', await p.evaluate(T) == expect and await p.evaluate("resolvedTheme()") == expect)
    # the menu stays open while its switch and the other slot change (colours that stay the same re-draw it at once)
    await p.emulate_media(color_scheme='dark')
    await p.evaluate("localStorage.clear();localStorage.setItem('uc-defaults','1');localStorage.setItem('uc-lang','en');localStorage.setItem('uc-theme','dark')")
    await p.reload()
    await p.wait_for_timeout(200)
    await p.click('#themeButton')
    states = []
    for sel in ['[data-theme-auto]', '[data-theme-pick="paper"]', '[data-theme-auto]', '[data-theme-auto]']:
        await p.click(sel)
        await p.wait_for_timeout(50)
        states.append(await p.evaluate("[themeMenuOpen(),theme,document.documentElement.dataset.theme]"))
    check(L + 'Match device switch and the other slot keep the menu open', states == [[True, 'auto', 'dark'], [True, 'auto', 'dark'], [True, 'dark', 'dark'], [True, 'auto', 'dark']], states)
    await p.click('#calculatorDisplay')
    check(L + 'a click outside still closes the menu', not await p.evaluate('themeMenuOpen()'))
    await p.emulate_media(color_scheme='light')
    # the removed ready-made themes (0.14.2) become the own theme, with the same colours
    for saved, pair, custom, expect in [
            ('sky', None, None, {'theme': 'custom-light', 'shown': 'custom-light', 'bg': '#eef6fb', 'recent': []}),
            ('auto', '{"light":"rose","dark":"ocean"}', None, {'theme': 'auto', 'pair': ['custom-light', 'custom-dark'], 'shown': 'custom-light', 'bg': '#fbf1f3'}),
            ('ember', '{"light":"rose","dark":"dark"}', '{"dark":{"bg":"#1c1030","accent":"#a3e635"}}',
             {'theme': 'custom-dark', 'shown': 'custom-dark', 'bg': '#120c08', 'recent': ['#120c08', '#1c1030'], 'lightRecent': ['#fbf1f3'], 'pair': ['light', 'dark']})]:
        await p.evaluate("localStorage.clear();localStorage.setItem('uc-defaults','1');localStorage.setItem('uc-lang','en');" +
                         f"localStorage.setItem('uc-theme','{saved}');" + (f"localStorage.setItem('uc-theme-pair','{pair}');" if pair else '') +
                         (f"localStorage.setItem('uc-custom-themes','{custom}');" if custom else ''))
        await p.reload()
        await p.wait_for_timeout(200)
        got = await p.evaluate("""({theme,shown:document.documentElement.dataset.theme,pair:[themePair.light,themePair.dark],
          bg:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),saved:localStorage.getItem('uc-theme'),
          recent:themeRecent.dark.map(r=>r.bg),lightRecent:themeRecent.light.map(r=>r.bg)})""")
        ok = all(got[k] == v for k, v in expect.items()) and got['saved'] == expect['theme']
        check(L + f'removed theme {saved} {pair or ""} becomes the own theme', ok, got)
        await p.reload()
        await p.wait_for_timeout(200)
        check(L + f'removed theme {saved}: the same after another reload', await p.evaluate(T) == expect['shown'])
    await p.click('#themeButton')
    check(L + 'the menu has Match device, 2 + Custom light, 2 + Custom dark', await p.locator('#themeMenu .theme-option').count() == 7)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def icons(browser, url):
    """The icons: every file the manifest and the page name loads, and they match tools/make-icons.py (the one drawing)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location('make_icons', ROOT / 'tools/make-icons.py')
    mk = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mk)
    html = (PUBLIC / 'index.html').read_text()
    check('[icons] icon.svg and favicon.svg are what tools/make-icons.py draws',
          (PUBLIC / 'icon.svg').read_text() == mk.ICON and (PUBLIC / 'favicon.svg').read_text() == mk.FAVICON)
    check('[icons] the logo by the title is what tools/make-icons.py draws', mk.LOGO in html)
    p = await new_page(browser, url, 'en', 'dark')
    st = await p.evaluate("""(async()=>{const m=await (await fetch('manifest.webmanifest')).json();
      const srcs=[...m.icons.map(i=>i.src),document.querySelector('link[rel=icon]').getAttribute('href'),document.querySelector('link[rel=apple-touch-icon]').getAttribute('href')];
      const ok=await Promise.all(srcs.map(s=>fetch(s).then(r=>r.ok).catch(()=>false)));
      return {srcs,ok,purposes:m.icons.map(i=>i.purpose)}})()""")
    check('[icons] every icon in the manifest and the page loads', all(st['ok']), st)
    check('[icons] the manifest has any, maskable and monochrome icons', {'any', 'maskable', 'monochrome'} <= set(st['purposes']), st['purposes'])
    shown = await p.evaluate("[...document.querySelectorAll('.brand-mark .bm-curve,.brand-mark .bm-dot')].map(e=>getComputedStyle(e).stroke+'|'+getComputedStyle(e).fill)")
    check('[icons] the logo by the title takes the theme\'s colours', len(shown) == 2 and 'rgb(110, 168, 254)' in shown[0], shown)
    # tab icons: drawn, not symbol characters (iPhone drew ↔ ◷ tiny and low); € % $ are letters
    await p.evaluate("openModes()")
    tabs = await p.evaluate("""[...document.querySelectorAll('#modesList .mode-pick')].map(b=>{const i=b.querySelector('.mode-pick-icon'),r=i.getBoundingClientRect();
      return {m:b.dataset.mode,svg:!!i.querySelector('svg'),text:i.textContent.trim(),w:Math.round(r.width),h:Math.round(r.height)}})""")
    await p.evaluate("closeModes()")
    drawn = [x for x in tabs if x['svg']]
    check('[icons] tab icons are drawn, except the letters € % $',
          {x['m'] for x in tabs if not x['svg']} == {'vat', 'pct', 'currency'} and len(drawn) == len(tabs) - 3, tabs)
    check('[icons] drawn tab icons are all the same size', len({(x['w'], x['h']) for x in drawn}) == 1, drawn)
    check('[icons] no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def no_fuel_log(browser, url):
    """The fuel log was removed: no save/list buttons in Fuel, and entries saved by older versions are cleared."""
    p = await new_page(browser, url, 'en', 'dark')
    await p.evaluate("localStorage.setItem('uc-fuel-log','[{\"d\":1,\"c\":1,\"p\":1}]')")
    await p.reload()
    await p.wait_for_timeout(200)
    await p.evaluate("switchMode('fuel')")
    await p.wait_for_timeout(100)
    got = await p.evaluate("[document.querySelectorAll('#fuelSaveButton,#fuelLogButton,.fuel-btn').length,localStorage.getItem('uc-fuel-log')]")
    check('[fuel] no fuel log buttons, old saved entries cleared', got == [0, None], got)
    check('[fuel] no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def tool_charts(browser, url, phone):
    """The tool charts: Fuel's what-if grid, VAT at every Greek rate, Energy per period, a loan year by year."""
    L = '[charts%s] ' % (' phone' if phone else '')
    p = await new_page(browser, url, 'en', 'dark', phone=phone)
    async def fill(m, fields, kind=None):
        await p.evaluate(f"switchMode('{m}')")
        if kind:
            await p.evaluate(f"setToolKind('loan','{kind}')")
        for fid, v in fields:
            await p.evaluate(f"(()=>{{const e=document.getElementById('{fid}');e.value='{v}';e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()")
        await p.evaluate("showToolChart()")
        await p.wait_for_timeout(150)
        fits = await p.evaluate("(()=>{const c=document.querySelector('#howModal .modal-card');return c.scrollWidth<=c.clientWidth+1})()")
        check(L + f'{m} {kind or ""}: nothing sticks out sideways', fits)
    await fill('fuel', [['fuelD', '70'], ['fuelC', '4,5'], ['fuelP', '2,3']])
    got = await p.evaluate("[[...document.querySelectorAll('#howContent .what-if td')].map(t=>t.textContent),document.querySelector('#howContent .what-if td.me').textContent,document.querySelector('#result').textContent,document.querySelector('#toolChartLegend').textContent]")
    check(L + 'fuel: 3 × 3 grid, the middle is the result', len(got[0]) == 9 and got[0][4] == got[1] == got[2] == '7,24 €' and got[0][0] == '6,16 €' and got[0][8] == '8,40 €', got)
    check(L + 'fuel: return trip and per 100 km', '14,49 €' in got[3] and '10,35 €' in got[3], got[3])
    await p.evaluate("closeHow()")
    await fill('vat', [['amount', '100']])
    got = await p.evaluate("[...document.querySelectorAll('#toolChartBody .crow')].map(r=>r.querySelector('.cl').textContent+'='+r.querySelector('.cv').firstChild.textContent+(r.classList.contains('hl')?'*':''))")
    check(L + 'vat: the amount at 24, 13 and 6%, the rate typed highlighted', got == ['24%=124,00 €*', '13%=113,00 €', '6%=106,00 €'], got)
    await p.evaluate("closeHow()")
    await p.evaluate("(()=>{const e=document.getElementById('vatRate');e.value='17';e.dispatchEvent(new Event('input',{bubbles:true}))})()")
    await p.evaluate("showToolChart()")
    await p.wait_for_timeout(150)
    got = await p.evaluate("[...document.querySelectorAll('#toolChartBody .crow .cl')].map(r=>r.textContent)")
    check(L + 'vat: another rate typed is added in its place', got == ['24%', '17%', '13%', '6%'], got)
    await p.evaluate("closeHow()")
    await fill('energy', [['energyP', '2000'], ['energyH', '3'], ['energyD', '30'], ['energyR', '0,15']])
    got = await p.evaluate("[...document.querySelectorAll('#toolChartBody .crow')].map(r=>r.querySelector('.cl').textContent+'='+r.querySelector('.cv').textContent+(r.classList.contains('hl')?'*':''))")
    check(L + 'energy: hour, day, month (the days typed) and year with kWh',
          got == ['Hour=0,30 €2 kWh', 'Day=0,90 €6 kWh', 'Month=27,00 €180 kWh*', 'Year=328,50 €2.190 kWh'], got)
    await p.evaluate("closeHow()")
    for kind, fields, total in [('loan', [['loanAmount', '20000'], ['loanRate', '5'], ['loanYears', '5']], 2645.20),
                                ('payoff', [['payAmount', '10000'], ['payRate', '5'], ['payMonthly', '300']], 788.72)]:
        await fill('loan', fields, kind)
        got = await p.evaluate("[...document.querySelectorAll('#toolChartBody .crow .cv')].map(v=>v.firstChild.textContent)")
        cents = sum(int(x.replace(' €', '').replace('.', '').replace(',', '')) for x in got)
        check(L + f'{kind}: a row per year, the interest adds up to the total', len(got) == (5 if kind == 'loan' else 3) and cents == round(total * 100), [got, cents])
        await p.evaluate("closeHow()")
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def field_limits(browser, url, phone):
    """Number fields: thousands dots, pasted numbers, sensible tops (refused, the label says how far) and no − where it makes no sense."""
    L = '[fields%s] ' % (' phone' if phone else '')
    p = await new_page(browser, url, 'en', 'dark', phone=phone)
    keys = lambda fid, ks: p.evaluate(f"(()=>{{setActiveToolInput(document.getElementById('{fid}'));for(const k of {list(ks)!r})toolKeyInput(k)}})()")
    val = lambda fid: p.evaluate(f"document.getElementById('{fid}').value")
    await p.evaluate("switchMode('fuel')")
    await keys('fuelD', '10000')
    await keys('fuelC', '5')
    await keys('fuelP', '2')
    check(L + 'fuel: 10000 shows 10.000 and still counts as ten thousand', [await val('fuelD'), await p.evaluate(R)] == ['10.000', '1.000,00 €'], [await val('fuelD'), await p.evaluate(R)])
    await keys('fuelD', ['backspace'])
    check(L + 'fuel: ⌫ takes the last digit, the dots follow', await val('fuelD') == '1.000', await val('fuelD'))
    await keys('fuelC', ['backspace', '1', '0', '1'])
    check(L + 'fuel: consumption stops at 100 L/100 km', await val('fuelC') == '10', await val('fuelC'))
    await keys('fuelP', ['-'])
    check(L + 'fuel: no − for a price', await val('fuelP') == '2', await val('fuelP'))
    await p.evaluate("switchMode('vat')")
    await keys('vatRate', ['backspace', 'backspace', '5', '1'])
    got = await p.evaluate("[document.getElementById('vatRate').value,document.getElementById('vatRate').closest('.tool-field').querySelector('span').textContent]")
    check(L + 'VAT: the rate stops at 50%, the label says so', got == ['5', 'Up to 50%'], got)
    await p.wait_for_timeout(2000)
    got = await p.evaluate("document.getElementById('vatRate').closest('.tool-field').querySelector('span').textContent")
    check(L + 'VAT: the label comes back', got == 'VAT %' or 'VAT' in got, got)
    await keys('amount', ['-', '1', '2', '3', '4', ',', '5'])
    check(L + 'VAT: the amount may be negative, grouped', await val('amount') == '-1.234,5', await val('amount'))
    await p.evaluate("switchMode('energy')")
    await keys('energyH', '25')
    check(L + 'energy: at most 24 hours a day', await val('energyH') == '2', await val('energyH'))
    await p.evaluate("switchMode('loan')")
    await p.evaluate("setToolKind('loan','loan')")
    await keys('loanRate', '60')
    await keys('loanYears', '101')
    check(L + 'interest: rate up to 50%, years up to 100', [await val('loanRate'), await val('loanYears')] == ['6', '10'], [await val('loanRate'), await val('loanYears')])
    if not phone:
        # pasted on a computer: dots either way
        for text, want in [('12.5', '12,5'), ('1.234,5', '1.234,5'), ('1234567', '1.234.567'), ('1.234.567', '1.234.567')]:
            await p.evaluate("(()=>{const e=document.getElementById('loanAmount');e.value='';e.focus()})()")
            await p.evaluate(f"(()=>{{const e=document.getElementById('loanAmount');e.value={text!r};e.dispatchEvent(new InputEvent('input',{{bubbles:true,inputType:'insertFromPaste'}}))}})()")
            check(L + f'paste {text}', await val('loanAmount') == want, await val('loanAmount'))
    await p.evaluate("switchMode('net')")
    await p.evaluate("setToolKind('net','hosts')")
    await keys('netHosts', '1000')
    check(L + 'subnet: 1.000 hosts reads as a thousand', [await val('netHosts'), await p.evaluate(R)] == ['1.000', '/22'], [await val('netHosts'), await p.evaluate(R)])
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def screen_reader(browser, url):
    """Screen readers: symbol keys have spoken names in the language on screen, the language button says the language,
    chart bars are hidden from them, and a refused limit is announced."""
    L = '[screen reader] '
    p = await new_page(browser, url, 'en', 'dark')
    names = "Object.fromEntries([...document.querySelectorAll('#keypad button')].map(b=>[b.textContent.trim(),b.getAttribute('aria-label')]))"
    got = await p.evaluate(names)
    check(L + 'calculator: + − × ÷ = % , have names', [got.get(k) for k in ['+', '−', '×', '÷', '=', '%', ',']] == ['Plus', 'Minus', 'Times', 'Divided by', 'Equals', 'Percent', 'Decimal comma'], got)
    check(L + 'calculator: ⌫ keeps its own name', got.get('⌫') == 'Delete', got.get('⌫'))
    check(L + 'language button says the language', await p.evaluate("langButton.getAttribute('aria-label')") == 'Language: English')
    await p.evaluate("setLanguage('el')")
    await p.wait_for_timeout(600)
    got = await p.evaluate(names)
    check(L + 'names follow a language switch', got.get('+') == 'Συν' and got.get('=') == 'Ίσον', got)
    check(L + 'language button in Greek', await p.evaluate("langButton.getAttribute('aria-label')") == 'Γλώσσα: Ελληνικά')
    await p.evaluate("setLanguage('en')")
    await p.wait_for_timeout(600)
    await p.evaluate("switchMode('graph')")
    await p.wait_for_timeout(100)
    got = await p.evaluate(names)
    check(L + 'graph keys: √, x², π, |x|, ( ) named', [got.get(k) for k in ['√', 'x²', 'π', '|x|', '( )']] == ['Square root', 'x squared', 'Pi', 'Absolute value', 'Parentheses'], got)
    await p.evaluate("switchMode('vat')")
    await p.wait_for_timeout(100)
    check(L + 'tools: the , key is named', (await p.evaluate(names)).get(',') == 'Decimal comma')
    await p.evaluate("(()=>{const e=document.getElementById('amount');e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));showToolChart()})()")
    await p.wait_for_timeout(150)
    check(L + 'chart bars are hidden from screen readers', await p.evaluate("[...document.querySelectorAll('.cbar')].every(b=>b.getAttribute('aria-hidden')==='true')"))
    await p.evaluate("closeHow();setActiveToolInput(document.getElementById('vatRate'));for(const k of ['backspace','backspace','9','9'])toolKeyInput(k)")
    await p.wait_for_timeout(100)
    check(L + 'a refused limit is announced', await p.evaluate("document.getElementById('srNote')?.textContent") == 'Up to 50%')
    check(L + 'the Tips link has a drawn icon, not ?', await p.evaluate("!!document.querySelector('#helpButton svg.help-link-icon')&&!document.querySelector('#helpButton').textContent.includes('?')"))
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()



async def upright_small_phones(browser, url):
    """Small phones held upright (old iPhone SE 320×568, small Android 360×640), filled in: every tab fits without the
    page scrolling (Scientific only from 360×640: its ten rows of keys don't fit 320×568), nothing sticks out, no label
    is cut (kind switches included), and keys stay at least 31px tall."""
    fill = {'vat': [['amount', '1234567,89']], 'pct': [['pctPrice', '1250'], ['pctOff', '25']], 'fuel': [['fuelD', '1250'], ['fuelC', '6,5'], ['fuelP', '1,85']],
            'energy': [['energyP', '2000'], ['energyH', '3'], ['energyD', '30'], ['energyR', '0,15']], 'loan': [['loanAmount', '250000'], ['loanRate', '4'], ['loanYears', '30']],
            'net': [['netIp', '192.168.100.100'], ['netPrefix', '26']], 'dates': [['dateTo', '2027-03-15']],
            'numbers': [['numA', '123456789012'], ['numB', '987654321'], ['numC', '360'], ['numN', '600851475143']],
            'prog': [['progHex', 'DEADBEEFCAFE']],
            'equation': [['eqA', '1'], ['eqB', '2'], ['eqC', '5'], ['sxA1', '2'], ['sxB1', '1'], ['sxC1', '5'], ['sxA2', '1'], ['sxB2', '-1'], ['sxC2', '1']]}
    # wide: label text a little wider, like a phone's (or GitHub's) font that measures wider than this one
    for w, h, lang, wide in [(320, 568, 'en', False), (320, 568, 'el', False), (360, 640, 'en', False), (360, 640, 'el', False), (320, 568, 'el', True)]:
        if True:
            L = f'[upright {w}x{h} {lang}{" wider font" if wide else ""}] '
            ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True)
            await ctx.add_init_script(SEED % (lang, 'dark'))
            p = await ctx.new_page()
            await p.goto(url)
            if wide:
                await p.add_style_tag(content='#toolPanel .tool-field span,#toolPanel .seg-toggle button{letter-spacing:.04em}')
            await p.wait_for_timeout(300)
            bad = []
            tabs = [('calc', None), ('units', None), ('currency', None), ('vat', None), ('pct', 'discount'), ('pct', 'tip'), ('loan', 'loan'),
                    ('loan', 'payoff'), ('loan', 'savings'), ('dates', 'between'), ('dates', 'add'), ('fuel', None), ('energy', None), ('net', 'subnet'),
                    ('net', 'hosts'), ('numbers', 'gcd'), ('numbers', 'factors'), ('equation', 'quad'), ('equation', 'sys2'), ('stats', None), ('prog', None)]
            if w >= 360:
                tabs.append(('sci', None))
            for m, kind in tabs:
                await p.evaluate("switchMode('calc');if(sciMode)toggleSci()")
                if m == 'sci':
                    await p.evaluate("toggleSci()")
                else:
                    await p.evaluate(f"switchMode('{m}')")
                if kind:
                    await p.evaluate(f"setToolKind('{m}','{kind}')")
                for fid, v in fill.get(m, []):
                    await p.evaluate(f"(()=>{{const e=document.getElementById('{fid}');if(!e)return;e.value='{v}';e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()")
                await p.wait_for_timeout(200)
                st = await p.evaluate("""(()=>{const W=innerWidth,out=[];if(document.documentElement.classList.contains('page-scroll'))out.push('scrolls');
                  document.querySelectorAll('#calculatorCard *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>W+1&&!e.closest('.mode-tabs,.hidden'))out.push('off: '+e.tagName+'.'+String(e.className).slice(0,20))});
                  document.querySelectorAll('#toolPanel .tool-field span, .seg-toggle button').forEach(e=>{if(e.offsetParent&&labelCut(e))out.push('label cut: '+e.textContent)});
                  const d=document.getElementById('calculatorDisplay').getBoundingClientRect();
                  for(const id of ['expression','result']){const r=document.getElementById(id)?.getBoundingClientRect();if(r&&r.height&&(r.top<d.top-1||r.bottom>d.bottom+1))out.push(id+' outside the display')}
                  document.querySelectorAll('.unit-value').forEach(e=>{if(e.offsetParent&&parseFloat(getComputedStyle(e).fontSize)<20)out.push('unit value '+getComputedStyle(e).fontSize)});
                  const k=[...document.querySelectorAll('#keypad button')].filter(b=>b.offsetParent).map(b=>b.getBoundingClientRect().height);
                  if(k.length&&Math.min(...k)<31)out.push('keys '+Math.round(Math.min(...k))+'px');
                  return [...new Set(out)]})()""")
                if st:
                    bad.append([m + (':' + kind if kind else ''), st])
            await p.evaluate("if(sciMode)toggleSci()")
            check(L + 'every tab fits: no scrolling, nothing off screen, no cut label, keys big enough', not bad, bad)
            await ctx.close()


async def touch_areas(browser, url):
    """On phones every button, field and menu in every tab can be hit by a finger: at least 30×30 px, counting the
    invisible hit area (::after) small buttons get. Units' values count as their whole row (a tap there picks them)."""
    for w, h in [(390, 844), (320, 568)]:
        ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True)
        await ctx.add_init_script(SEED % ('en', 'dark'))
        p = await ctx.new_page()
        await p.goto(url)
        await p.wait_for_timeout(300)
        small = await p.evaluate("""async()=>{const r=[];
          for(const m of MODE_LABELS){switchMode(m);await new Promise(x=>setTimeout(x,120));
            if(m==='vat'){const e=document.getElementById('amount');e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(x=>setTimeout(x,100))}
            document.querySelectorAll('button,[role=button],input,select').forEach(e=>{if(!e.offsetParent||e.closest('.unit-row')&&e.tagName==='INPUT')return;
              const b=e.getBoundingClientRect(),a=getComputedStyle(e,'::after'),i=v=>parseFloat(v)||0;let W=b.width,H=b.height;
              if(a.content!=='none'&&a.position==='absolute'){W-=i(a.left)+i(a.right);H-=i(a.top)+i(a.bottom)}
              if(W<29.5||H<29.5)r.push(m+': '+(e.id||String(e.className).slice(0,24)||e.textContent.trim().slice(0,12))+' '+Math.round(W)+'×'+Math.round(H))})}
          switchMode('calc');return [...new Set(r)]}""")
        check(f'[touch {w}x{h}] every button and field is at least 30×30 px to a finger', not small, small)
        await ctx.close()


async def more_decimals(browser, url):
    """A result shows up to 10 decimals when the display has room (at 70% of its size or more), else its usual 6;
    copying copies what is shown."""
    for w, h, touch in [(390, 844, True), (1280, 860, False)]:
        ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=touch, has_touch=touch)
        await ctx.add_init_script(SEED % ('en', 'dark'))
        await ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        p = await ctx.new_page()
        await p.goto(url)
        await p.wait_for_timeout(300)
        got = []
        for ks in ['1/7', '123456789/7', '2/4']:
            await p.keyboard.press('Escape')
            await p.keyboard.type(ks)
            await p.keyboard.press('Enter')
            await p.wait_for_timeout(250)
            got.append(await p.inner_text('#result'))
        await p.evaluate("copyResult()")
        await p.wait_for_timeout(100)
        await p.keyboard.press('Escape')
        await p.keyboard.type('1/7')
        await p.keyboard.press('Enter')
        await p.wait_for_timeout(250)
        await p.evaluate("copyResult()")
        await p.wait_for_timeout(150)
        clip = await p.evaluate("navigator.clipboard.readText()")
        mid = '17.636.684,142857' if touch else '17.636.684,14285714'
        check(f'[decimals {w}x{h}] up to 10 decimals when they fit, else fewer', got == ['0,1428571429', mid, '0,5'], got)
        check(f'[decimals {w}x{h}] copying the result copies what is shown', clip == '0,1428571429', clip)
        await ctx.close()


async def how_buttons_in_place(browser, url):
    """With a result in every tab, the ? and chart buttons sit inside the display, never over the mode tabs (v0.26.1-0.26.3
    moved them up onto the tabs on phones), from small phones to big screens, upright and sideways."""
    js = """async()=>{const r=[];const fill={vat:[['amount','874']],pct:[['pctPrice','80'],['pctOff','25']],loan:[['loanAmount','10000'],['loanRate','4'],['loanYears','5']],fuel:[['fuelD','250'],['fuelC','7'],['fuelP','1,8']],energy:[['energyP','100'],['energyH','8'],['energyD','30'],['energyR','0,2']],net:[['netIp','192.168.1.10'],['netPrefix','24']],numbers:[['numA','48'],['numB','18']],equation:[['eqA','1'],['eqB','-3'],['eqC','2']],prog:[['progDec','255']],dates:[['dateTo','2027-03-15']]};
 const wait=ms=>new Promise(x=>setTimeout(x,ms));
 for(const m of MODE_LABELS){switchMode(m);await wait(80);
  if(m==='calc'){for(const k of '1/7')document.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}
  for(const [f,v] of fill[m]||[]){const e=document.getElementById(f);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}}
  if(m==='stats'&&typeof statAdd==='function'){try{document.getElementById('statX').value='3';statAdd();document.getElementById('statX').value='5';statAdd()}catch(e){}}
  await wait(250);
  const d=document.getElementById('calculatorDisplay').getBoundingClientRect(),tb=document.querySelector('.calculator-toolbar')?.getBoundingClientRect();
  document.querySelectorAll('#calculatorDisplay .how-button').forEach(b=>{if(!b.offsetParent||b.classList.contains('hidden'))return;const x=b.getBoundingClientRect();if(!x.width)return;
   const out=x.top<d.top-1||x.bottom>d.bottom+1||x.left<d.left-1||x.right>d.right+1,hit=tb&&tb.height&&x.top<tb.bottom&&x.bottom>tb.top&&x.left<tb.right&&x.right>tb.left;
   if(out||hit)r.push(m+':'+(b.id||b.className)+(hit?' over the tabs':' outside the display'))})}
 switchMode('calc');return r}"""
    bad = {}
    for w, h, touch in [(320, 568, True), (360, 640, True), (390, 844, True), (430, 932, True), (667, 330, True), (844, 390, True),
                        (768, 1024, True), (1024, 768, False), (1280, 860, False), (1920, 1080, False)]:
        ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=touch, has_touch=touch)
        await ctx.add_init_script(SEED % ('en', 'dark'))
        p = await ctx.new_page()
        await p.goto(url)
        await p.wait_for_timeout(300)
        r = await p.evaluate(js)
        if r:
            bad[f'{w}x{h}'] = r
        await ctx.close()
    check('? and chart buttons stay inside the display, off the mode tabs, at every size', not bad, bad)

async def sideways_every_tab(browser, url):
    """Every tab held sideways, from a small phone in Safari (iPhone SE, 667×330) to a big one: nothing scrolls, nothing
    sticks out of the screen (Dates' list included), and every tab but Graph and Scientific has the same key size."""
    fill = {'vat': [['amount', '1234567,89']], 'pct': [['pctPrice', '1250'], ['pctOff', '25']], 'fuel': [['fuelD', '1250'], ['fuelC', '6,5'], ['fuelP', '1,85']],
            'energy': [['energyP', '2000'], ['energyH', '3'], ['energyD', '30'], ['energyR', '0,15']], 'loan': [['loanAmount', '250000'], ['loanRate', '4'], ['loanYears', '30']],
            'net': [['netIp', '192.168.100.100'], ['netPrefix', '26']], 'dates': [['dateTo', '2027-03-15']],
            'numbers': [['numA', '123456789012'], ['numB', '987654321'], ['numC', '360'], ['numN', '600851475143']],
            'prog': [['progHex', 'DEADBEEFCAFE']],
            'equation': [['eqA', '1'], ['eqB', '2'], ['eqC', '5'], ['sxA1', '2'], ['sxB1', '1'], ['sxC1', '5'], ['sxA2', '1'], ['sxB2', '-1'], ['sxC2', '1']]}
    for w, h in [(667, 330), (814, 409)]:
        for lang in ['en', 'el']:
            L = f'[sideways {w}x{h} {lang}] '
            ctx = await browser.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True)
            await ctx.add_init_script(SEED % (lang, 'dark'))
            p = await ctx.new_page()
            p.errors = []
            p.on('pageerror', lambda e: p.errors.append(str(e)))
            await p.goto(url)
            await p.wait_for_timeout(300)
            bad, keys = [], {}
            for m, kind in [('calc', None), ('units', None), ('currency', None), ('vat', None), ('pct', 'discount'), ('pct', 'tip'), ('loan', 'loan'),
                            ('loan', 'payoff'), ('loan', 'savings'), ('dates', 'between'), ('dates', 'add'), ('fuel', None), ('energy', None), ('net', 'subnet'),
                            ('numbers', 'gcd'), ('numbers', 'factors'), ('equation', 'quad'), ('equation', 'sys2'), ('stats', None), ('prog', None)]:
                await p.evaluate(f"switchMode('{m}')")
                if kind:
                    await p.evaluate(f"setToolKind('{m}','{kind}')")
                if m == 'stats':
                    await p.evaluate("for(const v of ['12','1234,75','-3','15,5','9']){statX.value=v;statX.dispatchEvent(new Event('input',{bubbles:true}));statAdd()}")
                for fid, v in fill.get(m, []):
                    await p.evaluate(f"(()=>{{const e=document.getElementById('{fid}');if(!e)return;e.value='{v}';e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()")
                await p.wait_for_timeout(200)
                st = await p.evaluate("""(()=>{const W=innerWidth,out=[];if(document.documentElement.classList.contains('page-scroll'))out.push('scrolls');
                  document.querySelectorAll('#calculatorCard *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>W+1&&!e.closest('.mode-tabs,.hidden'))out.push('off: '+e.tagName+'.'+String(e.className).slice(0,20))});
                  document.querySelectorAll('#toolPanel .tool-field span').forEach(e=>{if(e.offsetParent&&e.scrollWidth>e.clientWidth+1)out.push('label cut: '+e.textContent)});
                  const k=[...document.querySelectorAll('#keypad button:not(.mem-key)')].filter(b=>b.offsetParent).map(b=>Math.round(b.getBoundingClientRect().height));
                  return {out:[...new Set(out)],k:k.length?Math.min(...k):null}})()""")
                if st['out']:
                    bad.append([m + (':' + kind if kind else ''), st['out']])
                if st['k'] and m != 'prog':  # Programmer's keypad has 4 rows (A–F beside the digits), so its keys are taller
                    keys[m + (':' + kind if kind else '')] = st['k']
            check(L + 'every tab fits: no scrolling, nothing off screen, no cut label', not bad, bad)
            check(L + 'keys are the same size in every tab', len(set(keys.values())) == 1, keys)
            check(L + 'no JavaScript errors', not p.errors, p.errors)
            await ctx.close()


async def all_modes(browser, url):
    """Navigation: the strip shows the pinned modes (and the one on screen); ⊞ opens every mode, grouped, with a search;
    pins are kept; Ctrl+K opens it, Esc closes; on a phone the pinned tabs fit (the others show as icons)."""
    L = '[all modes] '
    p = await new_page(browser, url, 'en', 'dark')
    strip = "[...document.querySelectorAll('#modeTabs .mode-tab')].map(b=>b.dataset.mode)"
    check(L + 'the strip starts with Calculator, Units, Currency, VAT', await p.evaluate(strip) == ['calc', 'units', 'currency', 'vat'], await p.evaluate(strip))
    await p.click('#modesButton')
    await p.wait_for_timeout(100)
    got = await p.evaluate("[!modesModal.classList.contains('hidden'),document.querySelectorAll('#modesList .mode-group').length,[...document.querySelectorAll('#modesList .mode-pick')].map(b=>b.dataset.mode),document.activeElement.id]")
    check(L + 'the sheet has every mode in 3 groups, the search has the focus', got[0] and got[1] == 3 and sorted(got[2]) == sorted(['calc', 'units', 'currency', 'graph', 'vat', 'pct', 'loan', 'dates', 'fuel', 'energy', 'net', 'prog', 'numbers', 'equation', 'stats']) and got[3] == 'modesSearch', got)
    for q, want in [('tip', ['pct']), ('loan', ['loan']), ('ip', ['net']), ('καυσ', ['fuel']), ('ΦΠΑ', ['vat']), ('zzz', [])]:
        await p.fill('#modesSearch', q)
        got = await p.evaluate("[...document.querySelectorAll('#modesList .mode-pick')].map(b=>b.dataset.mode)")
        check(L + f'search "{q}"', got == want, got)
    check(L + 'nothing found says so', await p.evaluate("!!document.querySelector('#modesList .modes-none')"))
    await p.fill('#modesSearch', 'subnet')
    await p.keyboard.press('Enter')
    await p.wait_for_timeout(150)
    got = await p.evaluate(f"[mode,modesModal.classList.contains('hidden'),{strip},document.querySelector('.mode-tab.active').classList.contains('unpinned')]")
    check(L + 'Enter opens the first match; it joins the strip while open', got == ['net', True, ['calc', 'units', 'currency', 'vat', 'net'], True], got)
    await p.evaluate("switchMode('calc')")
    check(L + 'and leaves the strip after', await p.evaluate(strip) == ['calc', 'units', 'currency', 'vat'])
    await p.keyboard.press('Control+k')
    await p.wait_for_timeout(100)
    check(L + 'Ctrl+K opens it', await p.evaluate("!modesModal.classList.contains('hidden')"))
    bg = "getComputedStyle(document.querySelector('#modesList [data-pin=pct]').closest('.mode-tile')).backgroundColor"
    await p.mouse.move(1, 1)
    rest = await p.evaluate(bg)
    await p.hover('#modesList .mode-pick[data-mode=pct]')
    on_name = await p.evaluate(bg)
    await p.hover('#modesList [data-pin=pct]')
    on_pin = await p.evaluate(bg)
    check(L + 'the mouse over a mode lights up its whole tile, pin included', on_name != rest and on_pin == on_name, [rest, on_name, on_pin])
    await p.click('#modesList [data-pin="fuel"]')
    await p.click('#modesList [data-pin="units"]')
    got = await p.evaluate(f"[{strip},!modesModal.classList.contains('hidden'),document.querySelector('[data-pin=fuel]').getAttribute('aria-pressed')]")
    check(L + 'pinning and unpinning change the strip at once, the sheet stays open', got == [['calc', 'currency', 'vat', 'fuel'], True, 'true'], got)
    await p.keyboard.press('Escape')
    check(L + 'Esc closes it', await p.evaluate("modesModal.classList.contains('hidden')"))
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'pins are kept', await p.evaluate(strip) == ['calc', 'currency', 'vat', 'fuel'], await p.evaluate(strip))
    await p.keyboard.press('Alt+Digit2')
    check(L + 'Alt+2 still goes to Units', await p.evaluate('mode') == 'units')
    await p.evaluate("setLanguage('el')")
    await p.wait_for_timeout(600)
    await p.click('#modesButton')
    got = await p.evaluate("[modesTitle.textContent,modesButton.getAttribute('aria-label'),document.querySelector('#modesList .mode-group h3').textContent]")
    check(L + 'in Greek', got == ['Όλες οι λειτουργίες', 'Όλες οι λειτουργίες', 'Καθημερινά'], got)
    cut = await p.evaluate("[...document.querySelectorAll('#modesList .mode-pick-name')].filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)")
    check(L + 'in Greek on a computer, no name is cut', not cut, cut)
    await p.mouse.click(5, 5)
    check(L + 'a press outside closes it', await p.evaluate("modesModal.classList.contains('hidden')"))
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()
    for size in [(390, 844), (814, 409)]:
        p = await new_page(browser, url, 'el', 'light', phone=True, size=size)
        got = await p.evaluate("(()=>{const t=document.querySelector('#modeTabs .mode-tabs-track');return [t.scrollWidth<=t.clientWidth+1,[...t.children].filter(b=>b.querySelector('.mode-tab-label').offsetParent).map(b=>b.dataset.mode)]})()")
        check(L + f'phone {size[0]}: the 4 pinned tabs fit, only the current one with its name', got == [True, ['calc']], got)
        await p.tap('#modesButton')
        await p.wait_for_timeout(150)
        got = await p.evaluate("""[document.activeElement.id,[...document.querySelectorAll('#modesList .mode-pick-name')].filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)]""")
        check(L + f'phone {size[0]}: no keyboard pops up, no name is cut', got[0] != 'modesSearch' and not got[1], got)
        check(L + f'phone {size[0]}: no JavaScript errors', not p.errors, p.errors)
        await p.context.close()


async def esc_everywhere(browser, url):
    """Esc clears every mode like its AC key, also from a focused field; an open window (Tips) closes first."""
    L = '[esc] '
    p = await new_page(browser, url, 'en', 'dark')
    bad = []
    for m, fid, v in [('vat', 'amount', '100'), ('pct', 'pctPrice', '80'), ('loan', 'loanAmount', '1000'), ('fuel', 'fuelD', '250'), ('energy', 'energyP', '100'), ('net', 'netIp', '10.0.0.1'), ('dates', 'dateDays', '5')]:
        await p.evaluate(f"switchMode('{m}')")
        if m == 'dates':
            await p.evaluate("setToolKind('dates','add')")
        await p.click(f'#{fid}')
        await p.keyboard.type(v)
        await p.keyboard.press('Escape')
        got = await p.evaluate(f"[document.getElementById('{fid}').value,document.querySelector('#result').textContent]")
        if got[0] != '':
            bad.append([m, got])
    check(L + 'Esc clears every tool, from a focused field too', not bad, bad)
    await p.evaluate("switchMode('vat')")
    await p.click('#amount')
    await p.keyboard.type('100')
    await p.evaluate("showHelp()")
    await p.keyboard.press('Escape')
    got = await p.evaluate("[document.getElementById('howModal').classList.contains('hidden'),document.getElementById('amount').value]")
    check(L + 'with Tips open, Esc only closes it', got == [True, '100'], got)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def history_per_mode(browser, url):
    """History per mode: each tool, Units, Currency and Graph keep their own results (saved on leaving, AC/Esc, copy, kind
    change, =), shown in their language; tapping one brings its numbers back; the Calculator's History is unchanged."""
    L = '[history per mode] '
    p = await new_page(browser, url, 'en', 'dark', size=(1100, 860))  # the sheet: no side panels at this width
    fill = lambda fid, v: p.evaluate(f"(()=>{{const e=document.getElementById('{fid}');e.value='{v}';e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()")
    rows = "[...document.querySelectorAll('#historyList .history-item')].map(r=>r.querySelector('.history-expression').textContent+' | '+r.querySelector('.history-result').textContent)"
    await calc(p, '6*7')
    await p.evaluate("switchMode('vat')")
    await fill('amount', '100')
    await p.evaluate("switchMode('fuel')")
    for fid, v in [['fuelD', '250'], ['fuelC', '7,2'], ['fuelP', '1,85']]:
        await fill(fid, v)
    await p.keyboard.press('Escape')
    await p.evaluate("switchMode('vat')")
    await fill('amount', '50')
    await p.evaluate("setVatAction('remove')")
    await p.evaluate("copyResult()")
    await p.wait_for_timeout(50)
    await p.evaluate("openHistory()")
    await p.wait_for_timeout(250)
    got = await p.evaluate(f"[historyTitle.textContent,{rows},document.getElementById('historyChartButton').classList.contains('hidden')]")
    check(L + 'VAT shows only its own results, newest first, no chart button',
          got[0] == 'History · VAT' and got[1] == ['50,00 € with 24% VAT | 40,32 €', '100,00 € + 24% VAT | 124,00 €'] and got[2], got)
    await p.click('#historyList .history-main >> nth=1')
    await p.wait_for_timeout(250)
    got = await p.evaluate("[mode,amount.value,vatAction,document.querySelector('#result').textContent]")
    check(L + 'tapping one brings back its amount and add/remove', got == ['vat', '100', 'add', '124,00 €'], got)
    await p.evaluate("switchMode('fuel');openHistory()")
    await p.wait_for_timeout(250)
    got = await p.evaluate(rows)
    check(L + 'Fuel has its own (saved by Esc)', got == ['250 km × 7,2 L/100 km × 1,85 €/L | 33,30 €'], got)
    await p.evaluate("closeHistory();setLanguage('el')")
    await p.wait_for_timeout(600)
    await p.evaluate("openHistory()")
    await p.wait_for_timeout(250)
    got = await p.evaluate(f"[historyTitle.textContent,{rows}]")
    check(L + 'after a language switch it reads in the new language', got[0] == 'Ιστορικό · Καύσιμα' and '33,30 €' in got[1][0] and 'L/100 km' in got[1][0], got)
    await p.evaluate("closeHistory();setLanguage('en')")
    await p.wait_for_timeout(600)
    await p.evaluate("switchMode('calc');openHistory()")
    await p.wait_for_timeout(250)
    got = await p.evaluate(f"[historyTitle.textContent,{rows},document.getElementById('historyChartButton').classList.contains('hidden')]")
    check(L + 'the Calculator keeps its own History and chart', got[0] == 'History' and got[1] == ['6×7 | 42'] and not got[2], got)
    await p.evaluate("closeHistory()")
    # Units: = saves; tapping brings back the category, units and number
    await p.evaluate("switchMode('units')")
    await p.select_option('#unitCategory', 'mass')
    for k in ['2', '5']:
        await p.evaluate(f"toolKeyInput('{k}')")
    await p.evaluate("window._equalsUnits()")
    await p.wait_for_timeout(50)
    await p.evaluate("switchMode('calc');switchMode('units');openHistory()")
    await p.wait_for_timeout(250)
    got = await p.evaluate(rows)
    check(L + 'Units keeps its conversions', len(got) == 1 and got[0].startswith('25 kg | = ') and got[0].endswith(' lb') or len(got) == 1 and got[0].startswith('25 '), got)
    await p.click('#historyList .history-main')
    await p.wait_for_timeout(250)
    got = await p.evaluate("[unitCategory.value,unitValueFrom.value]")
    check(L + 'tapping a conversion brings it back', got[0] == 'mass' and got[1] == '25', got)
    # the same result twice is kept once; an empty tool has nothing to save
    await p.evaluate("switchMode('vat')")
    await fill('amount', '100')
    await p.evaluate("switchMode('calc');switchMode('vat')")
    await fill('amount', '100')
    await p.evaluate("switchMode('calc');switchMode('pct');switchMode('calc');switchMode('vat');openHistory()")
    await p.wait_for_timeout(250)
    got = await p.evaluate(rows)
    check(L + 'the same result twice is kept once', got.count('100,00 € + 24% VAT | 124,00 €') == 1, got)
    await p.evaluate("closeHistory();switchMode('pct');openHistory()")
    await p.wait_for_timeout(250)
    check(L + 'a mode with nothing saved says so', await p.evaluate("!!document.querySelector('#historyList .empty')"))
    await p.evaluate("closeHistory();switchMode('vat');openHistory()")
    await p.click('#clearHistory')
    await p.click('#historyTitle')
    await p.wait_for_timeout(100)
    await p.click('#clearHistory')
    await p.wait_for_timeout(100)
    await p.mouse.click(20, 20)  # outside the sheet, on the dimmed page
    await p.wait_for_timeout(350)
    st = await p.evaluate("[historyPanel.classList.contains('open'),clearHistory.textContent,modeHistory('vat').length>0]")
    check(L + 'a press outside the sheet only takes "Delete all?" back, History stays open', st == [True, 'Clear all', True], st)
    await p.click('#clearHistory')
    await p.keyboard.press('Escape')
    await p.wait_for_timeout(350)
    st = await p.evaluate("[historyPanel.classList.contains('open'),clearHistory.textContent]")
    check(L + 'Esc takes "Delete all?" back first, History stays open', st == [True, 'Clear all'], st)
    check(L + 'a press elsewhere takes "Delete all?" back', await p.evaluate("[clearHistory.textContent,clearHistory.classList.contains('armed'),modeHistory('vat').length>0]") == ['Clear all', False, True])
    await p.click('#clearHistory')
    await p.wait_for_timeout(4300)
    check(L + '"Delete all?" goes back by itself after 4 seconds', await p.evaluate("[clearHistory.textContent,clearHistory.classList.contains('armed')]") == ['Clear all', False])
    await p.click('#clearHistory')
    await p.click('#clearHistory')  # the second press deletes
    await p.wait_for_timeout(150)
    got = await p.evaluate("[!!document.querySelector('#historyList .empty'),historyItems().length,modeHistory('fuel').length]")
    check(L + 'Delete all in VAT empties only VAT', got == [True, 1, 1], got)
    st = await p.evaluate("[clearHistory.disabled,(closeHistory(),switchMode('calc'),openHistory(),clearHistory.disabled),historyChartButton.disabled]")
    check(L + 'nothing to clear: Clear all is dimmed; one calculation: no chart', st == [True, False, True], st)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def shortcuts(browser, url):
    """Home-screen shortcuts: the manifest lists them with icons that load and match tools/make-shortcut-icons.py's list,
    and ./?mode=… opens that mode, then the address goes back to plain ./ ."""
    L = '[shortcuts] '
    import importlib.util
    spec = importlib.util.spec_from_file_location('msi', ROOT / 'tools/make-shortcut-icons.py')
    msi = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(msi)
    p = await new_page(browser, url, 'en', 'dark')
    st = await p.evaluate("""(async()=>{const m=await (await fetch('manifest.webmanifest')).json();const s=m.shortcuts||[];
      const ok=await Promise.all(s.flatMap(x=>x.icons.map(i=>fetch(i.src).then(r=>r.ok))));return {s,ok}})()""")
    check(L + 'the manifest has the shortcuts the script makes, every icon loads', st['s'] == msi.manifest_entries() and st['ok'] and all(st['ok']), st)
    for m in ['vat', 'currency', 'fuel']:
        await p.goto(url + '?mode=' + m)
        await p.wait_for_timeout(300)
        got = await p.evaluate("[currentTab(),location.search]")
        check(L + f'?mode={m} opens {m}, the address is plain again', got == [m, ''], got)
    await p.goto(url + '?mode=nonsense')
    await p.wait_for_timeout(300)
    check(L + 'an unknown mode opens the Calculator', await p.evaluate("currentTab()") == 'calc')
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def update_keeps_themes(browser, url):
    """An update reloads the page: own themes, the chosen theme and the language stay; colours being edited are kept."""
    L = '[update] '
    p = await new_page(browser, url, 'el', 'dark')
    await p.evaluate("customThemes.dark={bg:'#101820',accent:'#ff8800'};saveCustomThemes();writeCustomCss();setTheme('custom-dark')")
    await p.wait_for_timeout(600)
    await p.reload()
    await p.wait_for_timeout(300)
    got = await p.evaluate("[document.documentElement.dataset.theme,localStorage.getItem('uc-lang'),customThemes.dark&&customThemes.dark.accent]")
    check(L + 'own theme, its colours and the language survive a reload', got == ['custom-dark', 'el', '#ff8800'], got)
    await p.evaluate("openThemeEditor('dark')")
    await p.evaluate("themeDraft.accent='#22aaff';writeCustomCss()")
    # pretend a newer version is out: the check must wait while the editor is open (it would close the colour picker)
    fetched = await p.evaluate("""(async()=>{let n=0;const f=window.fetch;window.fetch=(...a)=>{n++;return f(...a)};
      lastVersionCheck=0;checkForUpdate();await new Promise(r=>setTimeout(r,200));window.fetch=f;return n})()""")
    check(L + 'no update check while the own theme editor is open', fetched == 0, fetched)
    await p.reload()
    await p.wait_for_timeout(300)
    got = await p.evaluate("[document.documentElement.dataset.theme,JSON.parse(localStorage.getItem('uc-custom-themes')).dark.accent]")
    check(L + 'a reload with the editor open keeps the colours being edited', got == ['custom-dark', '#22aaff'], got)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def ios_app(browser, url):
    """iPhone home-screen app (navigator.standalone): the page starts below iOS's blur under the status bar and still fits."""
    for size in [(390, 844), (375, 667), (844, 390)]:
        ctx = await browser.new_context(viewport={'width': size[0], 'height': size[1]}, is_mobile=True, has_touch=True)
        await ctx.add_init_script(SEED % ('en', 'dark') + ";Object.defineProperty(navigator,'standalone',{get:()=>true})")
        p = await ctx.new_page()
        p.errors = []
        p.on('pageerror', lambda e: p.errors.append(str(e)))
        await p.goto(url)
        await p.wait_for_timeout(300)
        L = f'[iPhone app {size[0]}x{size[1]}] '
        st = await p.evaluate("""(()=>{const h=document.documentElement,pad=parseFloat(getComputedStyle(document.querySelector('.app-shell')).paddingTop),
          k=document.querySelector('#keypad').getBoundingClientRect();
          return {ios:h.classList.contains('ios-app'),landscape:h.classList.contains('landscape'),pad,fits:k.bottom<=innerHeight+1&&!h.classList.contains('page-scroll')}})()""")
        upright = size[1] > size[0]
        check(L + 'marked as the iPhone app', st['ios'], st)
        check(L + ('the page starts lower, below the status bar blur' if upright else 'sideways: no extra space at the top'),
              (st['pad'] >= 28) if upright else (st['pad'] < 28 and st['landscape']), st)
        check(L + 'the keypad still fits without scrolling', st['fits'], st)
        icons = [await p.evaluate("[themeButton.dataset.icon,!!themeButton.querySelector('svg'),themeButton.textContent.trim()]")]
        await p.evaluate("setTheme('light')")
        await p.wait_for_timeout(700)
        icons.append(await p.evaluate("[themeButton.dataset.icon,!!themeButton.querySelector('svg'),themeButton.textContent.trim()]"))
        check(L + 'the theme button draws a moon / sun, no ☀ ☾ characters', icons == [['moon', True, ''], ['sun', True, '']], icons)
        check(L + 'no JavaScript errors', not p.errors, p.errors)
        await ctx.close()
    p = await new_page(browser, url, 'en', 'dark')
    check('[not the iPhone app] no extra space at the top', not await p.evaluate("document.documentElement.classList.contains('ios-app')"))
    await p.context.close()


async def offline_status_and_turning(browser, url):
    """Currency says offline as soon as the connection goes (no tap needed); numbers re-fit after turning the phone;
    Subnet shows its details sideways when there is room."""
    ctx = await browser.new_context(viewport={'width': 430, 'height': 932}, is_mobile=True, has_touch=True)
    await ctx.add_init_script(SEED % ('en', 'dark'))
    await ctx.route('https://api.frankfurter.dev/**', lambda r: r.fulfill(status=200, content_type='application/json', body=RATES_JSON,
                                                                          headers={'Access-Control-Allow-Origin': '*'}))
    p = await ctx.new_page()
    p.errors = []
    p.on('pageerror', lambda e: p.errors.append(str(e)))
    await p.goto(url)
    await p.evaluate("switchMode('currency')")
    await p.wait_for_function("!rateInfo.classList.contains('loading')")
    check('[offline] online: the rate line does not say offline', 'offline' not in await p.inner_text('#rateInfo'))
    await ctx.set_offline(True)
    await p.wait_for_timeout(150)
    check('[offline] the connection drops: it says offline straight away, no tap needed', 'offline' in await p.inner_text('#rateInfo'))
    await ctx.set_offline(False)
    await p.wait_for_function("!rateInfo.textContent.includes('offline')", timeout=4000)
    check('[offline] back online: "offline" goes away by itself', True)
    # a result sized upright must re-fit when the phone turns (the column beside the keys is narrower)
    await p.evaluate("switchMode('net');for(const[k,v] of [['netIp','192.168.100.100'],['netPrefix','26']]){const i=document.getElementById(k);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}")
    await p.wait_for_timeout(300)
    for w, h in [(700, 360), (932, 430)]:
        await p.set_viewport_size({'width': w, 'height': h})
        await p.wait_for_timeout(500)
        st = await p.evaluate("""(()=>{const r=document.querySelector('#result'),d=document.querySelector('#calculatorDisplay').getBoundingClientRect(),b=r.getBoundingClientRect();
          return {inside:b.right<=d.right+1&&b.left>=d.left-1,fits:r.scrollWidth<=r.clientWidth+1||r.classList.contains('fade-end')}})()""")
        check(f'[turning] {w}x{h}: the result re-fits after turning the phone', st['inside'] and st['fits'], st)
    # iOS reports a turned phone's new width late, after the app has laid itself out: the space shrinks with no resize
    # event. Fitted text must follow its own box, so narrow the page without resizing the window.
    await p.evaluate("document.querySelector('.app-shell').style.width='560px'")
    await p.wait_for_timeout(400)
    st = await p.evaluate("""(()=>{const r=document.querySelector('#result'),d=document.querySelector('#calculatorDisplay').getBoundingClientRect(),b=r.getBoundingClientRect();
      return {inside:b.right<=d.right+1&&b.left>=d.left-1,fits:r.scrollWidth<=r.clientWidth+1||r.classList.contains('fade-end'),font:getComputedStyle(r).fontSize}})()""")
    check('[turning] the space shrinks without a resize event: the result still re-fits', st['inside'] and st['fits'], st)
    await p.evaluate("document.querySelector('.app-shell').style.width=''")
    await p.wait_for_timeout(300)
    shown = await p.evaluate("getComputedStyle(document.querySelector('#netDetails')).display!=='none'")
    check('[turning] 932x430: Subnet shows its details sideways', shown)
    await p.set_viewport_size({'width': 390, 'height': 844})
    await p.wait_for_timeout(400)
    cut = await p.evaluate("[...document.querySelectorAll('#netDetails strong')].filter(s=>s.scrollWidth>s.clientWidth+1).map(s=>s.textContent)")
    check('[turning] upright again: no Subnet value cut off', not cut, cut)
    check('[offline/turning] no JavaScript errors', not p.errors, p.errors)
    await ctx.close()


async def sideways_and_chips(browser, url):
    """Sideways on a big iPhone (its space without the notch and home bar): Subnet's keys are as big as the other tabs'
    and its details readable; the tab bar follows a width change with no resize event; f(x) lines up with History."""
    sizes = {}
    for mode in ['energy', 'net', 'calc']:
        ctx = await browser.new_context(viewport={'width': 814, 'height': 409}, is_mobile=True, has_touch=True)
        await ctx.add_init_script(SEED % ('en', 'dark'))
        p = await ctx.new_page()
        await p.goto(url)
        await p.wait_for_timeout(300)
        await p.evaluate(f"switchMode('{mode}')")
        if mode == 'net':
            await p.evaluate("for(const[k,v] of [['netIp','192.168.100.100'],['netPrefix','26']]){const i=document.getElementById(k);i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))}")
        await p.wait_for_timeout(400)
        sizes[mode] = await p.evaluate("Math.round(document.querySelector('#keypad button:not(.mem-key)').getBoundingClientRect().height)")
        if mode == 'net':
            st = await p.evaluate("""(()=>{const s=[...document.querySelectorAll('#netDetails strong')];return {shown:s.length&&s[0].offsetParent!==null,
              cut:s.filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),font:Math.min(...s.map(e=>parseFloat(getComputedStyle(e).fontSize)))}})()""")
            check('[sideways 814x409] Subnet: details shown, nothing cut, readable size', st['shown'] and not st['cut'] and st['font'] >= 12, st)
        await ctx.close()
    check('[sideways 814x409] Subnet keys are as big as Energy and Calculator keys', sizes['net'] == sizes['energy'] == sizes['calc'], sizes)
    p = await new_page(browser, url, 'en', 'dark', phone=True)
    await p.evaluate("toggleSci()")
    for k in ['5', '+', '3']:
        await p.tap(f'#keypad [data-value="{k}"]')
    await p.tap('#keypad [data-action="equals"]')
    await p.wait_for_timeout(200)
    st = await p.evaluate("""(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),f=r('[data-bar=sci]'),h=r('#historyButton'),q=[...document.querySelectorAll('.how-button')].find(b=>b.offsetParent).getBoundingClientRect();
      return {fxLeft:Math.round(f.left),histLeft:Math.round(h.left),fxH:Math.round(f.height),howH:Math.round(q.height),on:document.querySelector('[data-bar=sci]').classList.contains('on')}})()""")
    # the Working days chip belongs to Dates only: leaving Dates hides it in every other tab
    left = []
    for m in ['calc', 'units', 'currency', 'graph', 'vat', 'net']:
        await p.evaluate("switchMode('dates')")
        await p.evaluate(f"switchMode('{m}')")
        if await p.evaluate("(()=>{const b=document.querySelector('#dateBar');return !!b&&getComputedStyle(b).display!=='none'})()"):
            left.append(m)
    check('[Working days] leaving Dates hides its chip in every other tab', not left, left)
    shown = []
    for m in ['units', 'currency', 'graph', 'vat', 'dates', 'net']:
        await p.evaluate("switchMode('calc')")
        await p.evaluate(f"switchMode('{m}')")
        if await p.evaluate("(()=>{const b=document.querySelector('#sciBar');return !!b&&b.offsetParent!==null&&getComputedStyle(b).display!=='none'})()"):
            shown.append(m)
    check('[f(x)] shows only in the Calculator', not shown, shown)
    await p.evaluate("switchMode('calc')")
    check('[f(x)] lines up with the History button and is as tall as ?', abs(st['fxLeft'] - st['histLeft']) <= 1 and st['fxH'] == st['howH'] and st['on'], st)
    check('[sideways/chips] no JavaScript errors (f(x))', not p.errors, p.errors)
    await p.context.close()
    # the tab bar: measured for a wide strip, then the strip narrows with no resize event (iOS reports a turned phone late)
    p = await new_page(browser, url, 'en', 'dark', phone=True, size=(430, 932))
    await p.evaluate("switchMode('net');flashTabsBar(5000)")
    await p.wait_for_timeout(400)
    await p.evaluate("document.querySelector('.app-shell').style.width='250px'")
    await p.wait_for_timeout(400)
    st = await p.evaluate("""(()=>{const t=document.querySelector('#modeTabs .tabs-scrollbar span').getBoundingClientRect(),n=document.querySelector('#modeTabs .tabs-scrollbar').getBoundingClientRect();
      return {thumbRight:Math.round(t.right),barRight:Math.round(n.right),thumbLeft:Math.round(t.left),barLeft:Math.round(n.left)}})()""")
    check('[tab bar] after the width changes without a resize event, the thumb is re-measured: inside the bar, at its end for the last tab',
          st['thumbLeft'] >= st['barLeft'] - 1 and abs(st['thumbRight'] - st['barRight']) <= 2, st)
    check('[sideways/chips] no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def press_feedback(browser, url):
    """Pressing keys, the same with a mouse and a finger: they light up at once, grow a little when held a moment, and fade
    after. Android phones tick (vibrate); iPhones tick through an invisible switch over each key that the finger itself
    taps (iOS 26.5+ ignores script-made clicks), no vibrate there. A fast double tap can't start selecting a key's label."""
    IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    scale = "(s=>{const m=getComputedStyle(document.querySelector(s)).transform;return m==='none'?1:+m.split('(')[1].split(',')[0]})"
    for name, ua in [('desktop', None), ('Android', None), ('iPhone', IPHONE)]:
        kw = dict(viewport={'width': 1280, 'height': 860}) if name == 'desktop' else dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        if ua:
            kw['user_agent'] = ua
        ctx = await browser.new_context(**kw)
        await ctx.add_init_script(SEED % ('en', 'dark') + ";window.__vib=[];if(navigator.vibrate)navigator.vibrate=v=>{window.__vib.push(v);return true}")
        p = await ctx.new_page()
        p.errors = []
        p.on('pageerror', lambda e: p.errors.append(str(e)))
        await p.goto(url)
        await p.wait_for_timeout(300)
        L = f'[press {name}] '
        key = p.locator('#keypad [data-value="7"]')
        box = await key.bounding_box()
        x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
        if name == 'desktop':
            await p.mouse.move(x, y)
            await p.mouse.down()
        else:
            await p.evaluate(f"(()=>{{const b=document.querySelector('#keypad [data-value=\"7\"]'),o={{bubbles:true,pointerType:'touch',clientX:{x},clientY:{y}}};b.dispatchEvent(new PointerEvent('pointerdown',o))}})()")
        lit = await p.evaluate("(()=>{const b=document.querySelector('#keypad [data-value=\"7\"]');return [b.classList.contains('pressed'),getComputedStyle(b,'::after').opacity]})()")
        check(L + 'a key lights up the moment it is touched', lit[0] and float(lit[1]) > 0.1, lit)
        quick = await p.evaluate(scale + "('#keypad [data-value=\"7\"]')")
        check(L + 'at first it only lights up (a quick tap does not grow or shrink)', abs(quick - 1) < 0.01, quick)
        await p.wait_for_timeout(450)
        held = await p.evaluate(scale + "('#keypad [data-value=\"7\"]')")
        check(L + 'held a moment, it grows', 1.1 < held < 1.15, held)
        if name == 'desktop':
            await p.mouse.up()
        else:
            await p.evaluate("document.querySelector('#keypad [data-value=\"7\"]').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}))")
        await p.wait_for_timeout(450)
        after_up = await p.evaluate("(()=>{const b=document.querySelector('#keypad [data-value=\"7\"]');return [b.classList.contains('pressed'),getComputedStyle(b).transform]})()")
        check(L + 'and settles back after it is let go', not after_up[0] and after_up[1] in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), after_up)
        if name == 'desktop':
            check(L + 'no vibrate with a mouse', not await p.evaluate("window.__vib.length"))
            check(L + 'no iPhone switches off iPhone', not await p.evaluate("document.querySelectorAll('.key-tick').length"))

            async def hold(sel, ms=700):
                b = await p.locator('#keypad ' + sel).bounding_box()
                await p.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2)
                await p.mouse.down()
                await p.wait_for_timeout(ms)
                st = await p.evaluate(f"(()=>{{const b=document.querySelector('#keypad {sel}');return [b.textContent,b.classList.contains('pressed'),{scale}('#keypad {sel}')]}})()".replace('{scale}', scale))
                await p.mouse.up()
                await p.wait_for_timeout(100)
                return st
            # holding C (like the iPhone's calculator): turns into AC while still held and big, and clears everything
            await p.evaluate("clearAll()")
            for k in ['1', '2', '+', '3']:
                await p.click(f'#keypad [data-value="{k}"]')
            st = await hold('[data-action="clear"]')
            after = await p.evaluate("[expression,current,document.querySelector('#result').textContent,document.querySelector('#clearButton').textContent]")
            check(L + 'holding C turns it into AC while still held and big', st[0] == 'AC' and st[1] and st[2] > 1.1, st)
            check(L + 'and clears everything, letting go does nothing more', after == ['', '', '0', 'AC'], after)
            for k in ['4', '5']:
                await p.click(f'#keypad [data-value="{k}"]')
            await p.click('#keypad [data-action="clear"]')
            check(L + 'a tap on C still clears just the number', await p.evaluate("[current,document.querySelector('#clearButton').textContent]") == ['', 'AC'])
            await p.evaluate("switchMode('units')")
            await p.click('#keypad [data-value="7"]')
            await hold('[data-action="clear"]')
            st = await p.evaluate("[unitValueFrom.value,unitValueTo.value,document.querySelector('#clearButton').textContent]")
            check(L + 'Units: holding C clears both values', st[0] in ('', '0') and st[1] in ('', '0') and st[2] == 'AC', st)
            await p.evaluate("switchMode('fuel')")
            await p.click('#keypad [data-value="6"]')
            await p.click('#keypad [data-value="8"]')
            await hold('[data-action="clear"]')
            st = await p.evaluate("[...document.querySelectorAll('#toolPanel input[data-tool-input]')].map(i=>i.value).join('')")
            check(L + 'tools: holding C clears every field, like AC', st == '', st)
            # holding AC clears while still held (like C; on a phone a long press may never end in a click), the
            # defaults come back
            def fill(fid, v):
                return p.evaluate(f"(()=>{{const e=document.getElementById('{fid}');e.value='{v}';e.dispatchEvent(new Event('input',{{bubbles:true}}))}})()")
            await p.evaluate("switchMode('vat')")
            await fill('amount', '100')
            await fill('vatRate', '13')
            b = await p.locator('#keypad [data-action="clear-all"]').bounding_box()
            await p.mouse.move(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2)
            await p.mouse.down()
            await p.wait_for_timeout(700)
            st = await p.evaluate("[amount.value,vatRate.value]")
            await p.mouse.up()
            check(L + 'VAT: holding AC clears while still held, the rate goes back to 24', st == ['', '24'], st)
            await p.evaluate("switchMode('pct')")
            await fill('pctPrice', '80')
            await p.evaluate("""document.querySelector('#keypad [data-action="clear-all"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',clientX:1,clientY:1}))""")
            await p.wait_for_timeout(700)
            st = await p.evaluate("pctPrice.value")
            await p.evaluate("""document.querySelector('#keypad [data-action="clear-all"]').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'touch'}))""")
            check(L + 'a finger held on AC clears even when the press ends without a click', st == '', st)
            await p.evaluate("switchMode('graph');graph.fns=['x^2','2x+1'];graph.active=1;graphChanged()")
            await p.click('#keypad [data-g="clear"]')
            st = await p.evaluate("JSON.stringify(graph.fns)")
            check(L + 'Graph: a tap on AC clears the function typed in', st == '["x^2",""]', st)
            await hold('[data-g="clear"]')
            st = await p.evaluate("[JSON.stringify(graph.fns),graph.active]")
            check(L + 'Graph: holding AC clears every function', st == ['[""]', 0], st)
            await ctx.close()
            continue
        await p.evaluate("clearAll()")
        before = await p.evaluate("[window.__vib.length,document.querySelector('#keypad [data-value=\"8\"] .key-tick input')?.checked??null]")
        await p.tap('#keypad [data-value="8"]')
        after = await p.evaluate("[window.__vib.length,document.querySelector('#keypad [data-value=\"8\"] .key-tick input')?.checked??null,document.querySelector('#result').textContent]")
        if name == 'Android':
            check(L + 'a tap vibrates briefly', after[0] > before[0], [before, after])
            check(L + 'no iPhone switches on Android', not await p.evaluate("document.querySelectorAll('.key-tick').length"))
        else:
            check(L + "a tap toggles the key's own switch (the tick), no vibrate", before[1] is False and after[1] is True and after[0] == before[0], [before, after])
            hit = await p.evaluate(f"document.elementFromPoint({x},{y}).className")
            check(L + 'the finger lands on the switch label over the key', hit == 'key-tick', hit)
        check(L + 'the tap types the digit once', after[2] == '8', after)
        if name == 'iPhone':
            await p.tap('#clearButton')
            await p.tap('#keypad [data-value="5"]')
            await p.wait_for_timeout(50)
            st = await p.evaluate("""[document.querySelector('#result').textContent,document.querySelector('#clearButton').textContent,
              [...document.querySelectorAll('#keypad button')].every(b=>b.querySelector(':scope>.key-tick input[switch]'))]""")
            check(L + 'every key keeps its switch after re-labelling (C/AC), and its text is unchanged', st == ['5', 'C', True], st)
            await p.evaluate("toggleSci()")
            await p.tap('#keypad [data-sci="2nd"]')
            await p.wait_for_timeout(50)
            st = await p.evaluate("[document.querySelector('#keypad [data-sci=\"2nd\"]').classList.contains('on'),[...document.querySelectorAll('#keypad button')].every(b=>b.querySelector(':scope>.key-tick'))]")
            check(L + 'keys drawn again (2nd) get their switches too', st == [True, True], st)
            await p.evaluate("toggleSci()")
            await p.tap('#themeButton')
            await p.wait_for_timeout(150)
            await p.tap('#keypad [data-value="2"]')
            st = await p.evaluate("[themeMenuOpen(),document.querySelector('#result').textContent]")
            check(L + 'a key tap still counts as a press outside the theme menu, and types once', st == [False, '52'], st)
        sel = await p.evaluate("""(()=>{const t=document.querySelector('#keypad [data-value="9"]').firstChild||document.querySelector('#keypad [data-value="9"]');
          const e=new Event('selectstart',{bubbles:true,cancelable:true});t.dispatchEvent(e);
          const i=document.createElement('input');document.body.appendChild(i);const f=new Event('selectstart',{bubbles:true,cancelable:true});i.dispatchEvent(f);i.remove();
          return [e.defaultPrevented,f.defaultPrevented]})()""")
        check(L + 'selecting a key label never starts (no magnifier bubble); fields still can', sel == [True, False], sel)
        check(L + 'no JavaScript errors', not p.errors, p.errors)
        await ctx.close()


async def explanations(browser, url):
    """The working under ?: the calculation shrinks step by step in school order, each step says why, the new number
    is marked; scientific steps, percentages, rounded numbers; Units, Currency, Subnet's bits, Interest, Dates."""
    L = '[explanations] '
    p = await new_page(browser, url, 'en', 'dark')
    await p.route('**/api.frankfurter.dev/**', lambda r: r.fulfill(status=200, content_type='application/json', body=RATES_JSON))
    async def how(e):
        return await p.evaluate("(e)=>{const h=explanationForExpression(e,evalExpr(e));return h&&{f:h.formula,rule:h.rule,t:h.steps.map(s=>s.title),x:h.steps.map(s=>s.text),l:h.steps.map(s=>(s.line||'').replace(/\\u0001/g,'[').replace(/\\u0002/g,']')),r:h.result}}", e)
    h = await how('12+7×3-4÷8')
    check(L + 'school order, with the reason', h['t'] == ['Multiply first', 'Divide first', 'Add', 'Subtract'] and h['x'][0] == '7 × 3 = 21', h)
    check(L + 'the calculation shrinks, the new number marked', h['l'][:3] == ['12 + [21] − 4 ÷ 8', '12 + 21 − [0,5]', '[33] − 0,5'] and h['l'][3] == '', h['l'])
    check(L + 'the order rule and a spaced formula', h['f'] == '12 + 7 × 3 − 4 ÷ 8' and h['rule'].replace('\ufe0e', '').startswith('Order: × ÷ → + −'), h)
    h = await how('(2+3)×4')
    check(L + 'brackets first', h['t'][0] == 'Brackets first: add' and h['l'][0] == '[5] × 4', h)
    h = await how('sin(30)+2^3+15%')
    check(L + 'functions in degrees, powers written out, percent of the number before',
          h['x'][:2] == ['sin(30°) = 0,5', '2³ = 2 × 2 × 2 = 8'] and h['t'][3] == '15% of 8,5' and h['x'][3] == '8,5 × 15 ÷ 100 = 1,275' and h['r'] == '9,775', h)
    h = await how('-2^2')
    check(L + 'a minus in front comes last', h['t'] == ['Power', 'The minus in front'] and h['r'] == '-4', h)
    h = await how('1÷3×3')
    check(L + 'a rounded number gets …', h['x'] == ['1 ÷ 3 = 0,333333…', '0,333333… × 3 = 1'], h)
    h = await how('√(9)+5!')
    check(L + 'roots checked by hand, factorial written out', h['t'][0] == 'Square root: 3 × 3 = 9' and h['x'][1] == '5! = 5 × 4 × 3 × 2 × 1 = 120', h)
    bad = await p.evaluate("""(()=>{const out=[];for(const e of ['2+3×4−5÷2','(1+2)×(3+4)','2^10−1','((2+3)×4)^2','100−10%','50×10%','ln(e)+log(100)','−(2+3)×−4',
      '3!+2^−2','sin(90)×cos(0)','1÷7×7','2^(1÷2)','∛(−27)','99999999×99999999','0,1+0,2','π×2^2','5−−3','10%','12,5%+100']){
      try{const v=evalExpr(e.replace(/,/g,'.'));if(!explanationForExpression(e.replace(/,/g,'.'),v))out.push(e)}catch(x){out.push(e+': '+x)}}return out})()""")
    check(L + 'every calculation gets a working that ends in its result', not bad, bad)
    await p.evaluate("angleUnit='rad'")
    h = await how('sin(0)')
    check(L + 'radians say so', h['t'] == ['Sine (radians)'] and h['x'] == ['sin(0) = 0'], h)
    await p.evaluate("angleUnit='deg'")
    # Units and Currency have their own ? now
    await p.evaluate("switchMode('units');const c=document.getElementById('unitCategory');c.value='temperature';c.dispatchEvent(new Event('change',{bubbles:true}))")
    await p.evaluate("for(const [id,v] of [['unitFrom','°F'],['unitTo','K']]){const s=document.getElementById(id);s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))}")
    for k in '212':
        await p.click(f'#keypad [data-value="{k}"]')
    await p.wait_for_timeout(150)
    await p.evaluate('unitHow.click()')  # hidden beside the side panels
    st = await p.evaluate("[document.querySelector('#howModal').classList.contains('hidden'),[...document.querySelectorAll('#howContent .how-line-body div')].map(d=>d.textContent),document.querySelector('.how-result strong').textContent]")
    check(L + 'Units: °F → K through °C', not st[0] and st[1] == ['(212 − 32) ÷ 1,8 = 100 °C', '100 + 273,15 = 373,15 K'] and st[2] == '373,15 K', st)
    await p.evaluate("closeHow();switchMode('currency')")
    await p.wait_for_timeout(200)
    await p.evaluate("for(const [id,v] of [['unitFrom','USD'],['unitTo','GBP']]){const s=document.getElementById(id);s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))}")
    for k in '100':
        await p.click(f'#keypad [data-value="{k}"]')
    st = await p.evaluate("unitsHow().steps.map(s=>s.text)")
    check(L + 'Currency: USD → GBP through euros, at the ECB rates', st == ['100,00 USD ÷ 1,1206 = 89,24 EUR', '89,24 EUR × 0,84763 = 75,64 GBP'], st)
    # Interest names the monthly rate i and writes powers small
    await p.evaluate("switchMode('loan');setToolKind('loan','loan')")
    await p.evaluate("for(const [f,v] of [['loanAmount','150000'],['loanRate','3,5'],['loanYears','25']]){const e=document.getElementById(f);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}")
    st = await p.evaluate("howData.steps.map(s=>s.text)")
    check(L + 'Interest: i is said, (1 + i)⁻³⁰⁰', st[0].endswith('i = 0,00291667') and '(1 + i)⁻³⁰⁰' in st[2], st)
    # Dates: adding working days says what was skipped
    await p.evaluate("switchMode('dates');setToolKind('dates','add');setDateCount('work')")
    await p.evaluate("for(const [f,v] of [['dateStart','2026-10-20'],['dateDays','10']]){const e=document.getElementById(f);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}")
    st = await p.evaluate("howData&&howData.steps.map(s=>s.text)")
    check(L + 'Dates: the weekend days and the holiday skipped', st and '4 weekend days and 1 public holiday (28 October)' in st, st)
    await p.evaluate("setDateCount('all')")
    await p.context.close()
    # Subnet: the bits lined up, and on a phone the whole working fits without scrolling
    for lang in ['en', 'el']:
        p = await new_page(browser, url, lang, 'dark', phone=True)
        await p.evaluate("switchMode('net');setToolKind('net','subnet')")
        await p.evaluate("for(const [f,v] of [['netIp','192.168.10.77'],['netPrefix','26']]){const e=document.getElementById(f);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}")
        await p.evaluate("showHow()")
        st = await p.evaluate("""(()=>{const c=document.querySelector('#howModal .modal-card'),rows=[...document.querySelectorAll('.how-bits-row')];
          return [c.scrollHeight<=c.clientHeight+1,rows.length,rows[0].querySelector('.nb').textContent.replace(/\\./g,'').length,rows[0].querySelector('.hb').textContent,
          rows.every(r=>r.querySelector('code').scrollWidth<=r.querySelector('code').clientWidth+1)]})()""")
        check(f'[explanations phone {lang}] Subnet: fits without scrolling, 26 network bits and 6 host bits, nothing cut', st == [True, 4, 26, '001101', True], st)
        await p.context.close()


async def side_panels(browser, url):
    """Big screens: History on the left and the working on the right, live; none where there is no room."""
    L = '[side panels] '
    p = await new_page(browser, url, 'en', 'dark', size=(1920, 1080))
    await p.wait_for_timeout(100)
    geo = "(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),c=r('#calculatorCard'),a=r('#sideHistory'),b=r('#sideWork');return [document.documentElement.classList.contains('side-panels'),a.right<=c.left-10,b.left>=c.right+10,a.left>=0,b.right<=innerWidth,Math.abs(a.top-c.top)<2,Math.abs(b.top-c.top)<2,a.width>=260]})()"
    st = await p.evaluate(geo)
    check(L + 'beside the card, level with it, on the screen', st == [True] * 8, st)
    check(L + 'before a result: a hint', 'Press =' in await p.evaluate("sideWorkBody.textContent"))
    for k in ['1', '2', '+', '7', '*', '3']:
        await p.keyboard.type(k)
    await p.keyboard.press('Enter')
    await p.wait_for_timeout(100)
    st = await p.evaluate("[[...document.querySelectorAll('#sideWorkBody .how-line strong')].map(s=>s.textContent),document.querySelector('#sideHistoryList .history-result').textContent]")
    check(L + 'the working and the History update by themselves', st == [['Multiply first', 'Add'], '33'], st)
    st = await p.evaluate("(()=>{const v=s=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0};return [v('#historyButton'),v('#howButton'),v('#sideHistoryHead #clearHistory'),v('#sideHistoryHead #historyChartButton')]})()")
    check(L + 'no History or ? button beside the panels; Clear all and the chart are in the History panel', st == [False, False, True, True], st)
    check(L + 'one calculation: the History chart button is dimmed', await p.evaluate("historyChartButton.disabled"))
    for k in ['4', '0', '-', '7']:
        await p.keyboard.type(k)
    await p.keyboard.press('Enter')
    await p.wait_for_timeout(100)
    await p.click('#historyChartButton')
    await p.wait_for_timeout(200)
    st = await p.evaluate("[!!document.querySelector('#sideHistory #historyChartWrap:not(.hidden)'),document.querySelector('#historyChart').getBoundingClientRect().width>100]")
    check(L + 'the History chart opens in the panel', st == [True, True], st)
    await p.click('#historyChartButton')
    await p.keyboard.press('Escape')
    await p.wait_for_timeout(100)
    await p.click('#sideHistoryList .history-main')
    await p.wait_for_timeout(100)
    check(L + 'a History entry brings the calculation back', await p.evaluate(R) == '33', await p.evaluate(R))
    await p.evaluate("switchMode('vat');(()=>{const e=document.getElementById('amount');e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}))})()")
    await p.wait_for_timeout(150)
    st = await p.evaluate("[sideHistoryTitle.textContent,document.querySelectorAll('#sideWorkBody .how-line').length,[...document.querySelectorAll('#sideChart .crow .cl')].map(x=>x.textContent)]")
    check(L + 'VAT: its own History, the working and the chart under it', st == ['History · VAT', 2, ['24%', '13%', '6%']], st)
    st = await p.evaluate("['#chartButton','#historyChartButton','#howButton'].map(s=>{const e=document.querySelector(s);return !!e&&getComputedStyle(e).display!=='none'})")
    check(L + 'VAT: no chart or ? button beside the panels, no History chart button', st == [False, False, False], st)
    await p.evaluate("switchMode('graph')")
    await p.wait_for_timeout(250)
    check(L + 'Graph: its key points', await p.evaluate("sideWorkTitle.textContent") == 'Key points' and await p.evaluate("document.querySelectorAll('#sideWorkBody .graph-point-line').length") >= 3)
    await p.evaluate("setLanguage('el')")
    await p.wait_for_timeout(900)
    await p.evaluate("switchMode('calc')")
    await p.wait_for_timeout(100)
    check(L + 'a language switch reaches the panels', await p.evaluate("[sideHistoryTitle.textContent,sideWorkTitle.textContent]") == ['Ιστορικό', 'Πώς υπολογίστηκε;'], await p.evaluate("[sideHistoryTitle.textContent,sideWorkTitle.textContent]"))
    pos = "[...document.querySelectorAll('#sideHistoryTitle,#sideHistoryList,#clearHistory')].map(e=>Math.round(e.getBoundingClientRect().top))"
    before = await p.evaluate(pos)
    await p.click('#clearHistory')
    await p.wait_for_timeout(250)
    st = await p.evaluate("[clearHistory.textContent,clearHistory.classList.contains('armed'),document.querySelectorAll('#sideHistoryList .history-item').length>0]")
    check(L + 'Clear all asks first: the button turns into "Delete all?", nothing deleted yet', st == ['Διαγραφή όλων;', True, True], st)
    check(L + 'asking moves nothing', await p.evaluate(pos) == before, [before, await p.evaluate(pos)])
    await p.click('#clearHistory')  # the second press deletes
    await p.wait_for_timeout(150)
    check(L + 'nothing left: Clear all and the chart button are dimmed', await p.evaluate("[clearHistory.disabled,historyChartButton.disabled]") == [True, True])
    check(L + 'Delete all in the History panel', await p.evaluate("[document.querySelectorAll('#sideHistoryList .history-item').length,store.get('uc-history')]") == [0, None], await p.evaluate("[document.querySelectorAll('#sideHistoryList .history-item').length,store.get('uc-history')]"))
    for k in ['2', '+', '2']:
        await p.keyboard.type(k)
    await p.keyboard.press('Enter')
    await p.set_viewport_size({'width': 1100, 'height': 800})
    await p.wait_for_timeout(250)
    st = await p.evaluate("[getComputedStyle(historyButton).display!=='none',getComputedStyle(howButton).display!=='none',!!document.querySelector('#historyPanel #historyClearWrap'),!!document.querySelector('#historyPanel #historyChartWrap')]")
    check(L + 'no panels: the History and ? buttons are back, and the sheet has Clear all and the chart again', st == [True, True, True, True], st)
    check(L + 'no room, no panels', await p.evaluate("[document.documentElement.classList.contains('side-panels'),getComputedStyle(sideWork).display]") == [False, 'none'])
    await p.context.close()
    p = await new_page(browser, url, 'en', 'dark', phone=True)
    await p.wait_for_timeout(100)
    check('[side panels phone] none on a phone', not await p.evaluate("document.documentElement.classList.contains('side-panels')"))
    await p.context.close()


async def memory_keys(browser, url):
    """Memory: MS, M+, M−, MR, MC, the first row of the scientific keys, kept across visits, shown beside f(x), Ctrl shortcuts."""
    L = '[memory] '
    p = await new_page(browser, url, 'en', 'dark')
    check(L + 'the basic calculator has no memory keys', await p.evaluate("document.querySelectorAll('#keypad [data-mem]').length") == 0)
    await p.evaluate("toggleSci()")
    st = await p.evaluate("[...document.querySelectorAll('#keypad .mem-key')].map(b=>{const r=document.createRange();r.selectNodeContents(b);return Math.round(r.getBoundingClientRect().top-b.getBoundingClientRect().top)})")
    check(L + 'MC and MR (dimmed) line up with M+ M− MS', len(set(st)) == 1, st)
    check(L + 'f(x): MC MR M+ M− MS are the first row of the scientific keys', await p.evaluate("[...document.querySelectorAll('#keypad .sci-key')].slice(0,5).map(b=>b.textContent)") == ['MC', 'MR', 'M+', 'M−', 'MS'])
    mem = "[localStorage.getItem('uc-memory'),document.querySelector('.mem-chip')?.textContent||'',document.querySelector('.mem-key[data-mem=\"mr\"]').classList.contains('mem-empty')]"
    check(L + 'nothing in memory: MR and MC look empty, no chip', await p.evaluate(mem) == [None, '', True])
    await p.keyboard.type('450+380')
    await p.keyboard.press('Enter')
    await p.click('.mem-key[data-mem="ms"]')
    st = await p.evaluate(mem)
    check(L + 'MS keeps the result; the chip shows it', st[0].startswith('830') and st[1] == 'M 830' and not st[2], st)
    await p.keyboard.type('20')
    await p.click('.mem-key[data-mem="m+"]')
    check(L + 'M+ adds the number being typed', await p.evaluate("fmt(memory)") == '850')
    await p.keyboard.type('5')
    check(L + 'after a memory key the next digit starts a new number', await p.evaluate(R) == '5', await p.evaluate(R))
    await p.keyboard.press('Escape')
    await p.keyboard.type('2*')
    await p.click('.mem-key[data-mem="mr"]')
    await p.keyboard.press('Enter')
    check(L + 'MR brings it back into a calculation', await p.evaluate(R) == '1.700', await p.evaluate(R))
    await p.keyboard.press('Escape')
    await p.keyboard.type('1/3')
    await p.keyboard.press('Enter')
    await p.click('.mem-key[data-mem="m-"]')
    check(L + 'M− takes the result away, exactly', await p.evaluate("ratEq(memory,ratFromString('849').n?ratSub(ratFromString('850'),ratDiv(rat(1n),rat(3n))):null)"))
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'kept across visits', await p.evaluate("fmt(memory)") == '849,666667' and await p.evaluate("document.querySelector('.mem-chip').textContent") == 'M 849,666667')
    await p.keyboard.press('Control+l')
    check(L + 'Ctrl+L clears it (MC)', await p.evaluate(mem) == [None, '', True])
    await p.keyboard.type('7')
    await p.keyboard.press('Control+m')
    await p.keyboard.press('Control+p')
    await p.keyboard.press('Escape')
    await p.keyboard.press('Control+r')
    check(L + 'Ctrl+M stores, Ctrl+P adds, Ctrl+R recalls', await p.evaluate(R) == '14', await p.evaluate(R))
    await p.keyboard.press('Escape')
    await p.click('.mem-key[data-mem="mc"]')
    await p.click('.mem-key[data-mem="mr"]')
    check(L + 'MR with nothing in memory does nothing', await p.evaluate(R) == '0')
    await p.keyboard.type('9')
    await p.keyboard.press('Control+m')
    await p.evaluate("toggleSci()")
    check(L + 'scientific off: no memory keys, the chip still shows what is kept', await p.evaluate("[document.querySelectorAll('#keypad [data-mem]').length,document.querySelector('.mem-chip')?.textContent]") == [0, 'M 9'])
    await p.evaluate("memKey('mc');switchMode('units')")
    check(L + 'other modes have no memory keys', await p.evaluate("document.querySelectorAll('[data-mem]').length") == 0)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def no_magnifier(browser, url):
    """iPhone: a long press or a fast double tap on a key never starts a text selection (the magnifier bubble). Each key
    holds a hidden switch for the tap tick; it, read-only tool fields (phones) and everything else can't be selected."""
    L = '[no magnifier] '
    p = await new_page(browser, url, 'en', 'dark', phone=True)
    st = await p.evaluate("""(()=>{const key=document.querySelector('#keypad [data-value="7"]');
      const l=document.createElement('label'),i=document.createElement('input');l.className='key-tick';i.type='checkbox';i.setAttribute('switch','');l.appendChild(i);key.appendChild(l);
      const sel=e=>{const ev=new Event('selectstart',{bubbles:true,cancelable:true});e.dispatchEvent(ev);return ev.defaultPrevented};
      const css=e=>getComputedStyle(e).webkitUserSelect||getComputedStyle(e).userSelect;
      const r=[sel(i),css(i),sel(key)];switchMode('vat');const f=document.querySelector('#amount');
      return [...r,sel(f),css(f),f.readOnly]})()""")
    check(L + 'a key, its hidden switch and a read-only field never start a selection', st == [True, 'none', True, True, 'none', True], st)
    await p.evaluate("switchMode('calc');openModes()")
    st = await p.evaluate("(()=>{const s=document.querySelector('#modesSearch'),ev=new Event('selectstart',{bubbles:true,cancelable:true});s.dispatchEvent(ev);return ev.defaultPrevented})()")
    check(L + 'a field you type in (the modes search) still can be selected', st is False, st)
    await p.evaluate("closeModes?.()")
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def more_functions(browser, url):
    """Scientific: hyp, nCr/nPr, mod, |x|, φ, the ⋯ sheet of functions and constants, all worked out exactly where possible."""
    L = '[functions] '
    p = await new_page(browser, url, 'en', 'dark')
    vals = await p.evaluate("""['5C2','5P2','10C0','3C5','17m5','-17m5','7.5m2','2×4C2','cot(45)','cot(90)','sec(60)','csc(30)','acot(1)','asec(2)','acsc(2)',
      'sinh(0)','cosh(0)','tanh(0)','acosh(1)','atanh(0)','asinh(0)','abs(-2.5)','φ^2-φ','⟨c⟩','⟨NA⟩×⟨k⟩÷⟨R⟩'].map(e=>{try{return formatRat(evalExpr(e))}catch(x){return x.message}})""")
    want = ['10', '20', '1', '0', '2', '3', '1,5', '12', '1', '0', '2', '2', '45', '60', '30', '0', '1', '0', '0', '0', '0', '2,5', '1', '299.792.458', '1']
    check(L + 'nCr, nPr, mod, cot/sec/csc and inverses, hyperbolic, |x|, φ, constants', vals == want, list(zip(vals, want)))
    errs = await p.evaluate("['5.5C2','-1C1','5m0','acosh(0.5)','atanh(1)','coth(0)','csc(0)'].map(e=>{try{return formatRat(evalExpr(e))}catch(x){return x.message}})")
    check(L + 'outside their domain they say why', errs == ['MATH', 'MATH', 'DIV0', 'MATH', 'MATH', 'MATH', 'MATH'], errs)
    await p.evaluate("toggleSci()")
    await p.click('[data-sci="hyp"]')
    check(L + 'hyp turns sin cos tan into sinh cosh tanh', await p.evaluate("[...document.querySelectorAll('#keypad [data-sci]')].slice(2,5).map(b=>b.textContent)") == ['sinh', 'cosh', 'tanh'])
    await p.click('[data-sci="2nd"]')
    check(L + 'and 2nd into their inverses', await p.evaluate("document.querySelector('[data-sci=\"asinh\"]').textContent") == 'sinh⁻¹')
    await p.click('[data-sci="2nd"]')
    await p.keyboard.type('1')
    await p.click('[data-sci="sinh"]')
    await p.keyboard.press('Enter')
    check(L + '1 sinh = 1,175201 (or 1,1752011936 when it fits)', await p.evaluate(R) in ('1,175201', '1,1752011936'), await p.evaluate(R))
    await p.click('[data-sci="hyp"]')
    await p.keyboard.press('Escape')
    for k in ['5']:
        await p.keyboard.type(k)
    await p.click('[data-sci="ncr"]')
    await p.keyboard.type('2')
    check(L + 'nCr shows as 5C2', await p.evaluate(R) == '5C2', await p.evaluate(R))
    await p.keyboard.press('Enter')
    st = await p.evaluate("[document.querySelector('#result').textContent,howData.steps[0].text]")
    check(L + '5C2 = 10, written out in the working', st == ['10', '5 C 2 = 5! ÷ (2! × 3!) = 10'], st)
    await p.click('[data-sci="mod"]')
    await p.keyboard.type('4')
    check(L + 'mod after a result goes on from it', await p.evaluate(R) == '10 mod 4', await p.evaluate(R))
    await p.keyboard.press('Enter')
    check(L + '10 mod 4 = 2', await p.evaluate(R) == '2')
    await p.keyboard.press('Escape')
    await p.keyboard.type('2')
    await p.click('[data-sci="more"]')
    check(L + '⋯ opens the sheet with its groups', await p.evaluate("[document.querySelector('#howModal').classList.contains('fn-open'),document.querySelectorAll('#howContent .fn-group').length,document.querySelectorAll('#howContent .fn-const').length]") == [True, 5, 44])
    await p.keyboard.type('speed light')
    check(L + 'the search finds the speed of light', await p.evaluate("[...document.querySelectorAll('#howContent [data-fn]')].filter(b=>!b.hidden).map(b=>b.dataset.fn)") == ['const:c'])
    await p.keyboard.press('Enter')
    st = await p.evaluate("[document.querySelector('#howModal').classList.contains('hidden'),document.querySelector('#result').textContent]")
    check(L + 'Enter puts it in, after × , and closes the sheet', st == [True, '2×c'], st)
    await p.keyboard.press('Backspace')
    check(L + '⌫ removes a constant whole', await p.evaluate("expression+current") == '2×', await p.evaluate("expression+current"))
    await p.click('[data-sci="more"]')
    await p.click('#howContent [data-fn="acot"]')
    await p.keyboard.type('1')
    await p.keyboard.press('Enter')
    check(L + 'a function from the sheet: 2 × cot⁻¹(1) = 90', await p.evaluate("[document.querySelector('#expression').textContent,document.querySelector('#result').textContent]") == ['2×cot⁻¹(1)', '90'], await p.evaluate("[document.querySelector('#expression').textContent,document.querySelector('#result').textContent]"))
    await p.keyboard.press('Escape')
    await p.evaluate("sciKey('phi')")
    await p.keyboard.press('Enter')
    check(L + 'φ = 1,618034 (or 1,6180339887 when it fits)', await p.evaluate(R) in ('1,618034', '1,6180339887'), await p.evaluate(R))
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def complex_numbers(browser, url):
    """Complex numbers: i, r∠θ, exact arithmetic, functions, a+bi / r∠θ, carrying on, History, memory, the working."""
    L = '[complex] '
    p = await new_page(browser, url, 'en', 'dark')
    vals = await p.evaluate("""['(3+2×i)×(1-i)','i×i','√(-4)','(-4)^0.5','1÷i','(3+4×i)÷(1-2×i)','e^(π×i)','ln(-1)','2∠30','2∠90','abs(3+4×i)','(1+i)^10',
      'i^i','√(i)','(2+i)-(2+i)','sin(i)','(1+i)!','5m(1+i)'].map(e=>{try{return fmt(evalExpr(e))}catch(x){return x.message}})""")
    want = ['5 − i', '-1', '2i', '2i', '-i', '-1 + 2i', '-1', '3,141593i', '1,732051 + i', '2i', '5', '32i', '0,20788', '0,707107 + 0,707107i',
            '0', '0,017454i', 'MATH', 'MATH']
    check(L + 'arithmetic exact, functions, √ and ln of negatives, polar entry', vals == want, list(zip(vals, want)))
    await p.evaluate("toggleSci()")
    await p.keyboard.type('98+25')
    check(L + 'a real calculation has no second line', await p.evaluate("document.querySelector('#resultAlt')") is None)
    await p.keyboard.type('i')
    check(L + 'pressing i shows the polar form at once', await p.evaluate("[document.querySelector('#result').textContent,document.querySelector('#resultAlt')?.textContent]") == ['98+25i', '101,138519 ∠ 14,311041°'])
    await p.keyboard.press('Enter')
    check(L + '98 + 25i: both forms on screen, ? explains the polar form', await p.evaluate("[document.querySelector('#result').textContent,document.querySelector('#resultAlt')?.textContent,document.querySelector('#howButton').classList.contains('hidden'),howData.steps.map(s=>s.title)]") == ['98 + 25i', '101,138519 ∠ 14,311041°', False, ['Polar form: size ∠ angle']])
    await p.evaluate("switchMode('vat')")
    check(L + 'other modes never show the line', await p.evaluate("document.querySelector('#resultAlt')") is None)
    await p.evaluate("switchMode('calc')")
    await p.keyboard.press('Escape')
    await p.evaluate("toggleSci()")
    check(L + 'real calculations are unchanged (√2, ln 2, (−8)^(1/3))', await p.evaluate("['√(2)','ln(2)','(-8)^(1÷3)'].map(e=>fmt(evalExpr(e)))") == ['1,414214', '0,693147', '-2'])
    await p.evaluate("toggleSci()")
    for k in ['(', '3', '+', '2']:
        await p.keyboard.type(k)
    await p.keyboard.type('i')
    await p.keyboard.type(')*(1-')
    await p.click('[data-sci="i"]')
    await p.keyboard.type(')')
    check(L + 'typed with the i key and the keyboard, shown as 2i', await p.evaluate(R) == '(3+2i)×(1-i)', await p.evaluate(R))
    check(L + 'while typing, the line under it shows the value in both forms', await p.evaluate("document.querySelector('#resultAlt')?.textContent") == '= 5 − i  ·  5,09902 ∠ -11,309932°')
    await p.keyboard.press('Enter')
    check(L + '(3 + 2i)(1 − i) = 5 − i, with r ∠ θ under it, no button to press', await p.evaluate("[document.querySelector('#result').textContent,document.querySelector('#resultAlt')?.textContent,document.querySelectorAll('.cx-chip').length]") == ['5 − i', '5,09902 ∠ -11,309932°', 0])
    st = await p.evaluate("[howData.formula,howData.steps.map(s=>s.title)]")
    check(L + 'the working multiplies them out (i² = −1), then gives size and angle', st == ['(3 + 2i) × (1 − i)', ['Multiply (i² = −1)', 'Polar form: size ∠ angle']], st)
    st = await p.evaluate("howData.steps[1].text")
    check(L + 'r = √(5² + (-1)²), θ = atan2(-1; 5)', st == 'r = √(5² + (-1)²) = 5,09902… · θ = atan2(-1; 5) = -11,309932…°', st)
    await p.keyboard.type('*2')
    check(L + 'carried on whole: (5 − i)×2', await p.evaluate(R) == '(5 − i)×2', await p.evaluate(R))
    await p.keyboard.press('Enter')
    check(L + '= 10 − 2i', await p.evaluate(R) == '10 − 2i')
    st = await p.evaluate("historyItems()[0]")
    check(L + 'History keeps it written out', st['expression'] == '(5-1×i)×2' and st['result'] == '10|-2' and st['shown'] == '(5 − i)×2', st)
    await p.click('.mem-key[data-mem="ms"]')
    check(L + 'memory keeps a complex number', await p.evaluate("[localStorage.getItem('uc-memory'),document.querySelector('.mem-chip').textContent]") == ['10|-2', 'M 10 − 2i'])
    await p.keyboard.press('Escape')
    await p.click('.mem-key[data-mem="mr"]')
    await p.keyboard.type('+1')
    await p.keyboard.press('Enter')
    check(L + 'MR brings it back: 11 − 2i', await p.evaluate(R) == '11 − 2i', await p.evaluate(R))
    await p.keyboard.press('Escape')
    await p.keyboard.type('2')
    await p.click('[data-sci="2nd"]')
    await p.click('[data-sci="polar"]')
    await p.click('[data-sci="2nd"]')
    await p.keyboard.type('90')
    await p.keyboard.press('Enter')
    check(L + '2∠90 = 2i exactly', await p.evaluate("[document.querySelector('#expression').textContent,document.querySelector('#result').textContent,howData.steps[0].title]") == ['2∠90', '2i', 'Polar form: r(cos θ + i sin θ)'])
    await p.keyboard.press('Escape')
    await p.evaluate("historyClick({target:document.querySelector('#historyList .history-main')})")
    check(L + 'a complex calculation comes back from History', await p.evaluate(R) == '2i')
    await p.reload()
    await p.wait_for_timeout(300)
    check(L + 'History and memory survive a reload', await p.evaluate("[document.querySelector('#historyList .history-result').textContent,document.querySelector('.mem-chip').textContent]") == ['2i', 'M 10 − 2i'])
    await p.evaluate("memKey('mc')")
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def numbers_equations(browser, url):
    """Numbers (GCD and LCM, prime factors and divisors) and Equations (ax² + bx + c = 0 with complex roots, a 2×2 system),
    typed on the keypad, in both languages, with the working and History."""
    L = '[numbers & equations] '
    p = await new_page(browser, url, 'en', 'dark')
    run = """([m,k,f])=>{switchMode(m);setToolKind(m,k);for(const[id,v] of Object.entries(f)){const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}
      return [document.querySelector('#result').textContent,document.querySelector('#expression').textContent]}"""
    cases = [('numbers', 'gcd', {'numA': '48', 'numB': '18', 'numC': '30'}, ['GCD 6 · LCM 720', '48 = 2⁴ × 3 · 18 = 2 × 3² · 30 = 2 × 3 × 5']),
             ('numbers', 'gcd', {'numA': '12', 'numB': '35', 'numC': ''}, ['GCD 1 · LCM 420', '12 = 2² × 3 · 35 = 5 × 7']),
             ('numbers', 'factors', {'numN': '360'}, ['2³ × 3² × 5', 'Divisors: 24 · sum 1.170']),
             ('numbers', 'factors', {'numN': '97'}, ['97', 'A prime number']),
             ('numbers', 'factors', {'numN': '600851475143'}, ['71 × 839 × 1.471 × 6.857', 'Divisors: 16 · sum 610.544.148.480']),
             ('numbers', 'factors', {'numN': '999999794345459'}, ['3.162.277 × 316.227.767', 'Divisors: 4 · sum 1.000.000.113.735.504']),
             ('equation', 'quad', {'eqA': '1', 'eqB': '2', 'eqC': '-1'}, ['x₁ = 0,414214, x₂ = -2,414214', 'Δ = 8 · two real roots']),
             ('equation', 'quad', {'eqA': '1', 'eqB': '2', 'eqC': '5'}, ['x₁ = -1 + 2i, x₂ = -1 − 2i', 'Δ = -16 · two complex roots']),
             ('equation', 'quad', {'eqA': '1', 'eqB': '-2', 'eqC': '1'}, ['x = 1', 'Δ = 0 · one double root']),
             ('equation', 'quad', {'eqA': '2', 'eqB': '', 'eqC': '-8'}, ['x₁ = 2, x₂ = -2', 'Δ = 64 · two real roots']),
             ('equation', 'quad', {'eqA': '0', 'eqB': '2', 'eqC': '-4'}, ['x = 2', 'Linear (a = 0)']),
             ('equation', 'sys2', {'sxA1': '2', 'sxB1': '1', 'sxC1': '5', 'sxA2': '1', 'sxB2': '-1', 'sxC2': '1'}, ['x = 2, y = 1', 'D = -3']),
             ('equation', 'sys2', {'sxA1': '1', 'sxB1': '1', 'sxC1': '2', 'sxA2': '2', 'sxB2': '2', 'sxC2': '4'}, ['Infinitely many solutions', 'D = 0']),
             ('equation', 'sys2', {'sxA1': '1', 'sxB1': '1', 'sxC1': '2', 'sxA2': '2', 'sxB2': '2', 'sxC2': '5'}, ['No solution', 'D = 0'])]
    bad = []
    for m, k, f, want in cases:
        got = await p.evaluate(run, [m, k, f])
        if got != want:
            bad.append((k, f, got, want))
    check(L + 'GCD/LCM, prime factors (big ones too), quadratic (complex, double, linear), 2×2 system', not bad, bad)
    st = await p.evaluate("[howData.formula,howData.steps.map(s=>s.title).join(' | ')]")
    check(L + 'the system has its working (Cramer)', st[0] and 'D' in st[1], st)
    await p.evaluate(run, ['equation', 'quad', {'eqA': '1', 'eqB': '0', 'eqC': '-2'}])
    st = await p.evaluate("howData.steps.map(s=>s.text||'').join(' | ')")
    check(L + 'the working gives the exact roots: ±√2', '√2' in st, st)
    # typed on the keypad: ± for a negative coefficient; the counting fields take no comma
    await p.evaluate("switchMode('equation');setToolKind('equation','quad')")
    await p.click('.tool-key[data-action="clear-all"]')
    await p.click('#eqA')
    for k in ['1']:
        await p.click(f'#keypad [data-value="{k}"]')
    await p.click('#eqB')
    await p.click('#keypad [data-value="4"]')
    await p.click('#eqC')
    await p.click('#keypad [data-value="3"]')
    await p.click('#keypad [data-value="-"]')
    check(L + 'typed with ± : x² + 4x − 3', await p.evaluate("[eqC.value,document.querySelector('#result').textContent]") == ['-3', 'x₁ = 0,645751, x₂ = -4,645751'], await p.evaluate("[eqC.value,document.querySelector('#result').textContent]"))
    await p.evaluate("switchMode('numbers');setToolKind('numbers','factors')")
    await p.click('.tool-key[data-action="clear-all"]')
    await p.click('#numN')
    for k in ['1', '2']:
        await p.click(f'#keypad [data-value="{k}"]')
    await p.keyboard.type(',5')
    check(L + 'a number to factor takes no comma', await p.evaluate("numN.value") == '125', await p.evaluate("numN.value"))
    check(L + '125 = 5³', await p.evaluate("document.querySelector('#result').textContent") == '5³')
    await p.evaluate("setLanguage('el')")
    await p.wait_for_timeout(500)
    check(L + 'Greek after a live switch', await p.evaluate("[document.querySelector('#expression').textContent,document.querySelector('[data-tab=\\'numbers\\']')?.textContent||MODE_TRANSLATIONS.numbers[0]]") == ['Διαιρέτες: 4 · άθροισμα 156', 'Αριθμοί'],
          await p.evaluate("[document.querySelector('#expression').textContent]"))
    await p.evaluate("switchMode('calc')")
    st = await p.evaluate("(JSON.parse(localStorage.getItem('uc-history-modes')||'{}').numbers||[]).length")
    check(L + 'History keeps the factorisation when leaving the mode', st >= 1, st)
    await p.evaluate("setLanguage('en')")
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def statistics(browser, url):
    """Statistics: numbers added one at a time (keypad Add, Enter) or pasted, taken out by a tap or brought back with ⌫;
    average, median, both standard deviations, min, max, sum; the working, History, Greek, AC."""
    L = '[statistics] '
    p = await new_page(browser, url, 'en', 'dark')
    add = """(vs)=>{switchMode('stats');for(const v of vs){statX.value=v;statX.dispatchEvent(new Event('input',{bubbles:true}));statAdd()}
      return [document.querySelector('#result').textContent,document.querySelector('#expression').textContent,[...document.querySelectorAll('#statDetails strong')].map(s=>s.textContent)]}"""
    got = await p.evaluate(add, ['2', '4', '4', '4', '5', '5', '7', '9'])
    check(L + 'average, median, s, σ, min, max, sum', got == ['5', 'Average of 8 numbers', ['4,5', '2,13809', '2', '2', '9', '40']], got)
    st = await p.evaluate("[howData.steps.length,howData.steps.map(s=>s.title).join(' | '),howData.steps.map(s=>s.text).join(' | ')]")
    check(L + 'the working: sum, average, median, variance, both deviations, range, mode', st[0] >= 9 and 'Median' in st[1] and 'Mode' in st[1] and '4 (3 times)' in st[2], st)
    chips = "[...document.querySelectorAll('#statList .stat-chip')].map(c=>c.firstChild.textContent)"
    await p.click('.tool-key[data-action="clear-all"]')
    check(L + 'AC empties the list', await p.evaluate(chips) == [] and await p.evaluate("document.querySelector('#result').textContent") == '0')
    # the keypad: digits, comma, ±, Add; Add with nothing typed does nothing
    for k in ['1', '2', ',', '5']:
        await p.click(f'#keypad [data-value="{k}"]')
    await p.click('#keypad [data-value="-"]')
    await p.click('#keypad .stat-add')
    await p.click('#keypad .stat-add')
    for k in ['1', '0', '0', '0']:
        await p.click(f'#keypad [data-value="{k}"]')
    await p.keyboard.press('Enter')
    await p.keyboard.type('3')
    await p.keyboard.press('Enter')
    check(L + 'typed with the keypad (± too) and Enter; Add on an empty field adds nothing', await p.evaluate(chips) == ['-12,5', '1.000', '3'], await p.evaluate(chips))
    await p.keyboard.press('Backspace')
    st = await p.evaluate("[statX.value," + chips + "]")
    check(L + '⌫ on an empty field brings the last number back', st == ['3', ['-12,5', '1.000']], st)
    await p.click('#statList .stat-chip[data-i="0"]')
    check(L + 'a tap on a number takes it out', await p.evaluate(chips) == ['1.000'], await p.evaluate(chips))
    await p.evaluate("""(()=>{const dt=new DataTransfer();dt.setData('text/plain','1,5\\n2\\n2,5\\n');statX.value='';
      statX.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))})()""")
    check(L + 'a pasted column adds every number', await p.evaluate(chips) == ['1.000', '1,5', '2', '2,5'], await p.evaluate(chips))
    got = await p.evaluate(add, [])
    check(L + 'the median of an even count, s needs 2 numbers', got[0] == '251,5' and got[2][0] == '2,25', got)
    got = await p.evaluate("(()=>{clearToolFields();statX.value='7';statX.dispatchEvent(new Event('input',{bubbles:true}));statAdd();return [...document.querySelectorAll('#statDetails strong')].map(s=>s.textContent)})()")
    check(L + 'one number: no sample deviation (–), σ = 0', got == ['7', '–', '0', '7', '7', '7'], got)
    await p.evaluate(add, ['10', '20'])
    await p.evaluate("setLanguage('el')")
    await p.wait_for_timeout(300)
    st = await p.evaluate("[document.querySelector('#expression').textContent,document.querySelector('#keypad .stat-add').textContent,document.querySelector('#statDetails span').textContent," + chips + "]")
    check(L + 'Greek after a live switch, the list kept', st == ['Μέσος όρος 3 αριθμών', 'Προσθήκη', 'Διάμεσος', ['7', '10', '20']], st)
    await p.evaluate("setLanguage('en');switchMode('calc')")
    entry = await p.evaluate("(JSON.parse(localStorage.getItem('uc-history-modes')||'{}').stats||[])[0]")
    check(L + 'History keeps the list when leaving', bool(entry) and entry['inputs'].get('statList') == '7;10;20', entry)
    await p.evaluate("restoreModeEntry((JSON.parse(localStorage.getItem('uc-history-modes')).stats)[0])")
    st = await p.evaluate("[mode," + chips + ",document.querySelector('#result').textContent]")
    check(L + 'tapping it in History brings the numbers back', st == ['stats', ['7', '10', '20'], '12,333333'], st)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def programmer(browser, url):
    """Programmer: one number in decimal, hex, binary and octal; typed in any field (keypad, keyboard, paste), the others
    follow; keys a base hasn't got are refused; up to 64 bits; the working, Greek, History, AC."""
    L = '[programmer] '
    p = await new_page(browser, url, 'en', 'dark')
    put = """([id,v])=>{switchMode('prog');const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));
      return [progDec.value,progHex.value,progBin.value,progOct.value,document.querySelector('#result').textContent,document.querySelector('#expression').textContent]}"""
    got = await p.evaluate(put, ['progDec', '255'])
    check(L + '255 in every base', got == ['255', 'FF', '1111 1111', '377', 'FF', 'Hexadecimal · 8 bits'], got)
    st = await p.evaluate("howData.steps.map(s=>s.text).join(' | ')")
    check(L + 'the working divides by the base', '255 ÷ 2 = 127, remainder 1' in st and '→ 1111 1111₂' in st, st)
    got = await p.evaluate(put, ['progBin', '1010'])
    check(L + 'typed in binary', got == ['10', 'A', '1010', '12', '10', 'Decimal · 4 bits'], got)
    st = await p.evaluate("howData.steps[0].text")
    check(L + 'the working: each digit times its place', st == '1 × 2³ + 0 × 2² + 1 × 2¹ + 0 × 2⁰', st)
    got = await p.evaluate(put, ['progHex', '0x1f'])
    check(L + 'a pasted 0x1f', got[:2] == ['31', '1F'], got)
    await p.click('.tool-key[data-action="clear-all"]')
    check(L + 'AC empties every field', await p.evaluate("[progDec.value,progHex.value,progBin.value,progOct.value,document.querySelector('#result').textContent]") == ['', '', '', '', '0'])
    await p.click('#progHex')
    for k in ['A', 'B', '1']:
        await p.click(f'#keypad [data-value="{k}"]')
    check(L + 'hex on the keypad', await p.evaluate("[progHex.value,progDec.value]") == ['AB1', '2.737'], await p.evaluate("[progHex.value,progDec.value]"))
    await p.click('#progBin')
    st = await p.evaluate("[...document.querySelectorAll('#keypad .key-off')].map(b=>b.dataset.value).join('')")
    check(L + 'binary: only 0 and 1 are lit', st == '23456789ABCDEF' or sorted(st) == sorted('23456789ABCDEF'), st)
    before = await p.evaluate("progBin.value")
    await p.click('#keypad [data-value="7"]')
    await p.click('#keypad [data-action="backspace"]')
    check(L + 'a digit binary hasn\'t got is refused; ⌫ removes the last bit', await p.evaluate("[progBin.value,progDec.value]") == ['101 0101 1000', '1.368'], [before, await p.evaluate("[progBin.value,progDec.value]")])
    await p.evaluate(put, ['progHex', 'FFFFFFFFFFFFFFFF'])
    await p.click('#progHex')
    await p.click('#keypad [data-value="F"]')
    st = await p.evaluate("[progHex.value,progDec.value]")
    check(L + '64 bits at most', st == ['FFFF FFFF FFFF FFFF', '18.446.744.073.709.551.615'], st)
    await p.click('.tool-key[data-action="clear-all"]')
    await p.focus('#progHex')
    await p.keyboard.type('c0fg')
    check(L + 'typed on a keyboard: a-f become A-F, g is refused', await p.evaluate("[progHex.value,progDec.value]") == ['C0F', '3.087'], await p.evaluate("[progHex.value,progDec.value]"))
    await p.evaluate("setLanguage('el')")
    await p.wait_for_timeout(300)
    st = await p.evaluate("[document.querySelector('#expression').textContent,document.querySelector('#progBin').closest('.tool-field').querySelector('span').textContent,progHex.value]")
    check(L + 'Greek after a live switch', st == ['Δεκαδικό · 12 bit', 'Δυαδικό', 'C0F'], st)
    await p.evaluate("setLanguage('en');switchMode('calc')")
    await p.evaluate("restoreModeEntry((JSON.parse(localStorage.getItem('uc-history-modes')).prog)[0])")
    st = await p.evaluate("[mode,progHex.value,progDec.value,document.querySelector('#result').textContent]")
    check(L + 'History brings it back', st == ['prog', 'C0F', '3.087', '3.087'], st)
    check(L + 'no JavaScript errors', not p.errors, p.errors)
    await p.context.close()


async def foldables(browser, url):
    """Foldables: an inner screen held sideways (iPhone Duo, Galaxy Fold: wide, not phone-short) gets the sideways layout
    with big keys and nothing scrolls; half open like a book (two screen segments), the fold falls between the display
    and the keypad."""
    tabs = ['calc', 'units', 'currency', 'graph', 'vat', 'pct', 'loan', 'dates', 'fuel', 'energy', 'net', 'prog', 'numbers', 'equation', 'stats']
    for size in [(924, 693), (832, 620)]:
        L = f'[foldables {size[0]}x{size[1]}] '
        p = await new_page(browser, url, 'el', 'dark', phone=True, size=size)
        bad = []
        for t in tabs:
            await p.evaluate(f"switchMode('{t}')")
            await p.wait_for_timeout(60)
            st = await p.evaluate("[document.documentElement.classList.contains('landscape'),document.documentElement.classList.contains('page-scroll'),document.documentElement.scrollWidth<=innerWidth]")
            if st != [True, False, True]:
                bad.append((t, st))
        check(L + 'every tab sideways, no scrolling', not bad, bad)
        await p.evaluate("switchMode('calc')")
        await p.wait_for_timeout(60)
        k = await p.evaluate("document.querySelector('#keypad [data-value=\"7\"]').getBoundingClientRect().height")
        check(L + 'keys bigger than on a phone held sideways', k > 70, k)
        await p.context.close()
    p = await new_page(browser, url, 'en', 'dark', phone=True, size=(1024, 768))
    check('[foldables] a tablet sideways keeps its layout', not await p.evaluate("document.documentElement.classList.contains('landscape')"))
    await p.context.close()
    for name, (w, h, off, mask) in {'iPhone Duo-like': (924, 693, 452, 20), 'Surface Duo': (1114, 720, 540, 34)}.items():
        L = f'[foldables {name}, half open] '
        p = await new_page(browser, url, 'en', 'dark', phone=True, size=(w, h))
        cdp = await p.context.new_cdp_session(p)
        bad = []
        for t in ['calc', 'loan', 'graph', 'units']:
            await p.evaluate(f"switchMode('{t}')")
            await cdp.send('Emulation.setDeviceMetricsOverride', {'width': w, 'height': h, 'deviceScaleFactor': 2, 'mobile': True, 'displayFeature': {'orientation': 'vertical', 'offset': off, 'maskLength': mask}})
            await p.wait_for_timeout(250)
            st = await p.evaluate("""(()=>{const s=window.viewport.segments,r=e=>document.querySelector(e).getBoundingClientRect();
              return [s.length,document.documentElement.classList.contains('hinge-v'),r('#calculatorDisplay').right<=s[0].right,r('#keypad').left>=s[1].left,r('#keypad').right<=s[1].right]})()""")
            if st != [2, True, True, True, True]:
                bad.append((t, st))
        check(L + 'the display on one side of the fold, the keypad on the other', not bad, bad)
        await p.context.close()


async def big_screen_dialogs(browser, url):
    """On a big screen the ? and Tips dialogs show everything without scrolling: Tips put the shortcuts beside the tips,
    and a long list of tips goes into two columns. Phones keep one column."""
    scrolls = "(()=>{const c=document.querySelector('#howModal .modal-card');return c.scrollHeight>c.clientHeight+1})()"
    for lang in ['en', 'el']:
        L = f'[big screen dialogs {lang}] '
        p = await new_page(browser, url, lang, 'dark', size=(1920, 1080))
        bad = []
        for m in ['calc', 'units', 'currency', 'graph', 'vat', 'pct', 'loan', 'dates', 'fuel', 'energy', 'net', 'prog', 'numbers', 'equation', 'stats']:
            await p.evaluate(f"closeHow();switchMode('{m}');showHelp()")
            if await p.evaluate(scrolls):
                bad.append(m)
        check(L + 'Tips fit without scrolling in every mode', not bad, bad)
        st = await p.evaluate("(()=>{const s=[...document.querySelectorAll('.help-section')].map(e=>e.getBoundingClientRect());return [s.length,s[1].left>s[0].right,Math.abs(s[1].top-s[0].top)<40]})()")
        check(L + 'the keyboard shortcuts sit beside the tips', st == [2, True, True], st)
        await p.evaluate("closeHow();switchMode('vat');showHelp()")
        wide = await p.evaluate("[document.querySelector('#howModal').classList.contains('help-wide'),getComputedStyle(document.querySelector('.help-tips')).columnCount]")
        await p.evaluate("closeHow()")
        await p.set_viewport_size({'width': 1280, 'height': 860})
        await p.evaluate("switchMode('calc');showHelp()")
        wide2 = await p.evaluate("[document.querySelector('#howModal').classList.contains('help-wide'),getComputedStyle(document.querySelector('.help-tips')).columnCount]")
        check(L + "VAT's few tips: one column; the Calculator's long list at 1280×860: two", wide == [False, 'auto'] and wide2 == [True, '2'], [wide, wide2])
        await p.evaluate("closeHow();switchMode('net')")
        await p.evaluate("(()=>{for(const [f,v] of [['netIp','192.168.10.77'],['netPrefix','26']]){const e=document.getElementById(f);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}})();showHow()")
        check(L + "Subnet's ? fits without scrolling at 1280×860", not await p.evaluate(scrolls))
        await p.context.close()
    p = await new_page(browser, url, 'en', 'dark', phone=True)
    await p.evaluate("showHelp()")
    st = await p.evaluate("[document.querySelectorAll('.help-section').length,getComputedStyle(document.querySelector('.help-tips')).columnCount,getComputedStyle(document.querySelector('.help')).display]")
    check('[big screen dialogs phone] Tips stay one column, no shortcuts', st == [1, 'auto', 'flex'], st)
    await p.context.close()


def built_site():
    """With --site: the folder tools/build.mjs made is public/ with the scripts joined into one js/app.js and the CSS
    minified, and nothing else changed or missing."""
    L = '[build] '
    src, html = re.findall(r'<script src="(js/[^"?]+)\?v=', (PUBLIC / 'index.html').read_text()), (SITE / 'index.html').read_text()
    check(L + 'the page loads one script, js/app.js, of this version', re.findall(r'<script src="([^"]+)"', html) == [f'js/app.js?v={VERSION}'],
          re.findall(r'<script src="([^"]+)"', html))
    plain = lambda h: re.sub(r'<!--[^>]*Plain scripts[^>]*-->\n|<script src="js/[^"]+"></script>\n', '', h)
    check(L + 'the page is otherwise the same as public/index.html', plain(html) == plain((PUBLIC / 'index.html').read_text()))
    files = lambda d: {f.relative_to(d).as_posix() for f in d.rglob('*') if f.is_file()}
    want = (files(PUBLIC) - set(src)) | {'js/app.js'}
    check(L + 'every other file is there, none of the joined scripts', files(SITE) == want, files(SITE) ^ want)
    same = [f for f in want - {'index.html', 'styles.css', 'js/app.js'} if (SITE / f).read_bytes() != (PUBLIC / f).read_bytes()]
    check(L + 'other files are copied unchanged', not same, same)
    size = lambda *fs: sum(f.stat().st_size for f in fs)
    check(L + 'the joined scripts and the styles are smaller', size(SITE / 'js/app.js') < size(*(PUBLIC / f for f in src)) and
          size(SITE / 'styles.css') < size(PUBLIC / 'styles.css'))
    js = (SITE / 'js/app.js').read_text()
    check(L + 'every script is in it: all their top-level functions, with their names',
          all(re.search(r'\bfunction ' + name + r'\(', js) for f in src for name in re.findall(r'^function (\w+)\(', (PUBLIC / f).read_text(), re.M)))


async def main():
    if SITE != PUBLIC:
        built_site()
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
        await own_themes(browser, url)
        await icons(browser, url)
        await update_keeps_themes(browser, url)
        await no_fuel_log(browser, url)
        await tool_charts(browser, url, False)
        await tool_charts(browser, url, True)
        await field_limits(browser, url, False)
        await field_limits(browser, url, True)
        await screen_reader(browser, url)
        await sideways_every_tab(browser, url)
        await upright_small_phones(browser, url)
        await touch_areas(browser, url)
        await more_decimals(browser, url)
        await how_buttons_in_place(browser, url)
        await all_modes(browser, url)
        await esc_everywhere(browser, url)
        await history_per_mode(browser, url)
        await shortcuts(browser, url)
        await ios_app(browser, url)
        await offline_status_and_turning(browser, url)
        await sideways_and_chips(browser, url)
        await press_feedback(browser, url)
        await big_screen_dialogs(browser, url)
        await explanations(browser, url)
        await side_panels(browser, url)
        await foldables(browser, url)
        await memory_keys(browser, url)
        await no_magnifier(browser, url)
        await more_functions(browser, url)
        await complex_numbers(browser, url)
        await numbers_equations(browser, url)
        await statistics(browser, url)
        await programmer(browser, url)
        await offline(browser)
        await preview_site(browser)
        await currency_offline(browser, url)
        await browser.close()
    print(f'{sum(results)}/{len(results)} checks passed')
    sys.exit(0 if all(results) else 1)


if __name__ == '__main__':
    asyncio.run(main())
