// History: saved calculations, the bottom sheet that lists them, and its gestures.
function historyItems(){try{return JSON.parse(store.get('uc-history')||'[]')}catch{return[]}}
function saveHistory(item){const list=historyItems();const stored={...item,shown:item.shown||formatExpressionDisplay(item.expression),expression:expandCarry(item.expression),result:item.result&&typeof item.result==='object'?vToStore(item.result):String(item.result)};list.unshift({id:Date.now()+Math.random(),...stored});store.set('uc-history',JSON.stringify(list.slice(0,100)));renderHistory()}
function renderHistory(){
 const tab=currentTab(),calc=tab==='calc';
 $('#historyTitle').textContent=t('history')+(calc?'':' · '+modeText(tab));
 syncHistoryChart(tab);syncHistoryButtons(tab);
 $('#historyList').innerHTML=historyRowsHtml(tab);
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
 const rows=calc?historyItems().map(x=>row(x.id,x.shown||formatInputDisplay(x.expression),fmt(x.result&&typeof x.result==='string'?vFromStore(x.result):x.result)))
  :modeHistory(tab).map(x=>{const [a,b]=modeEntryLines(x);return row(x.id,a,b)});
 return rows.length?rows.join(''):`<div class="empty">${esc(calc?t('none'):t('noneMode'))}</div>`;
}

