// The Dates tool: days between two dates (with working days), a date plus or minus days, and age.
// Dates are typed as digits on the keypad and shown DD/MM/YYYY (formatDateDigits); an empty field marked "Today"
// means today. Day numbers count from 1970 in UTC, so summer time never shifts a day.
// Working days: Monday to Friday, without Greek public holidays (fixed ones, and the ones that move with Orthodox Easter).
const DAY_MS=864e5;
function formatDateDigits(d){return d.length<2?d:d.length<4?d.slice(0,2)+'/'+d.slice(2):d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4)}
function dayNumber(y,m,d){const t=new Date(0);t.setUTCFullYear(y,m-1,d);return Math.round(t.getTime()/DAY_MS)}
function dayParts(n){const t=new Date(n*DAY_MS);return {y:t.getUTCFullYear(),m:t.getUTCMonth()+1,d:t.getUTCDate(),wd:t.getUTCDay()}}
function todayNumber(){const t=new Date();return dayNumber(t.getFullYear(),t.getMonth()+1,t.getDate())}
const DATE_MIN=dayNumber(1000,1,1),DATE_MAX=dayNumber(9999,12,31);
// A date field: its day number, today if it's empty and allowed to be, or null if it isn't a whole, real date yet.
function dateField(id,emptyIsToday){
 const d=($('#'+id)?.value??'').replace(/\D/g,'');
 if(!d)return emptyIsToday?todayNumber():null;
 if(d.length!==8)return null;
 const day=+d.slice(0,2),month=+d.slice(2,4),year=+d.slice(4);
 if(year<1000||month<1||month>12||day<1)return null;
 const n=dayNumber(year,month,day),p=dayParts(n);
 return p.d===day&&p.m===month?n:null;// 31/02 doesn't exist
}
const pad2=n=>String(n).padStart(2,'0');
function dateText(n){const p=dayParts(n);return pad2(p.d)+'/'+pad2(p.m)+'/'+p.y}
const WEEKDAYS={el:['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'],en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']};
const weekday=n=>WEEKDAYS[lang==='el'?'el':'en'][dayParts(n).wd];
// Orthodox Easter Sunday (Meeus' Julian algorithm, moved to the Gregorian calendar).
function orthodoxEaster(y){
 const a=y%4,b=y%7,c=y%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7,month=Math.floor((d+e+114)/31),day=(d+e+114)%31+1;
 return dayNumber(y,month,day)+Math.floor(y/100)-Math.floor(y/400)-2;
}
function greekHolidays(y){
 const e=orthodoxEaster(y);
 return [[dayNumber(y,1,1),'newYear'],[dayNumber(y,1,6),'epiphany'],[e-48,'cleanMonday'],[dayNumber(y,3,25),'mar25'],[e-2,'goodFriday'],
  [e+1,'easterMonday'],[dayNumber(y,5,1),'may1'],[e+50,'whitMonday'],[dayNumber(y,8,15),'aug15'],[dayNumber(y,10,28),'oct28'],
  [dayNumber(y,12,25),'christmas'],[dayNumber(y,12,26),'dec26']];
}
// Working days from a to b, both counted (a <= b), and the holidays that fell on weekdays.
function workingDays(a,b){
 const total=b-a+1,full=Math.floor(total/7);let weekdays=full*5;
 for(let n=a+full*7;n<=b;n++){const wd=dayParts(n).wd;if(wd&&wd<6)weekdays++}
 const off=[];
 for(let y=dayParts(a).y;y<=dayParts(b).y;y++)greekHolidays(y).forEach(([n,name])=>{const wd=dayParts(n).wd;if(n>=a&&n<=b&&wd&&wd<6)off.push([n,name])});
 off.sort((x,y)=>x[0]-y[0]);
 return {days:weekdays-off.length,weekdays,off};
}
// Years, months and days from a to b (a <= b), the way people count them.
function ymd(a,b){
 const A=dayParts(a),B=dayParts(b);let y=B.y-A.y,m=B.m-A.m,d=B.d-A.d;
 if(d<0){m--;d+=dayParts(dayNumber(B.y,B.m,1)-1).d}
 if(m<0){y--;m+=12}
 return {y,m,d};
}
function dText(k,n){
 const w={el:{day:['ημέρα','ημέρες'],month:['μήνας','μήνες'],year:['χρόνος','χρόνια']},en:{day:['day','days'],month:['month','months'],year:['year','years']}}[lang==='el'?'el':'en'][k];
 return fmt(n)+' '+w[n===1?0:1];
}
const ymdText=v=>[v.y&&dText('year',v.y),v.m&&dText('month',v.m),(v.d||(!v.y&&!v.m))&&dText('day',v.d)].filter(Boolean).join(', ');
const HOLIDAY_NAMES={el:{newYear:'Πρωτοχρονιά',epiphany:'Θεοφάνια',cleanMonday:'Καθαρά Δευτέρα',mar25:'25η Μαρτίου',goodFriday:'Μεγάλη Παρασκευή',easterMonday:'Δευτέρα του Πάσχα',may1:'Πρωτομαγιά',whitMonday:'Αγίου Πνεύματος',aug15:'15 Αυγούστου',oct28:'28η Οκτωβρίου',christmas:'Χριστούγεννα',dec26:'Σύναξη της Θεοτόκου'},
 en:{newYear:'New Year',epiphany:'Epiphany',cleanMonday:'Clean Monday',mar25:'25 March',goodFriday:'Good Friday',easterMonday:'Easter Monday',may1:'May Day',whitMonday:'Whit Monday',aug15:'15 August',oct28:'28 October',christmas:'Christmas',dec26:'Boxing Day'}};

function datesCalculate(){
 const el=lang==='el',kind=toolKind.dates,none=()=>setToolResult('','',null);
 if(kind==='between'){
  let a=dateField('dateFrom',true),b=dateField('dateTo',false);if(a===null||b===null)return none();
  const back=b<a;if(back)[a,b]=[b,a];
  const days=b-a,w=workingDays(a,b),span=ymd(a,b),list=w.off.slice(0,12).map(([n,name])=>dateText(n).slice(0,5)+' '+HOLIDAY_NAMES[el?'el':'en'][name]).join(', ');
  const how={formula:dateText(a)+' → '+dateText(b),steps:[
   {title:el?'Ημέρες ανάμεσα':'Days in between',text:weekday(a)+' '+dateText(a)+' → '+weekday(b)+' '+dateText(b)+' = '+dText('day',days)},
   {title:el?'Σε χρόνια, μήνες και ημέρες':'In years, months and days',text:ymdText(span)},
   {title:el?'Εργάσιμες (Δευτέρα με Παρασκευή, μαζί με τις δύο ημερομηνίες)':'Working days (Monday to Friday, both dates counted)',
    text:fmt(w.weekdays)+(w.off.length?' − '+fmt(w.off.length)+(el?' αργίες':' public holidays')+' = '+fmt(w.days):'')+(list?' · '+list+(w.off.length>12?', …':''):'')}],result:dText('day',days)};
  setToolResult(dText('day',days),t('workingDays')+': '+fmt(w.days),how);return;
 }
 if(kind==='add'){
  const a=dateField('dateStart',true),raw=normalizeNumericInput($('#dateDays')?.value??'');
  if(a===null||!/^-?\d+$/.test(raw))return none();
  const n=Number(raw),b=a+n;if(!Number.isSafeInteger(n)||b<DATE_MIN||b>DATE_MAX)return none();
  const how={formula:dateText(a)+(n<0?' − ':' + ')+dText('day',Math.abs(n)),steps:[
   {title:el?'Από':'From',text:weekday(a)+' '+dateText(a)},
   {title:n<0?(el?'Αφαίρεσε':'Take away'):(el?'Πρόσθεσε':'Add'),text:dText('day',Math.abs(n))+(Math.abs(n)>=7?' ('+(el?'περίπου ':'about ')+ymdText(ymd(Math.min(a,b),Math.max(a,b)))+')':'')},
   {title:el?'Αποτέλεσμα':'Result',text:weekday(b)+' '+dateText(b)}],result:dateText(b)};
  setToolResult(dateText(b),weekday(b),how);return;
 }
 const born=dateField('dateBirth',false),on=dateField('dateOn',true);
 if(born===null||on===null||born>on)return none();
 const age=ymd(born,on),B=dayParts(born),O=dayParts(on);
 // the next birthday (29 February: 28 February in other years)
 const bday=y=>{const n=dayNumber(y,B.m,B.d);return dayParts(n).m===B.m?n:dayNumber(y,2,28)};
 let next=bday(O.y);if(next<on)next=bday(O.y+1);
 const until=next-on,detail=until?t('birthdayIn').replace('{n}',dText('day',until)):t('birthdayToday');
 const how={formula:dateText(born)+' → '+dateText(on),steps:[
  {title:el?'Ηλικία':'Age',text:ymdText(age)},
  {title:el?'Ημέρες ζωής':'Days lived',text:dText('day',on-born)},
  {title:el?'Επόμενα γενέθλια':'Next birthday',text:weekday(next)+' '+dateText(next)+(until?' · '+dText('day',until):'')}],result:dText('year',age.y)};
 setToolResult(dText('year',age.y),detail,how);
}
window._runDates=datesCalculate;
