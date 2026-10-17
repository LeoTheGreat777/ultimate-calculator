// "How was this calculated?" (the ? button, and the working panel beside the app on big screens).
// The Calculator's working: the calculation is read into a tree the same way evalExpr reads it, then worked out one
// step at a time in the order taught at school – brackets first, then powers and functions, then × ÷, then + −, each
// from left to right – and after every step the calculation is shown again, shorter, with the new number marked.
// Every step is computed with the same exact maths as evalExpr; if the last step doesn't give the result on screen,
// the working is not shown (null), never a wrong one.
const SUP_MAP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','−':'⁻'};
const supText=s=>String(s).split('').map(c=>SUP_MAP[c]??c).join('');// 2^6 -> 2⁶, ^−300 -> ⁻³⁰⁰
const HL_ON='\u0001',HL_OFF='\u0002';// around the number a step has just worked out (howHtml marks it)
const FN_LABEL=new Proxy({},{get:(o,n)=>typeof n==='string'&&/^a(?:sin|cos|tan|cot|sec|csc)h?$/.test(n)?n.slice(1)+'⁻¹':undefined});// asinh -> sinh⁻¹
const FN_TITLE={sin:['Ημίτονο','Sine'],cos:['Συνημίτονο','Cosine'],tan:['Εφαπτομένη','Tangent'],asin:['Τόξο ημιτόνου','Inverse sine'],
 acos:['Τόξο συνημιτόνου','Inverse cosine'],atan:['Τόξο εφαπτομένης','Inverse tangent'],ln:['Φυσικός λογάριθμος','Natural logarithm'],
 log:['Λογάριθμος (βάση 10)','Logarithm (base 10)'],'√':['Τετραγωνική ρίζα','Square root'],'∛':['Κυβική ρίζα','Cube root'],
 cot:['Συνεφαπτομένη','Cotangent'],sec:['Τέμνουσα','Secant'],csc:['Συντέμνουσα','Cosecant'],acot:['Τόξο συνεφαπτομένης','Inverse cotangent'],
 asec:['Τόξο τέμνουσας','Inverse secant'],acsc:['Τόξο συντέμνουσας','Inverse cosecant'],abs:['Απόλυτη τιμή','Absolute value'],
 sinh:['Υπερβολικό ημίτονο','Hyperbolic sine'],cosh:['Υπερβολικό συνημίτονο','Hyperbolic cosine'],tanh:['Υπερβολική εφαπτομένη','Hyperbolic tangent'],
 coth:['Υπερβολική συνεφαπτομένη','Hyperbolic cotangent'],sech:['Υπερβολική τέμνουσα','Hyperbolic secant'],csch:['Υπερβολική συντέμνουσα','Hyperbolic cosecant']};
// the inverse hyperbolic ones: "Αντίστροφο υπερβολικό ημίτονο", "Inverse hyperbolic sine"
['sinh','cosh','tanh','coth','sech','csch'].forEach(n=>{const [g,e]=FN_TITLE[n];FN_TITLE['a'+n]=['Αντίστροφ'+(g.startsWith('Υπερβολικό ')?'ο ':'η ')+g.charAt(0).toLowerCase()+g.slice(1),'Inverse '+e.charAt(0).toLowerCase()+e.slice(1)]});
// [title, Greek with its article for "Πρώτα …"]
const OP_TITLE={'*':[['Πολλαπλασιασμός','ο πολλαπλασιασμός'],'Multiply'],'/':[['Διαίρεση','η διαίρεση'],'Divide'],'+':[['Πρόσθεση','η πρόσθεση'],'Add'],
 '-':[['Αφαίρεση','η αφαίρεση'],'Subtract'],pow:[['Δύναμη','η δύναμη'],'Power'],fact:[['Παραγοντικό','το παραγοντικό'],'Factorial'],
 C:[['Συνδυασμοί','οι συνδυασμοί'],'Combinations'],P:[['Διατάξεις','οι διατάξεις'],'Permutations'],m:[['Υπόλοιπο διαίρεσης','το υπόλοιπο'],'Remainder (mod)']};
