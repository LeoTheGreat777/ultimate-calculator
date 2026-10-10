// The Dates tool: the days between two dates, and a date plus or minus some days, counting all days or working days
// only (the "Working days" chip on the display, like f(x) on the calculator: `dateCount`). Dates are picked with the device's own date picker
// (<input type="date">, value YYYY-MM-DD). Day numbers count from 1970 in UTC, so summer time never shifts a day.
// Working days: Monday to Friday, without Greek public holidays (fixed ones, and the ones that move with Orthodox Easter).
// "Between" has no number to type, so the keypad's space shows the details (#keypad.date-details).
const DAY_MS=864e5;
function dayNumber(y,m,d){const t=new Date(0);t.setUTCFullYear(y,m-1,d);return Math.round(t.getTime()/DAY_MS)}
function dayParts(n){const t=new Date(n*DAY_MS);return {y:t.getUTCFullYear(),m:t.getUTCMonth()+1,d:t.getUTCDate(),wd:t.getUTCDay()}}
function todayNumber(){const t=new Date();return dayNumber(t.getFullYear(),t.getMonth()+1,t.getDate())}
const pad2=n=>String(n).padStart(2,'0');
function isoDate(n){const p=dayParts(n);return String(p.y).padStart(4,'0')+'-'+pad2(p.m)+'-'+pad2(p.d)}
function dateText(n){const p=dayParts(n);return pad2(p.d)+'/'+pad2(p.m)+'/'+p.y}
const DATE_MIN=dayNumber(1000,1,1),DATE_MAX=dayNumber(9999,12,31);
// A date field's day number, or null when it's empty or not a date.
function dateField(id){
 const m=/^(\d{4,})-(\d{2})-(\d{2})$/.exec($('#'+id)?.value??'');if(!m)return null;
 const n=dayNumber(+m[1],+m[2],+m[3]);return n>=DATE_MIN&&n<=DATE_MAX?n:null;
}
const WEEKDAYS={el:['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'],en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']};
const weekday=n=>WEEKDAYS[lang==='el'?'el':'en'][dayParts(n).wd];
// Orthodox Easter Sunday (Meeus' Julian algorithm, moved to the Gregorian calendar).
function orthodoxEaster(y){
 const a=y%4,b=y%7,c=y%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7,month=Math.floor((d+e+114)/31),day=(d+e+114)%31+1;
 return dayNumber(y,month,day)+Math.floor(y/100)-Math.floor(y/400)-2;
}
const holidayCache=new Map();
function greekHolidays(y){
 if(holidayCache.has(y))return holidayCache.get(y);
 const e=orthodoxEaster(y),list=[[dayNumber(y,1,1),'newYear'],[dayNumber(y,1,6),'epiphany'],[e-48,'cleanMonday'],[dayNumber(y,3,25),'mar25'],
  [e-2,'goodFriday'],[e+1,'easterMonday'],[dayNumber(y,5,1),'may1'],[e+50,'whitMonday'],[dayNumber(y,8,15),'aug15'],[dayNumber(y,10,28),'oct28'],
  [dayNumber(y,12,25),'christmas'],[dayNumber(y,12,26),'dec26']];
 holidayCache.set(y,list);return list;
}
const isWeekday=n=>{const wd=dayParts(n).wd;return wd>0&&wd<6};
const isWorkingDay=n=>isWeekday(n)&&!greekHolidays(dayParts(n).y).some(h=>h[0]===n);
// Working days from a to b, both counted (a <= b), and the holidays that fell on weekdays.
function workingDays(a,b){
 const total=b-a+1,full=Math.floor(total/7);let weekdays=full*5;
 for(let n=a+full*7;n<=b;n++)if(isWeekday(n))weekdays++;
 const off=[];
 for(let y=dayParts(a).y;y<=dayParts(b).y;y++)greekHolidays(y).forEach(([n,name])=>{if(n>=a&&n<=b&&isWeekday(n))off.push([n,name])});
 off.sort((x,y)=>x[0]-y[0]);
 return {days:weekdays-off.length,weekdays,weekend:total-weekdays,off};
}
// Years, months and days from a to b (a <= b), the way people count them.
function ymd(a,b){
 const A=dayParts(a),B=dayParts(b);let y=B.y-A.y,m=B.m-A.m,d=B.d-A.d;
 if(d<0){m--;d+=dayParts(dayNumber(B.y,B.m,1)-1).d}
 if(m<0){y--;m+=12}
 return {y,m,d};
}
function dText(k,n){
 const w={el:{day:['ημέρα','ημέρες'],work:['εργάσιμη','εργάσιμες'],week:['εβδομάδα','εβδομάδες'],month:['μήνας','μήνες'],year:['χρόνος','χρόνια']},
  en:{day:['day','days'],work:['working day','working days'],week:['week','weeks'],month:['month','months'],year:['year','years']}}[lang==='el'?'el':'en'][k];
 return fmt(n)+' '+w[n===1?0:1];
}
const ymdText=v=>[v.y&&dText('year',v.y),v.m&&dText('month',v.m),(v.d||(!v.y&&!v.m))&&dText('day',v.d)].filter(Boolean).join(', ');
const weeksText=n=>[n>=7&&dText('week',Math.floor(n/7)),(n%7||n<7)&&dText('day',n%7)].filter(Boolean).join(', ');
const HOLIDAY_NAMES={el:{newYear:'Πρωτοχρονιά',epiphany:'Θεοφάνια',cleanMonday:'Καθαρά Δευτέρα',mar25:'25η Μαρτίου',goodFriday:'Μεγάλη Παρασκευή',easterMonday:'Δευτέρα του Πάσχα',may1:'Πρωτομαγιά',whitMonday:'Αγίου Πνεύματος',aug15:'15 Αυγούστου',oct28:'28η Οκτωβρίου',christmas:'Χριστούγεννα',dec26:'Σύναξη της Θεοτόκου'},
 en:{newYear:'New Year',epiphany:'Epiphany',cleanMonday:'Clean Monday',mar25:'25 March',goodFriday:'Good Friday',easterMonday:'Easter Monday',may1:'May Day',whitMonday:'Whit Monday',aug15:'15 August',oct28:'28 October',christmas:'Christmas',dec26:'Boxing Day'}};
const holidayList=(off,max,dates=true)=>off.slice(0,max).map(([n,name])=>(dates?dateText(n).slice(0,5)+' ':'')+HOLIDAY_NAMES[lang==='el'?'el':'en'][name]).join(', ')+(off.length>max?', …':'');
// Steps working days from a: n of them forward (or back, if n is negative). The start day itself isn't counted.
function addWorkingDays(a,n){let d=a,k=Math.abs(n);const s=Math.sign(n);while(k>0){d+=s;if(d<DATE_MIN||d>DATE_MAX)return null;if(isWorkingDay(d))k--}return d}
// The details under "between" (in the keypad's space), as label/value rows.
function renderDateDetails(rows,note){
 const box=$('#keypad.date-details');if(!box)return;
 box.innerHTML=rows?'<dl class="date-rows">'+rows.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>'+(note?'<p class="date-note">'+esc(note)+'</p>':''):'<p class="date-note">'+esc(t('pickTwoDates'))+'</p>';
}

function datesCalculate(){
 const el=lang==='el',work=dateCount==='work',none=()=>{setToolResult('','',null);renderDateDetails(null)};
 if(toolKind.dates==='between'){
  let a=dateField('dateFrom'),b=dateField('dateTo');if(a===null||b===null)return none();
  if(b<a)[a,b]=[b,a];
  const days=b-a,w=workingDays(a,b),span=ymd(a,b);
  const how={formula:dateText(a)+' → '+dateText(b),steps:[
   {title:el?'Ημέρες ανάμεσα':'Days in between',text:weekday(a)+' '+dateText(a)+' → '+weekday(b)+' '+dateText(b)+' = '+dText('day',days)},
   {title:el?'Σε χρόνια, μήνες και ημέρες':'In years, months and days',text:ymdText(span)},
   {title:el?'Εργάσιμες (Δευτέρα με Παρασκευή, μαζί με τις δύο ημερομηνίες)':'Working days (Monday to Friday, both dates counted)',
    text:fmt(w.weekdays)+(w.off.length?' − '+fmt(w.off.length)+(el?' αργίες':' public holidays')+' = '+fmt(w.days)+' · '+holidayList(w.off,12):'')}],
   result:work?dText('work',w.days):dText('day',days)};
  if(work)setToolResult(dText('work',w.days),dText('day',days)+' '+t('inAll'),how);
  else setToolResult(dText('day',days),t('workingDays')+': '+fmt(w.days),how);
  renderDateDetails([[t('daysLbl'),fmt(days)],[t('weeksLbl'),weeksText(days)],[t('spanLbl'),ymdText(span)],[t('workingDays'),fmt(w.days)],
   [t('weekendLbl'),fmt(w.weekend)],[t('holidaysLbl'),w.off.length?fmt(w.off.length)+' · '+holidayList(w.off,3,false):'0']],t('workNote'));
  return;
 }
 const a=dateField('dateStart'),raw=normalizeNumericInput($('#dateDays')?.value??'');
 if(a===null||!/^-?\d+$/.test(raw))return none();
 const n=Number(raw);if(!Number.isSafeInteger(n)||(work&&Math.abs(n)>50000))return none();
 const b=work?addWorkingDays(a,n):a+n;if(b===null||b<DATE_MIN||b>DATE_MAX)return none();
 const how={formula:dateText(a)+(n<0?' − ':' + ')+dText(work?'work':'day',Math.abs(n)),steps:[
  {title:el?'Από':'From',text:weekday(a)+' '+dateText(a)},
  {title:n<0?(el?'Πήγαινε πίσω':'Go back'):(el?'Πρόσθεσε':'Add'),text:dText(work?'work':'day',Math.abs(n))+(work?(el?' (χωρίς Σαββατοκύριακα και αργίες)':' (skipping weekends and public holidays)'):'')},
  {title:el?'Αποτέλεσμα':'Result',text:weekday(b)+' '+dateText(b)+(work?' · '+dText('day',Math.abs(b-a))+' '+t('inAll'):'')}],result:dateText(b)};
 setToolResult(dateText(b),weekday(b)+(work?' · '+dText('day',Math.abs(b-a))+' '+t('inAll'):''),how);
}
window._runDates=datesCalculate;
// The chip on the display that switches between counting all days and working days only.
function renderDateBar(){
 const d=$('#calculatorDisplay');if(!d)return;
 let bar=$('#dateBar');
 if(!bar){bar=document.createElement('div');bar.id='dateBar';bar.className='date-bar';d.appendChild(bar);
  bar.addEventListener('click',e=>{if(e.target.closest('button'))setDateCount(dateCount==='work'?'all':'work')})}
 const show=mode==='dates';bar.classList.toggle('hidden',!show);d.classList.toggle('has-date-bar',show);if(!show)return;
 const on=dateCount==='work',html='<button class="sci-chip'+(on?' on':'')+'" type="button" aria-pressed="'+on+'">'+esc(t('workDays'))+'</button>';
 if(bar.dataset.html!==html){bar.innerHTML=html;bar.dataset.html=html}
}
function setDateCount(v){if(v!=='all'&&v!=='work')return;dateCount=v;renderDateBar();runActiveTool();saveTools()}
