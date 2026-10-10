// Calculator mode: what each key does, the display, = and the step-by-step explanation.
// After a result, the next calculation starts from its full-precision value (carry). On screen that value shows rounded, like the result did.
function formatExpressionDisplay(s){
 s=String(s??'');
 if(carry&&carry.raw){const i=s.indexOf(carry.raw);if(i===0)return carry.shown+formatInputDisplay(s.slice(carry.raw.length));if(i>0&&!/[0-9.]/.test(s[i-1])&&!/[0-9.]/.test(s[i+carry.raw.length]||''))return formatInputDisplay(s.slice(0,i))+carry.shown+formatInputDisplay(s.slice(i+carry.raw.length))}
 return formatInputDisplay(s);
}
let resultNegated=false;// the finished result was turned negative with ± (so carrying it on shows it in brackets)
let lastShown='';// how the finished calculation (lastExpression) is shown above the result
// A calculation that cannot be worked out shows why ("Can't divide by 0", "Too large" …) in place of the result,
// with the calculation above it; the next key goes on from the calculation, so it can be fixed. ''=no error.
let calcError='';
const ERROR_TEXT={DIV0:'errDiv0',BIG:'errBig',SMALL:'errSmall'};
const calcErrorKind=e=>ERROR_TEXT[e?.message]?e.message:'MATH';
// how long the calculation being typed is (a carried result counts as one character), for MAX_INPUT
function inputLength(){const s=expression+current;return s.length-(carry&&carry.raw&&s.includes(carry.raw)?carry.raw.length-1:0)}

function carryText(r,digits){const abs=r.n<0n?{n:-r.n,d:r.d}:r,places=digits+Math.max(0,r.d.toString().length-abs.n.toString().length),raw=ratToDecimal(r,places);/* tiny values keep their digits too */carry={text:ratToDecimal(abs,places),value:abs,raw,shown:fmt(r)};carry.plain=/×/.test(carry.shown)?'':ratToRoundedDecimal(r,6);/* what ⌫ edits; one shown as × 10ⁿ is deleted whole */return raw}
function explanationForExpression(input,result){
 let tokens;try{tokens=tokenize(input)}catch{return null}let pos=0;
 // a minus in front of a number or a bracket makes it negative: 3×-5, -(2+3)
 const primary=()=>{if(tokens[pos]?.type==='-'){pos++;const c=primary();return c.type==='number'?{...c,value:ratMul(c.value,rat(-1n)),raw:'-'+c.raw}:{type:'neg',child:c}}if(tokens[pos]?.type==='('){pos++;const child=additive();if(tokens[pos]?.type!==')')throw Error();pos++;return{type:'group',child}}const x=tokens[pos++];if(!x||x.type!=='number')throw Error();return{type:'number',value:x.value,percent:x.percent,raw:x.raw}};
 const mult=()=>{let left=primary();while(tokens[pos]&&['*','/'].includes(tokens[pos].type)){const op=tokens[pos++].type;left={type:'op',op,left,right:primary()}}return left};
 const additive=()=>{let left=mult();while(tokens[pos]&&['+','-'].includes(tokens[pos].type)){const op=tokens[pos++].type;left={type:'op',op,left,right:mult()}}return left};
 let tree;try{tree=additive();if(pos!==tokens.length)throw Error()}catch{return null}
 const renderNode=n=>n.type==='number'?n.raw:n.type==='neg'?'-'+renderNode(n.child):n.type==='group'?'('+renderNode(n.child)+')':renderNode(n.left)+n.op+renderNode(n.right);
 const steps=[],num=v=>formatRat(v),rnum=v=>{const t=formatRat(v);return /^-/.test(t)?'(−'+t.slice(1)+')':t};// 3 × (−5) = -15
 const walk=n=>{
   if(n.type==='number')return n.value;
   if(n.type==='group')return walk(n.child);
   if(n.type==='neg')return ratMul(walk(n.child),rat(-1n));
   const l=walk(n.left),r=walk(n.right),percent=n.right.type==='number'&&n.right.percent;
   const rv=percent&&['+','-'].includes(n.op)?ratMul(l,r):r;
   const v=n.op==='+'?ratAdd(l,rv):n.op==='-'?ratSub(l,rv):n.op==='*'?ratMul(l,rv):ratDiv(l,rv);
   const op=({'+':'+','-':'−','*':'×','/':'÷'})[n.op];
   if(percent&&['+','-'].includes(n.op)){
     const pct=ratDiv(r,ratFromString('0.01'));
     steps.push({title:lang==='el'?'Υπολόγισε το ποσοστό':'Calculate the percentage',text:num(l)+' × '+rnum(pct)+' ÷ 100 = '+formatRat(rv)});
     steps.push({title:lang==='el'?'Έπειτα':'Then',text:num(l)+' '+op+' '+rnum(rv)+' = '+formatRat(v)});
   }else{
     const title=lang==='el'?(steps.length===0?'Πρώτα':n===tree?'Τέλος':'Στη συνέχεια'):(steps.length===0?'First':n===tree?'Finally':'Next');
     steps.push({title,text:num(l)+' '+op+' '+rnum(rv)+' = '+formatRat(v)});
   }
   return v;
 };
 try{walk(tree)}catch{return null}
 return{formula:formatExpressionDisplay(input),steps,result:formatRat(result)}
}

