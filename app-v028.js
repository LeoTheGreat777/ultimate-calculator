const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const VERSION = '0.2.8';

let lang = localStorage.getItem('uc-lang') || 'el';
let mode = 'calc';
let expression = '';
let current = '0';
let hasCurrent = false;
let justCalculated = false;
let result = null;
let resultExpression = '';
let explanation = null;

const T = {
  el: {
    calc:'Υπολογισμός', fuel:'Καύσιμα', energy:'Ενέργεια', vat:'ΦΠΑ', units:'Μονάδες', how:'Πώς;', history:'Ιστορικό', copy:'Αντιγραφή αποτελέσματος', copied:'Αντιγράφηκε', clear:'Διαγραφή όλων', confirm:'Να διαγραφεί όλο το ιστορικό;', confirmYes:'Διαγραφή', cancel:'Ακύρωση', none:'Δεν υπάρχουν υπολογισμοί ακόμα.', hint:'Πληκτρολόγησε μια πράξη για να ξεκινήσεις.', delete:'Διαγραφή', created:'Δημιουργήθηκε από',
    fuelD:'Απόσταση (km)', fuelC:'Κατανάλωση (L/100 km)', fuelP:'Τιμή καυσίμου / L', fuelGo:'Υπολόγισε κόστος καυσίμων', fuelUsed:'Καύσιμο που χρησιμοποιήθηκε', costKm:'Κόστος ανά km',
    energyP:'Ισχύς (W)', energyH:'Ώρες / ημέρα', energyD:'Ημέρες', energyR:'Τιμή / kWh', energyGo:'Υπολόγισε κόστος ρεύματος', energyUsed:'Ενέργεια',
    amount:'Ποσό', vatRate:'ΦΠΑ %', addVat:'Πρόσθεσε ΦΠΑ', removeVat:'Αφαίρεσε ΦΠΑ', vatAmount:'Ποσό ΦΠΑ',
    value:'Τιμή', category:'Κατηγορία', from:'Από', to:'Σε', convert:'Μετατροπή', length:'Μήκος', mass:'Μάζα', volume:'Όγκος', data:'Δεδομένα',
    normal:'Η πράξη ακολουθεί τη συνηθισμένη σειρά μαθηματικών πράξεων.', percent:(p)=>`${p}% σημαίνει ${p} στα 100.`, of:(p)=>`${p}% του`, add:'Πρόσθεσέ το', sub:'Αφαίρεσέ το',
    lengthUnits:['mm','cm','m','km','in','ft','yd','mi'], massUnits:['mg','g','kg','oz','lb'], volumeUnits:['ml','l','tsp','tbsp','cup','gal'], dataUnits:['B','KB','MB','GB','TB']
  },
  en: {
    calc:'Calculator', fuel:'Fuel', energy:'Energy', vat:'VAT', units:'Units', how:'How?', history:'History', copy:'Copy result', copied:'Copied', clear:'Clear all', confirm:'Delete all calculation history?', confirmYes:'Delete', cancel:'Cancel', none:'No calculations yet.', hint:'Enter a calculation to get started.', delete:'Delete', created:'Created by',
    fuelD:'Distance (km)', fuelC:'Consumption (L/100 km)', fuelP:'Fuel price / L', fuelGo:'Calculate fuel cost', fuelUsed:'Fuel used', costKm:'Cost per km',
    energyP:'Power (W)', energyH:'Hours / day', energyD:'Days', energyR:'Price / kWh', energyGo:'Calculate electricity cost', energyUsed:'Energy',
    amount:'Amount', vatRate:'VAT %', addVat:'Add VAT', removeVat:'Remove VAT', vatAmount:'VAT amount',
    value:'Value', category:'Category', from:'From', to:'To', convert:'Convert', length:'Length', mass:'Mass', volume:'Volume', data:'Data',
    normal:'The calculation follows normal mathematical order of operations.', percent:(p)=>`${p}% means ${p} out of every 100.`, of:(p)=>`${p}% of`, add:'Add it', sub:'Subtract it',
    lengthUnits:['mm','cm','m','km','in','ft','yd','mi'], massUnits:['mg','g','kg','oz','lb'], volumeUnits:['ml','l','tsp','tbsp','cup','gal'], dataUnits:['B','KB','MB','GB','TB']
  }
};
const t = (k) => T[lang][k] ?? T.en[k] ?? k;
const fmt = (n) => Number.isFinite(Number(n)) ? new Intl.NumberFormat(lang === 'el' ? 'el-GR' : 'en-US', { maximumFractionDigits: 10 }).format(Math.abs(Number(n)) < 1e-12 ? 0 : Number(n)) : 'Error';
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const db = new Promise((resolve, reject) => {
  const req = indexedDB.open('ultimate-calculator', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('history', { keyPath:'id', autoIncrement:true });
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
async function historyAll(){const d=await db;return new Promise((res,rej)=>{const r=d.transaction('history').objectStore('history').getAll();r.onsuccess=()=>res(r.result.sort((a,b)=>b.time-a.time));r.onerror=()=>rej(r.error)})}
async function historyAdd(x){const d=await db;d.transaction('history','readwrite').objectStore('history').add({...x,time:Date.now()})}
async function historyDelete(id){const d=await db;d.transaction('history','readwrite').objectStore('history').delete(Number(id));}
async function historyClear(){const d=await db;await new Promise((res,rej)=>{const r=d.transaction('history','readwrite').objectStore('history').clear();r.onsuccess=res;r.onerror=()=>rej(r.error)});renderHistory()}

function setText(sel, value){const e=$(sel);if(e)e.textContent=value;}
function clearLabel(){ return hasCurrent && current !== '' && current !== '0' ? 'C' : 'AC'; }
function translate(){
  document.documentElement.lang=lang;
  setText('#langButton', lang==='el'?'ΕΛ':'EN');
  setText('#version','v'+VERSION); setText('#footerVersion','v'+VERSION);
  setText('#howButton',t('how')); setText('#historyButton',t('history')); setText('#copyButton',t('copy')); setText('#clearHistory',t('clear')); setText('#hint',t('hint'));
  $$('.tab').forEach(b=>b.textContent=t(b.dataset.mode));
  setText('#clearButton',clearLabel()); setText('#historyConfirmText',t('confirm')); setText('#historyConfirmYes',t('confirmYes')); setText('#historyConfirmCancel',t('cancel'));
  renderTool(); renderHistory(); renderDisplay();
}
function toggleLanguage(){lang=lang==='el'?'en':'el';localStorage.setItem('uc-lang',lang);translate();if(explanation&&!$('#howPanel').classList.contains('hidden'))showHow();}

function evaluate(s){
  const tokens=(s.replace(/,/g,'').match(/(?:\d*\.\d+|\d+\.?\d*|[+\-*/%()])/g)||[]).map(x=>['+','-','*','/','%','(',')'].includes(x)?x:Number(x));
  let i=0;
  function primary(){if(tokens[i]==='-'){i++;return-primary()}if(tokens[i]==='('){i++;const v=add();if(tokens[i++]!==')')throw Error();return v}let n=tokens[i++];if(typeof n!=='number')throw Error();if(tokens[i]==='%'){i++;n/=100}return n}
  function mul(){let v=primary();while(tokens[i]==='*'||tokens[i]==='/'){const o=tokens[i++],r=primary();if(o==='/'&&r===0)throw Error();v=o==='*'?v*r:v/r}return v}
  function add(){let v=mul();while(tokens[i]==='+'||tokens[i]==='-'){const o=tokens[i++],r=mul();v=o==='+'?v+r:v-r}return v}
  const v=add();if(i!==tokens.length||!Number.isFinite(v))throw Error();return v;
}
function makeHow(e,v){
  const m=e.match(/^(-?[\d.]+)\s*([+-])\s*(\d+(?:\.\d+)?)%$/);
  if(!m)return {summary:t('normal'),steps:[{title:lang==='el'?'Υπολογισμός':'Calculation',formula:e,result:fmt(v)}]};
  const base=+m[1],p=+m[3],amount=base*p/100;
  return {summary:t('percent')(p),steps:[{title:t('of')(p),formula:`${fmt(base)} × ${p/100}`,result:fmt(amount)},{title:m[2]==='+'?t('add'):t('sub'),formula:`${fmt(base)} ${m[2]} ${fmt(amount)}`,result:fmt(v)}]};
}

function renderDisplay(){
  const ex=$('#expression'), r=$('#result');
  if(justCalculated && result !== null){ ex.textContent=resultExpression+' ='; r.textContent=fmt(result); }
  else { ex.textContent=''; r.textContent=expression || current || '0'; }
  setText('#clearButton',clearLabel());
  $('#howButton').classList.toggle('hidden',!(justCalculated && explanation));
}
function resetHow(){result=null;resultExpression='';explanation=null;justCalculated=false;$('#howPanel').classList.add('hidden');}
function startNewIfNeeded(){
  if(justCalculated){expression='';current='0';hasCurrent=false;justCalculated=false;result=null;resultExpression='';explanation=null;}
}
function inputDigit(v){
  if(justCalculated) startNewIfNeeded();
  if(current==='Error') {expression='';current='0';hasCurrent=false;}
  if(!hasCurrent || current==='0' && v!=='.'){current=v;hasCurrent=true;}
  else if(v==='.' && !current.includes('.')) current+='.';
  else current+=v;
  expression = expression.replace(/(?:\d*\.?\d+%?)$/,'') + current;
  renderDisplay();
}
function op(v){
  if(current==='Error')return;
  if(justCalculated){ expression=String(result); current=String(result); hasCurrent=true; justCalculated=false; result=null; resultExpression=''; explanation=null; $('#howPanel').classList.add('hidden'); }
  if(!expression && !hasCurrent)return;
  if(!expression)expression=current;
  const trimmed=expression.trimEnd();
  if(/[+\-*/]$/.test(trimmed)) expression=trimmed.slice(0,-1).trimEnd();
  expression=expression.trimEnd()+` ${v} `;
  current='0';hasCurrent=false;
  renderDisplay();
}
function pct(){
  if(justCalculated) return;
  if(!hasCurrent || current==='Error')return;
  if(!current.endsWith('%')){current+='%';expression=expression.replace(/(?:\d*\.?\d+%?)$/,'')+current;}
  renderDisplay();
}
function backspace(){
  if(justCalculated){return;}
  if(hasCurrent){
    current=current.slice(0,-1); if(!current||current==='-')current='0';
    expression=expression.replace(/(?:\d*\.?\d+%?)$/,'') + (current==='0'?'':current);
    hasCurrent=current!=='0';
  }
  renderDisplay();
}
function clearCurrent(){
  if(justCalculated){clearAll();return;}
  if(hasCurrent){
    current='0';hasCurrent=false;
    expression=expression.replace(/(?:\d*\.?\d+%?)$/,'');
    renderDisplay();
    return;
  }
  clearAll();
}
function clearAll(){expression='';current='0';hasCurrent=false;result=null;resultExpression='';explanation=null;justCalculated=false;$('#howPanel').classList.add('hidden');renderDisplay();}
async function calculate(){
  if(!expression.trim()||/[+\-*/]\s*$/.test(expression.trim()))return;
  try{const v=evaluate(expression.trim());result=v;resultExpression=expression.trim();current=String(v);hasCurrent=false;justCalculated=true;explanation=makeHow(resultExpression,v);await historyAdd({expression:resultExpression,result:fmt(v),explanation});renderDisplay();renderHistory();}
  catch{current='Error';hasCurrent=false;justCalculated=false;result=null;renderDisplay();}
}
function showHow(){if(!explanation)return;$('#howContent').innerHTML=`<p class="how-summary">${esc(explanation.summary)}</p>`+explanation.steps.map(s=>`<div class="how-step"><div class="how-title">${esc(s.title)}</div><div class="how-formula">${esc(s.formula)}</div><div class="how-result">${esc(s.result)}</div></div>`).join('');$('#howPanel').classList.remove('hidden');}

async function renderHistory(){
  const list=$('#historyList');if(!list)return;const items=await historyAll();
  list.innerHTML=items.length?items.map(x=>`<div class="history-item"><button class="history-main" data-history-id="${x.id}"><div class="history-expression">${esc(x.expression)}</div><div class="history-result">${esc(x.result)}</div></button><button class="history-delete" data-history-delete="${x.id}" aria-label="${esc(t('delete'))}">×</button></div>`).join(''):`<div class="empty">${esc(t('none'))}</div>`;
  $$('[data-history-id]').forEach(b=>b.onclick=()=>{const x=items.find(i=>String(i.id)===b.dataset.historyId);if(!x)return;mode='calc';expression=x.expression;current=x.result;hasCurrent=false;result=Number(String(x.result).replace(/,/g,''));resultExpression=x.expression;explanation=x.explanation;justCalculated=true;setMode();renderDisplay();});
  $$('[data-history-delete]').forEach(b=>b.onclick=async()=>{await historyDelete(b.dataset.historyDelete);renderHistory();});
}
function showHistoryConfirm(){ $('#historyConfirm').classList.remove('hidden'); $('#clearHistory').classList.add('hidden'); }
function hideHistoryConfirm(){ $('#historyConfirm').classList.add('hidden'); $('#clearHistory').classList.remove('hidden'); }

const unitDefs={length:{mm:.001,cm:.01,m:1,km:1000,in:.0254,ft:.3048,yd:.9144,mi:1609.344},mass:{mg:.000001,g:.001,kg:1,oz:.028349523125,lb:.45359237},volume:{ml:.001,l:1,tsp:.00492892159,tbsp:.0147867648,cup:.2365882365,gal:3.785411784},data:{B:1,KB:1000,MB:1e6,GB:1e9,TB:1e12}};
function toolResult(html){const e=$('#toolResult');if(e){e.innerHTML=html;e.classList.remove('hidden');}}
function renderTool(){
  const p=$('#toolPanel');if(!p)return;
  if(mode==='calc'){p.classList.add('hidden');p.innerHTML='';$('#keypad').classList.remove('hidden');$('#calculatorDisplay').classList.remove('hidden');return;}
  $('#keypad').classList.add('hidden');$('#calculatorDisplay').classList.add('hidden');p.classList.remove('hidden');
  if(mode==='fuel')p.innerHTML=`<div class="tool-grid"><label class="tool-field"><span>${t('fuelD')}</span><input id="fuelD" type="number" inputmode="decimal"></label><label class="tool-field"><span>${t('fuelC')}</span><input id="fuelC" type="number" inputmode="decimal"></label><label class="tool-field"><span>${t('fuelP')}</span><input id="fuelP" type="number" inputmode="decimal"></label></div><button class="tool-action" id="fuelGo">${t('fuelGo')}</button><div id="toolResult" class="tool-result hidden"></div>`;
  else if(mode==='energy')p.innerHTML=`<div class="tool-grid"><label class="tool-field"><span>${t('energyP')}</span><input id="energyP" type="number" inputmode="decimal"></label><label class="tool-field"><span>${t('energyH')}</span><input id="energyH" type="number" inputmode="decimal"></label><label class="tool-field"><span>${t('energyD')}</span><input id="energyD" type="number" inputmode="decimal" value="30"></label><label class="tool-field"><span>${t('energyR')}</span><input id="energyR" type="number" inputmode="decimal"></label></div><button class="tool-action" id="energyGo">${t('energyGo')}</button><div id="toolResult" class="tool-result hidden"></div>`;
  else if(mode==='vat')p.innerHTML=`<label class="tool-field"><span>${t('amount')}</span><input id="vatAmount" type="number" inputmode="decimal"></label><label class="tool-field"><span>${t('vatRate')}</span><input id="vatRate" type="number" inputmode="decimal" value="24"></label><div class="bottom-actions"><button class="tool-action" id="addVat">${t('addVat')}</button><button class="tool-action" id="removeVat">${t('removeVat')}</button></div><div id="toolResult" class="tool-result hidden"></div>`;
  else p.innerHTML=`<div class="tool-grid"><label class="tool-field"><span>${t('category')}</span><select id="unitCat"><option value="length">${t('length')}</option><option value="mass">${t('mass')}</option><option value="volume">${t('volume')}</option><option value="data">${t('data')}</option></select></label><label class="tool-field"><span>${t('value')}</span><input id="unitVal" type="number" inputmode="decimal"></label><label class="tool-field"><span>${t('from')}</span><select id="unitFrom"></select></label><label class="tool-field"><span>${t('to')}</span><select id="unitTo"></select></label></div><button class="tool-action" id="unitGo">${t('convert')}</button><div id="toolResult" class="tool-result hidden"></div>`;
  bindTool();
}
function populateUnits(){const cat=$('#unitCat');if(!cat)return;const units=Object.keys(unitDefs[cat.value]);['#unitFrom','#unitTo'].forEach((sel,i)=>{const e=$(sel);e.innerHTML=units.map(u=>`<option value="${u}">${u}</option>`).join('');if(i===1&&units[1])e.value=units[1];});}
function bindTool(){
  if(mode==='fuel')$('#fuelGo').onclick=()=>{const d=+$('#fuelD').value,c=+$('#fuelC').value,p=+$('#fuelP').value;if([d,c,p].some(v=>!Number.isFinite(v)||v<0))return;const used=d*c/100,cost=used*p;toolResult(`<strong>€ ${fmt(cost)}</strong><br>${t('fuelUsed')}: ${fmt(used)} L<br>${t('costKm')}: € ${fmt(cost/d||0)}`)};
  if(mode==='energy')$('#energyGo').onclick=()=>{const p=+$('#energyP').value,h=+$('#energyH').value,d=+$('#energyD').value,r=+$('#energyR').value;if([p,h,d,r].some(v=>!Number.isFinite(v)||v<0))return;const kwh=p*h*d/1000,cost=kwh*r;toolResult(`<strong>€ ${fmt(cost)}</strong><br>${t('energyUsed')}: ${fmt(kwh)} kWh`)};
  if(mode==='vat'){$('#addVat').onclick=()=>vatCalc(true);$('#removeVat').onclick=()=>vatCalc(false);}
  if(mode==='units'){populateUnits();$('#unitCat').onchange=populateUnits;$('#unitGo').onclick=()=>{const v=+$('#unitVal').value,cat=$('#unitCat').value,from=$('#unitFrom').value,to=$('#unitTo').value;if(!Number.isFinite(v))return;const out=v*unitDefs[cat][from]/unitDefs[cat][to];toolResult(`<strong>${fmt(out)} ${esc(to)}</strong>`)};}
}
function vatCalc(add){const amount=+$('#vatAmount').value,rate=+$('#vatRate').value;if(!Number.isFinite(amount)||!Number.isFinite(rate))return;const out=add?amount*(1+rate/100):amount/(1+rate/100),vat=add?amount*rate/100:amount-out;toolResult(`<strong>${fmt(out)}</strong><br>${t('vatAmount')}: ${fmt(vat)}`);}
function setMode(){
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));renderTool();
}

$('#langButton').onclick=toggleLanguage;
$('#themeButton').onclick=()=>document.body.classList.toggle('light');
$('#historyButton').onclick=()=>$('#historyPanel').classList.toggle('hidden');
$('#clearHistory').onclick=showHistoryConfirm;
$('#historyConfirmCancel').onclick=hideHistoryConfirm;
$('#historyConfirmYes').onclick=async()=>{await historyClear();hideHistoryConfirm();};
$('#copyButton').onclick=async()=>{if(result===null)return;navigator.clipboard?.writeText(String(result));const old=t('copy');setText('#copyButton',t('copied'));setTimeout(()=>setText('#copyButton',old),1200);};
$('#howButton').onclick=showHow;
$('#closeHow').onclick=()=>$('#howPanel').classList.add('hidden');
$$('.tab').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;setMode();});
$$('.key').forEach(b=>b.onclick=()=>{const a=b.dataset.action,v=b.dataset.value;if(a==='backspace')backspace();else if(a==='clear')clearCurrent();else if(a==='equals')calculate();else if(v==='%')pct();else if(['+','-','*','/'].includes(v))op(v);else inputDigit(v);});
document.addEventListener('keydown',e=>{if(mode!=='calc')return;if(/\d/.test(e.key)||e.key==='.')inputDigit(e.key);else if(['+','-','*','/'].includes(e.key))op(e.key);else if(e.key==='%')pct();else if(e.key==='Enter'||e.key==='=')calculate();else if(e.key==='Backspace')backspace();else if(e.key==='Escape')clearCurrent();});

translate();
renderHistory();
