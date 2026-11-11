// Transfer: how long a download, an upload or a copy takes (Time), how much data gets through in a time (Size), or
// the speed a transfer needs (Speed). Size, Speed and Time are a number with its unit beside it in one box
// (xfFieldHtml: the field's own input and a <select>); the units picked stay (xfUnit: saved in uc-tools, and with
// every History entry). The maths is exact (rat) in bits, bits per second and seconds; only what is shown is rounded.
// Speeds come in bits (Mbps) or bytes (MB/s), sizes in thousands (GB) or in 1024s (GiB). Overhead % is the share of
// the speed that carries no data (empty = none).
const XF_KIND={xfSize:'size',xfSpeed:'speed',xfTime:'time'};
// what one of each unit is: bits, bits per second, seconds
const XF_UNITS={size:{kB:8000n,MB:8000000n,GB:8000000000n,TB:8000000000000n,KiB:8192n,MiB:8388608n,GiB:8589934592n,TiB:8796093022208n},
 speed:{kbps:1000n,Mbps:1000000n,Gbps:1000000000n,'kB/s':8000n,'MB/s':8000000n,'GB/s':8000000000n,'KiB/s':8192n,'MiB/s':8388608n,'GiB/s':8589934592n},
 time:{s:1n,min:60n,h:3600n,day:86400n}};
// the menus: groups with a title (a key of T) and their units
const XF_GROUPS={size:[['xfGrpDec',['kB','MB','GB','TB']],['xfGrpBin',['KiB','MiB','GiB','TiB']]],
 speed:[['xfGrpBits',['kbps','Mbps','Gbps']],['xfGrpBytes',['kB/s','MB/s','GB/s']],['xfGrpBinSpeed',['KiB/s','MiB/s','GiB/s']]],
 time:[['',['s','min','h','day']]]};
