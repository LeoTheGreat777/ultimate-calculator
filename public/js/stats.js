// Statistics: a list of numbers, typed one at a time (the Add key or Enter) or pasted all at once, and its average,
// median, standard deviation (s of a sample, σ of a whole population), sum, smallest and largest. Exact with fractions
// (rat) up to the square roots. The list is kept as text among the tool's inputs (statList: "12;15,5;-3", decimal comma,
// no thousands dots), so History saves and brings it back like any field. The chips under the field show it: tap one
// to take it out; ⌫ on an empty field takes the last one back to edit it.
const STAT_MAX=1000;
const statValues=()=>String(toolState.stats?.inputs?.statList||'').split(';').filter(Boolean);
function setStatValues(list){const inp=toolState.stats.inputs;if(list.length)inp.statList=list.join(';');else delete inp.statList}
// a typed or pasted number as kept in the list (-12,5); null if it isn't one
function statNumber(s){
 s=String(s??'').replace(/\./g,'').replace(/,$/,'');
 if(!/^-?\d+(,\d+)?$/.test(s)||digitCount(s)>MAX_DIGITS)return null;
 s=s.replace(/^(-?)0+(?=\d)/,'$1');return /^-0(,0+)?$/.test(s)?'0':s;
}
const statText=v=>groupDigits(v);// 1234,5 -> 1.234,5
// The field is one box with the list's chips first and the number being typed after them (the chips scroll sideways;
// the typing part always stays in view). The details under it look like Subnet's (the same class).
function statsPanelHtml(){
 const input=field('statX',t('statX')).match(/<input[^>]*>/)[0].replace('<input ','<input aria-labelledby="statLabel" ');
 return '<div class="tool-field stat-field"><span id="statLabel">'+esc(t('statX'))+'</span><div class="stat-box"><div id="statList" class="stat-list"></div>'+input+'</div></div>'+
  '<div id="statDetails" class="net-details stat-details"></div>';
}
// Adds the number in the field (or the numbers given, when pasted) to the list.
function statAdd(values){
 const input=$('#statX');if(!input||mode!=='stats')return false;
 const fromField=!values;
 if(fromField){const v=statNumber(input.value);if(v===null){refuseKey(input);return false}values=[v]}
 const list=statValues();
 if(list.length+values.length>STAT_MAX){refuseLimit(input,[STAT_MAX,'']);return false}
 setStatValues([...list,...values]);
 if(fromField){input.value='';delete toolState.stats.inputs.statX;fitDisplayText(input,12,true)}
 statsCalculate();
 const box=$('#statList');if(box){box.scrollLeft=box.scrollWidth;fitFade(box)}
 return true;
}
function statRemove(i){const list=statValues();if(!(i>=0&&i<list.length))return;list.splice(i,1);setStatValues(list);statsCalculate()}
// ⌫ on an empty field: the last number comes back into the field
function statTakeBack(){
 const input=$('#statX'),list=statValues();if(!input||!list.length)return false;
 const v=list.pop();setStatValues(list);input.value=statText(v);toolState.stats.inputs.statX=input.value;fitDisplayText(input,12,true);
 statsCalculate();return true;
}
// Pasted text with more than one number (a column from a spreadsheet, "1 2 3", "1; 2,5; 3", "1,2,3"): all of them.
// null when it is a single number (the field takes it as usual); false when something in it isn't a number.
function statPasted(text){
 text=String(text||'').trim();
 let parts=/[\s;]/.test(text)?text.split(/[\s;]+/):(text.match(/,/g)||[]).length>1?text.split(','):null;
 if(!parts)return null;
 parts=parts.filter(Boolean);if(parts.length<2)return null;
 const vals=parts.map(p=>statNumber(pastedNumber(p)));
 return vals.includes(null)?false:vals;
}
function renderStatList(){
 const box=$('#statList');if(!box)return;
 const list=statValues();
 box.classList.toggle('empty',!list.length);
 box.innerHTML=list.map((v,i)=>'<button type="button" class="stat-chip" data-i="'+i+'" aria-label="'+esc(t('statRemove').replace('{v}',statText(v)))+'">'+esc(statText(v))+'<span aria-hidden="true">×</span></button>').join('');
 const input=$('#statX');if(input)input.placeholder=list.length?'':t('statEmpty');// an empty list says what to do
 box.scrollLeft=box.scrollWidth;fitFade(box);// the newest in view; the cut-off side fades
}
document.addEventListener('scroll',e=>{if(e.target?.id==='statList')fitFade(e.target)},true);
// Always the same cells (– until there is a result), so the layout doesn't jump.
const STAT_CELLS=['statMedian','statSd','statSdPop','statMin','statMax','statSum'];
function renderStatDetails(values){
 const box=$('#statDetails');if(!box)return;
 box.innerHTML=STAT_CELLS.map((k,i)=>'<div><span>'+esc(t(k))+'</span><strong>'+esc(values?values[i]:'–')+'</strong></div>').join('');
 box.querySelectorAll('strong').forEach(s=>fitDisplayText(s,9));
}
// a fraction the display shows exactly (at most 6 decimals)
const shortDecimal=r=>{let d=r.d;for(const p of [2n,5n])while(d%p===0n)d/=p;return d===1n&&r.d<=1000000n};
const ratCmp=(a,b)=>{const x=a.n*b.d,y=b.n*a.d;return x<y?-1:x>y?1:0};
function statsCalculate(){
 renderStatList();
 const el=lang==='el',L=(g,e)=>el?g:e,list=statValues();
 if(!list.length){setToolResult('','',null);renderStatDetails(null);return}
 const xs=list.map(v=>ratFromString(v)),n=xs.length,N=rat(BigInt(n)),V=v=>fmt(v),P=v=>v.n<0n?'('+V(v)+')':V(v);
 const sum=xs.reduce(ratAdd,rat(0n)),mean=ratDiv(sum,N);
 const sorted=[...xs].sort(ratCmp),mid=n>>1,min=sorted[0],max=sorted[n-1];
 const median=n%2?sorted[mid]:ratDiv(ratAdd(sorted[mid-1],sorted[mid]),rat(2n));
 const ss=xs.reduce((s,x)=>{const d=ratSub(x,mean);return ratAdd(s,ratMul(d,d))},rat(0n));
 const varPop=ratDiv(ss,N),varS=n>1?ratDiv(ss,rat(BigInt(n-1))):null;
 const root=v=>sciFunction('√',v),sdPop=root(varPop),sdS=varS&&root(varS);
 // the most frequent value(s), if any repeats
 const counts=new Map();for(const x of sorted){const k=x.n+'/'+x.d;counts.set(k,(counts.get(k)||{x,c:0}));counts.get(k).c++}
 const top=Math.max(...[...counts.values()].map(o=>o.c)),modes=top>1?[...counts.values()].filter(o=>o.c===top).map(o=>o.x):[];
 const listText=(a,max=200)=>a.slice(0,max).map(V).join('; ')+(a.length>max?'; …':'');
 const count=n+' '+(n===1?L('αριθμού','number'):L('αριθμών','numbers'));
 const steps=[
  {title:L('Ταξινομημένοι','In order'),text:listText(sorted)},
  {title:L('Άθροισμα','Sum')+' Σx',text:(n>1&&n<=12?xs.map((x,i)=>i?P(x):V(x)).join(' + ')+' = ':'')+V(sum)},
  {title:L('Μέσος όρος','Average')+' x̄ = Σx ÷ n',text:V(sum)+' ÷ '+n+' = '+V(mean)},
  {title:n%2?L('Διάμεσος: ο μεσαίος','Median: the middle one')+' ('+L('ο '+(mid+1)+'ος από '+n,'number '+(mid+1)+' of '+n)+')':L('Διάμεσος: ο μέσος όρος των δύο μεσαίων','Median: the average of the two middle ones'),
   text:n%2?V(median):'('+V(sorted[mid-1])+' + '+P(sorted[mid])+') ÷ 2 = '+V(median)},
  {title:L('Άθροισμα τετραγώνων των αποκλίσεων','Sum of squared deviations')+' Σ(x − x̄)²',text:(n<=5&&shortDecimal(mean)?xs.map(x=>'('+V(x)+' − '+P(mean)+')²').join(' + ')+' = ':'')+V(ss)}];// written out only when x̄ is shown exactly
 if(varS)steps.push({title:L('Διακύμανση δείγματος','Sample variance')+' s² = Σ(x − x̄)² ÷ (n − 1)',text:V(ss)+' ÷ '+(n-1)+' = '+V(varS)},
  {title:L('Τυπική απόκλιση δείγματος','Sample standard deviation')+' s = √s²',text:'√'+P(varS)+' = '+V(sdS)});
 else steps.push({title:L('Τυπική απόκλιση δείγματος','Sample standard deviation')+' s',text:L('Θέλει τουλάχιστον 2 αριθμούς','Needs at least 2 numbers')});
 steps.push({title:L('Διακύμανση πληθυσμού','Population variance')+' σ² = Σ(x − x̄)² ÷ n',text:V(ss)+' ÷ '+n+' = '+V(varPop)},
  {title:L('Τυπική απόκλιση πληθυσμού','Population standard deviation')+' σ = √σ²',text:'√'+P(varPop)+' = '+V(sdPop)},
  {title:L('Εύρος: μέγιστο − ελάχιστο','Range: largest − smallest'),text:V(max)+' − '+P(min)+' = '+V(ratSub(max,min))},
  {title:L('Επικρατούσα τιμή','Mode'),text:modes.length?listText(modes,20)+' ('+top+L(' φορές',' times')+')':L('Κανένας αριθμός δεν επαναλαμβάνεται','No number repeats')});
 const how={formula:L('Στατιστικά ','Statistics of ')+count+': '+listText(xs,30),steps,result:'x̄ = '+V(mean)+(sdS?' · s = '+V(sdS):'')};
 setToolResult(V(mean),L('Μέσος όρος ','Average of ')+count,how);
 renderStatDetails([V(median),sdS?V(sdS):'–',V(sdPop),V(min),V(max),V(sum)]);
}
window._runStats=statsCalculate;
// the chips: a tap takes that number out of the list
$('#toolPanel').addEventListener('click',e=>{
 if(mode!=='stats'||!e.target.closest('.stat-box'))return;
 const c=e.target.closest('.stat-chip');if(c)statRemove(+c.dataset.i);
 const input=$('#statX');setActiveToolInput(input);if(!isMobileDevice()&&!c)input?.focus();// the whole box is the field
});
// several numbers pasted into the field at once go straight into the list
$('#toolPanel').addEventListener('paste',e=>{
 if(e.target.id!=='statX')return;
 const vals=statPasted(e.clipboardData?.getData('text'));if(vals===null)return;
 e.preventDefault();if(vals===false){refuseKey(e.target);return}statAdd(vals);
});
