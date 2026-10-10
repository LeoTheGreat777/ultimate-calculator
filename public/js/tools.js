// The VAT, Percent (discount, % change, tip), Fuel and Energy tools: their fields, saved values, calculations and keypad input.
// (Their charts and the fuel log are in charts.js.)
// What was typed in a tool is forgotten when the mode changes (resetModeInput in ui.js) and isn't kept across visits;
// only the choices are saved: VAT add/remove, Percent's kind, the unit category and units picked, the Units side.
const TOOLS_KEY='uc-tools';
let unitPick={};// last chosen from/to units per unit category
function saveTools(){
 const cat=$('#unitCategory')?.value,from=$('#unitFrom')?.value,to=$('#unitTo')?.value;
 if(cat&&units[cat]&&units[cat][from]!==undefined&&units[cat][to]!==undefined)unitPick[cat]={from,to};
 store.set(TOOLS_KEY,JSON.stringify({vatAction,pctAction,units:{category:window._unitCategory||'length',pick:unitPick,source:unitSource}}));
}
function loadTools(){
 try{
  const s=JSON.parse(store.get(TOOLS_KEY)||'null');if(!s||typeof s!=='object')return;
  if(TOGGLES.vat.options.includes(s.vatAction))vatAction=s.vatAction;
  if(TOGGLES.pct.options.includes(s.pctAction))pctAction=s.pctAction;
  const u=s.units;if(!u||typeof u!=='object')return;
  if(units[u.category])window._unitCategory=u.category;
  if(u.pick&&typeof u.pick==='object')Object.entries(u.pick).forEach(([c,p])=>{if(units[c]&&units[c][p?.from]!==undefined&&units[c][p?.to]!==undefined)unitPick[c]={from:p.from,to:p.to}});
  if(u.source==='from'||u.source==='to')unitSource=unitActiveInput=u.source;
 }catch{}
}

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
 fitDisplayText($('#result'),24);
}
const FIELD_EXAMPLES={fuelD:'250',fuelC:'7,2',fuelP:'1,85',energyP:'100',energyH:'8',energyD:'30',energyR:'0,20',amount:'100',vatRate:'24%',pctPrice:'80',pctOff:'25%',pctFrom:'80',pctTo:'100',tipBill:'60',tipRate:'10%',tipPeople:'3',value:'10'};
let vatAction='add';
const liveToolNumber=id=>{const raw=normalizeNumericInput($('#'+id)?.value??'');if(raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null};
// On phones the fields are filled only from the app's own keypad, so the native keyboard never opens.
const field=(id,label)=>{const value=toolState[mode]?.inputs?.[id]??'';const touch=isMobileDevice();return '<label class="tool-field"><span>'+esc(label)+'</span><input id="'+id+'" type="text" inputmode="'+(touch?'none':'decimal')+'"'+(touch?' readonly':'')+' autocomplete="off" spellcheck="false" value="'+esc(value)+'" placeholder="'+esc(String(FIELD_EXAMPLES[id]??''))+'" data-tool-input="true"></label>'};
function setActiveToolInput(input){toolActiveInput=input||null;$$('#toolPanel input[data-tool-input]').forEach(i=>i.classList.toggle('tool-active',i===toolActiveInput))}
function setToolResult(main,detail='',how=null){toolResult={main,detail,how};if(toolState[mode])toolState[mode].result=toolResult;howData=how;renderToolDisplay();}
// Percent has three kinds, each with its own fields; tip has defaults like the VAT rate. People is a whole number.
let pctAction='discount';
const PCT_FIELDS={discount:['pctPrice','pctOff'],change:['pctFrom','pctTo'],tip:['tipBill','tipRate','tipPeople']};
const TOOL_DEFAULTS={vat:{vatRate:'24'},pct:{tipRate:'10',tipPeople:'1'}};
const WHOLE_NUMBER_FIELDS=new Set(['tipPeople']);
function fillToolDefaults(m){const d=TOOL_DEFAULTS[m];if(d&&toolState[m])Object.entries(d).forEach(([id,v])=>{if(!toolState[m].inputs[id])toolState[m].inputs[id]=v})}
// Segmented switches (VAT add/remove, Percent discount/change/tip) work like iOS: tap a side, drag the thumb, or swipe.
const TOGGLES={vat:{options:['add','remove'],labels:['addVat','removeVat'],get:()=>vatAction,set:v=>setVatAction(v)},
 pct:{options:['discount','change','tip'],labels:['pctDiscount','pctChange','pctTip'],get:()=>pctAction,set:v=>setPctAction(v)}};
function toggleHtml(name,top){
 const c=TOGGLES[name];
 return '<div class="seg-toggle'+(top?' seg-top':'')+'" role="radiogroup" data-toggle="'+name+'" style="--n:'+c.options.length+'"><span class="seg-thumb" aria-hidden="true"></span>'+c.options.map((v,i)=>'<button type="button" role="radio" data-choice="'+v+'">'+esc(t(c.labels[i]))+'</button>').join('')+'</div>';
}
function renderToggles(){
 $$('#toolPanel .seg-toggle').forEach(tg=>{
  const c=TOGGLES[tg.dataset.toggle];if(!c)return;const cur=c.get();
  tg.style.setProperty('--i',String(Math.max(0,c.options.indexOf(cur))));tg.dataset.active=cur;
  tg.querySelectorAll('[data-choice]').forEach(b=>{const on=b.dataset.choice===cur;b.classList.toggle('active',on);b.setAttribute('aria-checked',String(on))});
 });
}
function setVatAction(next){if(!TOGGLES.vat.options.includes(next))return;vatAction=next;renderToggles();window._runVat?.(vatAction==='add');saveTools()}
function setPctAction(next){
 if(!TOGGLES.pct.options.includes(next)||next===pctAction)return;
 // like changing mode: the kind you leave starts over
 PCT_FIELDS[pctAction].forEach(id=>delete toolState.pct.inputs[id]);
 pctAction=next;renderToggles();renderPctFields();window._runPct?.();saveTools();
}
// Only the fields change, so the switch keeps its slide animation.
function pctFieldsHtml(){return PCT_FIELDS[pctAction].map(id=>field(id,t(id))).join('')}
function renderPctFields(){
 const grid=$('#toolPanel .tool-grid');if(!grid||mode!=='pct')return;
 grid.innerHTML=pctFieldsHtml();grid.classList.toggle('cols-3',PCT_FIELDS[pctAction].length===3);
 $$('#toolPanel input[data-tool-input]').forEach(i=>fitDisplayText(i,12));
 setActiveToolInput($('#toolPanel input[data-tool-input]'));
 fitLayout();
}
function setupToggleSlide(){
 const panel=$('#toolPanel');let drag=null,suppressClick=false;
 const Z=()=>window.__uiZoom||1;
 const stepOf=tg=>{const b=tg.querySelectorAll('[data-choice]');return b.length>1?b[1].offsetLeft-b[0].offsetLeft:0};
 panel.addEventListener('pointerdown',e=>{
   const tg=e.target.closest('.seg-toggle');if(!tg||e.button>0)return;
   const c=TOGGLES[tg.dataset.toggle];if(!c)return;
   const step=stepOf(tg),index=Math.max(0,c.options.indexOf(c.get()));
   drag={tg,c,id:e.pointerId,x0:e.clientX/Z(),lastX:e.clientX/Z(),lastT:performance.now(),v:0,step,range:step*(c.options.length-1),index,start:step*index,moved:false};
   // Capture only once a drag starts: capturing on pointerdown sends the click to the toggle instead of the button, so a plain click did nothing.
 });
 panel.addEventListener('pointermove',e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const cx=e.clientX/Z(),dx=cx-drag.x0;
   if(!drag.moved&&Math.abs(dx)<6)return;
   if(!drag.moved)drag.tg.setPointerCapture?.(e.pointerId);
   drag.moved=true;drag.tg.classList.add('sliding');
   const now=performance.now();drag.v=(cx-drag.lastX)/Math.max(1,now-drag.lastT);drag.lastX=cx;drag.lastT=now;
   const pos=Math.max(0,Math.min(drag.range,drag.start+dx));
   drag.tg.style.setProperty('--seg-x',pos+'px');
   e.preventDefault();
 });
 const finish=e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const d=drag;drag=null;d.tg.classList.remove('sliding');
   if(!d.moved||!d.step)return; // a plain tap: the click handler picks the side
   // Use the last tracked position: pointerup coordinates are not reliable on every touch device.
   const dx=d.lastX-d.x0,pos=Math.max(0,Math.min(d.range,d.start+dx)),recent=performance.now()-d.lastT<100;
   // A quick flick or a clear swipe (>30px) moves at least one place that way; otherwise the place the thumb is closest to.
   let i=Math.round(pos/d.step);
   if(recent&&Math.abs(d.v)>0.5)i=d.v>0?Math.max(i,d.index+1):Math.min(i,d.index-1);
   else if(Math.abs(dx)>30&&i===d.index)i=d.index+Math.sign(dx);
   i=Math.max(0,Math.min(d.c.options.length-1,i));
   d.tg.style.removeProperty('--seg-x');
   suppressClick=true;setTimeout(()=>{suppressClick=false},0);
   d.c.set(d.c.options[i]);renderToggles();
 };
 panel.addEventListener('pointerup',finish);
 panel.addEventListener('pointercancel',finish);
 panel.addEventListener('click',e=>{if(suppressClick&&e.target.closest('.seg-toggle')){e.stopImmediatePropagation();e.preventDefault()}},true);
 panel.addEventListener('keydown',e=>{
   const tg=e.target.closest('.seg-toggle');if(!tg||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'))return;
   const c=TOGGLES[tg.dataset.toggle];if(!c)return;e.preventDefault();
   const i=Math.max(0,Math.min(c.options.length-1,c.options.indexOf(c.get())+(e.key==='ArrowRight'?1:-1)));
   c.set(c.options[i]);tg.querySelector('[data-choice="'+c.options[i]+'"]')?.focus();
 });
}
// A field as an exact fraction (null if empty or not a number yet).
function ratField(id){
 const r=normalizeNumericInput($('#'+id)?.value??'');
 if(!/^-?\d*\.?\d+$/.test(r)&&!/^-?\d+\.?$/.test(r))return null;
 return ratFromString(r.replace(/\.$/,''));
}
const ratCents=x=>ratFromString(ratToRoundedDecimal(x,2));
// Rounded up to the cent, so the shares always cover the bill.
const ratCentsUp=x=>{const n=x.n*100n;let q=n/x.d;if(n%x.d!==0n&&n>0n)q++;return rat(q,100n)};
// VAT the way invoices do it: the VAT amount is rounded to cents and the total is net + VAT, so the numbers always add up.
// Exact fractions, so no floating-point rounding surprises. Used by the VAT tool and its chart. null if a field is empty.
function vatNumbers(add=vatAction==='add'){
 const A=ratField('amount'),R=ratField('vatRate'),hundred=rat(100n);
 if(!A||!R)return null;
 const factor=ratAdd(rat(1n),ratDiv(R,hundred));if(factor.n===0n)return null;
 const cents=ratCents;
 let net,tax,total;
 if(add){net=A;tax=cents(ratDiv(ratMul(A,R),hundred));total=ratAdd(net,tax)}
 else{total=A;net=cents(ratDiv(A,factor));tax=ratSub(total,net)}
 const n=ratToNumber;
 return{amount:n(A),rate:n(R),net:n(net),tax:n(tax),total:n(total)};
}
function bindTools(){
 // Money is shown in cents; litres, kWh and per-km prices with a few decimals.
 // (from 10¹⁵ up, the power-of-ten form, as in the calculator)
 const num=d=>v=>Math.abs(v)>=1e15||!Number.isFinite(v)?numScientific(v):new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:d}).format(v);
 const L=num(2),kWh=num(3),perKm=num(3);
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
 // Percent: discount, % change and tip, in exact fractions; money is rounded to cents as in VAT.
 const pct2=num(2),signed=(s,v)=>(v>0?'+':'')+s;
 const pct=()=>{
  const H=rat(100n),n=ratToNumber,el=lang==='el';
  if(pctAction==='discount'){
   const P=ratField('pctPrice'),D=ratField('pctOff');
   if(!P||!D){setToolResult('','',null);return}
   const off=ratCents(ratDiv(ratMul(P,D),H)),final=ratSub(P,off);
   const how={formula:money(n(P))+' − '+fmt(D)+'%',steps:[
    {title:el?'Υπολόγισε την έκπτωση':'Calculate the discount',text:fmt(P)+' × '+fmt(D)+' ÷ 100 = '+money(n(off))},
    {title:el?'Αφαίρεσέ την από την τιμή':'Take it off the price',text:money(n(P))+' − '+money(n(off))+' = '+money(n(final))}],result:money(n(final))};
   setToolResult(money(n(final)),t('youSave')+': '+money(n(off)),how);return;
  }
  if(pctAction==='change'){
   const A=ratField('pctFrom'),B=ratField('pctTo');
   if(!A||!B||A.n===0n){setToolResult('','',null);return}
   const diff=ratSub(B,A),change=n(ratDiv(ratMul(diff,H),A.n<0n?rat(-A.n,A.d):A)),shown=signed(pct2(change),change)+'%';
   const how={formula:'('+fmt(B)+' − '+fmt(A)+') ÷ '+fmt(A)+' × 100',steps:[
    {title:el?'Η διαφορά':'The difference',text:fmt(B)+' − '+fmt(A)+' = '+fmt(diff)},
    {title:el?'Σε ποσοστό του αρχικού':'As a percentage of the first',text:fmt(diff)+' ÷ '+fmt(A)+' × 100 = '+shown}],result:shown};
   setToolResult(shown,t('difference')+': '+signed(fmt(diff),diff.n>0n?1:0),how);return;
  }
  const B=ratField('tipBill'),R=ratField('tipRate'),N=ratField('tipPeople');
  if(!B||!R||!N||N.d!==1n||N.n<1n){setToolResult('','',null);return}
  const tip=ratCents(ratDiv(ratMul(B,R),H)),total=ratAdd(B,tip),people=Number(N.n),each=people>1?ratCentsUp(ratDiv(total,N)):total;
  const steps=[
   {title:el?'Υπολόγισε το φιλοδώρημα':'Calculate the tip',text:fmt(B)+' × '+fmt(R)+' ÷ 100 = '+money(n(tip))},
   {title:el?'Πρόσθεσέ το στον λογαριασμό':'Add it to the bill',text:money(n(B))+' + '+money(n(tip))+' = '+money(n(total))}];
  if(people>1)steps.push({title:el?'Μοίρασέ το':'Split it',text:money(n(total))+' ÷ '+people+' = '+money(n(each))+(ratSub(ratMul(each,N),total).n!==0n?(el?' (στρογγυλεμένο προς τα πάνω, για να καλυφθεί ο λογαριασμός)':' (rounded up, so the bill is covered)'):'')});
  const how={formula:money(n(B))+' + '+fmt(R)+'%'+(people>1?' ÷ '+people:''),steps,result:money(n(each))};
  // Split: each person's share, with the total and the tip in it kept short so it fits one line on a phone.
  const detail=people>1?t('perPerson')+' · '+t('tipTotal')+': '+money(n(total))+' (+'+money(n(tip))+')':t('tipAmount')+': '+money(n(tip));
  setToolResult(money(n(each)),detail,how);
 };
 window._runPct=pct;
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
   unitError='';unitExpressions={from:'0',to:'0'};unitSourceTyped=false;
   unitSource=unitActiveInput==='to'?'to':'from';
   unitReplaceOnNextKey=true;
   updateUnitsDisplay();
   return;
 }
 if(!toolState[mode])return;
 // AC starts the tool over: every field empty, except the VAT rate and the tip's rate and people, which go back to their defaults.
 // In Percent only the fields of the kind on screen are cleared.
 if(mode==='pct'){const inp=toolState.pct.inputs;PCT_FIELDS[pctAction].forEach(id=>delete inp[id])}else toolState[mode].inputs={};
 fillToolDefaults(mode);
 $$('#toolPanel input[data-tool-input]').forEach(input=>input.value=toolState[mode].inputs[input.id]??'');
 setActiveToolInput($('#toolPanel input[data-tool-input]'));
 toolResult=null;
 howData=null;
 saveTools();
 if(TOOL_DEFAULTS[mode])runActiveTool();else renderToolDisplay();
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
 else if(WHOLE_NUMBER_FIELDS.has(input.id)&&(key==='.'||key===','||key==='-')){refuseKey(input);return false}
 else if(key==='.'||key===','){if(!/[.,]/.test(value))value+=(value===''||value==='-')?'0,':','}
 else if(key==='-')value=value.startsWith('-')?value.slice(1):'-'+value;
 else if(/^\d$/.test(key)){if(value!=='0'&&digitCount(value)>=MAX_DIGITS){refuseKey(input);return false}value=value==='0'?key:value+key}// 15 digits, as everywhere
 else return false;
 input.value=value;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 return true;
}
function runActiveTool(){
 if(mode==='fuel'){window._runFuel?.();return}
 if(mode==='energy'){window._runEnergy?.();return}
 if(mode==='vat'){window._runVat?.(vatAction==='add');return}
 if(mode==='pct'){window._runPct?.();return}
 if(mode==='units'){window._runUnits?.();return}
}

