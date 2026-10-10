// Calculator mode: what each key does, the display, = and the step-by-step explanation.
// After a result, the next calculation starts from its full-precision value (carry). On screen that value shows rounded, like the result did.
function formatExpressionDisplay(s){
 s=String(s??'');
 if(carry&&carry.raw&&s.startsWith(carry.raw))return carry.shown+formatInputDisplay(s.slice(carry.raw.length));
 return formatInputDisplay(s);
}
let resultNegated=false;// the finished result was turned negative with ± (so carrying it on shows it in brackets)
let lastShown='';// how the finished calculation (lastExpression) is shown above the result

function carryText(r,digits){const abs=r.n<0n?{n:-r.n,d:r.d}:r,raw=ratToDecimal(r,digits);carry={text:ratToDecimal(abs,digits),value:abs,raw,shown:fmt(r),plain:ratToRoundedDecimal(r,6)};return raw}
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

function resetHow(){howData=null;calcHowData=null;$('#howButton')?.classList.add('hidden')}
function render(){
 if(mode!=='calc')return;
 const raw=expression+current;
 const display=current==='Error'?'Error':justCalculated?fmt(lastResult):(raw?formatExpressionDisplay(raw):'0');
 $('#calculatorDisplay').classList.remove('tool-display','tool-empty');
 $('#calculatorDisplay').classList.toggle('calculated',justCalculated);
 $('#expression').textContent=justCalculated?(lastShown||formatExpressionDisplay(lastExpression)):'';
 const exprEl=$('#expression');
 $('#result').textContent=display;
 $('#result').classList.remove('long-value','near-limit');
 const hasEntry=Boolean(raw);
 $('#clearButton').textContent=current&&!justCalculated?'C':'AC';// C clears the number being typed; with none, the key clears everything
 $('#howButton').classList.toggle('hidden',!howData);
 $('#chartButton')?.classList.add('hidden');
 syncFuelButtons();
 requestAnimationFrame(()=>{
   if(exprEl){
     if(justCalculated){
       exprEl.style.fontSize='';
       exprEl.style.letterSpacing='';
       exprEl.scrollLeft=0;
     }else{
       fitDisplayText(exprEl,14);
     }
   }
   const r=$('#result');
   if(r)fitDisplayText(r,32);
 });
}
function clearAll(){carry=null;resultNegated=false;expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;lastOperation=null;resetHow();render()}
function clearCurrent(){resetHow();if(current){current='';currentIsPercent=false;render();return}clearAll()}
function clearButtonAction(){
 if(justCalculated){clearAll();return}

 if(current){clearCurrent();return}
 if(expression){clearAll();return}
 clearAll();
}
function backspace(){resetHow();if(justCalculated){clearAll();return}if(!current&&carry&&expression===carry.raw){expression=carry.plain;carry=null}if(current){current=current.slice(0,-1);if(current==='−')current='-';currentIsPercent=false}else if(expression)expression=expression.slice(0,-1);render()}
function digit(v){
 if(v===',')v='.';
 resetHow();
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 // after a closed bracket or a percent, a new number is multiplied: (8+9)5 → (8+9)×5, 10%5 → 10%×5 (as in Units)
 if(currentIsPercent){expression+=current+'×';current='';currentIsPercent=false}
 else if(!current&&/\)$/.test(expression))expression+='×';
 if(v==='.'&&current.includes('.'))return;
 if(v==='.'&&(!current||current==='-'))current+='0.';else if(current==='0'&&v!=='.')current=v;else current+=v;
 render()
}
// Brackets that change nothing are dropped, so the screen never fills with ((((5)))).
// A pair is useless when it holds only one number – (5), or (−5) after × ÷ ( or at the start –
// or when it holds exactly one other bracket pair – ((2+3)). Brackets with % inside are kept (50+(10%) ≠ 50+10%).
// Works on calculator (× ÷) and Units (* /) expressions.
function uselessParen(inner,before){
 if(/^\d+(?:\.\d*)?$/.test(inner))return true;
 if(/^[-−]\d+(?:\.\d*)?$/.test(inner))return !/[+\-]$/.test(before);
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
 if(/\($/.test(s))s=s.replace(/[(+\-×÷*/]+$/,'');
 let open=(s.match(/\(/g)||[]).length-(s.match(/\)/g)||[]).length;
 for(;open>0;open--)s=closeParen(s);
 for(let changed=true;changed;){
  changed=false;const stack=[];
  for(let j=0;j<s.length;j++){
   if(s[j]==='(')stack.push(j);
   else if(s[j]===')'){const i=stack.pop();if(i===undefined)continue;
    if((i===0&&j===s.length-1)||uselessParen(s.slice(i+1,j),s.slice(0,i))){s=s.slice(0,i)+s.slice(i+1,j)+s.slice(j+1);changed=true;break}}
  }
 }
 return s;
}
function parenthesis(ch){
 resetHow();
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 if(ch==='('){
   if((current&&current!=='-')||(!current&&/[0-9.%)]$/.test(expression)))operator('×');// after a number: 5( → 5×(
   if(current==='-'){expression+=current;current='';currentIsPercent=false}
   if(expression&&/[0-9.)]$/.test(expression))return false;
   expression+='(';
 }else{
   if(current==='-')return false;
   if(current){expression+=current;current='';currentIsPercent=false}
   const opens=(expression.match(/\(/g)||[]).length,closes=(expression.match(/\)/g)||[]).length;
   if(opens<=closes||/[+\-×÷(]$/.test(expression))return false;
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
 if(op==='-'&&!current&&/[×÷(]$/.test(expression)){current='-';render();return}
 if(!current&&!expression){if(op==='-'){current='-';render()}return;}if(!current&&/\($/.test(expression))return;
 if(current){expression+=current;current='';currentIsPercent=false}
 if(/[+\-×÷]$/.test(expression))expression=expression.slice(0,-1)+op;else expression+=op;
 render()
}
// ± (hold − on the keypad, F9 on a keyboard): flips the sign of the number being typed, or of the result.
// With no number started yet it starts a negative one (the same as − after × or ÷).
function negate(){
 if(current==='Error')return;
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
 else if(!expression||/[+\-×÷(]$/.test(expression))current='-';
 else return;
 render();
}
// One "( )" key: closes a parenthesis when one is open and a number was just typed, otherwise opens one (after a number it adds × first).
function smartParen(){
 if(current==='Error')return;
 const full=justCalculated?'':expression+current,open=(full.match(/\(/g)||[]).length-(full.match(/\)/g)||[]).length,afterValue=/[0-9.%)]$/.test(full);
 if(open>0&&afterValue){parenthesis(')');return}
 if(afterValue)operator('×');
 parenthesis('(')
}
function percent(){resetHow();if(!current||currentIsPercent)return;current+='%';currentIsPercent=true;render()}
function parseLastOperation(full){const m=String(full).match(/^(.*?)([+\-×÷])([-−]?\d+(?:[.,]\d+)?%?)$/);return m?{op:m[2],rhs:m[3]}:null}
function repeatEquals(){
 if(!justCalculated||!lastOperation)return false;
 try{const rhs=lastOperation.rhs,base=carryText(lastResult,24),full=base+lastOperation.op+rhs,value=evalExpr(full);lastExpression=full;lastShown=formatExpressionDisplay(full);lastResult=value;justCalculated=true;resultNegated=false;howData=explanationForExpression(full,value)||{formula:formatExpressionDisplay(full),steps:[`${formatExpressionDisplay(full)} = ${fmt(value)}`],result:fmt(value)};calcHowData=howData;saveHistory({expression:full,result:value,how:howData});render();return true}catch{return false}
}
function equals(){
 if(justCalculated&&repeatEquals())return;
 let full=expression+current;if(!full||/[+\-×÷]$/.test(full))return;
 if(/[()]/.test(full)){full=tidyParens(full);expression=full;current=''}// close what is open, drop brackets that change nothing
 if(!full||/[+\-×÷(]$/.test(full))return;
 try{const value=evalExpr(full);lastExpression=full;lastShown=formatExpressionDisplay(full);lastResult=value;lastOperation=parseLastOperation(full);justCalculated=true;resultNegated=false;currentIsPercent=false;howData=explanationForExpression(full,value)||{formula:formatExpressionDisplay(full),steps:[`${formatExpressionDisplay(full)} = ${fmt(value)}`],result:fmt(value)};saveHistory({expression:full,result:value,how:howData});render()}
 catch{current='Error';currentIsPercent=false;render();setTimeout(()=>{if(current==='Error'){current='';render()}},900)}
}
function renderCalcKeypad(){
 $('#keypad').className='keypad';
 // The "( )" key is only in Calculator mode; Units keeps its own layout.
 const extra=mode==='calc'||mode==='units',parenLabel=lang==='el'?'Παρενθέσεις':'Parentheses';
 $('#keypad').innerHTML='<button class="key utility" data-action="backspace" type="button" aria-label="'+esc(t('deleteKey'))+'">⌫</button><button id="clearButton" class="key utility" data-action="clear" type="button">AC</button><button class="key utility" data-value="%" type="button">%</button><button class="key operator" data-value="/" type="button">÷</button><button class="key" data-value="7" type="button">7</button><button class="key" data-value="8" type="button">8</button><button class="key" data-value="9" type="button">9</button><button class="key operator" data-value="*" type="button">×</button><button class="key" data-value="4" type="button">4</button><button class="key" data-value="5" type="button">5</button><button class="key" data-value="6" type="button">6</button><button class="key operator" data-value="-" type="button">−</button><button class="key" data-value="1" type="button">1</button><button class="key" data-value="2" type="button">2</button><button class="key" data-value="3" type="button">3</button><button class="key operator" data-value="+" type="button">+</button>'+(extra?'<button class="key utility" data-action="paren" type="button" aria-label="'+esc(parenLabel)+'">( )</button><button class="key" data-value="0" type="button">0</button>':'<button class="key wide" data-value="0" type="button">0</button>')+'<button class="key" data-value="," type="button">,</button><button class="key equals" data-action="equals" type="button">=</button>';
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
