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

/* ---------- The app's own calendar, on computers ----------
   A computer's built-in date field is fiddly (typing into its parts, a small icon), so with a mouse the date is a
   button that opens this calendar: days (Monday first, today ringed, public holidays dotted), or a click on the title
   for months and then years; ‹ › and the mouse wheel move, arrows/PageUp/PageDown/Enter/Esc on the keyboard.
   Phones keep their own picker (wheels on iPhone), which is better there. */
const ownCalendar=()=>matchMedia('(hover:hover) and (pointer:fine)').matches;
const MONTHS={el:['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'],
 en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const MONTHS_SHORT={el:['Ιαν','Φεβ','Μαρ','Απρ','Μάι','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ'],en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']};
const WD_LETTERS={el:['Δ','Τ','Τ','Π','Π','Σ','Κ'],en:['M','T','W','T','F','S','S']};
const WD_SHORT={el:['Κυρ','Δευ','Τρί','Τετ','Πέμ','Παρ','Σάβ'],en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']};
const calLang=()=>lang==='el'?'el':'en';
const CAL_ICON='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function datePickHtml(id,label,value){
 const n=/^\d{4}-\d{2}-\d{2}$/.test(value)?dayNumber(+value.slice(0,4),+value.slice(5,7),+value.slice(8)):null;
 const text=n===null?t('pickDate'):WD_SHORT[calLang()][dayParts(n).wd]+' '+dateText(n);
 return '<label class="tool-field"><span>'+esc(label)+'</span><button type="button" id="'+id+'" class="date-pick'+(n===null?' empty':'')+'" value="'+esc(value)+'" data-date-input="true" aria-haspopup="dialog"><span>'+esc(text)+'</span>'+CAL_ICON+'</button></label>';
}
let cal=null;// {btn, view:'days'|'months'|'years', y, m, sel}
function openCalendar(btn){
 closeCalendar();
 const v=btn.value,n=/^\d{4}-\d{2}-\d{2}$/.test(v)?dayNumber(+v.slice(0,4),+v.slice(5,7),+v.slice(8)):todayNumber(),p=dayParts(n);
 cal={btn,view:'days',y:p.y,m:p.m,sel:n};
 const pop=document.createElement('div');pop.id='calPop';pop.className='cal-pop';pop.tabIndex=-1;pop.setAttribute('role','dialog');
 document.body.appendChild(pop);
 pop.addEventListener('click',calClick);pop.addEventListener('keydown',calKey);
 pop.addEventListener('wheel',e=>{e.preventDefault();calStep(e.deltaY>0||e.deltaX>0?1:-1)},{passive:false});
 btn.classList.add('open');renderCalendar();placeCalendar();pop.focus({preventScroll:true});
}
function closeCalendar(focusBack){
 const pop=$('#calPop');if(pop)pop.remove();
 if(cal){cal.btn.classList.remove('open');if(focusBack)cal.btn.focus({preventScroll:true})}cal=null;
}
function placeCalendar(){
 const pop=$('#calPop');if(!pop||!cal)return;
 const Z=window.__uiZoom||1,r=cal.btn.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight,vw=innerWidth/Z,vh=innerHeight/Z;
 let left=r.left/Z,top=r.bottom/Z+6;
 left=Math.max(8,Math.min(left,vw-w-8));if(top+h>vh-8)top=Math.max(8,r.top/Z-h-6);
 pop.style.left=left+'px';pop.style.top=top+'px';
}
function renderCalendar(){
 const pop=$('#calPop');if(!pop||!cal)return;
 const l=calLang(),today=todayNumber();let title,body;
 if(cal.view==='days'){
  title=MONTHS[l][cal.m-1]+' '+cal.y;
  const first=dayNumber(cal.y,cal.m,1),start=first-((dayParts(first).wd+6)%7),hol=new Map(greekHolidays(cal.y).map(([n,k])=>[n,HOLIDAY_NAMES[l][k]]));
  let cells='';
  for(let i=0;i<42;i++){
   const n=start+i,p=dayParts(n),cls=['cal-day'];
   if(p.m!==cal.m)cls.push('other');if(n===today)cls.push('today');if(n===cal.sel)cls.push('sel');if(p.wd===0||p.wd===6)cls.push('weekend');
   const h=p.m===cal.m&&hol.get(n);if(h)cls.push('holiday');
   cells+='<button type="button" class="'+cls.join(' ')+'" data-day="'+n+'"'+(h?' title="'+esc(h)+'"':'')+'>'+p.d+'</button>';
  }
  body='<div class="cal-week">'+WD_LETTERS[l].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="cal-grid days">'+cells+'</div>';
 }else if(cal.view==='months'){
  title=String(cal.y);const sel=dayParts(cal.sel),now=dayParts(today);
  body='<div class="cal-grid months">'+MONTHS_SHORT[l].map((x,i)=>'<button type="button" class="cal-cell'+(sel.y===cal.y&&sel.m===i+1?' sel':'')+(now.y===cal.y&&now.m===i+1?' today':'')+'" data-month="'+(i+1)+'">'+x+'</button>').join('')+'</div>';
 }else{
  const y0=cal.y-cal.y%12;title=y0+' – '+(y0+11);const sel=dayParts(cal.sel).y,now=dayParts(today).y;
  body='<div class="cal-grid months">'+Array.from({length:12},(_,i)=>y0+i).map(y=>'<button type="button" class="cal-cell'+(y===sel?' sel':'')+(y===now?' today':'')+'" data-year="'+y+'"'+(y<1000||y>9999?' disabled':'')+'>'+y+'</button>').join('')+'</div>';
 }
 pop.innerHTML='<div class="cal-head"><button type="button" class="cal-nav" data-cal="prev" aria-label="‹">‹</button><button type="button" class="cal-title" data-cal="up">'+esc(title)+'</button><button type="button" class="cal-nav" data-cal="next" aria-label="›">›</button></div>'+body+
  '<div class="cal-foot"><button type="button" class="cal-today" data-cal="today">'+esc(t('todayBtn'))+'</button></div>';
 if(!pop.contains(document.activeElement))pop.focus({preventScroll:true});// the clicked button was just replaced: keep the keys here
}
function calStep(dir){
 if(!cal)return;
 if(cal.view==='days'){cal.m+=dir;if(cal.m<1){cal.m=12;cal.y--}if(cal.m>12){cal.m=1;cal.y++}}
 else cal.y+=dir*(cal.view==='years'?12:1);
 cal.y=Math.max(1000,Math.min(9999,cal.y));renderCalendar();
}
function calPick(n){
 if(!cal||n<DATE_MIN||n>DATE_MAX)return;
 const btn=cal.btn,iso=isoDate(n);
 btn.value=iso;btn.classList.remove('empty');btn.querySelector('span').textContent=WD_SHORT[calLang()][dayParts(n).wd]+' '+dateText(n);
 if(toolState[mode])toolState[mode].inputs[btn.id]=iso;
 closeCalendar(true);runActiveTool();
}
function calClick(e){
 const b=e.target.closest('button');if(!b||!cal)return;
 if(b.dataset.day)return calPick(+b.dataset.day);
 if(b.dataset.month){cal.m=+b.dataset.month;cal.view='days';return renderCalendar()}
 if(b.dataset.year){cal.y=+b.dataset.year;cal.view='months';return renderCalendar()}
 const a=b.dataset.cal;
 if(a==='prev'||a==='next')calStep(a==='next'?1:-1);
 else if(a==='up'){cal.view=cal.view==='days'?'months':'years';renderCalendar()}
 else if(a==='today')calPick(todayNumber());
}
function calKey(e){
 if(!cal)return;e.stopPropagation();
 const k=e.key,move=d=>{cal.sel+=d;const p=dayParts(cal.sel);cal.y=p.y;cal.m=p.m;cal.view='days';renderCalendar()};
 if(k==='Escape'){e.preventDefault();closeCalendar(true)}
 else if(k==='ArrowLeft')move(-1);else if(k==='ArrowRight')move(1);else if(k==='ArrowUp')move(-7);else if(k==='ArrowDown')move(7);
 else if(k==='PageUp'||k==='PageDown'){e.preventDefault();calStep(k==='PageDown'?1:-1)}
 else if(k==='Enter'&&!e.target.closest('button')){e.preventDefault();calPick(cal.sel)}
 else return;
 if(k.startsWith('Arrow'))e.preventDefault();
}
document.addEventListener('pointerdown',e=>{if(cal&&!e.target.closest('#calPop')&&e.target.closest('.date-pick')!==cal.btn)closeCalendar()},true);
document.addEventListener('click',e=>{const b=e.target.closest('.date-pick');if(!b)return;e.preventDefault();if(cal&&cal.btn===b)closeCalendar();else openCalendar(b)});
addEventListener('resize',()=>closeCalendar());
