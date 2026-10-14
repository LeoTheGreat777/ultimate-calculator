// Currency: the Units screen with the category fixed to 'currency' (the Currency tab: `unitView` in core.js).
// Rates are the European Central Bank's daily reference rates (euro based), fetched from Frankfurter, which serves
// them with CORS. The last rates are kept (uc-rates) so it works offline; before the first fetch a copy shipped with
// the app (RATES_SNAPSHOT) is used. Rates are exact decimals (strings): amount × rate(to) ÷ rate(from), via fractions.
const RATES_URL='https://api.frankfurter.dev/v1/latest';
const RATES_KEY='uc-rates';
const RATES_SNAPSHOT={date:'2026-10-13',rates:{USD:'1.1188',JPY:'176.91',CZK:'24.368',DKK:'7.4753',GBP:'0.8446',HUF:'364.31',PLN:'4.3768',RON:'5.3363',SEK:'11.1698',CHF:'0.9312',ISK:'136.2',NOK:'10.6685',TRY:'55.2325',AUD:'1.6033',BRL:'5.6125',CAD:'1.5933',CNY:'7.489',HKD:'8.7802',IDR:'20004.87',ILS:'3.4404',INR:'106.6',KRW:'1500.81',MXN:'20.5126',MYR:'4.5714',NZD:'1.9931',PHP:'70.225',SGD:'1.4319',THB:'37.58',ZAR:'18.4561'}};
const RATES_STALE_MS=60*60*1000;// ask again after an hour (the ECB publishes once a working day, around 16:00 CET)
const CURRENCY_NAMES={EUR:['Ευρώ','Euro'],USD:['Δολάριο ΗΠΑ','US dollar'],GBP:['Λίρα Αγγλίας','Pound sterling'],CHF:['Φράγκο Ελβετίας','Swiss franc'],
 AUD:['Δολάριο Αυστραλίας','Australian dollar'],BGN:['Λεβ Βουλγαρίας','Bulgarian lev'],BRL:['Ρεάλ Βραζιλίας','Brazilian real'],CAD:['Δολάριο Καναδά','Canadian dollar'],
 CNY:['Γουάν Κίνας','Chinese yuan'],CZK:['Κορώνα Τσεχίας','Czech koruna'],DKK:['Κορώνα Δανίας','Danish krone'],HKD:['Δολάριο Χονγκ Κονγκ','Hong Kong dollar'],
 HUF:['Φιορίνι Ουγγαρίας','Hungarian forint'],IDR:['Ρουπία Ινδονησίας','Indonesian rupiah'],ILS:['Σέκελ Ισραήλ','Israeli shekel'],INR:['Ρουπία Ινδίας','Indian rupee'],
 ISK:['Κορώνα Ισλανδίας','Icelandic króna'],JPY:['Γιεν Ιαπωνίας','Japanese yen'],KRW:['Γουόν Ν. Κορέας','South Korean won'],MXN:['Πέσο Μεξικού','Mexican peso'],
 MYR:['Ρινγκίτ Μαλαισίας','Malaysian ringgit'],NOK:['Κορώνα Νορβηγίας','Norwegian krone'],NZD:['Δολάριο Ν. Ζηλανδίας','New Zealand dollar'],PHP:['Πέσο Φιλιππινών','Philippine peso'],
 PLN:['Ζλότι Πολωνίας','Polish złoty'],RON:['Λέου Ρουμανίας','Romanian leu'],SEK:['Κορώνα Σουηδίας','Swedish krona'],SGD:['Δολάριο Σιγκαπούρης','Singapore dollar'],
 THB:['Μπατ Ταϊλάνδης','Thai baht'],TRY:['Λίρα Τουρκίας','Turkish lira'],ZAR:['Ραντ Ν. Αφρικής','South African rand']};
