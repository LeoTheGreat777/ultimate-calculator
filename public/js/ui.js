// The app around the modes: language, switching modes (tabs), the explanation dialog, copying, holding keys,
// and installing on a phone. Themes are in theme.js.
function showHow(){if(mode==='units')howData=unitsHow();if(!howData)return;$('#howTitle').textContent=t('how');$('#howModal').classList.remove('help-open','help-wide','fn-open');$('#howContent').innerHTML=howHtml(howData);$('#howModal').classList.remove('hidden')}
function closeHow(){if($('#howModal').contains(document.activeElement))document.activeElement.blur();$('#howModal').classList.add('hidden');$('#howModal').classList.remove('help-open','help-wide','fn-open')}
function modeIcon(m){return ICONS[m]||''}
function renderTool(){
 const calc=mode==='calc';
 if(!calc){$('#resultAlt')?.remove();$('#calculatorDisplay')?.classList.remove('has-alt')}// the polar line is the Calculator's
 renderDateBar();// the Working days chip shows only in Dates: every tab change hides or shows it
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
 if(mode==='fuel')html='<div class="tool-grid kind-grid" style="--f:3">'+field('fuelD',T[lang].fuelD)+field('fuelC',T[lang].fuelC)+field('fuelP',T[lang].fuelP)+'</div>';
 if(mode==='energy')html='<div class="tool-grid kind-grid" style="--f:4">'+field('energyP',T[lang].energyP)+field('energyH',T[lang].energyH)+field('energyD',T[lang].energyD)+field('energyR',T[lang].energyR)+'</div>';
 if(mode==='vat')html='<div class="tool-grid">'+field('amount',T[lang].amount)+field('vatRate',T[lang].vatRate)+'</div>'+toggleHtml('vat');
 // Percent, Interest and Dates: the switch goes above the fields, since it decides which fields there are
 if(KIND_FIELDS[mode])html=kindPanelHtml();
 if(mode==='stats')html=statsPanelHtml();// Statistics (stats.js): one field, the list of numbers, the details

 closeCalendar();
 $('#toolPanel').innerHTML=html;
 $$('#toolPanel input[data-tool-input]').forEach(i=>fitDisplayText(i,12));
 setActiveToolInput($('#toolPanel input[data-tool-input]'));
 renderToggles();
 if(mode==='net')renderNetDetails(null);// its cells take room: in place before fitting the layout
 if(mode==='stats'){renderStatList();renderStatDetails(null)}
 renderToolKeypad();setActiveToolInput(toolActiveInput);// again, now that the keypad is there
 fitLayout();


}
function setMode(next){
 if(mode==='calc')calcHowData=howData;mode=next;howData=next==='calc'?calcHowData:null;toolResult=null;
 if(next==='calc')refreshCalcHow();
 // A tool starts empty (resetModeInput cleared it on the way out), with its defaults: VAT rate, tip rate and people.
 fillToolDefaults(next);
 if(next==='units'){unitActiveInput=unitSource;unitReplaceOnNextKey=true;window._unitCategory=window._unitCategory||'length';}
 renderTool();
 if(next!=='calc'&&next!=='graph'){runActiveTool();if(next!=='units')renderToolDisplay()}
 syncModeTabs();
}
// The modes, one tap each: a strip of tabs at the top of the card (scrolls sideways when they don't all fit). It shows
// the pinned modes and the one on screen (stripModes, modes.js); every mode is in the ⊞ sheet.
const MODE_LABELS=['calc','units','currency','graph','vat','pct','loan','dates','fuel','energy','net','numbers','equation','stats'];
function renderModeTabs(){
 const track=$('#modeTabs .mode-tabs-track');if(!track)return;
 const pins=typeof pinnedModes!=='undefined'?pinnedModes:MODE_LABELS;
 track.innerHTML=stripModes().map(m=>'<button class="mode-tab" role="tab" type="button" data-mode="'+m+'" aria-label="'+esc(modeText(m))+'" title="'+esc(modeText(m))+'"><span class="mode-tab-icon" aria-hidden="true">'+modeIcon(m)+'</span><span class="mode-tab-label">'+esc(modeText(m))+'</span></button>').join('');
 track.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('unpinned',!pins.includes(b.dataset.mode)));
 syncModeTabs(true);
}
// Highlight the current tab and bring it into view.
function syncModeTabs(instant){
 const track=$('#modeTabs .mode-tabs-track');if(!track)return;
 // the mode on screen joins the strip while it isn't pinned (and leaves it after)
 if(!track.children.length||[...track.children].map(b=>b.dataset.mode).join()!==stripModes().join()){renderModeTabs();return}
 // when the tabs don't all fit, the ones not on screen show only their icon (their name is in aria-label and title)
 const nav=$('#modeTabs');nav.classList.remove('icons');track.querySelectorAll('.mode-tab-label').forEach(l=>l.style.fontSize='');
 if(track.scrollWidth>track.clientWidth+1){
  nav.classList.add('icons');
  // still a little too wide (a long Greek name, a wide font): the name on screen gets a bit smaller first
  const lab=track.querySelector('.mode-tab[data-mode="'+currentTab()+'"] .mode-tab-label');
  for(let px=12.5;lab&&px>=11&&track.scrollWidth>track.clientWidth+1;px-=.5)lab.style.fontSize=px+'px';
 }
 let active=null;
 [...track.children].forEach(b=>{const on=b.dataset.mode===currentTab();b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;if(on)active=b});
 if(active){
  const pad=24,left=Math.min(Math.max(track.scrollLeft,active.offsetLeft+active.offsetWidth-track.clientWidth+pad),active.offsetLeft-pad);
  track.scrollTo({left:Math.max(0,left),behavior:instant||reducedMotion()?'auto':'smooth'});
 }
 syncTabEdges();
}
// soft edges show that there are more tabs to scroll to
function syncTabEdges(){
 const nav=$('#modeTabs'),track=$('#modeTabs .mode-tabs-track');if(!track)return;
 const start=track.scrollLeft<=2,end=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;
 track.classList.toggle('at-start',start);track.classList.toggle('at-end',end);
 nav.classList.toggle('at-start',start);nav.classList.toggle('at-end',end);nav.classList.toggle('all-fit',start&&end);
 // the slim bar under the tabs: as wide as the part in view, where the view is. Pulled past an end (the bounce of a
 // touch screen), the thumb stays at that end and gets shorter, like a phone's own scroll bars.
 const bar=nav.querySelector('.tabs-scrollbar'),thumb=bar?.querySelector('span');if(!thumb||start&&end)return;
 // tabsPull: how far a finger pulls past an end (Android stretches instead of moving the tabs, so it's measured here)
 const max=track.scrollWidth-track.clientWidth,x=track.scrollLeft,over=Math.max(x<0?-x:x>max?x-max:0,tabsPull);
 const room=bar.clientWidth,w=Math.max(10,Math.max(32,room*track.clientWidth/track.scrollWidth)-over*1.6);
 thumb.style.width=w+'px';thumb.style.transform='translateX('+(room-w)*Math.min(1,Math.max(0,x/Math.max(1,max)))+'px)';
}
// The bar can be grabbed, with a mouse or a finger: drag the thumb, or press the bar elsewhere to jump there.
// With a mouse the tabs themselves can be dragged sideways too. On a phone the tabs bounce past their ends (the
// phone's own overscroll) and the thumb shrinks against that end while they do.
let tabsPull=0;
function setupTabsBar(){
 const nav=$('#modeTabs'),bar=nav?.querySelector('.tabs-scrollbar'),track=nav?.querySelector('.mode-tabs-track');if(!bar||!track)return;
 let drag=null,touch=null,grab=null,suppress=false;
 // a finger pulling past an end
 track.addEventListener('touchstart',e=>{const t=e.touches[0];touch={x:t.clientX,left:track.scrollLeft};nav.classList.remove('bar-release')},{passive:true});
 track.addEventListener('touchmove',e=>{
  if(!touch)return;const dx=(e.touches[0].clientX-touch.x)/(window.__uiZoom||1),m=track.scrollWidth-track.clientWidth;
  const pull=track.scrollLeft<=1&&dx>0?dx-touch.left:track.scrollLeft>=m-1&&dx<0?-dx-(m-touch.left):0;
  tabsPull=Math.max(0,pull)*.6;syncTabEdges();flashTabsBar();
 },{passive:true});
 const letGo=()=>{touch=null;if(!tabsPull)return;tabsPull=0;nav.classList.add('bar-release');syncTabEdges();setTimeout(()=>nav.classList.remove('bar-release'),400)};
 track.addEventListener('touchend',letGo);track.addEventListener('touchcancel',letGo);
 // dragging the tabs with a mouse (a click that doesn't move still picks the tab)
 track.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button>0||nav.classList.contains('all-fit'))return;grab={id:e.pointerId,x:e.clientX,left:track.scrollLeft,moved:false}});
 track.addEventListener('pointermove',e=>{
  if(!grab||e.pointerId!==grab.id)return;const dx=e.clientX-grab.x;
  if(!grab.moved&&Math.abs(dx)<5)return;
  if(!grab.moved){grab.moved=true;track.setPointerCapture?.(e.pointerId);nav.classList.add('tabs-grab')}
  track.scrollLeft=grab.left-dx/(window.__uiZoom||1);
 });
 const drop=e=>{if(!grab||e.pointerId!==grab.id)return;if(grab.moved){suppress=true;setTimeout(()=>suppress=false,0)}grab=null;nav.classList.remove('tabs-grab')};
 track.addEventListener('pointerup',drop);track.addEventListener('pointercancel',drop);
 track.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault()}},true);
 const Z=()=>window.__uiZoom||1,max=()=>track.scrollWidth-track.clientWidth;
 const thumbW=()=>bar.querySelector('span').getBoundingClientRect().width/Z();
 const moveTo=clientX=>{const r=bar.getBoundingClientRect(),room=r.width/Z()-thumbW();track.scrollLeft=Math.min(max(),Math.max(0,(clientX/Z()-r.left/Z()-drag.grab)/Math.max(1,room)*max()))};
 bar.addEventListener('pointerdown',e=>{
  if(nav.classList.contains('all-fit')||e.button>0)return;
  e.preventDefault();e.stopPropagation();
  const t=bar.querySelector('span').getBoundingClientRect(),on=e.clientX>=t.left-6&&e.clientX<=t.right+6;
  drag={id:e.pointerId,grab:on?(e.clientX-t.left)/Z():thumbW()/2};
  bar.setPointerCapture?.(e.pointerId);nav.classList.add('bar-drag','show-bar');clearTimeout(tabsBarTimer);
  if(!on)moveTo(e.clientX);
 });
 bar.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id){e.preventDefault();moveTo(e.clientX)}});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;nav.classList.remove('bar-drag');flashTabsBar(900)};
 bar.addEventListener('pointerup',end);bar.addEventListener('pointercancel',end);
}
// The bar shows while the tabs move (and for a moment when the app opens, to say there are more), then fades away.
let tabsBarTimer=0;
function flashTabsBar(ms=1200){const nav=$('#modeTabs');if(!nav||nav.classList.contains('all-fit'))return;nav.classList.add('show-bar');clearTimeout(tabsBarTimer);tabsBarTimer=setTimeout(()=>nav.classList.remove('show-bar'),ms)}
// Choosing a mode. Calculator -> Units moves the calculator's number into Units (into the value you last typed in
// there) and the calculator starts fresh; nothing comes back the other way (Units does its own math).
function switchMode(next){
 if(next===currentTab()){syncModeTabs();return}
 recordModeHistory();// the mode you leave keeps its result in its own History
 // Currency is the Units mode showing currencies: the tab sets unitView, the mode is 'units'
 const tab=next;next=tab==='currency'?'units':tab;
 if(mode==='calc'&&next==='units'){
  const v=calcNumberForUnits();
  if(v!==null){
   const side=unitSource==='to'?'to':'from';
   unitExpressions={from:'',to:''};unitExpressions[side]=v;unitSource=unitActiveInput=side;unitSourceTyped=false;
   clearAll();
  }
 }
 resetModeInput(mode);
 if(next==='units')unitView=tab==='currency'?'currency':'units';
 setMode(next);
 if(tab==='currency')refreshRates();
}
// Changing mode starts the one you leave over: the numbers typed and the results go, so a tab is a quick way to clear.
// Graph goes back to its example function. Choices stay (units picked, VAT add/remove, Percent's kind, Deg/Rad, f(x)),
// and so does History. Calculator -> Units moves the number across first (switchMode).
function resetModeInput(m){
 if(m==='calc'){clearAll();return}
 if(m==='graph'){graph=graphDefault();graphTrace=null;return}
 if(m==='units'){unitError='';unitExpressions={from:'0',to:'0'};unitSourceTyped=false;unitReplaceOnNextKey=true;unitActiveInput=unitSource;return}
 if(toolState[m]){toolState[m].inputs={};toolState[m].result=null}
}
// The calculator's current number: the result, or what is being typed (an unfinished calculation is worked out). null if none.
function calcNumberForUnits(){
 if(calcError)return null;
 try{
  let value;
  if(justCalculated&&lastResult)value=lastResult;
  else{
   let full=tidyParens(expression+current);if(OP_END.test(full))full=full.slice(0,-1);
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
function refreshCalcHow(){if(justCalculated&&lastExpression&&lastResult!==null){howData=explanationForExpression(lastExpression,lastResult)||howData;if(howData&&lastShown&&!howData.spaced)howData.formula=lastShown;calcHowData=howData}}
function applyLanguage(){
 lang=readLanguage();
 const savedInputs={};
 if(mode!=='calc'&&mode!=='units')$$('#toolPanel input[data-tool-input]').forEach(input=>savedInputs[input.id]=input.value);
 document.documentElement.lang=lang;
 $('#langButton').textContent=lang==='el'?'ΕΛ':'EN';
 {const l=lang==='el'?'Γλώσσα: Ελληνικά':'Language: English';$('#langButton').setAttribute('aria-label',l);$('#langButton').title=l}
 nameKeys();
 $('#copyButton').textContent=t('copy');
 {const b=$('.preview-badge');if(b)b.textContent=lang==='el'?'Δοκιμαστική':'Preview';}
 $('#historyButtonText').textContent=t('history');
 $('#historyButton').setAttribute('aria-label',t('history'));$('#historyButton').title=t('history');
 $('#modeTabs')?.setAttribute('aria-label',lang==='el'?'Λειτουργίες':'Modes');
 renderModeTabs();
 {const b=$('#modesButton');if(b){b.setAttribute('aria-label',mText('title'));b.title=mText('title')}if(modesOpen())openModes()}
 $('#howTitle').textContent=t('how');
 $('#howButton')?.setAttribute('aria-label',t('how'));
 refreshSide(true);
 {const b=$('#unitHow');if(b){b.setAttribute('aria-label',t('how'));b.title=t('how')}}
 $('#historyPanel').setAttribute('aria-label',t('history'));
 $('#historyTitle').textContent=t('history');
 $('#clearHistory').textContent=t(historyClearConfirm?'confirmShort':'clear');
 $('#closeHow').setAttribute('aria-label',t('close'));
 $('#closeHistory').setAttribute('aria-label',t('close'));
 $('#historyChartButton')?.setAttribute('aria-label',t('chart'));
 $('#historyChartButton')?.setAttribute('title',t('chart'));
 $('#themeButton').setAttribute('aria-label',t('theme'));$('#themeButton').title=t('theme');if($('#themeMenu'))renderThemeMenu();renderThemeEditor();
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
 if(mode==='units'||TOOL_MODES.includes(mode))runActiveTool();
 else render();
 syncModeTabs();
 renderToggles();
}
// Holding ⌫, C or AC clears everything in every mode, as AC does (the defaults – VAT rate, /24, today – come back); in Graph
// every function, not only the one typed in. It happens while the key is still held, so it works on a phone too, where a
// long press may never end in a click.
function clearEverything(){if(mode==='calc')clearAll();else if(mode==='units')toolKeyInput('clear');else if(mode==='graph'){recordModeHistory();graph.fns=[''];graph.active=0;graphChanged()}else clearToolFields()}
// Holding a key for half a second: ⌫, C and AC clear everything (C turns into AC while still held, like the iPhone's
// calculator), − changes the sign (±). A plain tap does the usual.
const HOLD_KEYS=[
 {sel:'[data-action="backspace"],[data-g="back"],[data-action="clear"],[data-action="clear-all"],[data-g="clear"]',run:()=>clearEverything()},
 {sel:'.key[data-value="-"]',when:()=>mode==='calc'||mode==='units',run:()=>{if(mode==='calc')negate();else toolKeyInput('negate')}}
];
// Pressing a key: it lights up the moment it's touched, grows a little if held a moment (styles.css) and fades as it's
// let go (.pressed, the same with a mouse and a finger), and on a phone it ticks. Android: navigator.vibrate.
// iPhone has no vibrate for websites, but its own switch (<input type="checkbox" switch>, iOS 18+) ticks when toggled,
// and since iOS 26.5 only when a finger does it (a click made by a script stays silent). So on iPhone every key holds an
// invisible <label> over its whole face with a hidden switch inside (addKeyTicks): the tap lands on the label, the label
// passes it to its switch (the tick), and the same click goes on up to the keypad as a press of the key.
const IS_IOS=/iP(hone|od|ad)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function addKeyTicks(pad){
 for(const b of pad.querySelectorAll('button')){
  if(b.querySelector(':scope>.key-tick'))continue;
  const l=document.createElement('label'),i=document.createElement('input');
  l.className='key-tick';l.setAttribute('aria-hidden','true');i.type='checkbox';i.setAttribute('switch','');i.tabIndex=-1;
  i.addEventListener('click',e=>e.stopPropagation());// the label's click already is the key press
  l.appendChild(i);b.appendChild(l);
 }
}
// Keys showing only a symbol get a name a screen reader can say (and in the language on screen); keys with a name of
// their own (⌫, the scientific keys) keep it. Re-done whenever keys are re-drawn or re-labelled, and on a language switch.
const KEY_NAMES={'+':['Συν','Plus'],'−':['Μείον','Minus'],'-':['Μείον','Minus'],'×':['Επί','Times'],'÷':['Διά','Divided by'],'=':['Ίσον','Equals'],
 '%':['Τοις εκατό','Percent'],',':['Υποδιαστολή','Decimal comma'],'.':['Τελεία','Dot'],'±':['Αλλαγή προσήμου','Change sign'],'( )':['Παρενθέσεις','Parentheses'],
 '(':['Άνοιγμα παρένθεσης','Open bracket'],')':['Κλείσιμο παρένθεσης','Close bracket'],'√':['Τετραγωνική ρίζα','Square root'],'x²':['x στο τετράγωνο','x squared'],
 'xʸ':['Δύναμη','Power'],'π':['Πι','Pi'],'|x|':['Απόλυτη τιμή','Absolute value']};
function nameKeys(pad=$('#keypad')){
 if(!pad)return;
 for(const b of pad.querySelectorAll('button')){
  const n=KEY_NAMES[b.textContent.trim()];
  if(n){if(!b.hasAttribute('aria-label')||b.dataset.autoName){b.setAttribute('aria-label',n[lang==='el'?0:1]);b.dataset.autoName='1'}}
  else if(b.dataset.autoName){b.removeAttribute('aria-label');delete b.dataset.autoName}
 }
}
function setupPressFeedback(){
 const pad=$('#keypad');
 nameKeys(pad);new MutationObserver(()=>nameKeys(pad)).observe(pad,{childList:true,subtree:true,characterData:true});
 pad.addEventListener('pointerdown',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  b.classList.add('pressed');b._pressedAt=performance.now();
  if(e.pointerType!=='mouse'&&!IS_IOS){try{navigator.vibrate?.(8)}catch{}}
 });
 // let go: fade back, after showing for at least a moment even on the quickest tap
 const release=e=>{const b=e.target.closest?.('button.pressed');if(!b)return;
  setTimeout(()=>b.classList.remove('pressed'),Math.max(0,90-(performance.now()-(b._pressedAt||0))))};
 ['pointerup','pointercancel','pointerleave'].forEach(t=>pad.addEventListener(t,release,true));
 // keys are re-drawn often (modes, 2nd, C/AC): every new or re-labelled key gets its switch back
 if(IS_IOS){addKeyTicks(pad);new MutationObserver(()=>addKeyTicks(pad)).observe(pad,{childList:true,subtree:true})}
}
// iOS: a fast double tap or a long press starts selecting text and shows the magnifier bubble. Only a field you can type
// in may be selected: not a key's hidden switch (key-tick), not a read-only tool field (phones), nothing else.
const SELECTABLE='textarea,select,input:not([readonly]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=range])';
document.addEventListener('selectstart',e=>{const el=e.target.nodeType===1?e.target:e.target.parentElement;if(!el?.closest?.(SELECTABLE)||el.closest('.key-tick'))e.preventDefault()});
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
 setTimeout(recordModeHistory,0);// a result copied is a result worth keeping
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
$('#modeTabs .mode-tabs-track').addEventListener('scroll',()=>{syncTabEdges();flashTabsBar()},{passive:true});
// ‹ › on the edges (devices with a mouse): a page of tabs at a time
$$('#modeTabs .tabs-arrow').forEach(b=>b.addEventListener('click',()=>{const t=$('#modeTabs .mode-tabs-track');t.scrollBy({left:(b.classList.contains('tabs-prev')?-1:1)*t.clientWidth*.7,behavior:reducedMotion()?'auto':'smooth'})}));
addEventListener('load',()=>setTimeout(()=>{syncTabEdges();flashTabsBar(1800)},400));
addEventListener('resize',()=>syncTabEdges());
setupTabsBar();
// a mouse wheel over the tabs scrolls them sideways (when they don't all fit)
$('#modeTabs').addEventListener('wheel',e=>{const t=$('#modeTabs .mode-tabs-track');if(t.scrollWidth<=t.clientWidth)return;e.preventDefault();t.scrollLeft+=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX},{passive:false});
// arrow keys move between tabs when one has keyboard focus
$('#modeTabs').addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();e.stopPropagation();const list=stripModes(),i=list.indexOf(currentTab()),n=list[Math.max(0,Math.min(list.length-1,i+(e.key==='ArrowRight'?1:-1)))];switchMode(n);requestAnimationFrame(()=>$('#modeTabs .mode-tab.active')?.focus())});
window.addEventListener('resize',()=>syncModeTabs(true));
// The strip's own width: when it changes (the phone turned; iOS reports the new size late, after 'resize'), the bar
// under the tabs is measured again, so it never keeps its old width and position.
if(window.ResizeObserver){let w=0;new ResizeObserver(([e])=>{const nw=Math.round(e.contentRect.width);if(nw!==w){const first=!w;w=nw;if(!first)syncModeTabs(true)}}).observe($('#modeTabs'))}
