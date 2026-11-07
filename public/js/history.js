// History: saved calculations, the bottom sheet that lists them, and its gestures.
function historyItems(){try{return JSON.parse(store.get('uc-history')||'[]')}catch{return[]}}
function saveHistory(item){const list=historyItems();const stored={...item,shown:item.shown||formatExpressionDisplay(item.expression),expression:expandCarry(item.expression),result:item.result&&typeof item.result==='object'?vToStore(item.result):String(item.result)};list.unshift({id:Date.now()+Math.random(),...stored});store.set('uc-history',JSON.stringify(list.slice(0,100)));renderHistory()}
function renderHistory(){
 const tab=currentTab(),calc=tab==='calc';
 $('#historyTitle').textContent=t('history')+(calc?'':' · '+modeText(tab));
 syncHistoryChart(tab);syncHistoryButtons(tab);
 $('#historyList').innerHTML=historyRowsHtml(tab);
 markHistoryStuck();
 if(calc)historyChartRefresh();
 refreshSide();
}
// The chart is the Calculator's: another mode hides its button and closes it (the sheet, and the panel on big screens)
function syncHistoryChart(tab=currentTab()){
 const calc=tab==='calc',b=$('#historyChartButton');b?.classList.toggle('hidden',!calc);
 if(!calc){$('#historyChartWrap')?.classList.add('hidden');b?.classList.remove('active');b?.setAttribute('aria-pressed','false')}
}
// Nothing to clear: Clear all is dimmed (and a pending "Delete all?" goes); fewer than 2 calculations: the chart button too
function syncHistoryButtons(tab=currentTab()){
 const calc=tab==='calc',n=calc?historyItems().length:modeHistory(tab).length,clear=$('#clearHistory'),chart=$('#historyChartButton');
 if(clear)clear.disabled=!n;
 if(!n&&historyClearConfirm)clearHistoryConfirm();
 if(chart){const few=calc&&historyChartData().length<2;chart.disabled=few;
  if(few&&!$('#historyChartWrap')?.classList.contains('hidden'))toggleHistoryChart()}
}
// The History list as HTML, for the sheet and for the panel beside the app on big screens (side.js)
function historyRowsHtml(tab=currentTab()){
 const calc=tab==='calc';
 const row=(id,top,bottom)=>`<div class="history-item"><button class="history-main" data-history="${id}" type="button"><div class="history-expression">${esc(top)}</div><div class="history-result">${esc(bottom)}</div></button><button class="history-delete" data-delete="${id}" type="button" aria-label="${esc(t('delete'))}">×</button></div>`;
 const items=calc?historyItems():modeHistory(tab);
 if(!items.length)return `<div class="empty">${esc(calc?t('none'):t('noneMode'))}</div>`;
 const now=new Date();let html='',key=null;
 for(const x of items){
  const k=historyGroupKey(x.t||Math.floor(Number(x.id)),now)||key||'today';// newest first, so a group follows the one before
  if(k!==key){html+=(key?'</section>':'')+`<section class="history-group"><h3 class="history-group-title">${esc(historyGroupTitle(k,now))}</h3>`;key=k}
  if(calc)html+=row(x.id,x.shown||formatInputDisplay(x.expression),fmt(x.result&&typeof x.result==='string'?vFromStore(x.result):x.result));
  else{const [a,b]=modeEntryLines(x);html+=row(x.id,a,b)}
 }
 return html+'</section>';
}
// Entries are grouped by when they were made, like the iPhone's: Today, Yesterday, Previous 7 days, Previous 30 days, then
// each month (with its year when it is not this year). An entry's time is its t, or its id (Date.now() + a fraction).
const historyDay=d=>Math.round(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
function historyGroupKey(ms,now=new Date()){
 if(!Number.isFinite(ms)||ms<=0)return null;
 const d=new Date(ms),ago=historyDay(now)-historyDay(d);
 if(ago<=0)return 'today';if(ago===1)return 'yesterday';if(ago<=7)return 'days7';if(ago<=30)return 'days30';
 return d.getFullYear()+'-'+(d.getMonth()+1);
}
function historyGroupTitle(k,now=new Date()){
 if(!k.includes('-'))return t({today:'histToday',yesterday:'histYesterday',days7:'hist7',days30:'hist30'}[k]);
 const [y,m]=k.split('-').map(Number),name=MONTHS[lang==='el'?'el':'en'][m-1];
 return y===now.getFullYear()?name:name+' '+y;
}

function openHistory(){const p=$('#historyPanel'),b=$('#historyBackdrop');renderHistory();p.style.height='';p.style.transform='';p.classList.remove('hidden','moving','dragging');b.classList.remove('hidden');requestAnimationFrame(()=>{p.classList.add('open');b.classList.add('open')});p.classList.remove('expanded');$('#historyList').scrollTop=0}
// A press outside the sheet while it asks "Delete all?" only takes the question back (as a press inside would); the next one closes it
function historyBackdropClick(){if(historyClearConfirm)clearHistoryConfirm();else closeHistory()}
// It slides down at the height it has (dragged or fully open) and goes; the page behind is put back where it was (iPhone can
// scroll even a page that doesn't scroll when a swipe runs past the sheet)
function closeHistory(){
 if(historyClearConfirm)clearHistoryConfirm();const p=$('#historyPanel'),b=$('#historyBackdrop');
 if(!p.classList.contains('hidden'))p.style.height=p.getBoundingClientRect().height/(window.__uiZoom||1)+'px';
 p.style.transform='';p.classList.remove('open','dragging');b.classList.remove('open');
 if(!document.documentElement.classList.contains('page-scroll')&&(scrollX||scrollY))scrollTo(0,0);
 setTimeout(()=>{if(!p.classList.contains('open')){p.classList.add('hidden');b.classList.add('hidden');p.classList.remove('expanded','moving');p.style.height='';$('#historyList').scrollTop=0}},450);
}
// The frosted bar and the group title stuck under it get a little more colour once something scrolls under them (styles.css)
function markHistoryStuck(){
 const p=$('#historyPanel'),list=$('#historyList');if(!p||!list)return;
 const scrolled=list.scrollTop>0,ref=list.getBoundingClientRect().top+parseFloat(getComputedStyle(list).paddingTop||0);
 p.classList.toggle('scrolled',scrolled&&$('#historyChartWrap')?.classList.contains('hidden')!==false);
 for(const el of list.querySelectorAll('.history-group-title'))el.classList.toggle('stuck',scrolled&&el.getBoundingClientRect().top<=ref+1);
}
function setupHistorySheet(){
 const p=$('#historyPanel'),list=$('#historyList');// the drag: setupHistoryGestures
 // The list starts under the bar on top of it (styles.css): it needs the bar's height, which the language and screen width change
 const bar=p.querySelector('.history-bar');if(bar&&window.ResizeObserver)new ResizeObserver(()=>p.style.setProperty('--hbar',bar.offsetHeight+'px')).observe(bar);
 // once a frame at most: it measures the titles, which would hold up the scrolling if done for every scroll event
 let timer,stuckFrame=0;list.addEventListener('scroll',()=>{if(!stuckFrame)stuckFrame=requestAnimationFrame(()=>{stuckFrame=0;markHistoryStuck()});list.classList.add('is-scrolling');clearTimeout(timer);timer=setTimeout(()=>list.classList.remove('is-scrolling'),650)},{passive:true})
}
// Clear all asks first without moving anything: the button itself turns into a red "Delete all?" (the same height, right
// aligned); a second press deletes, a press elsewhere or 4 seconds put it back. Screen readers hear the full question.
let clearArmTimer=0;
function clearHistoryConfirm(){
 historyClearConfirm=!historyClearConfirm;clearTimeout(clearArmTimer);
 const btn=$('#clearHistory');btn.classList.toggle('armed',historyClearConfirm);btn.textContent=t(historyClearConfirm?'confirmShort':'clear');
 $('#historyClearWrap').classList.toggle('confirming',historyClearConfirm);
 if(historyClearConfirm){srSay(t('confirm'));clearArmTimer=setTimeout(()=>{if(historyClearConfirm)clearHistoryConfirm()},4000)}
}
function clearHistoryPress(){if(historyClearConfirm)deleteAllHistory();else if(!$('#clearHistory').disabled)clearHistoryConfirm()}
function deleteAllHistory(){if(historyClearConfirm)clearHistoryConfirm();if(currentTab()==='calc')store.del('uc-history');else setModeHistory(currentTab(),[]);renderHistory()}
function historyClick(e){
 const del=e.target.closest('[data-delete]'),item=e.target.closest('[data-history]');
 if(currentTab()!=='calc'){// another mode's own history
  const tab=currentTab();
  if(del){setModeHistory(tab,modeHistory(tab).filter(x=>String(x.id)!==del.dataset.delete));renderHistory();return}
  if(item){const x=modeHistory(tab).find(x=>String(x.id)===item.dataset.history);if(x)restoreModeEntry(x)}
  return;
 }
 if(del){store.set('uc-history',JSON.stringify(historyItems().filter(x=>String(x.id)!==del.dataset.delete)));renderHistory();return}
 if(item){const x=historyItems().find(x=>String(x.id)===item.dataset.history);if(!x)return;closeHistory();setMode('calc');carry=null;resultNegated=false;lastExpression=x.expression;lastShown=(x.shown||formatInputDisplay(x.expression));lastResult=vFromStore(String(x.result));justCalculated=true;expression='';current='';currentIsPercent=false;howData=explanationForExpression(x.expression,lastResult)||x.how||null;if(howData&&lastShown&&!howData.spaced)howData.formula=lastShown;calcHowData=howData;lastOperation=parseLastOperation(x.expression);render();syncModeTabs()}
}
// History sheet gestures, like the iPhone's: the sheet follows the finger from anywhere on it, the entries too. A touch that
// moves is a drag (the entry under it is not used); one that doesn't is a tap. Dragging the list down when it is at its top,
// or up while the sheet is not fully open, moves the sheet; otherwise the list scrolls. On letting go the sheet goes, with the
// finger's speed, to half open, fully open, or closed. The mouse drags the bar (handle, title); wheel and keys scroll it.
function setupHistoryGestures() {
  const panel = $('#historyPanel'), bar = panel?.querySelector('.history-bar'), list = $('#historyList'), backdrop = $('#historyBackdrop');
  if (!panel || !bar || !list) return;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  // On big screens the app is scaled up (layout.js, window.__uiZoom): screen pixels / zoom = CSS pixels.
  const Z = () => window.__uiZoom || 1;
  const collapsedHeight = () => Math.min(window.innerHeight * 0.42 / Z(), 470);
  const expandedHeight = () => window.innerWidth <= 480 ? window.innerHeight / Z() : Math.min(window.innerHeight * 0.92 / Z(), 780);
  // How much of the sheet shows: its height less how far it is pushed down (read from the transform, so it is right mid-animation too)
  const sheetY = () => new DOMMatrix(getComputedStyle(panel).transform).m42;
  const currentHeight = () => parseFloat(getComputedStyle(panel).height) - sheetY();
  const canScroll = () => list.scrollHeight > list.clientHeight + 1;
  const isOpen = () => panel.classList.contains('open') && !panel.classList.contains('hidden');
  const SLOP = 6;// a touch that moves less than this is a tap

  // Moving (styles.css): the sheet is fully open's height and only slides (transform), so every frame is drawn without
  // laying the page out again. Pushed down y px from fully open.
  let settleTimer = 0;
  function startMoving() {
    if (panel.classList.contains('moving')) return sheetY();
    const y = Math.max(0, expandedHeight() - currentHeight());
    panel.classList.add('dragging', 'moving');
    panel.style.transform = `translate(-50%, ${y}px)`;
    return y;
  }
  const place = y => { panel.style.transform = `translate(-50%, ${y}px)`; };
  // Back to its resting height once it stops (looks the same, so nothing jumps)
  function settle() {
    clearTimeout(settleTimer);
    if (!panel.classList.contains('moving') || panel.classList.contains('dragging') || !isOpen()) return;
    panel.classList.add('dragging');
    panel.classList.remove('moving');
    panel.style.transform = '';
    void panel.offsetHeight;
    panel.classList.remove('dragging');
  }
  panel.addEventListener('transitionend', e => { if (e.target === panel && e.propertyName === 'transform') settle(); });
  // Slides from where it is (or where the finger left it) to half or fully open
  function snap(expanded) {
    startMoving();
    panel.classList.toggle('expanded', expanded);
    void panel.offsetHeight;
    panel.classList.remove('dragging');
    place(expanded ? 0 : Math.max(0, expandedHeight() - collapsedHeight()));
    clearTimeout(settleTimer); settleTimer = setTimeout(settle, 500);
  }

  let drag = null;// {y0, h0, scroll0, fromList, mode: null | 'sheet' | 'scroll', moved, down, samples}
  let dragEndedAt = 0;
  function begin(y, fromList) {
    drag = { y0: y, top0: 0, scroll0: list.scrollTop, fromList, mode: null, moved: false, down: 0, top: 0, samples: [[performance.now(), y]] };
  }
  // The first move decides (iPhone browsers decide then whether the page may scroll): sheet or list
  function decide(dy) {
    if (!drag.fromList) return 'sheet';
    if (dy > 0) return list.scrollTop <= 0 ? 'sheet' : 'scroll';
    if (dy < 0) return currentHeight() < expandedHeight() - 1 || !canScroll() ? 'sheet' : 'scroll';
    return canScroll() ? 'scroll' : 'sheet';
  }
  function move(y) {
    if (!drag) return false;
    drag.samples.push([performance.now(), y]); if (drag.samples.length > 8) drag.samples.shift();
    if (!drag.mode) drag.mode = decide(y - drag.y0);
    if (drag.mode !== 'sheet') return false;
    if (!drag.moved) {
      if (Math.abs(y - drag.y0) < SLOP) return true;
      drag.moved = true; drag.y0 = y; drag.scroll0 = list.scrollTop;
      clearTimeout(settleTimer);
      drag.top0 = startMoving();// caught mid-animation, it stays where it is
      panel.classList.add('dragging');
    }
    const min = collapsedHeight(), max = expandedHeight();
    let top = drag.top0 + (y - drag.y0);
    // Pulled past fully open from the list: the list scrolls on, and back again before the sheet shrinks
    if (drag.fromList) list.scrollTop = drag.scroll0 + Math.max(0, -top);
    drag.top = top = Math.max(0, top);
    drag.down = Math.max(0, top - (max - min));// how far below half open (to close)
    place(top);
    return true;
  }
  // The finger's speed over its last ~100 ms, in CSS pixels per ms (down is positive)
  function speed(samples) {
    const last = samples[samples.length - 1];let first = last;
    for (const s of samples) if (last[0] - s[0] <= 100) { first = s; break; }
    return last[0] > first[0] ? (last[1] - first[1]) / (last[0] - first[0]) : 0;
  }
  function end() {
    const d = drag; drag = null;
    if (!d || d.mode !== 'sheet' || !d.moved) return;
    dragEndedAt = performance.now();
    panel.classList.remove('dragging');
    const v = speed(d.samples), min = collapsedHeight(), max = expandedHeight(), h = max - d.top;// how much shows
    const aim = h - v * 200;// where the flick would carry it
    if (d.down > 90 || (d.down > 0 && v > 0.35) || aim < min - 120) { closeHistory(); return; }
    snap(aim > (min + max) / 2);
  }

  // Touch: on the whole sheet (the chart has its own)
  panel.addEventListener('touchstart', e => {
    if (!isOpen() || e.touches.length > 1 || e.target.closest('#historyChart')) { drag = null; return; }
    begin(e.touches[0].clientY / Z(), !!e.target.closest('#historyList'));
  }, { passive: true });
  panel.addEventListener('touchmove', e => {
    if (!drag) return;
    if (e.touches.length > 1) { end(); return; }
    if (move(e.touches[0].clientY / Z()) && e.cancelable) e.preventDefault();// the sheet moves, not the page behind it
  }, { passive: false });
  panel.addEventListener('touchend', end, { passive: true });
  panel.addEventListener('touchcancel', end, { passive: true });
  // A drag is not a tap: the entry or button it started on is not used
  panel.addEventListener('click', e => { if (performance.now() - dragEndedAt < 400) { e.preventDefault(); e.stopPropagation(); } }, true);
  // Nothing behind the sheet scrolls (iPhone scrolls the page under a list that can't scroll)
  backdrop?.addEventListener('touchmove', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });

  // Mouse and pen: drag the bar (its buttons keep their clicks)
  let pointerId = null;
  bar.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || !isOpen() || e.button > 0 || pointerId !== null || e.target.closest('button')) return;
    pointerId = e.pointerId; begin(e.clientY / Z(), false); drag.mode = 'sheet';
    bar.setPointerCapture?.(e.pointerId);
  });
  bar.addEventListener('pointermove', e => { if (e.pointerId === pointerId) { move(e.clientY / Z()); e.preventDefault(); } });
  const pointerEnd = e => { if (e.pointerId === pointerId) { pointerId = null; end(); } };
  bar.addEventListener('pointerup', pointerEnd);
  bar.addEventListener('pointercancel', pointerEnd);

  // While History is open it is the page's scroll area: the mouse wheel and the keyboard scroll it from anywhere on screen.
  // Like a map app's bottom sheet: scrolling down first opens the sheet fully, then scrolls the list;
  // scrolling up goes back to the top of the list, then shrinks the sheet again.
  let sheetMovedAt = 0;
  function scrollHistory(dy, smooth) {
    if (!dy) return;
    const now = performance.now();
    if (now - sheetMovedAt < 280) return; // let the open/shrink animation finish before scrolling on
    const expanded = panel.classList.contains('expanded');
    if (dy > 0 && !expanded && canScroll()) { snap(true); list.scrollTop = 0; sheetMovedAt = now; return; }
    if (dy < 0 && expanded && list.scrollTop <= 0) { snap(false); sheetMovedAt = now; return; }
    list.scrollBy({ top: dy, behavior: smooth ? 'smooth' : 'auto' });
  }

  document.addEventListener('wheel', e => {
    if (!isOpen() || drag || e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation(); // nothing behind the sheet (e.g. the graph) reacts to the wheel
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * list.clientHeight : e.deltaY;
    scrollHistory(dy, false);
  }, { passive: false, capture: true });

  document.addEventListener('keydown', e => {
    if (!isOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!document.querySelector('#howModal')?.classList.contains('hidden')) return;
    const page = Math.max(80, list.clientHeight - 60);
    const step = { ArrowDown: 64, ArrowUp: -64, PageDown: page, PageUp: -page }[e.key];
    if (step !== undefined) { e.preventDefault(); e.stopImmediatePropagation(); scrollHistory(step, true); return; }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.key === 'End' && !panel.classList.contains('expanded')) snap(true);
      list.scrollTo({ top: e.key === 'Home' ? 0 : list.scrollHeight, behavior: 'smooth' });
    }
  }, true);

  window.addEventListener('resize', () => { if (!drag && panel.classList.contains('expanded')) panel.style.height = ''; });
}