let xfUnit={xfSize:'GB',xfSpeed:'Mbps',xfTime:'h'};
const xfValid=(id,u)=>typeof u==='string'&&!!XF_KIND[id]&&Object.prototype.hasOwnProperty.call(XF_UNITS[XF_KIND[id]],u);
// The units of the kind on screen (History keeps them with the entry); xfSetUnits brings saved ones back
const xfChoices=()=>Object.fromEntries(kindFields('transfer').filter(id=>XF_KIND[id]).map(id=>[id,xfUnit[id]]));
function xfSetUnits(saved){if(saved&&typeof saved==='object')Object.keys(XF_KIND).forEach(id=>{if(xfValid(id,saved[id]))xfUnit[id]=saved[id]})}
// A unit as written after a number: h, MB/s; days are a word (1 day, 2 days)
const xfUnitText=(u,v)=>u==='day'?(lang==='el'?['ημέρα','ημέρες']:['day','days'])[v&&v.n===1n&&v.d===1n?0:1]:u;
const xfQty=(id,v)=>fmt(v)+' '+xfUnitText(xfUnit[id],v);
// The grey example in an empty field follows its unit (1 Gbps, 100 Mbps)
const xfExample=id=>id==='xfSpeed'?(/^G/.test(xfUnit.xfSpeed)?'1':'100'):id==='xfTime'?(xfUnit.xfTime==='s'||xfUnit.xfTime==='min'?'30':'1'):/^T/.test(xfUnit.xfSize)?'2':'200';
// A field with its unit: the usual input (field, tools.js) and the unit, in one box. The unit shown is plain text with
// a drawn arrow, as wide as it needs; the device's own menu (a <select> with clear text) lies over it and opens on a tap
// (a select by itself is as wide as its longest choice, too wide for three fields in a row).
const xfMenuText=u=>u==='day'?t('xfDays'):u;
function xfFieldHtml(id){
 const label=t(id),input=field(id,label).match(/<input[^>]*>/)[0].replace('<input ','<input aria-labelledby="'+id+'Label" ');
 const option=u=>'<option value="'+u+'"'+(u===xfUnit[id]?' selected':'')+'>'+esc(xfMenuText(u))+'</option>';
 const menu=XF_GROUPS[XF_KIND[id]].map(([title,list])=>title?'<optgroup label="'+esc(t(title))+'">'+list.map(option).join('')+'</optgroup>':list.map(option).join('')).join('');
 return '<div class="tool-field xf-field"><span id="'+id+'Label">'+esc(label)+'</span><div class="xf-box">'+input+
  '<div class="xf-unit"><b aria-hidden="true">'+esc(xfMenuText(xfUnit[id]))+'</b><select data-xf="'+id+'" aria-label="'+esc(t('xfUnitOf').replace('{v}',label))+'">'+menu+'</select></div></div></div>';// not spans: the labels' styles and fitShortLabels take every span in a field
}
function xfPickUnit(id,u){
 if(!xfValid(id,u))return false;
 xfUnit[id]=u;saveTools();
 const s=$('#toolPanel select[data-xf="'+id+'"]'),input=$('#'+id);
 if(s){if(s.value!==u)s.value=u;s.previousElementSibling.textContent=xfMenuText(u)}
 if(input){input.placeholder=xfExample(id);fitDisplayText(input,12,true)}// the unit's width changed: the number is fitted again
 return true;
}
// Pasted with its unit ("200 GB", "1 Gbps", "12,5 MiB/s", "90 min"): the unit is picked too. b is bits, B bytes.
function xfPastedUnit(id,text){
 const kind=XF_KIND[id],m=/\d\s*([a-zA-Z]+(?:\/s)?)\s*$/.exec(String(text??''));if(!kind||!m)return;
 let u;
 if(kind==='time')u={s:'s',sec:'s',secs:'s',second:'s',seconds:'s',m:'min',min:'min',mins:'min',minute:'min',minutes:'min',h:'h',hr:'h',hrs:'h',hour:'h',hours:'h',d:'day',day:'day',days:'day'}[m[1].toLowerCase()];
 else{
  const p=/^([kmgt])(i?)(b)(ps|\/s|it\/s)?$/i.exec(m[1]);if(!p||!!p[4]!==(kind==='speed'))return;
  const big=p[1].toUpperCase(),bytes=(big==='K'&&!p[2]?'k':big)+(p[2]?'i':'')+'B';
  u=kind==='size'?bytes:p[2]||(p[3]==='B'&&!/^it/i.test(p[4]))?bytes+'/s':(big==='K'?'k':big)+'bps';
 }
 if(u&&u!==xfUnit[id])xfPickUnit(id,u);
}
$('#toolPanel').addEventListener('change',e=>{
 const s=e.target.closest?.('select[data-xf]');if(!s||mode!=='transfer'||!xfPickUnit(s.dataset.xf,s.value))return;
 setActiveToolInput($('#'+s.dataset.xf));
 setTimeout(()=>s.blur(),0);// the keyboard goes back to typing numbers, as in Units (after the menu has closed)
 transferCalculate();
});

