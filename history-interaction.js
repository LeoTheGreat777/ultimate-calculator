(() => {
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

  const style = document.createElement('style');
  style.textContent = `
    #historyPanel {
      will-change: height, transform;
      transform: translate(-50%, 100%);
      transition: transform .26s cubic-bezier(.22,.61,.36,1), height .26s cubic-bezier(.22,.61,.36,1);
      overscroll-behavior: contain;
    }
    #historyPanel.open { transform: translate(-50%, 0); }
    #historyPanel.dragging { transition: none !important; }
    #historyPanel .sheet-handle,
    #historyPanel .section-heading {
      touch-action: none;
      cursor: grab;
      -webkit-user-select: none;
      user-select: none;
    }
    #historyPanel.dragging .sheet-handle,
    #historyPanel.dragging .section-heading { cursor: grabbing; }
    #historyPanel.dragging .history-list { pointer-events: none; }
    #historyPanel.expanded { height: min(calc(92dvh / var(--z,1)), 780px); }
    @media (max-width: 480px) {
      #historyPanel.expanded { height: calc(100dvh / var(--z,1)); border-radius: 20px 20px 0 0; }
    }
  `;
  document.head.appendChild(style);

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
})();
