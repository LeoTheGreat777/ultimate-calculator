// Copy and Paste. Press and hold a number (or right-click it) for a small menu with Copy and Paste: the Calculator's
// display, Units' two values, a tool's result, and a tool's fields where they are read-only (touch screens; on a computer
// a field is a text box with the browser's own menu). Ctrl+C / Ctrl+V do the same when no text box has the focus.
// Paste takes one number written in any common way (readPastedNumber): 1.234,56, 1,234.56, € 12, -3,5.
const CLIP_HOLD=480;
// What the screen shows, to copy: the result, the calculation being typed, in Units the converted value, a tool's result.
function copyValue(){
 const unitResult=()=>{const side=unitSource==='to'?'from':'to';return formatUnitResult(unitExpressions[side]??'')};
 const value=mode==='calc'?(justCalculated?($('#result')?.dataset.long&&$('#result').textContent.replace(/−/g,'-')||fmt(lastResult)):(typedText()?formatExpressionDisplay(typedText()):'')):mode==='units'?unitResult():(toolResult?.main??'');
 return value===t('toolReady')?'':String(value??'');
}
// Text to the clipboard; without the Clipboard API (a page not on https) the old way, through a hidden text box.
function writeClipboard(text){
 if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text).then(()=>true,()=>false);
 try{const a=document.createElement('textarea');a.value=text;a.setAttribute('readonly','');a.style.cssText='position:fixed;opacity:0;left:0;top:0';document.body.append(a);a.select();const ok=document.execCommand('copy');a.remove();return Promise.resolve(ok)}catch{return Promise.resolve(false)}
}
const canReadClipboard=()=>!!navigator.clipboard?.readText;
function flashCopied(el){if(!el)return;el.classList.add('copied');setTimeout(()=>el.classList.remove('copied'),700)}
function copyResult(){
 const value=copyValue();if(!value)return Promise.resolve(false);
 setTimeout(recordModeHistory,0);// a result copied is a result worth keeping
 return writeClipboard(value);
}

// Paste into the Calculator: the number takes the place of the number being typed (or starts one after an operator),
// typed in through the keys so every limit holds.
function pasteCalc(text){
 const n=readPastedNumber(text);
 if(!n||digitCount(n.int+n.frac)>MAX_DIGITS){refuseKey();return false}
 if(current&&!justCalculated&&!calcError){if(/\d/.test(current))caretTail=caretTail.replace(/^[\d.]+%?/,'');current='';currentIsPercent=false}
 for(const c of n.int)digit(c);
 if(n.frac){digit('.');for(const c of n.frac)digit(c)}
 if(n.neg)negate();
 return true;
}
// Paste into one of Units' values: it becomes the value converted from.
function pasteUnits(side,text){
 const n=readPastedNumber(text);
 if(!n||digitCount(n.int+n.frac)>MAX_DIGITS){refuseKey(unitValueEl(side));return false}
 unitActiveInput=side;unitSource=side;unitReplaceOnNextKey=true;
 for(const c of n.int)unitKeyInput(c);
 if(n.frac){unitKeyInput('.');for(const c of n.frac)unitKeyInput(c)}
 if(n.neg)unitKeyInput('negate');
 updateUnitsDisplay();
 return true;
}
// Paste into a tool's field: it replaces the field's value, read as a paste from the keyboard is (the input handler in
// tools.js: thousands dots, 15 digits, the field's top). Programmer and IP fields take the text as it is; Statistics
// takes several numbers at once.
function pasteIntoField(input,text){
 if(!input)return false;
 setActiveToolInput(input);
 if(input.id==='statX'){const vals=statPasted(text);if(vals===false){refuseKey(input);return false}if(vals){statAdd(vals);return true}}
 let v;
 if(progBase(input.id)||dottedField(input.id))v=String(text??'').trim();
 else{
  const n=readPastedNumber(text);
  if(!n||(n.neg&&noSignField(input.id))||(n.frac&&noDecimalField(input.id))){refuseKey(input);return false}
  v=(n.neg?'-':'')+n.int+(n.frac?','+n.frac:'');
 }
 if(!v){refuseKey(input);return false}
 input.value=v;
 const ev=new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:v});
 ev.pastedText=String(text??'');// as it was copied: Transfer reads the unit in it ("200 GB", tools.js)
 input.dispatchEvent(ev);
 return true;
}
const firstToolField=()=>toolActiveInput?.matches?.('#toolPanel input[data-tool-input]')?toolActiveInput:$('#toolPanel input[data-tool-input]');
// Paste where the keys would type: the Calculator, Units' value being typed, the highlighted field.
function pasteText(text){
 if(mode==='calc')return pasteCalc(text);
 if(mode==='units')return pasteUnits(unitActiveInput||'from',text);
 if(mode==='graph')return false;
 return pasteIntoField(firstToolField(),text);
}

