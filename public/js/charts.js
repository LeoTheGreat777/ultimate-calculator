// Graphs and charts drawn on <canvas>, without libraries: the Graph mode (function plots),
// the charts of the Fuel / Energy / VAT tools and the History chart.
// Loaded BEFORE app.js: this file only defines things. Its functions read app.js globals
// (mode, lang, $, esc, store, modeText, NUMBER_LOCALE …) when they run, never at load time.

/* ---------- shared drawing helpers ---------- */
const CH_FONT='500 11px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';
function chIsLight(hex){
 hex=String(hex||'').trim().replace('#','');
 if(hex.length===3)hex=[...hex].map(c=>c+c).join('');
 const n=parseInt(hex,16);if(!Number.isFinite(n))return false;
 return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>140;
}
function chColors(){
 const s=getComputedStyle(document.body),v=n=>s.getPropertyValue(n).trim(),light=chIsLight(v('--card'));
 return{light,text:v('--text'),muted:v('--muted'),card:v('--card'),card2:v('--card2'),key:v('--key'),accent:v('--accent'),danger:v('--danger')||'#ff6666',
  grid:light?'rgba(17,23,34,.07)':'rgba(255,255,255,.06)',axis:light?'rgba(17,23,34,.38)':'rgba(255,255,255,.34)',
  series:[1,2,3].map(i=>v('--series'+i)).every(Boolean)?[1,2,3].map(i=>v('--series'+i)):light?['#3478e5','#e07b1a','#1f9d5a']:['#6ea8fe','#f5a65b','#4cd38a']};// line colours come from the theme
}
// On big screens the app is scaled up (app.js, window.__uiZoom): screen pixels / zoom = CSS pixels.
const chZoom=()=>window.__uiZoom||1;
// Size the canvas for the screen's pixel density (and the app's zoom) and return a context drawing in CSS pixels.
function chSetup(cv){
 const r=cv.getBoundingClientRect(),z=chZoom(),dpr=Math.min(3,window.devicePixelRatio||1)*z,w=Math.max(1,Math.round(r.width/z)),h=Math.max(1,Math.round(r.height/z));
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
 const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.font=CH_FONT;
 return{ctx,w,h};
}
// A "nice" grid step (1, 2 or 5 × 10^n) giving about `target` steps over `range`.
function chStep(range,target){
 const raw=Math.abs(range)/Math.max(1,target);if(!(raw>0)||!Number.isFinite(raw))return 1;
 const p=10**Math.floor(Math.log10(raw)),m=raw/p;
 return (m<1.5?1:m<3.5?2:m<7.5?5:10)*p;
}
function chNum(v,maxDec=4,sig=3){
 if(!Number.isFinite(v))return '–';
 if(Math.abs(v)<1e-12)v=0;
 const a=Math.abs(v);
 if(a>=1e9||(a<1e-4&&v!==0))return numScientific(v,sig).replace(' × ','×');// 1,5×10⁹
 return new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:maxDec}).format(v);
}
// a grid label: as many digits as tell it apart from its neighbours `step` away
function chTick(v,step){
 if(Math.abs(v)<step*1e-6)v=0;
 const dec=Math.max(0,Math.min(8,-Math.floor(Math.log10(step)+1e-9))),sig=Math.min(15,Math.max(3,Math.floor(Math.log10(Math.abs(v)||1))-Math.floor(Math.log10(step)+1e-9)+1));
 return chNum(v,dec,sig);
}
const chMoney=v=>money(v);
function chLegend(items){return items.map(i=>'<div class="chart-legend-item"><span class="chart-dot" style="background:'+i.color+'"></span><span>'+esc(i.label)+'</span>'+(i.value?'<strong>'+esc(i.value)+'</strong>':'')+'</div>').join('')}
function chRoundRect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}

