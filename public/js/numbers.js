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
// truncated to `max` decimals ("0.333…"); one big division, so it stays fast for huge numbers
function ratToDecimal(a,max=18){const neg=a.n<0n,n=neg?-a.n:a.n,d=a.d,whole=n/d,rem=n%d;const frac=rem&&max>0?(rem*10n**BigInt(max)/d).toString().padStart(max,'0').replace(/0+$/,''):'';return (neg&&(whole||frac)?'-':'')+whole+(frac?'.'+frac:'')}
// for storing a value as text (History, Units): at least 24 significant digits, even for tiny values
function ratToStoreDecimal(a){const n=a.n<0n?-a.n:a.n;return ratToDecimal(a,24+Math.max(0,a.d.toString().length-n.toString().length+1))}
function ratToRoundedDecimal(a,max=6){const neg=a.n<0n,n=neg?-a.n:a.n,scale=10n**BigInt(max);let q=n*scale/a.d;if(2n*((n*scale)%a.d)>=a.d)q++;if(q===0n)return '0';let digits=q.toString().padStart(max+1,'0');const whole=digits.slice(0,digits.length-max),frac=digits.slice(digits.length-max).replace(/0+$/,'');return (neg?'-':'')+whole+(frac?'.'+frac:'')}
function ratToNumber(a){const s=ratToDecimal(a,18);return Number(s)}
// Very large and very small numbers: 7 significant digits and a power of ten, 1,234567 × 10³⁴ (Greek decimal comma).
const supNum=e=>(e<0?'⁻':'')+[...String(Math.abs(e))].map(c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('');
function ratScientific(a,sig=7){
 const neg=a.n<0n,n=neg?-a.n:a.n,d=a.d;if(n===0n)return '0';
 let e=n.toString().length-d.toString().length;// 10^e ≤ |a| < 10^(e+1), after the check below
 if(e>=0?n<d*10n**BigInt(e):n*10n**BigInt(-e)<d)e--;
 const k=sig-1-e,num=k>=0?n*10n**BigInt(k):n,den=k>=0?d:d*10n**BigInt(-k);
 let q=num/den;if(2n*(num%den)>=den)q++;
 if(q>=10n**BigInt(sig)){q/=10n;e++}// 9,9999999 rounded up to 10
 const digits=q.toString(),mant=digits[0]+(','+digits.slice(1)).replace(/,?0+$/,'');
 return (neg?'-':'')+mant+(e?' × 10'+supNum(e):'');
}
function numScientific(v,sig=7){return Number.isFinite(v)?ratScientific(ratFromFloat(v),sig):'–'}
// Results: rounded to `max` decimals and at most 16 significant digits; from 10¹⁶ up, and for values that would
// round to 0, the power-of-ten form.
const MAX_SHOWN_DIGITS=16;
function formatRat(a,max=6){
 if(a.n===0n)return '0';
 const n=a.n<0n?-a.n:a.n,whole=n/a.d,intDigits=whole?whole.toString().length:0;
 if(intDigits>MAX_SHOWN_DIGITS)return ratScientific(a);
 const s=ratToRoundedDecimal(a,Math.min(max,MAX_SHOWN_DIGITS-intDigits));
 if(s==='0'||s.replace(/^-/,'').split('.')[0].length>MAX_SHOWN_DIGITS)return ratScientific(a);
 return formatGroupedNumber(s);
}
const fmt=n=>isCx(n)?fmtCx(n):n&&typeof n==='object'&&'n'in n?formatRat(n,6):Number.isFinite(Number(n))?(Math.abs(Number(n))>=1e15?numScientific(Number(n)):new Intl.NumberFormat(NUMBER_LOCALE,{maximumFractionDigits:6}).format(Number(n))):'Error';
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
const sciPretty=s=>s.replace(/a(sinh|cosh|tanh|coth|sech|csch|sin|cos|tan|cot|sec|csc)\(/g,'$1⁻¹(').replace(/\^([-−]?)(\d+)(?![\d.])/g,(m,sg,d)=>(sg?'⁻':'')+[...d].map(c=>SUP_DIGITS[c]).join(''));
function formatInputDisplay(s){
 return pretty(sciPretty(constPretty(String(s)))).replace(/\d+(?:\.\d*)?/g,m=>formatGroupedNumber(m)).replace(/([\d)])×i(?![\w(])/g,'$1i')// 2×i shows as 2i
  .replace(/([×÷+\-])[-−](\d[\d.,]*%?)/g,'$1(−$2)').replace(/\([-−](?=\d)/g,'(−')
  .replace(/^−(\d[\d.,]*%?)/,'(−$1)');
}
// ---------- Limits ----------
// What can be typed: numbers of up to 15 digits (as on Windows' calculator; a leading "0," does not count) and
// calculations of up to 150 characters. Results must stay below 10^10000 and, unless 0, above 10^−10000 (as on
// Windows' calculator), otherwise "Too large" / "Too small"; that also keeps every calculation fast.
const MAX_DIGITS=15,MAX_INPUT=150,MAX_BITS=33220;// 2^33220 ≈ 10^10000
const digitCount=s=>String(s).replace(/^[-−]?0(?=[.,])/,'').replace(/\D/g,'').length;
// the number at the end of a typed text is full: no more digits fit
const numberFull=s=>digitCount((String(s).match(/[\d.,]+$/)||[''])[0])>=MAX_DIGITS;
const LIMIT_POW=10n**10000n;
function ratLimit(r){
 if(r.n===0n)return r;const n=r.n<0n?-r.n:r.n,diff=bitLen(n)-bitLen(r.d);
 if(diff>=MAX_BITS-2&&n>=r.d*LIMIT_POW)throw Error('BIG');
 if(-diff>=MAX_BITS-2&&n*LIMIT_POW<r.d)throw Error('SMALL');
 return r;
}
// ---------- Expressions: + − × ÷ %, brackets, and the scientific parts (functions, π, e, ^, !) ----------
// Functions are written in the expression as a name and "(": sin( cos( tan( asin( acos( atan( ln( log( √( ∛(
// (also cot sec csc, the hyperbolic ones and every inverse, abs). Longest first, so "sinh(" isn't read as "sin" + "h(".
const FN_NAMES=['sin','cos','tan','cot','sec','csc','sinh','cosh','tanh','coth','sech','csch'].flatMap(n=>[n,'a'+n]).concat(['ln','log','√','∛','abs']).sort((a,b)=>b.length-a.length);
const FN_ALT=FN_NAMES.join('|');
const FN_END=new RegExp('(?:'+FN_ALT+')$'),FN_OPEN_END=new RegExp('(?:'+FN_ALT+')\\($');
// Two-number operators besides + − × ÷ ^ are written as one letter: C (nCr, combinations), P (nPr, permutations),
// m (mod, the remainder; shown as " mod "). OP_END: the calculation ends with an operator (or "(").
const OP_CHARS='+\\-×÷^CPm∠',OP_END=new RegExp('['+OP_CHARS+']$'),OP_OPEN_END=new RegExp('['+OP_CHARS+'(]$');
// A value ends here: a digit, %, a closing bracket, π, e, φ, a constant ⟨…⟩, a factorial !
const VALUE_END=/[0-9.%)πeφ⟩⟫i!]$/;
// ---------- Constants ----------
// φ (the golden ratio) is one character; the physical constants are written ⟨id⟩ in the calculation and shown by their
// symbol. Values: CODATA 2018 (exact since the 2019 SI where marked). [symbol, value, unit, Greek name, English name]
const CONSTS={
 c:['c','299792458','m/s','Ταχύτητα του φωτός','Speed of light'],
 G:['G','6.67430e-11','m³/(kg·s²)','Σταθερά της βαρύτητας','Gravitational constant'],
 g:['g','9.80665','m/s²','Κανονική επιτάχυνση της βαρύτητας','Standard gravity'],
 h:['h','6.62607015e-34','J·s','Σταθερά του Planck','Planck constant'],
 hbar:['ħ','1.054571817e-34','J·s','Ανηγμένη σταθερά του Planck','Reduced Planck constant'],
 qe:['qₑ','1.602176634e-19','C','Στοιχειώδες φορτίο','Elementary charge'],
 me:['mₑ','9.1093837015e-31','kg','Μάζα του ηλεκτρονίου','Electron mass'],
 mp:['mₚ','1.67262192369e-27','kg','Μάζα του πρωτονίου','Proton mass'],
 mn:['mₙ','1.67492749804e-27','kg','Μάζα του νετρονίου','Neutron mass'],
 mmu:['mμ','1.883531627e-28','kg','Μάζα του μιονίου','Muon mass'],
 malpha:['mα','6.6446573357e-27','kg','Μάζα του σωματιδίου α','Alpha particle mass'],
 u:['u','1.66053906660e-27','kg','Ατομική μονάδα μάζας','Atomic mass unit'],
 NA:['Nₐ','6.02214076e23','1/mol','Σταθερά του Avogadro','Avogadro constant'],
 k:['k','1.380649e-23','J/K','Σταθερά του Boltzmann','Boltzmann constant'],
 R:['R','8.314462618','J/(mol·K)','Σταθερά των αερίων','Gas constant'],
 F:['F','96485.33212','C/mol','Σταθερά του Faraday','Faraday constant'],
 Vm:['Vₘ','0.02241396954','m³/mol','Γραμμομοριακός όγκος (0 °C, 1 atm)','Molar volume (0 °C, 1 atm)'],
 atm:['atm','101325','Pa','Κανονική ατμόσφαιρα','Standard atmosphere'],
 sigma:['σ','5.670374419e-8','W/(m²·K⁴)','Σταθερά Stefan–Boltzmann','Stefan–Boltzmann constant'],
 b:['b','2.897771955e-3','m·K','Σταθερά του Wien','Wien displacement constant'],
 c1:['c₁','3.741771852e-16','W·m²','Πρώτη σταθερά ακτινοβολίας','First radiation constant'],
 c2:['c₂','1.438776877e-2','m·K','Δεύτερη σταθερά ακτινοβολίας','Second radiation constant'],
 eps0:['ε₀','8.8541878128e-12','F/m','Διηλεκτρική σταθερά του κενού','Vacuum permittivity'],
 mu0:['μ₀','1.25663706212e-6','N/A²','Μαγνητική διαπερατότητα του κενού','Vacuum permeability'],
 Z0:['Z₀','376.730313668','Ω','Χαρακτηριστική αντίσταση του κενού','Impedance of free space'],
 ke:['kₑ','8.9875517923e9','N·m²/C²','Σταθερά του Coulomb','Coulomb constant'],
 alpha:['α','7.2973525693e-3','','Σταθερά λεπτής υφής','Fine-structure constant'],
 Rinf:['R∞','10973731.568160','1/m','Σταθερά του Rydberg','Rydberg constant'],
 a0:['a₀','5.29177210903e-11','m','Ακτίνα του Bohr','Bohr radius'],
 re:['rₑ','2.8179403262e-15','m','Κλασική ακτίνα του ηλεκτρονίου','Classical electron radius'],
 lc:['λc','2.42631023867e-12','m','Μήκος κύματος Compton','Compton wavelength'],
 muB:['μB','9.2740100783e-24','J/T','Μαγνητόνη του Bohr','Bohr magneton'],
 muN:['μN','5.0507837461e-27','J/T','Πυρηνική μαγνητόνη','Nuclear magneton'],
 phi0:['Φ₀','2.067833848e-15','Wb','Κβάντο μαγνητικής ροής','Magnetic flux quantum'],
 G0:['G₀','7.748091729e-5','S','Κβάντο αγωγιμότητας','Conductance quantum'],
 KJ:['KJ','483597.8484e9','Hz/V','Σταθερά του Josephson','Josephson constant'],
 RK:['RK','25812.80745','Ω','Σταθερά του von Klitzing','von Klitzing constant'],
 Eh:['Eₕ','4.3597447222071e-18','J','Ενέργεια Hartree','Hartree energy'],
 eV:['eV','1.602176634e-19','J','Ηλεκτρονιοβόλτ','Electronvolt'],
 lP:['lₚ','1.616255e-35','m','Μήκος του Planck','Planck length'],
 tP:['tₚ','5.391247e-44','s','Χρόνος του Planck','Planck time']};
const CONST_EXACT=new Set(['c','g','h','qe','NA','k','atm','eV']);// exact values (SI 2019, or by definition); the others are rounded
// "6.02214076e23" as an exact fraction
function ratSci(str){const [m,e='0']=String(str).split('e'),r=ratFromString(m),k=BigInt(Math.abs(+e));return +e>=0?ratMul(r,rat(10n**k)):ratDiv(r,rat(10n**k))}
const RAT_PHI=ratFromString('1.61803398874989484820458683436563812');
// constants by their symbol, and mod (m) as a word; one pass, so the m of mₑ isn't read as mod
const constPretty=s=>s.replace(/⟨(\w+)⟩|m/g,(x,k)=>k?(CONSTS[k]?CONSTS[k][0]:x):' mod ');
function tokenize(input){
 const s=String(input).replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/\s+/g,'');const tokens=[];let i=0;// − is a minus made with ± (see formatInputDisplay)
 while(i<s.length){const ch=s[i];
  if(/[0-9.]/.test(ch)){const start=i;let dots=0;while(i<s.length&&/[0-9.]/.test(s[i])){if(s[i]==='.')dots++;i++}if(dots>1)throw Error('NUMBER');let raw=s.slice(start,i);if(s[i]==='%'){i++;tokens.push({type:'number',value:ratPercent(ratFromString(raw)),percent:true,raw:raw+'%'});}else{const exact=carry&&raw===carry.text;tokens.push({type:'number',value:exact?carry.value:ratFromString(raw),percent:false,raw})}continue}
  if('+-*/()^!'.includes(ch)){tokens.push({type:ch});i++;continue}
  if(ch==='π'||ch==='e'||ch==='φ'){tokens.push({type:'number',value:ch==='π'?RAT_PI:ch==='e'?RAT_E:RAT_PHI,percent:false,raw:ch});i++;continue}
  if(ch==='⟨'){const j=s.indexOf('⟩',i),k=j>0?s.slice(i+1,j):'';if(!CONSTS[k])throw Error('CHAR');tokens.push({type:'number',value:ratSci(CONSTS[k][1]),percent:false,raw:s.slice(i,j+1)});i=j+1;continue}
  if(ch==='C'||ch==='P'||ch==='m'||ch==='∠'){tokens.push({type:ch});i++;continue}
  if(ch==='⟪'&&s[i+1]==='⟫'){if(!carryCx)throw Error('CHAR');tokens.push({type:'number',value:carryCx,percent:false,raw:'⟪⟫'});i+=2;continue}// a complex result carried on
  const name=FN_NAMES.find(n=>s.startsWith(n,i));if(name){tokens.push({type:'fn',name});i+=name.length;continue}
  if(ch==='i'){tokens.push({type:'number',value:I_UNIT,percent:false,raw:'i'});i++;continue}// the imaginary unit (after the names: sin has an i)
  throw Error('CHAR')
 }return tokens
}
// Precedence: + − < × ÷ < sign < ^ (right to left, so 2^3^2 = 2^9) < ! < numbers, brackets, functions. −2^2 = −4.
function evalExpr(input){
 const tokens=tokenize(input);let pos=0;const peek=()=>tokens[pos];
 const lim=v=>(vLimit(v.value),v);// every step stays within the limits (complex.js: v… work on real and complex values)
 function primary(){const tok=tokens[pos++];if(!tok)throw Error('INCOMPLETE');
  if(tok.type==='('){const v=additive();if(!peek()||peek().type!==')')throw Error('PAREN');pos++;return{value:v.value,percent:false}}
  if(tok.type==='number')return{value:tok.value,percent:tok.percent};
  if(tok.type==='fn'){const arg=peek()?.type==='('?primary():postfix();return lim({value:sciFunctionV(tok.name,arg.value),percent:false})}
  throw Error('SYNTAX')}
 function postfix(){let v=primary();while(peek()?.type==='!'){pos++;if(isCx(v.value))throw Error('MATH');v=lim({value:ratFactorial(v.value),percent:false})}return v}
 // ^ and ∠ (r∠θ, polar entry, as tight as ^: 2∠30×3 = (2∠30)×3)
 function power(){const base=postfix();if(peek()?.type==='^'){pos++;const exp=unary();return lim({value:vPow(base.value,exp.value),percent:false})}
  if(peek()?.type==='∠'){pos++;const t=unary();return lim({value:vPolar(base.value,t.value),percent:false})}return base}
 function unary(){const tok=peek();if(tok&&(tok.type==='+'||tok.type==='-')){pos++;const v=unary();return{value:tok.type==='-'?vNeg(v.value):v.value,percent:v.percent}}return power()}
 // nCr, nPr: above × ÷ (as on Casio's calculators), 5×4C2 = 5×6
 function comb(){let left=unary();while(peek()&&['C','P'].includes(peek().type)){const op=tokens[pos++].type,right=unary();left=lim({value:op==='C'?ratComb(left.value,right.value):ratPerm(left.value,right.value),percent:false})}return left}
 function mult(){let left=comb();while(peek()&&['*','/','m'].includes(peek().type)){const op=tokens[pos++].type,right=comb();left=lim({value:op==='*'?vMul(left.value,right.value):op==='m'?ratMod(left.value,right.value):vDiv(left.value,right.value),percent:false})}return left}
 function additive(){let left=mult();while(peek()&&['+','-'].includes(peek().type)){const op=tokens[pos++].type,right=mult();const rv=right.percent?vMul(left.value,right.value):right.value;left=lim({value:op==='+'?vAdd(left.value,rv):vSub(left.value,rv),percent:false})}return left}
 const out=additive();if(pos!==tokens.length)throw Error('SYNTAX');return vLimit(out.value)
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
// natural log of a whole number ≥ 1 of any size (Math.log alone gives Infinity above 10^308)
const lnBig=n=>{if(bitLen(n)<1000)return Math.log(Number(n));const s=n.toString();return (s.length-17)*Math.LN10+Math.log(Number(s.slice(0,17)))};
const ratLn=a=>lnBig(a.n<0n?-a.n:a.n)-lnBig(a.d);// ln|a|, a ≠ 0
// |a|^b and its sign when the exact way is too big: floating point, or logarithms beyond its range (e^1000)
function ratPowApprox(a,b,negative){
 const x=ratToFloat(a),direct=Math.pow(Math.abs(x),b);
 if(Number.isFinite(x)&&x!==0&&Number.isFinite(direct)&&direct!==0)return ratFromFloat(negative?-direct:direct);
 const L=ratLn(a)*b/Math.LN10;if(!Number.isFinite(L))throw Error(L>0?'BIG':'MATH');
 if(L>10000)throw Error('BIG');if(L<-10000)throw Error('SMALL');
 const e=Math.floor(L),m=ratFromFloat(Math.pow(10,L-e)*(negative?-1:1)),t=rat(10n**BigInt(Math.abs(e)));
 return e>=0?ratMul(m,t):ratDiv(m,t);
}
function bigRoot(n,k){// whole k-th root of n ≥ 0 if there is one, else null
 if(n<2n)return n;
 if(bitLen(n)<1000){const x=BigInt(Math.round(Math.pow(Number(n),1/Number(k))));for(const c of [x-1n,x,x+1n])if(c>=0n&&c**k===n)return c;return null}
 // big numbers: Newton's method
 let x;
 x=1n<<BigInt(Math.ceil(bitLen(n)/Number(k)));for(;;){const y=((k-1n)*x+n/x**(k-1n))/k;if(y>=x)break;x=y}return x**k===n?x:null;
}
function ratPow(a,b){
 const unit=(a.n===a.d||a.n===-a.d)&&a.d===1n;// 1 and −1 to any whole power
 if(b.d===1n){
  const e=b.n;
  if(a.n===0n){if(e<0n)throw Error('DIV0');return e===0n?rat(1n):rat(0n)}
  if(unit)return rat(a.n<0n&&e%2n!==0n?-1n:1n);
  const abs=e<0n?-e:e;
  // exact while the answer has at most 40000 bits (10^12000); a and b are in lowest terms, so are their powers
  if(abs<=100000n&&BigInt(Math.max(bitLen(a.n),bitLen(a.d)))*abs<=40000n){const r=e<0n?{n:a.d**abs,d:a.n**abs}:{n:a.n**abs,d:a.d**abs};if(r.d<0n){r.n=-r.n;r.d=-r.d}return r}
  return ratPowApprox(a,Number(e),a.n<0n&&e%2n!==0n);
 }
 // a fractional power: exact when the root is exact (8^(1/3) = 2); a negative base only with an odd root
 const neg=a.n<0n;
 if(neg&&b.d%2n===0n)throw Error('MATH');
 if(a.n===0n){if(b.n<0n)throw Error('DIV0');return rat(0n)}
 const k=b.d,rn=bitLen(a.n)<=40000&&bitLen(a.d)<=40000?bigRoot(neg?-a.n:a.n,k):null,rd=rn===null?null:bigRoot(a.d,k);
 if(rn!==null&&rd!==null&&(b.n<0n?-b.n:b.n)<=10000n)return ratPow(rat(neg?-rn:rn,rd),rat(b.n));
 return ratPowApprox(neg?rat(-a.n,a.d):a,ratToFloat(b),neg&&(b.n%2n!==0n));
}
function ratFactorial(a){
 if(a.d!==1n||a.n<0n)throw Error('MATH');if(a.n>3248n)throw Error('BIG');// 3249! > 10^10000
 let r=1n;for(let i=2n;i<=a.n;i++)r*=i;return rat(r);
}
// nCr and nPr of whole numbers 0 ≤ r ≤ n (r > n gives 0), exact
function ratWhole(a){if(isCx(a)||a.d!==1n||a.n<0n)throw Error('MATH');return a.n}
function ratPerm(a,b){const n=ratWhole(a),r=ratWhole(b);if(r>n)return rat(0n);if(r>20000n)throw Error('BIG');let p=1n;for(let i=0n;i<r;i++)p*=n-i;return rat(p)}
function ratComb(a,b){const n=ratWhole(a);let r=ratWhole(b);if(r>n)return rat(0n);if(n-r<r)r=n-r;if(r>20000n)throw Error('BIG');let p=1n;for(let i=1n;i<=r;i++)p=p*(n-r+i)/i;return rat(p)}
// a mod b: the remainder, with the sign of b (as 17 mod 5 = 2, −17 mod 5 = 3), for any numbers
function ratFloor(a){const q=a.n/a.d;return a.n<0n&&q*a.d!==a.n?q-1n:q}
function ratMod(a,b){if(isCx(a)||isCx(b))throw Error('MATH');if(b.n===0n)throw Error('DIV0');return ratSub(a,ratMul(b,rat(ratFloor(ratDiv(a,b)))))}
const RECIP_FN={cot:'tan',sec:'cos',csc:'sin',coth:'tanh',sech:'cosh',csch:'sinh'};
function sciFunction(name,a){
 if(name==='abs')return a.n<0n?rat(-a.n,a.d):a;
 // cot, sec, csc (and coth, sech, csch): 1 ÷ tan, cos, sin (tan's 15-digit rounding keeps cot(45°) exactly 1)
 if(name==='cot'){let t;try{t=sciFunction('tan',a)}catch{return rat(0n)}if(t.n===0n)throw Error('MATH');return ratDiv(rat(1n),t)}// where tan is undefined (90°) cot is 0
 if(RECIP_FN[name]){const v=sciFunction(RECIP_FN[name],a);if(v.n===0n)throw Error('MATH');return ratDiv(rat(1n),v)}
 // their inverses through the inverse of 1/x
 if(name==='acot'){if(a.n===0n)return angleUnit==='deg'?rat(90n):ratFromFloat(Math.PI/2);return sciFunction('atan',ratDiv(rat(1n),a))}
 if(['asec','acsc','acoth','asech','acsch'].includes(name)){if(a.n===0n)throw Error('MATH');return sciFunction({asec:'acos',acsc:'asin',acoth:'atanh',asech:'acosh',acsch:'asinh'}[name],ratDiv(rat(1n),a))}
 if(['sinh','cosh','tanh','asinh','acosh','atanh'].includes(name)){
  const x=ratToFloat(a);
  if(name==='acosh'&&x<1||name==='atanh'&&(x<=-1||x>=1))throw Error('MATH');
  const v=Math[name](x);if(!Number.isFinite(v))throw Error('BIG');return ratFromFloat(Math.abs(v)<1e-15&&name!=='cosh'?0:v);
 }
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
  const ln=ratLn(a);return ratFromFloat(name==='ln'?ln:ln/Math.LN10)}
 if(name==='√'){if(a.n<0n)throw Error('MATH');return ratPow(a,rat(1n,2n))}
 if(name==='∛')return ratPow(a,rat(1n,3n));
 throw Error('FN');
}

// Money: always 2 decimals; from 10 trillion up (where cents stop being exact) the power-of-ten form.
const money=v=>!Number.isFinite(v)?'– €':Math.abs(v)>=1e13?numScientific(v)+' €':new Intl.NumberFormat(NUMBER_LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)+' €';
