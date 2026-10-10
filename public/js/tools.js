// The VAT, Fuel and Energy tools: their fields, saved values, calculations and keypad input.
// (Their charts and the fuel log are in charts.js.)
// Tools remember what was typed in them (per tool, kept across mode switches and visits); AC clears a tool.
const TOOLS_KEY='uc-tools';
let unitPick={};// last chosen from/to units per unit category
function saveTools(){
 const cat=$('#unitCategory')?.value,from=$('#unitFrom')?.value,to=$('#unitTo')?.value;
 if(cat&&units[cat]&&units[cat][from]!==undefined&&units[cat][to]!==undefined)unitPick[cat]={from,to};
 store.set(TOOLS_KEY,JSON.stringify({inputs:{fuel:toolState.fuel.inputs,energy:toolState.energy.inputs,vat:toolState.vat.inputs},vatAction,units:{category:window._unitCategory||'length',pick:unitPick,expr:unitExpressions,source:unitSource}}));
}
function loadTools(){
 try{
  const s=JSON.parse(store.get(TOOLS_KEY)||'null');if(!s||typeof s!=='object')return;
  const numeric=v=>typeof v==='string'&&/^-?[0-9.,]*$/.test(v);
  for(const k of ['fuel','energy','vat']){const inp=s.inputs?.[k];if(!inp||typeof inp!=='object')continue;const clean={};TOOL_LABEL_KEYS[k].forEach(id=>{if(numeric(inp[id]))clean[id]=inp[id]});toolState[k].inputs=clean}
  if(s.vatAction==='add'||s.vatAction==='remove')vatAction=s.vatAction;
  const u=s.units;if(!u||typeof u!=='object')return;
  if(units[u.category])window._unitCategory=u.category;
  if(u.pick&&typeof u.pick==='object')Object.entries(u.pick).forEach(([c,p])=>{if(units[c]&&units[c][p?.from]!==undefined&&units[c][p?.to]!==undefined)unitPick[c]={from:p.from,to:p.to}});
  const expr=v=>typeof v==='string'&&v.length<200&&/^[-0-9.,+*/%]*$/.test(v);
  if(expr(u.expr?.from)&&expr(u.expr?.to))unitExpressions={from:u.expr.from,to:u.expr.to};
  if(u.source==='from'||u.source==='to')unitSource=unitActiveInput=u.source;
 }catch{}
}