// Line chart. o: {series:[{pts:[[x,y]…],color,width,dash,dots}], xMin,xMax,yMin,yMax,xFmt,yFmt,xTicks:false,marker:{x,y,label,color},highlight}
function chLineChart(cv,o){
 const {ctx,w,h}=chSetup(cv),C=chColors();
 const all=o.series.flatMap(s=>s.pts.map(p=>p[1])).filter(Number.isFinite);
 let yMin=o.yMin??Math.min(0,...all),yMax=o.yMax??Math.max(...all,0);
 if(yMax-yMin<1e-12){yMin-=1;yMax+=1}
 const ys=chStep(yMax-yMin,4);yMin=Math.floor(yMin/ys+1e-9)*ys;yMax=Math.ceil(yMax/ys-1e-9)*ys;if(yMax<=yMin)yMax=yMin+ys;
 const yFmt=o.yFmt||(v=>chTick(v,ys)),xFmt=o.xFmt||(v=>chNum(v));
 const yLabels=[];for(let v=yMin;v<=yMax+ys/2;v+=ys)yLabels.push(v);
 const L=Math.ceil(Math.max(...yLabels.map(v=>ctx.measureText(yFmt(v)).width)))+12,R=14,T=12,B=o.xTicks===false?12:26;
 const xMin=o.xMin??0,xMax=o.xMax??1,PX=x=>L+(x-xMin)/(xMax-xMin||1)*(w-L-R),PY=y=>h-B-(y-yMin)/(yMax-yMin)*(h-T-B);
 ctx.lineWidth=1;ctx.textBaseline='middle';ctx.textAlign='right';
 yLabels.forEach(v=>{const y=Math.round(PY(v))+.5;ctx.strokeStyle=Math.abs(v)<ys/2?C.axis:C.grid;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();ctx.fillStyle=C.muted;ctx.fillText(yFmt(v),L-7,y)});
 if(o.xTicks!==false){
  const xs=chStep(xMax-xMin,Math.max(2,Math.floor((w-L-R)/70)));ctx.textAlign='center';ctx.textBaseline='top';
  for(let v=Math.ceil(xMin/xs)*xs;v<=xMax+xs*1e-6;v+=xs){const x=PX(v),lb=xFmt(v),tw=ctx.measureText(lb).width;ctx.fillStyle=C.muted;ctx.fillText(lb,Math.min(Math.max(x,tw/2+2),w-tw/2-2),h-B+7);ctx.strokeStyle=C.grid;ctx.beginPath();ctx.moveTo(Math.round(x)+.5,T);ctx.lineTo(Math.round(x)+.5,h-B);ctx.stroke()}
 }
 o.series.forEach(s=>{
  ctx.strokeStyle=s.color;ctx.lineWidth=s.width||2;ctx.setLineDash(s.dash||[]);ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
  s.pts.forEach((p,i)=>i?ctx.lineTo(PX(p[0]),PY(p[1])):ctx.moveTo(PX(p[0]),PY(p[1])));ctx.stroke();ctx.setLineDash([]);
  if(s.dots)s.pts.forEach((p,i)=>{const hl=o.highlight===i;ctx.beginPath();ctx.arc(PX(p[0]),PY(p[1]),hl?5.5:3.2,0,Math.PI*2);ctx.fillStyle=hl?s.color:C.card;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=s.color;ctx.stroke()});
 });
 const m=o.marker;
 if(m){
  const x=PX(m.x),y=PY(m.y);ctx.strokeStyle=C.axis;ctx.setLineDash([3,4]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,h-B);ctx.lineTo(x,y);ctx.lineTo(L,y);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(x,y,5.5,0,Math.PI*2);ctx.fillStyle=m.color||C.accent;ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle=C.card;ctx.stroke();
  if(m.label){ctx.font='700 12px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';const tw=ctx.measureText(m.label).width+14,bx=Math.min(Math.max(L+2,x-tw/2),w-R-tw),by=Math.max(T,y-34);
   chRoundRect(ctx,bx,by,tw,22,8);ctx.fillStyle=C.card;ctx.fill();ctx.strokeStyle=m.color||C.accent;ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=C.text;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(m.label,bx+7,by+11);ctx.font=CH_FONT}
 }
 return{PX,PY,L,R,T,B,w,h,xMin,xMax};
}
// Bar chart. items: [{label,value,hl}]
function chBarChart(cv,items,valFmt){
 const {ctx,w,h}=chSetup(cv),C=chColors(),max=Math.max(...items.map(i=>i.value),0)||1,T=26,B=24,L=6,R=6;
 const slot=(w-L-R)/items.length,bw=Math.min(54,slot*.62);
 ctx.strokeStyle=C.axis;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,h-B+.5);ctx.lineTo(w-R,h-B+.5);ctx.stroke();
 items.forEach((it,i)=>{
  const cx=L+slot*(i+.5),bh=Math.max(2,(it.value/max)*(h-T-B)),x=cx-bw/2,y=h-B-bh;
  ctx.globalAlpha=it.hl?1:.42;chRoundRect(ctx,x,y,bw,bh+6,7);ctx.save();ctx.beginPath();ctx.rect(x,0,bw,h-B);ctx.clip();chRoundRect(ctx,x,y,bw,bh+6,7);ctx.fillStyle=C.series[0];ctx.fill();ctx.restore();ctx.globalAlpha=1;
  ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillStyle=it.hl?C.text:C.muted;ctx.font=(it.hl?'700 ':'600 ')+'11px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';ctx.fillText(valFmt(it.value),cx,y-5);
  ctx.font=CH_FONT;ctx.textBaseline='top';ctx.fillStyle=it.hl?C.text:C.muted;ctx.fillText(it.label,cx,h-B+7);
 });
}
// Donut chart. parts: [{value,color}], center: [big, small]
function chDonut(cv,parts,center){
 const {ctx,w,h}=chSetup(cv),C=chColors(),total=parts.reduce((s,p)=>s+Math.max(0,p.value),0)||1,r=Math.min(w,h)/2-8,cx=w/2,cy=h/2;
 let a=-Math.PI/2;
 parts.forEach(p=>{const da=Math.max(0,p.value)/total*Math.PI*2;if(da<=0)return;ctx.beginPath();ctx.arc(cx,cy,r,a,a+da);ctx.arc(cx,cy,r*.64,a+da,a,true);ctx.closePath();ctx.fillStyle=p.color;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=C.card;ctx.stroke();a+=da});
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=C.text;
 // the amount in the middle shrinks to stay inside the ring (large totals)
 const font=px=>'750 '+px+'px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';let px=Math.round(r*.2);ctx.font=font(px);
 const room=r*.64*2*.84,wide=ctx.measureText(center[0]).width;if(wide>room){px=Math.max(10,Math.floor(px*room/wide));ctx.font=font(px)}
 ctx.fillText(center[0],cx,cy-r*.07);
 ctx.font=CH_FONT;ctx.fillStyle=C.muted;ctx.fillText(center[1],cx,cy+r*.18);
}