function resetHow(){calcError='';howData=null;calcHowData=null;$('#howButton')?.classList.add('hidden')}
function render(){
 if(mode!=='calc')return;
 renderSciBar();
 const raw=expression+current;
 const display=calcError?t(ERROR_TEXT[calcError]||'errMath'):justCalculated?fmt(lastResult):(raw?formatExpressionDisplay(raw):'0');
 $('#calculatorDisplay').classList.remove('tool-display','tool-empty');
 $('#calculatorDisplay').classList.toggle('calculated',justCalculated);
 $('#calculatorDisplay').classList.toggle('error',Boolean(calcError));
 $('#expression').textContent=justCalculated?(lastShown||formatExpressionDisplay(lastExpression)):calcError?formatExpressionDisplay(raw):'';
 const exprEl=$('#expression');
 $('#result').textContent=display;
 $('#result').classList.remove('long-value','near-limit');
 const hasEntry=Boolean(raw);
 $('#clearButton').textContent=current&&!justCalculated&&!calcError?'C':'AC';// C clears the number being typed; with none, the key clears everything
 $('#howButton').classList.toggle('hidden',!howData);
 $('#chartButton')?.classList.add('hidden');
 syncFuelButtons();
 requestAnimationFrame(()=>{
   // too long to fit: the text gets smaller, then shows its end (what was typed last); the start fades out
   if(exprEl)fitDisplayText(exprEl,12,true);
   const r=$('#result');
   if(r)fitDisplayText(r,32,!justCalculated&&!calcError);
 });
}
function clearAll(){carry=null;resultNegated=false;expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;lastOperation=null;resetHow();render()}
function clearCurrent(){resetHow();if(current){current='';currentIsPercent=false;render();return}clearAll()}
function clearButtonAction(){
 if(justCalculated||calcError){clearAll();return}// the key shows AC then

 if(current){clearCurrent();return}
 if(expression){clearAll();return}
 clearAll();
}
function backspace(){resetHow();if(justCalculated){clearAll();return}if(!current&&carry&&expression===carry.raw){expression=carry.plain;carry=null}if(current){current=current.slice(0,-1);if(current==='−')current='-';currentIsPercent=false}else if(expression){const f=expression.match(/(?:asin|acos|atan|sin|cos|tan|ln|log|√|∛)\($/);expression=expression.slice(0,-(f?f[0].length:1))}render()}
function digit(v){
 if(v===',')v='.';
 if(!justCalculated&&(digitCount(current)>=MAX_DIGITS&&!currentIsPercent||inputLength()>=MAX_INPUT)){refuseKey();return}// 15 digits a number, 150 characters
 resetHow();
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 // after a closed bracket or a percent, a new number is multiplied: (8+9)5 → (8+9)×5, 10%5 → 10%×5 (as in Units)
 if(currentIsPercent){expression+=current+'×';current='';currentIsPercent=false}
 else if(!current&&/[)πe!]$/.test(expression))expression+='×';
 if(v==='.'&&current.includes('.'))return;
 if(v==='.'&&(!current||current==='-'))current+='0.';else if(current==='0'&&v!=='.')current=v;else current+=v;
 render()
}
// Brackets that change nothing are dropped, so the screen never fills with ((((5)))).
// A pair is useless when it holds only one number – (5), or (−5) after × ÷ ( or at the start when no power or ! follows –
// or when it holds exactly one other bracket pair – ((2+3)). Brackets with % inside are kept (50+(10%) ≠ 50+10%).
// Works on calculator (× ÷) and Units (* /) expressions.
function uselessParen(inner,before,after=''){
 if(/(?:sin|cos|tan|ln|log|√|∛)$/.test(before)&&!(inner[0]==='('&&inner.at(-1)===')'))return false;// sin(5) keeps its brackets
 if(/^\d+(?:\.\d*)?$/.test(inner))return true;
 if(/^[-−]\d+(?:\.\d*)?$/.test(inner))return !/[+\-]$/.test(before)&&!/^[\^!]/.test(after);// (−3)² needs them
 if(inner[0]==='('&&inner.at(-1)===')'){let d=0;for(let i=0;i<inner.length;i++){d+=inner[i]==='('?1:inner[i]===')'?-1:0;if(d===0)return i===inner.length-1}}
 return false;
}
// adds the ")" that closes the last open "(", or removes that "(" when the pair would be useless
function closeParen(expr){
 let d=0,i=expr.length-1;for(;i>=0;i--){if(expr[i]===')')d++;else if(expr[i]==='('){if(d===0)break;d--}}
 if(i<0)return expr;
 const before=expr.slice(0,i),inner=expr.slice(i+1);
 return uselessParen(inner,before)?before+inner:expr+')';
}
// the finished expression, tidied: "(" left open at the end are dropped (and the operator before them),
// the rest are closed, useless pairs removed, and one pair around everything too
function tidyParens(expr){
 let s=String(expr);
 if(/\($/.test(s))s=s.replace(/(?:[(+\-×÷*/^]|(?:asin|acos|atan|sin|cos|tan|ln|log|√|∛))+$/,'');
 let open=(s.match(/\(/g)||[]).length-(s.match(/\)/g)||[]).length;
 for(;open>0;open--)s=closeParen(s);
 for(let changed=true;changed;){
  changed=false;const stack=[];
  for(let j=0;j<s.length;j++){
   if(s[j]==='(')stack.push(j);
   else if(s[j]===')'){const i=stack.pop();if(i===undefined)continue;
    if((i===0&&j===s.length-1)||uselessParen(s.slice(i+1,j),s.slice(0,i),s.slice(j+1))){s=s.slice(0,i)+s.slice(i+1,j)+s.slice(j+1);changed=true;break}}
  }
 }
 return s;
}
function parenthesis(ch){
 resetHow();
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(ch==='('){
   if((current&&current!=='-')||(!current&&/[0-9.%)πe!]$/.test(expression)))operator('×');// after a number: 5( → 5×(
   if(current==='-'){expression+=current;current='';currentIsPercent=false}
   if(expression&&/[0-9.)]$/.test(expression))return false;
   expression+='(';
 }else{
   if(current==='-')return false;
   if(current){expression+=current;current='';currentIsPercent=false}
   const opens=(expression.match(/\(/g)||[]).length,closes=(expression.match(/\)/g)||[]).length;
   if(opens<=closes||/[+\-×÷(^]$/.test(expression))return false;
   expression=closeParen(expression);
   // brackets around a single number were dropped: the number is the one being typed again (± and % work on it)
   if(!/\)$/.test(expression)){const m=expression.match(/([-−]?)(\d+(?:\.\d*)?)$/);if(m){const before=expression.slice(0,-m[0].length),num=(m[1]&&(before===''||/[×÷(]$/.test(before))?m[1]:'')+m[2];current=num;expression=expression.slice(0,-num.length)}/* the minus is the number's own at the start or after × ÷ (, otherwise it is subtraction */}
 }
 render();
 return true;
}
function operator(op){
 resetHow();
 if(justCalculated){expression=carryText(lastResult,18);if(resultNegated&&lastResult.n<0n)carry.shown='(−'+fmt(carry.value)+')';// turned negative with ±: (−84)+…
  resultNegated=false;current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(current==='-'&&expression){current=''}
 if(op==='-'&&!current&&/[×÷(^]$/.test(expression)){current='-';render();return}
 if(!current&&!expression){if(op==='-'){current='-';render()}return;}if(!current&&/\($/.test(expression))return;
 if(current){expression+=current;current='';currentIsPercent=false}
 if(/[+\-×÷^]$/.test(expression))expression=expression.slice(0,-1)+op;else expression+=op;
 render()
}
// ± (hold − on the keypad, F9 on a keyboard): flips the sign of the number being typed, or of the result.
// With no number started yet it starts a negative one (the same as − after × or ÷).
function negate(){
 resetHow();
 if(justCalculated){
  if(!lastResult)return;
  const prevShown=lastShown||formatExpressionDisplay(lastExpression);
  carry=null;resultNegated=!resultNegated;lastResult=ratMul(lastResult,rat(-1n));lastExpression='-('+lastExpression+')';lastShown='−('+prevShown+')';lastOperation=null;
  howData=explanationForExpression(lastExpression,lastResult)||{formula:lastShown,steps:[lastShown+' = '+fmt(lastResult)],result:fmt(lastResult)};
  if(howData)howData.formula=lastShown;calcHowData=howData;
  render();return;
 }
 // a minus made here is "−", so the display shows the number in brackets: 5 -> (−5) (formatInputDisplay)
 if(current==='-'||current==='−')current='';
 else if(current)current=/^[-−]/.test(current)?current.slice(1):'−'+current;
 else if(!expression||/[+\-×÷(^]$/.test(expression))current='-';
 else return;
 render();
}
// One "( )" key: closes a parenthesis when one is open and a number was just typed, otherwise opens one (after a number it adds × first).
function smartParen(){
 const full=justCalculated?'':expression+current,open=(full.match(/\(/g)||[]).length-(full.match(/\)/g)||[]).length,afterValue=/[0-9.%)πe!]$/.test(full);
 if(open>0&&afterValue){parenthesis(')');return}
 if(afterValue)operator('×');
 parenthesis('(')
}
function percent(){resetHow();if(!current||currentIsPercent)return;current+='%';currentIsPercent=true;render()}
function parseLastOperation(full){const m=String(full).match(/^(.*?)([+\-×÷])([-−]?\d+(?:[.,]\d+)?%?)$/);return m?{op:m[2],rhs:m[3]}:null}
function repeatEquals(){
 if(!justCalculated||!lastOperation)return false;
 resetHow();
 try{const rhs=lastOperation.rhs,base=carryText(lastResult,24),full=base+lastOperation.op+rhs,value=evalExpr(full);lastExpression=full;lastShown=formatExpressionDisplay(full);lastResult=value;justCalculated=true;resultNegated=false;howData=explanationForExpression(full,value)||{formula:formatExpressionDisplay(full),steps:[`${formatExpressionDisplay(full)} = ${fmt(value)}`],result:fmt(value)};calcHowData=howData;saveHistory({expression:full,result:value,how:howData});render();return true}catch(e){calcError=calcErrorKind(e);render();return true}
}
function equals(){
 if(justCalculated&&repeatEquals())return;
 resetHow();
 let full=expression+current;if(!full||/[+\-×÷^]$/.test(full))return;
 if(/[()]/.test(full)){full=tidyParens(full);expression=full;current=''}// close what is open, drop brackets that change nothing
 if(!full||/[+\-×÷(^]$/.test(full))return;
 try{const value=evalExpr(full);lastExpression=full;lastShown=formatExpressionDisplay(full);lastResult=value;lastOperation=parseLastOperation(full);justCalculated=true;resultNegated=false;currentIsPercent=false;howData=explanationForExpression(full,value)||{formula:formatExpressionDisplay(full),steps:[`${formatExpressionDisplay(full)} = ${fmt(value)}`],result:fmt(value)};saveHistory({expression:full,result:value,how:howData});render()}
 catch(e){calcError=calcErrorKind(e);render()}
}
// ---------- Scientific ----------
// Basic or Scientific is a view of the same calculator (the switch on the display, saved as uc-sci): the same
// calculation, History and explanation. Scientific adds 15 keys above the basic ones (on a phone held sideways,
// beside them). 2nd swaps some keys for their inverse; Deg/Rad sets the angle unit (angleUnit, numbers.js).
let sciMode=store.get('uc-sci')==='1',sciSecond=false;
const SCI_FN={sin:'sin',cos:'cos',tan:'tan',asin:'asin',acos:'acos',atan:'atan',ln:'ln',log:'log',sqrt:'√',cbrt:'∛'};
// [key, its 2nd key] in rows of five; labels from sciLabel
const SCI_KEYS=[['2nd'],['angle'],['sin','asin'],['cos','acos'],['tan','atan'],
 ['sq','cube'],['pow','root'],['sqrt','cbrt'],['ln','exp'],['log','pow10'],
 ['inv'],['fact'],['pi'],['e'],['ee']];
function sciLabel(k){
 return {'2nd':'2nd',angle:angleUnit==='deg'?'Deg':'Rad',sin:'sin',cos:'cos',tan:'tan',asin:'sin⁻¹',acos:'cos⁻¹',atan:'tan⁻¹',
  sq:'x²',cube:'x³',pow:'xʸ',root:'ʸ√x',sqrt:'√x',cbrt:'∛x',ln:'ln',exp:'eˣ',log:'log',pow10:'10ˣ',inv:'1/x',fact:'x!',pi:'π',e:'e',ee:'EE'}[k];
}
function sciAria(k){
 const el={'2nd':'Δεύτερες συναρτήσεις',angle:angleUnit==='deg'?'Μοίρες (πάτα για ακτίνια)':'Ακτίνια (πάτα για μοίρες)',sq:'Τετράγωνο',cube:'Κύβος',pow:'Δύναμη',root:'Ρίζα y τάξης',sqrt:'Τετραγωνική ρίζα',cbrt:'Κυβική ρίζα',inv:'Αντίστροφο',fact:'Παραγοντικό',ee:'Επί 10 εις τη',exp:'e εις τη',pow10:'10 εις τη',ln:'Φυσικός λογάριθμος',log:'Λογάριθμος'};
 const en={'2nd':'Second functions',angle:angleUnit==='deg'?'Degrees (tap for radians)':'Radians (tap for degrees)',sq:'Square',cube:'Cube',pow:'Power',root:'y-th root',sqrt:'Square root',cbrt:'Cube root',inv:'Reciprocal',fact:'Factorial',ee:'Times 10 to the power',exp:'e to the power',pow10:'10 to the power',ln:'Natural logarithm',log:'Logarithm'};
 return (lang==='el'?el:en)[k]||sciLabel(k);
}
function sciKeysHtml(){
 return '<div class="sci-pad">'+SCI_KEYS.map(([k,k2])=>{const key=sciSecond&&k2?k2:k;
  return '<button class="key sci-key'+(k==='2nd'&&sciSecond?' on':'')+'" data-sci="'+key+'" type="button" aria-label="'+esc(sciAria(key))+'"'+(k==='2nd'?' aria-pressed="'+sciSecond+'"':'')+'>'+esc(sciLabel(key))+'</button>'}).join('')+'</div>';
}
// a finished result becomes the start of a new calculation (as when an operator follows it)
// The switch on the display: f(x) turns Scientific on and off; with it on, DEG/RAD shows the angle unit (tap to change).
function renderSciBar(){
 const d=$('#calculatorDisplay');if(!d)return;
 let bar=$('#sciBar');
 if(!bar){bar=document.createElement('div');bar.id='sciBar';bar.className='sci-bar';d.appendChild(bar);
  bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.bar==='sci')toggleSci();else sciKey('angle')})}
 const html='<button class="sci-chip'+(sciMode?' on':'')+'" data-bar="sci" type="button" aria-pressed="'+sciMode+'" aria-label="'+esc(t('scientific'))+'" title="'+esc(t('scientific'))+'">f(x)</button>'+
  (sciMode?'<button class="sci-chip" data-bar="angle" type="button" aria-label="'+esc(sciAria('angle'))+'" title="'+esc(sciAria('angle'))+'">'+(angleUnit==='deg'?'DEG':'RAD')+'</button>':'');
 if(bar.dataset.html!==html){bar.innerHTML=html;bar.dataset.html=html}
}
function toggleSci(){sciMode=!sciMode;sciSecond=false;store.set('uc-sci',sciMode?'1':'0');renderCalcKeypad();render();fitLayout()}
function continueFromResult(){
 expression=carryText(lastResult,18);if(resultNegated&&lastResult.n<0n)carry.shown='(−'+fmt(carry.value)+')';
 resultNegated=false;current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;
}
// where the last complete value at the end of the expression starts (-1 if it ends with an operator or "(")
const FN_BEFORE=/(?:asin|acos|atan|sin|cos|tan|ln|log|√|∛)$/;
function lastValueStart(s){
 if(!s)return -1;let i;
 if(/!$/.test(s)){i=lastValueStart(s.replace(/!+$/,''));}
 else if(/[πe]$/.test(s))i=s.length-1;
 else if(/[0-9.%]$/.test(s)){i=s.length;while(i>0&&/[0-9.%]/.test(s[i-1]))i--;if(/[-−]/.test(s[i-1]||'')&&(i===1||/[×÷(^]/.test(s[i-2])))i--}
 else if(/\)$/.test(s)){let d=0;for(i=s.length-1;i>=0;i--){if(s[i]===')')d++;else if(s[i]==='('&&--d===0)break}if(i<0)return -1;const f=s.slice(0,i).match(FN_BEFORE);if(f)i-=f[0].length}
 else return -1;
 if(i>0&&s[i-1]==='^'){const b=lastValueStart(s.slice(0,i-1));if(b>=0)i=b}// 3^2 is one value: sin(3^2)
 return i;
}
function sciKey(k){
 resetHow();
 if(k==='2nd'){sciSecond=!sciSecond;renderCalcKeypad();fitLayout();return}
 if(k==='angle'){angleUnit=angleUnit==='deg'?'rad':'deg';store.set('uc-angle',angleUnit);renderCalcKeypad();render();return}
 if(justCalculated){if(!lastResult)return;continueFromResult()}
 // a minus waiting for its number ("2×−"): a function or constant can follow it (2×−sin(30)); the rest cannot
 if(current==='-'||current==='−'){if(!SCI_FN[k]&&!['pi','e','exp','pow10','inv'].includes(k))return;expression+='-';current=''}
 else if(current){expression+=current;current='';currentIsPercent=false}
 const start=lastValueStart(expression),value=start>=0?expression.slice(start):'',head=start>=0?expression.slice(0,start):expression;
 const grouped=v=>{if(v[0]!=='(')return false;let d=0;for(let i=0;i<v.length;i++){d+=v[i]==='('?1:v[i]===')'?-1:0;if(d===0)return i===v.length-1}return false};
 const wrap=v=>grouped(v)?v:'('+v+')';
 const plainNumber=v=>/^[0-9.]+$/.test(v);
 // x², xʸ, x! … apply to the whole value: a negative one or a power gets brackets first, (−3)² = 9 and (9²)² = 9⁴
 // (without them −3^2 would be −9 and 9^2^2 would be 9^(2^2))
 const topLevel=v=>{let t=v;for(let u;(u=t.replace(/\([^()]*\)/g,''))!==t;)t=u;return t};
 const whole=v=>/^[-−]/.test(v)||/\^/.test(topLevel(v))?'('+v+')':v;
 if(SCI_FN[k]){expression=value?head+SCI_FN[k]+wrap(value):expression+SCI_FN[k]+'(';}
 else if(k==='exp'||k==='pow10'){const b=k==='exp'?'e':'10';expression=value?head+b+'^'+(plainNumber(value)?value:wrap(value)):expression+b+'^(';}
 else if(k==='inv'){expression=value?head+'(1÷'+(plainNumber(value)||value==='π'||value==='e'?value:wrap(value))+')':expression+'1÷(';}
 else if(k==='pi'||k==='e'){const c=k==='pi'?'π':'e';expression+=(value?'×':'')+c;}
 else if(!value)return;// the rest need a value before them
 else if(k==='sq')expression=head+whole(value)+'^2';
 else if(k==='cube')expression=head+whole(value)+'^3';
 else if(k==='pow')expression=head+whole(value)+'^';
 else if(k==='root')expression=head+whole(value)+'^(1÷';
 else if(k==='fact')expression=head+whole(value)+'!';
 else if(k==='ee')expression+='×10^';
 render();
}
// A key that would make the calculation longer than MAX_INPUT does nothing (with a small shake of the display).
function keepShort(fn){return(...args)=>{const was=[expression,current,currentIsPercent],before=inputLength(),out=fn(...args);
 if(inputLength()>MAX_INPUT&&inputLength()>before){[expression,current,currentIsPercent]=was;refuseKey();render();return false}return out}}
operator=keepShort(operator);parenthesis=keepShort(parenthesis);percent=keepShort(percent);sciKey=keepShort(sciKey);
function renderCalcKeypad(){
 const sci=mode==='calc'&&sciMode;
 $('#keypad').className='keypad'+(sci?' sci':'');
 $('#calculatorCard').classList.toggle('sci-on',sci);
 // The "( )" key is only in Calculator mode; Units keeps its own layout.
 const extra=mode==='calc'||mode==='units',parenLabel=lang==='el'?'Παρενθέσεις':'Parentheses';
 $('#keypad').innerHTML=(sci?sciKeysHtml()+'<div class="basic-pad">':'')+'<button class="key utility" data-action="backspace" type="button" aria-label="'+esc(t('deleteKey'))+'">⌫</button><button id="clearButton" class="key utility" data-action="clear" type="button">AC</button><button class="key utility" data-value="%" type="button">%</button><button class="key operator" data-value="/" type="button">÷</button><button class="key" data-value="7" type="button">7</button><button class="key" data-value="8" type="button">8</button><button class="key" data-value="9" type="button">9</button><button class="key operator" data-value="*" type="button">×</button><button class="key" data-value="4" type="button">4</button><button class="key" data-value="5" type="button">5</button><button class="key" data-value="6" type="button">6</button><button class="key operator" data-value="-" type="button">−</button><button class="key" data-value="1" type="button">1</button><button class="key" data-value="2" type="button">2</button><button class="key" data-value="3" type="button">3</button><button class="key operator" data-value="+" type="button">+</button>'+(extra?'<button class="key utility" data-action="paren" type="button" aria-label="'+esc(parenLabel)+'">( )</button><button class="key" data-value="0" type="button">0</button>':'<button class="key wide" data-value="0" type="button">0</button>')+'<button class="key" data-value="," type="button">,</button><button class="key equals" data-action="equals" type="button">=</button>'+(sci?'</div>':'');
}
function restoreCalculatorDisplay(){
 const d=$('#calculatorDisplay');
 if(!d||!d.querySelector('#expression')||!d.querySelector('#result')){
   d.className='display-wrap';
   d.innerHTML='<div class="expression-row"><div id="expression" class="expression" aria-live="polite"></div><button id="chartButton" class="how-button chart-button hidden" type="button" aria-label="'+esc(t('chart'))+'">'+CHART_ICON+'</button><button id="howButton" class="how-button hidden" type="button" aria-label="'+esc(t('how'))+'">?</button></div><div id="result" class="result" aria-live="polite">0</div>';
   $('#howButton').addEventListener('click',showHow);
   $('#chartButton').addEventListener('click',showToolChart);
 }
 d.classList.remove('unit-display');
}