const TOOL_LABEL_KEYS={fuel:['fuelD','fuelC','fuelP'],energy:['energyP','energyH','energyD','energyR'],vat:['amount','vatRate']};
function renderToolDisplay(){
 const d=$('#calculatorDisplay');
 d.classList.add('tool-display');
 d.classList.remove('calculated');
 $('#expression').textContent=toolResult?.detail??'';
 $('#howButton').classList.toggle('hidden',!toolResult?.how);
 $('#chartButton')?.classList.toggle('hidden',!toolChartAvailable());
 $('#chartButton')?.setAttribute('aria-label',t('chart'));
 syncFuelButtons();
 $('#result').textContent=toolResult?.main||'0';
 $('#result').classList.toggle('long-value',String(toolResult?.main??'').length>18);
 d.classList.toggle('tool-empty',!toolResult);
}
const FIELD_EXAMPLES={fuelD:'250',fuelC:'7,2',fuelP:'1,85',energyP:'100',energyH:'8',energyD:'30',energyR:'0,20',amount:'100',vatRate:'24%',value:'10'};
let vatAction='add';
const liveToolNumber=id=>{const raw=normalizeNumericInput($('#'+id)?.value??'');if(raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null};
// On phones the fields are filled only from the app's own keypad, so the native keyboard never opens.
const field=(id,label)=>{const value=toolState[mode]?.inputs?.[id]??'';const touch=isMobileDevice();return '<label class="tool-field"><span>'+esc(label)+'</span><input id="'+id+'" type="text" inputmode="'+(touch?'none':'decimal')+'"'+(touch?' readonly':'')+' autocomplete="off" spellcheck="false" value="'+esc(value)+'" placeholder="'+esc(String(FIELD_EXAMPLES[id]??''))+'" data-tool-input="true"></label>'};
function setActiveToolInput(input){toolActiveInput=input||null;$$('#toolPanel input[data-tool-input]').forEach(i=>i.classList.toggle('tool-active',i===toolActiveInput))}
function setToolResult(main,detail='',how=null){toolResult={main,detail,how};if(toolState[mode])toolState[mode].result=toolResult;howData=how;renderToolDisplay();}
function renderVatToggle(){
 $$('#toolPanel [data-vat-mode]').forEach(b=>{const on=b.dataset.vatMode===vatAction;b.classList.toggle('active',on);b.setAttribute('aria-checked',String(on))});
 const tg=$('#toolPanel .vat-toggle');if(tg)tg.dataset.active=vatAction;
}
function setVatAction(next){if(next!=='add'&&next!=='remove')return;vatAction=next;renderVatToggle();window._runVat?.(vatAction==='add');saveTools()}
// Add/Remove VAT works like an iOS segmented control: tap a side, drag the thumb, or swipe left/right.
function setupVatSlide(){
 const panel=$('#toolPanel');let drag=null,suppressClick=false;
 const thumbRange=tg=>{const b=tg.querySelector('[data-vat-mode="remove"]'),a=tg.querySelector('[data-vat-mode="add"]');return b.offsetLeft-a.offsetLeft};
 panel.addEventListener('pointerdown',e=>{
   const tg=e.target.closest('.vat-toggle');if(!tg||e.button>0)return;
   const range=thumbRange(tg);
   drag={tg,id:e.pointerId,x0:e.clientX/(window.__uiZoom||1),lastX:e.clientX/(window.__uiZoom||1),lastT:performance.now(),v:0,range,start:vatAction==='remove'?range:0,moved:false};
   // Capture only once a drag starts: capturing on pointerdown sends the click to the toggle instead of the button, so a plain click did nothing.
 });
 panel.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const cx=e.clientX/(window.__uiZoom||1),dx=cx-drag.x0;
   if(!drag.moved&&Math.abs(dx)<6)return;
   if(!drag.moved)drag.tg.setPointerCapture?.(e.pointerId);
   drag.moved=true;drag.tg.classList.add('sliding');
   const now=performance.now();drag.v=(cx-drag.lastX)/Math.max(1,now-drag.lastT);drag.lastX=cx;drag.lastT=now;
   const pos=Math.max(0,Math.min(drag.range,drag.start+dx));
   drag.tg.style.setProperty('--vat-thumb-x',pos+'px');
   e.preventDefault();
 });
 const finish=e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const d=drag;drag=null;d.tg.classList.remove('sliding');
   if(!d.moved)return; // a plain tap: the click handler picks the side
   // Use the last tracked position: pointerup coordinates are not reliable on every touch device.
   const pos=Math.max(0,Math.min(d.range,d.start+(d.lastX-d.x0)));
   const recent=performance.now()-d.lastT<100;
   const dx=d.lastX-d.x0;
   // A quick flick or a clear swipe (>30px) picks that direction; otherwise the side the thumb is closer to.
   const next=recent&&Math.abs(d.v)>0.5?(d.v>0?'remove':'add'):Math.abs(dx)>30?(dx>0?'remove':'add'):(pos>d.range/2?'remove':'add');
   d.tg.style.removeProperty('--vat-thumb-x');
   suppressClick=true;setTimeout(()=>{suppressClick=false},0);
   setVatAction(next);
 };
 panel.addEventListener('pointerup',finish);
 panel.addEventListener('pointercancel',finish);
 panel.addEventListener('click',e=>{if(suppressClick&&e.target.closest('.vat-toggle')){e.stopImmediatePropagation();e.preventDefault()}},true);
 panel.addEventListener('keydown',e=>{
   if(!e.target.closest('.vat-toggle'))return;
   if(e.key==='ArrowLeft'){e.preventDefault();setVatAction('add');panel.querySelector('[data-vat-mode="add"]')?.focus()}
   if(e.key==='ArrowRight'){e.preventDefault();setVatAction('remove');panel.querySelector('[data-vat-mode="remove"]')?.focus()}
 });
}
// VAT the way invoices do it: the VAT amount is rounded to cents and the total is net + VAT, so the numbers always add up.
// Exact fractions, so no floating-point rounding surprises. Used by the VAT tool and its chart. null if a field is empty.
function vatNumbers(add=vatAction==='add'){
 const ra=normalizeNumericInput($('#amount')?.value??''),rr=normalizeNumericInput($('#vatRate')?.value??'');
 if(!/^-?\d*\.?\d+$/.test(ra)&&!/^-?\d+\.?$/.test(ra))return null;
 if(!/^-?\d*\.?\d+$/.test(rr)&&!/^-?\d+\.?$/.test(rr))return null;
 const A=ratFromString(ra.replace(/\.$/,'')),R=ratFromString(rr.replace(/\.$/,'')),hundred=ratFromString('100');
 const factor=ratAdd(rat(1n),ratDiv(R,hundred));if(factor.n===0n)return null;
 const cents=x=>ratFromString(ratToRoundedDecimal(x,2));
 let net,tax,total;
 if(add){net=A;tax=cents(ratDiv(ratMul(A,R),hundred));total=ratAdd(net,tax)}
 else{total=A;net=cents(ratDiv(A,factor));tax=ratSub(total,net)}
 const n=ratToNumber;
 return{amount:n(A),rate:n(R),net:n(net),tax:n(tax),total:n(total)};
}
function bindTools(){
 // Money is shown in cents; litres, kWh and per-km prices with a few decimals.
 const L=v=>new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:2}).format(v),kWh=v=>new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:3}).format(v),perKm=v=>new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:3}).format(v);
 const fuelCalculate=()=>{
  const d=liveToolNumber('fuelD'),c=liveToolNumber('fuelC'),p=liveToolNumber('fuelP');
  if(d===null||c===null||p===null||d===0){setToolResult('','',null);return}
  const used=d*c/100,cost=used*p;
  const how={formula:fmt(d)+' km × '+fmt(c)+' L/100 km × '+fmt(p)+' €/L',steps:[
   {title:lang==='el'?'Υπολόγισε τα λίτρα':'Calculate fuel used',text:fmt(d)+' × '+fmt(c)+' ÷ 100 = '+L(used)+' L'},
   {title:lang==='el'?'Υπολόγισε το κόστος':'Calculate cost',text:L(used)+' L × '+fmt(p)+' €/L = '+money(cost)},
   {title:lang==='el'?'Κόστος ανά km':'Cost per km',text:money(cost)+' ÷ '+fmt(d)+' km = '+perKm(cost/d)+' €/km'}],result:money(cost)};
  setToolResult(money(cost),t('fuelResult')+': '+L(used)+' L · '+t('costKm')+': '+perKm(cost/d)+' €/km',how)
 };
 window._runFuel=fuelCalculate;
 const energyCalculate=()=>{
  const p=liveToolNumber('energyP'),hh=liveToolNumber('energyH'),d=liveToolNumber('energyD'),r=liveToolNumber('energyR');
  if([p,hh,d,r].some(x=>x===null)){setToolResult('','',null);return}
  const kwh=p/1000*hh*d,cost=kwh*r;
  const how={formula:fmt(p)+' W ÷ 1000 × '+fmt(hh)+(lang==='el'?' ώρες/ημέρα × ':' h/day × ')+fmt(d)+(lang==='el'?' ημέρες':' days'),steps:[
   {title:lang==='el'?'Μετέτρεψε W σε kW':'Convert W to kW',text:fmt(p)+' W ÷ 1000 = '+fmt(p/1000)+' kW'},
   {title:lang==='el'?'Υπολόγισε την ενέργεια':'Calculate energy',text:fmt(p/1000)+' kW × '+fmt(hh)+' × '+fmt(d)+' = '+kWh(kwh)+' kWh'},
   {title:lang==='el'?'Υπολόγισε το κόστος':'Calculate cost',text:kWh(kwh)+' kWh × '+fmt(r)+' €/kWh = '+money(cost)}],result:money(cost)};
  setToolResult(money(cost),t('energyResult')+': '+kWh(kwh)+' kWh',how)
 };
 window._runEnergy=energyCalculate;
 const vat=add=>{
  const v=vatNumbers(add);
  if(!v){setToolResult('','',null);return}
  const {amount:aa,rate:r,net,tax,total}=v;
  const vatWord=lang==='el'?'ΦΠΑ':'VAT';
  const how={formula:add?money(aa)+' + '+fmt(r)+'% '+vatWord:money(aa)+(lang==='el'?' με ':' with ')+fmt(r)+'% '+vatWord,steps:add?[
   {title:lang==='el'?'Υπολόγισε τον ΦΠΑ':'Calculate VAT',text:fmt(aa)+' × '+fmt(r)+' ÷ 100 = '+money(tax)},
   {title:lang==='el'?'Πρόσθεσε τον ΦΠΑ':'Add VAT',text:money(aa)+' + '+money(tax)+' = '+money(total)}]:[
   {title:lang==='el'?'Αφαίρεσε τον ΦΠΑ':'Remove VAT',text:fmt(aa)+' ÷ (1 + '+fmt(r)+' ÷ 100) = '+money(net)},
   {title:lang==='el'?'Ποσό ΦΠΑ':'VAT amount',text:money(aa)+' − '+money(net)+' = '+money(Math.abs(tax))}],result:money(add?total:net)};
  setToolResult(money(add?total:net),t('vatAmount')+': '+money(Math.abs(tax)),how)
 };
 window._runVat=vat;
 populateUnits();
}
function renderToolKeypad(){
 $('#keypad').className='tool-keypad';
 $('#keypad').innerHTML=
   '<button class="tool-key tool-utility" data-action="backspace" type="button" aria-label="'+esc(t('deleteKey'))+'">⌫</button><button class="tool-key tool-utility" data-action="clear-all" type="button">AC</button><button class="tool-key tool-utility" data-action="clear" type="button">C</button>'+
   '<button class="tool-key" data-value="7" type="button">7</button><button class="tool-key" data-value="8" type="button">8</button><button class="tool-key" data-value="9" type="button">9</button>'+
   '<button class="tool-key" data-value="4" type="button">4</button><button class="tool-key" data-value="5" type="button">5</button><button class="tool-key" data-value="6" type="button">6</button>'+
   '<button class="tool-key" data-value="1" type="button">1</button><button class="tool-key" data-value="2" type="button">2</button><button class="tool-key" data-value="3" type="button">3</button>'+
   '<button class="tool-key tool-key-wide" data-value="0" type="button">0</button><button class="tool-key" data-value="," type="button">,</button>';
}
function clearToolFields(){
 if(mode==='units'){
   unitExpressions={from:'0',to:'0'};unitSourceTyped=false;
   unitSource=unitActiveInput==='to'?'to':'from';
   unitReplaceOnNextKey=true;
   updateUnitsDisplay();
   return;
 }
 if(!toolState[mode])return;
 // AC starts the tool over: every field empty, except the VAT rate, which goes back to its default.
 toolState[mode].inputs=mode==='vat'?{vatRate:'24'}:{};
 $$('#toolPanel input[data-tool-input]').forEach(input=>input.value=toolState[mode].inputs[input.id]??'');
 setActiveToolInput($('#toolPanel input[data-tool-input]'));
 toolResult=null;
 howData=null;
 saveTools();
 if(mode==='vat')runActiveTool();else renderToolDisplay();
}
function toolKeyInput(key){
 if(mode==='units')return unitKeyInput(key);
 const input=toolActiveInput&&toolActiveInput.matches('#toolPanel input')?toolActiveInput:$('#toolPanel input');
 if(!input)return false;
 if(!isMobileDevice())input.focus();
 setActiveToolInput(input);
 let value=input.value;
 if(key==='clear')value='';
 else if(key==='backspace')value=value.slice(0,-1);
 else if(key==='.'||key===','){if(!/[.,]/.test(value))value+=(value===''||value==='-')?'0,':','}
 else if(key==='-')value=value.startsWith('-')?value.slice(1):'-'+value;
 else if(/^\d$/.test(key))value=value==='0'?key:value+key;
 else return false;
 input.value=value;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 return true;
}
function runActiveTool(){
 if(mode==='fuel'){window._runFuel?.();return}
 if(mode==='energy'){window._runEnergy?.();return}
 if(mode==='vat'){window._runVat?.(vatAction==='add');return}
 if(mode==='units'){window._runUnits?.();return}
}