// Data units go up in steps of 1000 (bits: kbit, Mbit…; bytes: kB, MB…) or of 1024 (KiB, MiB…): a family and a level.
// 'Gbps' and 'Gbit' are {fam:'bit',i:3}, 'MiB/s' is {fam:'bin',i:2}.
const XF_PREFIX={bit:['','k','M','G','T','P'],dec:['','k','M','G','T','P'],bin:['','Ki','Mi','Gi','Ti','Pi']};
const xfLevel=u=>{const fam=/iB/.test(u)?'bin':/B/.test(u)?'dec':'bit';return {fam,i:XF_PREFIX[fam].indexOf(u.replace(/(bps|bit|B\/s|B)$/,''))}};
const xfName=(fam,i,perSecond)=>XF_PREFIX[fam][i]+(fam==='bit'?(perSecond?'bps':'bit'):perSecond?'B/s':'B');
const xfBits=(fam,i)=>(fam==='bit'?1n:8n)*(fam==='bin'?1024n:1000n)**BigInt(i);
// two decimals; more for a value under 1, so it never shows as 0
const xfNum=v=>formatRat(v,ratCmp(v,rat(1n))<0?6:2);
// Bits (or bits per second) in the unit of a family that reads best: the largest one they reach.
function xfScaled(bits,fam,perSecond){
 const top=XF_PREFIX[fam].length-1,inUnit=i=>ratDiv(bits,rat(xfBits(fam,i)));
 let i=0;while(i<top&&ratCmp(bits,rat(xfBits(fam,i+1)))>=0)i++;
 if(i<top&&ratToRoundedDecimal(inUnit(i),2)===String(fam==='bin'?1024:1000))i++;// 999,996 MB is 1 GB, not 1.000 MB
 const v=inUnit(i),unit=xfName(fam,i,perSecond);
 return {v,i,unit,text:xfNum(v)+' '+unit};
}
// Seconds as a time to read: 1600 -> "26 min 40 s". Whole seconds from a minute up, whole minutes from a day, whole
// days from a year (365 days); under a minute two decimals, under a second milliseconds.
// {text, exact: nothing was rounded, title: the step's title in the working ('' when it is still plain seconds), ms}
function xfDuration(sec){
 const el=lang==='el',one=rat(1n),r2=x=>ratFromString(ratToRoundedDecimal(x,2)),join=list=>list.filter(Boolean).join(' ');
 const whole=(x,per)=>{const q=ratDiv(x,rat(per)),f=ratFloor(q);return ratCmp(ratSub(q,rat(f)),rat(1n,2n))<0?f:f+1n};// to the nearest
 const word=(k,n)=>formatRat(rat(n),0)+' '+(k==='day'?(el?['ημέρα','ημέρες']:['day','days']):(el?['χρόνος','χρόνια']:['year','years']))[n===1n?0:1];
 if(ratCmp(sec,one)<0){
  const ms=ratMul(sec,rat(1000n)),title=el?'Σε χιλιοστά του δευτερολέπτου':'In milliseconds';
  if(ratCmp(ms,rat(1n,200n))<0)return {text:'< 0,01 ms',exact:false,title,ms};
  if(ratCmp(r2(ms),rat(1000n))<0)return {text:formatRat(ms,2)+' ms',exact:true,title,ms};
 }
 if(ratCmp(r2(sec),rat(60n))<0)return {text:formatRat(sec,2)+' s',exact:true,title:''};
 let n=whole(sec,1n);
 if(n<86400n){const h=n/3600n,m=n%3600n/60n,s=n%60n;
  return {text:join([h&&h+' h',m&&m+' min',s&&s+' s']),exact:sec.d===1n,title:h?(el?'Σε ώρες, λεπτά και δευτερόλεπτα':'In hours, minutes and seconds'):(el?'Σε λεπτά και δευτερόλεπτα':'In minutes and seconds')}}
 n=whole(sec,60n);
 if(n<525600n){const d=n/1440n,h=n%1440n/60n,m=n%60n;
  return {text:join([word('day',d),h&&h+' h',m&&m+' min']),exact:ratCmp(sec,rat(n*60n))===0,title:el?'Σε ημέρες, ώρες και λεπτά':'In days, hours and minutes'}}
 n=whole(sec,86400n);const y=n/365n,d=n%365n,huge=y>=1000000n;// from a million years on, the days say nothing
 return {text:join([word('year',y),d&&!huge&&word('day',d)]),exact:!huge&&ratCmp(sec,rat(n*86400n))===0,title:el?'Σε χρόνια και ημέρες (1 χρόνος = 365 ημέρες)':'In years and days (1 year = 365 days)'};
}
// One step of the working, a value into another unit: "1 GB = 8 Gbit" and "200 GB × 8 = 1.600 Gbit" (÷ when the new
// unit is the bigger one). a, b: what one of each unit is (bits or seconds). {out: the value in the new unit, step}
function xfStep(v,from,a,to,b){
 const W=x=>formatRatLong(x,HOW_DECIMALS),one=rat(1n),up=a>=b,k=up?rat(a,b):rat(b,a),out=ratMul(v,rat(a,b));
 return {out,step:{title:up?'1 '+xfUnitText(from,one)+' = '+W(k)+' '+xfUnitText(to,k):'1 '+xfUnitText(to,one)+' = '+W(k)+' '+xfUnitText(from,k),
  text:W(v)+' '+xfUnitText(from,v)+(up?' × ':' ÷ ')+W(k)+' = '+W(out)+' '+xfUnitText(to,out)}};
}
// A speed the other way round, for the line under the result and its step: bits per second in bytes (MB/s; MiB/s when
// the size is counted in 1024s), bytes per second in bits. v: the speed in `unit`. {text, step}
function xfOtherSpeed(v,unit,binary){
 const W=x=>formatRatLong(x,HOW_DECIMALS),lv=xfLevel(unit),bps=ratMul(v,rat(xfBits(lv.fam,lv.i)));
 if(lv.fam==='bit'){
  const fam=binary?'bin':'dec',to=xfScaled(bps,fam,true),from=xfName('bit',to.i,true),k=rat(xfBits(fam,to.i),xfBits('bit',to.i));
  return {text:to.text,step:{title:'1 '+to.unit+' = '+W(k)+' '+from,text:W(ratDiv(bps,rat(xfBits('bit',to.i))))+' '+from+' ÷ '+W(k)+' = '+W(to.v)+' '+to.unit}};
 }
 const to=xfScaled(bps,'bit',true),same=xfName('bit',lv.i,true),k=rat(xfBits(lv.fam,lv.i),xfBits('bit',lv.i));
 return {text:to.text,step:{title:'1 '+unit+' = '+W(k)+' '+same,text:W(v)+' '+unit+' × '+W(k)+' = '+W(ratMul(v,k))+' '+same+(to.i!==lv.i?' = '+W(to.v)+' '+to.unit:'')}};
}
function transferCalculate(){
 const el=lang==='el',kind=toolKind.transfer,none=()=>setToolResult('','',null),val={};
 for(const id of kindFields('transfer')){
  if(!XF_KIND[id])continue;
  const v=ratField(id);if(!v||v.n<=0n)return none();
  val[id]=v;
 }
 // Overhead: empty is none; from 100% up nothing would get through
 const L=fieldValue('xfLoss').trim()===''?rat(0n):ratField('xfLoss');
 if(!L||L.n<0n||ratCmp(L,rat(100n))>=0)return none();
 const W=x=>formatRatLong(x,HOW_DECIMALS),loss=L.n>0n,pc=fmt(L)+'%',keep=ratSub(rat(1n),ratDiv(L,rat(100n))),steps=[];
 const uS=xfUnit.xfSize,uV=xfUnit.xfSpeed,uT=xfUnit.xfTime,S=val.xfSize,V=val.xfSpeed,T=val.xfTime;
 const lossStep=net=>({title:el?'Απώλειες '+pc+': η ταχύτητα που μένει':pc+' overhead: the speed that is left',text:W(V)+' '+uV+' × (1 − '+fmt(L)+' ÷ 100) = '+W(net)+' '+uV});
 if(kind==='speed'){
  // the speed needed, in bits per second; with an overhead the line has to be faster than what the data needs
  let secs=T;
  if(uT!=='s'){const c=xfStep(T,uT,XF_UNITS.time[uT],'s',1n);steps.push(c.step);secs=c.out}
  const data=ratDiv(ratMul(S,rat(XF_UNITS.size[uS])),secs),res=xfScaled(ratDiv(data,keep),'bit',true);
  const c=xfStep(S,uS,XF_UNITS.size[uS],xfName('bit',res.i,false),xfBits('bit',res.i)),net=ratDiv(c.out,secs);
  steps.push(c.step,{title:el?'Ταχύτητα = μέγεθος ÷ χρόνος':'Speed = size ÷ time',text:W(c.out)+' '+xfName('bit',res.i,false)+' ÷ '+W(secs)+' s = '+W(net)+' '+res.unit});
  if(loss)steps.push({title:el?'Απώλειες '+pc+': η γραμμή πρέπει να είναι πιο γρήγορη':pc+' overhead: the line has to be faster',text:W(net)+' '+res.unit+' ÷ (1 − '+fmt(L)+' ÷ 100) = '+W(res.v)+' '+res.unit});
  const other=xfOtherSpeed(net,res.unit,/iB/.test(uS));steps.push(other.step);
  setToolResult(res.text,(loss?(el?'καθαρά ':'net ')+xfScaled(data,'bit',true).text+' ':'')+'= '+other.text,
   {formula:xfQty('xfSize',S)+' ÷ '+xfQty('xfTime',T)+(loss?' ÷ (1 − '+pc+')':''),steps,result:res.text});
  return;
 }
 const lv=xfLevel(uV),unitBits=xfBits(lv.fam,lv.i),data=xfName(lv.fam,lv.i,false);// what the speed counts in a second: Gbps -> Gbit, MB/s -> MB
 const speedShown=xfQty('xfSpeed',V)+(loss?' − '+pc:'');// "1 Gbps − 10%"
 if(kind==='time'){
  let size=S;
  if(uS!==data){const c=xfStep(S,uS,XF_UNITS.size[uS],data,unitBits);steps.push(c.step);size=c.out}
  const net=ratMul(V,keep);if(loss)steps.push(lossStep(net));
  const secs=ratDiv(size,net),dur=xfDuration(secs);
  steps.push({title:el?'Χρόνος = μέγεθος ÷ ταχύτητα':'Time = size ÷ speed',text:W(size)+' '+data+' ÷ '+W(net)+' '+uV+' = '+W(secs)+' s'});
  if(dur.title)steps.push({title:dur.title,text:dur.ms?W(secs)+' s × '+fmt(1000)+' = '+W(dur.ms)+' ms':W(secs)+' s '+(dur.exact?'=':'≈')+' '+dur.text});
  const other=xfOtherSpeed(net,uV,/iB/.test(uS));steps.push(other.step);
  setToolResult(dur.text,speedShown+' = '+other.text,{formula:xfQty('xfSize',S)+' ÷ '+(loss?'('+speedShown+')':speedShown),steps,result:dur.text});
  return;
 }
 // Size: what gets through in the time, in bytes (GB; GiB when the speed is counted in 1024s), with the other one beside it
 let secs=T;
 if(uT!=='s'){const c=xfStep(T,uT,XF_UNITS.time[uT],'s',1n);steps.push(c.step);secs=c.out}
 const net=ratMul(V,keep);if(loss)steps.push(lossStep(net));
 const amount=ratMul(net,secs),bits=ratMul(amount,rat(unitBits)),fam=lv.fam==='bin'?'bin':'dec',alt=fam==='bin'?'dec':'bin';
 steps.push({title:el?'Μέγεθος = ταχύτητα × χρόνος':'Size = speed × time',text:W(net)+' '+uV+' × '+W(secs)+' s = '+W(amount)+' '+data});
 const res=xfScaled(bits,fam,false),also=xfScaled(bits,alt,false);
 if(res.unit!==data)steps.push(xfStep(amount,data,unitBits,res.unit,xfBits(fam,res.i)).step);
 if(also.unit!==res.unit)steps.push(xfStep(res.v,res.unit,xfBits(fam,res.i),also.unit,xfBits(alt,also.i)).step);
 const other=xfOtherSpeed(net,uV,fam==='bin');steps.push(other.step);
 setToolResult(res.text,(also.unit!==res.unit?also.text+' · ':'')+speedShown+' = '+other.text,
  {formula:(loss?'('+speedShown+')':speedShown)+' × '+xfQty('xfTime',T),steps,result:res.text});
}
window._runTransfer=transferCalculate;
