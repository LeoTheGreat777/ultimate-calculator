const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let expression = '';
let lastResult = null;
let currentMode = 'calc';

const historyKey = 'ultimate-calculator-history';

function formatNumber(value) {
  if (!Number.isFinite(value)) return 'Error';
  const rounded = Math.abs(value) < 1e-12 ? 0 : value;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(rounded);
}

function rawNumber(value) {
  if (!Number.isFinite(value)) return 'Error';
  return String(Number(value.toPrecision(12)));
}

function tokenize(input) {
  const cleaned = input.replace(/[€$£¥₹]/g, '').replace(/,/g, '');
  const tokens = [];
  let i = 0;
  while (i < cleaned.length) {
    const c = cleaned[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      let dots = 0;
      while (j < cleaned.length && /[0-9.]/.test(cleaned[j])) {
        if (cleaned[j] === '.') dots++;
        if (dots > 1) throw new Error('Invalid number');
        j++;
      }
      const value = Number(cleaned.slice(i, j));
      if (!Number.isFinite(value)) throw new Error('Invalid number');
      tokens.push({ type: 'number', value });
      i = j;
      continue;
    }
    if ('+-*/()'.includes(c)) { tokens.push({ type: c }); i++; continue; }
    if (c === '%') { tokens.push({ type: 'percent' }); i++; continue; }
    throw new Error(`Unsupported character: ${c}`);
  }
  return tokens;
}

// Percentages deliberately follow calculator-style semantics:
// 20 + 25% = 25, 20 - 25% = 15, 20 * 25% = 5.
function evaluate(input) {
  const tokens = tokenize(input);
  let pos = 0;

  function primary() {
    const token = tokens[pos];
    if (!token) throw new Error('Expected a number');
    if (token.type === 'number') {
      pos++;
      let node = { value: token.value, isPercent: false };
      if (tokens[pos]?.type === 'percent') {
        pos++;
        node = { value: token.value / 100, isPercent: true };
      }
      return node;
    }
    if (token.type === '(') {
      pos++;
      const node = expressionRule();
      if (tokens[pos]?.type !== ')') throw new Error('Missing closing bracket');
      pos++;
      if (tokens[pos]?.type === 'percent') {
        pos++;
        return { value: node.value / 100, isPercent: true };
      }
      return node;
    }
    if (token.type === '-') {
      pos++;
      const node = primary();
      return { value: -node.value, isPercent: node.isPercent };
    }
    throw new Error('Expected a number');
  }

  function multiplication() {
    let left = primary();
    while (tokens[pos] && ['*', '/'].includes(tokens[pos].type)) {
      const op = tokens[pos++].type;
      const right = primary();
      const divisorOrMultiplier = right.isPercent ? right.value : right.value;
      if (op === '/' && divisorOrMultiplier === 0) throw new Error('Cannot divide by zero');
      left = { value: op === '*' ? left.value * divisorOrMultiplier : left.value / divisorOrMultiplier, isPercent: false };
    }
    return left;
  }

  function expressionRule() {
    let left = multiplication();
    while (tokens[pos] && ['+', '-'].includes(tokens[pos].type)) {
      const op = tokens[pos++].type;
      const right = multiplication();
      const amount = right.isPercent ? left.value * right.value : right.value;
      left = { value: op === '+' ? left.value + amount : left.value - amount, isPercent: false };
    }
    return left;
  }

  const result = expressionRule();
  if (pos !== tokens.length) throw new Error('Incomplete expression');
  return result.value;
}

function updateDisplay(result = null) {
  $('#expression').textContent = expression;
  $('#result').textContent = result === null ? (expression ? '…' : '0') : formatNumber(result);
}

function addHistory(expr, result, label = '') {
  const items = JSON.parse(localStorage.getItem(historyKey) || '[]');
  items.unshift({ expr, result, label, at: Date.now() });
  localStorage.setItem(historyKey, JSON.stringify(items.slice(0, 100)));
  renderHistory();
}

function renderHistory() {
  const list = $('#historyList');
  const items = JSON.parse(localStorage.getItem(historyKey) || '[]');
  if (!items.length) {
    list.innerHTML = '<div class="empty">No calculations yet.</div>';
    return;
  }
  list.innerHTML = items.map((item, index) => `
    <div class="history-item" data-history-index="${index}">
      <div class="history-expression">${escapeHtml(item.expr)}</div>
      <div class="history-result">${escapeHtml(item.result)}</div>
    </div>
  `).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c]);
}

function calculate() {
  if (!expression.trim()) return;
  try {
    const value = evaluate(expression);
    lastResult = value;
    updateDisplay(value);
    addHistory(expression, formatNumber(value));
  } catch (error) {
    lastResult = null;
    $('#result').textContent = 'Error';
  }
}