// Typing into the tool fields (the keypad goes through toolKeyInput)
$('#toolPanel').addEventListener('click',e=>{
 const button=e.target.closest('[data-vat-mode]');
 if(!button)return;
 setVatAction(button.dataset.vatMode==='remove'?'remove':'add');
});
$('#toolPanel').addEventListener('focusin',e=>{if(e.target.matches('input'))setActiveToolInput(e.target)});
$('#toolPanel').addEventListener('click',e=>{const input=e.target.closest('.tool-field')?.querySelector('input');if(input)setActiveToolInput(input)});
$('#toolPanel').addEventListener('beforeinput',e=>{
 if(!e.target.matches('input')||e.inputType?.startsWith('delete'))return;
 if(e.data&&!/^[0-9.,-]+$/.test(e.data))e.preventDefault();
});
$('#toolPanel').addEventListener('keydown',e=>{
 if(!e.target.matches('input'))return;
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(!/^[0-9.,-]$/.test(e.key)&&!['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab','Enter','Escape'].includes(e.key))e.preventDefault();
});
$('#toolPanel').addEventListener('input',e=>{
 if(!e.target.matches('input'))return;
 if(mode==='units')return;
 const input=e.target;
 const key=input.id;
 if(!key)return;
 let raw=input.value;
 if(/^0\d/.test(raw))raw=raw.replace(/^0+(?=\d)/,'');
 if(raw!==input.value)input.value=raw;
 toolState[mode]??={inputs:{},result:null};
 toolState[mode].inputs[key]=raw;
 saveTools();
 runActiveTool();
});