const OP_SIGN={'+':'+','-':'−','*':'×','/':'÷',C:'C',P:'P',m:'mod'};
// a number as shown, with … when it is rounded (1 ÷ 3 = 0,333333…), so 0,333333 × 3 = 1 doesn't look wrong
// (worked-out numbers keep the plain -, as results do on the display)
function ratShown(v){
 if(isCx(v)){const neg=v.im.n<0n,abs=neg?rat(-v.im.n,v.im.d):v.im,ims=(abs.n===abs.d?'':ratShown(abs))+'i';// 0,707107… + 0,707107…i
  return v.re.n===0n?(neg?'-':'')+ims:ratShown(v.re)+(neg?' − ':' + ')+ims}
 const s=formatRat(v);if(/×/.test(s))return s;
 let exact=false;try{exact=ratEq(ratFromString(s.replace(/\./g,'').replace(',','.')),v)}catch{}
 return s+(exact?'':'…')}
const ratEq=(a,b)=>vEq(a,b);
// order classes: 1 powers, functions, nCr nPr; 2 × ÷ mod; 3 + −
const binClass=op=>op==='*'||op==='/'||op==='m'?2:op==='C'||op==='P'?1:3;
const TRIG=['sin','cos','tan','cot','sec','csc'],isTrig=n=>TRIG.includes(n),isArc=n=>n[0]==='a'&&TRIG.includes(n.slice(1));