function appendValue(value) {
  if (value === '.' && /(?:^|[+\-*/(])\s*-?\d*\.\d*$/.test(expression)) return;
  if (value === '%') {
    if (!/[0-9)]$/.test(expression)) return;
  }
  if ('+-*/'.includes(value)) {
    if (!expression && value !== '-') return;
    if (/[+\-*/]$/.test(expression)) expression = expression.slice(0, -1) + value;
  }
  expression += value;
  updateDisplay();
}

function clearAll() {
  expression = '';
  lastResult = null;
  updateDisplay(0);
}

function backspace() {
  expression = expression.slice(0, -1);
  updateDisplay();
}

function useToolResult(value, label) {
  if (!Number.isFinite(value)) return;
  expression = rawNumber(value);
  lastResult = value;
  updateDisplay(value);
  addHistory(label, formatNumber(value), label);
}

function moneySymbol(code) {
  return ({ EUR:'€', USD:'$', GBP:'£', JPY:'¥', CAD:'C$', AUD:'A$', CHF:'CHF ', SEK:'kr ', NOK:'kr ', DKK:'kr ' })[code] || code + ' ';
}

function toolField(label, id, value, type = 'number', extra = '') {
  return `<div class="tool-field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${value}" ${extra}></div>`;
}

function renderTool(mode) {
  const panel = $('#toolPanel');
  panel.classList.toggle('hidden', mode === 'calc');
  if (mode === 'calc') { panel.innerHTML = ''; return; }

  if (mode === 'fuel') {
    panel.innerHTML = `<div class="tool-grid">
      ${toolField('Distance', 'fuelDistance', '100')}
      ${toolField('Consumption (L/100 km)', 'fuelConsumption', '7.0')}
      ${toolField('Fuel price / L', 'fuelPrice', '1.80')}
      ${toolField('Distance unit', 'fuelUnit', 'km', 'text', 'readonly')}
    </div>
    <div id="toolOutput" class="tool-result">Enter your values and calculate.</div>
    <button class="tool-action" data-tool-action="fuel">Calculate fuel cost</button>`;
  }

  if (mode === 'energy') {
    panel.innerHTML = `<div class="tool-grid">
      ${toolField('Power (W)', 'energyPower', '100')}
      ${toolField('Hours / day', 'energyHours', '8')}
      ${toolField('Days', 'energyDays', '30')}
      ${toolField('Electricity price / kWh', 'energyRate', '0.20')}
    </div>
    <div id="toolOutput" class="tool-result">Enter your values and calculate.</div>
    <button class="tool-action" data-tool-action="energy">Calculate electricity cost</button>`;
  }

  if (mode === 'vat') {
    panel.innerHTML = `<div class="tool-grid">
      ${toolField('Amount', 'vatAmount', '100')}
      ${toolField('VAT %', 'vatRate', '24')}
    </div>
    <div id="toolOutput" class="tool-result">Choose an action.</div>
    <div class="tool-grid">
      <button class="tool-action" data-tool-action="vat-add">Add VAT</button>
      <button class="tool-action" data-tool-action="vat-remove">Remove VAT</button>
    </div>`;
  }

  if (mode === 'units') {
    panel.innerHTML = `<div class="tool-grid">
      ${toolField('Value', 'unitValue', '5')}
      <div class="tool-field"><label for="unitCategory">Category</label><select id="unitCategory"><option value="length">Length</option><option value="weight">Weight</option><option value="volume">Volume</option><option value="speed">Speed</option><option value="temperature">Temperature</option></select></div>
      <div class="tool-field"><label for="unitFrom">From</label><select id="unitFrom"></select></div>
      <div class="tool-field"><label for="unitTo">To</label><select id="unitTo"></select></div>
    </div>
    <div id="toolOutput" class="tool-result">Choose units and calculate.</div>
    <button class="tool-action" data-tool-action="units">Convert</button>`;
    populateUnits();
  }
}

const unitDefinitions = {
  length: { m:1, km:1000, mi:1609.344, ft:0.3048, in:0.0254, yd:0.9144 },
  weight: { kg:1, g:0.001, lb:0.45359237, oz:0.028349523125 },
  volume: { L:1, mL:0.001, gal:3.785411784, qt:0.946352946, cup:0.2365882365 },
  speed: { 'km/h':1, mph:1.609344, 'm/s':3.6, knot:1.852 },
  temperature: { C:'temperature', F:'temperature', K:'temperature' }
};

function populateUnits() {
  const category = $('#unitCategory').value;
  const names = Object.keys(unitDefinitions[category]);
  $('#unitFrom').innerHTML = names.map((x) => `<option value="${x}">${x}</option>`).join('');
  $('#unitTo').innerHTML = names.map((x) => `<option value="${x}">${x}</option>`).join('');
  if (names.length > 1) $('#unitTo').selectedIndex = 1;
}

function convertTemperature(value, from, to) {
  let c = from === 'C' ? value : from === 'F' ? (value - 32) * 5 / 9 : value - 273.15;
  return to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15;
}

