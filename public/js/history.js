// History: saved calculations, the bottom sheet that lists them, and its gestures.
function historyItems(){try{return JSON.parse(store.get('uc-history')||'[]')}catch{return[]}}
function saveHistory(item){const list=historyItems();const stored={...item,shown:item.shown||formatExpressionDisplay(item.expression),result:item.result&&typeof item.result==='object'&&'n'in item.result?ratToDecimal(item.result,24):String(item.result)};list.unshift({id:Date.now()+Math.random(),...stored});store.set('uc-history',JSON.stringify(list.slice(0,100)));renderHistory()}
function renderHistory(){const list=historyItems();$('#historyList').innerHTML=list.length?list.map(x=>`<div class="history-item"><button class="history-main" data-history="${x.id}" type="button"><div class="history-expression">${esc((x.shown||formatInputDisplay(x.expression)))}</div><div class="history-result">${esc(fmt(x.result&&typeof x.result==='string'?ratFromString(x.result):x.result))}</div></button><button class="history-delete" data-delete="${x.id}" type="button" aria-label="${esc(t('delete'))}">×</button></div>`).join(''):`<div class="empty">${esc(t('none'))}</div>`;historyChartRefresh()}

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
function deleteAllHistory(){store.del('uc-history');historyClearConfirm=false;$('#clearHistory').classList.remove('hidden');$('#historyConfirm').classList.add('hidden');$('#historyClearWrap').classList.remove('confirming');renderHistory()}
function historyClick(e){
 const del=e.target.closest('[data-delete]'),item=e.target.closest('[data-history]');
 if(del){store.set('uc-history',JSON.stringify(historyItems().filter(x=>String(x.id)!==del.dataset.delete)));renderHistory();return}
 if(item){const x=historyItems().find(x=>String(x.id)===item.dataset.history);if(!x)return;closeHistory();setMode('calc');carry=null;resultNegated=false;lastExpression=x.expression;lastShown=(x.shown||formatInputDisplay(x.expression));lastResult=ratFromString(String(x.result));justCalculated=true;expression='';current='';currentIsPercent=false;howData=explanationForExpression(x.expression,lastResult)||x.how||null;if(howData&&lastShown)howData.formula=lastShown;calcHowData=howData;lastOperation=parseLastOperation(x.expression);render();syncModeTabs()}
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