// The calculation as a tree, read exactly like evalExpr (numbers.js) reads it. `at` is where the node's own sign is
// in the calculation, for "left to right".
function exprTree(input){
 const tokens=tokenize(input);let pos=0;const peek=()=>tokens[pos];
 function primary(){const at=pos,tok=tokens[pos++];if(!tok)throw Error('INCOMPLETE');
  if(tok.type==='('){const c=additive();if(peek()?.type!==')')throw Error('PAREN');pos++;return{k:'group',c,at}}
  if(tok.type==='number'){if(tok.raw==='⟪⟫')return{k:'num',v:tok.value,shown:fmtCx(tok.value,'rect'),lit:true,at};// a complex result carried on
   const carried=carry&&tok.raw===carry.text;return{k:'num',v:tok.value,pct:tok.percent,raw:tok.raw,orig:true,carried,at}}
  if(tok.type==='fn'){const c=peek()?.type==='('?primary():postfix();return{k:'fn',name:tok.name,c,at}}
  throw Error('SYNTAX')}
 function postfix(){let v=primary();while(peek()?.type==='!'){v={k:'fact',c:v,at:pos++}}return v}
 function power(){const b=postfix();if(peek()?.type==='^'){const at=pos++;return{k:'pow',b,e:unary(),at}}if(peek()?.type==='∠'){const at=pos++;return{k:'polar',b,e:unary(),at}}return b}
 function unary(){const tok=peek();if(tok&&(tok.type==='+'||tok.type==='-')){const at=pos++;const v=unary();if(tok.type==='+')return v;
  if(v.k==='num')return{...v,v:vNeg(v.v),neg:!v.neg};// −5 is one number
  return{k:'neg',c:v,at}}return power()}
 function comb(){let l=unary();while(['C','P'].includes(peek()?.type)){const at=pos,op=tokens[pos++].type;l={k:'bin',op,l,r:unary(),at}}return l}
 function mult(){let l=comb();while(['*','/','m'].includes(peek()?.type)){const at=pos,op=tokens[pos++].type;l={k:'bin',op,l,r:comb(),at}}return l}
 function additive(){let l=mult();while(['+','-'].includes(peek()?.type)){const at=pos,op=tokens[pos++].type;l={k:'bin',op,l,r:mult(),at}}return l}
 const t=additive();if(pos!==tokens.length)throw Error('SYNTAX');return t;
}
// A tree back as text, the way the display writes it: 12 + 7 × 3, (−5), 2³, sin(30). lead: nothing before it in its
// bracket (a negative number there needs no brackets). plain: no mark on the new number. deg: sin(30°).
function exprText(n,lead=true,o={}){
 if(n.k==='num'){
  const neg=!isCx(n.v)&&n.v.n<0n;let s;
  if(n.shown)s=n.shown;// a complex number as written: 3 + 2i
  else if(n.orig&&!n.carried){s=formatInputDisplay(n.raw);if(n.neg)s='−'+s}
  else s=ratShown(n.v);
  if(neg&&!lead||isCx(n.v)&&!n.orig&&n.v.re.n!==0n&&!o.whole)s='('+s+')';// 3 + 2i inside a calculation in brackets: (3 + 2i) × 2
  return n.hl&&!o.plain?HL_ON+s+HL_OFF:s;
 }
 if(n.k==='group')return '('+exprText(n.c,true,o)+')';
 if(n.k==='fn'){const lab=FN_LABEL[n.name]||n.name,inner=n.c.k==='group'?exprText(n.c.c,true,o):exprText(n.c,true,o);
  return lab+'('+inner+(o.deg&&isTrig(n.name)?'°':'')+')'}
 if(n.k==='pow'||n.k==='polar'){const e=n.e;
  let b=exprText(n.b,lead,o);if(n.b.k==='num'&&!isCx(n.b.v)&&n.b.v.n<0n&&lead)b='('+b+')';
  if(n.k==='polar')return b+'∠'+exprText(e,false,o)+(o.deg?'°':'');
  if(e.k==='num'&&!isCx(e.v)&&e.v.d===1n&&!e.pct&&!(e.orig&&/[πeφ⟨i]/.test(e.raw))){const s=supText(String(e.v.n));return b+(e.hl&&!o.plain?HL_ON+s+HL_OFF:s)}
  return b+'^'+(e.k==='num'&&isCx(e.v)?'('+exprText(e,true,{...o,whole:true})+')':exprText(e,false,o));// e^(πi)
 }
 if(n.k==='fact')return exprText(n.c,lead,o)+'!';
 if(n.k==='neg')return '−'+exprText(n.c,false,o);
 return exprText(n.l,lead,o)+' '+OP_SIGN[n.op]+' '+exprText(n.r,false,o);
}
function explanationForExpression(input,result){
 const el=lang==='el',L=(g,e)=>el?g:e,deg=angleUnit==='deg',V=ratShown;let lastV=null;
 let tree;try{tree=exprTree(input)}catch{return null}
 // 2i and 3 + 2i are numbers as written, not steps: 2 × i and 3 + 2i become one complex number each
 (function fold(n){if(!n||n.k==='num')return;['c','b','e','l','r'].forEach(k=>n[k]&&fold(n[k]));
  const real=x=>x.k==='num'&&!isCx(x.v)&&!x.pct,lit=x=>x.k==='num'&&(x.lit||x.raw==='i'),txt=x=>exprText(x,true,{plain:true,whole:true});
  let v,shown;
  if(n.k==='group'&&n.c.k==='num'&&n.c.lit){const c=n.c;for(const k of Object.keys(n))delete n[k];Object.assign(n,c);return}// (3 + 2i): its own brackets
  if(n.k==='bin'&&n.op==='*'&&real(n.l)&&n.r.k==='num'&&n.r.raw==='i'){v=vMul(n.l.v,I_UNIT);shown=txt(n.l)+'i'}
  else if(n.k==='bin'&&(n.op==='+'||n.op==='-')&&real(n.l)&&lit(n.r)&&isCx(n.r.v)&&n.r.v.re.n===0n){v=n.op==='+'?vAdd(n.l.v,n.r.v):vSub(n.l.v,n.r.v);shown=txt(n.l)+' '+OP_SIGN[n.op]+' '+txt(n.r)}
  else return;
  const at=n.at;for(const k of Object.keys(n))delete n[k];Object.assign(n,{k:'num',v,shown,lit:true,at})})(tree);
 const formula=exprText(tree,true,{plain:true,whole:tree.k==='num'}),steps=[];// whole: no brackets around a lone 3 + 2i
 // the order rule, when the calculation mixes levels: "Order: brackets → × ÷ → + −, each from left to right."
 const levels=new Set();(function scan(n,inFn){if(!n)return;
  if(n.k==='group'){if(!inFn&&n.c.k!=='num')levels.add(0);scan(n.c,false)}
  else if(n.k==='fn'){levels.add(1);scan(n.c,true)}else if(n.k==='pow'||n.k==='polar'||n.k==='fact'){levels.add(1);scan(n.b||n.c);scan(n.e)}
  else if(n.k==='neg')scan(n.c);else if(n.k==='bin'){levels.add(binClass(n.op));scan(n.l);scan(n.r)}})(tree);
 const ops=[...levels].filter(x=>x>0);
 const rule=ops.length>1||(levels.has(0)&&ops.length)?L('Σειρά: ','Order: ')+[...levels].sort().map(x=>[L('παρενθέσεις','brackets'),L('δυνάμεις και συναρτήσεις','powers and functions'),'× ÷','+ −'][x]).join(' →\uFE0E ')+L(', από αριστερά προς τα δεξιά.',', each from left to right.'):'';
 const lim=v=>vLimit(v);
 const toNum=(n,v,hl=true)=>{for(const k of Object.keys(n))delete n[k];Object.assign(n,{k:'num',v,hl})};
 // brackets around a single number go, and so does a minus in front of one: no step of their own
 const tidy=n=>{if(!n||n.k==='num')return;
  ['c','b','e','l','r'].forEach(k=>n[k]&&tidy(n[k]));
  if(n.k==='group'&&n.c.k==='num'){const c=n.c;for(const k of Object.keys(n))delete n[k];Object.assign(n,c)}
  else if(n.k==='neg'&&n.c.k==='num'){toNum(n,vNeg(n.c.v),!!n.c.hl)}};
 const clearHl=n=>{if(!n)return;if(n.k==='num')n.hl=false;['c','b','e','l','r'].forEach(k=>n[k]&&clearHl(n[k]))};
 // a single percentage, 10% = 0,1
 if(tree.k==='num'&&tree.pct)steps.push({title:L('Ποσοστό','Percent'),text:exprText(tree,true,{plain:true})+' = '+V(ratMul(tree.v,rat(100n)))+' ÷ 100 = '+V(tree.v)});
 try{
  for(let guard=0;tree.k!=='num'&&guard<400;guard++){
   tidy(tree);if(tree.k==='num')break;
   // the steps that can be done now (everything under them is a number), with how deep in brackets they are
   const ready=[],pending=[];
   (function walk(n,depth,anc){if(n.k==='num')return;pending.push({n,depth,anc});
    const kids=n.k==='bin'?[n.l,n.r]:n.k==='pow'||n.k==='polar'?[n.b,n.e]:[n.c],d2=n.k==='group'||n.k==='fn'?depth+1:depth;
    if(kids.every(c=>c.k==='num'))ready.push({n,depth,anc});
    kids.forEach(c=>walk(c,d2,[...anc,n]))})(tree,0,[]);
   const cls=n=>n.k==='bin'?binClass(n.op):1;
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
     const part=lim(vMul(l,r)),p100=V(ratMul(r,rat(100n)));
     steps.push({title:L('Το '+p100+'% του '+V(l),p100+'% of '+V(l)),text:V(l)+' × '+p100+' ÷ 100 = '+V(part)});
     toNum(n.r,part);steps[steps.length-1].line=exprText(tree);continue;
    }
    v=lim(n.op==='+'?vAdd(l,r):n.op==='-'?vSub(l,r):n.op==='*'?vMul(l,r):n.op==='C'?ratComb(l,r):n.op==='P'?ratPerm(l,r):n.op==='m'?ratMod(l,r):vDiv(l,r));
    // a real number and an imaginary one side by side (1 + 2i) are just one complex number: no step
    if(add&&(!isCx(l)&&isCx(r)&&r.re.n===0n||isCx(l)&&l.re.n===0n&&!isCx(r))){toNum(n,v,false);tidy(tree);if(steps.length&&tree.k!=='num')steps[steps.length-1].line=exprText(tree);lastV=v;continue}
    title=T(n.op);
    const notes=[n.l,n.r].filter(x=>x.pct).map(x=>exprText(x,true,{plain:true})+' = '+V(x.v));// 50 × 10%: 10% = 0,1
    if(notes.length)title+=' ('+notes.join(', ')+')';
    text=exprText(n,true,{plain:true})+' = '+V(v);
    // written out where it helps: 5 C 2 = 5! ÷ (2! × 3!), 5 P 2 = 5! ÷ 3!, 17 mod 5: 17 = 3 × 5 + 2
    const small=x=>!isCx(x)&&x.d===1n&&x.n>=0n&&x.n<=20n;
    if(n.op==='C'&&small(l)&&small(r)&&r.n<=l.n)text=exprText(n,true,{plain:true})+' = '+V(l)+'! ÷ ('+V(r)+'! × '+V(ratSub(l,r))+'!) = '+V(v);
    if(n.op==='P'&&small(l)&&small(r)&&r.n<=l.n)text=exprText(n,true,{plain:true})+' = '+V(l)+'! ÷ '+V(ratSub(l,r))+'! = '+V(v);
    // complex × and ÷: written out, i² = −1, and the conjugate
    if(n.op==='*'&&isCx(l)&&isCx(r)){title+=L(' (i² = −1)',' (i² = −1)');
     const P=x=>x.n<0n?'('+V(x)+')':V(x);
     text=exprText(n,true,{plain:true})+' = '+P(l.re)+'×'+P(r.re)+' − '+P(l.im)+'×'+P(r.im)+' + ('+P(l.re)+'×'+P(r.im)+' + '+P(l.im)+'×'+P(r.re)+')i = '+V(v)}
    if(n.op==='/'&&isCx(r)){const c={re:r.re,im:vNeg(r.im)},den=ratAdd(ratMul(r.re,r.re),ratMul(r.im,r.im));
     title=L('Διαίρεση: επί το συζυγές ','Divide: times the conjugate ')+'('+fmtCx(c,'rect')+')';
     text=exprText(n,true,{plain:true})+' = ('+V(vMul(l,c))+') ÷ '+V(den)+' = '+V(v)}
    if(n.op==='m')text+=' ('+V(l)+' = '+V(rat(ratFloor(ratDiv(l,r))))+' × '+(r.n<0n?'('+V(r)+')':V(r))+' + '+V(v)+')';
   }else if(n.k==='fn'){
    const a=(n.c.k==='group'?n.c.c:n.c).v;v=lim(sciFunctionV(n.name,a));
    const ft=FN_TITLE[n.name];title=L(ft[0],ft[1])+(isTrig(n.name)||isArc(n.name)?(deg?L(' (μοίρες)',' (degrees)'):L(' (ακτίνια)',' (radians)')):'');
    if(outside)title=L('Πρώτα η παρένθεση: ','Brackets first: ')+title.charAt(0).toLowerCase()+title.slice(1);
    text=exprText(n,true,{plain:true,deg})+' = '+V(v)+(isArc(n.name)&&deg?'°':'');
    // a whole answer can be checked by hand: √9 = 3 because 3 × 3 = 9
    const whole=!isCx(v)&&!isCx(a)&&v.d===1n&&(v.n<0n?-v.n:v.n)<=1000000n;
    if(n.name==='√'&&!isCx(a)&&a.n<0n)title+=L(': αρνητικός αριθμός, άρα φανταστικό: √(−x) = i√x',': a negative number, so imaginary: √(−x) = i√x');
    if(whole&&(n.name==='√'||n.name==='∛')&&a.d===1n)title+=': '+Array(n.name==='√'?2:3).fill(V(v)).join(' × ')+' = '+V(a);
    if(whole&&n.name==='log'&&a.d===1n&&v.n>0n)title+=': 10'+supText(String(v.n))+' = '+V(a);
   }else if(n.k==='pow'){
    const b=n.b.v,e=n.e.v;v=lim(vPow(b,e));title=T('pow');
    const bs=exprText(n.b,false,{plain:true}),lhs=exprText(n,true,{plain:true});
    if(!isCx(e)&&e.d===1n&&e.n>=2n&&e.n<=5n&&bs.length<=12)text=lhs+' = '+Array(Number(e.n)).fill(bs).join(' × ')+' = '+V(v);// 2³ = 2 × 2 × 2
    else if(!isCx(e)&&!isCx(b)&&e.d===1n&&e.n<0n&&e.n>=-5n&&bs.length<=10)text=lhs+' = 1 ÷ '+(n.b.v.n<0n?'('+V(b)+')':V(b))+supText(String(-e.n))+' = '+V(v);// 2⁻³ = 1 ÷ 2³
    else text=lhs+' = '+V(v);
   }else if(n.k==='polar'){// r∠θ = r(cos θ + i sin θ)
    v=lim(vPolar(n.b.v,n.e.v));title=L('Πολική μορφή: r(cos θ + i sin θ)','Polar form: r(cos θ + i sin θ)');
    const t=exprText(n.e,true,{plain:true})+(deg?'°':'');
    text=exprText(n,true,{plain:true,deg})+' = '+V(n.b.v)+' × (cos '+t+' + i sin '+t+') = '+V(v);
   }else if(n.k==='fact'){
    const a=n.c.v;v=lim(ratFactorial(a));title=T('fact');
    text=exprText(n,true,{plain:true})+(!isCx(a)&&a.d===1n&&a.n>=2n&&a.n<=7n?' = '+Array.from({length:Number(a.n)},(_,i)=>String(Number(a.n)-i)).join(' × '):'')+' = '+V(v);
   }else return null;
   toNum(n,v);lastV=v;tidy(tree);
   steps.push({title,text,line:tree.k==='num'?'':exprText(tree)});
  }
 }catch{return null}
 if(tree.k!=='num'||fmt(tree.v)!==fmt(result))return null;// never show working that doesn't match
 // a minus in front of everything (−2² = −4) is the last thing done
 if(lastV&&!ratEq(lastV,tree.v)&&ratEq(vNeg(lastV),tree.v))steps.push({title:L('Το μείον μπροστά','The minus in front'),text:'−('+V(lastV)+') = '+V(tree.v)});
 if(steps.length)delete steps[steps.length-1].line;// the last one is the result
 // a complex result: its size and angle too (the polar form shown under the result)
 if(isCx(result)){const a=result.re,b=result.im,sq=x=>(x.n<0n?'('+V(x)+')':V(x))+'²',u=deg?'°':'';
  steps.push({title:L('Πολική μορφή: μέτρο ∠ γωνία','Polar form: size ∠ angle'),text:'r = √('+sq(a)+' + '+sq(b)+') = '+V(vAbs(result))+' · θ = atan2('+V(b)+'; '+V(a)+') = '+V(vArg(result))+u+(deg?'':' rad')});}
 return{formula,rule,steps,result:fmt(result),spaced:true};
}

// Units and Currency: the factor (or the formula, for temperatures) and the working, from the value typed in.
function unitsHow(){
 if(mode!=='units')return null;
 const el=lang==='el',L=(g,e)=>el?g:e,cc=$('#unitCategory')?.value,src=unitSource||unitActiveInput||'from';
 const su=src==='from'?$('#unitFrom')?.value:$('#unitTo')?.value,du=src==='from'?$('#unitTo')?.value:$('#unitFrom')?.value;
 const expr=String(unitExpressions[src]??'').trim();if(!cc||!su||!du||!expr||expr==='0')return null;
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
