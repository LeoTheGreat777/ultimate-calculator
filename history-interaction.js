(() => {
  const VERSION = '0.3.4';
  document.querySelector('#version')?.replaceChildren(document.createTextNode(`v${VERSION}`));
  document.querySelector('#footerVersion')?.replaceChildren(document.createTextNode(`v${VERSION}`));

  const panel = document.querySelector('#historyPanel');
  const handle = document.querySelector('.sheet-handle');
  const heading = panel?.querySelector('.section-heading');
  const list = document.querySelector('#historyList');
  if (!panel || !handle || !list) return;

  const style = document.createElement('style');
  style.textContent = `
    #historyPanel.dragging { transition: none !important; }
    #historyPanel .sheet-handle, #historyPanel .section-heading { touch-action: none; cursor: grab; }
    #historyPanel.dragging .sheet-handle, #historyPanel.dragging .section-heading { cursor: grabbing; }
  `;
  document.head.appendChild(style);

  let pointerId = null;
  let startY = 0;
  let lastY = 0;
  let startExpanded = false;
  let startTime = 0;

  const expandedDelta = () => Math.max(180, Math.min(window.innerHeight * 0.55, 520));

  function resetTransform() {
    panel.style.transform = '';
  }

  function finishDrag(y) {
    if (pointerId === null) return;
    const dy = y - startY;
    const distance = Math.abs(dy);
    const velocity = Math.abs(y - lastY) / Math.max(1, performance.now() - startTime);
    const fastSwipe = velocity > 0.7 && distance > 20;

    panel.classList.remove('dragging');
    resetTransform();

    if (startExpanded) {
      if (dy > 70 || (fastSwipe && dy > 20)) panel.classList.remove('expanded');
      else panel.classList.add('expanded');
    } else {
      if (dy < -70 || (fastSwipe && dy < -20)) panel.classList.add('expanded');
      else panel.classList.remove('expanded');
    }

    if (panel.classList.contains('expanded')) list.scrollTop = 0;
    pointerId = null;
  }

  function onPointerDown(e) {
    if (!panel.classList.contains('open') || e.button > 0) return;
    pointerId = e.pointerId;
    startY = lastY = e.clientY;
    startExpanded = panel.classList.contains('expanded');
    startTime = performance.now();
    panel.classList.add('dragging');
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (pointerId !== e.pointerId) return;
    const dy = e.clientY - startY;
    lastY = e.clientY;

    const max = expandedDelta();
    let offset;
    if (startExpanded) {
      offset = Math.max(0, Math.min(max, dy));
    } else {
      offset = Math.max(-max, Math.min(0, dy));
    }
    panel.style.transform = `translate(-50%, ${offset}px)`;
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (pointerId === e.pointerId) finishDrag(e.clientY);
  }

  [handle, heading].forEach(el => {
    el?.addEventListener('pointerdown', onPointerDown);
    el?.addEventListener('pointermove', onPointerMove);
    el?.addEventListener('pointerup', onPointerUp);
    el?.addEventListener('pointercancel', e => {
      if (pointerId === e.pointerId) finishDrag(e.clientY);
    });
  });

  // Desktop: the first upward wheel gesture expands the sheet, then the same
  // gesture continues into the history list so it feels like one scroll.
  panel.addEventListener('wheel', e => {
    if (!panel.classList.contains('open')) return;

    if (!panel.classList.contains('expanded')) {
      if (e.deltaY >= 0) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      panel.classList.add('expanded');
      list.scrollTop = 0;
      requestAnimationFrame(() => {
        list.scrollTop = Math.max(0, list.scrollTop + e.deltaY);
      });
      return;
    }

    e.preventDefault();
    list.scrollTop += e.deltaY;
  }, { passive: false });

  window.addEventListener('resize', () => {
    if (panel.classList.contains('dragging')) resetTransform();
  });
})();