// What a press on el can copy and paste: {el (flashed when copied), copy() -> text, paste(text)}, or null.
function clipTarget(el){
 if(!el?.closest||mode==='graph'||el.closest('button,select,a,#clipMenu'))return null;
 if(mode==='units'){
  const input=el.closest('.unit-row')?.querySelector('.unit-value');if(!input)return null;
  const side=input.id==='unitValueTo'?'to':'from';
  return {el:input,copy:()=>input.value,paste:x=>pasteUnits(side,x)};
 }
 const field=el.closest('#toolPanel .tool-field,#toolPanel .stat-box')?.querySelector('input[data-tool-input]');
 if(field)return field.readOnly&&!field.matches('[data-date-input]')?{el:field,copy:()=>field.value,paste:x=>pasteIntoField(field,x)}:null;
 if(el.closest('#calculatorDisplay'))return {el:$('#result'),copy:copyValue,paste:pasteText};
 return null;
}

/* ---------- The menu ---------- */
const clipMenuOpen=()=>!!$('#clipMenu')&&!$('#clipMenu').classList.contains('hidden');
let clipFor=null;
function openClipMenu(target,x,y){
 let m=$('#clipMenu');
 if(!m){
  m=document.createElement('div');m.id='clipMenu';m.className='clip-menu hidden';m.setAttribute('role','menu');document.body.append(m);
  m.addEventListener('click',e=>{const b=e.target.closest('button[data-clip]');if(!b||!clipFor)return;const f=clipFor;
   if(b.dataset.clip==='copy'){const v=f.copy();if(!v)return;setTimeout(recordModeHistory,0);writeClipboard(v).then(ok=>{if(!ok)return;flashCopied(f.el);b.textContent=t('copied');setTimeout(closeClipMenu,450)});return}
   closeClipMenu();navigator.clipboard.readText().then(x=>f.paste(x),()=>refuseKey(f.el))});
 }
 clipFor=target;
 const copyOk=!!target.copy();
 m.setAttribute('aria-label',t('clipMenu'));
 m.innerHTML='<button type="button" role="menuitem" data-clip="copy"'+(copyOk?'':' disabled')+'>'+esc(t('clipCopy'))+'</button>'+(canReadClipboard()?'<button type="button" role="menuitem" data-clip="paste">'+esc(t('clipPaste'))+'</button>':'');
 m.classList.remove('hidden');
 // above the finger (screen coordinates / the zoom on big screens), kept on the screen; below it near the top
 const Z=window.__uiZoom||1,W=innerWidth/Z,r=m.getBoundingClientRect(),w=r.width,h=r.height;
 const px=x/Z,py=y/Z,top=py-h-18<8?py+22:py-h-18;
 m.style.left=Math.max(8,Math.min(W-w-8,px-w/2))+'px';m.style.top=Math.max(8,top)+'px';
}
function closeClipMenu(){const m=$('#clipMenu');if(!m||m.classList.contains('hidden'))return;m.classList.add('hidden');clipFor=null}

/* ---------- Holding, right-click, the keyboard ---------- */
{
 let hold=null,fired=false;
 const cancel=()=>{if(hold){clearTimeout(hold.timer);hold=null}};
 document.addEventListener('pointerdown',e=>{
  if(clipMenuOpen()&&!eventInside(e,'#clipMenu')){closeClipMenu();fired=false}
  cancel();if(e.button!==0)return;
  const target=clipTarget(e.target);if(!target)return;
  // fired is set before the menu opens: the click that ends the press must not also move the cursor or pick a side
  hold={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{hold=null;fired=true;if(!clipMenuOpen())openClipMenu(target,e.clientX,e.clientY);try{navigator.vibrate?.(10)}catch{}},CLIP_HOLD)};
 },true);
 document.addEventListener('pointermove',e=>{if(hold&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>10)cancel()},true);
 document.addEventListener('pointerup',cancel,true);document.addEventListener('pointercancel',cancel,true);
 document.addEventListener('click',e=>{if(fired){fired=false;if(!eventInside(e,'#clipMenu')){e.stopImmediatePropagation();e.preventDefault()}}},true);
 // right-click (and Android's own long press): the same menu instead of the browser's
 document.addEventListener('contextmenu',e=>{const target=clipTarget(e.target);if(!target)return;e.preventDefault();if(!clipMenuOpen())openClipMenu(target,e.clientX,e.clientY)});
 document.addEventListener('keydown',e=>{if(clipMenuOpen()&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeClipMenu()}},true);
 addEventListener('resize',closeClipMenu);
 // Ctrl+C / Ctrl+V with no text box in use: copy what the screen shows, paste where the keys type
 const textBoxInUse=()=>{const a=document.activeElement;return a?.matches?.('input:not([readonly]),textarea,select')||!!getSelection()?.toString()};
 document.addEventListener('copy',e=>{if(e.defaultPrevented||textBoxInUse()||mode==='graph')return;const v=copyValue();if(!v)return;e.preventDefault();e.clipboardData?.setData('text/plain',v);setTimeout(recordModeHistory,0);flashCopied(mode==='units'?unitValueEl(unitSource==='to'?'from':'to'):$('#result'))});
 document.addEventListener('paste',e=>{if(e.defaultPrevented||textBoxInUse()||mode==='graph'||!$('#howModal').classList.contains('hidden'))return;const x=e.clipboardData?.getData('text');if(x==null)return;e.preventDefault();pasteText(x)});
}
