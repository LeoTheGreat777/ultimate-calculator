// "How was this calculated?" (the ? button, and the working panel beside the app on big screens).
// The Calculator's working: the calculation is read into a tree the same way evalExpr reads it, then worked out one
// step at a time in the order taught at school – brackets first, then powers and functions, then × ÷, then + −, each
// from left to right – and after every step the calculation is shown again, shorter, with the new number marked.
// Every step is computed with the same exact maths as evalExpr; if the last step doesn't give the result on screen,
// the working is not shown (null), never a wrong one.
const SUP_MAP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','−':'⁻'};
const supText=s=>String(s).split('').map(c=>SUP_MAP[c]??c).join('');// 2^6 -> 2⁶, ^−300 -> ⁻³⁰⁰
const HL_ON='\u0001',HL_OFF='\u0002';// around the number a step has just worked out (howHtml marks it)
const FN_LABEL={asin:'sin⁻¹',acos:'cos⁻¹',atan:'tan⁻¹'};
const FN_TITLE={sin:['Ημίτονο','Sine'],cos:['Συνημίτονο','Cosine'],tan:['Εφαπτομένη','Tangent'],asin:['Τόξο ημιτόνου','Inverse sine'],
 acos:['Τόξο συνημιτόνου','Inverse cosine'],atan:['Τόξο εφαπτομένης','Inverse tangent'],ln:['Φυσικός λογάριθμος','Natural logarithm'],
 log:['Λογάριθμος (βάση 10)','Logarithm (base 10)'],'√':['Τετραγωνική ρίζα','Square root'],'∛':['Κυβική ρίζα','Cube root']};
// [title, Greek with its article for "Πρώτα …"]
const OP_TITLE={'*':[['Πολλαπλασιασμός','ο πολλαπλασιασμός'],'Multiply'],'/':[['Διαίρεση','η διαίρεση'],'Divide'],'+':[['Πρόσθεση','η πρόσθεση'],'Add'],
 '-':[['Αφαίρεση','η αφαίρεση'],'Subtract'],pow:[['Δύναμη','η δύναμη'],'Power'],fact:[['Παραγοντικό','το παραγοντικό'],'Factorial']};
const OP_SIGN={'+':'+','-':'−','*':'×','/':'÷'};
// a number as shown, with … when it is rounded (1 ÷ 3 = 0,333333…), so 0,333333 × 3 = 1 doesn't look wrong
// (worked-out numbers keep the plain -, as results do on the display)
function ratShown(v){const s=formatRat(v);if(/×/.test(s))return s;
 let exact=false;try{exact=ratEq(ratFromString(s.replace(/\./g,'').replace(',','.')),v)}catch{}
 return s+(exact?'':'…')}
const ratEq=(a,b)=>a.n*b.d===b.n*a.d;
const isTrig=n=>['sin','cos','tan'].includes(n),isArc=n=>['asin','acos','atan'].includes(n);

