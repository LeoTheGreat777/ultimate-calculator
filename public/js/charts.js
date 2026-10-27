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
function chLegend(items){return items.map(i=>'<div class="chart-legend-item">'+(i.color?'<span class="chart-dot" style="background:'+i.color+'"></span>':'')+'<span>'+esc(i.label)+'</span>'+(i.value?'<strong>'+esc(i.value)+'</strong>':'')+'</div>').join('')}
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
/* ---------- Charts for the Fuel, Energy, VAT and Interest tools ---------- */
const CHART_ICON='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M5 20V11M12 20V5M19 20v-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
function cText(k){
 const el={loanTitle:'Πού πάνε οι δόσεις κάθε χρόνο',saveTitle:'Πώς μεγαλώνουν οι αποταμιεύσεις',paidOff:'Αποπληρωμή δανείου',interest:'Τόκοι',deposited:'Καταθέσεις',balance:'Σύνολο',payments:'{n} δόσεις των {v}',paymentsLast:'{n} δόσεις των {v}, η τελευταία {l}',yearN:'Έτος {n}',left:'Υπόλοιπο {v}',yr:'{n} χρ.',chart:'Διάγραμμα',
  fuelTitle:'Αν άλλαζε η τιμή ή η κατανάλωση',fuelCorner:'L/100 km',fuelReturn:'Με επιστροφή',fuelPer100:'Ανά 100 km',fuelNote:'Κάθε {s} στο λίτρο κάνει αυτή τη διαδρομή {v} ακριβότερη ή φθηνότερη.',
  energyTitle:'Κόστος σε βάθος χρόνου',energyNote:'Η συσκευή καταναλώνει {v} την ημέρα.',hour:'Ώρα',day:'Ημέρα',week:'Εβδομάδα',month:'Μήνας',year:'Έτος',days:'{n} ημ.',
  vatTitleAdd:'Το ίδιο καθαρό ποσό με κάθε συντελεστή',vatTitleRemove:'Το ίδιο τελικό ποσό με κάθε συντελεστή',vatNote:'Στην Ελλάδα: 24% κανονικός, 13% και 6% μειωμένοι.',net:'Καθαρό',vat:'ΦΠΑ',total:'Σύνολο',km:'km',
  historyEmpty:'Χρειάζονται τουλάχιστον 2 υπολογισμοί για το διάγραμμα.',historyHint:'Οι τελευταίοι {n} υπολογισμοί. Πάτα ένα σημείο για να δεις την πράξη.'};
 const en={loanTitle:'Where each year’s payments go',saveTitle:'How your savings grow',paidOff:'Loan paid off',interest:'Interest',deposited:'Deposits',balance:'Total',payments:'{n} payments of {v}',paymentsLast:'{n} payments of {v}, the last one {l}',yearN:'Year {n}',left:'{v} left',yr:'{n} yr',chart:'Chart',
  fuelTitle:'If the price or consumption changed',fuelCorner:'L/100 km',fuelReturn:'Return trip',fuelPer100:'Per 100 km',fuelNote:'Every {s} per litre makes this trip {v} dearer or cheaper.',
  energyTitle:'Cost over time',energyNote:'The device uses {v} a day.',hour:'Hour',day:'Day',week:'Week',month:'Month',year:'Year',days:'{n} days',
  vatTitleAdd:'The same net amount at each rate',vatTitleRemove:'The same total at each rate',vatNote:'In Greece: 24% standard, 13% and 6% reduced.',net:'Net',vat:'VAT',total:'Total',km:'km',
  historyEmpty:'At least 2 calculations are needed for the chart.',historyHint:'The last {n} calculations. Tap a point to see it.'};
 return (lang==='el'?el:en)[k];
}
function toolChartAvailable(){return ['fuel','energy','vat','loan'].includes(mode)&&!(mode==='energy'&&toolKind.energy==='kwh')&&!!toolResult?.how}// Energy from kWh: no time to spread over
function showToolChart(){
 if(!toolChartAvailable())return;
 $('#howTitle').textContent=cText('chart')+' · '+modeText(mode);
 $('#howContent').innerHTML=toolChartHtml(true);
 $('#howModal').classList.remove('hidden');
 requestAnimationFrame(drawToolChart);
}
// The chart's parts; the dialog's have ids (the tests read them), the side panel's only classes.
function toolChartHtml(ids){const a=k=>ids?' id="'+k+'"':'';
 return '<div class="chart-heading tc-title"'+a('toolChartTitle')+'></div><div class="chart-body tc-body"'+a('toolChartBody')+'></div><canvas class="tool-chart tc-canvas"'+a('toolChart')+'></canvas><div class="chart-legend tc-legend"'+a('toolChartLegend')+'></div><p class="chart-note tc-note"'+a('toolChartNote')+'></p>'}
