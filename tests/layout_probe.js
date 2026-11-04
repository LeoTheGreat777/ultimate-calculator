// Used by phone_sizes in test_app.py: what is wrong with the layout inside `scope` on this screen. Returns short
// descriptions, none when all is well:
//   overlap        text over other text
//   cut            text cut by a box that hides what doesn't fit (a box that scrolls is fine, and so is text that
//                  fitDisplayText scrolls on purpose (fade-start/fade-end) or a line clamp's last lines)
//   off screen     text or boxes past the screen's edges (past the bottom only counts when the page can't scroll)
//   wider than its button, field too narrow (a number cut in its field)
//   keys / too small to tap: keypad keys under minKey px, any button or field under minTap px (with its ::after hit area)
({scope, minKey, minTap, sheet}) => {
  const out = [], W = innerWidth, H = innerHeight, root = document.querySelector(scope);
  if (!root) return ['missing ' + scope];
  const name = e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : ''));
  const shown = e => e.checkVisibility({opacityProperty: true, visibilityProperty: true});
  const pageScrolls = document.documentElement.classList.contains('page-scroll');
  // What the boxes around an element (itself too, with self) let show, and per direction the nearest box that hides
  // (overflow hidden/clip) inside any box that scrolls that way
  const clipOf = (el, self) => {
    const c = {l: -1e9, t: -1e9, r: 1e9, b: 1e9, hardX: null, hardY: null, scrollX: false, scrollY: false};
    for (let a = self ? el : el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const q = a.getBoundingClientRect();
        c.l = Math.max(c.l, q.left); c.t = Math.max(c.t, q.top); c.r = Math.min(c.r, q.right); c.b = Math.min(c.b, q.bottom);
        if (/auto|scroll/.test(cs.overflowX)) c.scrollX = true; else if (cs.overflowX !== 'visible' && !c.scrollX && !c.hardX) c.hardX = a;
        if (/auto|scroll/.test(cs.overflowY)) c.scrollY = true; else if (cs.overflowY !== 'visible' && !c.scrollY && !c.hardY) c.hardY = a;
      }
      if (cs.position === 'fixed') break;
    }
    return c;
  };
  const faded = e => e.closest('.fade-start,.fade-end');
  const clamped = e => getComputedStyle(e).webkitLineClamp > 0;
  const texts = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const el = n.parentElement;
    if (!n.textContent.trim() || !el || !shown(el) || el.closest('.sr-only,.key-tick,script,style')) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const c = clipOf(el, true), label = name(el) + ' "' + n.textContent.trim().slice(0, 18) + '"';
    for (const q of range.getClientRects()) {
      if (q.width < 1 || q.height < 1) continue;
      const v = {l: Math.max(q.left, c.l), t: Math.max(q.top, c.t), r: Math.min(q.right, c.r), b: Math.min(q.bottom, c.b)};
      if (v.r - v.l < 1 || v.b - v.t < 1) {
        if (!c.scrollX && !c.scrollY && !faded(el) && !(c.hardY && clamped(c.hardY))) out.push('hidden by its box: ' + label);
        continue;
      }
      // a line box reaches above and below its letters, so a quarter of its height may stick out
      const hx = c.hardX?.getBoundingClientRect(), hy = c.hardY?.getBoundingClientRect();
      if (hx && !faded(el) && (q.left < hx.left - 1.5 || q.right > hx.right + 1.5)) out.push('cut: ' + label + ' in ' + name(c.hardX));
      if (hy && !clamped(c.hardY) && (q.top < hy.top - q.height * .25 || q.bottom > hy.bottom + q.height * .25)) out.push('cut: ' + label + ' in ' + name(c.hardY));
      if (v.l < -1 || v.r > W + 1 || v.t < -1 || (!pageScrolls || sheet) && v.b > H + 1) out.push('off screen: ' + label);
      const btn = el.closest('button,.key');
      if (btn && btn !== root) { const k = btn.getBoundingClientRect(); if (q.left < k.left - 1 || q.right > k.right + 1) out.push('wider than its button: ' + label) }
      texts.push({el, label, ...v, h: q.height});
    }
  }
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.el === b.el) continue;
    const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (w > 2 && h > Math.min(a.h, b.h) * .3) out.push('overlap: ' + a.label + ' / ' + b.label);
  }
  root.querySelectorAll('input:not([type=checkbox]):not([type=search])').forEach(e => {
    if (shown(e) && e.scrollWidth > e.clientWidth + 1 && !faded(e)) out.push('field too narrow: ' + name(e) + ' ' + e.value);
  });
  root.querySelectorAll('*').forEach(e => {
    const q = e.getBoundingClientRect();
    if (q.width && q.height && shown(e) && (q.right > W + 1 || q.left < -1) && !e.closest('.mode-tabs,.tabs-scrollbar,.sr-only') && clipOf(e).r > W + 1) out.push('off screen: ' + name(e));
  });
  if (minKey) {
    const k = [...root.querySelectorAll('#keypad button')].filter(shown).map(b => b.getBoundingClientRect());
    if (k.length && Math.min(...k.map(q => Math.min(q.width, q.height))) < minKey) out.push('keys ' + Math.round(Math.min(...k.map(q => q.height))) + '×' + Math.round(Math.min(...k.map(q => q.width))) + 'px');
  }
  root.querySelectorAll('button,[role=button],input,select').forEach(e => {
    if (!shown(e) || e.closest('.unit-row') && e.tagName === 'INPUT' || e.closest('.key-tick')) return;
    const b = e.getBoundingClientRect(), a = getComputedStyle(e, '::after'), i = v => parseFloat(v) || 0;
    let w = b.width, h = b.height;
    if (a.content !== 'none' && a.position === 'absolute') { w -= i(a.left) + i(a.right); h -= i(a.top) + i(a.bottom) }
    if (w < minTap - .5 || h < minTap - .5) out.push('too small to tap: ' + name(e) + ' ' + Math.round(w) + '×' + Math.round(h));
  });
  return [...new Set(out)];
}