// The calculation as a tree, read exactly like evalExpr (numbers.js) reads it. `at` is where the node's own sign is
// in the calculation, for "left to right".
function exprTree(input){
 const tokens=tokenize(input);let pos=0;const peek=()=>tokens[pos];
 function primary(){const at=pos,tok=tokens[pos++];if(!tok)throw Error('INCOMPLETE');
  if(tok.type==='('){const c=additive();if(peek()?.type!==')')throw Error('PAREN');pos++;return{k:'group',c,at}}
  if(tok.type==='number'){const carried=carry&&tok.raw===carry.text;return{k:'num',v:tok.value,pct:tok.percent,raw:tok.raw,orig:true,carried,at}}
  if(tok.type==='fn'){const c=peek()?.type==='('?primary():postfix();return{k:'fn',name:tok.name,c,at}}
  throw Error('SYNTAX')}
 function postfix(){let v=primary();while(peek()?.type==='!'){v={k:'fact',c:v,at:pos++}}return v}
 function power(){const b=postfix();if(peek()?.type==='^'){const at=pos++;return{k:'pow',b,e:unary(),at}}return b}
 function unary(){const tok=peek();if(tok&&(tok.type==='+'||tok.type==='-')){const at=pos++;const v=unary();if(tok.type==='+')return v;
  if(v.k==='num')return{...v,v:ratMul(rat(-1n),v.v),neg:!v.neg};// −5 is one number
  return{k:'neg',c:v,at}}return power()}
 function mult(){let l=unary();while(['*','/'].includes(peek()?.type)){const at=pos,op=tokens[pos++].type;l={k:'bin',op,l,r:unary(),at}}return l}
 function additive(){let l=mult();while(['+','-'].includes(peek()?.type)){const at=pos,op=tokens[pos++].type;l={k:'bin',op,l,r:mult(),at}}return l}
 const t=additive();if(pos!==tokens.length)throw Error('SYNTAX');return t;
}
// A tree back as text, the way the display writes it: 12 + 7 × 3, (−5), 2³, sin(30). lead: nothing before it in its
// bracket (a negative number there needs no brackets). plain: no mark on the new number. deg: sin(30°).
function exprText(n,lead=true,o={}){
 if(n.k==='num'){
  const neg=n.v.n<0n;let s;
  if(n.orig&&!n.carried){s=formatInputDisplay(n.raw);if(n.neg)s='−'+s}
  else s=ratShown(n.v);
  if(neg&&!lead)s='('+s+')';
  return n.hl&&!o.plain?HL_ON+s+HL_OFF:s;
 }
 if(n.k==='group')return '('+exprText(n.c,true,o)+')';
 if(n.k==='fn'){const lab=FN_LABEL[n.name]||n.name,inner=n.c.k==='group'?exprText(n.c.c,true,o):exprText(n.c,true,o);
  return lab+'('+inner+(o.deg&&isTrig(n.name)?'°':'')+')'}
 if(n.k==='pow'){
  let b=exprText(n.b,lead,o);if(n.b.k==='num'&&n.b.v.n<0n&&lead)b='('+b+')';
  const e=n.e;
  if(e.k==='num'&&e.v.d===1n&&!e.pct&&!(e.orig&&/[πe]/.test(e.raw))){const s=supText(String(e.v.n));return b+(e.hl&&!o.plain?HL_ON+s+HL_OFF:s)}
  return b+'^'+exprText(e,false,o);
 }
 if(n.k==='fact')return exprText(n.c,lead,o)+'!';
 if(n.k==='neg')return '−'+exprText(n.c,false,o);
 return exprText(n.l,lead,o)+' '+OP_SIGN[n.op]+' '+exprText(n.r,false,o);
}
function explanationForExpression(input,result){
 const el=lang==='el',L=(g,e)=>el?g:e,deg=angleUnit==='deg',V=ratShown;let lastV=null;
 let tree;try{tree=exprTree(input)}catch{return null}
 const formula=exprText(tree,true,{plain:true}),steps=[];
 // the order rule, when the calculation mixes levels: "Order: brackets → × ÷ → + −, each from left to right."
 const levels=new Set();(function scan(n,inFn){if(!n)return;
  if(n.k==='group'){if(!inFn&&n.c.k!=='num')levels.add(0);scan(n.c,false)}
  else if(n.k==='fn'){levels.add(1);scan(n.c,true)}else if(n.k==='pow'||n.k==='fact'){levels.add(1);scan(n.b||n.c);scan(n.e)}
  else if(n.k==='neg')scan(n.c);else if(n.k==='bin'){levels.add(n.op==='*'||n.op==='/'?2:3);scan(n.l);scan(n.r)}})(tree);
 const ops=[...levels].filter(x=>x>0);
 const rule=ops.length>1||(levels.has(0)&&ops.length)?L('Σειρά: ','Order: ')+[...levels].sort().map(x=>[L('παρενθέσεις','brackets'),L('δυνάμεις και συναρτήσεις','powers and functions'),'× ÷','+ −'][x]).join(' →\uFE0E ')+L(', από αριστερά προς τα δεξιά.',', each from left to right.'):'';
 const lim=v=>ratLimit(v);
 const toNum=(n,v,hl=true)=>{for(const k of Object.keys(n))delete n[k];Object.assign(n,{k:'num',v,hl})};
 // brackets around a single number go, and so does a minus in front of one: no step of their own
 const tidy=n=>{if(!n||n.k==='num')return;
  ['c','b','e','l','r'].forEach(k=>n[k]&&tidy(n[k]));
  if(n.k==='group'&&n.c.k==='num'){const c=n.c;for(const k of Object.keys(n))delete n[k];Object.assign(n,c)}
  else if(n.k==='neg'&&n.c.k==='num'){toNum(n,ratMul(rat(-1n),n.c.v),!!n.c.hl)}};
 const clearHl=n=>{if(!n)return;if(n.k==='num')n.hl=false;['c','b','e','l','r'].forEach(k=>n[k]&&clearHl(n[k]))};
 // a single percentage, 10% = 0,1
 if(tree.k==='num'&&tree.pct)steps.push({title:L('Ποσοστό','Percent'),text:exprText(tree,true,{plain:true})+' = '+V(ratMul(tree.v,rat(100n)))+' ÷ 100 = '+V(tree.v)});
 try{
  for(let guard=0;tree.k!=='num'&&guard<400;guard++){
   tidy(tree);if(tree.k==='num')break;
   // the steps that can be done now (everything under them is a number), with how deep in brackets they are
   const ready=[],pending=[];
   (function walk(n,depth,anc){if(n.k==='num')return;pending.push({n,depth,anc});
    const kids=n.k==='bin'?[n.l,n.r]:n.k==='pow'?[n.b,n.e]:[n.c],d2=n.k==='group'||n.k==='fn'?depth+1:depth;
    if(kids.every(c=>c.k==='num'))ready.push({n,depth,anc});
    kids.forEach(c=>walk(c,d2,[...anc,n]))})(tree,0,[]);
   const cls=n=>n.k==='bin'?(n.op==='*'||n.op==='/'?2:3):1;
   ready.sort((a,b)=>b.depth-a.depth||cls(a.n)-cls(b.n)||a.n.at-b.n.at);
   const {n,depth,anc}=ready[0];if(!n)return null;
   clearHl(tree);
   // why this one now: it is in brackets with work left outside, or it comes before a + − (or × ÷) on its left
   const outside=depth>0&&(anc.some(a=>a.k==='bin'||a.k==='pow'||a.k==='fact')||pending.some(p=>p.depth<depth&&!anc.includes(p.n)));
   const jumped=!outside&&pending.some(p=>p.depth===depth&&p.n!==n&&p.n.k==='bin'&&cls(p.n)>cls(n)&&p.n.at<n.at);
   const name=k=>{const tt=OP_TITLE[k];return tt?tt:null};
   const titled=(gr,en,grArticle)=>outside?L('Πρώτα η παρένθεση: '+gr.toLowerCase(),'Brackets first: '+en.toLowerCase()):jumped?L('Πρώτα '+(grArticle||gr.toLowerCase()),en+' first'):L(gr,en);
   const T=k=>{const tt=name(k);return titled(tt[0][0],tt[1],tt[0][1])};
   let v,title,text;
   if(n.k==='bin'){
    const l=n.l.v,r=n.r.v,add=n.op==='+'||n.op==='-';
    if(add&&n.r.pct){// 8,5 + 15%: first 15% of 8,5, then the + as usual
     const part=lim(ratMul(l,r)),p100=V(ratMul(r,rat(100n)));
     steps.push({title:L('Το '+p100+'% του '+V(l),p100+'% of '+V(l)),text:V(l)+' × '+p100+' ÷ 100 = '+V(part)});
     toNum(n.r,part);steps[steps.length-1].line=exprText(tree);continue;
    }
    v=lim(n.op==='+'?ratAdd(l,r):n.op==='-'?ratSub(l,r):n.op==='*'?ratMul(l,r):ratDiv(l,r));
    title=T(n.op);
    const notes=[n.l,n.r].filter(x=>x.pct).map(x=>exprText(x,true,{plain:true})+' = '+V(x.v));// 50 × 10%: 10% = 0,1
    if(notes.length)title+=' ('+notes.join(', ')+')';
    text=exprText(n,true,{plain:true})+' = '+V(v);
   }else if(n.k==='fn'){
    const a=(n.c.k==='group'?n.c.c:n.c).v;v=lim(sciFunction(n.name,a));
    const ft=FN_TITLE[n.name];title=L(ft[0],ft[1])+(isTrig(n.name)||isArc(n.name)?(deg?L(' (μοίρες)',' (degrees)'):L(' (ακτίνια)',' (radians)')):'');
    if(outside)title=L('Πρώτα η παρένθεση: ','Brackets first: ')+title.charAt(0).toLowerCase()+title.slice(1);
    text=exprText(n,true,{plain:true,deg})+' = '+V(v)+(isArc(n.name)&&deg?'°':'');
    // a whole answer can be checked by hand: √9 = 3 because 3 × 3 = 9
    const whole=v.d===1n&&(v.n<0n?-v.n:v.n)<=1000000n;
    if(whole&&(n.name==='√'||n.name==='∛')&&a.d===1n)title+=': '+Array(n.name==='√'?2:3).fill(V(v)).join(' × ')+' = '+V(a);
    if(whole&&n.name==='log'&&a.d===1n&&v.n>0n)title+=': 10'+supText(String(v.n))+' = '+V(a);
   }else if(n.k==='pow'){
    const b=n.b.v,e=n.e.v;v=lim(ratPow(b,e));title=T('pow');
    const bs=exprText(n.b,false,{plain:true}),lhs=exprText(n,true,{plain:true});
    if(e.d===1n&&e.n>=2n&&e.n<=5n&&bs.length<=10)text=lhs+' = '+Array(Number(e.n)).fill(bs).join(' × ')+' = '+V(v);// 2³ = 2 × 2 × 2
    else if(e.d===1n&&e.n<0n&&e.n>=-5n&&bs.length<=10)text=lhs+' = 1 ÷ '+(n.b.v.n<0n?'('+V(b)+')':V(b))+supText(String(-e.n))+' = '+V(v);// 2⁻³ = 1 ÷ 2³
    else text=lhs+' = '+V(v);
   }else if(n.k==='fact'){
    const a=n.c.v;v=lim(ratFactorial(a));title=T('fact');
    text=exprText(n,true,{plain:true})+(a.d===1n&&a.n>=2n&&a.n<=7n?' = '+Array.from({length:Number(a.n)},(_,i)=>String(Number(a.n)-i)).join(' × '):'')+' = '+V(v);
   }else return null;
   toNum(n,v);lastV=v;tidy(tree);
   steps.push({title,text,line:tree.k==='num'?'':exprText(tree)});
  }
 }catch{return null}
 if(tree.k!=='num'||formatRat(tree.v)!==formatRat(result))return null;// never show working that doesn't match
 // a minus in front of everything (−2² = −4) is the last thing done
 if(lastV&&!ratEq(lastV,tree.v)&&ratEq(ratMul(lastV,rat(-1n)),tree.v))steps.push({title:L('Το μείον μπροστά','The minus in front'),text:'−('+V(lastV)+') = '+V(tree.v)});
 if(steps.length)delete steps[steps.length-1].line;// the last one is the result
 return{formula,rule,steps,result:formatRat(result),spaced:true};
}