const CURRENCY_FIRST=['EUR','USD','GBP','CHF'];
let rates=(()=>{try{const s=JSON.parse(store.get(RATES_KEY)||'null');if(s&&/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&s.rates&&typeof s.rates==='object')return s}catch{}return {...RATES_SNAPSHOT,checked:0}})();
let ratesStatus='';// '' | 'loading' | 'offline'
// units.currency: the currencies in menu order, each with its rate per euro.
function applyRates(){
 const codes=Object.keys(rates.rates).filter(c=>/^[A-Z]{3}$/.test(c)&&/^\d+(\.\d+)?$/.test(rates.rates[c]));
 const order=[...CURRENCY_FIRST,...codes.filter(c=>!CURRENCY_FIRST.includes(c)).sort()].filter(c=>c==='EUR'||codes.includes(c));
 units.currency=Object.fromEntries(order.map(c=>[c,c==='EUR'?'1':rates.rates[c]]));
 UNIT_LABELS.currency=Object.fromEntries(order.map(c=>[c,(CURRENCY_NAMES[c]||[c,c]).map(n=>c+' · '+n)]));
}
applyRates();
if(!unitPick.currency)unitPick.currency={from:'EUR',to:'USD'};
const currencyRate=(from,to)=>ratDiv(ratFromString(units.currency[to]||'1'),ratFromString(units.currency[from]||'1'));
// Money: cents from 1 up, more decimals for small amounts so something always shows (1 JPY = 0,0056 EUR).
function formatMoneyValue(r){
 if(r.n===0n)return '0,00';
 const abs=Math.abs(ratToNumber(r));if(abs>=1e15)return ratScientific(r);
 const dec=abs>=1?2:Math.min(10,Math.ceil(-Math.log10(abs))+3);
 let s=ratToRoundedDecimal(r,dec);if(dec===2){const [w,f='']=s.split('.');s=w+'.'+f.padEnd(2,'0')}
 return formatGroupedNumber(s);
}
// A rate: five significant digits or so (1,1206 · 0,0056391).
function formatRateValue(r){const abs=Math.abs(ratToNumber(r));if(!abs)return '0';return formatGroupedNumber(ratToRoundedDecimal(r,abs>=1?4:Math.min(12,Math.ceil(-Math.log10(abs))+4)))}
// The line above the values: today's rate for the pair and its date; tap it to fetch the rates again.
function renderRateInfo(){
 const el=$('#rateInfo');if(!el)return;
 const from=$('#unitFrom')?.value||'EUR',to=$('#unitTo')?.value||'USD',r=currencyRate(from,to);
 const p=rates.date.split('-'),when=p[2]+'/'+p[1]+'/'+p[0];
 el.innerHTML='<span class="rate-pair">1 '+esc(from)+' = '+esc(formatRateValue(r))+' '+esc(to)+'</span><span class="rate-date">'+
  esc(ratesStatus==='loading'?t('ratesUpdating'):t('ratesOf').replace('{d}',when)+(ratesOffline()?' · '+t('ratesOffline'):''))+'</span>';
 el.classList.toggle('loading',ratesStatus==='loading');
}
// Offline: the last fetch failed, or the device says it has no connection (no need to tap the line to find out).
const ratesOffline=()=>ratesStatus==='offline'||navigator.onLine===false;
addEventListener('offline',()=>renderRateInfo());
addEventListener('online',()=>{if(ratesStatus==='offline'||Date.now()-(rates.checked||0)>=RATES_STALE_MS)refreshRates(true);else renderRateInfo()});
let ratesFetching=null;
function refreshRates(force){
 if(ratesFetching||(!force&&Date.now()-(rates.checked||0)<RATES_STALE_MS))return ratesFetching;
 ratesStatus='loading';renderRateInfo();
 ratesFetching=fetch(RATES_URL,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(j=>{
  if(!j||j.base!=='EUR'||!/^\d{4}-\d{2}-\d{2}$/.test(j.date)||!j.rates)throw 0;
  const got={};Object.entries(j.rates).forEach(([c,v])=>{if(/^[A-Z]{3}$/.test(c)&&Number.isFinite(v)&&v>0)got[c]=String(v)});
  if(Object.keys(got).length<5)throw 0;
  rates={date:j.date,rates:got,checked:Date.now()};store.set(RATES_KEY,JSON.stringify(rates));ratesStatus='';
  applyRates();
  if(mode==='units'&&unitView==='currency'){populateUnits(true);window._runUnits?.()}
 }).catch(()=>{ratesStatus='offline'}).finally(()=>{ratesFetching=null;renderRateInfo()});
 return ratesFetching;
}
// On a phone the closed menu is narrow: the chosen currency shows just its code (USD); the list keeps the names.
function shortCurrencyLabels(){
 if(unitView!=='currency'||!isMobileDevice())return;
 ['#unitFrom','#unitTo'].forEach(id=>{const sel=$(id);if(!sel)return;[...sel.options].forEach(o=>{o.textContent=o.selected?o.value:UNIT_LABELS.currency[o.value]?.[lang==='el'?0:1]||o.value})});
}