/* ---------- History per mode ----------
   The Calculator keeps its calculations in uc-history (above). Every other mode keeps its own results in uc-history-modes
   ({tab: [entries]}, newest first, up to 50 each): a tool's fields and choices, Units' and Currency's conversion, Graph's
   functions. Tools have no =, so what is on screen is saved when it is finished with: leaving the mode, AC or Esc,
   changing kind, copying the result, the app going to the background (and = in Units/Currency, AC in Graph).
   The same result twice in a row is kept once. A tool's line is stored in both languages, so a switch shows it in the new one. */
const MODE_HISTORY_MAX=50;
function modeHistoryAll(){try{const o=JSON.parse(store.get('uc-history-modes')||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{}}catch{return {}}}
function modeHistory(tab){const a=modeHistoryAll()[tab];return Array.isArray(a)?a:[]}
function setModeHistory(tab,list){const o=modeHistoryAll();if(list.length)o[tab]=list.slice(0,MODE_HISTORY_MAX);else delete o[tab];store.set('uc-history-modes',JSON.stringify(o));refreshSide()}
// What the mode on screen shows, worth keeping; null when there is nothing finished.
function modeSnapshot(){
 const tab=currentTab();
 if(TOOL_MODES.includes(mode)){
  if(!toolResult?.main||!toolResult?.how)return null;
  const inputs={};for(const [k,v] of Object.entries(toolState[mode]?.inputs||{}))if(String(v??'').trim()!=='')inputs[k]=String(v);
  const text={},shown=lang;
  try{for(const l of ['el','en']){lang=l;runActiveTool();text[l]={f:toolResult?.how?.formula||'',r:toolResult?.main||''}}}finally{lang=shown;runActiveTool()}
  if(!text.en.r)return null;
  const choices=mode==='vat'?{vat:vatAction}:mode==='dates'?{dates:dateCount}:{};
  return {tab,kind:toolKind[mode]||null,choices,inputs,text};
 }
 if(mode==='units'){
  const src=unitSource==='to'?'to':'from',other=src==='from'?'to':'from',e=unitExpressions||{};
  if(unitError||!String(e[src]??'').trim()||e[src]==='0'||!/^-?\d+(\.\d+)?$/.test(String(e[other]??'').trim()))return null;
  return {tab,cat:$('#unitCategory')?.value||'length',from:$('#unitFrom')?.value,to:$('#unitTo')?.value,src,expr:{from:String(e.from),to:String(e.to)}};
 }
 if(mode==='graph'){
  const fns=(graph?.fns||[]).map(f=>String(f).trim()).filter(Boolean);
  if(!fns.length||JSON.stringify(fns)===JSON.stringify(graphDefault().fns))return null;
  return {tab,fns};
 }
 return null;
}
const snapshotKey=x=>JSON.stringify([x.kind,x.choices,x.inputs,x.cat,x.from,x.to,x.expr,x.fns]);
function recordModeHistory(){
 if(mode==='calc')return;
 let x;try{x=modeSnapshot()}catch{return}
 if(!x)return;
 const key=snapshotKey(x),list=modeHistory(x.tab).filter(e=>e.key!==key);// the same one again moves to the top
 list.unshift({id:Date.now()+Math.random(),t:Date.now(),key,...x});setModeHistory(x.tab,list);
 if(!$('#historyPanel').classList.contains('hidden'))renderHistory();
}
// A unit as written after a number: its symbol, or its name for the ones whose short form is a word.
const UNIT_WORDS=new Set(['stremma','acre','day','week','knot','tsp','tbsp','cup','gal','qt','pt','grad']);
const unitSymbol=(cat,u)=>cat==='currency'?u:UNIT_WORDS.has(u)?(UNIT_LABELS[cat]?.[u]?.[lang==='el'?0:1]||u).toLowerCase():u;
// The two lines of an entry: what was put in, and the result.
function modeEntryLines(x){
 if(x.text){const s=x.text[lang]||x.text.en||{};return [s.f||'',s.r||'']}
 if(x.expr){
  const o=x.src==='from'?'to':'from',u=s=>unitSymbol(x.cat,s==='from'?x.from:x.to);
  return [formatUnitDisplayValue(x.expr[x.src])+' '+u(x.src),'= '+formatUnitResult(x.expr[o])+' '+u(o)];
 }
 if(x.fns)return [x.fns.slice(1).map((f,i)=>GRAPH_NAMES[i+1]+'(x) = '+gPretty(f)).join(' · '),'f(x) = '+gPretty(x.fns[0])];
 return ['',''];
}
// Brings an entry back: its mode, kind and choices, and its numbers (what was on screen is kept first).
function restoreModeEntry(x){
 recordModeHistory();closeHistory();
 if(x.tab!==currentTab())switchMode(x.tab);
 if(x.text){
  const m=mode;
  if(x.kind&&KIND_FIELDS[m]?.[x.kind])toolKind[m]=x.kind;
  else if(!x.kind&&KIND_FIELDS[m])toolKind[m]=Object.keys(KIND_FIELDS[m])[0];// saved before the mode had kinds (Energy): its first kind
  if(m==='vat'&&TOGGLES.vat.options.includes(x.choices?.vat))vatAction=x.choices.vat;
  if(m==='dates'&&['all','work'].includes(x.choices?.dates))dateCount=x.choices.dates;
  toolState[m]={inputs:{...x.inputs},result:null};
  renderTool();runActiveTool();saveTools();fitLayout();
 }else if(x.expr){
  if(x.cat!=='currency')window._unitCategory=x.cat;
  if(units[x.cat]?.[x.from]!==undefined&&units[x.cat]?.[x.to]!==undefined)unitPick[x.cat]={from:x.from,to:x.to};
  unitExpressions={from:x.expr.from,to:x.expr.to};unitSource=unitActiveInput=x.src;unitError='';unitSourceTyped=false;unitReplaceOnNextKey=true;
  renderTool();convertUnitExpression(x.src);fitLayout();
 }else if(x.fns){
  graph={...graphDefault(),fns:x.fns.slice(0,GRAPH_NAMES.length)};graphTrace=null;
  renderTool();fitLayout();
 }
 syncModeTabs();
}
addEventListener('pagehide',()=>recordModeHistory());
document.addEventListener('visibilitychange',()=>{if(document.hidden)recordModeHistory()});
