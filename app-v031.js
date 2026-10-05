(function(){
  'use strict';
  const VERSION='0.3.1';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const state={repeat:false,historyOpen:false,modeOpen:false};
  const style=document.createElement('style');
  style.textContent=`
  .uc-toolbar{display:flex;align-items:center;justify-content:space-between;padding:2px 2px 8px;position:relative;z-index:30}
  .uc-toolbar button{border:1px solid var(--border);background:var(--card2);color:var(--text);border-radius:11px;height:36px;padding:0 13px;font-size:12px;font-weight:700;cursor:pointer}
  .uc-toolbar .uc-history-top{display:flex;align-items:center;gap:7px;color:var(--muted)}
  .uc-toolbar .uc-mode-top{display:flex;align-items:center;gap:7px}
  .uc-toolbar button:active{transform:scale(.97)}
  .uc-mode-menu{position:absolute;right:2px;top:42px;width:min(230px,calc(100vw - 36px));padding:7px;background:var(--card);border:1px solid var(--border);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:3px;z-index:100}
  .uc-mode-menu.hidden{display:none}
  .uc-mode-item{border:0;background:transparent;color:var(--text);text-align:left;border-radius:11px;padding:11px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px}
  .uc-mode-item:hover,.uc-mode-item.active{background:var(--card2)}
  .uc-mode-check{color:var(--accent2);font-size:16px}
  .quick-tabs{display:none!important}.bottom-actions{display:none!important}
  /* Keep the ? out of the expression/result flow. It sits above the old calculation. */
  .display-wrap .expression-row{position:relative;overflow:visible}
  .display-wrap .how-button{position:absolute;right:0;bottom:calc(100% + 3px);z-index:2;flex:none;width:30px;height:30px;margin:0;border:1px solid var(--border);border-radius:50%;background:var(--card2);color:var(--accent2);font-size:16px;font-weight:750;cursor:pointer}
  .display-wrap .how-button.hidden{display:none!important}
  .history-panel.uc-sheet{position:fixed;z-index:90;left:50%;bottom:0;transform:translate(-50%,100%);width:min(680px,100%);height:min(48dvh,520px);margin:0;border-radius:24px 24px 0 0;padding:15px 14px calc(18px + env(safe-area-inset-bottom));background:var(--card);box-shadow:0 -20px 70px rgba(0,0,0,.48);transition:transform .25s ease;overflow:hidden;display:flex;flex-direction:column}
  .history-panel.uc-sheet.uc-open{transform:translate(-50%,0)}
  .uc-sheet::before{content:'';width:38px;height:4px;border-radius:999px;background:var(--muted);opacity:.45;align-self:center;margin:-5px 0 10px}
  .uc-sheet .history-list{overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;min-height:0;padding-bottom:6px}
  .uc-sheet.uc-expanded{height:min(92dvh,760px);max-height:92dvh}
  .uc-sheet-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.36);backdrop-filter:blur(3px);z-index:89;opacity:0;pointer-events:none;transition:opacity .2s ease}
  .uc-sheet-backdrop.uc-open{opacity:1;pointer-events:auto}
  .uc-sheet .section-heading{flex:0 0 auto}
  @media(max-width:480px){.uc-toolbar{padding:1px 1px 7px}.uc-mode-menu{right:1px}.history-panel.uc-sheet{width:100%;border-radius:22px 22px 0 0}.uc-sheet .history-list{max-height:55dvh}}
  `;
  document.head.appendChild(style);
  function addToolbar(){
    const card=$('.calculator-card');
    if(!card||$('.uc-toolbar'))return;
    const toolbar=document.createElement('div');
    toolbar.className='uc-toolbar';
    toolbar.innerHTML='<button type="button" class="uc-history-top" id="ucHistoryTop"><span>◷</span><span id="ucHistoryLabel">History</span></button><div style="position:relative"><button type="button" class="uc-mode-top" id="ucModeTop"><span>▦</span><span id="ucModeLabel">Calculator</span><span>⌄</span></button><div class="uc-mode-menu hidden" id="ucModeMenu"></div></div>';
    card.insertBefore(toolbar,card.firstElementChild);
    $('#ucHistoryTop').addEventListener('click',toggleHistory);
    $('#ucModeTop').addEventListener('click',e=>{e.stopPropagation();toggleModes();});
    document.addEventListener('click',e=>{if(state.modeOpen&&!e.target.closest('.uc-mode-menu')&&!e.target.closest('#ucModeTop'))closeModes();});
    buildModes();
  }
  function buildModes(){
    const menu=$('#ucModeMenu');if(!menu)return;
    const tabs=$$('.tab');
    menu.innerHTML=tabs.map(b=>'<button class="uc-mode-item '+(b.classList.contains('active')?'active':'')+'" data-mode-choice="'+b.dataset.mode+'" type="button"><span>'+b.textContent+'</span><span class="uc-mode-check">'+(b.classList.contains('active')?'✓':'')+'</span></button>').join('');
    $$('.uc-mode-item').forEach(b=>b.addEventListener('click',()=>{const tab=$('.tab[data-mode="'+b.dataset.modeChoice+'"]');if(tab)tab.click();closeModes();syncToolbar();}));
  }
  function toggleModes(){state.modeOpen=!state.modeOpen;$('#ucModeMenu')?.classList.toggle('hidden',!state.modeOpen);if(state.modeOpen)buildModes();}
  function closeModes(){state.modeOpen=false;$('#ucModeMenu')?.classList.add('hidden');}
  function syncToolbar(){const active=$('.tab.active');if(active)$('#ucModeLabel').textContent=active.textContent.trim();$('#ucHistoryLabel').textContent=(typeof lang!=='undefined'&&lang==='el')?'Ιστορικό':'History';buildModes();}
  function setupHistorySheet(){
    const panel=$('#historyPanel');if(!panel||panel.classList.contains('uc-sheet'))return;
    panel.classList.add('uc-sheet');
    let back=$('#ucHistoryBackdrop');
    if(!back){back=document.createElement('div');back.id='ucHistoryBackdrop';back.className='uc-sheet-backdrop';document.body.appendChild(back);back.addEventListener('click',closeHistory);}
    panel.addEventListener('touchstart',e=>{panel._touchY=e.touches[0].clientY;},{passive:true});
    panel.addEventListener('touchend',e=>{const y=e.changedTouches[0].clientY;if(panel._touchY==null)return;const dy=y-panel._touchY;if(dy<-45)panel.classList.add('uc-expanded');if(dy>45&&panel.scrollTop<=2)panel.classList.remove('uc-expanded');panel._touchY=null;},{passive:true});
  }
  function toggleHistory(){setupHistorySheet();const p=$('#historyPanel'),b=$('#ucHistoryBackdrop');state.historyOpen=!state.historyOpen;if(state.historyOpen)p.classList.remove('hidden');p.classList.toggle('uc-open',state.historyOpen);b.classList.toggle('uc-open',state.historyOpen);if(state.historyOpen){closeModes();window.setTimeout(()=>$('#historyList')?.scrollTo({top:0}),20);}}
  function closeHistory(){const p=$('#historyPanel'),b=$('#ucHistoryBackdrop');state.historyOpen=false;p?.classList.remove('uc-open','uc-expanded');p?.classList.add('hidden');b?.classList.remove('uc-open');}
  function repeatEquals(e){
    if(state.repeat)return;
    const display=$('#calculatorDisplay');if(!display?.classList.contains('calculated'))return;
    const expr=($('#expression')?.textContent||'').trim();if(!expr)return;
    const m=expr.match(/^(.*?)([+\-×÷])(\d+(?:[.,]\d+)?%?)$/);if(!m)return;
    const op=m[2],rhs=m[3];const opButton=$('.key[data-value="'+(op==='×'?'*':op==='÷'?'/':op)+'"]');if(!opButton)return;
    e.preventDefault();e.stopImmediatePropagation();state.repeat=true;
    opButton.click();
    const pct=rhs.endsWith('%');const digits=rhs.replace('%','').replace(',','.');
    for(const ch of digits){const b=$('.key[data-value="'+ch+'"]');if(b)b.click();}
    if(pct)$('.key[data-value="%"]')?.click();
    window.setTimeout(()=>$('.key.equals')?.click(),0);
    window.setTimeout(()=>{state.repeat=false;},20);
  }
  function setupKeyboardAndRepeat(){const eq=$('.key.equals');if(eq)eq.addEventListener('click',repeatEquals,true);document.addEventListener('keydown',e=>{if(/^F(?:[1-9]|1[0-2])$/.test(e.key)){e.preventDefault();e.stopPropagation();}},true);}
  function observeMode(){$$('.tab').forEach(b=>b.addEventListener('click',()=>window.setTimeout(syncToolbar,0)));const langBtn=$('#langButton');if(langBtn)langBtn.addEventListener('click',()=>window.setTimeout(syncToolbar,0));}
  function init(){const v=$('#version');if(v)v.textContent='v'+VERSION;const fv=$('#footerVersion');if(fv)fv.textContent='v'+VERSION;addToolbar();setupHistorySheet();observeMode();setupKeyboardAndRepeat();syncToolbar();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
