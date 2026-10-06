const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function readLanguage(){
 let stored='';
 try{stored=localStorage.getItem('uc-lang')||''}catch{}
 return stored==='en'||stored==='el'?stored:'el';
}
let lang=readLanguage();
let theme=localStorage.getItem('uc-theme')==='light'?'light':localStorage.getItem('uc-theme')==='dark'?'dark':'auto';
let mode='calc',expression='',current='',currentIsPercent=false,justCalculated=false,lastExpression='',lastResult=null,howData=null,lastOperation=null,historyClearConfirm=false,toolResult=null,toolActiveInput=null,resultCompact=false,unitActiveInput='from',unitExpressions={from:'',to:''};
localStorage.removeItem('uc-mode');

const T={
el:{calc:'Αριθμομηχανή',fuel:'Καύσιμα',energy:'Ενέργεια',vat:'ΦΠΑ',units:'Μονάδες',how:'Πώς υπολογίστηκε',history:'Ιστορικό',copy:'Αντιγραφή αποτελέσματος',copied:'Αντιγράφηκε',clear:'Διαγραφή όλων',confirm:'Διαγραφή όλου του ιστορικού;',confirmYes:'Διαγραφή',none:'Δεν υπάρχουν υπολογισμοί ακόμη.',hint:'Πληκτρολόγησε μια πράξη για να ξεκινήσεις.',delete:'Διαγραφή',created:'Δημιουργήθηκε από',fuelD:'Απόσταση (km)',fuelC:'Κατανάλωση (L/100 km)',fuelP:'Τιμή καυσίμου / L',fuelGo:'Υπολογισμός κόστους καυσίμου',fuelUsed:'Καύσιμο που χρησιμοποιήθηκε',costKm:'Κόστος ανά km',energyP:'Ισχύς (W)',energyH:'Ώρες / ημέρα',energyD:'Ημέρες',energyR:'Τιμή / kWh',energyGo:'Υπολογισμός κόστους ρεύματος',energyUsed:'Ενέργεια',amount:'Ποσό',vatRate:'ΦΠΑ %',addVat:'Πρόσθεσε ΦΠΑ',removeVat:'Αφαίρεσε ΦΠΑ',vatAmount:'Ποσό ΦΠΑ',value:'Τιμή',category:'Κατηγορία',from:'Από',to:'Σε',convert:'Μετατροπή',length:'Μήκος',mass:'Μάζα',volume:'Όγκος',data:'Δεδομένα',toolReady:'Το αποτέλεσμα θα εμφανιστεί εδώ',toolFuel:'Κόστος καυσίμου',toolEnergy:'Κόστος ρεύματος',toolVat:'Τελικό ποσό',toolUnit:'Αποτέλεσμα',fuelResult:'Καύσιμο που χρησιμοποιήθηκε',energyResult:'Ενέργεια',clearConfirm:'Διαγραφή;',close:'Κλείσιμο'},
en:{calc:'Calculator',fuel:'Fuel',energy:'Energy',vat:'VAT',units:'Units',how:'How was this calculated?',history:'History',copy:'Copy result',copied:'Copied',clear:'Clear all',confirm:'Delete all calculation history?',confirmYes:'Delete',none:'No calculations yet.',hint:'Enter a calculation to get started.',delete:'Delete',created:'Created by',fuelD:'Distance (km)',fuelC:'Consumption (L/100 km)',fuelP:'Fuel price / L',fuelGo:'Calculate fuel cost',fuelUsed:'Fuel used',costKm:'Cost per km',energyP:'Power (W)',energyH:'Hours / day',energyD:'Days',energyR:'Price / kWh',energyGo:'Calculate electricity cost',energyUsed:'Energy',amount:'Amount',vatRate:'VAT %',addVat:'Add VAT',removeVat:'Remove VAT',vatAmount:'VAT amount',value:'Value',category:'Category',from:'From',to:'To',convert:'Convert',length:'Length',mass:'Mass',volume:'Volume',data:'Data',toolReady:'The result will appear here',toolFuel:'Fuel cost',toolEnergy:'Electricity cost',toolVat:'Final amount',toolUnit:'Result',fuelResult:'Fuel used',energyResult:'Energy',clearConfirm:'Delete?',close:'Close'}
};
const ICONS={calc:'▦',fuel:'⛽',energy:'ϟ',vat:'%',units:'↔'};
const t=k=>T[lang][k]??T.en[k]??k;
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const t=a%b;a=b;b=t}return a};
function rat(n,d=1n){if(d===0n)throw Error('DIV0');if(d<0n){n=-n;d=-d}const g=gcd(n,d);return{n:n/g,d:d/g}}
const ratAdd=(a,b)=>rat(a.n*b.d+b.n*a.d,a.d*b.d),ratSub=(a,b)=>rat(a.n*b.d-b.n*a.d,a.d*b.d),ratMul=(a,b)=>rat(a.n*b.n,a.d*b.d),ratDiv=(a,b)=>{if(b.n===0n)throw Error('DIV0');return rat(a.n*b.d,a.d*b.n)};
function ratFromString(s){s=String(s).replace(',','.');let sign=1n;if(s[0]==='-'){sign=-1n;s=s.slice(1)}const [whole,frac='']=s.split('.');const digits=(whole||'0')+(frac||'');const scale=10n**BigInt(frac.length);return rat(sign*BigInt(digits||'0'),scale)}
function ratPercent(a){return rat(a.n,a.d*100n)}
function ratToDecimal(a,max=18){let sign=a.n<0n?'-':'';let n=a.n<0n?-a.n:a.n,d=a.d;const whole=n/d;let rem=n%d;if(rem===0n)return sign+whole.toString();let out='';for(let i=0;i<max&&rem;i++){rem*=10n;out+=String(rem/d);rem%=d}out=out.replace(/0+$/,'');return sign+whole.toString()+'.'+out}
function ratToNumber(a){const s=ratToDecimal(a,18);return Number(s)}
function formatRat(a,max=6){
 const s=ratToDecimal(a,max),num=Number(s);
 if(Number.isFinite(num)&&Math.abs(num)<1e15)return new Intl.NumberFormat(lang==='el'?'el-GR':'en-US',{maximumFractionDigits:max}).format(num);
 const raw=s; if(raw.length<=24)return raw;
 const neg=raw[0]==='-';const body=neg?raw.slice(1):raw;const [w,f='']=body.split('.');const exp=(w==='0'?-(f.search(/[1-9]/)+1):w.length-1);if(exp>=15||exp<=-6){const digits=(w==='0'?f.replace(/^0+/,''):w+f).replace(/0+$/,'');const mant=digits.length>1?digits[0]+'.'+digits.slice(1,Math.min(16,digits.length)):digits;return (neg?'-':'')+mant+' × 10'+(exp>=0?'^'+exp:'^'+exp)}return raw;
}
const fmt=n=>n&&typeof n==='object'&&'n'in n?formatRat(n,6):Number.isFinite(Number(n))?new Intl.NumberFormat(lang==='el'?'el-GR':'en-US',{maximumFractionDigits:6}).format(Number(n)):'Error';
const pretty=s=>String(s).replace(/\*/g,'×').replace(/\//g,'÷');
function formatGroupedNumber(raw){
 const s=String(raw);
 const sign=s.startsWith('-')?'-':'';
 const body=sign?s.slice(1):s;
 const [whole,frac]=body.split('.');
 const isGreek=lang==='el';
 const grouped=whole.replace(/\\B(?=(\\d{3})+(?!\\d))/g,isGreek?'.':',');
 const decimal=isGreek?',':'.';
 return sign+grouped+(frac!==undefined?decimal+frac:'');
}
function formatInputDisplay(s){
 return pretty(String(s)).replace(/\\d+(?:\\.\\d*)?/g,m=>formatGroupedNumber(m));
}

function tokenize(input){
 const s=String(input).replace(/×/g,'*').replace(/÷/g,'/').replace(/\s+/g,'');const tokens=[];let i=0;
 while(i<s.length){const ch=s[i];
  if(/[0-9.]/.test(ch)){const start=i;let dots=0;while(i<s.length&&/[0-9.]/.test(s[i])){if(s[i]==='.')dots++;i++}if(dots>1)throw Error('NUMBER');let raw=s.slice(start,i);if(s[i]==='%'){i++;tokens.push({type:'number',value:ratPercent(ratFromString(raw)),percent:true,raw:raw+'%'});}else tokens.push({type:'number',value:ratFromString(raw),percent:false,raw});continue}
  if('+-*/()'.includes(ch)){tokens.push({type:ch});i++;continue}throw Error('CHAR')
 }return tokens
}
function evalExpr(input){
 const tokens=tokenize(input);let pos=0;
 function primary(){const tok=tokens[pos++];if(!tok)throw Error('INCOMPLETE');if(tok.type==='('){const v=additive();if(!tokens[pos]||tokens[pos].type!==')')throw Error('PAREN');pos++;return{value:v,percent:false}}if(tok.type==='number')return{value:tok.value,percent:tok.percent};throw Error('SYNTAX')}
 function mult(){let left=primary();while(tokens[pos]&&['*','/'].includes(tokens[pos].type)){const op=tokens[pos++].type,right=primary();left={value:op==='*'?ratMul(left.value,right.value):ratDiv(left.value,right.value),percent:false}}return left}
 function additive(){let left=mult();while(tokens[pos]&&['+','-'].includes(tokens[pos].type)){const op=tokens[pos++].type,right=mult();const rv=right.percent?ratMul(left.value,right.value):right.value;left={value:op==='+'?ratAdd(left.value,rv):ratSub(left.value,rv),percent:false}}return left}
 const out=additive();if(pos!==tokens.length)throw Error('SYNTAX');return out.value
}

function explanationForExpression(input,result){
 let tokens;try{tokens=tokenize(input)}catch{return null}let pos=0;
 const primary=()=>{if(tokens[pos]?.type==='('){pos++;const child=additive();if(tokens[pos]?.type!==')')throw Error();pos++;return{type:'group',child}}const x=tokens[pos++];if(!x||x.type!=='number')throw Error();return{type:'number',value:x.value,percent:x.percent,raw:x.raw}};
 const mult=()=>{let left=primary();while(tokens[pos]&&['*','/'].includes(tokens[pos].type)){const op=tokens[pos++].type;left={type:'op',op,left,right:primary()}}return left};
 const additive=()=>{let left=mult();while(tokens[pos]&&['+','-'].includes(tokens[pos].type)){const op=tokens[pos++].type;left={type:'op',op,left,right:mult()}}return left};
 let tree;try{tree=additive();if(pos!==tokens.length)throw Error()}catch{return null}
 const renderNode=n=>n.type==='number'?n.raw:n.type==='group'?'('+renderNode(n.child)+')':renderNode(n.left)+n.op+renderNode(n.right);
 const steps=[];
 const walk=n=>{if(n.type==='number')return n.value;if(n.type==='group')return walk(n.child);const l=walk(n.left),r=walk(n.right),percent=n.right.type==='number'&&n.right.percent;const rv=percent&&['+','-'].includes(n.op)?ratMul(l,r):r;const v=n.op==='+'?ratAdd(l,rv):n.op==='-'?ratSub(l,rv):n.op==='*'?ratMul(l,rv):ratDiv(l,rv);const op=({'+':'+','-':'−','*':'×','/':'÷'})[n.op];if(percent&&['+','-'].includes(n.op)){const pct=ratDiv(r,ratFromString('0.01'));steps.push({title:lang==='el'?'Υπολόγισε το ποσοστό':'Calculate the percentage',text:formatRat(l)+' × '+formatRat(pct)+' ÷ 100 = '+formatRat(rv)});steps.push({title:lang==='el'?'Έπειτα':'Then',text:formatRat(l)+' '+op+' '+formatRat(rv)+' = '+formatRat(v)});}else steps.push({title:lang==='el'?'Υπολόγισε':'Calculate',text:pretty(renderNode(n.left))+' '+op+' '+pretty(renderNode(n.right))+' = '+formatRat(v)});return v};
 try{walk(tree)}catch{return null}return{formula:pretty(input),steps,result:formatRat(result)}
}

function resetHow(){howData=null;$('#howButton')?.classList.add('hidden')}
function applyTheme(){
 document.body.classList.toggle('light',theme==='light');
 document.documentElement.classList.toggle('force-dark',theme==='dark');
 document.documentElement.classList.toggle('force-light',theme==='light');
 const b=$('#themeButton');
 if(b){const dark=theme==='dark'||(theme==='auto'&&!matchMedia('(prefers-color-scheme: light)').matches);b.textContent=dark?'☾':'☀';b.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode')}
}
function toggleTheme(){
 const dark=theme==='dark'||(theme==='auto'&&!matchMedia('(prefers-color-scheme: light)').matches);
 theme=dark?'light':'dark';
 localStorage.setItem('uc-theme',theme);
 applyTheme();
}
function fitDisplayText(el,minSize){
 if(!el)return;
 el.classList.remove('near-limit');
 el.style.fontSize='';
 el.style.letterSpacing='';
 el.scrollLeft=0;
 requestAnimationFrame(()=>{
   if(!el.isConnected)return;
   const width=el.clientWidth;
   const contentWidth=el.scrollWidth;
   if(!width||contentWidth<=width+2)return;
   const base=parseFloat(getComputedStyle(el).fontSize);
   const target=Math.max(minSize,base*(width/contentWidth)*0.97);
   el.style.fontSize=target+'px';
   el.style.letterSpacing='-0.04em';
   el.scrollLeft=0;
 });
}
function render(){
 if(mode!=='calc')return;
 const raw=expression+current;
 const display=justCalculated?fmt(lastResult):(raw?formatInputDisplay(raw):'0');
 $('#calculatorDisplay').classList.remove('tool-display','tool-empty');
 $('#calculatorDisplay').classList.toggle('calculated',justCalculated);
 $('#expression').textContent=justCalculated?pretty(lastExpression):'';
 const exprEl=$('#expression');
 $('#result').textContent=display;
 $('#result').classList.remove('long-value','near-limit');
 const hasEntry=Boolean(raw);
 $('#clearButton').textContent=justCalculated||!hasEntry?'AC':'C';
 $('#howButton').classList.toggle('hidden',!howData);
 resultCompact=false;
 requestAnimationFrame(()=>{
   if(exprEl){
     if(justCalculated){
       exprEl.style.fontSize='';
       exprEl.style.letterSpacing='';
       exprEl.scrollLeft=0;
     }else{
       fitDisplayText(exprEl,14);
     }
   }
   const r=$('#result');
   if(r)fitDisplayText(r,32);
 });
}
function renderToolDisplay(){
 const d=$('#calculatorDisplay');
 d.classList.add('tool-display');
 d.classList.remove('calculated');
 $('#expression').textContent=toolResult?.detail??'';
 $('#howButton').classList.toggle('hidden',!toolResult?.how);
 $('#result').textContent=toolResult?.main??'';
 $('#result').classList.toggle('long-value',String(toolResult?.main??'').length>18);
 d.classList.toggle('tool-empty',!toolResult);
}
function clearAll(){resultCompact=false;expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;lastOperation=null;resetHow();render()}
function clearCurrent(){resetHow();if(current){current='';currentIsPercent=false;render();return}clearAll()}
function clearButtonAction(){
 if(justCalculated){clearAll();return}

 if(current){clearCurrent();return}
 if(expression){clearAll();return}
 clearAll();
}
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
 if(justCalculated){expression=ratToDecimal(lastResult,18);current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(!current&&!expression)return;
 if(current){expression+=current;current='';currentIsPercent=false}
 if(/[+\-×÷]$/.test(expression))expression=expression.slice(0,-1)+op;else expression+=op;
 render()
}
function percent(){resetHow();if(!current||currentIsPercent)return;current+='%';currentIsPercent=true;render()}
function parseLastOperation(full){const m=String(full).match(/^(.*?)([+\-×÷])(-?\d+(?:[.,]\d+)?%?)$/);return m?{op:m[2],rhs:m[3]}:null}
function repeatEquals(){
 if(!justCalculated||!lastOperation)return false;
 try{const rhs=lastOperation.rhs,base=ratToDecimal(lastResult,24),full=base+lastOperation.op+rhs,value=evalExpr(full);lastExpression=full;lastResult=value;justCalculated=true;howData=explanationForExpression(full,value)||{formula:pretty(full),steps:[`${pretty(full)} = ${fmt(value)}`],result:fmt(value)};saveHistory({expression:full,result:value,how:howData});render();return true}catch{return false}
}
function equals(){
 if(justCalculated&&repeatEquals())return;
 const full=expression+current;if(!full||/[+\-×÷]$/.test(full))return;
 try{const value=evalExpr(full);lastExpression=full;lastResult=value;lastOperation=parseLastOperation(full);justCalculated=true;currentIsPercent=false;howData=explanationForExpression(full,value)||{formula:pretty(full),steps:[`${pretty(full)} = ${fmt(value)}`],result:fmt(value)};saveHistory({expression:full,result:value,how:howData});render()}
 catch{current='Error';currentIsPercent=false;render();setTimeout(()=>{if(current==='Error'){current='';render()}},900)}
}
function showHow(){if(!howData)return;$('#howTitle').textContent=t('how');$('#howContent').innerHTML=`<div class="how-step"><div class="how-formula">${esc(howData.formula)}</div>${howData.steps.map((s,i)=>`<div class="how-line"><span>${i+1}</span><div><strong>${esc(s.title||'')}</strong><div>${esc(s.text||s)}</div></div></div>`).join('')}<div class="how-result">= ${esc(howData.result)}</div></div>`;$('#howModal').classList.remove('hidden')}
function closeHow(){$('#howModal').classList.add('hidden')}
function historyItems(){try{return JSON.parse(localStorage.getItem('uc-history')||'[]')}catch{return[]}}
function saveHistory(item){const list=historyItems();const stored={...item,result:item.result&&typeof item.result==='object'&&'n'in item.result?ratToDecimal(item.result,24):String(item.result)};list.unshift({id:Date.now()+Math.random(),...stored});localStorage.setItem('uc-history',JSON.stringify(list.slice(0,100)));renderHistory()}
function renderHistory(){const list=historyItems();$('#historyList').innerHTML=list.length?list.map(x=>`<div class="history-item"><button class="history-main" data-history="${x.id}" type="button"><div class="history-expression">${esc(pretty(x.expression))}</div><div class="history-result">${esc(fmt(x.result&&typeof x.result==='string'?ratFromString(x.result):x.result))}</div></button><button class="history-delete" data-delete="${x.id}" type="button" aria-label="${esc(t('delete'))}">×</button></div>`).join(''):`<div class="empty">${esc(t('none'))}</div>`}

const units={length:{mm:.001,cm:.01,m:1,km:1000,in:.0254,ft:.3048,yd:.9144,mi:1609.344},mass:{mg:.000001,g:.001,kg:1,oz:.028349523125,lb:.45359237},volume:{ml:.001,l:1,tsp:.00492892159,tbsp:.0147867648,cup:.2365882365,gal:3.785411784},data:{B:1,KB:1024,MB:1048576,GB:1099511627776}};
function unitEvaluate(expr){
 const raw=String(expr??'').trim().replace(/,/g,'.').replace(/×/g,'*').replace(/÷/g,'/');
 if(!raw||/[-+*/.]$/.test(raw)||!/^[0-9+*/().\s-]+$/.test(raw))return null;
 try{return ratToNumber(evalExpr(raw))}catch{return null}
}
function unitValueFormat(n){
 if(!Number.isFinite(n))return '';
 const abs=Math.abs(n);
 const max=abs!==0&&abs<1?Math.min(15,Math.max(6,Math.ceil(-Math.log10(abs))+6)):Math.min(12,Math.max(2,String(Math.trunc(abs)).length<7?6:4));
 return new Intl.NumberFormat(lang==='el'?'el-GR':'en-US',{maximumFractionDigits:max,useGrouping:true}).format(n);
}
function renderUnitsDisplay(){
 const d=$('#calculatorDisplay');
 d.className='display-wrap unit-display';
 d.innerHTML='<div class="unit-display-toolbar"><select id="unitCategory" class="conversion-category">'+Object.keys(units).map(x=>'<option value="'+x+'">'+esc(t(x))+'</option>').join('')+'</select><button id="unitSwap" class="conversion-swap" type="button" aria-label="Swap units">⇄</button></div><div class="unit-rows"><div class="unit-row" data-unit-row="from"><input id="unitValueFrom" class="unit-value" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="" aria-label="'+esc(t('from'))+'"><select id="unitFrom" class="unit-unit"></select></div><div class="unit-row" data-unit-row="to"><input id="unitValueTo" class="unit-value" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="" aria-label="'+esc(t('to'))+'"><select id="unitTo" class="unit-unit"></select></div></div>';
 const cat=$('#unitCategory');
 cat.value=window._unitCategory||'length';
 populateUnits();
 const touchDevice=matchMedia('(hover:none) and (pointer:coarse)').matches || 'ontouchstart' in window;
 $('#unitValueFrom,#unitValueTo').forEach(input=>{input.readOnly=touchDevice;input.setAttribute('inputmode',touchDevice?'none':'decimal');input.dataset.unitInput=input.id==='unitValueFrom'?'from':'to'});
 $('#unitValueFrom,#unitValueTo').forEach(input=>input.addEventListener('focus',()=>{unitActiveInput=input.dataset.unitInput}));
 $('#unitValueFrom,#unitValueTo').forEach(input=>input.addEventListener('input',()=>{unitActiveInput=input.dataset.unitInput;unitExpressions[unitActiveInput]=input.value;convertUnitExpression(unitActiveInput)}));
 $('#unitFrom,#unitTo').forEach(select=>select.addEventListener('change',()=>{unitActiveInput=select.id==='unitFrom'?'from':'to';convertUnitExpression(unitActiveInput)}));
 cat.addEventListener('change',()=>{window._unitCategory=cat.value;unitExpressions={from:'',to:''};unitActiveInput='from';populateUnits();updateUnitsDisplay()});
 $('#unitSwap').addEventListener('click',()=>{const a=$('#unitFrom'),b=$('#unitTo');[a.value,b.value]=[b.value,a.value];[unitExpressions.from,unitExpressions.to]=[unitExpressions.to,unitExpressions.from];unitActiveInput=unitExpressions.from?'from':'to';convertUnitExpression(unitActiveInput)});
 updateUnitsDisplay();
}
function updateUnitsDisplay(){
 const from=$('#unitValueFrom'),to=$('#unitValueTo');
 if(!from||!to)return;
 from.value=unitExpressions.from||'';to.value=unitExpressions.to||'';
 $('.unit-row').forEach(row=>row.classList.toggle('active',row.dataset.unitRow===unitActiveInput));
 const clear=$('#clearButton');if(clear)clear.textContent=(unitExpressions.from||unitExpressions.to)?'C':'AC';
}
function convertUnitExpression(source='from'){
 const cc=$('#unitCategory')?.value,fu=$('#unitFrom')?.value,tu=$('#unitTo')?.value;
 if(!cc||!fu||!tu)return;
 const expr=unitExpressions[source]||'';
 if(!expr.trim()){unitExpressions[source]='';unitExpressions[source==='from'?'to':'from']='';updateUnitsDisplay();return}
 const value=unitEvaluate(expr);
 if(value===null){unitExpressions[source==='from'?'to':'from']='';updateUnitsDisplay();return}
 const out=source==='from'?value*units[cc][fu]/units[cc][tu]:value*units[cc][tu]/units[cc][fu];
 unitExpressions[source==='from'?'to':'from']=unitValueFormat(out);
 updateUnitsDisplay();
}
window._runUnits=()=>convertUnitExpression(unitActiveInput);
const FIELD_EXAMPLES={fuelD:'250',fuelC:'7.2',fuelP:'1.85',energyP:'100',energyH:'8',energyD:'30',energyR:'0.20',amount:'100',vatRate:'24%',value:'10'};
const TOOL_DEFAULTS={fuelD:250,fuelC:7.2,fuelP:1.85,energyP:100,energyH:8,energyD:30,energyR:0.20,amount:100,vatRate:24,value:10};
let vatAction='add';
const unitOptions=(category,selected)=>Object.keys(units[category]||{}).map(x=>'<option value="'+x+'"'+(x===selected?' selected':'')+'>'+x+'</option>').join('');
const toolNumber=id=>{const raw=($('#'+id)?.value??'').trim().replace(',','.');return raw===''?Number(TOOL_DEFAULTS[id]):Number(raw)};
const liveToolNumber=id=>{const raw=($('#'+id)?.value??'').trim().replace(',','.');if(raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null};
const field=(id,label)=>'<label class="tool-field"><span>'+esc(label)+'</span><input id="'+id+'" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="'+(FIELD_EXAMPLES[id]||'')+'" data-tool-input="true"></label>';
function setToolResult(main,detail='',how=null){toolResult={main,detail,how};howData=how;renderToolDisplay();}
function renderVatToggle(){ $$('#toolPanel [data-vat-mode]').forEach(b=>b.classList.toggle('active',b.dataset.vatMode===vatAction)); }
function populateUnits(){
 const cat=$('#unitCategory'),from=$('#unitFrom'),to=$('#unitTo');
 if(!cat||!from||!to)return;
 const category=cat.value||'length';
 const keys=Object.keys(units[category]||{});
 const oldFrom=from.value,oldTo=to.value;
 from.innerHTML=unitOptions(category,keys.includes(oldFrom)?oldFrom:keys[0]);
 to.innerHTML=unitOptions(category,keys.includes(oldTo)?oldTo:(keys[1]||keys[0]));
}
function closeUnitMenus(except=null){$$('.unit-select-menu').forEach(menu=>{if(menu!==except)menu.classList.add('hidden')})}
function liveUnitFormat(n){
 if(!Number.isFinite(n))return '';
 const abs=Math.abs(n);
 const max=Math.min(12,abs!==0&&abs<1?Math.max(6,Math.ceil(-Math.log10(abs))+6):6);
 return new Intl.NumberFormat(lang==='el'?'el-GR':'en-US',{maximumFractionDigits:max,useGrouping:false}).format(n);
}
function bindTools(){
 const fuelCalculate=()=>{
  const d=liveToolNumber('fuelD'),c=liveToolNumber('fuelC'),p=liveToolNumber('fuelP');
  if(d===null||c===null||p===null||d===0){setToolResult('','',null);return}
  const used=d*c/100,cost=used*p;
  const how={formula:fmt(d)+' km × '+fmt(c)+' L/100 km × '+fmt(p)+' €/L',steps:[
   {title:lang==='el'?'Υπολόγισε τα λίτρα':'Calculate fuel used',text:fmt(d)+' × '+fmt(c)+' ÷ 100 = '+fmt(used)+' L'},
   {title:lang==='el'?'Υπολόγισε το κόστος':'Calculate cost',text:fmt(used)+' L × '+fmt(p)+' €/L = '+fmt(cost)+' €'},
   {title:lang==='el'?'Κόστος ανά km':'Cost per km',text:fmt(cost)+' € ÷ '+fmt(d)+' km = '+fmt(cost/d)+' €/km'}],result:fmt(cost)+' €'};
  setToolResult(fmt(cost)+' €',t('fuelResult')+': '+fmt(used)+' L · '+t('costKm')+': '+fmt(cost/d)+' €/km',how)
 };
 window._runFuel=fuelCalculate;
 const energyCalculate=()=>{
  const p=liveToolNumber('energyP'),hh=liveToolNumber('energyH'),d=liveToolNumber('energyD'),r=liveToolNumber('energyR');
  if([p,hh,d,r].some(x=>x===null)){setToolResult('','',null);return}
  const kwh=p/1000*hh*d,cost=kwh*r;
  const how={formula:fmt(p)+' W ÷ 1000 × '+fmt(hh)+' h/day × '+fmt(d)+' days',steps:[
   {title:lang==='el'?'Μετέτρεψε W σε kW':'Convert W to kW',text:fmt(p)+' W ÷ 1000 = '+fmt(p/1000)+' kW'},
   {title:lang==='el'?'Υπολόγισε την ενέργεια':'Calculate energy',text:fmt(p/1000)+' kW × '+fmt(hh)+' × '+fmt(d)+' = '+fmt(kwh)+' kWh'},
   {title:lang==='el'?'Υπολόγισε το κόστος':'Calculate cost',text:fmt(kwh)+' kWh × '+fmt(r)+' €/kWh = '+fmt(cost)+' €'}],result:fmt(cost)+' €'};
  setToolResult(fmt(cost)+' €',t('energyResult')+': '+fmt(kwh)+' kWh',how)
 };
 window._runEnergy=energyCalculate;
 const vat=add=>{
  const aa=liveToolNumber('amount'),r=liveToolNumber('vatRate');
  if(aa===null||r===null){setToolResult('','',null);return}
  const total=add?aa*(1+r/100):aa/(1+r/100),tax=add?total-aa:aa-total;
  const how={formula:add?fmt(aa)+' € + '+fmt(r)+'% VAT':fmt(aa)+' € with '+fmt(r)+'% VAT',steps:add?[
   {title:lang==='el'?'Υπολόγισε τον ΦΠΑ':'Calculate VAT',text:fmt(aa)+' × '+fmt(r)+' ÷ 100 = '+fmt(tax)+' €'},
   {title:lang==='el'?'Πρόσθεσε τον ΦΠΑ':'Add VAT',text:fmt(aa)+' + '+fmt(tax)+' = '+fmt(total)+' €'}]:[
   {title:lang==='el'?'Αφαίρεσε τον ΦΠΑ':'Remove VAT',text:fmt(aa)+' ÷ (1 + '+fmt(r)+' ÷ 100) = '+fmt(total)+' €'},
   {title:lang==='el'?'Ποσό ΦΠΑ':'VAT amount',text:fmt(aa)+' - '+fmt(total)+' = '+fmt(Math.abs(tax))+' €'}],result:fmt(total)+' €'};
  setToolResult(fmt(total)+' €',t('vatAmount')+': '+fmt(Math.abs(tax))+' €',how)
 };
 window._runVat=vat;
 const convertUnits=()=>{
  const cc=$('#unitCategory')?.value,ff=$('#unitFrom')?.value,to=$('#unitTo')?.value;
  const from=$('#unitValueFrom'),target=$('#unitValueTo');
  if(!cc||!ff||!to||!from||!target)return;
  const raw=from.value.trim().replace(',','.');
  if(raw===''){target.value='';setToolResult('','',null);return}
  const v=Number(raw);
  if(!Number.isFinite(v)||units[cc]?.[ff]===undefined||units[cc]?.[to]===undefined)return;
  const out=v*units[cc][ff]/units[cc][to];
  target.value=liveUnitFormat(out);
  const how={formula:liveUnitFormat(v)+' '+ff+' → '+to,steps:[{title:lang==='el'?'Μετέτρεψε την τιμή':'Convert the value',text:liveUnitFormat(v)+' '+ff+' = '+liveUnitFormat(out)+' '+to}],result:liveUnitFormat(out)+' '+to};
  setToolResult(liveUnitFormat(out)+' '+to,t('toolUnit')+': '+liveUnitFormat(out)+' '+to,how)
 };
 window._runUnits=convertUnits;
 populateUnits();
}
function modeIcon(m){return ICONS[m]||''}
function renderCalcKeypad(){
 $('#keypad').className='keypad';
 $('#keypad').innerHTML='<button class="key utility" data-action="backspace" type="button" aria-label="Delete">⌫</button><button id="clearButton" class="key utility" data-action="clear" type="button">AC</button><button class="key utility" data-value="%" type="button">%</button><button class="key operator" data-value="/" type="button">÷</button><button class="key" data-value="7" type="button">7</button><button class="key" data-value="8" type="button">8</button><button class="key" data-value="9" type="button">9</button><button class="key operator" data-value="*" type="button">×</button><button class="key" data-value="4" type="button">4</button><button class="key" data-value="5" type="button">5</button><button class="key" data-value="6" type="button">6</button><button class="key operator" data-value="-" type="button">−</button><button class="key" data-value="1" type="button">1</button><button class="key" data-value="2" type="button">2</button><button class="key" data-value="3" type="button">3</button><button class="key operator" data-value="+" type="button">+</button><button class="key wide" data-value="0" type="button">0</button><button class="key" data-value="." type="button">.</button><button class="key equals" data-action="equals" type="button">=</button>';
}
function renderToolKeypad(){
 $('#keypad').className='tool-keypad';
 $('#keypad').innerHTML=
   '<button class="tool-key tool-utility" data-action="backspace" type="button" aria-label="Delete">⌫</button><button class="tool-key tool-utility tool-key-wide-utility" data-action="clear" type="button">C</button>'+
   '<button class="tool-key" data-value="7" type="button">7</button><button class="tool-key" data-value="8" type="button">8</button><button class="tool-key" data-value="9" type="button">9</button>'+
   '<button class="tool-key" data-value="4" type="button">4</button><button class="tool-key" data-value="5" type="button">5</button><button class="tool-key" data-value="6" type="button">6</button>'+
   '<button class="tool-key" data-value="1" type="button">1</button><button class="tool-key" data-value="2" type="button">2</button><button class="tool-key" data-value="3" type="button">3</button>'+
   '<button class="tool-key tool-key-wide" data-value="0" type="button">0</button><button class="tool-key" data-value="." type="button">.</button>';
}
function renderTool(){
 const calc=mode==='calc';
 if(mode==='units'){
   $('#calculatorCard').classList.add('tool-mode');
   $('#toolPanel').classList.add('hidden');
   $('#calculatorDisplay').classList.remove('hidden');
   renderUnitsDisplay();
   renderCalcKeypad();
   return;
 }
 $('#calculatorCard').classList.toggle('tool-mode',!calc);
 $('#toolPanel').classList.toggle('hidden',calc);
 $('#calculatorDisplay').classList.toggle('tool-display',!calc);
 $('#calculatorDisplay').classList.remove('hidden');
 if(calc){renderCalcKeypad();render();return}
 let html='';
 if(mode==='fuel')html='<div class="tool-grid">'+field('fuelD',t('fuelD'))+field('fuelC',t('fuelC'))+field('fuelP',t('fuelP'))+'</div>';
 if(mode==='energy')html='<div class="tool-grid">'+field('energyP',t('energyP'))+field('energyH',t('energyH'))+field('energyD',t('energyD'))+field('energyR',t('energyR'))+'</div>';
 if(mode==='vat')html='<div class="tool-grid">'+field('amount',t('amount'))+field('vatRate',t('vatRate'))+'</div><div class="vat-toggle" role="group"><button type="button" data-vat-mode="add">'+esc(t('addVat'))+'</button><button type="button" data-vat-mode="remove">'+esc(t('removeVat'))+'</button></div>';
 if(mode==='units')html='';
 $('#toolPanel').innerHTML=html;
 renderToolKeypad();
 toolActiveInput=null;
 const touchDevice=matchMedia('(hover:none) and (pointer:coarse)').matches || 'ontouchstart' in window;
 $('#toolPanel input[data-tool-input]').forEach(input=>{input.readOnly=touchDevice;input.setAttribute('inputmode',touchDevice?'none':'decimal');if(touchDevice)input.setAttribute('readonly','readonly');else input.removeAttribute('readonly')});
 bindTools();
 renderVatToggle();
 renderToolDisplay();
}
function setMode(next){resultCompact=false;mode=next;expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;lastOperation=null;toolResult=null;resetHow();if(next==='units'){unitExpressions={from:'',to:''};unitActiveInput='from';window._unitCategory=window._unitCategory||'length';}const label=$('#modeLabel'),icon=$('#modeIcon');if(label)label.textContent=t(mode);if(icon)icon.textContent=modeIcon(mode);renderTool();syncModeButton();}
function applyLanguage(){
 document.documentElement.lang=lang;$('#langButton').textContent=lang==='el'?'ΕΛ':'EN';$('#historyButtonText').textContent=t('history');$('#copyButton').textContent=t('copy');const hint=$('#hint');if(hint)hint.textContent=t('hint');$('#createdBy').textContent=`${t('created')} Leonidas Kampaxis`;$('#historyTitle').textContent=t('history');$('#clearHistory').textContent=t('clear');
 if(mode==='calc'&&justCalculated&&lastExpression&&lastResult!==null)howData=explanationForExpression(lastExpression,lastResult)||howData;
 renderTool();renderHistory();renderModeMenu();syncModeButton();render()
}
const MODE_LABELS=['calc','fuel','energy','vat','units'];
function renderModeMenu(){
 const menu=$('#modeMenu');if(!menu)return;
 menu.innerHTML=MODE_LABELS.filter(m=>m!==mode).map(m=>`<button class="mode-item" data-mode="${m}" type="button"><span class="mode-item-icon">${modeIcon(m)}</span><span class="mode-item-label">${esc(t(m))}</span></button>`).join('');
 menu.querySelectorAll('.mode-item').forEach(b=>b.addEventListener('click',e=>{
   e.stopPropagation();
   const next=b.dataset.mode;
   closeModeMenu();
   setMode(next);
 }));
}
function syncModeButton(){
 const label=$('#modeLabel'),icon=$('#modeIcon'),button=$('#modeButton');
 if(label)label.textContent=t(mode);
 if(icon)icon.textContent=modeIcon(mode);
 if(button){button.dataset.mode=mode;button.setAttribute('aria-label',t(mode));}
 renderModeMenu();
}
function toggleModeMenu(){
 const menu=$('#modeMenu'),control=$('.mode-control'),button=$('#modeButton');
 if(!menu||!control||!button)return;
 const open=!control.classList.contains('mode-open');
 if(open){
   renderModeMenu();
   menu.classList.remove('hidden');
   control.classList.add('mode-open');
 }else{
   control.classList.remove('mode-open');
   menu.classList.add('hidden');
 }
 button.setAttribute('aria-expanded',String(open));
}
function closeModeMenu(){
 const menu=$('#modeMenu'),control=$('.mode-control');
 if(control)control.classList.remove('mode-open');
 if(menu)menu.classList.add('hidden');
 $('#modeButton')?.setAttribute('aria-expanded','false');
}

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
 if(item){const x=historyItems().find(x=>String(x.id)===item.dataset.history);if(!x)return;closeHistory();setMode('calc');lastExpression=x.expression;lastResult=ratFromString(String(x.result));justCalculated=true;expression='';current='';currentIsPercent=false;howData=x.how||null;lastOperation=parseLastOperation(x.expression);render();syncModeButton()}
}
function copyResult(){
 const value=mode==='calc'?(justCalculated?ratToDecimal(lastResult,24):(current||expression)):(toolResult?.main??'');
 if(value===''||value===t('toolReady')||!navigator.clipboard)return;
 navigator.clipboard.writeText(String(value)).then(()=>{const b=$('#copyButton');b.textContent=t('copied');setTimeout(()=>b.textContent=t('copy'),900)}).catch(()=>{})
}
function toolKeyInput(key){
 if(mode==='units'){
   const side=unitActiveInput||'from';
   let value=unitExpressions[side]||'';
   if(key==='clear'){unitExpressions={from:'',to:''};unitActiveInput='from';updateUnitsDisplay();return true}
   if(key==='backspace')value=value.slice(0,-1);
   else if(key==='.'||key===',')value.includes('.')?value:value+'.';
   else if(key==='-')value=value.startsWith('-')?value.slice(1):'-'+value;
   else if(/^[0-9]$/.test(key))value+=key;
   else if(['+','*','/'].includes(key))value+=key;
   else return false;
   unitExpressions[side]=value;convertUnitExpression(side);return true;
 }
 const input=toolActiveInput&&toolActiveInput.matches('#toolPanel input')?toolActiveInput:$('#toolPanel input');
 if(!input)return false;
 input.focus();
 let value=input.value;
 if(key==='clear')value='';
 else if(key==='backspace')value=value.slice(0,-1);
 else if(key==='.'||key===',')value.includes('.')?value:value+'.';
 else if(key==='-')value=value.startsWith('-')?value.slice(1):'-'+value;
 else if(/^\d$/.test(key))value+=key;
 else return false;
 input.value=value;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 return true;
}
function runActiveTool(){
 if(mode==='fuel'){window._runFuel?.();return}
 if(mode==='energy'){window._runEnergy?.();return}
 if(mode==='vat'){window._runVat?.(true);return}
 if(mode==='units'){window._runUnits?.();return}
}
$('#keypad').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 const a=b.dataset.action,v=b.dataset.value;
 if(mode!=='calc'){
   if(mode==='units'){
     if(a==='clear'||a==='backspace'||v==='.'||/^\d$/.test(v||'')||['+','-','*','/'].includes(v||'')){toolKeyInput(a==='clear'?'clear':a==='backspace'?'backspace':v==='/'?'/':v);return}
     if(a==='equals')window._runUnits?.();
     return;
   }
   if(a==='clear'||a==='backspace'||v==='.'||/^\d$/.test(v||'')){toolKeyInput(a==='clear'?'clear':a==='backspace'?'backspace':v);return}
   if(v==='-'){toolKeyInput('-');return}
   return;
 }
 if(a==='clear')clearButtonAction();else if(a==='backspace')backspace();else if(a==='equals')equals();else if(v==='%')percent();else if(/[+\-*/]/.test(v||''))operator(v==='*'?'×':v==='/'?'÷':v);else if(v)digit(v)
});
$('#toolPanel').addEventListener('change',e=>{
 if(e.target.matches('#unitCategory')){
   populateUnits();
   const from=$('#unitValueFrom'),to=$('#unitValueTo');
   if(from)from.value='';
   if(to)to.value='';
   setToolResult('','',null);
 }
 if(e.target.matches('#unitFrom,#unitTo')&&mode==='units')window._runUnits?.();
 if(e.target.matches('[data-vat-mode]')){
   vatAction=e.target.dataset.vatMode==='remove'?'remove':'add';
   renderVatToggle();
   window._runVat?.(vatAction==='add');
 }
});
$('#toolPanel').addEventListener('focusin',e=>{if(e.target.matches('input'))toolActiveInput=e.target});
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
 const input=e.target;
 let value=input.value.replace(/,/g,'.').replace(/[^0-9.-]/g,'');
 if(value.startsWith('-'))value='-'+value.slice(1).replace(/-/g,'');
 else value=value.replace(/-/g,'');
 const firstDot=value.indexOf('.');
 if(firstDot!==-1)value=value.slice(0,firstDot+1)+value.slice(firstDot+1).replace(/\./g,'');
 if(value!==input.value){
   const pos=input.selectionStart??value.length;
   input.value=value;
   input.setSelectionRange(Math.min(pos,value.length),Math.min(pos,value.length));
 }
 if(mode==='fuel')window._runFuel?.();
 else if(mode==='energy')window._runEnergy?.();
 else if(mode==='vat')window._runVat?.(vatAction==='add');
 else if(mode==='units'){unitActiveInput=input.id==='unitValueFrom'?'from':'to';unitExpressions[unitActiveInput]=input.value;convertUnitExpression(unitActiveInput)}
});
$('#howButton').addEventListener('click',showHow);$('#closeHow').addEventListener('click',closeHow);$('#howModal').addEventListener('click',e=>{if(e.target.id==='howModal')closeHow()});
$('#historyButton').addEventListener('click',openHistory);$('#historyBackdrop').addEventListener('click',closeHistory);$('#historyList').addEventListener('click',historyClick);$('#copyButton').addEventListener('click',copyResult);
$('#langButton').addEventListener('click',()=>{
 lang=lang==='el'?'en':'el';
 try{localStorage.setItem('uc-lang',lang)}catch{}
 document.cookie='uc-lang='+lang+'; path=/; max-age=31536000; SameSite=Lax';
 applyLanguage();
});
$('#themeButton').addEventListener('click',toggleTheme);
$('#modeButton').addEventListener('click',e=>{e.stopPropagation();toggleModeMenu()});
 document.addEventListener('click',e=>{if(!e.target.closest('#modeButton')&&!e.target.closest('#modeMenu'))closeModeMenu();if(!e.target.closest('.unit-select')&&!e.target.closest('.unit-select-menu'))closeUnitMenus();if(historyClearConfirm&&!e.target.closest('#historyClearWrap'))clearHistoryConfirm()});