// Units and Currency: the factor (or the formula, for temperatures) and the working, from the value typed in.
function unitsHow(){
 if(mode!=='units')return null;
 const el=lang==='el',L=(g,e)=>el?g:e,cc=$('#unitCategory')?.value,src=unitSource||unitActiveInput||'from';
 const su=src==='from'?$('#unitFrom')?.value:$('#unitTo')?.value,du=src==='from'?$('#unitTo')?.value:$('#unitFrom')?.value;
 const expr=String(unitExpressions[src]??'').trim();if(!cc||!su||!du||!expr)return null;
 const kept=unitError,value=unitEvaluate(expr);unitError=kept;if(value===null)return null;// only reading: the error on screen stays
 const cur=cc==='currency',V=v=>cur?formatMoneyValue(v):formatRat(v).replace(/^-/,'−'),R=formatRateValue,u=x=>' '+x;
 const out=unitConvertValue(cc,value,su,du),steps=[];
 const typed=formatUnitDisplayValue(expr);
 if(/[+\-×÷*/(%]/.test(expr.replace(/^[-−]/,'')))steps.push({title:L('Η πράξη','The calculation'),text:typed+' = '+formatRat(value)});
 if(su===du)return null;
 if(cc==='temperature'){
  const c=su==='°C'?value:su==='°F'?ratDiv(ratSub(value,ratFromString('32')),ratFromString('1.8')):ratSub(value,ratFromString('273.15'));
  if(su==='°F')steps.push({title:L('Σε °C: αφαίρεσε 32, διαίρεσε με 1,8','To °C: take 32 away, divide by 1,8'),text:'('+V(value)+' − 32) ÷ 1,8 = '+V(c)+' °C'});
  if(su==='K')steps.push({title:L('Σε °C: αφαίρεσε 273,15','To °C: take 273,15 away'),text:V(value)+' − 273,15 = '+V(c)+' °C'});
  if(du==='°F')steps.push({title:L('Σε °F: πολλαπλασίασε με 1,8, πρόσθεσε 32','To °F: multiply by 1,8, add 32'),text:V(c)+' × 1,8 + 32 = '+V(out)+' °F'});
  if(du==='K')steps.push({title:L('Σε K: πρόσθεσε 273,15','To K: add 273,15'),text:V(c)+' + 273,15 = '+V(out)+' K'});
 }else if(cur){
  const p=rates.date.split('-'),when=p[2]+'/'+p[1]+'/'+p[0],ecb=L('ΕΚΤ, '+when,'ECB, '+when);
  if(su==='EUR'||du==='EUR'){const other=su==='EUR'?du:su,r=ratFromString(units.currency[other]);
   steps.push({title:'1 EUR = '+R(r)+' '+other+' ('+ecb+')',text:V(value)+' '+su+(su==='EUR'?' × ':' ÷ ')+R(r)+' = '+V(out)+' '+du})}
  else{const rs=ratFromString(units.currency[su]),rd=ratFromString(units.currency[du]),eur=ratDiv(value,rs);
   steps.push({title:L('Οι ισοτιμίες είναι ανά ευρώ ('+ecb+'), οπότε μέσω EUR','The rates are per euro ('+ecb+'), so through EUR'),text:V(value)+' '+su+' ÷ '+R(rs)+' = '+V(eur)+' EUR'});
   steps.push({title:'1 EUR = '+R(rd)+' '+du,text:V(eur)+' EUR × '+R(rd)+' = '+V(out)+' '+du})}
 }else{
  const f=ratDiv(unitFactor(units[cc][su]),unitFactor(units[cc][du]));
  steps.push({title:'1'+u(su)+' = '+formatRat(f)+u(du),text:V(value)+' × '+formatRat(f)+' = '+V(out)+u(du)});
 }
 return{formula:typed+u(su)+' →\uFE0E '+du,steps,result:V(out)+u(du),spaced:true};
}

// Subnet's bits, lined up: the network part (the first p bits) and the host part in two colours.
function bitsHtml(rows){
 return '<div class="how-bits">'+rows.map(r=>{let k=0,net='',host='';for(const ch of r.bits){if(ch==='.'){(k<r.p?(net+=ch):(host+=ch));continue}(k<r.p?(net+=ch):(host+=ch));k++}
  return '<div class="how-bits-row"><div class="how-bits-head"><span>'+esc(r.label)+'</span><b>'+esc(r.dec)+'</b></div><code><span class="nb">'+net+'</span><span class="hb">'+host+'</span></code></div>'}).join('')+'</div>';
}
// The working as HTML (the ? dialog and the side panel). Older saved explanations had plain strings as steps.
function howHtml(d){
 const el=lang==='el',mark=s=>esc(s).replace(/\u0001/g,'<span class="how-hl">').replace(/\u0002/g,'</span>');
 return '<div class="how-step"><div class="how-label">'+(el?'Πράξη':'Calculation')+'</div><div class="how-formula">'+esc(d.formula)+'</div>'+
  (d.rule?'<div class="how-rule">'+esc(d.rule)+'</div>':'')+
  (d.legend?'<div class="how-legend"><span><i class="nb"></i>'+esc(d.legend[0])+'</span><span><i class="hb"></i>'+esc(d.legend[1])+'</span></div>':'')+
  '<div class="how-steps">'+d.steps.map((s,i)=>{const text=typeof s==='string'?s:s.text;
   return '<div class="how-line"><span>'+(i+1)+'</span><div class="how-line-body"><strong>'+esc(s.title||'')+'</strong>'+(text?'<div>'+esc(text)+'</div>':'')+
    (s.line?'<div class="how-now">'+mark(s.line)+'</div>':'')+'</div>'+(s.bits?bitsHtml(s.bits):'')+'</div>'}).join('')+'</div>'+
  '<div class="how-result"><span>'+(el?'Αποτέλεσμα':'Result')+'</span><strong'+(String(d.result).length>13?' class="long"':'')+'>'+esc(d.result)+'</strong></div></div>';
}
