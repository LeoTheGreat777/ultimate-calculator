const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const VERSION='0.3.7';
let lang=localStorage.getItem('uc-lang')==='en'?'en':'el';
let mode='calc',expression='',current='',currentIsPercent=false,justCalculated=false,lastExpression='',lastResult=null,howData=null,lastOperation=null,historyClearConfirm=false,toolResult=null;

const T={
el:{calc:'Υπολογισμός',fuel:'Καύσιμα',energy:'Ενέργεια',vat:'ΦΠΑ',units:'Μονάδες',how:'Πώς υπολογίστηκε',history:'Ιστορικό',copy:'Αντιγραφή αποτελέσματος',copied:'Αντιγράφηκε',clear:'Διαγραφή όλων',confirm:'Διαγραφή όλου του ιστορικού;',confirmYes:'Διαγραφή',none:'Δεν υπάρχουν υπολογισμοί ακόμη.',hint:'Πληκτρολόγησε μια πράξη για να ξεκινήσεις.',delete:'Διαγραφή',created:'Δημιουργήθηκε από',fuelD:'Απόσταση (km)',fuelC:'Κατανάλωση (L/100 km)',fuelP:'Τιμή καυσίμου / L',fuelGo:'Υπολογισμός κόστους καυσίμου',fuelUsed:'Καύσιμο που χρησιμοποιήθηκε',costKm:'Κόστος ανά km',energyP:'Ισχύς (W)',energyH:'Ώρες / ημέρα',energyD:'Ημέρες',energyR:'Τιμή / kWh',energyGo:'Υπολογισμός κόστους ρεύματος',energyUsed:'Ενέργεια',amount:'Ποσό',vatRate:'ΦΠΑ %',addVat:'Πρόσθεσε ΦΠΑ',removeVat:'Αφαίρεσε ΦΠΑ',vatAmount:'Ποσό ΦΠΑ',value:'Τιμή',category:'Κατηγορία',from:'Από',to:'Σε',convert:'Μετατροπή',length:'Μήκος',mass:'Μάζα',volume:'Όγκος',data:'Δεδομένα',toolReady:'Το αποτέλεσμα θα εμφανιστεί εδώ',toolFuel:'Κόστος καυσίμου',toolEnergy:'Κόστος ρεύματος',toolVat:'Τελικό ποσό',toolUnit:'Αποτέλεσμα',fuelResult:'Καύσιμο που χρησιμοποιήθηκε',energyResult:'Ενέργεια',clearConfirm:'Διαγραφή;',close:'Κλείσιμο'},
en:{calc:'Calculator',fuel:'Fuel',energy:'Energy',vat:'VAT',units:'Units',how:'How was this calculated?',history:'History',copy:'Copy result',copied:'Copied',clear:'Clear all',confirm:'Delete all calculation history?',confirmYes:'Delete',none:'No calculations yet.',hint:'Enter a calculation to get started.',delete:'Delete',created:'Created by',fuelD:'Distance (km)',fuelC:'Consumption (L/100 km)',fuelP:'Fuel price / L',fuelGo:'Calculate fuel cost',fuelUsed:'Fuel used',costKm:'Cost per km',energyP:'Power (W)',energyH:'Hours / day',energyD:'Days',energyR:'Price / kWh',energyGo:'Calculate electricity cost',energyUsed:'Energy',amount:'Amount',vatRate:'VAT %',addVat:'Add VAT',removeVat:'Remove VAT',vatAmount:'VAT amount',value:'Value',category:'Category',from:'From',to:'To',convert:'Convert',length:'Length',mass:'Mass',volume:'Volume',data:'Data',toolReady:'The result will appear here',toolFuel:'Fuel cost',toolEnergy:'Electricity cost',toolVat:'Final amount',toolUnit:'Result',fuelResult:'Fuel used',energyResult:'Energy',clearConfirm:'Delete?',close:'Close'}
};
const ICONS={calc:'▦',fuel:'⛽',energy:'ϟ',vat:'%',units:'↔'};
const t=k=>T[lang][k]??T.en[k]??k;
const fmt=n=>Number.isFinite(Number(n))?new Intl.NumberFormat(lang==='el'?'el-GR':'en-US',{maximumFractionDigits:10}).format(Number(n)):'Error';
const pretty=s=>String(s).replace(/\*/g,'×').replace(/\//g,'÷');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function tokenize(input){
 const s=input.replace(/×/g,'*').replace(/÷/g,'/').replace(/,/g,'.').replace(/\s+/g,''),tokens=[];let i=0;
 while(i<s.length){const ch=s[i];
  if(/[0-9.]/.test(ch)){const start=i;let dots=0;while(i<s.length&&/[0-9.]/.test(s[i])){if(s[i]==='.')dots++;i++}if(dots>1)throw Error();const n=Number(s.slice(start,i));if(!Number.isFinite(n))throw Error();let percent=false;if(s[i]==='%'){percent=true;i++}tokens.push({type:'number',value:n,percent});continue}
  if('+-*/()'.includes(ch)){tokens.push({type:ch});i++;continue}throw Error()
 }return tokens
}
function evalExpr(input){
 const tokens=tokenize(input);let pos=0;
 function primary(){const tok=tokens[pos++];if(!tok)throw Error();if(tok.type==='('){const v=additive();if(!tokens[pos]||tokens[pos].type!==')')throw Error();pos++;return v}if(tok.type==='number')return{value:tok.value,percent:tok.percent};throw Error()}
 function mult(){let left=primary();while(tokens[pos]&&['*','/'].includes(tokens[pos].type)){const op=tokens[pos++].type,right=primary();if(op==='*')left={value:left.value*(right.percent?right.value/100:right.value),percent:false};else{const divisor=right.percent?right.value/100:right.value;if(divisor===0)throw Error();left={value:left.value/divisor,percent:false}}}return left}
 function additive(){let left=mult();while(tokens[pos]&&['+','-'].includes(tokens[pos].type)){const op=tokens[pos++].type,right=mult(),rv=right.percent?left.value*right.value/100:right.value;left={value:op==='+'?left.value+rv:left.value-rv,percent:false}}return left}
 const out=additive();if(pos!==tokens.length||!Number.isFinite(out.value))throw Error();return out.value
}
function percentExplanation(input,result){
 const m=String(input).match(/^(-?\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)%$/);if(!m)return null;
 const base=Number(m[1]),rate=Number(m[3]),part=base*rate/100,total=m[2]==='+'?base+part:base-part;
 return{formula:pretty(input),steps:[`${fmt(rate)}% ${lang==='el'?'του':'of'} ${fmt(base)} = ${fmt(part)}`,`${fmt(base)} ${m[2]==='+'?'+':'−'} ${fmt(part)} = ${fmt(total)}`],result:fmt(result)}
}
function resetHow(){howData=null;$('#howButton')?.classList.add('hidden')}
function render(){
 if(mode!=='calc')return;
 const display=justCalculated?fmt(lastResult):(pretty(expression+current)||'');
 $('#calculatorDisplay').classList.remove('tool-display','tool-empty');
 $('#calculatorDisplay').classList.toggle('calculated',justCalculated);
 $('#expression').textContent=justCalculated?pretty(lastExpression):'';
 $('#result').textContent=display;
 $('#clearButton').textContent=justCalculated?'AC':'C';
 $('#howButton').classList.toggle('hidden',!howData)
}
function renderToolDisplay(){
 const d=$('#calculatorDisplay');d.classList.add('tool-display');d.classList.remove('calculated','tool-empty');
 $('#expression').textContent=toolResult?.detail??'';
 $('#howButton').classList.add('hidden');
 $('#result').textContent=toolResult?.main??'';
 if(!toolResult)d.classList.add('tool-empty')
}
function clearAll(){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;lastOperation=null;resetHow();render()}
function clearCurrent(){resetHow();if(current){current='';currentIsPercent=false;render();return}clearAll()}
function backspace(){resetHow();if(justCalculated){clearAll();return}if(current){current=current.slice(0,-1);currentIsPercent=false}else if(expression)expression=expression.slice(0,-1);render()}
function digit(v){
 resetHow();
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(currentIsPercent){current=v;currentIsPercent=false;render();return}
 if(v==='.'&&current.includes('.'))return;
 if(v==='.'&&!current)current='0.';else if(current==='0'&&v!=='.')current=v;else current+=v;
 render()
}
function operator(op){
 resetHow();
 if(justCalculated){expression=String(lastResult);current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(!current&&!expression)return;
 if(current){expression+=current;current='';currentIsPercent=false}
 if(/[+\-×÷]$/.test(expression))expression=expression.slice(0,-1)+op;else expression+=op;
 render()
}
function percent(){resetHow();if(!current||currentIsPercent)return;current+='%';currentIsPercent=true;render()}
function parseLastOperation(full){const m=String(full).match(/^(.*?)([+\-×÷])(-?\d+(?:[.,]\d+)?%?)$/);return m?{op:m[2],rhs:m[3]}:null}
function repeatEquals(){
 if(!justCalculated||!lastOperation)return false;
 try{const rhs=lastOperation.rhs,base=String(lastResult),full=base+lastOperation.op+rhs,value=evalExpr(full);lastExpression=full;lastResult=value;justCalculated=true;howData=percentExplanation(full,value)||{formula:pretty(full),steps:[`${pretty(full)} = ${fmt(value)}`],result:fmt(value)};saveHistory({expression:full,result:value,how:howData});render();return true}catch{return false}
}
function equals(){
 if(justCalculated&&repeatEquals())return;
 const full=expression+current;if(!full||/[+\-×÷]$/.test(full))return;
 try{const value=evalExpr(full);lastExpression=full;lastResult=value;lastOperation=parseLastOperation(full);justCalculated=true;currentIsPercent=false;howData=percentExplanation(full,value)||{formula:pretty(full),steps:[`${pretty(full)} = ${fmt(value)}`],result:fmt(value)};saveHistory({expression:full,result:value,how:howData});render()}
 catch{current='Error';currentIsPercent=false;render();setTimeout(()=>{if(current==='Error'){current='';render()}},900)}
}
function showHow(){if(!howData)return;$('#howTitle').textContent=t('how');$('#howContent').innerHTML=`<div class="how-step"><div class="how-formula">${esc(howData.formula)}</div>${howData.steps.map((s,i)=>`<div class="how-line"><span>${i+1}</span>${esc(s)}</div>`).join('')}<div class="how-result">= ${esc(howData.result)}</div></div>`;$('#howModal').classList.remove('hidden')}
function closeHow(){$('#howModal').classList.add('hidden')}
function historyItems(){try{return JSON.parse(localStorage.getItem('uc-history')||'[]')}catch{return[]}}
function saveHistory(item){const list=historyItems();list.unshift({id:Date.now()+Math.random(),...item});localStorage.setItem('uc-history',JSON.stringify(list.slice(0,100)));renderHistory()}
function renderHistory(){const list=historyItems();$('#historyList').innerHTML=list.length?list.map(x=>`<div class="history-item"><button class="history-main" data-history="${x.id}" type="button"><div class="history-expression">${esc(pretty(x.expression))}</div><div class="history-result">${esc(fmt(x.result))}</div></button><button class="history-delete" data-delete="${x.id}" type="button" aria-label="${esc(t('delete'))}">×</button></div>`).join(''):`<div class="empty">${esc(t('none'))}</div>`}

const units={length:{mm:1,cm:.01,m:1,km:1000,in:.0254,ft:.3048,yd:.9144,mi:1609.344},mass:{mg:.000001,g:.001,kg:1,oz:.028349523125,lb:.45359237},volume:{ml:.001,l:1,tsp:.00492892159,tbsp:.0147867648,cup:.2365882365,gal:3.785411784},data:{B:1,KB:1024,MB:1048576,GB:1073741824,TB:1099511627776}};
const field=(id,label)=>`<label class="tool-field"><span>${esc(label)}</span><input id="${id}" type="number" step="any" inputmode="decimal"></label>`;
function setToolResult(main,detail=''){toolResult={main,detail};renderToolDisplay()}
function populateUnits(){const cat=$('#unitCategory');if(!cat)return;const keys=Object.keys(units[cat.value]);$('#unitFrom').innerHTML=keys.map(x=>`<option value="${x}">${x}</option>`).join('');$('#unitTo').innerHTML=keys.map(x=>`<option value="${x}">${x}</option>`).join('')}
function bindTools(){
 const fuelGo=$('#fuelGo');fuelGo?.addEventListener('click',()=>{const d=+$('#fuelD').value,c=+$('#fuelC').value,p=+$('#fuelP').value;if([d,c,p].some(x=>!Number.isFinite(x))||d===0)return;const used=d*c/100,cost=used*p;setToolResult(`${fmt(cost)} €`,`${t('fuelResult')}: ${fmt(used)} L · ${t('costKm')}: ${fmt(cost/d)} €/km`)});
 const energyGo=$('#energyGo');energyGo?.addEventListener('click',()=>{const p=+$('#energyP').value,h=+$('#energyH').value,d=+$('#energyD').value,r=+$('#energyR').value;if([p,h,d,r].some(x=>!Number.isFinite(x)))return;const kwh=p/1000*h*d,cost=kwh*r;setToolResult(`${fmt(cost)} €`,`${t('energyResult')}: ${fmt(kwh)} kWh`)});
 const vat=add=>{const a=+$('#amount').value,r=+$('#vatRate').value;if(!Number.isFinite(a)||!Number.isFinite(r))return;const total=add?a*(1+r/100):a/(1+r/100),tax=add?total-a:a-total;setToolResult(`${fmt(total)} €`,`${t('vatAmount')}: ${fmt(Math.abs(tax))} €`)};
 $('#addVat')?.addEventListener('click',()=>vat(true));$('#removeVat')?.addEventListener('click',()=>vat(false));
 $('#unitCategory')?.addEventListener('change',populateUnits);
 $('#convert')?.addEventListener('click',()=>{const v=+$('#value').value,c=$('#unitCategory').value,f=$('#unitFrom').value,to=$('#unitTo').value;if(!Number.isFinite(v))return;setToolResult(`${fmt(v*units[c][f]/units[c][to])} ${esc(to)}`)})
}
function modeIcon(m){return ICONS[m]||''}
function renderTool(){
 const calc=mode==='calc';
 $('#keypad').classList.toggle('hidden',!calc);
 $('#calculatorCard').classList.toggle('tool-mode',!calc);
 $('#toolPanel').classList.toggle('hidden',calc);
 if(calc){render();return}
 let html='';
 if(mode==='fuel')html=`<div class="tool-grid">${field('fuelD',t('fuelD'))}${field('fuelC',t('fuelC'))}${field('fuelP',t('fuelP'))}</div><button class="tool-action" id="fuelGo" type="button">${t('fuelGo')}</button>`;
 if(mode==='energy')html=`<div class="tool-grid">${field('energyP',t('energyP'))}${field('energyH',t('energyH'))}${field('energyD',t('energyD'))}${field('energyR',t('energyR'))}</div><button class="tool-action" id="energyGo" type="button">${t('energyGo')}</button>`;
 if(mode==='vat')html=`<div class="tool-grid">${field('amount',t('amount'))}${field('vatRate',t('vatRate'))}</div><div class="tool-grid tool-actions-row"><button class="tool-action" id="addVat" type="button">${t('addVat')}</button><button class="tool-action" id="removeVat" type="button">${t('removeVat')}</button></div>`;
 if(mode==='units')html=`<div class="tool-grid">${field('value',t('value'))}<label class="tool-field"><span>${t('category')}</span><select id="unitCategory"><option value="length">${t('length')}</option><option value="mass">${t('mass')}</option><option value="volume">${t('volume')}</option><option value="data">${t('data')}</option></select></label><label class="tool-field"><span>${t('from')}</span><select id="unitFrom"></select></label><label class="tool-field"><span>${t('to')}</span><select id="unitTo"></select></label></div><button class="tool-action" id="convert" type="button">${t('convert')}</button>`;
 $('#toolPanel').innerHTML=html;
 if(mode==='units')populateUnits();
 bindTools();
 renderToolDisplay()
}
function setMode(next){mode=next;expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;lastOperation=null;toolResult=null;resetHow();renderTool();syncModeButton()}
function applyLanguage(){
 document.documentElement.lang=lang;$('#langButton').textContent=lang==='el'?'ΕΛ':'EN';$('#historyButtonText').textContent=t('history');$('#copyButton').textContent=t('copy');$('#hint').textContent=t('hint');$('#createdBy').textContent=`${t('created')} Leonidas Kampaxis`;$('#historyTitle').textContent=t('history');$('#clearHistory').textContent=t('clear');renderTool();renderHistory();renderModeMenu();syncModeButton();render()
}
const MODE_LABELS=['calc','fuel','energy','vat','units'];
function renderModeMenu(){const menu=$('#modeMenu');if(!menu)return;menu.innerHTML=MODE_LABELS.map(m=>`<button class="mode-item ${m===mode?'active':''}" data-mode="${m}" type="button"><span class="mode-item-icon">${modeIcon(m)}</span><span class="mode-item-label">${esc(t(m))}</span>${m===mode?'<span class="mode-check">✓</span>':''}</button>`).join('');$$('.mode-item').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);closeModeMenu()}))}
function syncModeButton(){const label=$('#modeLabel');if(label)label.textContent=t(mode);const icon=$('#modeIcon');if(icon)icon.textContent=modeIcon(mode);renderModeMenu()}
function toggleModeMenu(){const m=$('#modeMenu');if(!m)return;m.classList.toggle('hidden');$('#modeButton').setAttribute('aria-expanded',String(!m.classList.contains('hidden')));if(!m.classList.contains('hidden'))renderModeMenu()}
function closeModeMenu(){$('#modeMenu')?.classList.add('hidden');$('#modeButton')?.setAttribute('aria-expanded','false')}

