const VERSION='0.4.134';
const NUMBER_LOCALE='de-DE';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// localStorage can throw (blocked storage, private mode, quota full). Never let that break the app.
const store={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function readLanguage(){
 let stored='';
 try{stored=localStorage.getItem('uc-lang')||''}catch{}
 return stored==='en'||stored==='el'?stored:'en';
}
let lang=readLanguage();
// New users start in dark theme; 'auto' (follow the system) is kept for people who used the app before it became the default.
let theme=store.get('uc-theme')==='light'?'light':store.get('uc-theme')==='auto'?'auto':'dark';
let carry=null;
let mode='calc',expression='',current='',currentIsPercent=false,justCalculated=false,lastExpression='',lastResult=null,howData=null,calcHowData=null,lastOperation=null,historyClearConfirm=false,toolResult=null,toolActiveInput=null,resultCompact=false,unitActiveInput='from',unitSource='from',unitReplaceOnNextKey=false,unitExpressions={from:'',to:''},toolState={fuel:{inputs:{},result:null},energy:{inputs:{},result:null},vat:{inputs:{},result:null}};
store.del('uc-mode');
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

const T={
el:{calc:'Αριθμομηχανή',fuel:'Καύσιμα',energy:'Ενέργεια',vat:'ΦΠΑ',units:'Μονάδες',how:'Πώς υπολογίστηκε',history:'Ιστορικό',copy:'Αντιγραφή αποτελέσματος',copied:'Αντιγράφηκε',clear:'Διαγραφή όλων',confirm:'Διαγραφή όλου του ιστορικού;',confirmYes:'Διαγραφή',none:'Δεν υπάρχουν υπολογισμοί ακόμη.',hint:'Πληκτρολόγησε μια πράξη για να ξεκινήσεις.',delete:'Διαγραφή',created:'Δημιουργήθηκε από',fuelD:'Απόσταση (km)',fuelC:'Κατανάλωση (L/100 km)',fuelP:'Τιμή καυσίμου / L',fuelGo:'Υπολογισμός κόστους καυσίμου',fuelUsed:'Καύσιμο που χρησιμοποιήθηκε',costKm:'Κόστος ανά km',energyP:'Ισχύς (W)',energyH:'Ώρες / ημέρα',energyD:'Ημέρες',energyR:'Τιμή / kWh',energyGo:'Υπολογισμός κόστους ρεύματος',energyUsed:'Ενέργεια',amount:'Ποσό',vatRate:'ΦΠΑ %',addVat:'Πρόσθεσε ΦΠΑ',removeVat:'Αφαίρεσε ΦΠΑ',vatAmount:'Ποσό ΦΠΑ',value:'Τιμή',category:'Κατηγορία',from:'Από',to:'Σε',convert:'Μετατροπή',length:'Μήκος',area:'Εμβαδόν',mass:'Μάζα',volume:'Όγκος',speed:'Ταχύτητα',time:'Χρόνος',data:'Δεδομένα',energy:'Ενέργεια',power:'Ισχύς',pressure:'Πίεση',angle:'Γωνία',temperature:'Θερμοκρασία',unit_mm:'Χιλιοστό',unit_cm:'Εκατοστό',unit_m:'Μέτρο',unit_km:'Χιλιόμετρο',unit_in:'Ίντσα',unit_ft:'Πόδι',unit_yd:'Γιάρδα',unit_mi:'Μίλι',unit_nmi:'Ναυτικό μίλι',unit_bit:'Bit',unit_b:'Bit',unit_kbit:'Kilobit',unit_Mbit:'Megabit',unit_Gbit:'Gigabit',unit_Tbit:'Terabit',unit_B:'Byte',unit_kB:'Kilobyte',unit_MB:'Megabyte',unit_GB:'Gigabyte',unit_TB:'Terabyte',unit_KiB:'Kibibyte',unit_MiB:'Mebibyte',unit_GiB:'Gibibyte',unit_TiB:'Tebibyte',unit_kg:'Κιλά',unit_l:'Λίτρο',unit_ml:'Milliliter',unit_mps:'m/s',unit_kmh:'km/h',unit_mph:'mph',unit_knot:'Κόμβος',unit_J:'Joule',unit_kJ:'Kilojoule',unit_Wh:'Watt-ώρα',unit_kWh:'Kilowatt-ώρα',unit_cal:'cal',unit_kcal:'kcal',unit_W:'Watt',unit_kW:'Kilowatt',unit_MW:'Megawatt',unit_hp:'Ιπποδύναμη',unit_Pa:'Pascal',unit_kPa:'Kilopascal',unit_bar:'Bar',unit_psi:'PSI',unit_atm:'Ατμόσφαιρα',unit_deg:'Μοίρα',unit_rad:'Ακτίνιο',unit_grad:'Grad',unit_C:'Κελσίου',unit_F:'Φαρενάιτ',unit_K:'Kelvin',toolReady:'Το αποτέλεσμα θα εμφανιστεί εδώ',toolFuel:'Κόστος καυσίμου',toolEnergy:'Κόστος ρεύματος',toolVat:'Τελικό ποσό',toolUnit:'Αποτέλεσμα',fuelResult:'Καύσιμο που χρησιμοποιήθηκε',energyResult:'Ενέργεια',clearConfirm:'Διαγραφή;',close:'Κλείσιμο',swap:'Εναλλαγή μονάδων',deleteKey:'Διαγραφή',themeLight:'Εναλλαγή σε φωτεινό θέμα',themeDark:'Εναλλαγή σε σκοτεινό θέμα',graph:'Γράφημα',chart:'Διάγραμμα',install:'Εγκατάσταση εφαρμογής',installTitle:'Εγκατάσταση στο κινητό',installIntro:'Πρόσθεσε την αριθμομηχανή στην οθόνη του κινητού σου. Θα ανοίγει σαν κανονική εφαρμογή, σε πλήρη οθόνη.',iosShareT:'Πάτα Κοινοποίηση',iosShare:'Το κουμπί {share}. Στο Safari είναι στο κάτω μέρος της οθόνης, στο Chrome πάνω δεξιά.',iosAddT:'Προσθήκη στην οθόνη Αφετηρίας',iosAdd:'Κάνε κύλιση στη λίστα και πάτα «Προσθήκη στην οθόνη Αφετηρίας».',iosDoneT:'Πάτα «Προσθήκη»',iosDone:'Πάνω δεξιά. Η εφαρμογή εμφανίζεται στην οθόνη σου.',andMenuT:'Άνοιξε το μενού',andMenu:'Το κουμπί ⋮ πάνω δεξιά (στο Samsung Internet το ☰ κάτω δεξιά).',andAddT:'Εγκατάσταση εφαρμογής',andAdd:'Πάτα «Εγκατάσταση εφαρμογής» ή «Προσθήκη στην αρχική οθόνη».',andDoneT:'Επιβεβαίωσε',andDone:'Πάτα «Εγκατάσταση». Η εφαρμογή εμφανίζεται στην οθόνη σου.'},
en:{calc:'Calculator',fuel:'Fuel',energy:'Energy',vat:'VAT',units:'Units',how:'How was this calculated?',history:'History',copy:'Copy result',copied:'Copied',clear:'Clear all',confirm:'Delete all calculation history?',confirmYes:'Delete',none:'No calculations yet.',hint:'Enter a calculation to get started.',delete:'Delete',created:'Created by',fuelD:'Distance (km)',fuelC:'Consumption (L/100 km)',fuelP:'Fuel price / L',fuelGo:'Calculate fuel cost',fuelUsed:'Fuel used',costKm:'Cost per km',energyP:'Power (W)',energyH:'Hours / day',energyD:'Days',energyR:'Price / kWh',energyGo:'Calculate electricity cost',energyUsed:'Energy',amount:'Amount',vatRate:'VAT %',addVat:'Add VAT',removeVat:'Remove VAT',vatAmount:'VAT amount',value:'Value',category:'Category',from:'From',to:'To',convert:'Convert',length:'Length',area:'Area',mass:'Mass',volume:'Volume',speed:'Speed',time:'Time',data:'Data',energy:'Energy',power:'Power',pressure:'Pressure',angle:'Angle',temperature:'Temperature',unit_mm:'Millimeter',unit_cm:'Centimeter',unit_m:'Meter',unit_km:'Kilometer',unit_in:'Inch',unit_ft:'Foot',unit_yd:'Yard',unit_mi:'Statute mile',unit_nmi:'Nautical mile',unit_bit:'Bit',unit_b:'Bit',unit_kbit:'Kilobit',unit_Mbit:'Megabit',unit_Gbit:'Gigabit',unit_Tbit:'Terabit',unit_B:'Byte',unit_kB:'Kilobyte',unit_MB:'Megabyte',unit_GB:'Gigabyte',unit_TB:'Terabyte',unit_KiB:'Kibibyte',unit_MiB:'Mebibyte',unit_GiB:'Gibibyte',unit_TiB:'Tebibyte',unit_kg:'Kilogram',unit_l:'Liter',unit_ml:'Milliliter',unit_mps:'m/s',unit_kmh:'km/h',unit_mph:'mph',unit_knot:'Knot',unit_J:'Joule',unit_kJ:'Kilojoule',unit_Wh:'Watt-hour',unit_kWh:'Kilowatt-hour',unit_cal:'cal',unit_kcal:'kcal',unit_W:'Watt',unit_kW:'Kilowatt',unit_MW:'Megawatt',unit_hp:'Horsepower',unit_Pa:'Pascal',unit_kPa:'Kilopascal',unit_bar:'Bar',unit_psi:'PSI',unit_atm:'Atmosphere',unit_deg:'Degree',unit_rad:'Radian',unit_grad:'Grad',unit_C:'Celsius',unit_F:'Fahrenheit',unit_K:'Kelvin',toolReady:'The result will appear here',toolFuel:'Fuel cost',toolEnergy:'Electricity cost',toolVat:'Final amount',toolUnit:'Result',fuelResult:'Fuel used',energyResult:'Energy',clearConfirm:'Delete?',close:'Close',swap:'Swap units',deleteKey:'Delete',themeLight:'Switch to light mode',themeDark:'Switch to dark mode',graph:'Graph',chart:'Chart',install:'Install app',installTitle:'Install on your phone',installIntro:'Add the calculator to your home screen. It opens like a normal app, full screen.',iosShareT:'Tap Share',iosShare:'The {share} button. In Safari it is at the bottom of the screen, in Chrome at the top right.',iosAddT:'Add to Home Screen',iosAdd:'Scroll down the list and tap “Add to Home Screen”.',iosDoneT:'Tap “Add”',iosDone:'At the top right. The app appears on your home screen.',andMenuT:'Open the menu',andMenu:'The ⋮ button at the top right (in Samsung Internet, ☰ at the bottom right).',andAddT:'Install app',andAdd:'Tap “Install app” or “Add to Home screen”.',andDoneT:'Confirm',andDone:'Tap “Install”. The app appears on your home screen.'}
};
const ICONS={calc:'▦',graph:'∿',fuel:'⛽︎',energy:'ϟ',vat:'%',units:'↔'};const MODE_TRANSLATIONS={calc:['Αριθμομηχανή','Calculator'],graph:['Γράφημα','Graph'],fuel:['Καύσιμα','Fuel'],energy:['Ενέργεια','Energy'],vat:['ΦΠΑ','VAT'],units:['Μονάδες','Units']};
const TOOL_LABEL_KEYS={fuel:['fuelD','fuelC','fuelP'],energy:['energyP','energyH','energyD','energyR'],vat:['amount','vatRate']};
const modeText=m=>MODE_TRANSLATIONS[m]?.[lang==='el'?0:1]||t(m);
// Units is switched on inside the Calculator (the ↔ button), so the mode button shows Calculator for both.
const menuMode=()=>mode==='units'?'calc':mode;

const t=k=>T[lang][k]??T.en[k]??k;
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const t=a%b;a=b;b=t}return a};
function rat(n,d=1n){if(d===0n)throw Error('DIV0');if(d<0n){n=-n;d=-d}const g=gcd(n,d);return{n:n/g,d:d/g}}
const ratAdd=(a,b)=>rat(a.n*b.d+b.n*a.d,a.d*b.d),ratSub=(a,b)=>rat(a.n*b.d-b.n*a.d,a.d*b.d),ratMul=(a,b)=>rat(a.n*b.n,a.d*b.d),ratDiv=(a,b)=>{if(b.n===0n)throw Error('DIV0');return rat(a.n*b.d,a.d*b.n)};
function normalizeNumericInput(s){
 s=String(s??'').trim().replace(/\s/g,'');
 if(s.includes(','))s=s.replace(/\./g,'').replace(',', '.');
 return s.replace(/[^0-9.\-]/g,'');
}
function formatNumericInput(s){
 const raw=normalizeNumericInput(s);
 if(raw===''||raw==='-' )return raw;
 const sign=raw.startsWith('-')?'-':'';
 const body=sign?raw.slice(1):raw;
 const parts=body.split('.');
 const whole=parts[0]||'0';
 const frac=parts.length>1?parts.slice(1).join(''):undefined;
 const grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
 return sign+grouped+(frac!==undefined?','+frac:'');
}
function ratFromString(s){s=normalizeNumericInput(s);let sign=1n;if(s[0]==='-'){sign=-1n;s=s.slice(1)}const [whole,frac='']=s.split('.');const digits=(whole||'0')+(frac||'');const scale=10n**BigInt(frac.length);return rat(sign*BigInt(digits||'0'),scale)}
function ratPercent(a){return rat(a.n,a.d*100n)}
function ratToDecimal(a,max=18){let sign=a.n<0n?'-':'';let n=a.n<0n?-a.n:a.n,d=a.d;const whole=n/d;let rem=n%d;if(rem===0n)return sign+whole.toString();let out='';for(let i=0;i<max&&rem;i++){rem*=10n;out+=String(rem/d);rem%=d}out=out.replace(/0+$/,'');return sign+whole.toString()+'.'+out}
function ratToRoundedDecimal(a,max=6){const neg=a.n<0n,n=neg?-a.n:a.n,scale=10n**BigInt(max);let q=n*scale/a.d;if(2n*((n*scale)%a.d)>=a.d)q++;if(q===0n)return '0';let digits=q.toString().padStart(max+1,'0');const whole=digits.slice(0,digits.length-max),frac=digits.slice(digits.length-max).replace(/0+$/,'');return (neg?'-':'')+whole+(frac?'.'+frac:'')}
function ratToNumber(a){const s=ratToDecimal(a,18);return Number(s)}
function formatScientific(raw){
 const neg=raw[0]==='-';const body=neg?raw.slice(1):raw;const [w,f='']=body.split('.');
 const exp=w.replace(/^0+/,'')?w.replace(/^0+/,'').length-1:-(f.search(/[1-9]/)+1);
 const digits=(w+f).replace(/^0+/,'').replace(/0+$/,'');
 const mant=digits.length>1?digits[0]+','+digits.slice(1,7).replace(/0+$/,''):digits;
 return (neg?'-':'')+mant.replace(/,$/,'')+' × 10^'+exp;
}
function formatRat(a,max=6){
 const s=ratToRoundedDecimal(a,max),num=Number(s);
 // Non-zero values too small for `max` decimals would round to "0": show them in scientific notation.
 if(a.n!==0n&&num===0)return formatScientific(ratToDecimal(a,200));
 if(Number.isFinite(num)&&Math.abs(num)<1e15)return new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:max}).format(num);
 if(s.length<=24)return formatGroupedNumber(s);
 return formatScientific(s);
}
const fmt=n=>n&&typeof n==='object'&&'n'in n?formatRat(n,6):Number.isFinite(Number(n))?new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:6}).format(Number(n)):'Error';
const pretty=s=>String(s).replace(/\*/g,'×').replace(/\//g,'÷');
function formatGroupedNumber(raw){
 const s=String(raw);
 const sign=s.startsWith('-')?'-':'';
 const body=sign?s.slice(1):s;
 const [whole,frac]=body.split('.');
 const grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
 const decimal=',';
 return sign+grouped+(frac!==undefined?decimal+frac:'');
}
function formatInputDisplay(s){
 return pretty(String(s)).replace(/\d+(?:\.\d*)?/g,m=>formatGroupedNumber(m));
}
// After a result, the next calculation starts from its full-precision value (carry). On screen that value shows rounded, like the result did.
function formatExpressionDisplay(s){
 s=String(s??'');
 if(carry&&carry.raw&&s.startsWith(carry.raw))return carry.shown+formatInputDisplay(s.slice(carry.raw.length));
 return formatInputDisplay(s);
}
let lastShown='';// how the finished calculation (lastExpression) is shown above the result

function carryText(r,digits){const abs=r.n<0n?{n:-r.n,d:r.d}:r,raw=ratToDecimal(r,digits);carry={text:ratToDecimal(abs,digits),value:abs,raw,shown:fmt(r),plain:ratToRoundedDecimal(r,6)};return raw}
function tokenize(input){
 const s=String(input).replace(/×/g,'*').replace(/÷/g,'/').replace(/\s+/g,'');const tokens=[];let i=0;
 while(i<s.length){const ch=s[i];
  if(/[0-9.]/.test(ch)){const start=i;let dots=0;while(i<s.length&&/[0-9.]/.test(s[i])){if(s[i]==='.')dots++;i++}if(dots>1)throw Error('NUMBER');let raw=s.slice(start,i);if(s[i]==='%'){i++;tokens.push({type:'number',value:ratPercent(ratFromString(raw)),percent:true,raw:raw+'%'});}else{const exact=carry&&raw===carry.text&&(start===0||(start===1&&s[0]==='-'));tokens.push({type:'number',value:exact?carry.value:ratFromString(raw),percent:false,raw})}continue}
  if('+-*/()'.includes(ch)){tokens.push({type:ch});i++;continue}throw Error('CHAR')
 }return tokens
}
function evalExpr(input){
 const tokens=tokenize(input);let pos=0;
 function primary(){const tok=tokens[pos++];if(!tok)throw Error('INCOMPLETE');if(tok.type==='+'||tok.type==='-'){const v=primary();return{value:tok.type==='-'?ratMul(ratFromString('-1'),v.value):v.value,percent:v.percent}}if(tok.type==='('){const v=additive();if(!tokens[pos]||tokens[pos].type!==')')throw Error('PAREN');pos++;return{value:v.value,percent:false}}if(tok.type==='number')return{value:tok.value,percent:tok.percent};throw Error('SYNTAX')}
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
 const walk=n=>{
   if(n.type==='number')return n.value;
   if(n.type==='group')return walk(n.child);
   const l=walk(n.left),r=walk(n.right),percent=n.right.type==='number'&&n.right.percent;
   const rv=percent&&['+','-'].includes(n.op)?ratMul(l,r):r;
   const v=n.op==='+'?ratAdd(l,rv):n.op==='-'?ratSub(l,rv):n.op==='*'?ratMul(l,rv):ratDiv(l,rv);
   const op=({'+':'+','-':'−','*':'×','/':'÷'})[n.op];
   if(percent&&['+','-'].includes(n.op)){
     const pct=ratDiv(r,ratFromString('0.01'));
     steps.push({title:lang==='el'?'Υπολόγισε το ποσοστό':'Calculate the percentage',text:formatRat(l)+' × '+formatRat(pct)+' ÷ 100 = '+formatRat(rv)});
     steps.push({title:lang==='el'?'Έπειτα':'Then',text:formatRat(l)+' '+op+' '+formatRat(rv)+' = '+formatRat(v)});
   }else{
     const title=lang==='el'?(steps.length===0?'Πρώτα':n===tree?'Τέλος':'Στη συνέχεια'):(steps.length===0?'First':n===tree?'Finally':'Next');
     steps.push({title,text:formatRat(l)+' '+op+' '+formatRat(rv)+' = '+formatRat(v)});
   }
   return v;
 };
 try{walk(tree)}catch{return null}
 return{formula:formatExpressionDisplay(input),steps,result:formatRat(result)}
}

function resetHow(){howData=null;calcHowData=null;$('#howButton')?.classList.add('hidden')}
function applyTheme(){
 document.body.classList.toggle('light',theme==='light');
 document.documentElement.classList.toggle('force-dark',theme==='dark');
 document.documentElement.classList.toggle('force-light',theme==='light');
 const b=$('#themeButton');
 if(b){const dark=theme==='dark'||(theme==='auto'&&!matchMedia('(prefers-color-scheme: light)').matches);b.textContent=dark?'☾':'☀';b.setAttribute('aria-label',dark?t('themeLight'):t('themeDark'))}
 redrawCharts();
}
// The new theme spreads out in a circle from the theme button (View Transitions); browsers without it get a
// short colour fade; with reduced motion it switches at once.
function toggleTheme(){
 const dark=theme==='dark'||(theme==='auto'&&!matchMedia('(prefers-color-scheme: light)').matches);
 const run=()=>{theme=dark?'light':'dark';store.set('uc-theme',theme);applyTheme()};
 const root=document.documentElement;
 if(reducedMotion()){run();return}
 if(!document.startViewTransition){root.classList.add('theme-fade');run();setTimeout(()=>root.classList.remove('theme-fade'),400);return}
 const z=window.__uiZoom||1,b=$('#themeButton').getBoundingClientRect(),x=(b.left+b.width/2)/z,y=(b.top+b.height/2)/z;// CSS px
 const r=Math.hypot(Math.max(x,innerWidth/z-x),Math.max(y,innerHeight/z-y));
 root.classList.add('vt-theme');
 try{
  const vt=document.startViewTransition(run);
  vt.ready.then(()=>root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]},{duration:560,easing:'cubic-bezier(.4,0,.2,1)',pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
  vt.finished.finally(()=>root.classList.remove('vt-theme'));
 }catch{root.classList.remove('vt-theme');run()}
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
 const display=current==='Error'?'Error':justCalculated?fmt(lastResult):(raw?formatExpressionDisplay(raw):'0');
 $('#calculatorDisplay').classList.remove('tool-display','tool-empty');
 $('#calculatorDisplay').classList.toggle('calculated',justCalculated);
 $('#expression').textContent=justCalculated?(lastShown||formatExpressionDisplay(lastExpression)):'';
 const exprEl=$('#expression');
 $('#result').textContent=display;
 $('#result').classList.remove('long-value','near-limit');
 const hasEntry=Boolean(raw);
 $('#clearButton').textContent=justCalculated||!hasEntry?'AC':'C';
 $('#howButton').classList.toggle('hidden',!howData);
 $('#chartButton')?.classList.add('hidden');
 syncFuelButtons();
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
 $('#chartButton')?.classList.toggle('hidden',!toolChartAvailable());
 $('#chartButton')?.setAttribute('aria-label',t('chart'));
 syncFuelButtons();
 $('#result').textContent=toolResult?.main||'0';
 $('#result').classList.toggle('long-value',String(toolResult?.main??'').length>18);
 d.classList.toggle('tool-empty',!toolResult);
}
function clearAll(){carry=null;resultCompact=false;expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;lastOperation=null;resetHow();render()}
function clearCurrent(){resetHow();if(current){current='';currentIsPercent=false;render();return}clearAll()}
function clearButtonAction(){
 if(justCalculated){clearAll();return}

 if(current){clearCurrent();return}
 if(expression){clearAll();return}
 clearAll();
}
function backspace(){resetHow();if(justCalculated){clearAll();return}if(!current&&carry&&expression===carry.raw){expression=carry.plain;carry=null}if(current){current=current.slice(0,-1);currentIsPercent=false}else if(expression)expression=expression.slice(0,-1);render()}
function digit(v){
 if(v===',')v='.';
 resetHow();
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(currentIsPercent){current=v;currentIsPercent=false;render();return}
 if(v==='.'&&current.includes('.'))return;
 if(v==='.'&&(!current||current==='-'))current+='0.';else if(current==='0'&&v!=='.')current=v;else current+=v;
 render()
}
function parenthesis(ch){
 resetHow();
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(ch==='('){
   if(current&&current!=='-')return false;
   if(current==='-'){expression+=current;current='';currentIsPercent=false}
   if(expression&&/[0-9.)]$/.test(expression))return false;
   expression+='(';
 }else{
   if(current==='-')return false;
   if(current){expression+=current;current='';currentIsPercent=false}
   const opens=(expression.match(/\(/g)||[]).length,closes=(expression.match(/\)/g)||[]).length;
   if(opens<=closes||/[+\-×÷(]$/.test(expression))return false;
   expression+=')';
 }
 render();
 return true;
}
function operator(op){
 resetHow();
 if(justCalculated){expression=carryText(lastResult,18);current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(current==='-'&&expression){current=''}
 if(op==='-'&&!current&&/[×÷(]$/.test(expression)){current='-';render();return}
 if(!current&&!expression){if(op==='-'){current='-';render()}return;}if(!current&&/\($/.test(expression))return;
 if(current){expression+=current;current='';currentIsPercent=false}
 if(/[+\-×÷]$/.test(expression))expression=expression.slice(0,-1)+op;else expression+=op;
 render()
}
// One "( )" key: closes a parenthesis when one is open and a number was just typed, otherwise opens one (after a number it adds × first).
function smartParen(){
 if(current==='Error')return;
 const full=justCalculated?'':expression+current,open=(full.match(/\(/g)||[]).length-(full.match(/\)/g)||[]).length,afterValue=/[0-9.%)]$/.test(full);
 if(open>0&&afterValue){parenthesis(')');return}
 if(afterValue)operator('×');
 parenthesis('(')
}
function percent(){resetHow();if(!current||currentIsPercent)return;current+='%';currentIsPercent=true;render()}
function parseLastOperation(full){const m=String(full).match(/^(.*?)([+\-×÷])(-?\d+(?:[.,]\d+)?%?)$/);return m?{op:m[2],rhs:m[3]}:null}
function repeatEquals(){
 if(!justCalculated||!lastOperation)return false;
 try{const rhs=lastOperation.rhs,base=carryText(lastResult,24),full=base+lastOperation.op+rhs,value=evalExpr(full);lastExpression=full;lastShown=formatExpressionDisplay(full);lastResult=value;justCalculated=true;howData=explanationForExpression(full,value)||{formula:pretty(full),steps:[`${pretty(full)} = ${fmt(value)}`],result:fmt(value)};calcHowData=howData;saveHistory({expression:full,result:value,how:howData});render();return true}catch{return false}
}
function equals(){
 if(justCalculated&&repeatEquals())return;
 let full=expression+current;if(!full||/[+\-×÷(]$/.test(full))return;
 const openParens=(full.match(/\(/g)||[]).length-(full.match(/\)/g)||[]).length;if(openParens>0){full+=')'.repeat(openParens);expression=full;current=''}
 try{const value=evalExpr(full);lastExpression=full;lastShown=formatExpressionDisplay(full);lastResult=value;lastOperation=parseLastOperation(full);justCalculated=true;currentIsPercent=false;howData=explanationForExpression(full,value)||{formula:pretty(full),steps:[`${pretty(full)} = ${fmt(value)}`],result:fmt(value)};saveHistory({expression:full,result:value,how:howData});render()}
 catch{current='Error';currentIsPercent=false;render();setTimeout(()=>{if(current==='Error'){current='';render()}},900)}
}
function showHow(){if(!howData)return;$('#howTitle').textContent=t('how');$('#howContent').innerHTML=`<div class="how-step"><div class="how-expression-label">${lang==='el'?'Πράξη':'Expression'}</div><div class="how-formula">${esc(howData.formula)}</div><div class="how-steps">${howData.steps.map((s,i)=>`<div class="how-line"><span>${i+1}</span><div class="how-line-body"><strong>${esc(s.title||'')}</strong><div>${esc(s.text||s)}</div></div></div>`).join('')}</div><div class="how-result"><span>${lang==='el'?'Αποτέλεσμα':'Result'}</span><strong>${esc(howData.result)}</strong></div></div>`;$('#howModal').classList.remove('hidden')}
function closeHow(){$('#howModal').classList.add('hidden')}
function historyItems(){try{return JSON.parse(store.get('uc-history')||'[]')}catch{return[]}}
function saveHistory(item){const list=historyItems();const stored={...item,shown:item.shown||formatExpressionDisplay(item.expression),result:item.result&&typeof item.result==='object'&&'n'in item.result?ratToDecimal(item.result,24):String(item.result)};list.unshift({id:Date.now()+Math.random(),...stored});store.set('uc-history',JSON.stringify(list.slice(0,100)));renderHistory()}
function renderHistory(){const list=historyItems();$('#historyList').innerHTML=list.length?list.map(x=>`<div class="history-item"><button class="history-main" data-history="${x.id}" type="button"><div class="history-expression">${esc(x.shown||formatInputDisplay(x.expression))}</div><div class="history-result">${esc(fmt(x.result&&typeof x.result==='string'?ratFromString(x.result):x.result))}</div></button><button class="history-delete" data-delete="${x.id}" type="button" aria-label="${esc(t('delete'))}">×</button></div>`).join(''):`<div class="empty">${esc(t('none'))}</div>`;historyChartRefresh()}

const units={length:{mm:'0.001',cm:'0.01',m:'1',km:'1000',in:'0.0254',ft:'0.3048',yd:'0.9144',mi:'1609.344',nmi:'1852'},area:{'mm²':'0.000001','cm²':'0.0001','m²':'1','km²':'1000000','in²':'0.00064516','ft²':'0.09290304',stremma:'1000',acre:'4046.8564224',ha:'10000'},mass:{mg:'0.000001',g:'0.001',kg:'1',oz:'0.028349523125',lb:'0.45359237',t:'1000'},volume:{ml:'0.001',l:'1','m³':'1000',tsp:'0.00492892159375',tbsp:'0.01478676478125',cup:'0.2365882365',gal:'3.785411784',qt:'0.946352946',pt:'0.473176473'},speed:{'m/s':'1','km/h':'0.27777777777777777778',mph:'0.44704',knot:'0.51444444444444444444'},time:{ms:'0.001',s:'1',min:'60',h:'3600',day:'86400',week:'604800'},data:{bit:'1',kbit:'1000',Mbit:'1000000',Gbit:'1000000000',Tbit:'1000000000000',B:'8',kB:'8000',MB:'8000000',GB:'8000000000',TB:'8000000000000',KiB:'8192',MiB:'8388608',GiB:'8589934592',TiB:'8796093022208'},energy:{J:'1',kJ:'1000',Wh:'3600',kWh:'3600000',cal:'4.184',kcal:'4184'},power:{W:'1',kW:'1000',MW:'1000000',hp:'745.69987158227022'},pressure:{Pa:'1',kPa:'1000',bar:'100000',psi:'6894.757293168',atm:'101325'},angle:{deg:'1',rad:'57.2957795130823208768',grad:'0.9'},temperature:{'°C':'1','°F':'1',K:'1'}};
function normalizeUnitExpression(expr){
 return String(expr??'').trim().replace(/×/g,'*').replace(/÷/g,'/').replace(/-?\d[\d.,]*/g,m=>{
  const sign=m.startsWith('-')?'-':'';
  let token=sign?m.slice(1):m;
  if(token.includes(',')){
   const parts=token.split(',');
   token=parts.slice(0,-1).join('').replace(/\./g,'')+'.'+parts.at(-1);
  }
  const parts=token.split('.');
  parts[0]=(parts[0]||'0').replace(/^0+(?=\d)/,'');
  if(parts[0]==='')parts[0]='0';
  return sign+parts.join('.');
 });
}
function unitEvaluate(expr){
 const raw=normalizeUnitExpression(expr);
 if(!raw||/[-+*/.]$/.test(raw)||!/^[0-9+*/().\s%-]+$/.test(raw))return null;
 try{return evalExpr(raw)}catch{return null}
}
function unitFactor(value){
 return ratFromString(String(value));
}
function unitValueFormat(value){
 if(!value||typeof value!=='object'||!('n'in value&&'d'in value))return '';
 return ratToDecimal(value,24);
}
function formatUnitDisplayValue(value){
 const s=String(value??'').trim();
 if(!s)return '0';
 return formatInputDisplay(s);
}
function isMobileDevice(){
 return matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent);
}
function renderUnitsDisplay(){
 const d=$('#calculatorDisplay');
 d.className='display-wrap unit-display';
 d.innerHTML='<div class="unit-display-toolbar"><select id="unitCategory" class="conversion-category">'+Object.keys(units).map(x=>'<option value="'+x+'">'+esc(t(x))+'</option>').join('')+'</select><button id="unitSwap" class="conversion-swap" type="button" aria-label="'+esc(t('swap'))+'">⇄</button></div><div class="unit-rows"><div class="unit-row" data-unit-row="from"><input id="unitValueFrom" class="unit-value" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="'+esc(t('from'))+'"><select id="unitFrom" class="unit-unit"></select></div><div class="unit-row" data-unit-row="to"><input id="unitValueTo" class="unit-value" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="'+esc(t('to'))+'"><select id="unitTo" class="unit-unit"></select></div></div>';
 const cat=$('#unitCategory');
 cat.value=window._unitCategory||'length';
 populateUnits(true);

 const bindInput=input=>{
   const side=input.id==='unitValueFrom'?'from':'to';
   const row=input.closest('.unit-row');
   input.dataset.unitInput=side;
   input.readOnly=true;
   input.setAttribute('inputmode','none');
   input.setAttribute('aria-readonly','true');
   input.addEventListener('focus',()=>input.blur());
   const activate=()=>{
     unitActiveInput=side;
     unitSource=side;
     unitReplaceOnNextKey=true;
     updateUnitsDisplay();
   };
   input.addEventListener('click',activate);
   row?.addEventListener('click',e=>{
     if(e.target.closest('select'))return;
     activate();
   });
 };
 bindInput($('#unitValueFrom'));
 bindInput($('#unitValueTo'));

 cat.addEventListener('change',()=>{
   window._unitCategory=cat.value||'length';
   // A new category keeps the number that was typed (or brought from the calculator) and converts it with the new units.
   const keep=unitExpressions[unitSource]||'0';
   unitExpressions={from:'0',to:'0'};unitExpressions[unitSource]=keep;
   unitActiveInput=unitSource;
   unitReplaceOnNextKey=true;
   populateUnits(true);
   convertUnitExpression(unitSource);
   setTimeout(()=>cat.blur(),0);
 });

 const handleUnitChange=select=>{
   const changed=select.id==='unitFrom'?'from':'to';
   const source=unitExpressions[unitSource]?.trim()?unitSource:unitExpressions[changed]?.trim()?changed:(unitExpressions.from?.trim()?'from':unitExpressions.to?.trim()?'to':changed);
   unitSource=source;
   unitActiveInput=source;
   unitReplaceOnNextKey=false;
   convertUnitExpression(source);
 };
 // After picking from a menu, the keyboard goes straight back to typing numbers.
 // (blur after the menu has closed: closing a menu hands the focus back to it)
 const release=sel=>setTimeout(()=>sel.blur(),0);
 $('#unitFrom').addEventListener('change',()=>{handleUnitChange($('#unitFrom'));release($('#unitFrom'))});
 $('#unitTo').addEventListener('change',()=>{handleUnitChange($('#unitTo'));release($('#unitTo'))});

 $('#unitSwap').addEventListener('click',()=>{
   const a=$('#unitFrom'),b=$('#unitTo');
   [a.value,b.value]=[b.value,a.value];
   const from=unitExpressions.from,to=unitExpressions.to;
   unitExpressions={from:to,to:from};
   unitSource=unitSource==='from'?'to':'from';
   unitActiveInput=unitSource;
   unitReplaceOnNextKey=false;unitSourceTyped=false;
   convertUnitExpression(unitSource);
 });
 updateUnitsDisplay();
}
// A converted value: about 6 decimals, more for small values so that at least 6 significant digits show.
function formatUnitResult(s){
 const raw=String(s??'').trim();
 if(!/^-?\d+(?:\.\d+)?$/.test(raw))return formatUnitDisplayValue(raw);
 const r=ratFromString(raw);if(r.n===0n)return '0';
 const abs=Math.abs(Number(raw)),dec=abs<1?Math.min(12,Math.max(6,Math.ceil(-Math.log10(abs))+5)):6;
 const rounded=ratToRoundedDecimal(r,dec);
 return rounded==='0'||rounded==='-0'?formatScientific(ratToDecimal(r,200)):formatGroupedNumber(rounded);
}
// Only what you are typing shows exactly as typed; every other value (converted, finished with =, brought from
// the calculator, swapped) is shown rounded. unitSourceTyped says whether the source side was typed by hand.
let unitSourceTyped=false;
function unitSideText(side){
 const expr=unitExpressions[side]??'0';
 return side===unitSource&&unitSourceTyped&&!unitReplaceOnNextKey?formatUnitDisplayValue(expr):formatUnitResult(expr);
}
function updateUnitsDisplay(){
 const from=$('#unitValueFrom'),to=$('#unitValueTo');
 if(!from||!to)return;
 from.value=unitSideText('from');
 to.value=unitSideText('to');
 saveTools();
 const active=unitActiveInput==='to'?'to':'from';
 unitActiveInput=active;
 from.classList.toggle('unit-active-value',active==='from');
 from.classList.toggle('unit-result-value',active==='to');
 to.classList.toggle('unit-active-value',active==='to');
 to.classList.toggle('unit-result-value',active==='from');
 from.closest('.unit-row')?.classList.toggle('active',active==='from');
 to.closest('.unit-row')?.classList.toggle('active',active==='to');
}
function unitConvertValue(category,value,from,to){
 if(category==='temperature'){
   const v=value;
   if(from==='°F'){
     const c=ratDiv(ratSub(v,ratFromString('32')),ratFromString('1.8'));
     return to==='°C'?c:to==='°F'?v:ratAdd(c,ratFromString('273.15'));
   }
   if(from==='K'){
     const c=ratSub(v,ratFromString('273.15'));
     return to==='°C'?c:to==='°F'?ratAdd(ratMul(c,ratFromString('1.8')),ratFromString('32')):v;
   }
   return to==='°C'?v:to==='°F'?ratAdd(ratMul(v,ratFromString('1.8')),ratFromString('32')):ratAdd(v,ratFromString('273.15'));
 }
 const factors=units[category]||{};
 return ratMul(value,ratDiv(unitFactor(factors[from]),unitFactor(factors[to])));
}
function convertUnitExpression(source='from'){
 const cc=$('#unitCategory')?.value,fu=$('#unitFrom')?.value,tu=$('#unitTo')?.value;
 if(!cc||!fu||!tu)return;
 const expr=String(unitExpressions[source]??'').trim();
 if(!expr){
   unitExpressions[source]='0';
   unitExpressions[source==='from'?'to':'from']='0';
   updateUnitsDisplay();
   return;
 }
 const value=unitEvaluate(expr);
 if(value===null){
   updateUnitsDisplay();
   return;
 }
 const out=source==='from'?unitConvertValue(cc,value,fu,tu):unitConvertValue(cc,value,tu,fu);
 unitExpressions[source==='from'?'to':'from']=unitValueFormat(out);
 updateUnitsDisplay();
}
function equalsUnits(){
 const source=unitSource||unitActiveInput||'from';
 const other=source==='from'?'to':'from';
 const expr=String(unitExpressions[source]??'').trim();
 const value=unitEvaluate(expr);
 if(value===null)return;
 const cc=$('#unitCategory')?.value,fu=$('#unitFrom')?.value,tu=$('#unitTo')?.value;
 if(!cc||!fu||!tu)return;
 unitExpressions[source]=unitValueFormat(value);unitSourceTyped=false;
 unitExpressions[other]=unitValueFormat(source==='from'?unitConvertValue(cc,value,fu,tu):unitConvertValue(cc,value,tu,fu));
 unitReplaceOnNextKey=true;
 updateUnitsDisplay();
}
window._runUnits=()=>convertUnitExpression(unitSource||unitActiveInput||'from');
window._equalsUnits=equalsUnits;
const FIELD_EXAMPLES={fuelD:'250',fuelC:'7,2',fuelP:'1,85',energyP:'100',energyH:'8',energyD:'30',energyR:'0,20',amount:'100',vatRate:'24%',value:'10'};
const TOOL_DEFAULTS={fuelD:250,fuelC:7.2,fuelP:1.85,energyP:100,energyH:8,energyD:30,energyR:0.20,amount:100,vatRate:24,value:10};
let vatAction='add';
const UNIT_LABELS={length:{mm:['Χιλιοστό','Millimeter'],cm:['Εκατοστό','Centimeter'],m:['Μέτρο','Meter'],km:['Χιλιόμετρο','Kilometer'],in:['Ίντσα','Inch'],ft:['Πόδι','Foot'],yd:['Γιάρδα','Yard'],mi:['Μίλι','Statute mile'],nmi:['Ναυτικό μίλι','Nautical mile']},area:{'mm²':['Τετρ. χιλιοστό','Square millimeter'],'cm²':['Τετρ. εκατοστό','Square centimeter'],'m²':['Τετρ. μέτρο','Square meter'],'km²':['Τετρ. χιλιόμετρο','Square kilometer'],'in²':['Τετρ. ίντσα','Square inch'],'ft²':['Τετρ. πόδι','Square foot'],stremma:['Στρέμμα','Stremma'],acre:['Έικρ','Acre'],ha:['Εκτάριο','Hectare']},mass:{mg:['Χιλιοστόγραμμο','Milligram'],g:['Γραμμάριο','Gram'],kg:['Χιλιόγραμμο','Kilogram'],oz:['Ουγγιά','Ounce'],lb:['Λίβρα','Pound'],t:['Τόνος','Metric ton']},volume:{ml:['Χιλιοστόλιτρο','Milliliter'],l:['Λίτρο','Liter'],'m³':['Κυβικό μέτρο','Cubic meter'],tsp:['Κουταλάκι','Teaspoon'],tbsp:['Κουταλιά','Tablespoon'],cup:['Κούπα','Cup'],gal:['Γαλόνι','Gallon'],qt:['Quart','Quart'],pt:['Pint','Pint']},speed:{'m/s':['Μέτρα/δευτ.','Meters/second'],'km/h':['Χιλιόμετρα/ώρα','Kilometers/hour'],mph:['Μίλια/ώρα','Miles/hour'],knot:['Κόμβος','Knot']},time:{ms:['Millisec.','Millisecond'],s:['Δευτερόλεπτο','Second'],min:['Λεπτό','Minute'],h:['Ώρα','Hour'],day:['Ημέρα','Day'],week:['Εβδομάδα','Week']},data:{bit:['Bit','Bit'],b:['Bit','Bit'],kbit:['Κιλομπίτ','Kilobit'],Mbit:['Μεγαμπίτ','Megabit'],Gbit:['Γιγαμπίτ','Gigabit'],Tbit:['Τεραμπίτ','Terabit'],B:['Byte','Byte'],kB:['Κιλομπάιτ','Kilobyte'],MB:['Μεγαμπάιτ','Megabyte'],GB:['Γιγαμπάιτ','Gigabyte'],TB:['Τεραμπάιτ','Terabyte'],KiB:['Κιμπιμπάιτ','Kibibyte'],MiB:['Μεμπιμπάιτ','Mebibyte'],GiB:['Γκιμπιμπάιτ','Gibibyte'],TiB:['Τεμπιμπάιτ','Tebibyte']},energy:{J:['Τζάουλ','Joule'],kJ:['Κιλοτζάουλ','Kilojoule'],Wh:['Watt-ώρα','Watt-hour'],kWh:['Kilowatt-ώρα','Kilowatt-hour'],cal:['Θερμίδα','cal'],kcal:['Χιλιοθερμίδα','kcal']},power:{W:['Βατ','Watt'],kW:['Κιλοβάτ','Kilowatt'],MW:['Μεγαβάτ','Megawatt'],hp:['Ιπποδύναμη','Horsepower']},pressure:{Pa:['Πασκάλ','Pascal'],kPa:['Κιλοπασκάλ','Kilopascal'],bar:['Μπαρ','Bar'],psi:['PSI','PSI'],atm:['Ατμόσφαιρα','Atmosphere']},angle:{deg:['Μοίρα','Degree'],rad:['Ακτίνιο','Radian'],grad:['Γκραντ','Grad']},temperature:{'°C':['Κελσίου','Celsius'],'°F':['Φαρενάιτ','Fahrenheit'],K:['Kelvin','Kelvin']}};
const unitOptions=(category,selected)=>Object.keys(units[category]||{}).map(x=>'<option value="'+x+'"'+(x===selected?' selected':'')+'>'+esc(UNIT_LABELS[category]?.[x]?.[lang==='el'?0:1]||x)+'</option>').join('');
const toolNumber=id=>{const raw=normalizeNumericInput($('#'+id)?.value??'');return raw===''?Number(TOOL_DEFAULTS[id]):Number(raw)};
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
function populateUnits(preserve=true){
 const cat=$('#unitCategory'),from=$('#unitFrom'),to=$('#unitTo');
 if(!cat||!from||!to)return;
 const category=cat.value||'length';
 const keys=Object.keys(units[category]||{});
 const previousFrom=from.value,previousTo=to.value,pick=unitPick[category];
 from.innerHTML=unitOptions(category,preserve&&keys.includes(previousFrom)?previousFrom:pick?.from??keys[0]);
 to.innerHTML=unitOptions(category,preserve&&keys.includes(previousTo)?previousTo:pick?.to??(keys[1]||keys[0]));
}
function closeUnitMenus(except=null){$$('.unit-select-menu').forEach(menu=>{if(menu!==except)menu.classList.add('hidden')})}
function liveUnitFormat(n){
 if(!Number.isFinite(n))return '';
 const abs=Math.abs(n);
 const max=Math.min(12,abs!==0&&abs<1?Math.max(6,Math.ceil(-Math.log10(abs))+6):6);
 return new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:max,useGrouping:false}).format(n);
}
const money=v=>new Intl.NumberFormat(NUMBER_LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)+' €';
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
function modeIcon(m){return ICONS[m]||''}
function renderCalcKeypad(){
 $('#keypad').className='keypad';
 // The "( )" key is only in Calculator mode; Units keeps its own layout.
 const extra=mode==='calc',parenLabel=lang==='el'?'Παρενθέσεις':'Parentheses';
 $('#keypad').innerHTML='<button class="key utility" data-action="backspace" type="button" aria-label="'+esc(t('deleteKey'))+'">⌫</button><button id="clearButton" class="key utility" data-action="clear" type="button">AC</button><button class="key utility" data-value="%" type="button">%</button><button class="key operator" data-value="/" type="button">÷</button><button class="key" data-value="7" type="button">7</button><button class="key" data-value="8" type="button">8</button><button class="key" data-value="9" type="button">9</button><button class="key operator" data-value="*" type="button">×</button><button class="key" data-value="4" type="button">4</button><button class="key" data-value="5" type="button">5</button><button class="key" data-value="6" type="button">6</button><button class="key operator" data-value="-" type="button">−</button><button class="key" data-value="1" type="button">1</button><button class="key" data-value="2" type="button">2</button><button class="key" data-value="3" type="button">3</button><button class="key operator" data-value="+" type="button">+</button>'+(extra?'<button class="key utility" data-action="paren" type="button" aria-label="'+esc(parenLabel)+'">( )</button><button class="key" data-value="0" type="button">0</button>':'<button class="key wide" data-value="0" type="button">0</button>')+'<button class="key" data-value="," type="button">,</button><button class="key equals" data-action="equals" type="button">=</button>';
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
function restoreCalculatorDisplay(){
 const d=$('#calculatorDisplay');
 if(!d||!d.querySelector('#expression')||!d.querySelector('#result')){
   d.className='display-wrap';
   d.innerHTML='<div class="expression-row"><div id="expression" class="expression" aria-live="polite"></div><button id="chartButton" class="how-button chart-button hidden" type="button" aria-label="'+esc(t('chart'))+'">'+CHART_ICON+'</button><button id="howButton" class="how-button hidden" type="button" aria-label="'+esc(t('how'))+'">?</button></div><div id="result" class="result" aria-live="polite">0</div>';
   $('#howButton').addEventListener('click',showHow);
   $('#chartButton').addEventListener('click',showToolChart);
 }
 d.classList.remove('unit-display');
}
function renderTool(){
 const calc=mode==='calc';
 const card=$('#calculatorCard');
 const modeLabel=$('#modeLabel');if(modeLabel)modeLabel.textContent=modeText(menuMode());
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
 if(mode==='fuel')html='<div class="tool-grid">'+field('fuelD',T[lang].fuelD)+field('fuelC',T[lang].fuelC)+field('fuelP',T[lang].fuelP)+'</div>';
 if(mode==='energy')html='<div class="tool-grid">'+field('energyP',T[lang].energyP)+field('energyH',T[lang].energyH)+field('energyD',T[lang].energyD)+field('energyR',T[lang].energyR)+'</div>';
 if(mode==='vat')html='<div class="tool-grid">'+field('amount',T[lang].amount)+field('vatRate',T[lang].vatRate)+'</div><div class="vat-toggle" role="radiogroup" data-active="'+vatAction+'"><span class="vat-thumb" aria-hidden="true"></span><button type="button" role="radio" data-vat-mode="add">'+esc(T[lang].addVat)+'</button><button type="button" role="radio" data-vat-mode="remove">'+esc(T[lang].removeVat)+'</button></div>';

 $('#toolPanel').innerHTML=html;
 setActiveToolInput($('#toolPanel input[data-tool-input]'));
 renderVatToggle();
 renderToolKeypad();
 fitLayout();


}
// Fit the app to the screen, the same way in every mode and on every device. Step by step, only as far as needed:
// a shorter display, smaller keys, the most compact display, the tools' compact layout (the one phones use),
// no copy button (tapping the result copies). Only if even that does not fit (a phone held sideways)
// does the page scroll; nothing is ever cut off.
// k = key height [max,min], d = display height [max,min], roomy = smallest display that keeps the ? above the result,
// comfy = key height kept as long as the display can still give way.
const FIT={
 calc:{k:[68,40],d:[205,128],roomy:172,comfy:48,copy:true},
 units:{k:[68,40],d:[205,165],comfy:48,copy:false},
 tool:{k:[56,36],d:[205,128],roomy:172,comfy:44,copy:true},
 mobileTool:{k:[56,36],d:[108,98],comfy:44,copy:true},
 graphMin:520
};
// On phones the browser bars slide in and out while scrolling, changing the height; fitting to the smallest
// height seen (per width, i.e. per orientation) keeps the layout from jumping back and forth.
const fitHeights={};
function fitAvailHeight(){const h=window.innerHeight;if(!isMobileDevice())return h;const w=window.innerWidth;fitHeights[w]=Math.min(fitHeights[w]??h,h);return fitHeights[w]}
// Big desktop screens (e.g. a 4K monitor at 100% scaling): the whole app scales up like browser zoom, so it
// fills about the same share of the screen as on a 1080p monitor. Laptops, tablets and phones stay at 1.
// CSS zoom does not scale viewport units, so the CSS divides them by --z, and code that turns screen
// pixels into CSS pixels divides by window.__uiZoom (charts, History sheet, VAT switch, fitLayout).
const ZOOM={baseH:1050,baseW:1500,min:1.1,max:2.2};
window.__uiZoom=1;
const zoomSupported=(()=>{
 try{
  if(/^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent))return false;// Safari's zoom differs; it keeps the normal size
  const o=document.createElement('div'),i=document.createElement('div');o.style.cssText='zoom:2;position:absolute;visibility:hidden';i.style.width='100px';
  o.appendChild(i);document.body.appendChild(o);const ok=Math.round(i.getBoundingClientRect().width)===200&&i.offsetWidth===100;o.remove();return ok;
 }catch{return false}
})();
function applyUiZoom(){
 let z=1;
 if(zoomSupported&&matchMedia('(hover:hover) and (pointer:fine)').matches){const raw=Math.min(innerHeight/ZOOM.baseH,innerWidth/ZOOM.baseW,ZOOM.max);if(raw>=ZOOM.min)z=Math.floor(raw*20)/20}
 if(z===window.__uiZoom)return false;
 window.__uiZoom=z;const root=document.documentElement;
 root.style.zoom=z===1?'':String(z);root.style.setProperty('--z',String(z));
 return true;
}
let fitRaf=0;
function fitLayoutSoon(){if(!fitRaf)fitRaf=requestAnimationFrame(()=>{fitRaf=0;fitLayout()})}
function fitLayout(){
 const card=$('#calculatorCard'),shell=$('.app-shell'),footer=$('.app-footer'),root=document.documentElement;if(!card||!shell||!footer)return;
 document.body.classList.add('fit');
 if(applyUiZoom())requestAnimationFrame(redrawCharts);
 const Z=window.__uiZoom;
 // everything below is in CSS pixels (screen pixels / zoom)
 const avail=fitAvailHeight()/Z;
 const need=()=>Math.ceil((footer.getBoundingClientRect().bottom+window.scrollY)/Z+(parseFloat(getComputedStyle(shell).paddingBottom)||0));
 root.classList.remove('page-scroll');shell.style.height='';card.classList.remove('compact-display','fit-no-copy');
 const tool=['fuel','energy','vat'].includes(mode),touchTool=tool&&isMobileDevice();
 const setToolLayout=compact=>{card.classList.toggle('mobile-tool',compact);document.body.classList.toggle('mobile-tool-on',compact)};
 if(tool)setToolLayout(touchTool);
 if(mode==='graph'){if(avail<FIT.graphMin){root.classList.add('page-scroll');shell.style.height=FIT.graphMin+'px'}placeSideTips();return}
 const attempt=spec=>{
  let [k,kMin]=spec.k,[d,dMin]=spec.d;
  const apply=()=>{
   card.style.setProperty('--k',k+'px');card.style.setProperty('--disp',d+'px');
   if(mode==='units')card.style.setProperty('--urow',Math.min(70,Math.floor((d-61)/2))+'px');
   card.classList.toggle('compact-display',!!spec.roomy&&d<spec.roomy);
  };
  apply();
  let over=need()-avail;if(over<=0)return 0;
  const rows=new Set([...$('#keypad').children].map(b=>b.offsetTop)).size||5;
  const shrinkDisplay=to=>{const step=Math.min(over,Math.max(0,d-to));d-=step;over-=step};
  const shrinkKeys=to=>{const dk=Math.min(Math.max(0,k-to),Math.ceil(over/rows));k-=dk;over-=dk*rows};
  if(spec.roomy)shrinkDisplay(spec.roomy);
  if(over>0)shrinkKeys(spec.comfy);
  if(over>0)shrinkDisplay(dMin);
  if(over>0)shrinkKeys(kMin);
  apply();
  return need()-avail;
 };
 let over=attempt(mode==='calc'?FIT.calc:mode==='units'?FIT.units:touchTool?FIT.mobileTool:FIT.tool);
 if(over>0&&tool&&!touchTool){setToolLayout(true);over=attempt(FIT.mobileTool)}
 const spec=mode==='calc'?FIT.calc:mode==='units'?FIT.units:FIT.tool;
 if(over>0&&spec.copy){card.classList.add('fit-no-copy');over=need()-avail}
 if(over>0)root.classList.add('page-scroll');
 root.dataset.fitOver=Math.max(0,over);// how many px did not fit (used by tests)
 placeSideTips();
}
window.addEventListener('resize',fitLayoutSoon);
window.visualViewport?.addEventListener('resize',fitLayoutSoon);
window.addEventListener('orientationchange',()=>setTimeout(fitLayout,250));
document.fonts?.ready?.then(fitLayoutSoon);
function setMode(next){
 resultCompact=false;if(mode==='calc')calcHowData=howData;mode=next;howData=next==='calc'?calcHowData:null;toolResult=null;
 if(next==='calc')refreshCalcHow();
 // Tools keep what was typed in them; only an empty VAT rate goes back to the default.
 if(next==='vat'&&!toolState.vat.inputs.vatRate)toolState.vat.inputs.vatRate='24';
 if(next==='units'){unitActiveInput=unitSource;unitReplaceOnNextKey=true;window._unitCategory=window._unitCategory||'length';}
 const label=$('#modeLabel'),icon=$('#modeIcon');if(label)label.textContent=modeText(menuMode());if(icon)icon.textContent=modeIcon(menuMode());
 renderTool();
 if(next!=='calc'&&next!=='graph'){runActiveTool();if(next!=='units')renderToolDisplay()}
 syncModeButton();
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
function refreshCalcHow(){if(justCalculated&&lastExpression&&lastResult!==null){howData=explanationForExpression(lastExpression,lastResult)||howData;if(howData&&lastShown)howData.formula=lastShown;calcHowData=howData}}
function applyLanguage(){
 lang=readLanguage();
 const savedInputs={};
 if(mode!=='calc'&&mode!=='units')$$('#toolPanel input[data-tool-input]').forEach(input=>savedInputs[input.id]=input.value);
 document.documentElement.lang=lang;
 $('#langButton').textContent=lang==='el'?'ΕΛ':'EN';
 $('#copyButton').textContent=t('copy');
 $('#historyButtonText').textContent=t('history');
 $('#howTitle').textContent=t('how');
 $('#howButton')?.setAttribute('aria-label',t('how'));
 $('#historyPanel').setAttribute('aria-label',t('history'));
 $('#historyConfirmYes').textContent=t('confirmYes');
 $('#historyTitle').textContent=t('history');
 $('#clearHistory').textContent=t('clear');
 $('#historyConfirmText').textContent=t('confirm');
 $('#closeHow').setAttribute('aria-label',t('close'));
 $('#closeHistory').setAttribute('aria-label',t('close'));
 $('#historyChartButton')?.setAttribute('aria-label',t('chart'));
 $('#historyChartButton')?.setAttribute('title',t('chart'));
 $('#themeButton').setAttribute('aria-label',((theme==='dark'||(theme==='auto'&&!matchMedia('(prefers-color-scheme: light)').matches))?t('themeLight'):t('themeDark')));
 const hint=$('#hint');if(hint)hint.textContent=t('hint');
 syncInstallButton();
 const created=$('#createdBy');if(created)created.innerHTML=esc(t('created'))+' '+AUTHORS.map(n=>'<span class="author">'+esc(n)+'</span>').join(' &amp; ');
 if(mode==='calc')refreshCalcHow();
 renderTool();
 Object.entries(savedInputs).forEach(([id,value])=>{
   if(toolState[mode])toolState[mode].inputs[id]=value;
   const input=$('#'+id);if(input)input.value=value;
 });
 if(mode==='fuel')window._runFuel?.();
 else if(mode==='energy')window._runEnergy?.();
 else if(mode==='vat')window._runVat?.(vatAction==='add');
 else if(mode==='units')window._runUnits?.();
 else render();
 renderModeMenu();
 syncModeButton();
 renderVatToggle();
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
// Shown in the footer, in English in both languages.
const AUTHORS=['Leonidas Kampaxis','Efstathios Konstantinos Tsakiris'];
const MODE_LABELS=['calc','graph','vat','fuel','energy'];
function renderModeMenu(){
 const menu=$('#modeMenu');if(!menu)return;
 menu.innerHTML=MODE_LABELS.filter(m=>m!==menuMode()).map(m=>`<button class="mode-item" data-mode="${m}" type="button"><span class="mode-item-icon">${modeIcon(m)}</span><span class="mode-item-label">${esc(modeText(m))}</span></button>`).join('');
 menu.querySelectorAll('.mode-item').forEach(b=>b.addEventListener('click',e=>{
   e.stopPropagation();
   const next=b.dataset.mode;
   closeModeMenu();
   setMode(next);
 }));
}
function syncModeButton(){
 const label=$('#modeLabel'),icon=$('#modeIcon'),button=$('#modeButton');
 if(label)label.textContent=modeText(menuMode());
 if(icon)icon.textContent=modeIcon(menuMode());
 if(button){button.dataset.mode=menuMode();button.setAttribute('aria-label',modeText(menuMode()));}
 renderModeMenu();
 renderSideTips();
 syncQuickMode();
}
// Side columns on wide desktop screens (shown by CSS only): keyboard shortcuts on the left, tips for the current mode on the right.
// Each shortcut is [keys, text]; keys are shown as separate key caps.
const SIDE_KEYS={
 calc:{el:[[['0–9'],'Αριθμοί'],[['+','-','*','/'],'Πράξεις'],[[',','.'],'Υποδιαστολή'],[['(',')'],'Παρενθέσεις'],[['%'],'Ποσοστό'],[['Enter','='],'Αποτέλεσμα'],[['Backspace'],'Σβήνει το τελευταίο'],[['Esc'],'Καθαρίζει την πράξη']],
       en:[[['0–9'],'Numbers'],[['+','-','*','/'],'Operators'],[[',','.'],'Decimal point'],[['(',')'],'Parentheses'],[['%'],'Percent'],[['Enter','='],'Result'],[['Backspace'],'Delete last'],[['Esc'],'Clear the calculation']]},
 units:{el:[[['0–9'],'Αριθμοί'],[['+','-','*','/'],'Πράξη μέσα στην τιμή'],[[',','.'],'Υποδιαστολή'],[['%'],'Ποσοστό'],[['Enter','='],'Ολοκλήρωση'],[['Backspace'],'Σβήνει το τελευταίο'],[['Esc'],'Κλείνει ανοιχτά παράθυρα']],
        en:[[['0–9'],'Numbers'],[['+','-','*','/'],'Math inside the value'],[[',','.'],'Decimal point'],[['%'],'Percent'],[['Enter','='],'Finish'],[['Backspace'],'Delete last'],[['Esc'],'Close open windows']]},
 graph:{el:[[['x'],'Η μεταβλητή x'],[['^'],'Δύναμη, π.χ. x^3'],[['sin','sqrt','ln'],'Συναρτήσεις: γράψε το όνομα'],[['Enter'],'Επόμενη συνάρτηση'],[['↑','↓'],'Αλλαγή συνάρτησης'],[['←','→'],'Μετακίνηση γραφήματος'],[['Backspace'],'Σβήνει το τελευταίο'],[['Esc'],'Καθαρίζει τη συνάρτηση']],
        en:[[['x'],'The variable x'],[['^'],'Power, e.g. x^3'],[['sin','sqrt','ln'],'Functions: type the name'],[['Enter'],'Next function'],[['↑','↓'],'Switch function'],[['←','→'],'Move the graph'],[['Backspace'],'Delete last'],[['Esc'],'Clear the function']]},
 tool:{el:[[['Tab'],'Επόμενο πεδίο'],[['Shift','Tab'],'Προηγούμενο πεδίο'],[['0–9'],'Αριθμοί στο πεδίο'],[[',','.'],'Υποδιαστολή'],[['Backspace'],'Σβήνει το τελευταίο'],[['Esc'],'Κλείνει ανοιχτά παράθυρα']],
       en:[[['Tab'],'Next field'],[['Shift','Tab'],'Previous field'],[['0–9'],'Type in the field'],[[',','.'],'Decimal point'],[['Backspace'],'Delete last'],[['Esc'],'Close open windows']]}
};
const SIDE_TIPS={
 calc:{el:['Το κουμπί ( ) καταλαβαίνει μόνο του αν ανοίγει ή κλείνει παρένθεση. Όσες ξεχάσεις ανοιχτές, τις κλείνει το =.','Για αρνητικό αριθμό πάτα − αμέσως μετά από × ή ÷. Το 2 × − 3 δίνει −6.','Το 50 + 10% δίνει 55, γιατί το ποσοστό παίρνεται από τον προηγούμενο αριθμό.','Πάτα ξανά = για να επαναλάβεις την τελευταία πράξη. Το 2 + 3 = = δίνει 8.','Μετά το αποτέλεσμα, το ? δείχνει βήμα βήμα πώς βγήκε.','Στο Ιστορικό, πάτα έναν υπολογισμό για να τον ξαναφέρεις.','Κράτα πατημένο το ⌫ για να τα σβήσεις όλα, όπως το AC.','Το κουμπί ↔ δίπλα στη λειτουργία ανοίγει τις Μονάδες, μαζί με τον αριθμό που φαίνεται.'],
       en:['The ( ) key works out on its own whether to open or close a parenthesis. Any you leave open, = closes for you.','For a negative number, press − right after × or ÷. 2 × − 3 gives −6.','50 + 10% gives 55, because the percent is taken from the previous number.','Press = again to repeat the last operation. 2 + 3 = = gives 8.','After a result, the ? button shows step by step how it was worked out.','In History, click a calculation to bring it back.','Hold ⌫ to clear everything, like AC.','The ↔ button next to the mode opens Units, taking the number on screen with it.']},
 graph:{el:['Έως τρεις συναρτήσεις μαζί. Το + δίπλα στη συνάρτηση προσθέτει νέα.','Σύρε το γράφημα για να το μετακινήσεις. Ζουμ με τη ρόδα του ποντικιού, τα + − ή με δύο δάχτυλα.','Οι τελείες δείχνουν ρίζες, ελάχιστα, μέγιστα και τομές. Πάτα μία για να δεις τις τιμές της, ή το ? για λίστα.','Το ⤢ προσαρμόζει το ύψος στην καμπύλη και το ⌂ γυρίζει στην αρχή. Το ⤓ το αποθηκεύει ως εικόνα.','Το 2x σημαίνει 2 × x και το sin x σημαίνει sin(x). Οι γωνίες είναι σε ακτίνια.'],
        en:['Up to three functions at once. The + next to a function adds a new one.','Drag the graph to move it. Zoom with the mouse wheel, the + − buttons or two fingers.','The dots mark roots, minima, maxima and intersections. Click one to see its values, or ? for a list.','⤢ fits the height to the curve and ⌂ goes back to the start. ⤓ saves it as an image.','2x means 2 × x and sin x means sin(x). Angles are in radians.']},
 units:{el:['Πάτα την πάνω ή την κάτω τιμή για να γράψεις εκεί. Η άλλη μετατρέπεται αμέσως.','Το ⇄ αλλάζει θέση στις δύο μονάδες.','Μπορείς να γράψεις και πράξη, π.χ. 12 + 8, και να πατήσεις =.','Από το μενού πάνω από τις τιμές διαλέγεις κατηγορία: μήκος, βάρος, θερμοκρασία, δεδομένα και άλλα.','Το Εμβαδόν έχει και στρέμματα.','Πάτα ξανά το ↔ για να γυρίσεις στην Αριθμομηχανή, όπως την άφησες.'],
        en:['Click the top or bottom value to type there. The other one converts right away.','⇄ swaps the two units.','You can type a calculation too, e.g. 12 + 8, then press =.','The menu above the values picks the category: length, mass, temperature, data and more.','Area includes the Greek stremma.','Press ↔ again to go back to the Calculator, just as you left it.']},
 vat:{el:['«Πρόσθεσε ΦΠΑ»: από την καθαρή τιμή βρίσκεις την τελική.','«Αφαίρεσε ΦΠΑ»: από την τελική τιμή βρίσκεις την καθαρή και πόσος ήταν ο ΦΠΑ.','Ο συντελεστής ξεκινά στο 24%. Άλλαξέ τον αν χρειάζεσαι άλλον.','Σύρε τον διακόπτη ή πάτα ← → πάνω του για να αλλάξεις πρόσθεση και αφαίρεση.','Το ? δείχνει πώς βγήκε το ποσό και το κουμπί με τις στήλες το δείχνει σε διάγραμμα.'],
      en:['"Add VAT": from the net price you get the final price.','"Remove VAT": from the final price you get the net price and how much VAT it had.','The rate starts at 24%. Change it if you need another one.','Drag the switch, or press ← → on it, to change between add and remove.','The ? button shows how the amount was worked out, and the bars button shows it as a chart.']},
 fuel:{el:['Συμπλήρωσε απόσταση, κατανάλωση και τιμή. Το κόστος βγαίνει αμέσως.','Την κατανάλωση σε L/100 km τη δείχνει ο υπολογιστής ταξιδιού του αυτοκινήτου.','Για ταξίδι με επιστροφή, βάλε διπλή απόσταση.','Κάτω από το κόστος βλέπεις πόσα λίτρα θα κάψεις και πόσο κοστίζει κάθε km.','Το κουμπί με τις στήλες δείχνει πώς αλλάζει το κόστος με την απόσταση.','Ο σελιδοδείκτης αποθηκεύει τον υπολογισμό. Η λίστα δίπλα δείχνει μέση τιμή και σύνολα.'],
       en:['Fill in distance, consumption and price. The cost shows up right away.','The car\'s trip computer shows consumption in L/100 km.','For a round trip, enter double the distance.','Under the cost you see the litres used and the cost per km.','The bars button shows how the cost changes with distance.','The bookmark button saves the calculation. The list button shows the average price, average consumption and totals.']},
 energy:{el:['Την ισχύ σε W τη γράφει το ταμπελάκι ή το κουτί της συσκευής.','Βάλε 30 ημέρες για το κόστος ενός μήνα ή 365 για έναν χρόνο.','Η τιμή ανά kWh γράφεται στον λογαριασμό του ρεύματος.','Για συσκευές που ανάβουν και σβήνουν μόνες τους, όπως το ψυγείο, οι ώρες είναι κατά προσέγγιση.','Το κουμπί με τις στήλες δείχνει το κόστος ανά ημέρα, μήνα και χρόνο.'],
         en:['The power in W is on the device\'s label or box.','Use 30 days for a month\'s cost, or 365 for a year.','The price per kWh is on your electricity bill.','For devices that switch on and off by themselves, like a fridge, the hours are an estimate.','The bars button shows the cost per day, month and year.']}
};
function renderSideTips(){
 const left=$('#sideKeys'),right=$('#sideTips');if(!left||!right)return;
 const l=lang==='el'?'el':'en',keys=(SIDE_KEYS[mode]||SIDE_KEYS.tool)[l],tips=(SIDE_TIPS[mode]||SIDE_TIPS.calc)[l];
 left.setAttribute('aria-label',l==='el'?'Συντομεύσεις πληκτρολογίου':'Keyboard shortcuts');
 right.setAttribute('aria-label',l==='el'?'Συμβουλές':'Tips');
 left.innerHTML='<h2 class="side-title">'+(l==='el'?'Πληκτρολόγιο':'Keyboard')+'</h2><ul class="side-keys">'+keys.map(([k,text])=>'<li><span class="side-caps">'+k.map(x=>'<kbd>'+esc(x)+'</kbd>').join('')+'</span><span class="side-key-text">'+esc(text)+'</span></li>').join('')+'</ul>';
 right.innerHTML='<h2 class="side-title">'+(l==='el'?'Συμβουλές':'Tips')+' · '+esc(modeText(mode))+'</h2><ul class="side-list">'+tips.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
 placeSideTips();
}
// Line the side columns up with the top of the calculator card.
function placeSideTips(){const card=$('#calculatorCard');if(card)document.documentElement.style.setProperty('--side-top',Math.round(card.getBoundingClientRect().top/(window.__uiZoom||1))+'px')}
window.addEventListener('resize',placeSideTips);
// Units is a switch inside the Calculator: the ↔ button turns it on (and stays pressed) and off again.
// Turning it on takes the number the calculator shows with it; turning it off returns to the calculator
// exactly as it was (Units does its own math, so nothing comes back).
function syncQuickMode(){
 const b=$('#quickModeButton');if(!b)return;
 const show=mode==='calc'||mode==='units';b.classList.toggle('hidden',!show);if(!show)return;
 const on=mode==='units';
 b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
 $('#quickModeIcon').textContent=modeIcon('units');b.setAttribute('aria-label',modeText('units'));b.title=modeText('units');
}
// The calculator's current number: the result, or what is being typed (an unfinished calculation is worked out). null if none.
function calcNumberForUnits(){
 if(current==='Error')return null;
 try{
  let value;
  if(justCalculated&&lastResult)value=lastResult;
  else{
   let full=(expression+current).replace(/[+\-×÷*/(]+$/,'');
   if(!full)return null;
   const open=(full.match(/\(/g)||[]).length-(full.match(/\)/g)||[]).length;if(open>0)full+=')'.repeat(open);
   value=evalExpr(full);
  }
  return value?ratToDecimal(value,24):null;
 }catch{return null}
}
function toggleUnits(){
 if(mode==='units'){setMode('calc');return}
 const v=calcNumberForUnits();
 if(v!==null){unitExpressions={from:v,to:''};unitSource='from';unitActiveInput='from';unitSourceTyped=false}
 setMode('units');
}
// Holding ⌫ clears everything, the same as AC, in every mode.
function clearEverything(){if(mode==='calc')clearAll();else if(mode==='units')toolKeyInput('clear');else if(mode==='graph')graphKey('clear');else clearToolFields()}
function setupHoldToClear(){
 const pad=$('#keypad');let timer=0,fired=false,key=null;
 const backKey=t=>t?.closest?.('[data-action="backspace"],[data-g="back"]');
 const cancel=()=>{clearTimeout(timer);timer=0;key?.classList.remove('holding');key=null};
 pad.addEventListener('pointerdown',e=>{
  const b=backKey(e.target);if(!b||e.button>0)return;
  cancel();fired=false;key=b;b.classList.add('holding');
  timer=setTimeout(()=>{timer=0;fired=true;b.classList.remove('holding');clearEverything();try{navigator.vibrate?.(15)}catch{}const k=backKey(document.elementFromPoint(e.clientX,e.clientY))||b;k.classList.add('held');setTimeout(()=>k.classList.remove('held'),300)},500);
 });
 pad.addEventListener('pointerup',cancel);pad.addEventListener('pointercancel',cancel);
 pad.addEventListener('pointerleave',e=>{if(key&&e.target===key)cancel()},true);
 // the click that ends a long press must not also delete one character
 pad.addEventListener('click',e=>{if(fired&&backKey(e.target)){fired=false;e.stopImmediatePropagation();e.preventDefault()}},true);
 pad.addEventListener('contextmenu',e=>{if(backKey(e.target))e.preventDefault()});
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
 // Only tracks swipes to expand/collapse. The handle drag itself lives in history-interaction.js;
 // adding .dragging here disabled the list (pointer-events:none) and stopped it scrolling.
 let startScroll=0;
 const start=e=>{startY=e.touches[0].clientY;startScroll=list.scrollTop;tracking=true};
 // Swipe up expands the sheet (only when it is not expanded yet, otherwise it is a normal scroll).
 // Swipe down collapses it only if the list was already at the top when the touch began.
 const end=e=>{if(!tracking)return;const dy=e.changedTouches[0].clientY-startY;tracking=false;if(dy<-35&&!p.classList.contains('expanded')){p.classList.add('expanded');list.scrollTop=0}else if(dy>35&&startScroll<=2){p.classList.remove('expanded')}startY=0};
 [p,handle].forEach(el=>{el.addEventListener('touchstart',start,{passive:true});el.addEventListener('touchend',end,{passive:true})});
 let timer;list.addEventListener('scroll',()=>{list.classList.add('is-scrolling');clearTimeout(timer);timer=setTimeout(()=>list.classList.remove('is-scrolling'),650)},{passive:true})
}
function clearHistoryConfirm(){
 historyClearConfirm=!historyClearConfirm;const wrap=$('#historyClearWrap'),btn=$('#clearHistory'),confirm=$('#historyConfirm');
 if(historyClearConfirm){btn.classList.add('hidden');confirm.classList.remove('hidden');$('#historyConfirmText').textContent=t('confirm')}else{btn.classList.remove('hidden');confirm.classList.add('hidden')}
 wrap.classList.toggle('confirming',historyClearConfirm)
}
function deleteAllHistory(){store.del('uc-history');historyClearConfirm=false;$('#clearHistory').classList.remove('hidden');$('#historyConfirm').classList.add('hidden');$('#historyClearWrap').classList.remove('confirming');renderHistory()}
function historyClick(e){
 const del=e.target.closest('[data-delete]'),item=e.target.closest('[data-history]');
 if(del){store.set('uc-history',JSON.stringify(historyItems().filter(x=>String(x.id)!==del.dataset.delete)));renderHistory();return}
 if(item){const x=historyItems().find(x=>String(x.id)===item.dataset.history);if(!x)return;closeHistory();setMode('calc');carry=null;lastExpression=x.expression;lastShown=x.shown||formatInputDisplay(x.expression);lastResult=ratFromString(String(x.result));justCalculated=true;expression='';current='';currentIsPercent=false;howData=explanationForExpression(x.expression,lastResult)||x.how||null;if(howData&&lastShown)howData.formula=lastShown;calcHowData=howData;lastOperation=parseLastOperation(x.expression);render();syncModeButton()}
}
function copyResult(){
 // Copies what the screen shows: the result, the expression being typed, or in Units the converted value.
 const unitResult=()=>{const side=unitSource==='to'?'from':'to';return formatUnitResult(unitExpressions[side]??'')};
 const value=mode==='calc'?(justCalculated?fmt(lastResult):(expression+current?formatExpressionDisplay(expression+current):'')):mode==='units'?unitResult():(toolResult?.main??'');
 if(value===''||value===t('toolReady')||!navigator.clipboard)return;
 navigator.clipboard.writeText(String(value)).then(()=>{const b=$('#copyButton');b.textContent=t('copied');setTimeout(()=>b.textContent=t('copy'),900)}).catch(()=>{})
}
function clearToolFields(){
 if(mode==='units'){
   unitExpressions={from:'0',to:'0'};unitSourceTyped=false;
   unitActiveInput='from';
   unitSource='from';
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
 if(mode==='units'){
   const side=unitActiveInput||'from';
   let value=unitExpressions[side]||'';
   if(key==='clear'){unitExpressions={from:'0',to:'0'};unitActiveInput='from';unitSource='from';unitReplaceOnNextKey=true;unitSourceTyped=false;updateUnitsDisplay();return true}
   if(key==='backspace'){unitReplaceOnNextKey=false;value=value.slice(0,-1)||'0'}
   else{
     if(unitReplaceOnNextKey&&['+','-','*','/'].includes(key))unitReplaceOnNextKey=false;
     else if(unitReplaceOnNextKey&&key!=='%'){value='';unitReplaceOnNextKey=false}
     if(key==='.'||key===','){
       const tail=value.split(/[+*/-]/).pop();
       if(!tail.includes('.'))value+=value&&/[+*/-]$/.test(value)?'0.':value?'.':'0.';
     }else if(key==='%'){
       if(!value||/[+*/-]$/.test(value)||value.endsWith('%'))return false;
       value+='%';
     }else if(key==='-'){
       if(value==='')value='-';
       else if(/[+*/-]$/.test(value)){
         if(value.endsWith('-'))value=value.slice(0,-1);
         else value=value.slice(0,-1)+'-';
       }else value+='-';
     }else if(/^[0-9]$/.test(key)){
       if(value==='0')value=key;
       else if(/(?:^|[+*/-])0$/.test(value))value=value.slice(0,-1)+key;
       else value+=key;
     }
     else if(['+','*','/'].includes(key)){
       if(!value)return false;
       if(/[+*/-]$/.test(value))value=value.slice(0,-1)+key;
       else value+=key;
     }else return false;
   }
   unitExpressions[side]=value;unitSource=side;unitSourceTyped=true;convertUnitExpression(side);return true;
 }
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
$('#keypad').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 // The keypad shows "," as the decimal key; every mode handles it as ".".
 if(mode==='graph'){graphKey(b.dataset.g);return}
 const a=b.dataset.action,v=b.dataset.value===','?'.':b.dataset.value;
 if(mode!=='calc'&&a==='clear-all'){clearToolFields();return;}
 if(mode!=='calc'){
   if(mode==='units'){
     if(a==='clear'||a==='backspace'||v==='.'||v==='%'||/^\d$/.test(v||'')||['+','-','*','/'].includes(v||'')){toolKeyInput(a==='clear'?'clear':a==='backspace'?'backspace':v==='/'?'/':v);return}
     if(a==='equals')window._equalsUnits?.();
     return;
   }
   if(a==='clear'||a==='backspace'||v==='.'||/^\d$/.test(v||'')){toolKeyInput(a==='clear'?'clear':a==='backspace'?'backspace':v);return}
   if(v==='-'){toolKeyInput('-');return}
   return;
 }
 if(a==='clear')clearButtonAction();else if(a==='backspace')backspace();else if(a==='equals')equals();else if(a==='paren')smartParen();else if(v==='%')percent();else if(/[+\-*/]/.test(v||''))operator(v==='*'?'×':v==='/'?'÷':v);else if(v)digit(v)
});
$('#toolPanel').addEventListener('click',e=>{
 const clear=e.target.closest('[data-mobile-action="clear-all"]');
 if(clear){clearToolFields();return}
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
$('#howButton').addEventListener('click',showHow);$('#closeHow').addEventListener('click',closeHow);$('#howModal').addEventListener('click',e=>{if(e.target.id==='howModal')closeHow()});
$('#historyButton').addEventListener('click',openHistory);$('#closeHistory').addEventListener('click',closeHistory);$('#historyBackdrop').addEventListener('click',closeHistory);$('#historyList').addEventListener('click',historyClick);$('#copyButton').addEventListener('click',copyResult);
// Tapping a result copies it too (on short screens the copy button is hidden to make room for the keypad).
$('#calculatorDisplay').addEventListener('click',e=>{if(mode==='units'||mode==='graph'||!e.target.closest('#result'))return;if(mode==='calc'?!justCalculated:!toolResult?.main)return;copyResult();const r=$('#result');r.classList.add('copied');setTimeout(()=>r.classList.remove('copied'),700)});
$('#langButton').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setLanguage(lang==='el'?'en':'el')});
$('#themeButton').addEventListener('click',toggleTheme);
$('#installButton')?.addEventListener('click',installApp);
$('#modeButton').addEventListener('click',e=>{e.stopPropagation();toggleModeMenu()});
$('#quickModeButton')?.addEventListener('click',e=>{e.stopPropagation();closeModeMenu();toggleUnits()});
setupHoldToClear();
 document.addEventListener('click',e=>{if(!e.target.closest('#modeButton')&&!e.target.closest('#modeMenu'))closeModeMenu();if(!e.target.closest('.unit-select')&&!e.target.closest('.unit-select-menu'))closeUnitMenus();if(historyClearConfirm&&!e.target.closest('#historyClearWrap'))clearHistoryConfirm()});
$('#clearHistory').addEventListener('click',clearHistoryConfirm);$('#historyConfirmYes').addEventListener('click',deleteAllHistory);
window.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 // An open (or focused) dropdown handles its own keys: arrows, Enter, typing to jump to an item.
 if(document.activeElement?.closest?.('select'))return;
 if(mode==='calc'&&e.key.length===1&&!/^[0-9+\-*/%.,()=]$/.test(e.key)){e.preventDefault();e.stopImmediatePropagation();return}
 if(mode==='graph'&&e.key!=='Escape'){if($('#howModal').classList.contains('hidden')&&$('#historyPanel').classList.contains('hidden')&&graphKeydown(e))e.preventDefault();return}
 if(e.key==='Backspace'||e.code==='Backspace'){e.preventDefault();if(mode==='calc')backspace();else toolKeyInput('backspace');return;}
 if(e.key==='%'&&mode==='units'){e.preventDefault();toolKeyInput('%');return}
 if(e.key===','||e.key==='.'||e.key==='Decimal'){e.preventDefault();if(mode==='calc')digit('.');else if(document.activeElement?.matches('#toolPanel input')){const input=document.activeElement;const pos=input.selectionStart??input.value.length;input.setRangeText(',',pos,pos,'end');input.dispatchEvent(new Event('input',{bubbles:true}))}else toolKeyInput('.');return}
 if(mode==='calc'&&(e.key==='('||e.key===')')){e.preventDefault();parenthesis(e.key);return}
 if(e.key==='Escape'){
   if(!$('#howModal').classList.contains('hidden')){e.preventDefault();closeHow();return}
   if(!$('#historyPanel').classList.contains('hidden')){e.preventDefault();closeHistory();return}
   if($('.mode-control')?.classList.contains('mode-open')){e.preventDefault();closeModeMenu();return}
   if(mode==='calc'){e.preventDefault();clearAll()}
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
window.__UC_VERSION=VERSION;$('#footerVersion').textContent=`v${VERSION}`;loadTools();lang=readLanguage();bindTools();renderHistory();renderTool();renderModeMenu();syncModeButton();setupHistorySheet();setupVatSlide();bindHistoryChart();$('#chartButton')?.addEventListener('click',showToolChart);applyLanguage();applyTheme();window.addEventListener('pageshow',e=>{if(e.persisted&&mode!=='calc')setMode('calc')});