function performTool(action) {
  if (action === 'fuel') {
    const distance = Number($('#fuelDistance').value);
    const consumption = Number($('#fuelConsumption').value);
    const price = Number($('#fuelPrice').value);
    const liters = distance * consumption / 100;
    const cost = liters * price;
    $('#toolOutput').innerHTML = `Fuel used: <strong>${formatNumber(liters)} L</strong><br>Total cost: <strong>€${formatNumber(cost)}</strong><br>Cost per km: <strong>€${formatNumber(cost / distance)}</strong>`;
    useToolResult(cost, `${distance} km × ${consumption} L/100 km × €${price}/L`);
  }
  if (action === 'energy') {
    const power = Number($('#energyPower').value);
    const hours = Number($('#energyHours').value);
    const days = Number($('#energyDays').value);
    const rate = Number($('#energyRate').value);
    const kwh = power / 1000 * hours * days;
    const cost = kwh * rate;
    $('#toolOutput').innerHTML = `Energy: <strong>${formatNumber(kwh)} kWh</strong><br>Total cost: <strong>€${formatNumber(cost)}</strong>`;
    useToolResult(cost, `${power} W × ${hours} h/day × ${days} days × €${rate}/kWh`);
  }
  if (action === 'vat-add' || action === 'vat-remove') {
    const amount = Number($('#vatAmount').value);
    const rate = Number($('#vatRate').value) / 100;
    const result = action === 'vat-add' ? amount * (1 + rate) : amount / (1 + rate);
    const vat = action === 'vat-add' ? result - amount : amount - result;
    $('#toolOutput').innerHTML = `Result: <strong>€${formatNumber(result)}</strong><br>VAT: <strong>€${formatNumber(Math.abs(vat))}</strong>`;
    useToolResult(result, action === 'vat-add' ? `€${amount} + ${rate * 100}% VAT` : `€${amount} including ${rate * 100}% VAT`);
  }
  if (action === 'units') {
    const value = Number($('#unitValue').value);
    const category = $('#unitCategory').value;
    const from = $('#unitFrom').value;
    const to = $('#unitTo').value;
    let result;
    if (category === 'temperature') result = convertTemperature(value, from, to);
    else result = value * unitDefinitions[category][from] / unitDefinitions[category][to];
    $('#toolOutput').innerHTML = `<strong>${formatNumber(result)} ${to}</strong>`;
    useToolResult(result, `${value} ${from} → ${to}`);
  }
}

$$('.key').forEach((button) => button.addEventListener('click', () => {
  const action = button.dataset.action;
  const value = button.dataset.value;
  if (action === 'clear') clearAll();
  else if (action === 'backspace') backspace();
  else if (action === 'equals') calculate();
  else appendValue(value);
}));

$$('.tab').forEach((tab) => tab.addEventListener('click', () => {
  $$('.tab').forEach((x) => x.classList.remove('active'));
  tab.classList.add('active');
  currentMode = tab.dataset.mode;
  renderTool(currentMode);
}));

$('#toolPanel').addEventListener('click', (event) => {
  const action = event.target.dataset.toolAction;
  if (action) performTool(action);
});

$('#toolPanel').addEventListener('change', (event) => {
  if (event.target.id === 'unitCategory') populateUnits();
});

$('#historyButton').addEventListener('click', () => $('#historyPanel').classList.toggle('hidden'));
$('#clearHistory').addEventListener('click', () => { localStorage.removeItem(historyKey); renderHistory(); });
$('#copyButton').addEventListener('click', async () => {
  const value = $('#result').textContent;
  if (value && value !== 'Error' && value !== '…') {
    try { await navigator.clipboard.writeText(value); $('#copyButton').textContent = 'Copied'; setTimeout(() => $('#copyButton').textContent = 'Copy result', 900); } catch {}
  }
});

$('#historyList').addEventListener('click', (event) => {
  const item = event.target.closest('[data-history-index]');
  if (!item) return;
  const items = JSON.parse(localStorage.getItem(historyKey) || '[]');
  const selected = items[Number(item.dataset.historyIndex)];
  if (!selected) return;
  expression = selected.expr;
  updateDisplay(Number(selected.result.replace(/,/g, '')) || 0);
  $('#historyPanel').classList.add('hidden');
});

window.addEventListener('keydown', (event) => {
  if (currentMode !== 'calc') return;
  if (/^[0-9.]$/.test(event.key) || '+-*/()%'.includes(event.key)) appendValue(event.key);
  else if (event.key === 'Enter' || event.key === '=') calculate();
  else if (event.key === 'Backspace') backspace();
  else if (event.key === 'Escape') clearAll();
});

const themeKey = 'ultimate-calculator-theme';
function setTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  $('#themeButton').textContent = theme === 'light' ? '☀' : '☾';
  localStorage.setItem(themeKey, theme);
}
$('#themeButton').addEventListener('click', () => setTheme(document.body.classList.contains('light') ? 'dark' : 'light'));
setTheme(localStorage.getItem(themeKey) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
renderHistory();
updateDisplay(0);