/* ---------- Charts for the Fuel, Energy and VAT tools ---------- */
const CHART_ICON='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M5 20V11M12 20V5M19 20v-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
function cText(k){
 const el={loanTitle:'Τι επιστρέφεις συνολικά',saveTitle:'Πώς μεγαλώνουν οι αποταμιεύσεις',borrowed:'Ποσό δανείου',interest:'Τόκοι',deposited:'Καταθέσεις',balance:'Σύνολο',payments:'{n} δόσεις των {v}',yr:'{n} χρ.',chart:'Διάγραμμα',fuelTitle:'Κόστος ανάλογα με την απόσταση',fuelNote:'Με 1 λίτρο λιγότερη κατανάλωση ανά 100 km θα πλήρωνες {v} λιγότερα σε αυτή την απόσταση.',energyTitle:'Κόστος σε βάθος χρόνου',energyNote:'Η συσκευή καταναλώνει {v} την ημέρα.',day:'Ημέρα',week:'Εβδομάδα',month:'Μήνας',year:'Έτος',days:'{n} ημ.',vatTitle:'Από τι αποτελείται το ποσό',net:'Καθαρό ποσό',vat:'ΦΠΑ',total:'Σύνολο',km:'km',historyEmpty:'Χρειάζονται τουλάχιστον 2 υπολογισμοί για το διάγραμμα.',historyHint:'Οι τελευταίοι {n} υπολογισμοί. Πάτα ένα σημείο για να δεις την πράξη.'};
 const en={loanTitle:'What you pay back',saveTitle:'How your savings grow',borrowed:'Amount borrowed',interest:'Interest',deposited:'Deposits',balance:'Total',payments:'{n} payments of {v}',yr:'{n} yr',chart:'Chart',fuelTitle:'Cost by distance',fuelNote:'Using 1 litre less per 100 km would save you {v} over this distance.',energyTitle:'Cost over time',energyNote:'The device uses {v} a day.',day:'Day',week:'Week',month:'Month',year:'Year',days:'{n} days',vatTitle:'What the amount is made of',net:'Net amount',vat:'VAT',total:'Total',km:'km',historyEmpty:'At least 2 calculations are needed for the chart.',historyHint:'The last {n} calculations. Tap a point to see it.'};
 return (lang==='el'?el:en)[k];
}
function toolChartAvailable(){return ['fuel','energy','vat','loan'].includes(mode)&&!!toolResult?.how}
function showToolChart(){
 if(!toolChartAvailable())return;
 $('#howTitle').textContent=cText('chart')+' · '+modeText(mode);
 $('#howContent').innerHTML='<div class="chart-heading" id="toolChartTitle"></div><canvas id="toolChart" class="tool-chart"></canvas><div id="toolChartLegend" class="chart-legend"></div><p id="toolChartNote" class="chart-note"></p>';
 $('#howModal').classList.remove('hidden');
 requestAnimationFrame(drawToolChart);
}
function drawToolChart(){
 const cv=$('#toolChart');if(!cv||$('#howModal').classList.contains('hidden'))return;
 const C=chColors(),num=id=>liveToolNumber(id),title=$('#toolChartTitle'),legend=$('#toolChartLegend'),note=$('#toolChartNote');
 if(mode==='fuel'){
  const d=num('fuelD'),c=num('fuelC'),p=num('fuelP');if(d===null||c===null||p===null||d<=0)return;
  const D=Math.ceil(d*2/chStep(d*2,5))*chStep(d*2,5),line=cc=>[[0,0],[D,D*cc/100*p]];
  const series=[{pts:line(c),color:C.series[0],width:3}];const leg=[{color:C.series[0],label:chNum(c,2)+' L/100 km',value:chMoney(d*c/100*p)}];
  if(c>1){series.unshift({pts:line(c-1),color:C.series[2],width:1.6,dash:[5,5]});leg.push({color:C.series[2],label:chNum(c-1,2)+' L/100 km',value:chMoney(d*(c-1)/100*p)})}
  series.unshift({pts:line(c+1),color:C.series[1],width:1.6,dash:[5,5]});leg.push({color:C.series[1],label:chNum(c+1,2)+' L/100 km',value:chMoney(d*(c+1)/100*p)});
  title.textContent=cText('fuelTitle');
  chLineChart(cv,{series,xMin:0,xMax:D,xFmt:v=>chNum(v)+' '+cText('km'),yFmt:v=>chNum(v,2)+' €',marker:{x:d,y:d*c/100*p,label:chNum(d)+' km · '+chMoney(d*c/100*p),color:C.series[0]}});
  legend.innerHTML=chLegend(leg);note.textContent=c>1?cText('fuelNote').replace('{v}',chMoney(d/100*p)):'';
 }else if(mode==='energy'){
  const P=num('energyP'),hh=num('energyH'),days=num('energyD'),r=num('energyR');if([P,hh,days,r].some(x=>x===null))return;
  const perDay=P/1000*hh*r,base=[[cText('day'),1],[cText('week'),7],[cText('month'),30],[cText('year'),365]];
  let items=base.map(([label,n])=>({label,n,value:perDay*n,hl:n===days}));
  if(days>0&&!items.some(i=>i.hl))items.push({label:cText('days').replace('{n}',chNum(days,1)),n:days,value:perDay*days,hl:true});
  items.sort((a,b)=>a.n-b.n);
  title.textContent=cText('energyTitle');chBarChart(cv,items,chMoney);
  legend.innerHTML='';note.textContent=cText('energyNote').replace('{v}',chNum(P/1000*hh,3)+' kWh');
 }else if(mode==='vat'){
  const v=vatNumbers();if(!v)return;
  const {rate,total,net,tax}=v;
  title.textContent=cText('vatTitle');
  chDonut(cv,[{value:net,color:C.series[0]},{value:tax,color:C.series[1]}],[chMoney(total),cText('total')]);
  const pc=v=>total?chNum(v/total*100,1)+'%':'';
  legend.innerHTML=chLegend([{color:C.series[0],label:cText('net')+' · '+pc(net),value:chMoney(net)},{color:C.series[1],label:cText('vat')+' '+chNum(rate,2)+'% · '+pc(tax),value:chMoney(tax)}]);note.textContent='';
 }else if(mode==='loan'){
  const v=loanNumbers();if(!v)return;
  if(v.kind==='loan'){
   // a loan: how much of what you pay back is the loan and how much is interest
   title.textContent=cText('loanTitle');
   chDonut(cv,[{value:v.P,color:C.series[0]},{value:Math.max(0,v.interest),color:C.series[1]}],[chMoney(v.total),cText('total')]);
   const pc=x=>v.total?chNum(x/v.total*100,1)+'%':'';
   legend.innerHTML=chLegend([{color:C.series[0],label:cText('borrowed')+' · '+pc(v.P),value:chMoney(v.P)},{color:C.series[1],label:cText('interest')+' · '+pc(v.interest),value:chMoney(v.interest)}]);
   note.textContent=cText('payments').replace('{n}',v.months).replace('{v}',chMoney(v.pay));
  }else{
   // savings: the total over the years against what you put in; the gap between the lines is the interest
   const steps=Math.min(v.months,120),pts=f=>Array.from({length:steps+1},(_,k)=>{const m=v.months*k/steps;return [m/12,f(m)]});
   title.textContent=cText('saveTitle');
   chLineChart(cv,{series:[{pts:pts(m=>v.S+v.D*m),color:C.series[1],width:1.6,dash:[5,5]},{pts:pts(v.grow),color:C.series[0],width:3}],xMin:0,xMax:v.months/12,
    xFmt:x=>cText('yr').replace('{n}',chNum(x,1)),yFmt:x=>chMoney(x),marker:{x:v.months/12,y:v.final,label:chMoney(v.final),color:C.series[0]}});
   legend.innerHTML=chLegend([{color:C.series[0],label:cText('balance'),value:chMoney(v.final)},{color:C.series[1],label:cText('deposited'),value:chMoney(v.deposited)}]);
   note.textContent=cText('interest')+': '+chMoney(v.interest);
  }
 }
}

