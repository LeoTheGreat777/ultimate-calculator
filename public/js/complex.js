// Complex numbers: i, polar entry r∠θ, and every operation and function on them. A value is a fraction (rat, numbers.js)
// when it is real, or {re, im} (two fractions, im ≠ 0) when it isn't: real calculations never notice any of this.
// + − × ÷ and whole powers stay exact; the rest (functions of a complex number, non-whole powers) use floating point,
// rounded to 15 digits like the scientific functions, and a part smaller than 1e−13 of the size is taken as 0 (so
// e^(iπ) = −1, not −1 + 1,2 × 10⁻¹⁶i). √ and ln of a negative number give their complex value (√−4 = 2i, ln(−1) = iπ).
// Shown as 3 + 2i, or as r ∠ θ (cxForm, the a+bi / r∠θ chip beside f(x) after a complex result; saved as uc-cxform).
const isCx=v=>!!v&&typeof v==='object'&&v.im!==undefined;
const cx=(re,im)=>im.n===0n?re:{re,im};// back to a plain fraction when the imaginary part is 0
const reOf=v=>isCx(v)?v.re:v,imOf=v=>isCx(v)?v.im:rat(0n);
const I_UNIT={re:rat(0n),im:rat(1n)};
let cxForm=store.get('uc-cxform')==='polar'?'polar':'rect';
let carryCx=null;// a complex result carried on into the next calculation: ⟪⟫ in the calculation (formatExpressionDisplay shows it)
function vAdd(a,b){return !isCx(a)&&!isCx(b)?ratAdd(a,b):cx(ratAdd(reOf(a),reOf(b)),ratAdd(imOf(a),imOf(b)))}
function vSub(a,b){return !isCx(a)&&!isCx(b)?ratSub(a,b):cx(ratSub(reOf(a),reOf(b)),ratSub(imOf(a),imOf(b)))}
function vMul(a,b){
 if(!isCx(a)&&!isCx(b))return ratMul(a,b);
 const [p,q,r,s]=[reOf(a),imOf(a),reOf(b),imOf(b)];// (p + qi)(r + si) = (pr − qs) + (ps + qr)i
 return cx(ratSub(ratMul(p,r),ratMul(q,s)),ratAdd(ratMul(p,s),ratMul(q,r)));
}
function vDiv(a,b){
 if(!isCx(b)){if(b.n===0n)throw Error('DIV0');return isCx(a)?cx(ratDiv(a.re,b),ratDiv(a.im,b)):ratDiv(a,b)}
 const den=ratAdd(ratMul(b.re,b.re),ratMul(b.im,b.im)),c={re:b.re,im:ratMul(rat(-1n),b.im)};// × the conjugate
 const t=vMul(a,c);return cx(ratDiv(reOf(t),den),ratDiv(imOf(t),den));
}
const vNeg=v=>vMul(rat(-1n),v);
const vEq=(a,b)=>{const e=(x,y)=>x.n*y.d===y.n*x.d;return e(reOf(a),reOf(b))&&e(imOf(a),imOf(b))};
function vLimit(v){if(isCx(v)){ratLimit(v.re);ratLimit(v.im);return v}return ratLimit(v)}
// floating point and back
const toF=v=>[ratToFloat(reOf(v)),ratToFloat(imOf(v))];
function fromF([x,y]){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw Error(Number.isNaN(x)||Number.isNaN(y)?'MATH':'BIG');
 const m=Math.hypot(x,y);if(Math.abs(x)<m*1e-13)x=0;if(Math.abs(y)<m*1e-13)y=0;
 return cx(x?ratFromFloat(x):rat(0n),y?ratFromFloat(y):rat(0n));
}
const fMul=([a,b],[c,d])=>[a*c-b*d,a*d+b*c],fDiv=([a,b],[c,d])=>{const n=c*c+d*d;if(!n)throw Error('DIV0');return [(a*c+b*d)/n,(b*c-a*d)/n]};
const fExp=([x,y])=>{const e=Math.exp(x);return [e*Math.cos(y),e*Math.sin(y)]};
const fLn=([x,y])=>{if(!x&&!y)throw Error('MATH');return [Math.log(Math.hypot(x,y)),Math.atan2(y,x)]};
const fSqrt=z=>{if(!z[0]&&!z[1])return [0,0];const [l,t]=fLn(z);return fExp([l/2,t/2])};
// |z|, exact when it can be: |3 + 4i| = 5
function vAbs(v){if(!isCx(v))return v.n<0n?rat(-v.n,v.d):v;const s=ratAdd(ratMul(v.re,v.re),ratMul(v.im,v.im));try{return ratPow(s,rat(1n,2n))}catch{return ratFromFloat(Math.sqrt(ratToFloat(s)))}}
// the angle of z in the angle unit (atan2)
function vArg(v){const [x,y]=toF(v),t=Math.atan2(y,x);return ratFromFloat(angleUnit==='deg'?t*180/Math.PI:t)}
// powers: exact for a whole exponent (up to 64 by squaring), otherwise e^(b·ln a); a negative number to a non-whole
// power is complex: (−4)^0,5 = 2i
function vPow(a,b){
 if(!isCx(a)&&!isCx(b)){
  try{return ratPow(a,b)}catch(e){if(e.message!=='MATH'||a.n>=0n||b.d===1n)throw e}
 }else if(!isCx(b)&&b.d===1n&&(b.n<0n?-b.n:b.n)<=64n){
  let e=b.n<0n?-b.n:b.n,base=a,r=rat(1n);
  while(e>0n){if(e&1n)r=vLimit(vMul(r,base));e>>=1n;if(e)base=vLimit(vMul(base,base))}
  return b.n<0n?vDiv(rat(1n),r):r;
 }
 if(!isCx(a)&&a.n===0n){if(ratToFloat(reOf(b))>0)return rat(0n);throw Error('MATH')}
 return fromF(fExp(fMul(toF(b),fLn(toF(a)))));
}
// r∠θ = r(cos θ + i sin θ), θ in the angle unit; exact where cos and sin are (2∠90 = 2i)
function vPolar(r,t){if(isCx(r)||isCx(t))throw Error('MATH');return vMul(r,cx(sciFunction('cos',t),sciFunction('sin',t)))}
// a function of any value: real ones as before (sciFunction), √ and ln/log of a negative number and anything of a
// complex number in the complex plane
function sciFunctionV(name,a){
 if(!isCx(a)){
  try{return sciFunction(name,a)}catch(e){
   if(e.message!=='MATH'||a.n>=0n||!['√','ln','log'].includes(name))throw e;
   const p=rat(-a.n,a.d);
   if(name==='√')return cx(rat(0n),sciFunction('√',p));// √−4 = 2i
   const l=sciFunction('ln',p);// ln(−x) = ln x + iπ
   return name==='ln'?cx(l,ratFromFloat(Math.PI)):cx(sciFunction('log',p),ratFromFloat(Math.PI/Math.LN10));
  }
 }
 if(name==='abs')return vAbs(a);
 const deg=angleUnit==='deg',D=Math.PI/180;
 let z=toF(a);
 const trigIn=['sin','cos','tan','cot','sec','csc'].includes(name);
 if(trigIn&&deg)z=[z[0]*D,z[1]*D];
 const I=[0,1],ONE=[1,0],neg=([x,y])=>[-x,-y],add=([a,b],[c,d])=>[a+c,b+d],sub=(p,q)=>add(p,neg(q)),half=([x,y])=>[x/2,y/2];
 const sin=([x,y])=>[Math.sin(x)*Math.cosh(y),Math.cos(x)*Math.sinh(y)],cos=([x,y])=>[Math.cos(x)*Math.cosh(y),-Math.sin(x)*Math.sinh(y)];
 const sinh=([x,y])=>[Math.sinh(x)*Math.cos(y),Math.cosh(x)*Math.sin(y)],cosh=([x,y])=>[Math.cosh(x)*Math.cos(y),Math.sinh(x)*Math.sin(y)];
 const asin=z=>fMul(neg(I),fLn(add(fMul(I,z),fSqrt(sub(ONE,fMul(z,z))))));// −i ln(iz + √(1 − z²))
 const acos=z=>sub([Math.PI/2,0],asin(z));
 const atan=z=>fMul(half(I),fLn(fDiv(add(I,z),sub(I,z))));// (i/2) ln((i + z)/(i − z))
 const asinh=z=>fLn(add(z,fSqrt(add(fMul(z,z),ONE))));
 const acosh=z=>fLn(add(z,fMul(fSqrt(add(z,ONE)),fSqrt(sub(z,ONE)))));
 const atanh=z=>half(fLn(fDiv(add(ONE,z),sub(ONE,z))));
 const inv=z=>fDiv(ONE,z);
 const F={sin,cos,tan:z=>fDiv(sin(z),cos(z)),cot:z=>fDiv(cos(z),sin(z)),sec:z=>inv(cos(z)),csc:z=>inv(sin(z)),
  sinh,cosh,tanh:z=>fDiv(sinh(z),cosh(z)),coth:z=>fDiv(cosh(z),sinh(z)),sech:z=>inv(cosh(z)),csch:z=>inv(sinh(z)),
  asin,acos,atan,acot:z=>atan(inv(z)),asec:z=>acos(inv(z)),acsc:z=>asin(inv(z)),
  asinh,acosh,atanh,acoth:z=>atanh(inv(z)),asech:z=>acosh(inv(z)),acsch:z=>asinh(inv(z)),
  ln:fLn,log:z=>{const l=fLn(z);return [l[0]/Math.LN10,l[1]/Math.LN10]},'√':fSqrt,'∛':z=>{const [l,t]=fLn(z);return fExp([l/3,t/3])}};
 if(!F[name])throw Error('MATH');
 let w=F[name](z);
 if(deg&&/^a(sin|cos|tan|cot|sec|csc)$/.test(name))w=[w[0]/D,w[1]/D];
 return fromF(w);
}
// shown: 3 + 2i, 3 − 2i, 2i, −i; or r ∠ θ (with ° in degrees). Each part as the display shows numbers (formatRat).
function fmtCx(v,form=cxForm){
 if(form==='polar'){const r=vAbs(v),t=vArg(v);return formatRat(r)+' ∠ '+formatRat(t)+(angleUnit==='deg'?'°':'')}
 const re=v.re,im=v.im,neg=im.n<0n,abs=neg?rat(-im.n,im.d):im,one=abs.n===abs.d,ims=(one?'':formatRat(abs))+'i';
 if(re.n===0n)return (neg?'-':'')+ims;
 return formatRat(re)+(neg?' − ':' + ')+ims;
}
// kept (History, memory) as "re|im" with the exact digits of each part
const vToStore=v=>isCx(v)?ratToStoreDecimal(v.re)+'|'+ratToStoreDecimal(v.im):ratToStoreDecimal(v);
function vFromStore(s){s=String(s);if(s.includes('|')){const [a,b]=s.split('|');return cx(ratFromString(a),ratFromString(b))}return ratFromString(s)}
// a value as text the calculator can read back: (3+2×i), exact decimals
function vExprText(v,digits=24){
 if(!isCx(v))return ratToDecimal(v,digits);
 const re=ratToDecimal(v.re,digits),im=ratToDecimal(v.im,digits);
 return '('+(v.re.n===0n?'':re)+(v.im.n<0n?'-'+im.slice(1):(v.re.n===0n?'':'+')+im)+'×i)';
}
// a complex result carried on: ⟪⟫ in the calculation; History keeps it written out
const expandCarry=s=>String(s).replace(/⟪⟫/g,()=>carryCx?vExprText(carryCx):'0');
function setCxForm(f){cxForm=f==='polar'?'polar':'rect';store.set('uc-cxform',cxForm);howData&&refreshCalcHow();render()}