function openHistory(){const p=$('#historyPanel'),b=$('#historyBackdrop');renderHistory();p.classList.remove('hidden');b.classList.remove('hidden');requestAnimationFrame(()=>{p.classList.add('open');b.classList.add('open')});p.classList.remove('expanded');$('#historyList').scrollTop=0}
function closeHistory(){const p=$('#historyPanel'),b=$('#historyBackdrop');p.classList.remove('open','expanded');b.classList.remove('open');setTimeout(()=>{if(!p.classList.contains('open')){p.classList.add('hidden');b.classList.add('hidden')}},220)}
function setupHistorySheet(){
 const p=$('#historyPanel'),handle=$('.sheet-handle'),list=$('#historyList');let startY=0,tracking=false;
 const start=e=>{startY=e.touches[0].clientY;tracking=true;p.classList.add('dragging')};
 const end=e=>{if(!tracking)return;const dy=e.changedTouches[0].clientY-startY;tracking=false;p.classList.remove('dragging');if(dy<-35){p.classList.add('expanded');list.scrollTop=0}else if(dy>35&&list.scrollTop<=2){p.classList.remove('expanded')}startY=0};
 [p,handle].forEach(el=>{el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchend',end,{passive:true})});
 let timer;list.addEventListener('scroll',()=>{list.classList.add('is-scrolling');clearTimeout(timer);timer=setTimeout(()=>list.classList.remove('is-scrolling'),650)},{passive:true})
}
function clearHistoryConfirm(){
 historyClearConfirm=!historyClearConfirm;const wrap=$('#historyClearWrap'),btn=$('#clearHistory'),confirm=$('#historyConfirm');
 if(historyClearConfirm){btn.classList.add('hidden');confirm.classList.remove('hidden');$('#historyConfirmText').textContent=t('confirm')}else{btn.classList.remove('hidden');confirm.classList.add('hidden')}
 wrap.classList.toggle('confirming',historyClearConfirm)
}
function deleteAllHistory(){localStorage.removeItem('uc-history');historyClearConfirm=false;$('#clearHistory').classList.remove('hidden');$('#historyConfirm').classList.add('hidden');$('#historyClearWrap').classList.remove('confirming');renderHistory()}
function historyClick(e){
 const del=e.target.closest('[data-delete]'),item=e.target.closest('[data-history]');
 if(del){localStorage.setItem('uc-history',JSON.stringify(historyItems().filter(x=>String(x.id)!==del.dataset.delete)));renderHistory();return}
 if(item){const x=historyItems().find(x=>String(x.id)===item.dataset.history);if(!x)return;closeHistory();setMode('calc');lastExpression=x.expression;lastResult=Number(x.result);justCalculated=true;expression='';current='';currentIsPercent=false;howData=x.how||null;lastOperation=parseLastOperation(x.expression);render();syncModeButton()}
}
function copyResult(){const value=justCalculated?lastResult:(current||expression);if(value===''||!navigator.clipboard)return;navigator.clipboard.writeText(String(value)).then(()=>{const b=$('#copyButton');b.textContent=t('copied');setTimeout(()=>b.textContent=t('copy'),900)}).catch(()=>{})}

$('#keypad').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.action,v=b.dataset.value;if(a==='clear'){if(current)clearCurrent();else clearAll()}else if(a==='backspace')backspace();else if(a==='equals')equals();else if(v==='%')percent();else if(/[+\-*/]/.test(v||''))operator(v==='*'?'×':v==='/'?'÷':v);else if(v)digit(v)});
$('#howButton').addEventListener('click',showHow);$('#closeHow').addEventListener('click',closeHow);$('#howModal').addEventListener('click',e=>{if(e.target.id==='howModal')closeHow()});
$('#historyButton').addEventListener('click',openHistory);$('#historyBackdrop').addEventListener('click',closeHistory);$('#historyList').addEventListener('click',historyClick);$('#copyButton').addEventListener('click',copyResult);
$('#langButton').addEventListener('click',()=>{lang=lang==='el'?'en':'el';localStorage.setItem('uc-lang',lang);applyLanguage()});
$('#themeButton').addEventListener('click',()=>document.body.classList.toggle('light'));
$('#modeButton').addEventListener('click',e=>{e.stopPropagation();toggleModeMenu()});
 document.addEventListener('click',e=>{if(!e.target.closest('#modeButton')&&!e.target.closest('#modeMenu'))closeModeMenu();if(historyClearConfirm&&!e.target.closest('#historyClearWrap'))clearHistoryConfirm()});
$('#clearHistory').addEventListener('click',clearHistoryConfirm);$('#historyConfirmYes').addEventListener('click',deleteAllHistory);
window.addEventListener('keydown',e=>{
 if(mode!=='calc'||/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName))return;
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(/^[0-9]$/.test(e.key)||e.key==='.')digit(e.key);
 else if(['+','-','*','/'].includes(e.key))operator(e.key==='*'?'×':e.key==='/'?'÷':e.key);
 else if(e.key==='%')percent();
 else if(e.key==='Enter'||e.key==='='){e.preventDefault();equals()}
 else if(e.key==='Backspace'){e.preventDefault();backspace()}
 else if(e.key==='Escape'){e.preventDefault();clearAll()}
});
$('#version').textContent=`v${VERSION}`;$('#footerVersion').textContent=`v${VERSION}`;renderHistory();renderTool();renderModeMenu();syncModeButton();setupHistorySheet();applyLanguage();