// Typing into the tool fields (the keypad goes through toolKeyInput)
$('#toolPanel').addEventListener('click',e=>{
 const button=e.target.closest('[data-choice]'),c=TOGGLES[button?.closest('.seg-toggle')?.dataset.toggle];
 if(button&&c)c.set(button.dataset.choice);
});
$('#toolPanel').addEventListener('focusin',e=>{if(e.target.matches('input'))setActiveToolInput(e.target)});
$('#toolPanel').addEventListener('click',e=>{const input=e.target.closest('.tool-field')?.querySelector('input');if(input)setActiveToolInput(input)});
$('#toolPanel').addEventListener('beforeinput',e=>{
 if(!e.target.matches('input')||e.inputType?.startsWith('delete'))return;
 if(e.data&&!(WHOLE_NUMBER_FIELDS.has(e.target.id)?/^[0-9]+$/:/^[0-9.,-]+$/).test(e.data))e.preventDefault();
});
$('#toolPanel').addEventListener('keydown',e=>{
 if(!e.target.matches('input'))return;
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(WHOLE_NUMBER_FIELDS.has(e.target.id)&&/^[.,-]$/.test(e.key)){e.preventDefault();refuseKey(e.target);return}
 // − changes the sign, as on the keypad (typed into the middle it would make the number unreadable)
 if(e.key==='-'){e.preventDefault();setActiveToolInput(e.target);toolKeyInput('-');return}
 if(!/^[0-9.,-]$/.test(e.key)&&!['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab','Enter','Escape'].includes(e.key))e.preventDefault();
});
$('#toolPanel').addEventListener('input',e=>{
 if(!e.target.matches('input'))return;
 if(mode==='units')return;
 const input=e.target;
 const key=input.id;
 if(!key)return;
 let raw=input.value;
 if(digitCount(raw)>MAX_DIGITS){input.value=toolState[mode]?.inputs?.[key]??'';refuseKey(input);return}// typed or pasted on a keyboard: 15 digits at most
 if(/^0\d/.test(raw))raw=raw.replace(/^0+(?=\d)/,'');
 if(raw!==input.value)input.value=raw;
 toolState[mode]??={inputs:{},result:null};
 toolState[mode].inputs[key]=raw;
 fitDisplayText(input,12,true);
 saveTools();
 runActiveTool();
});
