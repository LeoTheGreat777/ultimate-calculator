// Two tools for number work: Numbers (GCD and LCM of two or three whole numbers; a number's prime factors and divisors)
// and Equations (ax² + bx + c = 0, real or complex roots, exact where they are; a 2×2 linear system by Cramer's rule).
// Whole numbers are BigInts: factors by trial division up to 100.000, then Miller–Rabin and Pollard's rho, so any 15-digit
// number is instant. Fractions (rat) and complex values (complex.js) for the equations.
// ---------- whole numbers ----------
const bigAbs=n=>n<0n?-n:n;
function gcdBig(a,b){a=bigAbs(a);b=bigAbs(b);while(b){[a,b]=[b,a%b]}return a}
function modPow(b,e,m){let r=1n;b%=m;while(e>0n){if(e&1n)r=r*b%m;b=b*b%m;e>>=1n}return r}
const SMALL_PRIMES=[2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n];
// Miller–Rabin with these bases is exact far beyond 15 digits (up to 3,3 × 10²⁴)
function isPrimeBig(n){
 if(n<2n)return false;for(const p of SMALL_PRIMES)if(n%p===0n)return n===p;
 let d=n-1n,s=0;while(d%2n===0n){d/=2n;s++}
 for(const a of SMALL_PRIMES){let x=modPow(a,d,n);if(x===1n||x===n-1n)continue;let comp=true;for(let r=1;r<s;r++){x=x*x%n;if(x===n-1n){comp=false;break}}if(comp)return false}
 return true;
}
function pollardRho(n){if(n%2n===0n)return 2n;for(let c=1n;;c++){let x=2n,y=2n,d=1n;const f=v=>(v*v+c)%n;while(d===1n){x=f(x);y=f(f(y));d=gcdBig(x-y,n)}if(d!==n)return d}}
// [[prime, power], …] smallest first
function factorize(n){
 const m=new Map(),add=p=>m.set(p,(m.get(p)||0)+1);
 for(const p of [2n,3n,5n])while(n%p===0n){add(p);n/=p}
 const step=[4n,2n,4n,2n,4n,6n,2n,6n];let p=7n,i=0;
 while(p*p<=n&&p<100000n){while(n%p===0n){add(p);n/=p}p+=step[i++%8]}
 const rest=k=>{if(k===1n)return;if(isPrimeBig(k)){add(k);return}const d=pollardRho(k);rest(d);rest(k/d)};
 rest(n);
 return [...m.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
}
const bigFmt=n=>formatGroupedNumber(n.toString());
const factorText=f=>f.length?f.map(([p,e])=>bigFmt(p)+(e>1?supText(String(e)):'')).join(' × '):'1';// 2⁴ × 3² × 5
function divisorsOf(f,max=5000){let ds=[1n];for(const [p,e] of f){const next=[];for(const d of ds){let q=1n;for(let k=0;k<=e;k++){next.push(d*q);q*=p}}ds=next;if(ds.length>max)return null}return ds.sort((a,b)=>a<b?-1:a>b?1:0)}
// a field as a whole number ≥ 1 (null if empty or not)
function bigField(id){const v=fieldValue(id).trim();return /^\d+$/.test(v)&&BigInt(v)>0n?BigInt(v):null}
function numbersCalculate(){
 const el=lang==='el',L=(g,e)=>el?g:e;
 if(toolKind.numbers==='gcd'){
  const ns=['numA','numB','numC'].map(bigField),filled=ns.filter(x=>x!==null);
  if(ns[0]===null||ns[1]===null){setToolResult('','',null);return}
  const fs=filled.map(factorize);
  const g=filled.reduce((a,b)=>gcdBig(a,b)),l=filled.reduce((a,b)=>a/gcdBig(a,b)*b);
  if(l>10n**30n){setToolResult(t('errBig'),'',null);return}
  // the school way: each number in primes; GCD the common ones at their lowest power, LCM all of them at their highest
  const primes=[...new Set(fs.flatMap(f=>f.map(x=>x[0])))].sort((a,b)=>a<b?-1:1),pow=(f,p)=>f.find(x=>x[0]===p)?.[1]||0;
  const gf=primes.map(p=>[p,Math.min(...fs.map(f=>pow(f,p)))]).filter(x=>x[1]>0),lf=primes.map(p=>[p,Math.max(...fs.map(f=>pow(f,p)))]);
  const list=filled.map(bigFmt).join(', ');
  const how={formula:L('ΜΚΔ και ΕΚΠ των ','GCD and LCM of ')+list,steps:[
   ...filled.map((n,k)=>({title:L('Πρώτοι παράγοντες του ','Prime factors of ')+bigFmt(n),text:bigFmt(n)+' = '+factorText(fs[k])})),
   {title:L('ΜΚΔ: οι κοινοί πρώτοι, με τη μικρότερη δύναμη','GCD: the primes they share, at the lowest power'),text:(gf.length?factorText(gf)+' = ':'')+bigFmt(g)+(g===1n?L(' (πρώτοι μεταξύ τους)',' (they share no prime)'):'')},
   {title:L('ΕΚΠ: όλοι οι πρώτοι, με τη μεγαλύτερη δύναμη','LCM: every prime, at the highest power'),text:factorText(lf)+' = '+bigFmt(l)}],
   result:L('ΜΚΔ ','GCD ')+bigFmt(g)+' · '+L('ΕΚΠ ','LCM ')+bigFmt(l)};
  setToolResult(how.result,filled.map((n,k)=>bigFmt(n)+' = '+factorText(fs[k])).join(' · '),how);return;
 }
 const n=bigField('numN');if(n===null){setToolResult('','',null);return}
 if(n===1n){setToolResult('1',L('Το 1 δεν έχει πρώτους παράγοντες','1 has no prime factors'),null);return}
 const f=factorize(n),prime=f.length===1&&f[0][1]===1,count=f.reduce((c,[,e])=>c*(e+1),1);
 const sum=f.reduce((s,[p,e])=>s*((p**BigInt(e+1)-1n)/(p-1n)),1n),ds=divisorsOf(f);
 const steps=[];let left=n;
 for(const [p,e] of f){if(p===left&&e===1){steps.push({title:bigFmt(p)+L(' είναι πρώτος',' is prime'),text:bigFmt(p)});break}
  const q=p**BigInt(e),next=left/q;
  steps.push({title:L('Διαίρεση με ','Divide by ')+bigFmt(p)+(e>1?L(' ('+e+' φορές)',' ('+e+' times)'):''),text:bigFmt(left)+' ÷ '+bigFmt(p)+(e>1?supText(String(e)):'')+' = '+bigFmt(next)});left=next}
 steps.push({title:L('Διαιρέτες: (κάθε δύναμη + 1), πολλαπλασιασμένα','Divisors: (each power + 1), multiplied'),text:f.map(([,e])=>'('+e+' + 1)').join(' × ')+' = '+fmt(rat(BigInt(count)))});
 if(ds)steps.push({title:L('Οι διαιρέτες','The divisors'),text:ds.slice(0,200).map(bigFmt).join(', ')+(ds.length>200?', …':'')});
 steps.push({title:L('Άθροισμα των διαιρετών','Sum of the divisors'),text:bigFmt(sum)});
 const how={formula:L('Πρώτοι παράγοντες του ','Prime factors of ')+bigFmt(n),steps,result:prime?bigFmt(n):bigFmt(n)+' = '+factorText(f)};
 setToolResult(prime?bigFmt(n):factorText(f),prime?L('Πρώτος αριθμός','A prime number'):L('Διαιρέτες: ','Divisors: ')+fmt(rat(BigInt(count)))+' · '+L('άθροισμα ','sum ')+bigFmt(sum),how);
}
window._runNumbers=numbersCalculate;
// ---------- equations ----------
// √ of a fraction as k√m ÷ q with m square-free (√8 = 2√2), for x = P ± Q√m; null when it isn't a whole-number root
function surd(r){
 if(r.n<0n)return null;const N=r.n*r.d;if(N>10n**24n)return null;// √(p/q) = √(pq) ÷ q
 let k=1n,m=N;for(const [p,e] of factorize(N===0n?1n:N)){const h=BigInt(Math.floor(e/2));k*=p**h;m/=p**(2n*h)}
 return {k,m,q:r.d};
}
function equationCalculate(){
 const el=lang==='el',L=(g,e)=>el?g:e,V=v=>fmt(v),P=v=>!isCx(v)&&v.n<0n?'('+V(v)+')':V(v);
 if(toolKind.equation==='sys2'){
  const [a1,b1,c1,a2,b2,c2]=['sxA1','sxB1','sxC1','sxA2','sxB2','sxC2'].map(ratField);
  if([a1,b1,c1,a2,b2,c2].some(x=>x===null)){setToolResult('','',null);return}
  const D=ratSub(ratMul(a1,b2),ratMul(a2,b1)),Dx=ratSub(ratMul(c1,b2),ratMul(c2,b1)),Dy=ratSub(ratMul(a1,c2),ratMul(a2,c1));
  const eq=(a,b,c)=>V(a)+'x '+(b.n<0n?'− '+V(rat(-b.n,b.d)):'+ '+V(b))+'y = '+V(c);
  const steps=[
   {title:L('Ορίζουσα D = a₁b₂ − a₂b₁','Determinant D = a₁b₂ − a₂b₁'),text:P(a1)+' × '+P(b2)+' − '+P(a2)+' × '+P(b1)+' = '+V(D)},
   {title:'Dx = c₁b₂ − c₂b₁',text:P(c1)+' × '+P(b2)+' − '+P(c2)+' × '+P(b1)+' = '+V(Dx)},
   {title:'Dy = a₁c₂ − a₂c₁',text:P(a1)+' × '+P(c2)+' − '+P(a2)+' × '+P(c1)+' = '+V(Dy)}];
  const formula=eq(a1,b1,c1)+'  ·  '+eq(a2,b2,c2);
  if(D.n===0n){const inf=Dx.n===0n&&Dy.n===0n,msg=inf?L('Άπειρες λύσεις','Infinitely many solutions'):L('Καμία λύση','No solution');
   steps.push({title:L('D = 0: οι ευθείες είναι παράλληλες','D = 0: the lines are parallel'),text:inf?L('και ίδιες (Dx = Dy = 0)','and the same (Dx = Dy = 0)'):L('και δεν τέμνονται','and never meet')});
   setToolResult(msg,'D = 0',{formula,steps,result:msg});return}
  const x=ratDiv(Dx,D),y=ratDiv(Dy,D);
  steps.push({title:'x = Dx ÷ D',text:V(Dx)+' ÷ '+P(D)+' = '+V(x)},{title:'y = Dy ÷ D',text:V(Dy)+' ÷ '+P(D)+' = '+V(y)});
  const res='x = '+V(x)+', y = '+V(y);
  setToolResult(res,'D = '+V(D),{formula,steps,result:res});return;
 }
 const a=ratField('eqA'),b0=ratField('eqB'),c0=ratField('eqC');
 if(a===null||b0===null&&c0===null){setToolResult('','',null);return}
 const b=b0||rat(0n),c=c0||rat(0n),term=(v,s)=>v.n===0n?'':(v.n<0n?' − ':' + ')+(v.n===v.d||-v.n===v.d?'':V(rat(v.n<0n?-v.n:v.n,v.d)))+s;
 let formula=(a.n===a.d?'':a.n===-a.d?'−':V(a))+'x²'+term(b,'x')+(c.n===0n?'':(c.n<0n?' − ':' + ')+V(rat(c.n<0n?-c.n:c.n,c.d)))+' = 0';
 if(a.n===0n){// bx + c = 0
  formula=V(b)+'x'+(c.n===0n?'':(c.n<0n?' − ':' + ')+V(rat(c.n<0n?-c.n:c.n,c.d)))+' = 0';
  if(b.n===0n){const msg=c.n===0n?L('Κάθε x είναι λύση','Every x is a solution'):L('Καμία λύση','No solution');setToolResult(msg,'',{formula,steps:[{title:L('a = 0 και b = 0','a = 0 and b = 0'),text:c.n===0n?'0 = 0':V(c)+' = 0'}],result:msg});return}
  const x=ratDiv(ratMul(rat(-1n),c),b);
  setToolResult('x = '+V(x),L('Πρώτου βαθμού (a = 0)','Linear (a = 0)'),{formula,steps:[{title:L('a = 0: εξίσωση πρώτου βαθμού','a = 0: a linear equation'),text:'x = −c ÷ b = '+V(ratMul(rat(-1n),c))+' ÷ '+P(b)+' = '+V(x)}],result:'x = '+V(x)});return;
 }
 const D=ratSub(ratMul(b,b),ratMul(rat(4n),ratMul(a,c))),two_a=ratMul(rat(2n),a),mid=ratDiv(ratMul(rat(-1n),b),two_a);
 const steps=[{title:L('Διακρίνουσα Δ = b² − 4ac','Discriminant Δ = b² − 4ac'),text:P(b)+'² − 4 × '+P(a)+' × '+P(c)+' = '+V(D)}];
 let roots,kind;
 if(D.n===0n){roots=[mid];kind=L('μία διπλή ρίζα','one double root');steps.push({title:L('x = −b ÷ 2a','x = −b ÷ 2a'),text:V(ratMul(rat(-1n),b))+' ÷ '+P(two_a)+' = '+V(mid)})}
 else{
  const neg=D.n<0n,absD=neg?rat(-D.n,D.d):D,sq=sciFunction('√',absD),s=surd(absD);
  const exact=s&&s.m===1n;// a whole root: the roots are exact fractions
  const half=exact?ratDiv(rat(s.k,s.q),two_a):ratDiv(sq,two_a),h=two_a.n<0n?ratMul(rat(-1n),half):half;
  roots=neg?[cx(mid,h),cx(mid,ratMul(rat(-1n),h))]:[ratAdd(mid,h),ratSub(mid,h)];
  kind=neg?L('δύο μιγαδικές ρίζες','two complex roots'):L('δύο πραγματικές ρίζες','two real roots');
  steps.push({title:'x = (−b ± √Δ) ÷ 2a',text:'('+V(ratMul(rat(-1n),b))+' ± √'+P(D)+') ÷ '+P(two_a)+(neg?' = ('+V(ratMul(rat(-1n),b))+' ± '+(exact?V(rat(s.k,s.q)):'√'+V(absD))+'i) ÷ '+P(two_a):'')});
  // the exact form, when √Δ simplifies: √8 = 2√2, so x = −1 ± √2
  if(s&&s.m!==1n){const Q=ratDiv(rat(s.k,s.q),two_a),Qa=Q.n<0n?rat(-Q.n,Q.d):Q,coef=Qa.n===Qa.d?'':V(Qa);
   steps.push({title:L('Ακριβώς','Exactly'),text:'x = '+(mid.n===0n?'':V(mid)+' ')+'± '+coef+(neg?'i':'')+'√'+bigFmt(s.m)})}
  steps.push({title:'x₁',text:V(roots[0])},{title:'x₂',text:V(roots[1])});
 }
 const res=roots.length===1?'x = '+V(roots[0]):'x₁ = '+V(roots[0])+', x₂ = '+V(roots[1]);
 setToolResult(res,'Δ = '+V(D)+' · '+kind,{formula,steps,result:res});
}
window._runEquation=equationCalculate;
