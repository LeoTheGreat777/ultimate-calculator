// Start-up: keypad and button wiring, the desktop keyboard, then the first render. Loaded last.
$('#keypad').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 // The keypad shows "," as the decimal key; every mode handles it as ".".
 if(mode==='graph'){graphKey(b.dataset.g);return}
 const a=b.dataset.action,v=b.dataset.value===','?'.':b.dataset.value;
 if(mode!=='calc'&&a==='clear-all'){clearToolFields();return;}
 if(mode!=='calc'){
   if(mode==='units'){
     if(a==='paren'){toolKeyInput('paren');return}
     if(a==='clear'||a==='backspace'||v==='.'||v==='%'||/^\d$/.test(v||'')||['+','-','*','/'].includes(v||'')){toolKeyInput(a==='clear'?'clearEntry':a==='backspace'?'backspace':v==='/'?'/':v);return}
     if(a==='equals')window._equalsUnits?.();
     return;
   }
   if(a==='clear'||a==='backspace'||v==='.'||/^\d$/.test(v||'')){toolKeyInput(a==='clear'?'clear':a==='backspace'?'backspace':v);return}
   if(v==='-'){toolKeyInput('-');return}
   return;
 }
 if(a==='clear')clearButtonAction();else if(a==='backspace')backspace();else if(a==='equals')equals();else if(a==='paren')smartParen();else if(v==='%')percent();else if(/[+\-*/]/.test(v||''))operator(v==='*'?'×':v==='/'?'÷':v);else if(v)digit(v)
});
$('#howButton').addEventListener('click',showHow);$('#closeHow').addEventListener('click',closeHow);$('#howModal').addEventListener('click',e=>{if(e.target.id==='howModal')closeHow()});
$('#historyButton').addEventListener('click',openHistory);$('#closeHistory').addEventListener('click',closeHistory);$('#historyBackdrop').addEventListener('click',closeHistory);$('#historyList').addEventListener('click',historyClick);$('#copyButton').addEventListener('click',copyResult);
// Tapping a result copies it too (on short screens the copy button is hidden to make room for the keypad).
$('#calculatorDisplay').addEventListener('click',e=>{if(mode==='units'||mode==='graph'||!e.target.closest('#result'))return;if(mode==='calc'?!justCalculated:!toolResult?.main)return;copyResult();const r=$('#result');r.classList.add('copied');setTimeout(()=>r.classList.remove('copied'),700)});
$('#langButton').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setLanguage(lang==='el'?'en':'el')});
$('#themeButton').addEventListener('click',toggleTheme);
$('#installButton')?.addEventListener('click',installApp);
$('#helpButton')?.addEventListener('click',showHelp);
setupHoldKeys();
 document.addEventListener('click',e=>{if(historyClearConfirm&&!e.target.closest('#historyClearWrap'))clearHistoryConfirm()});