/* ---------- History chart ---------- */
let historyChartPick=null;
function historyChartData(){return historyItems().slice(0,30).reverse().map(x=>({x,v:Number(x.result)})).filter(o=>Number.isFinite(o.v))}
function toggleHistoryChart(){
 const wrap=$('#historyChartWrap'),b=$('#historyChartButton');if(!wrap)return;
 const show=wrap.classList.contains('hidden');wrap.classList.toggle('hidden',!show);b?.setAttribute('aria-pressed',String(show));b?.classList.toggle('active',show);
 historyChartPick=null;if(show)requestAnimationFrame(drawHistoryChart);
}
function drawHistoryChart(){
 const wrap=$('#historyChartWrap'),cv=$('#historyChart'),ro=$('#historyChartReadout');if(!wrap||!cv||wrap.classList.contains('hidden'))return;
 const data=historyChartData(),C=chColors();
 if(data.length<2){chSetup(cv);ro.textContent=cText('historyEmpty');wrap.classList.add('too-few');return}
 wrap.classList.remove('too-few');
 const ys=data.map(d=>d.v);let lo=Math.min(...ys),hi=Math.max(...ys);if(lo>0&&lo<hi*.4)lo=0;
 const pick=historyChartPick!==null&&historyChartPick<data.length?historyChartPick:null;
 cv._geo=chLineChart(cv,{series:[{pts:data.map((d,i)=>[i,d.v]),color:C.series[0],width:2.2,dots:true}],xMin:0,xMax:data.length-1,yMin:lo,yMax:hi,xTicks:false,highlight:pick});
 ro.textContent=pick!==null?pretty(data[pick].x.expression)+' = '+fmt(ratFromString(String(data[pick].x.result))):cText('historyHint').replace('{n}',data.length);
}
function historyChartRefresh(){if(!$('#historyChartWrap')?.classList.contains('hidden'))drawHistoryChart()}
function bindHistoryChart(){
 const cv=$('#historyChart');if(!cv)return;
 const pickAt=e=>{const g=cv._geo,data=historyChartData();if(!g||data.length<2)return;const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/chZoom();
  const i=Math.round((x-g.L)/(g.w-g.L-g.R)*(data.length-1));const n=Math.max(0,Math.min(data.length-1,i));if(n!==historyChartPick){historyChartPick=n;drawHistoryChart()}};
 cv.addEventListener('pointerdown',pickAt);cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)pickAt(e)});
 $('#historyChartButton')?.addEventListener('click',e=>{e.stopPropagation();toggleHistoryChart()});
}

