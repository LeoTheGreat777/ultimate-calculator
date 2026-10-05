const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let expression = '', lastResult = null, currentMode = 'calc', lastExplanation = null;

const fmt = v => Number.isFinite(v) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 10 }).format(Math.abs(v) < 1e-12 ? 0 : v) : 'Error';
const raw = v => String(Number(v.toPrecision(12)));
const esc = v => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

// Browser-local history. Nothing is uploaded and no account is required.
const DB_NAME = 'ultimate-calculator', DB_VERSION = 1, STORE = 'history';
let dbPromise = new Promise((resolve, reject) => {
  const r = indexedDB.open(DB_NAME, DB_VERSION);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
async function dbStore(mode='readonly') { return (await dbPromise).transaction(STORE, mode).objectStore(STORE); }
async function addHistory(item) { try { const s = await dbStore('readwrite'); s.add({...item, createdAt: Date.now()}); await refreshHistory(); } catch {} }
async function getHistory() { try { const s = await dbStore(); return await new Promise((res, rej) => { const r=s.getAll(); r.onsuccess=()=>res(r.result.sort((a,b)=>b.createdAt-a.createdAt)); r.onerror=()=>rej(r.error); }); } catch { return []; } }
async function deleteHistory(id) { const s=await dbStore('readwrite'); s.delete(Number(id)); await refreshHistory(); }
async function clearHistory() { const s=await dbStore('readwrite'); s.clear(); await refreshHistory(); }

function tokenize(s) {
  s = s.replace(/[€$£¥₹]/g, '').replace(/,/g, '');
  const a=[]; let i=0;
  while(i<s.length){
    const c=s[i];
    if(/\s/.test(c)){i++;continue}
    if(/[0-9.]/.test(c)){let j=i,d=0;while(j<s.length&&/[0-9.]/.test(s[j])){if(s[j]==='.')d++;if(d>1)throw Error();j++;}const n=Number(s.slice(i,j));if(!Number.isFinite(n))throw Error();a.push({t:'n',v:n});i=j;continue}
    if('+-*/()'.includes(c)){a.push({t:c});i++;continue}
    if(c==='%'){a.push({t:'%'});i++;continue}
    throw Error();
  }
  return a;
}

function evaluate(s) {
  const t=tokenize(s), p={i:0};
  function pri(){const x=t[p.i];if(!x)throw Error();if(x.t==='n'){p.i++;let n={v:x.v,p:false};if(t[p.i]?.t==='%'){p.i++;n={v:x.v/100,p:true}}return n}if(x.t==='('){p.i++;const n=add();if(t[p.i]?.t!==')')throw Error();p.i++;if(t[p.i]?.t==='%'){p.i++;return{v:n.v/100,p:true}}return n}if(x.t==='-'){p.i++;const n=pri();return{v:-n.v,p:n.p}}throw Error()}
  function mul(){let l=pri();while(t[p.i]&&['*','/'].includes(t[p.i].t)){const o=t[p.i++].t,r=pri();if(o==='/'&&r.v===0)throw Error();l={v:o==='*'?l.v*r.v:l.v/r.v,p:false}}return l}
  function add(){let l=mul();while(t[p.i]&&['+','-'].includes(t[p.i].t)){const o=t[p.i++].t,r=mul(),n=r.p?l.v*r.v:r.v;l={v:o==='+'?l.v+n:l.v-n,p:false}}return l}
  const r=add();if(p.i!==t.length)throw Error();return r.v;
}

function display(v=null){$('#expression').textContent=expression;$('#result').textContent=v===null?(expression?'…':'0'):fmt(v);$('#howButton').classList.toggle('hidden', v===null || !lastExplanation);}
function calculate(){if(!expression.trim())return;try{const v=evaluate(expression);lastResult=v;lastExplanation=explainExpression(expression,v);display(v);addHistory({expression,result:fmt(v),explanation:lastExplanation});}catch{$('#result').textContent='Error';lastResult=null;lastExplanation=null;$('#howButton').classList.add('hidden')}}
function append(v){if(v==='.'&&/(^|[+\-*/(])\s*\d*\.\d*$/.test(expression))return;if(v==='%'&&!/[0-9)]$/.test(expression))return;if('+-*/'.includes(v)){if(!expression&&v!=='-')return;if(/[+\-*/]$/.test(expression))expression=expression.slice(0,-1)+v}expression+=v;lastExplanation=null;display()}
function clearAll(){expression='';lastResult=null;lastExplanation=null;display(0)}
function back(){expression=expression.slice(0,-1);lastExplanation=null;display()}

function step(title, formula, result){return `<div class="how-step"><div class="how-title">${esc(title)}</div><div class="how-formula">${esc(formula)}</div><div class="how-result">${esc(result)}</div></div>`;}
function explainExpression(e, v){
  const s=e.replace(/\s+/g,'');
  const m=s.match(/^(-?[\d.,]+)([+\-])([\d.,]+)%$/);
  if(m){const a=Number(m[1].replace(/,/g,'')),p=Number(m[3].replace(/,/g,'')),change=a*p/100,sign=m[2],out=sign==='+'?a+change:a-change;return {summary:`${p}% means ${p} out of every 100.`,steps:[step(`${p}% of ${fmt(a)}`,`${fmt(a)} × ${p} ÷ 100`,fmt(change)),step(`Then ${sign==='+'?'add':'subtract'} it`,`${fmt(a)} ${sign} ${fmt(change)}`,fmt(out))]};}
  const vat=s.match(/^€?([\d.,]+)(?:\s*)\+\s*(\d+(?:\.\d+)?)%$/);
  if(vat){const a=Number(vat[1].replace(/,/g,'')),p=Number(vat[2]),c=a*p/100;return {summary:`Adding ${p}% means adding ${fmt(c)} to ${fmt(a)}.`,steps:[step(`${p}% of ${fmt(a)}`,`${fmt(a)} × ${p} ÷ 100`,fmt(c)),step('Add the percentage',`${fmt(a)} + ${fmt(c)}`,fmt(a+c))]};}
  const simple=s.match(/^(-?[\d.]+)([+\-*/])(-?[\d.]+)$/);
  if(simple){const a=Number(simple[1]),o=simple[2],b=Number(simple[3]);return {summary:'The calculator applies the operation between the two numbers.',steps:[step('Calculation',`${fmt(a)} ${o==='*'?'×':o==='/'?'÷':o} ${fmt(b)}`,fmt(v))]};}
  return {summary:'The result was calculated from the expression above, following normal mathematical order of operations.',steps:[step('Result',e,fmt(v))]};
}

function showHow(explanation=lastExplanation){if(!explanation)return;$('#howContent').innerHTML=`<p class="how-summary">${esc(explanation.summary)}</p>${explanation.steps.join('')}`;$('#howPanel').classList.remove('hidden');$('#howPanel').scrollIntoView({behavior:'smooth',block:'nearest'});}

const units={length:{m:1,km:1000,mi:1609.344,ft:.3048,in:.0254,yd:.9144},weight:{kg:1,g:.001,lb:.45359237,oz:.028349523125},volume:{L:1,mL:.001,gal:3.785411784,qt:.946352946,cup:.2365882365},speed:{'km/h':1,mph:1.609344,'m/s':3.6,knot:1.852},temperature:{C:1,F:1,K:1}};
const field=(l,id,v,t='number')=>`<div class="tool-field"><label>${l}</label><input id="${id}" type="${t}" value="${v}"></div>`;
function renderTool(m){const p=$('#toolPanel');p.classList.toggle('hidden',m==='calc');if(m==='calc'){p.innerHTML='';return}if(m==='fuel')p.innerHTML=`<div class="tool-grid">${field('Distance','fuelDistance',100)}${field('Consumption (L/100 km)','fuelConsumption',7)}${field('Fuel price / L','fuelPrice',1.8)}</div><div id="toolOutput" class="tool-result">Enter values and calculate.</div><button class="tool-action" data-tool-action="fuel">Calculate fuel cost</button>`;if(m==='energy')p.innerHTML=`<div class="tool-grid">${field('Power (W)','energyPower',100)}${field('Hours / day','energyHours',8)}${field('Days','energyDays',30)}${field('energyRate','energyRate',.2)}</div><div id="toolOutput" class="tool-result">Enter values and calculate.</div><button class="tool-action" data-tool-action="energy">Calculate electricity cost</button>`;if(m==='vat')p.innerHTML=`<div class="tool-grid">${field('Amount','vatAmount',100)}${field('VAT %','vatRate',24)}</div><div id="toolOutput" class="tool-result">Choose an action.</div><div class="tool-grid"><button class="tool-action" data-tool-action="vat-add">Add VAT</button><button class="tool-action" data-tool-action="vat-remove">Remove VAT</button></div>`;if(m==='units'){p.innerHTML=`<div class="tool-grid">${field('Value','unitValue',5)}<div class="tool-field"><label>Category</label><select id="unitCategory"><option>length</option><option>weight</option><option>volume</option><option>speed</option><option>temperature</option></select></div><div class="tool-field"><label>From</label><select id="unitFrom"></select></div><div class="tool-field"><label>To</label><select id="unitTo"></select></div></div><div id="toolOutput" class="tool-result">Choose units and convert.</div><button class="tool-action" data-tool-action="units">Convert</button>`;populateUnits()}}
function populateUnits(){const n=Object.keys(units[$('#unitCategory').value]);$('#unitFrom').innerHTML=n.map(x=>`<option>${x}</option>`).join('');$('#unitTo').innerHTML=n.map(x=>`<option>${x}</option>`).join('');if(n[1])$('#unitTo').selectedIndex=1}
function temp(v,f,t){const c=f==='C'?v:f==='F'?(v-32)*5/9:v-273.15;return t==='C'?c:t==='F'?c*9/5+32:c+273.15}
async function toolResult(v,label,explanation){if(!Number.isFinite(v))return;expression=raw(v);lastResult=v;lastExplanation=explanation;display(v);await addHistory({expression:label,result:fmt(v),explanation});}
async function perform(a){if(a==='fuel'){const d=+fuelDistance.value,c=+fuelConsumption.value,p=+fuelPrice.value,l=d*c/100,cost=l*p;const exp={summary:`Fuel consumption tells us how many litres are used for every 100 km.`,steps:[step('Fuel used',`${fmt(d)} km × ${fmt(c)} ÷ 100`,`${fmt(l)} L`),step('Fuel cost',`${fmt(l)} L × €${fmt(p)} / L`,`€${fmt(cost)}`),step('Cost per kilometre',`€${fmt(cost)} ÷ ${fmt(d)} km`,`€${fmt(cost/d)} / km`)]};toolOutput.innerHTML=`Fuel used: <strong>${fmt(l)} L</strong><br>Total cost: <strong>€${fmt(cost)}</strong><br>Cost per km: <strong>€${fmt(cost/d)}</strong>`;await toolResult(cost,`${fmt(d)} km × ${fmt(c)} L/100 km × €${fmt(p)}/L`,exp)}if(a==='energy'){const w=+energyPower.value,h=+energyHours.value,d=+energyDays.value,r=+energyRate.value,k=w/1000*h*d,cost=k*r;const exp={summary:`Watts are converted to kilowatts because electricity is billed in kWh.`,steps:[step('Convert watts to kilowatts',`${fmt(w)} W ÷ 1,000`,`${fmt(w/1000)} kW`),step('Energy used',`${fmt(w/1000)} kW × ${fmt(h)} h/day × ${fmt(d)} days`,`${fmt(k)} kWh`),step('Electricity cost',`${fmt(k)} kWh × €${fmt(r)} / kWh`,`€${fmt(cost)}`)]};toolOutput.innerHTML=`Energy: <strong>${fmt(k)} kWh</strong><br>Total cost: <strong>€${fmt(cost)}</strong>`;await toolResult(cost,`${fmt(w)} W × ${fmt(h)} h/day × ${fmt(d)} days × €${fmt(r)}/kWh`,exp)}if(a==='vat-add'||a==='vat-remove'){const n=+vatAmount.value,r=+vatRate.value/100,res=a==='vat-add'?n*(1+r):n/(1+r),v=a==='vat-add'?res-n:n-res;const exp=a==='vat-add'?{summary:`${r*100}% VAT is added to the original amount.`,steps:[step('Calculate VAT',`${fmt(n)} × ${r*100} ÷ 100`,fmt(v)),step('Add VAT',`${fmt(n)} + ${fmt(v)}`,fmt(res))]}:{summary:`When an amount already includes VAT, divide by 1 + the VAT rate to find the original price.`,steps:[step('Remove VAT',`${fmt(n)} ÷ (1 + ${r})`,fmt(res)),step('VAT amount',`${fmt(n)} − ${fmt(res)}`,fmt(Math.abs(v)))]};toolOutput.innerHTML=`Result: <strong>€${fmt(res)}</strong><br>VAT: <strong>€${fmt(Math.abs(v))}</strong>`;await toolResult(res,`€${fmt(n)} ${a==='vat-add'?'+ VAT':'including VAT at '+r*100+'%'}`,exp)}if(a==='units'){const v=+unitValue.value,c=unitCategory.value,f=unitFrom.value,t=unitTo.value,res=c==='temperature'?temp(v,f,t):v*units[c][f]/units[c][t];const exp={summary:`The value is converted using the relationship between the two units.`,steps:[step('Convert',`${fmt(v)} ${f} → ${t}`,`${fmt(res)} ${t}`)]};toolOutput.innerHTML=`<strong>${fmt(res)} ${t}</strong>`;await toolResult(res,`${fmt(v)} ${f} → ${t}`,exp)}}

async function refreshHistory(){const items=await getHistory();const list=$('#historyList');list.innerHTML=items.length?items.map(i=>`<div class="history-item"><button class="history-main" data-id="${i.id}"><div class="history-expression">${esc(i.expression)}</div><div class="history-result">${esc(i.result)}</div></button><button class="history-delete" data-id="${i.id}" aria-label="Delete calculation">×</button></div>`).join(''):'<div class="empty">No calculations yet.</div>';}

$$('.key').forEach(b=>b.onclick=()=>{const a=b.dataset.action,v=b.dataset.value;a==='clear'?clearAll():a==='backspace'?back():a==='equals'?calculate():append(v)});
$$('.tab').forEach(t=>t.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');currentMode=t.dataset.mode;renderTool(currentMode)});
$('#toolPanel').onclick=e=>e.target.dataset.toolAction&&perform(e.target.dataset.toolAction);
$('#toolPanel').onchange=e=>e.target.id==='unitCategory'&&populateUnits();
$('#historyButton').onclick=async()=>{$('#historyPanel').classList.toggle('hidden');if(!$('#historyPanel').classList.contains('hidden'))await refreshHistory()};
$('#clearHistory').onclick=async()=>{if(confirm('Delete all calculation history on this device?'))await clearHistory()};
$('#historyList').onclick=async e=>{const del=e.target.closest('.history-delete');if(del){await deleteHistory(del.dataset.id);return}const item=e.target.closest('.history-main');if(item){const all=await getHistory(),i=all.find(x=>String(x.id)===item.dataset.id);if(i){expression=i.expression;lastResult=Number(String(i.result).replace(/,/g,''));lastExplanation=i.explanation;display(lastResult);showHow(i.explanation)}}};
$('#copyButton').onclick=async()=>{try{await navigator.clipboard.writeText($('#result').textContent);$('#copyButton').textContent='Copied';setTimeout(()=>$('#copyButton').textContent='Copy result',900)}catch{}};
$('#howButton').onclick=()=>showHow();$('#closeHow').onclick=()=>$('#howPanel').classList.add('hidden');
$('#themeButton').onclick=()=>document.body.classList.toggle('light');
document.onkeydown=e=>{if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='Enter')calculate();else if(e.key==='Backspace')back();else if('0123456789.+-*/%()'.includes(e.key))append(e.key)};
renderTool('calc');refreshHistory();
