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
function formatInputDisplay(s){
 return negativeInBrackets(pretty(String(s)).replace(/\d+(?:\.\d*)?/g,m=>formatGroupedNumber(m))
  // a negative number after an operator shows in brackets, like the iPhone: 5×(−25); after "(" just −
  .replace(/([×÷+\-])-(\d[\d.,]*%?)/g,'$1(−$2)').replace(/\(-(?=\d)/g,'(−'));
}
// A negative number at the start of a calculation shows in brackets too: (−5), (−5)×3; "-(" becomes "−(".
// Only for calculations being shown (typing, the line above a result, History, explanations, the typed Units value);
// a finished result stays plain, like −6.
const negativeInBrackets=s=>String(s).replace(/^-(\d[\d.,]*%?)/,'(−$1)').replace(/^-\(/,'−(');
function tokenize(input){
 const s=String(input).replace(/×/g,'*').replace(/÷/g,'/').replace(/\s+/g,'');const tokens=[];let i=0;
 while(i<s.length){const ch=s[i];
  if(/[0-9.]/.test(ch)){const start=i;let dots=0;while(i<s.length&&/[0-9.]/.test(s[i])){if(s[i]==='.')dots++;i++}if(dots>1)throw Error('NUMBER');let raw=s.slice(start,i);if(s[i]==='%'){i++;tokens.push({type:'number',value:ratPercent(ratFromString(raw)),percent:true,raw:raw+'%'});}else{const exact=carry&&raw===carry.text&&(start===0||(start===1&&s[0]==='-'));tokens.push({type:'number',value:exact?carry.value:ratFromString(raw),percent:false,raw})}continue}
  if('+-*/()'.includes(ch)){tokens.push({type:ch});i++;continue}throw Error('CHAR')
 }return tokens
}
function evalExpr(input){
 const tokens=tokenize(input);let pos=0;
 function primary(){const tok=tokens[pos++];if(!tok)throw Error('INCOMPLETE');if(tok.type==='+'||tok.type==='-'){const v=primary();return{value:tok.type==='-'?ratMul(ratFromString('-1'),v.value):v.value,percent:v.percent}}if(tok.type==='('){const v=additive();if(!tokens[pos]||tokens[pos].type!==')')throw Error('PAREN');pos++;return{value:v.value,percent:false}}if(tok.type==='number')return{value:tok.value,percent:tok.percent};throw Error('SYNTAX')}
 function mult(){let left=primary();while(tokens[pos]&&['*','/'].includes(tokens[pos].type)){const op=tokens[pos++].type,right=primary();left={value:op==='*'?ratMul(left.value,right.value):ratDiv(left.value,right.value),percent:false}}return left}
 function additive(){let left=mult();while(tokens[pos]&&['+','-'].includes(tokens[pos].type)){const op=tokens[pos++].type,right=mult();const rv=right.percent?ratMul(left.value,right.value):right.value;left={value:op==='+'?ratAdd(left.value,rv):ratSub(left.value,rv),percent:false}}return left}
 const out=additive();if(pos!==tokens.length)throw Error('SYNTAX');return out.value
}

const money=v=>new Intl.NumberFormat(NUMBER_LOCALE,{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)+' €';
