// The app around the modes: theme, language, switching modes (tabs), the explanation dialog,
// copying, holding keys, and installing on a phone.
// Themes. The colours are in styles.css (html[data-theme]); a new theme is a block there, a name here and its texts.
// The theme button opens a small menu with a preview of each theme.
const THEMES=['auto','light','paper','rose','sky','dark','black','ocean','violet','ember','forest'];
const LIGHT_THEMES=['light','paper','rose','sky'];// the others are dark (the button shows ☀ or ☾)
const prefersLight=matchMedia('(prefers-color-scheme: light)');
const resolveTheme=name=>name==='auto'?(prefersLight.matches?'light':'dark'):name;
function resolvedTheme(){return resolveTheme(theme)}
function applyTheme(){
 const root=document.documentElement,shown=resolvedTheme();
 root.dataset.theme=shown;
 const b=$('#themeButton');
 if(b){b.textContent=LIGHT_THEMES.includes(shown)?'☀':'☾';b.setAttribute('aria-label',t('theme'));b.title=t('theme')}
 // the browser's own bar (Android, installed app) takes the theme's background
 $('meta[name="theme-color"]')?.setAttribute('content',getComputedStyle(root).getPropertyValue('--bg').trim()||'#0b0f14');
 redrawCharts();
}
try{prefersLight.addEventListener('change',()=>{if(theme==='auto')applyTheme()})}catch{}
// The new theme spreads out in a circle from the theme button (View Transitions); browsers without it get a
// short colour fade; with reduced motion, or when the colours stay the same (e.g. dark -> auto at night), it switches at once.
function setTheme(next){
 if(!THEMES.includes(next))return;
 const run=()=>{theme=next;store.set('uc-theme',theme);applyTheme()};
 const root=document.documentElement;
 if(reducedMotion()||resolveTheme(next)===resolvedTheme()){run();return}
 if(!document.startViewTransition){root.classList.add('theme-fade');run();setTimeout(()=>root.classList.remove('theme-fade'),400);return}
 const z=window.__uiZoom||1,b=$('#themeButton').getBoundingClientRect(),x=(b.left+b.width/2)/z,y=(b.top+b.height/2)/z;// CSS px
 const r=Math.hypot(Math.max(x,innerWidth/z-x),Math.max(y,innerHeight/z-y));
 root.classList.add('vt-theme');
 try{
  const vt=document.startViewTransition(run);
  vt.ready.then(()=>root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]},{duration:560,easing:'cubic-bezier(.4,0,.2,1)',pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
  vt.finished.finally(()=>root.classList.remove('vt-theme'));
 }catch{root.classList.remove('vt-theme');run()}
}
const themeMenuOpen=()=>!!$('#themeMenu')&&!$('#themeMenu').classList.contains('hidden');
function renderThemeMenu(){
 let m=$('#themeMenu');
 if(!m){
  m=document.createElement('div');m.id='themeMenu';m.className='theme-menu hidden';m.setAttribute('role','menu');
  $('.top-actions').appendChild(m);
  m.addEventListener('click',e=>{const b=e.target.closest('[data-theme-pick]');if(!b)return;closeThemeMenu();setTheme(b.dataset.themePick)});
 }
 m.setAttribute('aria-label',t('theme'));
 const key=n=>'theme'+n[0].toUpperCase()+n.slice(1);
 m.innerHTML=THEMES.map(n=>{
  // each swatch carries the theme's own colours (data-theme-preview), so it shows the real thing
  const swatch=n==='auto'
   ?'<span class="theme-swatch theme-swatch-auto" aria-hidden="true"><span data-theme-preview="light"><i></i></span><span data-theme-preview="dark"><i></i></span></span>'
   :'<span class="theme-swatch" data-theme-preview="'+n+'" aria-hidden="true"><i></i></span>';
  return '<button type="button" class="theme-option" role="menuitemradio" aria-checked="'+(theme===n)+'" data-theme-pick="'+n+'">'+swatch+
   '<span class="theme-option-text">'+esc(t(key(n)))+'</span><span class="theme-check" aria-hidden="true">✓</span></button>'+
   (n==='auto'||n===LIGHT_THEMES[LIGHT_THEMES.length-1]?'<hr>':'');// lines between Auto, the light themes and the dark ones
 }).join('');
}
function openThemeMenu(){
 renderThemeMenu();$('#themeMenu').classList.remove('hidden');$('.topbar').classList.add('menu-open');$('#themeButton').setAttribute('aria-expanded','true');
 if(hasKeyboard())$('#themeMenu [aria-checked="true"]')?.focus({preventScroll:true});
}
function closeThemeMenu(focusButton){
 if(!themeMenuOpen())return;
 $('#themeMenu').classList.add('hidden');$('.topbar').classList.remove('menu-open');$('#themeButton').setAttribute('aria-expanded','false');
 if(focusButton)$('#themeButton').focus({preventScroll:true});
}
function toggleThemeMenu(){if(themeMenuOpen())closeThemeMenu();else openThemeMenu()}
// Keys while the menu is open: ↑ ↓ move, Enter/Space choose (the buttons do that themselves), Esc or Tab close it.
function themeMenuKeydown(e){
 if(!themeMenuOpen())return false;
 const items=[...$('#themeMenu').querySelectorAll('.theme-option')],i=items.indexOf(document.activeElement);
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();return true}
 if(e.key==='Home'||e.key==='End'){e.preventDefault();items[e.key==='Home'?0:items.length-1].focus();return true}
 if(e.key==='Escape'){e.preventDefault();closeThemeMenu(true);return true}
 if((e.key==='Enter'||e.key===' ')&&i>=0)return true;
 closeThemeMenu();return false;
}
function showHow(){if(!howData)return;$('#howTitle').textContent=t('how');$('#howContent').innerHTML=`<div class="how-step"><div class="how-expression-label">${lang==='el'?'Πράξη':'Expression'}</div><div class="how-formula">${esc(howData.formula)}</div><div class="how-steps">${howData.steps.map((s,i)=>`<div class="how-line"><span>${i+1}</span><div class="how-line-body"><strong>${esc(s.title||'')}</strong><div>${esc(s.text||s)}</div></div></div>`).join('')}</div><div class="how-result"><span>${lang==='el'?'Αποτέλεσμα':'Result'}</span><strong>${esc(howData.result)}</strong></div></div>`;$('#howModal').classList.remove('hidden')}
function closeHow(){$('#howModal').classList.add('hidden');$('#howModal').classList.remove('help-open')}
function modeIcon(m){return ICONS[m]||''}
function renderTool(){
 const calc=mode==='calc';
 const card=$('#calculatorCard');
 card.classList.toggle('mobile-tool',!calc&&isMobileDevice()&&mode!=='units'&&mode!=='graph');
 document.body.classList.toggle('mobile-tool-on',card.classList.contains('mobile-tool'));
 card.classList.remove('unit-keypad-open');
 // Graph mode (charts.js) builds its own display and keypad.
 card.classList.toggle('graph-mode',mode==='graph');
 document.body.classList.toggle('graph-on',mode==='graph');
 if(mode==='graph'){
   card.classList.remove('tool-mode');
   $('#toolPanel').classList.add('hidden');
   $('#calculatorDisplay').classList.remove('hidden');
   renderGraphMode();
   fitLayout();
   return;
 }
 if(mode==='units'){
   $('#calculatorCard').classList.add('tool-mode');
   $('#toolPanel').classList.add('hidden');
   $('#calculatorDisplay').classList.remove('hidden');
   renderUnitsDisplay();
   renderCalcKeypad();
   fitLayout();
   return;
 }
 restoreCalculatorDisplay();
 $('#calculatorCard').classList.toggle('tool-mode',!calc);
 $('#toolPanel').classList.toggle('hidden',calc);
 $('#calculatorDisplay').classList.toggle('tool-display',!calc);
 $('#calculatorDisplay').classList.remove('hidden');
 if(calc){
   renderCalcKeypad();
   render();
   fitLayout();
   return;
 }
 let html='';
 if(mode==='fuel')html='<div class="tool-grid">'+field('fuelD',T[lang].fuelD)+field('fuelC',T[lang].fuelC)+field('fuelP',T[lang].fuelP)+'</div>';
 if(mode==='energy')html='<div class="tool-grid">'+field('energyP',T[lang].energyP)+field('energyH',T[lang].energyH)+field('energyD',T[lang].energyD)+field('energyR',T[lang].energyR)+'</div>';
 if(mode==='vat')html='<div class="tool-grid">'+field('amount',T[lang].amount)+field('vatRate',T[lang].vatRate)+'</div><div class="vat-toggle" role="radiogroup" data-active="'+vatAction+'"><span class="vat-thumb" aria-hidden="true"></span><button type="button" role="radio" data-vat-mode="add">'+esc(T[lang].addVat)+'</button><button type="button" role="radio" data-vat-mode="remove">'+esc(T[lang].removeVat)+'</button></div>';

 $('#toolPanel').innerHTML=html;
 setActiveToolInput($('#toolPanel input[data-tool-input]'));
 renderVatToggle();
 renderToolKeypad();
 fitLayout();


}
function setMode(next){
 if(mode==='calc')calcHowData=howData;mode=next;howData=next==='calc'?calcHowData:null;toolResult=null;
 if(next==='calc')refreshCalcHow();
 // Tools keep what was typed in them; only an empty VAT rate goes back to the default.
 if(next==='vat'&&!toolState.vat.inputs.vatRate)toolState.vat.inputs.vatRate='24';
 if(next==='units'){unitActiveInput=unitSource;unitReplaceOnNextKey=true;window._unitCategory=window._unitCategory||'length';}
 renderTool();
 if(next!=='calc'&&next!=='graph'){runActiveTool();if(next!=='units')renderToolDisplay()}
 syncModeTabs();
}
// The modes, one tap each: a strip of tabs at the top of the card (scrolls sideways when they don't all fit).
const MODE_LABELS=['calc','units','graph','vat','fuel','energy'];
function renderModeTabs(){
 const track=$('#modeTabs .mode-tabs-track');if(!track)return;
 track.innerHTML=MODE_LABELS.map(m=>'<button class="mode-tab" role="tab" type="button" data-mode="'+m+'"><span class="mode-tab-icon" aria-hidden="true">'+modeIcon(m)+'</span><span class="mode-tab-label">'+esc(modeText(m))+'</span></button>').join('');
 syncModeTabs(true);
}
// Highlight the current tab and bring it into view.
function syncModeTabs(instant){
 const track=$('#modeTabs .mode-tabs-track');if(!track)return;
 if(!track.children.length){renderModeTabs();return}
 let active=null;
 [...track.children].forEach(b=>{const on=b.dataset.mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;if(on)active=b});
 if(active){
  const pad=24,left=Math.min(Math.max(track.scrollLeft,active.offsetLeft+active.offsetWidth-track.clientWidth+pad),active.offsetLeft-pad);
  track.scrollTo({left:Math.max(0,left),behavior:instant||reducedMotion()?'auto':'smooth'});
 }
 syncTabEdges();
}
// soft edges show that there are more tabs to scroll to
function syncTabEdges(){const track=$('#modeTabs .mode-tabs-track');if(!track)return;track.classList.toggle('at-start',track.scrollLeft<=2);track.classList.toggle('at-end',track.scrollLeft+track.clientWidth>=track.scrollWidth-2)}
// Choosing a mode. Calculator -> Units moves the calculator's number into Units (into the value you last typed in
// there) and the calculator starts fresh; nothing comes back the other way (Units does its own math).
function switchMode(next){
 if(next===mode){syncModeTabs();return}
 if(mode==='calc'&&next==='units'){
  const v=calcNumberForUnits();
  if(v!==null){
   const side=unitSource==='to'?'to':'from';
   unitExpressions={from:'',to:''};unitExpressions[side]=v;unitSource=unitActiveInput=side;unitSourceTyped=false;
   clearAll();
  }
 }
 setMode(next);
}
// The calculator's current number: the result, or what is being typed (an unfinished calculation is worked out). null if none.
function calcNumberForUnits(){
 if(current==='Error')return null;
 try{
  let value;
  if(justCalculated&&lastResult)value=lastResult;
  else{
   let full=tidyParens(expression+current);if(/[+\-×÷^]$/.test(full))full=full.slice(0,-1);
   if(!full)return null;
   const open=(full.match(/\(/g)||[]).length-(full.match(/\)/g)||[]).length;if(open>0)full+=')'.repeat(open);
   value=evalExpr(full);
  }
  return value?ratToDecimal(value,24):null;
 }catch{return null}
}
// Switch language in place, everything kept as it is (no page reload), with a short cross-fade where supported.
function setLanguage(next){
 const run=()=>{
  try{localStorage.setItem('uc-lang',next)}catch{}
  if(!$('#howModal').classList.contains('hidden'))closeHow();
  applyLanguage();
  renderHistory();
 };
 if(document.startViewTransition&&!reducedMotion()){try{document.documentElement.classList.add('vt-lang');const vt=document.startViewTransition(run);vt.finished.finally(()=>document.documentElement.classList.remove('vt-lang'));return}catch{document.documentElement.classList.remove('vt-lang')}}
 run();
}
// The calculator's step-by-step explanation, in the current language.
function refreshCalcHow(){if(justCalculated&&lastExpression&&lastResult!==null){howData=explanationForExpression(lastExpression,lastResult)||howData;if(howData&&lastShown)howData.formula=lastShown;calcHowData=howData}}
function applyLanguage(){
 lang=readLanguage();
 const savedInputs={};
 if(mode!=='calc'&&mode!=='units')$$('#toolPanel input[data-tool-input]').forEach(input=>savedInputs[input.id]=input.value);
 document.documentElement.lang=lang;
 $('#langButton').textContent=lang==='el'?'ΕΛ':'EN';
 $('#copyButton').textContent=t('copy');
 $('#historyButtonText').textContent=t('history');
 $('#historyButton').setAttribute('aria-label',t('history'));$('#historyButton').title=t('history');
 $('#modeTabs')?.setAttribute('aria-label',lang==='el'?'Λειτουργίες':'Modes');
 renderModeTabs();
 $('#howTitle').textContent=t('how');
 $('#howButton')?.setAttribute('aria-label',t('how'));
 $('#historyPanel').setAttribute('aria-label',t('history'));
 $('#historyConfirmYes').textContent=t('confirmYes');
 $('#historyTitle').textContent=t('history');
 $('#clearHistory').textContent=t('clear');
 $('#historyConfirmText').textContent=t('confirm');
 $('#closeHow').setAttribute('aria-label',t('close'));
 $('#closeHistory').setAttribute('aria-label',t('close'));
 $('#historyChartButton')?.setAttribute('aria-label',t('chart'));
 $('#historyChartButton')?.setAttribute('title',t('chart'));
 $('#themeButton').setAttribute('aria-label',t('theme'));$('#themeButton').title=t('theme');if($('#themeMenu'))renderThemeMenu();
 const hint=$('#hint');if(hint)hint.textContent=t('hint');
 syncInstallButton();
 syncHelpButton();
 const created=$('#createdBy');if(created)created.innerHTML=esc(t('created'))+' '+(AUTHORS[lang]||AUTHORS.en).map(n=>'<span class="author">'+esc(n)+'</span>').join(' &amp; ');
 if(mode==='calc')refreshCalcHow();
 renderTool();
 Object.entries(savedInputs).forEach(([id,value])=>{
   if(toolState[mode])toolState[mode].inputs[id]=value;
   const input=$('#'+id);if(input)input.value=value;
 });
 if(mode==='fuel')window._runFuel?.();
 else if(mode==='energy')window._runEnergy?.();
 else if(mode==='vat')window._runVat?.(vatAction==='add');
 else if(mode==='units')window._runUnits?.();
 else render();
 syncModeTabs();
 renderVatToggle();
}
// Holding ⌫ clears everything, the same as AC, in every mode.
function clearEverything(){if(mode==='calc')clearAll();else if(mode==='units')toolKeyInput('clear');else if(mode==='graph')graphKey('clear');else clearToolFields()}
// Holding a key for half a second: ⌫ clears everything, − changes the sign (±). A plain tap does the usual.
const HOLD_KEYS=[
 {sel:'[data-action="backspace"],[data-g="back"]',run:()=>clearEverything()},
 {sel:'.key[data-value="-"]',when:()=>mode==='calc'||mode==='units',run:()=>{if(mode==='calc')negate();else toolKeyInput('negate')}}
];
function setupHoldKeys(){
 const pad=$('#keypad');let timer=0,fired=false,key=null;
 const holdKey=t=>{for(const h of HOLD_KEYS){const b=t?.closest?.(h.sel);if(b&&pad.contains(b)&&(!h.when||h.when()))return{b,h}}return null};
 const cancel=()=>{clearTimeout(timer);timer=0;key?.classList.remove('holding');key=null};
 pad.addEventListener('pointerdown',e=>{
  const k=holdKey(e.target);if(!k||e.button>0)return;
  cancel();fired=false;key=k.b;k.b.classList.add('holding');
  timer=setTimeout(()=>{timer=0;fired=true;k.b.classList.remove('holding');k.h.run();try{navigator.vibrate?.(15)}catch{}
   const now=holdKey(document.elementFromPoint(e.clientX,e.clientY))?.b||k.b;now.classList.add('held');setTimeout(()=>now.classList.remove('held'),300)},500);
 });
 pad.addEventListener('pointerup',cancel);pad.addEventListener('pointercancel',cancel);
 pad.addEventListener('pointerleave',e=>{if(key&&e.target===key)cancel()},true);
 // the click that ends a long press must not also do the key's normal action
 pad.addEventListener('click',e=>{if(fired&&holdKey(e.target)){fired=false;e.stopImmediatePropagation();e.preventDefault()}},true);
 pad.addEventListener('contextmenu',e=>{if(holdKey(e.target))e.preventDefault()});
}
function copyResult(){
 // Copies what the screen shows: the result, the expression being typed, or in Units the converted value.
 const unitResult=()=>{const side=unitSource==='to'?'from':'to';return formatUnitResult(unitExpressions[side]??'')};
 const value=mode==='calc'?(justCalculated?fmt(lastResult):(expression+current?formatExpressionDisplay(expression+current):'')):mode==='units'?unitResult():(toolResult?.main??'');
 if(value===''||value===t('toolReady')||!navigator.clipboard)return;
 navigator.clipboard.writeText(String(value)).then(()=>{const b=$('#copyButton');b.textContent=t('copied');setTimeout(()=>b.textContent=t('copy'),900)}).catch(()=>{})
}
// Install on a phone's home screen. Android browsers give us their install dialog (beforeinstallprompt);
// iPhones have no such API, so there (and in Android browsers without it) the button shows a short guide.
let installPrompt=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
function syncInstallButton(){
 const b=$('#installButton');if(!b)return;
 const installed=store.get('uc-installed')==='1'&&!installPrompt;
 b.classList.toggle('hidden',isStandalone()||!isMobileDevice()||installed);
 b.setAttribute('aria-label',t('install'));b.title=t('install');
}
const SHARE_ICON='<svg class="share-icon" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function showInstallGuide(){
 const keys=isIOS()?['iosShare','iosAdd','iosDone']:['andMenu','andAdd','andDone'];
 $('#howTitle').textContent=t('installTitle');
 $('#howContent').innerHTML='<div class="install-guide"><p class="chart-note">'+esc(t('installIntro'))+'</p><div class="how-steps">'+keys.map((k,i)=>'<div class="how-line"><span>'+(i+1)+'</span><div class="how-line-body"><strong>'+esc(t(k+'T'))+'</strong><div>'+esc(t(k)).replace('{share}',SHARE_ICON)+'</div></div></div>').join('')+'</div></div>';
 $('#howModal').classList.remove('hidden');
}
async function installApp(){
 if(installPrompt){
  const p=installPrompt;installPrompt=null;
  try{await p.prompt();const choice=await p.userChoice;if(choice?.outcome==='accepted')store.set('uc-installed','1')}catch{}
  syncInstallButton();return;
 }
 showInstallGuide();
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;store.del('uc-installed');syncInstallButton()});
window.addEventListener('appinstalled',()=>{installPrompt=null;store.set('uc-installed','1');syncInstallButton()});
try{matchMedia('(display-mode: standalone)').addEventListener('change',syncInstallButton)}catch{}

// Mode tabs
$('#modeTabs').addEventListener('click',e=>{const b=e.target.closest('.mode-tab');if(b)switchMode(b.dataset.mode)});
$('#modeTabs .mode-tabs-track').addEventListener('scroll',syncTabEdges,{passive:true});
// a mouse wheel over the tabs scrolls them sideways (when they don't all fit)
$('#modeTabs').addEventListener('wheel',e=>{const t=$('#modeTabs .mode-tabs-track');if(t.scrollWidth<=t.clientWidth)return;e.preventDefault();t.scrollLeft+=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX},{passive:false});
// arrow keys move between tabs when one has keyboard focus
$('#modeTabs').addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();e.stopPropagation();const i=MODE_LABELS.indexOf(mode),n=MODE_LABELS[Math.max(0,Math.min(MODE_LABELS.length-1,i+(e.key==='ArrowRight'?1:-1)))];switchMode(n);requestAnimationFrame(()=>$('#modeTabs .mode-tab.active')?.focus())});
window.addEventListener('resize',()=>syncModeTabs(true));
