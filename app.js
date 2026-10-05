const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const VERSION = '0.2.3';
let expression = '';
let currentInput = '0';
let lastExpression = '';
let lastResult = null;
let lastExplanation = null;
let currentMode = 'calc';
let authUser = null;
let authMode = 'login';
let authStep = 'username';
let lang = localStorage.getItem('uc-lang') || 'el';

const T = {
  el: {
    everyday:'ΚΑΘΗΜΕΡΙΝΟΣ ΥΠΟΛΟΓΙΣΤΗΣ', signIn:'Σύνδεση', signOut:'Αποσύνδεση', create:'Δημιουργία λογαριασμού', how:'Πώς;', calc:'Υπολογισμός', fuel:'Καύσιμα', energy:'Ενέργεια', vat:'ΦΠΑ', units:'Μονάδες', history:'Ιστορικό', copy:'Αντιγραφή αποτελέσματος', copied:'Αντιγράφηκε', close:'Κλείσιμο', clearAll:'Διαγραφή όλων', hint:'Δοκίμασε 20 + 25%, 80 - 15% ή άνοιξε ένα από τα εργαλεία.', authIntro:'Σύνδεση για συγχρονισμό του ιστορικού σου σε όλες τις συσκευές.', haveAccount:'Έχεις ήδη λογαριασμό;', newHere:'Δεν έχεις λογαριασμό;', username:'Όνομα χρήστη', password:'Κωδικός', continue:'Συνέχεια', finishCreate:'Δημιουργία λογαριασμού', passwordHint:'Τουλάχιστον 8 χαρακτήρες.', noHistory:'Δεν υπάρχουν υπολογισμοί ακόμα.', deleteAllConfirm:'Να διαγραφεί όλο το ιστορικό;', loginError:'Η σύνδεση απέτυχε.', registerError:'Η δημιουργία λογαριασμού απέτυχε.', fuelDistance:'Απόσταση (km)', fuelConsumption:'Κατανάλωση (L/100 km)', fuelPrice:'Τιμή καυσίμου / L', calculateFuel:'Υπολόγισε κόστος καυσίμων', enterValues:'Βάλε τις τιμές και υπολόγισε.', energyPower:'Ισχύς (W)', energyHours:'Ώρες / ημέρα', energyDays:'Ημέρες', energyRate:'Τιμή / kWh', calculateEnergy:'Υπολόγισε κόστος ρεύματος', amount:'Ποσό', vatRate:'ΦΠΑ %', chooseAction:'Επίλεξε ενέργεια.', addVat:'Πρόσθεσε ΦΠΑ', removeVat:'Αφαίρεσε ΦΠΑ', value:'Τιμή', category:'Κατηγορία', from:'Από', to:'Σε', convert:'Μετατροπή', chooseUnits:'Επίλεξε μονάδες και κάνε μετατροπή.', fuelUsed:'Καύσιμο που χρησιμοποιήθηκε', totalCost:'Συνολικό κόστος', costPerKm:'Κόστος ανά km', energyUsed:'Ενέργεια', result:'Αποτέλεσμα', vatAmount:'Ποσό ΦΠΑ', fuelSummary:'Η κατανάλωση δείχνει πόσα λίτρα χρειάζονται ανά 100 km.', energySummary:'Τα Watt μετατρέπονται σε kilowatt επειδή το ρεύμα χρεώνεται σε kWh.', vatSummary:'Ο ΦΠΑ προστίθεται ή αφαιρείται με βάση το ποσοστό.', unitSummary:'Η μετατροπή χρησιμοποιεί τη σχέση μεταξύ των δύο μονάδων.', normalSummary:'Ο υπολογιστής εφαρμόζει τη μαθηματική σειρά πράξεων.', percentSummary:(p)=>`${p}% σημαίνει ${p} στα 100.`, percentOf:(p)=>`${p}% του`, addIt:'Πρόσθεσέ το', subtractIt:'Αφαίρεσέ το', fuelStep:'Καύσιμο που χρησιμοποιήθηκε', fuelCostStep:'Κόστος καυσίμου', costKmStep:'Κόστος ανά χιλιόμετρο', watStep:'Μετατροπή Watt', energyStep:'Ενέργεια', energyCostStep:'Κόστος ρεύματος', removeVatStep:'Αφαίρεση ΦΠΑ', vatStep:'Ποσό ΦΠΑ', convertStep:'Μετατροπή', createdBy:'Created by Leonidas Kampaxis'
  },
  en: {
    everyday:'EVERYDAY CALCULATOR', signIn:'Sign in', signOut:'Sign out', create:'Create account', how:'How?', calc:'Calc', fuel:'Fuel', energy:'Energy', vat:'VAT', units:'Units', history:'History', copy:'Copy result', copied:'Copied', close:'Close', clearAll:'Clear all', hint:'Try 20 + 25%, 80 - 15%, or open one of the everyday tools.', authIntro:'Sign in to sync your history across devices.', haveAccount:'Already have an account?', newHere:'Don’t have an account?', username:'Username', password:'Password', continue:'Continue', finishCreate:'Create account', passwordHint:'At least 8 characters.', noHistory:'No calculations yet.', deleteAllConfirm:'Delete all calculation history?', loginError:'Sign in failed.', registerError:'Account creation failed.', fuelDistance:'Distance (km)', fuelConsumption:'Consumption (L/100 km)', fuelPrice:'Fuel price / L', calculateFuel:'Calculate fuel cost', enterValues:'Enter values and calculate.', energyPower:'Power (W)', energyHours:'Hours / day', energyDays:'Days', energyRate:'Price / kWh', calculateEnergy:'Calculate electricity cost', amount:'Amount', vatRate:'VAT %', chooseAction:'Choose an action.', addVat:'Add VAT', removeVat:'Remove VAT', value:'Value', category:'Category', from:'From', to:'To', convert:'Convert', chooseUnits:'Choose units and convert.', fuelUsed:'Fuel used', totalCost:'Total cost', costPerKm:'Cost per km', energyUsed:'Energy', result:'Result', vatAmount:'VAT amount', fuelSummary:'Fuel consumption tells us how many litres are used for every 100 km.', energySummary:'Watts are converted to kilowatts because electricity is billed in kWh.', vatSummary:'VAT is added or removed based on the selected percentage.', unitSummary:'The conversion uses the relationship between the two units.', normalSummary:'The calculator applies normal mathematical order of operations.', percentSummary:(p)=>`${p}% means ${p} out of every 100.`, percentOf:(p)=>`${p}% of`, addIt:'Add it', subtractIt:'Subtract it', fuelStep:'Fuel used', fuelCostStep:'Fuel cost', costKmStep:'Cost per kilometre', watStep:'Convert watts', energyStep:'Energy used', energyCostStep:'Electricity cost', removeVatStep:'Remove VAT', vatStep:'VAT amount', convertStep:'Convert', createdBy:'Created by Leonidas Kampaxis'
  }
};
const t = (k) => T[lang][k] ?? T.en[k] ?? k;
const fmt = (v) => Number.isFinite(v) ? new Intl.NumberFormat(lang === 'el' ? 'el-GR' : 'en-US', { maximumFractionDigits:10 }).format(Math.abs(v) < 1e-12 ? 0 : v) : 'Error';
const raw = (v) => String(Number(v.toPrecision(12)));
const esc = (v) => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function setLanguage(next) {
  lang = next || (lang === 'el' ? 'en' : 'el');
  localStorage.setItem('uc-lang', lang);
  document.documentElement.lang = lang;
  $('#langButton').textContent = lang === 'el' ? 'ΕΛ' : 'EN';
  $('[data-i18n="everyday"]').textContent = t('everyday');
  $('#accountButton').textContent = authUser ? `${authUser.username} · ${t('signOut')}` : t('signIn');
  $('#howButton').textContent = t('how');
  $('#historyButton').textContent = t('history');
  $('#copyButton').textContent = t('copy');
  $('#clearHistory').textContent = t('clearAll');
  $('#closeHow').textContent = t('close');
  $('#hint').textContent = t('hint');
  $$('.tab').forEach(b => b.textContent = t(b.dataset.mode));
  updateAuthText();
  renderTool(currentMode);
  renderHistory();
  if (lastExplanation && lastResult !== null && !$('#howPanel').classList.contains('hidden')) showHow();
}