$('#clearHistory').addEventListener('click',clearHistoryConfirm);$('#historyConfirmYes').addEventListener('click',deleteAllHistory);
window.addEventListener('keydown',e=>{
 // Alt+1…6 jumps to a mode (Alt+← / → are left alone: browsers use them for Back / Forward)
 if(e.altKey&&!e.ctrlKey&&!e.metaKey&&/^Digit[1-9]$/.test(e.code)){const n=MODE_LABELS[+e.code.slice(5)-1];if(n){e.preventDefault();switchMode(n)}return}
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 // An open (or focused) dropdown handles its own keys: arrows, Enter, typing to jump to an item.
 if(document.activeElement?.closest?.('select'))return;
 const nothingOpen=$('#howModal').classList.contains('hidden')&&$('#historyPanel').classList.contains('hidden');
 // ? opens Tips (not while typing in a field)
 if(e.key==='?'&&nothingOpen&&!document.activeElement?.matches('input,textarea')){e.preventDefault();showHelp();return}
 // F9 = ± (as in Windows Calculator)
 if(e.key==='F9'&&(mode==='calc'||mode==='units')){e.preventDefault();if(nothingOpen){if(mode==='calc')negate();else toolKeyInput('negate')}return}
 if(mode==='units'&&nothingOpen&&(e.key==='('||e.key===')')){e.preventDefault();toolKeyInput(e.key);return}
 if(mode==='calc'&&e.key.length===1&&!/^[0-9+\-*/%.,()=]$/.test(e.key)){e.preventDefault();e.stopImmediatePropagation();return}
 if(mode==='graph'&&e.key!=='Escape'){if($('#howModal').classList.contains('hidden')&&$('#historyPanel').classList.contains('hidden')&&graphKeydown(e))e.preventDefault();return}
 if(e.key==='Backspace'||e.code==='Backspace'){e.preventDefault();if(mode==='calc')backspace();else toolKeyInput('backspace');return;}
 if(e.key==='%'&&mode==='units'){e.preventDefault();toolKeyInput('%');return}
 if(e.key===','||e.key==='.'||e.key==='Decimal'){e.preventDefault();if(mode==='calc')digit('.');else if(document.activeElement?.matches('#toolPanel input')){const input=document.activeElement;const pos=input.selectionStart??input.value.length;input.setRangeText(',',pos,pos,'end');input.dispatchEvent(new Event('input',{bubbles:true}))}else toolKeyInput('.');return}
 if(mode==='calc'&&(e.key==='('||e.key===')')){e.preventDefault();parenthesis(e.key);return}
 // Delete = the C key: clears the number being typed (Esc clears everything)
 if(e.key==='Delete'&&nothingOpen&&(mode==='calc'||mode==='units')){e.preventDefault();if(mode==='calc')clearButtonAction();else toolKeyInput('clearEntry');return}
 if(e.key==='Escape'){
   if(!$('#howModal').classList.contains('hidden')){e.preventDefault();closeHow();return}
   if(!$('#historyPanel').classList.contains('hidden')){e.preventDefault();closeHistory();return}
   if(mode==='calc'){e.preventDefault();clearAll()}
   else if(mode==='units'&&!document.activeElement?.matches('select')){e.preventDefault();toolKeyInput('clear')}
   else if(mode==='graph'){e.preventDefault();graphKey('clear')}
   return;
 }
 if(mode==='units'&&!document.activeElement?.matches('select')){
   if(/^[0-9]$/.test(e.key)||['+','-','*','/'].includes(e.key)){e.preventDefault();toolKeyInput(e.key);return}
   if(e.key==='Enter'||e.key==='='){e.preventDefault();window._equalsUnits?.();return}
 }
 // In the tools, typing without clicking a field first goes to the highlighted field (Backspace and the decimal key already do).
 if(['fuel','energy','vat'].includes(mode)&&/^[0-9-]$/.test(e.key)&&!document.activeElement?.matches('input,select,textarea')&&$('#howModal').classList.contains('hidden')&&$('#historyPanel').classList.contains('hidden')){e.preventDefault();toolKeyInput(e.key);return}
 if(mode!=='calc')return;
 if(/^[0-9]$/.test(e.key))digit(e.key);
 else if(['+','-','*','/'].includes(e.key))operator(e.key==='*'?'×':e.key==='/'?'÷':e.key);
 else if(e.key==='%')percent();
 else if(e.key==='Enter'||e.key==='='){e.preventDefault();equals()}
 else if(e.key==='Backspace'){e.preventDefault();backspace()}
});
window.__UC_VERSION=VERSION;$('#footerVersion').textContent=`v${VERSION}`;loadTools();lang=readLanguage();bindTools();renderHistory();renderTool();renderModeTabs();syncModeTabs();setupHistorySheet();setupVatSlide();bindHistoryChart();$('#chartButton')?.addEventListener('click',showToolChart);applyLanguage();applyTheme();window.addEventListener('pageshow',e=>{if(e.persisted&&mode!=='calc')setMode('calc')});
setupHistoryGestures();
// The browser's own F-keys (help, search, full screen ...) stay out of the app's way; F9 is ± in the app.
document.addEventListener('keydown',e=>{if(/^F(?:[1-8]|1[0-2])$/.test(e.key))e.stopImmediatePropagation()},true);