/* ---------- redraw after theme, language or size changes ---------- */
function redrawCharts(){
 if(typeof mode==='undefined')return;
 if(mode==='graph'){renderGraphFns();drawGraphSoon()}
 if($('#toolChart')&&!$('#howModal').classList.contains('hidden'))drawToolChart();
 if(!$('#howModal').classList.contains('hidden'))drawFuelLogChart();
 historyChartRefresh();
}
window.addEventListener('resize',()=>requestAnimationFrame(redrawCharts));
try{matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>requestAnimationFrame(redrawCharts))}catch{}

/* ---------- Fuel log: saved fuel calculations and their averages (s9) ---------- */
const FUEL_LOG_KEY='uc-fuel-log';
let fuelLastSaved='',fuelClearArmed=false;
function fuelLog(){try{const a=JSON.parse(localStorage.getItem(FUEL_LOG_KEY)||'[]');return Array.isArray(a)?a.filter(e=>e&&[e.d,e.c,e.p].every(v=>Number.isFinite(v)&&v>0)):[]}catch{return[]}}
function fuelLogSet(a){try{localStorage.setItem(FUEL_LOG_KEY,JSON.stringify(a.slice(0,300)))}catch{}}
function fText(k){
 const el={save:'Αποθήκευση υπολογισμού',saved:'Αποθηκεύτηκε',log:'Αποθηκευμένα και μέσοι όροι',title:'Αποθηκευμένα καύσιμα',avgPrice:'Μέση τιμή καυσίμου',avgCons:'Μέση κατανάλωση',avgKm:'Μέσο κόστος ανά km',total:'Σύνολο',trips:n=>n===1?'1 υπολογισμός':n+' υπολογισμοί',use:'Βάλε τη μέση τιμή στον υπολογισμό',clear:'Διαγραφή όλων',clearSure:'Σίγουρα; Πάτα ξανά',empty:'Δεν έχεις αποθηκεύσει ακόμα κάτι. Συμπλήρωσε απόσταση, κατανάλωση και τιμή και πάτα το κουμπί αποθήκευσης δίπλα στο αποτέλεσμα.',note:'Η μέση τιμή λογαριάζει πόσα λίτρα είχε κάθε υπολογισμός, όπως θα έβγαινε αν διαιρούσες όλα τα ευρώ με όλα τα λίτρα.',priceChart:'Τιμή ανά λίτρο σε κάθε υπολογισμό',avg:'μέσος όρος',del:'Διαγραφή'};
 const en={save:'Save this calculation',saved:'Saved',log:'Saved entries and averages',title:'Saved fuel entries',avgPrice:'Average fuel price',avgCons:'Average consumption',avgKm:'Average cost per km',total:'Total',trips:n=>n===1?'1 entry':n+' entries',use:'Use the average price in the calculation',clear:'Delete all',clearSure:'Sure? Tap again',empty:'Nothing saved yet. Fill in distance, consumption and price, then press the save button next to the result.',note:'The average price takes into account how many litres each entry had, the same as dividing all the euros by all the litres.',priceChart:'Price per litre in each entry',avg:'average',del:'Delete'};
 return (lang==='el'?el:en)[k];
}
const FUEL_SAVE_ICON='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 7v6M9 10h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const FUEL_SAVED_ICON='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 10l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FUEL_LOG_ICON='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="4" cy="6" r="1.4" fill="currentColor"/><circle cx="4" cy="12" r="1.4" fill="currentColor"/><circle cx="4" cy="18" r="1.4" fill="currentColor"/></svg>';
function fuelCurrent(){const d=liveToolNumber('fuelD'),c=liveToolNumber('fuelC'),p=liveToolNumber('fuelP');return d>0&&c>0&&p>0?{d,c,p}:null}
const fuelKey=v=>v?v.d+'|'+v.c+'|'+v.p:'';
function fuelStats(list){
 const km=list.reduce((s,e)=>s+e.d,0),litres=list.reduce((s,e)=>s+e.d*e.c/100,0),cost=list.reduce((s,e)=>s+e.d*e.c/100*e.p,0);
 return{n:list.length,km,litres,cost,price:litres?cost/litres:0,cons:km?litres/km*100:0,perKm:km?cost/km:0};
}
// The save and saved-entries buttons sit next to "?" in Fuel mode, so the screen does not get taller.
function syncFuelButtons(){
 const row=document.querySelector('#calculatorDisplay .expression-row');if(!row)return;
 let s=document.getElementById('fuelSaveButton'),l=document.getElementById('fuelLogButton');
 if(!s){
  s=document.createElement('button');s.id='fuelSaveButton';s.type='button';s.className='how-button fuel-btn fuel-save hidden';s.addEventListener('click',fuelSaveCurrent);
  l=document.createElement('button');l.id='fuelLogButton';l.type='button';l.className='how-button fuel-btn fuel-log hidden';l.innerHTML=FUEL_LOG_ICON;l.addEventListener('click',showFuelLog);
  const first=row.querySelector('.how-button');row.insertBefore(s,first);row.insertBefore(l,first);
 }
 const on=mode==='fuel';s.classList.toggle('hidden',!on);l.classList.toggle('hidden',!on);if(!on)return;
 const cur=fuelCurrent(),done=cur&&fuelKey(cur)===fuelLastSaved;
 s.disabled=!cur||done;s.classList.toggle('done',!!done);s.innerHTML=done?FUEL_SAVED_ICON:FUEL_SAVE_ICON;
 s.setAttribute('aria-label',fText(done?'saved':'save'));s.title=fText(done?'saved':'save');
 const n=fuelLog().length;l.setAttribute('aria-label',fText('log'));l.title=fText('log');if(n)l.dataset.count=n>99?'99+':String(n);else delete l.dataset.count;
}
function fuelSaveCurrent(){
 const cur=fuelCurrent();if(!cur||fuelKey(cur)===fuelLastSaved)return;
 const list=fuelLog();list.unshift({id:Date.now()+Math.random(),t:Date.now(),...cur});fuelLogSet(list);fuelLastSaved=fuelKey(cur);syncFuelButtons();
}
function showFuelLog(){fuelClearArmed=false;$('#howTitle').textContent=fText('title');renderFuelLog();$('#howModal').classList.remove('hidden');requestAnimationFrame(drawFuelLogChart)}
function renderFuelLog(){
 const box=$('#howContent'),list=fuelLog();if(!box)return;
 if(!list.length){box.innerHTML='<div class="empty">'+esc(fText('empty'))+'</div>';return}
 const st=fuelStats(list),dateFmt=new Intl.DateTimeFormat(lang==='el'?'el-GR':'en-GB',{day:'numeric',month:'short'});
 const stat=(label,value,cls='')=>'<div class="fuel-stat '+cls+'"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
 box.innerHTML='<div class="fuel-stats">'+stat(fText('avgPrice'),chNum(st.price,3)+' €/L','main')+stat(fText('avgCons'),chNum(st.cons,2)+' L/100 km')+stat(fText('avgKm'),chNum(st.perKm,3)+' €/km')+stat(fText('total'),fText('trips')(st.n)+' · '+chNum(st.km,1)+' km · '+chMoney(st.cost),'wide')+'</div>'+
  '<button class="fuel-use" data-fuel-use="1" type="button">'+esc(fText('use'))+' ('+esc(chNum(st.price,3))+' €/L)</button>'+
  (list.length>1?'<div class="chart-heading">'+esc(fText('priceChart'))+'</div><canvas id="fuelLogChart" class="fuel-log-chart"></canvas>':'')+
  '<div class="fuel-list">'+list.map(e=>'<div class="fuel-item"><div class="fuel-item-main"><span class="fuel-item-date">'+esc(dateFmt.format(new Date(e.t)))+'</span><span>'+esc(chNum(e.d,1)+' km · '+chNum(e.c,2)+' L/100 · '+chNum(e.p,3)+' €/L')+'</span></div><strong>'+esc(chMoney(e.d*e.c/100*e.p))+'</strong><button class="history-delete" data-fuel-del="'+e.id+'" type="button" aria-label="'+esc(fText('del'))+'">×</button></div>').join('')+'</div>'+
  '<p class="chart-note">'+esc(fText('note'))+'</p><button class="fuel-clear'+(fuelClearArmed?' armed':'')+'" data-fuel-clear="1" type="button">'+esc(fText(fuelClearArmed?'clearSure':'clear'))+'</button>';
}
function drawFuelLogChart(){
 const cv=document.getElementById('fuelLogChart');if(!cv)return;const list=fuelLog().slice().reverse();if(list.length<2)return;
 const C=chColors(),avg=fuelStats(list).price,ps=list.map(e=>e.p);
 chLineChart(cv,{series:[{pts:[[0,avg],[list.length-1,avg]],color:C.series[1],width:1.6,dash:[5,5]},{pts:list.map((e,i)=>[i,e.p]),color:C.series[0],width:2.2,dots:true}],xMin:0,xMax:list.length-1,yMin:Math.min(...ps,avg),yMax:Math.max(...ps,avg),xTicks:false,yFmt:v=>chNum(v,3)+' €'});
}
document.getElementById('howContent')?.addEventListener('click',e=>{
 const del=e.target.closest('[data-fuel-del]'),use=e.target.closest('[data-fuel-use]'),clear=e.target.closest('[data-fuel-clear]');
 if(del){fuelLogSet(fuelLog().filter(x=>String(x.id)!==del.dataset.fuelDel));fuelLastSaved='';fuelClearArmed=false;renderFuelLog();drawFuelLogChart();syncFuelButtons();return}
 if(clear){if(!fuelClearArmed){fuelClearArmed=true;renderFuelLog();drawFuelLogChart();return}fuelLogSet([]);fuelLastSaved='';fuelClearArmed=false;renderFuelLog();syncFuelButtons();return}
 if(use){const st=fuelStats(fuelLog());if(!st.price||mode!=='fuel')return;const input=document.getElementById('fuelP');if(!input)return;
  input.value=String(Math.round(st.price*1000)/1000).replace('.',',');input.dispatchEvent(new Event('input',{bubbles:true}));closeHow()}
});
