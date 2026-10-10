// Exact numbers: fractions with BigInt (rat, ratAdd ...), parsing typed numbers, the expression
// evaluator (evalExpr, with operator precedence and calculator-style %), and number formatting (Greek: 1.234,56).
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const t=a%b;a=b;b=t}return a};
function rat(n,d=1n){if(d===0n)throw Error('DIV0');if(d<0n){n=-n;d=-d}const g=gcd(n,d);return{n:n/g,d:d/g}}
const ratAdd=(a,b)=>rat(a.n*b.d+b.n*a.d,a.d*b.d),ratSub=(a,b)=>rat(a.n*b.d-b.n*a.d,a.d*b.d),ratMul=(a,b)=>rat(a.n*b.n,a.d*b.d),ratDiv=(a,b)=>{if(b.n===0n)throw Error('DIV0');return rat(a.n*b.d,a.d*b.n)};
function normalizeNumericInput(s){
 s=String(s??'').trim().replace(/\s/g,'');
 if(s.includes(','))s=s.replace(/\./g,'').replace(',', '.');
 return s.replace(/[^0-9.\-]/g,'');
}
function ratFromString(s){s=normalizeNumericInput(s);let sign=1n;if(s[0]==='-'){sign=-1n;s=s.slice(1)}const [whole,frac='']=s.split('.');const digits=(whole||'0')+(frac||'');const scale=10n**BigInt(frac.length);return rat(sign*BigInt(digits||'0'),scale)}
function ratPercent(a){return rat(a.n,a.d*100n)}
function ratToDecimal(a,max=18){let sign=a.n<0n?'-':'';let n=a.n<0n?-a.n:a.n,d=a.d;const whole=n/d;let rem=n%d;if(rem===0n)return sign+whole.toString();let out='';for(let i=0;i<max&&rem;i++){rem*=10n;out+=String(rem/d);rem%=d}out=out.replace(/0+$/,'');return sign+whole.toString()+'.'+out}
function ratToRoundedDecimal(a,max=6){const neg=a.n<0n,n=neg?-a.n:a.n,scale=10n**BigInt(max);let q=n*scale/a.d;if(2n*((n*scale)%a.d)>=a.d)q++;if(q===0n)return '0';let digits=q.toString().padStart(max+1,'0');const whole=digits.slice(0,digits.length-max),frac=digits.slice(digits.length-max).replace(/0+$/,'');return (neg?'-':'')+whole+(frac?'.'+frac:'')}
function ratToNumber(a){const s=ratToDecimal(a,18);return Number(s)}
function formatScientific(raw){
 const neg=raw[0]==='-';const body=neg?raw.slice(1):raw;const [w,f='']=body.split('.');
 const exp=w.replace(/^0+/,'')?w.replace(/^0+/,'').length-1:-(f.search(/[1-9]/)+1);
 const digits=(w+f).replace(/^0+/,'').replace(/0+$/,'');
 const mant=digits.length>1?digits[0]+','+digits.slice(1,7).replace(/0+$/,''):digits;
 return (neg?'-':'')+mant.replace(/,$/,'')+' × 10^'+exp;
}
function formatRat(a,max=6){
 const s=ratToRoundedDecimal(a,max),num=Number(s);
 // Non-zero values too small for `max` decimals would round to "0": show them in scientific notation.
 if(a.n!==0n&&num===0)return formatScientific(ratToDecimal(a,200));
 if(Number.isFinite(num)&&Math.abs(num)<1e15)return new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:max}).format(num);
 if(s.length<=24)return formatGroupedNumber(s);
 return formatScientific(s);
}
const fmt=n=>n&&typeof n==='object'&&'n'in n?formatRat(n,6):Number.isFinite(Number(n))?new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:6}).format(Number(n)):'Error';
const pretty=s=>String(s).replace(/\*/g,'×').replace(/\//g,'÷');
function formatGroupedNumber(raw){
 const s=String(raw);
 const sign=s.startsWith('-')?'-':'';
 const body=sign?s.slice(1):s;
 const [whole,frac]=body.split('.');
 const grouped=whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
 const decimal=',';
 return sign+grouped+(frac!==undefined?decimal+frac:'');
}
// Negative numbers in a calculation being shown. Inside the calculation a minus made with ± (hold −, F9) is written "−"
// and one typed with the − key is "-"; both mean the same to evalExpr (tokenize reads − as -).
// - after an operator, any negative number shows in brackets, like the iPhone: 5×(−25); after "(" just −
// - at the start, only one made with ± does: 5, hold − -> (−5); typing − then 5 stays -5
// Finished results are shown plain (-15).
// Scientific parts: whole-number powers as superscripts, 2^10 -> 2¹⁰ and ×10^3 -> ×10³ (a power still being typed,
// "2^", or one in brackets, "2^(1÷3)", stays as it is); asin( -> sin⁻¹( and the same for cos and tan.
const SUP_DIGITS='⁰¹²³⁴⁵⁶⁷⁸⁹';
const sciPretty=s=>s.replace(/a(sin|cos|tan)\(/g,'$1⁻¹(').replace(/\^([-−]?)(\d+)(?![\d.])/g,(m,sg,d)=>(sg?'⁻':'')+[...d].map(c=>SUP_DIGITS[c]).join(''));
function formatInputDisplay(s){
 return pretty(sciPretty(String(s))).replace(/\d+(?:\.\d*)?/g,m=>formatGroupedNumber(m))
  .replace(/([×÷+\-])[-−](\d[\d.,]*%?)/g,'$1(−$2)').replace(/\([-−](?=\d)/g,'(−')
  .replace(/^−(\d[\d.,]*%?)/,'(−$1)');
}
// ---------- Expressions: + − × ÷ %, brackets, and the scientific parts (functions, π, e, ^, !) ----------
// Functions are written in the expression as a name and "(": sin( cos( tan( asin( acos( atan( ln( log( √( ∛(
const FN_NAMES=['asin','acos','atan','sin','cos','tan','ln','log','√','∛'];
function tokenize(input){
 const s=String(input).replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/\s+/g,'');const tokens=[];let i=0;// − is a minus made with ± (see formatInputDisplay)
 while(i<s.length){const ch=s[i];
  if(/[0-9.]/.test(ch)){const start=i;let dots=0;while(i<s.length&&/[0-9.]/.test(s[i])){if(s[i]==='.')dots++;i++}if(dots>1)throw Error('NUMBER');let raw=s.slice(start,i);if(s[i]==='%'){i++;tokens.push({type:'number',value:ratPercent(ratFromString(raw)),percent:true,raw:raw+'%'});}else{const exact=carry&&raw===carry.text;tokens.push({type:'number',value:exact?carry.value:ratFromString(raw),percent:false,raw})}continue}
  if('+-*/()^!'.includes(ch)){tokens.push({type:ch});i++;continue}
  if(ch==='π'||ch==='e'){tokens.push({type:'number',value:ch==='π'?RAT_PI:RAT_E,percent:false,raw:ch});i++;continue}
  const name=FN_NAMES.find(n=>s.startsWith(n,i));if(name){tokens.push({type:'fn',name});i+=name.length;continue}
  throw Error('CHAR')
 }return tokens
}
// Precedence: + − < × ÷ < sign < ^ (right to left, so 2^3^2 = 2^9) < ! < numbers, brackets, functions. −2^2 = −4.
function evalExpr(input){
 const tokens=tokenize(input);let pos=0;const peek=()=>tokens[pos];
 function primary(){const tok=tokens[pos++];if(!tok)throw Error('INCOMPLETE');
  if(tok.type==='('){const v=additive();if(!peek()||peek().type!==')')throw Error('PAREN');pos++;return{value:v.value,percent:false}}
  if(tok.type==='number')return{value:tok.value,percent:tok.percent};
  if(tok.type==='fn'){const arg=peek()?.type==='('?primary():postfix();return{value:sciFunction(tok.name,arg.value),percent:false}}
  throw Error('SYNTAX')}
 function postfix(){let v=primary();while(peek()?.type==='!'){pos++;v={value:ratFactorial(v.value),percent:false}}return v}
 function power(){const base=postfix();if(peek()?.type==='^'){pos++;const exp=unary();return{value:ratPow(base.value,exp.value),percent:false}}return base}
 function unary(){const tok=peek();if(tok&&(tok.type==='+'||tok.type==='-')){pos++;const v=unary();return{value:tok.type==='-'?ratMul(rat(-1n),v.value):v.value,percent:v.percent}}return power()}
 function mult(){let left=unary();while(peek()&&['*','/'].includes(peek().type)){const op=tokens[pos++].type,right=unary();left={value:op==='*'?ratMul(left.value,right.value):ratDiv(left.value,right.value),percent:false}}return left}
 function additive(){let left=mult();while(peek()&&['+','-'].includes(peek().type)){const op=tokens[pos++].type,right=mult();const rv=right.percent?ratMul(left.value,right.value):right.value;left={value:op==='+'?ratAdd(left.value,rv):ratSub(left.value,rv),percent:false}}return left}
 const out=additive();if(pos!==tokens.length)throw Error('SYNTAX');return out.value
}

// ---------- Scientific maths ----------
// Exact (fractions) wherever the answer is exact: 2^10, √(9/4), ∛(−8), 5!, sin(30°), log(1000).
// Otherwise floating point, rounded to 15 significant digits (ratFromFloat), so sin(180°) is 0, not 1.2e-16.
// Angles in degrees or radians (angleUnit, saved as uc-angle; the Deg/Rad key).
const RAT_PI=ratFromString('3.14159265358979323846264338327950288'),RAT_E=ratFromString('2.71828182845904523536028747135266250');
let angleUnit=store.get('uc-angle')==='rad'?'rad':'deg';
function ratToFloat(a){const n=Number(a.n),d=Number(a.d);if(Number.isFinite(n)&&Number.isFinite(d))return n/d;return Number(ratToDecimal(a,30))}
function ratFromFloat(x){
 if(!Number.isFinite(x))throw Error('MATH');
 const [m,e='0']=x.toPrecision(15).split('e');let r=ratFromString(m);const k=BigInt(Math.abs(+e));
 return +e>=0?ratMul(r,rat(10n**k)):ratDiv(r,rat(10n**k));
}
const bitLen=n=>(n<0n?-n:n).toString(2).length;
function bigRoot(n,k){// whole k-th root of n ≥ 0 if there is one, else null
 if(n<2n)return n;
 if(bitLen(n)<1000){const x=BigInt(Math.round(Math.pow(Number(n),1/Number(k))));for(const c of [x-1n,x,x+1n])if(c>=0n&&c**k===n)return c;return null}
 // big numbers: Newton's method
 let x;
 x=1n<<BigInt(Math.ceil(bitLen(n)/Number(k)));for(;;){const y=((k-1n)*x+n/x**(k-1n))/k;if(y>=x)break;x=y}return x**k===n?x:null;
}
function ratPow(a,b){
 if(b.d===1n){
  const e=b.n;
  if(a.n===0n){if(e<0n)throw Error('DIV0');return e===0n?rat(1n):rat(0n)}
  const abs=e<0n?-e:e;
  if(abs<=100000n&&BigInt(Math.max(bitLen(a.n),bitLen(a.d)))*abs<=400000n){const r=rat(a.n**abs,a.d**abs);return e<0n?ratDiv(rat(1n),r):r}
  return ratFromFloat(Math.pow(ratToFloat(a),Number(e)));
 }
 // a fractional power: exact when the root is exact (8^(1/3) = 2); a negative base only with an odd root
 const neg=a.n<0n;
 if(neg&&b.d%2n===0n)throw Error('MATH');
 const k=b.d,rn=bigRoot(neg?-a.n:a.n,k),rd=bigRoot(a.d,k);
 if(rn!==null&&rd!==null&&(b.n<0n?-b.n:b.n)<=10000n)return ratPow(rat(neg?-rn:rn,rd),rat(b.n));
 const mag=Math.pow(ratToFloat(neg?rat(-a.n,a.d):a),ratToFloat(b));
 return ratFromFloat(neg&&(b.n%2n!==0n)?-mag:mag);
}
function ratFactorial(a){
 if(a.d!==1n||a.n<0n||a.n>5000n)throw Error('MATH');
 let r=1n;for(let i=2n;i<=a.n;i++)r*=i;return rat(r);
}
function sciFunction(name,a){
 const x=ratToFloat(a),deg=angleUnit==='deg',snap=v=>Math.abs(v)<1e-12?0:v;
 if(name==='sin'||name==='cos'||name==='tan'){
  if(deg){// whole multiples of 90° are exact; others are reduced to 0…360 first, so large angles stay accurate
   const q=ratDiv(a,rat(90n));
   if(q.d===1n){const k=Number(((q.n%4n)+4n)%4n);
    if(name==='tan'){if(k%2)throw Error('MATH');return rat(0n)}
    return rat(BigInt(name==='sin'?[0,1,0,-1][k]:[1,0,-1,0][k]))}
   const turns=a.n/(a.d*360n),r=ratSub(a,rat(turns*360n));
   const v=Math[name](ratToFloat(r)*Math.PI/180);if(name==='tan'&&Math.abs(v)>1e13)throw Error('MATH');return ratFromFloat(snap(v));
  }
  const v=Math[name](x);if(name==='tan'&&Math.abs(v)>1e13)throw Error('MATH');return ratFromFloat(snap(v));
 }
 if(name==='asin'||name==='acos'){if(x<-1||x>1)throw Error('MATH');const v=Math[name](x);return ratFromFloat(deg?v*180/Math.PI:v)}
 if(name==='atan'){const v=Math.atan(x);return ratFromFloat(deg?v*180/Math.PI:v)}
 if(name==='ln'||name==='log'){if(a.n<=0n)throw Error('MATH');
  if(name==='log'){const r=ratToDecimal(a,0),m=/^1(0*)$/.exec(r);if(a.d===1n&&m)return rat(BigInt(m[1].length))}// log of 10, 100, 1000 … exactly
  return ratFromFloat(name==='ln'?Math.log(x):Math.log10(x))}
 if(name==='√'){if(a.n<0n)throw Error('MATH');return ratPow(a,rat(1n,2n))}
 if(name==='∛')return ratPow(a,rat(1n,3n));
 throw Error('FN');
}

const money=v=>new Intl.NumberFormat(NUMBER_LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)+' €';