function openHistory(){const p=$('#historyPanel'),b=$('#historyBackdrop');renderHistory();p.classList.remove('hidden');b.classList.remove('hidden');requestAnimationFrame(()=>{p.classList.add('open');b.classList.add('open')});p.classList.remove('expanded');$('#historyList').scrollTop=0}
function closeHistory(){const p=$('#historyPanel'),b=$('#historyBackdrop');p.classList.remove('open','expanded');b.classList.remove('open');setTimeout(()=>{if(!p.classList.contains('open')){p.classList.add('hidden');b.classList.add('hidden')}},220)}
function setupHistorySheet(){
 const p=$('#historyPanel'),handle=$('.sheet-handle'),list=$('#historyList');let startY=0,tracking=false;
 // Only tracks swipes to expand/collapse. The handle drag itself lives in history-interaction.js;
 // adding .dragging here disabled the list (pointer-events:none) and stopped it scrolling.
 let startScroll=0;
 const start=e=>{startY=e.touches[0].clientY;startScroll=list.scrollTop;tracking=true};
 // Swipe up expands the sheet (only when it is not expanded yet, otherwise it is a normal scroll).
 // Swipe down collapses it only if the list was already at the top when the touch began.
 const end=e=>{if(!tracking)return;const dy=e.changedTouches[0].clientY-startY;tracking=false;if(dy<-35&&!p.classList.contains('expanded')){p.classList.add('expanded');list.scrollTop=0}else if(dy>35&&startScroll<=2){p.classList.remove('expanded')}startY=0};
 [p,handle].forEach(el=>{el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchend',end,{passive:true})});
 let timer;list.addEventListener('scroll',()=>{list.classList.add('is-scrolling');clearTimeout(timer);timer=setTimeout(()=>list.classList.remove('is-scrolling'),650)},{passive:true})
}
function clearHistoryConfirm(){
 historyClearConfirm=!historyClearConfirm;const wrap=$('#historyClearWrap'),btn=$('#clearHistory'),confirm=$('#historyConfirm');
 if(historyClearConfirm){btn.classList.add('hidden');confirm.classList.remove('hidden');$('#historyConfirmText').textContent=t('confirm')}else{btn.classList.remove('hidden');confirm.classList.add('hidden')}
 wrap.classList.toggle('confirming',historyClearConfirm)
}
function deleteAllHistory(){if(currentTab()==='calc')store.del('uc-history');else setModeHistory(currentTab(),[]);historyClearConfirm=false;$('#clearHistory').classList.remove('hidden');$('#historyConfirm').classList.add('hidden');$('#historyClearWrap').classList.remove('confirming');renderHistory()}
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
// History sheet gestures: drag the handle to resize or close it; wheel and keys scroll it from anywhere.
function setupHistoryGestures() {
  // Version is owned by app.js; this interaction layer must never overwrite it.

  const panel = document.querySelector('#historyPanel');
  const handle = panel?.querySelector('.sheet-handle');
  const heading = panel?.querySelector('.section-heading');
  const list = document.querySelector('#historyList');
  if (!panel || !handle || !list) return;

  [handle, heading].forEach(el => {
    el?.addEventListener('touchstart', e => e.stopImmediatePropagation(), {capture:true, passive:true});
    el?.addEventListener('touchmove', e => e.stopImmediatePropagation(), {capture:true, passive:true});
    el?.addEventListener('touchend', e => e.stopImmediatePropagation(), {capture:true, passive:true});
    el?.addEventListener('touchcancel', e => e.stopImmediatePropagation(), {capture:true, passive:true});
  });


  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  // On big screens the app is scaled up (app.js, window.__uiZoom): screen pixels / zoom = CSS pixels.
  const Z = () => window.__uiZoom || 1;
  const cy = e => e.clientY / Z();
  const collapsedHeight = () => Math.min(window.innerHeight * 0.42 / Z(), 470);
  const expandedHeight = () => window.innerWidth <= 480
    ? window.innerHeight / Z()
    : Math.min(window.innerHeight * 0.92 / Z(), 780);

  let pointerId = null;
  let startY = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityY = 0;
  let startHeight = 0;
  let moved = false;

  function currentHeight() { return panel.getBoundingClientRect().height / Z(); }
  function setHeight(height) { panel.style.height = `${height}px`; }
  function clearInlineGeometry() { panel.style.height = ''; panel.style.transform = ''; }

  function snap(expanded) {
    panel.classList.toggle('expanded', expanded);
    panel.style.transform = '';
    panel.style.height = expanded ? `${expandedHeight()}px` : `${collapsedHeight()}px`;
    requestAnimationFrame(() => { panel.style.height = ''; });
  }

  function closeSheet() {
    panel.classList.remove('expanded', 'open', 'dragging');
    panel.style.height = '';
    panel.style.transform = '';
    list.scrollTop = 0;
  }

  function finishDrag(y) {
    if (pointerId === null) return;
    const dy = y - startY;
    const downwardVelocity = Math.max(0, velocityY);
    const upwardVelocity = Math.max(0, -velocityY);
    const collapsed = collapsedHeight();
    const expanded = expandedHeight();
    const height = currentHeight();
    const dismissByFling = downwardVelocity > 0.9 && Math.abs(dy) > 24;
    panel.classList.remove('dragging');
    pointerId = null;

    if (dismissByFling || dy > 130) {
      closeSheet();
      document.querySelector('#historyBackdrop')?.classList.remove('open');
      setTimeout(() => {
        if (!panel.classList.contains('open')) panel.classList.add('hidden');
        const backdrop = document.querySelector('#historyBackdrop');
        if (backdrop && !backdrop.classList.contains('open')) backdrop.classList.add('hidden');
      }, 260);
      return;
    }

    let targetExpanded;
    if (upwardVelocity > 0.9 && dy < -24) targetExpanded = true;
    else if (downwardVelocity > 0.9 && dy > 24) targetExpanded = false;
    else targetExpanded = height > (collapsed + expanded) / 2;

    snap(targetExpanded);
    if (targetExpanded) list.scrollTop = 0;
    moved = false;
  }

  function onPointerDown(e) {
    if (!panel.classList.contains('open') || e.button > 0 || pointerId !== null) return;
    // Buttons in the heading (close, clear all, chart) must get their own click; capturing the pointer here would swallow it.
    if (e.target.closest('button')) return;
    pointerId = e.pointerId;
    startY = lastY = cy(e);
    lastTime = performance.now();
    velocityY = 0;
    startHeight = currentHeight();
    moved = false;
    panel.classList.add('dragging');
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (pointerId !== e.pointerId) return;
    const now = performance.now();
    const dy = cy(e) - startY;
    const dt = Math.max(1, now - lastTime);
    velocityY = (cy(e) - lastY) / dt;
    lastY = cy(e);
    lastTime = now;
    if (Math.abs(dy) > 3) moved = true;

    const min = collapsedHeight(), max = expandedHeight();
    const height = clamp(startHeight - dy, min, max);
    const atMin = startHeight - dy < min;
    const atMax = startHeight - dy > max;
    setHeight(height);
    if (atMin && dy > 0) panel.style.transform = `translate(-50%, ${Math.min(220, dy - (startHeight - min))}px)`;
    else panel.style.transform = 'translate(-50%, 0)';
    e.preventDefault();
  }

  function onPointerUp(e) { if (pointerId === e.pointerId) finishDrag(cy(e)); }

  [handle, heading].forEach(el => {
    el?.addEventListener('pointerdown', onPointerDown);
    el?.addEventListener('pointermove', onPointerMove);
    el?.addEventListener('pointerup', onPointerUp);
    el?.addEventListener('pointercancel', e => { if (pointerId === e.pointerId) finishDrag(cy(e)); });
  });

  // While History is open it is the page's scroll area: the mouse wheel and the keyboard scroll it from anywhere on screen.
  // Like a map app's bottom sheet: scrolling down first opens the sheet fully, then scrolls the list;
  // scrolling up goes back to the top of the list, then shrinks the sheet again.
  const isOpen = () => panel.classList.contains('open') && !panel.classList.contains('hidden');
  let sheetMovedAt = 0;
  function scrollHistory(dy, smooth) {
    if (!dy) return;
    const now = performance.now();
    if (now - sheetMovedAt < 280) return; // let the open/shrink animation finish before scrolling on
    const expanded = panel.classList.contains('expanded');
    if (dy > 0 && !expanded && list.scrollHeight > list.clientHeight + 1) {
      snap(true); list.scrollTop = 0; sheetMovedAt = now; return;
    }
    if (dy < 0 && expanded && list.scrollTop <= 0) {
      snap(false); sheetMovedAt = now; return;
    }
    list.scrollBy({ top: dy, behavior: smooth ? 'smooth' : 'auto' });
  }

  document.addEventListener('wheel', e => {
    if (!isOpen() || pointerId !== null || e.ctrlKey) return;
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

  let scrollTimer;
  list.addEventListener('scroll', () => {
    list.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => list.classList.remove('is-scrolling'), 550);
  }, { passive: true });

  const observer = new MutationObserver(() => {
    if (pointerId !== null) return;
    if (!panel.classList.contains('open')) {
      clearInlineGeometry();
      list.scrollTop = 0;
      return;
    }
    if (!panel.classList.contains('expanded')) {
      panel.style.height = '';
      panel.style.transform = '';
    }
  });
  observer.observe(panel, {attributes:true, attributeFilter:['class']});

  window.addEventListener('resize', () => {
    if (pointerId !== null) return;
    if (panel.classList.contains('expanded')) panel.style.height = '';
  });
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