// Rows of horizontal bars, drawn in HTML so the numbers stay sharp and readable at any size.
// rows: [{label, parts:[value…] (series 1, 2), value, sub, hl}]; bars are to scale with the largest row.
function chRows(rows){
 const max=Math.max(...rows.map(r=>r.parts.reduce((a,b)=>a+Math.max(0,b),0)),0)||1;
 return rows.map(r=>{const sum=r.parts.reduce((a,b)=>a+Math.max(0,b),0);
  return '<div class="crow'+(r.hl?' hl':'')+'"><span class="cl">'+esc(r.label)+'</span><span class="cbar" aria-hidden="true"><span class="cfill" style="width:'+(sum/max*100).toFixed(2)+'%">'+
   r.parts.map((v,i)=>'<span class="cs'+(i+1)+'" style="flex-grow:'+Math.max(0,v)+'"></span>').join('')+'</span></span><span class="cv">'+esc(r.value)+(r.sub?'<small>'+esc(r.sub)+'</small>':'')+'</span></div>'}).join('');
}
// A loan's payments month by month, added up per year: [{prin, int, left}], in cents. Each year's interest is the
// rounded running total minus last year's, so the years add up exactly to the interest shown in the result.
function loanYears(v){
 const pay=v.kind==='payoff'?v.M:v.pay,cents=x=>Math.round(x*100)/100,years=[];let bal=v.P,intSum=0,shown=0;
 for(let m=1;m<=v.months;m++){
  let int=bal*v.i,prin=pay-int;
  if(m===v.months){prin=bal;int=v.interest-intSum}
  intSum+=int;bal=Math.max(0,bal-prin);
  if(m%12===0||m===v.months){
   const run=m===v.months?v.interest:cents(intSum),int=cents(run-shown),left=m===v.months?0:cents(bal);
   const before=years.length?years[years.length-1].left:v.P;
   years.push({int,prin:cents(before-left),left});shown=run;
  }
 }
 return years;
}
function drawToolChart(root){
 if(!(root instanceof Element)){if(!$('#toolChart')||$('#howModal').classList.contains('hidden'))return;root=$('#howContent')}// (rAF passes a time)
 const q=s=>root.querySelector(s),cv=q('.tc-canvas');if(!cv)return;
 const C=chColors(),num=id=>liveToolNumber(id),title=q('.tc-title'),body=q('.tc-body'),legend=q('.tc-legend'),note=q('.tc-note');
 const html=h=>{body.innerHTML=h;cv.hidden=true},both=[{color:C.series[0]},{color:C.series[1]}];
 body.innerHTML='';cv.hidden=false;
 if(mode==='fuel'){
  // what the trip would cost at nearby prices (columns) and consumptions (rows); the middle is the result
  const d=num('fuelD'),c=num('fuelC'),p=num('fuelP');if(d===null||c===null||p===null||d<=0||c<=0||p<=0)return;
  const ps=p>.2?.1:p/2,cs=c>1?.5:c/2,cost=(cc,pp)=>d*cc/100*pp,cols=[p-ps,p,p+ps],rows=[c-cs,c,c+cs];
  title.textContent=cText('fuelTitle');
  html('<table class="what-if"><tr><th>'+esc(cText('fuelCorner'))+'</th>'+cols.map(x=>'<th>'+esc(money(x))+'/L</th>').join('')+'</tr>'+
   rows.map((cc,r)=>'<tr><th>'+esc(new Intl.NumberFormat(NUMBER_LOCALE,{minimumFractionDigits:1,maximumFractionDigits:2}).format(cc))+'</th>'+cols.map((pp,k)=>'<td'+(r===1&&k===1?' class="me"':'')+'>'+esc(money(cost(cc,pp)))+'</td>').join('')+'</tr>').join('')+'</table>');
  legend.innerHTML=chLegend([{label:cText('fuelReturn'),value:money(2*cost(c,p))},{label:cText('fuelPer100'),value:money(c*p)}]);
  note.textContent=cText('fuelNote').replace('{s}',money(ps)).replace('{v}',money(d*c/100*ps));
 }else if(mode==='energy'){
  const P=num('energyP'),hh=num('energyH'),days=num('energyD'),r=num('energyR');if([P,hh,days,r].some(x=>x===null))return;
  const kw=P/1000,kwhDay=kw*hh,base=[[cText('hour'),0,kw],[cText('day'),1],[cText('month'),30],[cText('year'),365]];
  let items=base.map(([label,n,kwh])=>({label,n,kwh:kwh??kwhDay*n,hl:n>0&&n===days}));
  if(days>0&&!items.some(i=>i.hl))items.push({label:cText('days').replace('{n}',chNum(days,1)),n:days,kwh:kwhDay*days,hl:true});
  items.sort((a,b)=>a.kwh-b.kwh);
  title.textContent=cText('energyTitle');
  html(chRows(items.map(i=>({label:i.label,parts:[i.kwh*r],value:money(i.kwh*r),sub:chNum(i.kwh,2)+' kWh',hl:i.hl}))));
  legend.innerHTML='';note.textContent=cText('energyNote').replace('{v}',chNum(kwhDay,3)+' kWh');
 }else if(mode==='vat'){
  // the same amount at the Greek rates (and the one typed, if it's another)
  const v=vatNumbers();if(!v)return;
  const add=vatAction==='add',rates=[24,13,6];if(v.rate>0&&!rates.includes(v.rate))rates.push(v.rate);rates.sort((a,b)=>b-a);
  const list=rates.map(r=>r===v.rate?v:vatNumbers(add,rat(BigInt(r)))).filter(Boolean);
  title.textContent=cText(add?'vatTitleAdd':'vatTitleRemove');
  html(chRows(list.map(x=>({label:chNum(x.rate,2)+'%',parts:[x.net,x.tax],value:money(add?x.total:x.net),sub:cText('vat')+' '+money(x.tax),hl:x.rate===v.rate}))));
  legend.innerHTML=chLegend([{...both[0],label:cText('net')},{...both[1],label:cText('vat')}]);note.textContent=cText('vatNote');
 }else if(mode==='loan'){
  const v=loanNumbers();if(!v)return;
  if(v.kind!=='savings'){
   if(v.never)return;
   // a loan, year by year: how much of the payments pays the loan off and how much is interest
   title.textContent=cText('loanTitle');
   html(chRows(loanYears(v).map((y,k)=>({label:cText('yearN').replace('{n}',k+1),parts:[y.prin,y.int],value:money(y.int),sub:y.left>.005?cText('left').replace('{v}',money(y.left)):''}))));
   legend.innerHTML=chLegend([{...both[0],label:cText('paidOff'),value:money(v.P)},{...both[1],label:cText('interest'),value:money(v.interest)}]);
   note.textContent=v.kind==='loan'?cText('payments').replace('{n}',v.months).replace('{v}',money(v.pay)):cText('paymentsLast').replace('{n}',v.months).replace('{v}',money(v.M)).replace('{l}',money(v.last));
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

// The fuel log (saved fuel calculations) was removed in 0.15.5; its saved entries go too.
store.del('uc-fuel-log');

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
 historyChartRefresh();
 refreshSide(true);
}
window.addEventListener('resize',()=>requestAnimationFrame(redrawCharts));
try{matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>requestAnimationFrame(redrawCharts))}catch{}