const dbPromise = new Promise((resolve, reject) => {
  const r = indexedDB.open('ultimate-calculator', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('history', { keyPath:'id', autoIncrement:true });
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
async function localItems(){try{const db=await dbPromise,s=db.transaction('history').objectStore('history');return await new Promise((ok,no)=>{const r=s.getAll();r.onsuccess=()=>ok(r.result.sort((a,b)=>b.createdAt-a.createdAt));r.onerror=()=>no(r.error)})}catch{return[]}}
async function localAdd(x){const db=await dbPromise;db.transaction('history','readwrite').objectStore('history').add({...x,createdAt:Date.now()})}
async function localDelete(id){const db=await dbPromise;db.transaction('history','readwrite').objectStore('history').delete(Number(id))}
async function localClear(){const db=await dbPromise;db.transaction('history','readwrite').objectStore('history').clear()}
async function api(path,opts={}){const r=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}
async function checkAuth(){try{const d=await api('/api/me');authUser=d.user||null}catch{authUser=null}updateAccountButton()}
function updateAccountButton(){$('#accountButton').textContent=authUser?`${authUser.username} · ${t('signOut')}`:t('signIn')}
async function historyItems(){if(authUser){try{const d=await api('/api/history');return d.items.map(i=>({...i,createdAt:i.created_at,explanation:JSON.parse(i.label||'null')}))}catch{}}return localItems()}
async function saveHistory(x){await localAdd(x);if(authUser){try{await api('/api/history',{method:'POST',body:JSON.stringify({expression:x.expression,result:x.result,label:JSON.stringify(x.explanation||null)})})}catch{}}await renderHistory()}
async function removeHistory(id){if(authUser){try{await api(`/api/history/${id}`,{method:'DELETE'})}catch{}}else await localDelete(id);await renderHistory()}
async function wipeHistory(){if(!confirm(t('deleteAllConfirm')))return;if(authUser){try{await api('/api/history',{method:'DELETE'})}catch{}}await localClear();await renderHistory()}
async function syncLocalToAccount(){if(!authUser)return;const items=await localItems();for(const x of items){try{await api('/api/history',{method:'POST',body:JSON.stringify({expression:x.expression,result:x.result,label:JSON.stringify(x.explanation||null)})})}catch{}}await localClear()}

function tokenize(s){s=s.replace(/[€$£¥₹]/g,'').replace(/,/g,'');const a=[];let i=0;while(i<s.length){const c=s[i];if(/\s/.test(c)){i++;continue}if(/[0-9.]/.test(c)){let j=i,d=0;while(j<s.length&&/[0-9.]/.test(s[j])){if(s[j]==='.')d++;j++}const n=Number(s.slice(i,j));if(!Number.isFinite(n))throw Error();a.push({t:'n',v:n});i=j;continue}if('+-*/()'.includes(c)){a.push({t:c});i++;continue}if(c==='%'){a.push({t:'%'});i++;continue}throw Error()}return a}
function evaluate(s){const ts=tokenize(s),p={i:0};function pri(){const x=ts[p.i];if(!x)throw Error();if(x.t==='n'){p.i++;let n={v:x.v,p:false};if(ts[p.i]?.t==='%'){p.i++;n={v:x.v/100,p:true}}return n}if(x.t==='('){p.i++;const n=add();if(ts[p.i]?.t!==')')throw Error();p.i++;if(ts[p.i]?.t==='%'){p.i++;return{v:n.v/100,p:true}}return n}if(x.t==='-'){p.i++;const n=pri();return{v:-n.v,p:n.p}}throw Error()}function mul(){let l=pri();while(ts[p.i]&&['*','/'].includes(ts[p.i].t)){const o=ts[p.i++].t,r=pri();if(o==='/'&&r.v===0)throw Error();l={v:o==='*'?l.v*r.v:l.v/r.v,p:false}}return l}function add(){let l=mul();while(ts[p.i]&&['+','-'].includes(ts[p.i].t)){const o=ts[p.i++].t,r=mul(),n=r.p?l.v*r.v:r.v;l={v:o==='+'?l.v+n:l.v-n,p:false}}return l}const r=add();if(p.i!==ts.length)throw Error();return r.v}

function percentExplanation(e,v){const m=e.match(/^(-?[\d.]+)\s*([+-])\s*(\d+(?:\.\d+)?)%$/);if(!m)return null;const base=Number(m[1]),p=Number(m[3]),amount=base*p/100,final=m[2]==='+'?base+amount:base-amount;return{summary:t('percentSummary')(p),steps:[{title:t('percentOf')(p),formula:`${fmt(base)} × ${raw(p/100)}`,result:fmt(amount)},{title:m[2]==='+'?t('addIt'):t('subtractIt'),formula:`${fmt(base)} ${m[2]} ${fmt(amount)}`,result:fmt(final)}]}}
function normalExplanation(e,v){return{summary:t('normalSummary'),steps:[{title:t('calc'),formula:e,result:fmt(v)}]}}
function explain(e,v){return percentExplanation(e,v)||normalExplanation(e,v)}
function step(title,formula,result){return `<div class="how-step"><div class="how-title">${esc(title)}</div><div class="how-formula">${esc(formula)}</div><div class="how-result">${esc(result)}</div></div>`}
function showHow(){if(!lastExplanation)return;$('#howContent').innerHTML=`<p class="how-summary">${esc(lastExplanation.summary)}</p>`+lastExplanation.steps.map(s=>step(s.title,s.formula,s.result)).join('');$('#howPanel').classList.remove('hidden')}
function invalidateHow(){lastExplanation=null;$('#howButton').classList.add('hidden');$('#howPanel').classList.add('hidden')}

function renderDisplay(){const resultEl=$('#result'),exprEl=$('#expression');if(lastResult!==null){exprEl.textContent=lastExpression;resultEl.textContent=fmt(lastResult)}else{exprEl.textContent='';resultEl.textContent=currentInput}$('#howButton').classList.toggle('hidden',!(lastResult!==null&&lastExplanation));}
function append(v){if(lastResult!==null){lastResult=null;lastExpression='';currentInput='0'}invalidateHow();if(v==='.'&&currentInput.includes('.'))return;if(/[+\-*/]/.test(v)&&/[+\-*/]$/.test(currentInput))currentInput=currentInput.slice(0,-1)+v;else if(currentInput==='0'&&/[0-9]/.test(v))currentInput=v;else currentInput+=v;renderDisplay()}
function clearInput(){lastResult=null;lastExpression='';currentInput='0';expression='';invalidateHow();renderDisplay()}
function backspace(){if(lastResult!==null){clearInput();return}invalidateHow();currentInput=currentInput.length>1?currentInput.slice(0,-1):'0';renderDisplay()}
async function calculate(){const e=currentInput.trim();if(!e||e==='0')return;try{const v=evaluate(e);lastExpression=e;lastResult=v;lastExplanation=explain(e,v);currentInput=raw(v);expression=e;renderDisplay();$('#howButton').classList.remove('hidden');await saveHistory({expression:e,result:fmt(v),explanation:lastExplanation})}catch{currentInput='Error';renderDisplay();setTimeout(()=>{currentInput='0';renderDisplay()},900)}}

function renderTool(mode){const panel=$('#toolPanel');if(mode==='calc'){panel.classList.add('hidden');return}panel.classList.remove('hidden');const configs={fuel:[['fuelDistance','number'],['fuelConsumption','number'],['fuelPrice','number']],energy:[['energyPower','number'],['energyHours','number'],['energyDays','number'],['energyRate','number']],vat:[['amount','number'],['vatRate','number']],units:[['value','number']]};const fields=configs[mode];let html='<div class="tool-grid">';fields.forEach(([key,type])=>html+=`<label class="tool-field"><span>${esc(t(key))}</span><input id="tool-${key}" type="${type}" inputmode="decimal" step="any"></label>`);if(mode==='vat')html+=`<label class="tool-field"><span>${esc(t('category'))}</span><select id="tool-action"><option value="add">${esc(t('addVat'))}</option><option value="remove">${esc(t('removeVat'))}</option></select></label>`;if(mode==='units')html+=`<label class="tool-field"><span>${esc(t('from'))}</span><select id="tool-from"><option value="km">km</option><option value="m">m</option><option value="mi">mi</option><option value="kg">kg</option><option value="lb">lb</option><option value="l">L</option><option value="gal">gal</option></select></label><label class="tool-field"><span>${esc(t('to'))}</span><select id="tool-to"><option value="km">km</option><option value="m">m</option><option value="mi">mi</option><option value="kg">kg</option><option value="lb">lb</option><option value="l">L</option><option value="gal">gal</option></select></label>`;html+=`</div><button id="toolCalculate" class="tool-action">${esc(t(mode==='fuel'?'calculateFuel':mode==='energy'?'calculateEnergy':'convert'))}</button><div id="toolResult" class="tool-result">${esc(t('enterValues'))}</div>`;panel.innerHTML=html;$('#toolCalculate').onclick=()=>calculateTool(mode)}
function calculateTool(mode){const n=k=>Number($(`#tool-${k}`)?.value);let result,summary,steps;if(mode==='fuel'){const d=n('fuelDistance'),c=n('fuelConsumption'),p=n('fuelPrice');const fuel=d*c/100,cost=fuel*p;result=cost;summary=t('fuelSummary');steps=[{title:t('fuelStep'),formula:`${fmt(d)} × ${fmt(c)} ÷ 100`,result:`${fmt(fuel)} L`},{title:t('fuelCostStep'),formula:`${fmt(fuel)} × ${fmt(p)}`,result:fmt(cost)},{title:t('costKmStep'),formula:`${fmt(cost)} ÷ ${fmt(d)}`,result:fmt(cost/d)}]}else if(mode==='energy'){const power=n('energyPower'),hours=n('energyHours'),days=n('energyDays'),rate=n('energyRate');const kwh=power/1000*hours*days,cost=kwh*rate;result=cost;summary=t('energySummary');steps=[{title:t('watStep'),formula:`${fmt(power)} W ÷ 1,000`,result:`${fmt(power/1000)} kW`},{title:t('energyStep'),formula:`${fmt(power/1000)} × ${fmt(hours)} × ${fmt(days)}`,result:`${fmt(kwh)} kWh`},{title:t('energyCostStep'),formula:`${fmt(kwh)} × ${fmt(rate)}`,result:fmt(cost)}]}else if(mode==='vat'){const a=n('amount'),r=n('vatRate'),act=$('#tool-action').value;const vat=act==='add'?a*r/100:a-a/(1+r/100);result=act==='add'?a+vat:a-vat;summary=t('vatSummary');steps=act==='add'?[{title:t('vatStep'),formula:`${fmt(a)} × ${fmt(r/100)}`,result:fmt(vat)},{title:t('addVat'),formula:`${fmt(a)} + ${fmt(vat)}`,result:fmt(result)}]:[{title:t('removeVatStep'),formula:`${fmt(a)} ÷ (1 + ${fmt(r/100)})`,result:fmt(result)},{title:t('vatStep'),formula:`${fmt(a)} − ${fmt(result)}`,result:fmt(vat)}]}else{const v=n('value'),f=$('#tool-from').value,to=$('#tool-to').value;const rates={m:1,km:1000,mi:1609.344,kg:1,lb:.45359237,l:1,gal:3.785411784};const resultBase=v*rates[f];result=resultBase/rates[to];summary=t('unitSummary');steps=[{title:t('convertStep'),formula:`${fmt(v)} ${f} → ${fmt(result)} ${to}`,result:fmt(result)}]}if(!Number.isFinite(result)){ $('#toolResult').textContent=t('enterValues');return }$('#toolResult').innerHTML=`<div><strong>${esc(fmt(result))}</strong></div>${steps.map(s=>step(s.title,s.formula,s.result)).join('')}`;lastExplanation={summary,steps};lastResult=result;lastExpression=`${t(mode)} · ${fmt(result)}`;$('#howButton').classList.remove('hidden');saveHistory({expression:lastExpression,result:fmt(result),explanation:lastExplanation})}

async function renderHistory(){const list=$('#historyList');const items=await historyItems();if(!items.length){list.innerHTML=`<div class="empty">${esc(t('noHistory'))}</div>`;return}list.innerHTML=items.map(i=>`<div class="history-item"><button class="history-main" data-history="${i.id}"><div class="history-expression">${esc(i.expression)}</div><div class="history-result">${esc(i.result)}</div></button><button class="history-delete" data-delete="${i.id}" aria-label="Delete">×</button></div>`).join('');$$('[data-delete]').forEach(b=>b.onclick=()=>removeHistory(b.dataset.delete));$$('[data-history]').forEach(b=>b.onclick=async()=>{const item=items.find(i=>String(i.id)===String(b.dataset.history));if(!item)return;lastExpression=item.expression;lastResult=Number(String(item.result).replace(/[^0-9.-]/g,''));lastExplanation=item.explanation||normalExplanation(item.expression,lastResult);currentInput=raw(lastResult);renderDisplay();showHow()})}

function updateAuthText(){const title=$('#authTitle');title.textContent=authMode==='login'?t('signIn'):t('create');$('#authIntro').textContent=t('authIntro');$('#closeAuth').textContent=t('close');$('#authUsername').placeholder=t('username');$('#authPassword').placeholder=t('password');$('#passwordHint').textContent=t('passwordHint');$('#authSubmit').textContent=authStep==='username'?t('continue'):(authMode==='login'?t('signIn'):t('finishCreate'));$('#authModeHint').textContent=authMode==='login'?t('newHere'):t('haveAccount');$('#authModeSwitch').textContent=authMode==='login'?t('create'):t('signIn')}
function openAuth(mode='login'){authMode=mode;authStep='username';$('#authUsername').value='';$('#authPassword').value='';$('#passwordField').classList.add('hidden');$('#passwordHint').classList.add('hidden');$('#authMessage').textContent='';$('#authModal').classList.remove('hidden');updateAuthText();setTimeout(()=>$('#authUsername').focus(),50)}
function closeAuth(){$('#authModal').classList.add('hidden')}
async function submitAuth(){const username=$('#authUsername').value.trim();if(authStep==='username'){if(username.length<3){$('#authMessage').textContent=lang==='el'?'Το όνομα χρήστη πρέπει να έχει τουλάχιστον 3 χαρακτήρες.':'Username must be at least 3 characters.';return}authStep='password';$('#passwordField').classList.remove('hidden');$('#passwordHint').classList.remove('hidden');$('#authPassword').autocomplete=authMode==='login'?'current-password':'new-password';updateAuthText();$('#authPassword').focus();return}const password=$('#authPassword').value;if(password.length<8){$('#authMessage').textContent=t('passwordHint');return}try{const d=await api(authMode==='login'?'/api/login':'/api/register',{method:'POST',body:JSON.stringify({username,password})});authUser=d.user;await syncLocalToAccount();closeAuth();updateAccountButton();await renderHistory()}catch(e){$('#authMessage').textContent=e.message||(authMode==='login'?t('loginError'):t('registerError'))}}

$('#langButton').onclick=()=>setLanguage();
$('#accountButton').onclick=async()=>{if(authUser){try{await api('/api/logout',{method:'POST'});authUser=null;updateAccountButton();await renderHistory()}catch{}}else openAuth('login')};
$('#closeAuth').onclick=closeAuth;
$('#authModal').addEventListener('click',e=>{if(e.target.id==='authModal')closeAuth()});
$('#authForm').onsubmit=e=>{e.preventDefault();submitAuth()};
$('#authModeSwitch').onclick=()=>openAuth(authMode==='login'?'register':'login');
$('#howButton').onclick=showHow;
$('#closeHow').onclick=()=>$('#howPanel').classList.add('hidden');
$('#historyButton').onclick=()=>{$('#historyPanel').classList.toggle('hidden');renderHistory()};
$('#clearHistory').onclick=wipeHistory;
$('#copyButton').onclick=async()=>{if(lastResult===null)return;await navigator.clipboard.writeText(String(lastResult));const b=$('#copyButton');b.textContent=t('copied');setTimeout(()=>b.textContent=t('copy'),1200)};
$('#themeButton').onclick=()=>document.body.classList.toggle('light');
$$('.tab').forEach(b=>b.onclick=()=>{currentMode=b.dataset.mode;$$('.tab').forEach(x=>x.classList.toggle('active',x===b));renderTool(currentMode)});
$$('.key').forEach(b=>b.onclick=()=>{const a=b.dataset.action,v=b.dataset.value;if(a==='clear')clearInput();else if(a==='backspace')backspace();else if(a==='equals')calculate();else append(v)});
document.addEventListener('keydown',e=>{if($('#authModal')&&!$('#authModal').classList.contains('hidden'))return;if(e.key==='Enter'||e.key==='='){e.preventDefault();calculate()}else if(e.key==='Backspace')backspace();else if(e.key==='Escape')clearInput();else if(/[0-9.+\-*/%]/.test(e.key))append(e.key)});

$('#keypad').querySelector('[data-action="clear"]').textContent='C';
$('#keypad').insertBefore($('#keypad').querySelector('[data-action="clear"]'),$('#keypad').querySelector('[data-action="backspace"]'));
$('#keypad').querySelector('[data-action="clear"]').textContent='C';
(async()=>{document.documentElement.lang=lang;setLanguage(lang);await checkAuth();await renderHistory()})();