$('#clearHistory').addEventListener('click',clearHistoryConfirm);$('#historyConfirmYes').addEventListener('click',deleteAllHistory);
window.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Backspace'||e.code==='Backspace'){e.preventDefault();if(mode==='calc')backspace();else toolKeyInput('backspace');return;}
 if(e.key===','){e.preventDefault();if(mode==='calc')digit('.');else if(document.activeElement?.matches('#toolPanel input')){const input=document.activeElement;if(!input.value.includes('.')){const pos=input.selectionStart??input.value.length;input.setRangeText('.',pos,pos,'end')}}else toolKeyInput('.');return}
 if(mode==='units'&&document.activeElement?.matches('#unitValueFrom,#unitValueTo')){
   if(e.key==='Escape'){e.preventDefault();document.activeElement.value='';document.activeElement.dispatchEvent(new Event('input',{bubbles:true}));return}
   return;
 }
 if(mode!=='calc')return;
 if(/^[0-9]$/.test(e.key)||e.key==='.')digit(e.key);
 else if(['+','-','*','/'].includes(e.key))operator(e.key==='*'?'×':e.key==='/'?'÷':e.key);
 else if(e.key==='%')percent();
 else if(e.key==='Enter'||e.key==='='){e.preventDefault();equals()}
 else if(e.key==='Backspace'){e.preventDefault();backspace()}
 else if(e.key==='Escape'){
   e.preventDefault();
   if(!$('#howModal').classList.contains('hidden')){closeHow();return}
   if(!$('#historyPanel').classList.contains('hidden')){closeHistory();return}
   if($('.mode-control')?.classList.contains('mode-open')){closeModeMenu();return}
   clearAll();
 }
});
$('#footerVersion').textContent=`v${VERSION}`;renderHistory();renderTool();renderModeMenu();syncModeButton();setupHistorySheet();applyLanguage();applyTheme();window.addEventListener('pageshow',e=>{if(e.persisted&&mode!=='calc')setMode('calc')});
