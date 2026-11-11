// Calculator mode: what each key does, the display, = and the step-by-step explanation.
// After a result, the next calculation starts from its full-precision value (carry). On screen that value shows rounded, like the result did.
// Every minus on the Calculator's display and in its working is the long one (−), the same size as + (minusSign).
function formatExpressionDisplay(s){return minusSign(expressionShown(s)).replace(/([×÷+−])(\u0007?)−(\u0007?)$/,'$1$2(−$3')}// 25− then − : 25−(−
function expressionShown(s){
 s=String(s??'');
 if(s.includes('⟪⟫'))return formatInputDisplay(s.replace(/⟪⟫/g,'\u0005')).replace(/\u0005/g,carryCx?'('+fmtCx(carryCx,'rect').replace(/\s+/g,'')+')':'');// a complex result carried on, written like a typed one: (5+5i)
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
function inputLength(){const s=typedText();return s.length-(carry&&carry.raw&&s.includes(carry.raw)?carry.raw.length-1:0)}
// ---------- The cursor ----------
// Tapping the calculation (or ← → on a keyboard) puts a cursor in it, to add or delete something forgotten. What is
// before the cursor is expression + current as always, so every key works there as it does at the end; what is after
// it waits in caretTail. Where the two meet, a × is added between two values ((5+5) after 2 → 2×(5+5)) and an operator
// typed before another replaces it (5|+3, then × → 5×3); caretTo makes that real when the cursor moves. = works out
// the whole calculation; =, AC, a result and leaving the mode drop the cursor, and it hides when it goes back to the end.
let caretTail='',caretOn=false;
// a carried result (carry.raw) at the meeting point counts as a whole value, never as digits to join
function carryAt(s,i){if(!carry?.raw)return false;const c=s.indexOf(carry.raw);return c>=0&&(c===i||c+carry.raw.length===i)}
const VALUE_START=new RegExp('^(?:[(πeφ⟨⟪i√∛\\d.]|(?:'+FN_ALT+')\\()');
function typedText(mark){
 const h=expression+current;let t=caretTail;
 if(!t)return h+(mark?CARET:'');
 if(OP_END.test(h)&&/^[+×÷^CPm∠]/.test(t))t=t.slice(1);// the operator just typed replaces the one after the cursor
 const s=h+t,times=VALUE_END.test(h)&&VALUE_START.test(t)&&!(/[\d.]$/.test(h)&&/^[\d.]/.test(t)&&!carryAt(s,h.length));
 return h+(mark?CARET:'')+(times?'×':'')+t;
}
// the places the cursor can stand in s: never inside a function's name, a constant, a carried result or a power's digits
function caretStops(s){
 const no=new Set(),block=(a,b)=>{for(let k=a+1;k<b;k++)no.add(k)};
 for(const m of s.matchAll(new RegExp('(?:'+FN_ALT+')\\(|⟨\\w+⟩|⟪⟫|\\^[-−]?\\d+','g')))block(m.index,m.index+m[0].length);
 if(carry?.raw){const c=s.indexOf(carry.raw);if(c>=0)block(c,c+carry.raw.length)}
 const out=[];for(let k=0;k<=s.length;k++)if(!no.has(k))out.push(k);
 return out;
}
// puts the cursor at index k of the whole calculation: what is before it becomes expression + the number being typed
function caretTo(k){
 const s=typedText();k=Math.max(0,Math.min(s.length,k));
 const head=s.slice(0,k);caretTail=s.slice(k);currentIsPercent=false;
 const m=head.match(/([-−]?)(\d+(?:\.\d*)?%?)$/);
 if(carry?.raw&&head.endsWith(carry.raw)&&carryAt(s,k)){expression=head;current=''}
 else if(m){const before=head.slice(0,-m[0].length),own=m[1]==='−'||m[1]==='-'&&(before===''||/[×÷(^CPm∠]$/.test(before));current=(own?m[1]:'')+m[2];expression=head.slice(0,head.length-current.length);currentIsPercent=current.endsWith('%')}
 else if(/(?:^|[×÷(^CPm∠])[-−]$/.test(head)){expression=head.slice(0,-1);current=head.slice(-1)}
 else{expression=head;current=''}
 caretOn=k<s.length;// at the end there is nothing to edit around: the cursor hides (a tap at the end, End, → to the end)
}
function dropCaret(){if(caretTail||caretOn){if(caretTail)caretTo(Infinity);caretTail='';caretOn=false}}
// ← → (and Home, End) move the cursor one place
function moveCaret(dir){
 if(mode!=='calc'||justCalculated||calcError)return false;
 const s=typedText();if(!s)return false;
 const at=(expression+current).length,stops=caretStops(s);
 const k=dir==='home'?0:dir==='end'?s.length:dir<0?[...stops].reverse().find(x=>x<at):stops.find(x=>x>at);
 if(k===undefined){refuseKey();return true}
 resetHow();caretTo(k);render();return true;
}
// a tap on the calculation: the cursor goes to the place nearest the finger
function caretFromPoint(x){
 const el=$('#result'),s=typedText();if(!el||!s)return;
 const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),texts=[];for(let n;(n=node.nextNode());)texts.push(n);
 const xAt=i=>{for(const n of texts){if(i<=n.length){const r=document.createRange();r.setStart(n,i);r.collapse(true);const b=r.getClientRects()[0]||r.getBoundingClientRect();return b.left}i-=n.length}return null};
 let best=null,bestD=Infinity;
 for(const k of caretStops(s)){
  const shown=formatExpressionDisplay(s.slice(0,k)+CARET+s.slice(k)),i=shown.indexOf(CARET),px=xAt(i);
  if(px==null)continue;const d=Math.abs(px-x);if(d<bestD){bestD=d;best=k}
 }
 if(best===null)return;
 resetHow();caretTo(best);render();
}
// ")" with nothing open, or ( ) after a calculation with nothing open: the brackets go around everything before the
// cursor, 5+5 → (5+5), so a forgotten bracket needs no retyping. Only when they group something (an operator outside brackets).
function topOperator(s){let d=0;for(let i=0;i<s.length;i++){const c=s[i];if(c==='('||c==='⟨')d++;else if(c===')'||c==='⟩')d--;else if(d===0&&i>0&&'+-×÷*/^CPm∠'.includes(c)&&!/[×÷*/(^CPm∠]/.test(s[i-1]))return true}return false}// also Units' * and /
function wrapAll(){
 const h=expression+current,open=(h.match(/\(/g)||[]).length-(h.match(/\)/g)||[]).length;
 if(justCalculated||calcError||open>0||!VALUE_END.test(h)||!topOperator(h))return false;
 expression='('+h+')';current='';currentIsPercent=false;return true;
}

// the result as the screen shows it: with up to 10 decimals when the display had room for them, else as fmt
function shownResult(r){const el=$('#result'),f=fmt(r);return el&&el.dataset.short===minusSign(f)&&el.textContent===el.dataset.long?el.dataset.long.replace(/−/g,'-'):f}
function carryText(r,digits){const abs=r.n<0n?{n:-r.n,d:r.d}:r,places=digits+Math.max(0,r.d.toString().length-abs.n.toString().length),raw=ratToDecimal(r,places);/* tiny values keep their digits too */carry={text:ratToDecimal(abs,places),value:abs,raw,shown:shownResult(r)};carry.plain=/×/.test(carry.shown)?'':ratToRoundedDecimal(r,(carry.shown.split(',')[1]||'').length||6);/* what ⌫ edits; one shown as × 10ⁿ is deleted whole */return raw}
// explanationForExpression (the working under ?) is in explain.js
function resetHow(){memFresh=false;calcError='';howData=null;calcHowData=null;$('#howButton')?.classList.add('hidden')}
function render(){refreshSide();
 if(mode!=='calc')return;
 renderSciBar();
 if(justCalculated){caretTail='';caretOn=false}
 const raw=typedText();if(!raw)caretOn=false;
 const withCaret=caretOn&&!justCalculated&&!calcError?formatExpressionDisplay(typedText(true)).split(CARET):null;
 const display=calcError?t(ERROR_TEXT[calcError]||'errMath'):justCalculated?minusSign(fmt(lastResult)):(raw?formatExpressionDisplay(raw):'0');
 $('#calculatorDisplay').classList.remove('tool-display','tool-empty');
 $('#calculatorDisplay').classList.toggle('calculated',justCalculated);
 $('#calculatorDisplay').classList.toggle('error',Boolean(calcError));
 $('#expression').textContent=justCalculated?(lastShown||formatExpressionDisplay(lastExpression)):calcError?formatExpressionDisplay(raw):'';
 const exprEl=$('#expression');
 if(withCaret)$('#result').innerHTML=esc(withCaret[0])+'<span class="caret" aria-hidden="true"></span>'+esc(withCaret[1]);
 else $('#result').textContent=display;
 $('#calculatorDisplay').classList.toggle('editing',Boolean(withCaret));
 $('#result').classList.remove('long-value','near-limit');
 // a result with more decimals than shown: up to 10 when the display has room (fitDisplayText picks)
 const longer=justCalculated&&!calcError&&!isCx(lastResult)&&lastResult?.n!==undefined?formatRatLong(lastResult):'';
 if(longer&&minusSign(longer)!==display&&!longer.includes('×')){$('#result').dataset.long=minusSign(longer);$('#result').dataset.short=display}
 else{delete $('#result').dataset.long;delete $('#result').dataset.short}
 $('#clearButton').textContent=raw&&!justCalculated&&!calcError?'C':'AC';// C while anything is typed (it clears the number being typed, else everything); AC after a result, an error or with nothing
 $('#howButton').classList.toggle('hidden',!howData?.steps?.length);// nothing to explain: no ?
 $('#chartButton')?.classList.add('hidden');
 const alt=renderResultAlt(raw);
 requestAnimationFrame(()=>{
   // too long to fit: the text gets smaller, then shows its end (what was typed last); the start fades out
   if(exprEl)fitDisplayText(exprEl,12,true);
   const r=$('#result');
   if(r)fitDisplayText(r,alt?26:32,!justCalculated&&!calcError);
   if(alt)fitDisplayText(alt,11,false);
 });
}
// Complex numbers show both forms at once, with no button to press: the result (a + bi) and under it r ∠ θ. While a
// calculation with i or ∠ is typed, the line under it shows its value as it stands (= 5 − i · 5,09902 ∠ −11,309932°),
// the a + bi part left out when it is just what was typed (98 + 25i shows only 101,138519 ∠ 14,31°). Real calculations
// never get the line. #resultAlt sits under #result in the Calculator only (renderTool removes it in other modes).
function complexTyped(raw){return /i|∠|⟪⟫/.test(String(raw).replace(new RegExp(FN_ALT,'g'),'').replace(/⟨\w+⟩/g,''))}
// what is typed, made ready to work out: operators and functions still open at the end left out, open brackets closed
function liveText(raw){
 let s=raw.replace(new RegExp('(?:[+\\-−×÷^(CPm∠]|(?:'+FN_ALT+')\\()+$'),'');if(!s)return '';
 const open=(s.match(/\(/g)||[]).length-(s.match(/\)/g)||[]).length;if(open>0)s+=')'.repeat(open);
 return tidyParens(s);
}
function liveValue(raw){const s=liveText(raw);if(!s)return null;try{return evalExpr(s)}catch{return null}}
// The live result: while a real calculation is typed, its value as it stands, without pressing = (like Pixel's
// calculator): grey, above the calculation, no = sign. None for a number alone, an error (5 ÷ 0 shows nothing until =)
// or one too large. = does what it always did; the live result grows into the result (liveGrow).
function livePreviewText(raw){
 if(!raw||complexTyped(raw))return '';
 const s=liveText(raw);if(!s||PLAIN_NUMBER.test(s))return '';
 let v;try{v=evalExpr(s)}catch{return ''}
 if(v==null||isCx(v))return '';
 const f=minusSign(fmt(v));
 return f;
}
const plainCx=s=>String(s).replace(/\s/g,'').replace(/−/g,'-');
function renderResultAlt(raw){
 const r=$('#result'),d=$('#calculatorDisplay');if(!r)return null;
 let alt=$('#resultAlt');
 let text='',live=false;
 if(!calcError){
  if(justCalculated){if(isCx(lastResult))text=fmtCx(lastResult,'polar')}
  else if(raw&&complexTyped(raw)){
   const v=liveValue(raw);
   if(v!==null){const rect=fmt(v);text=isCx(v)?(plainCx(rect)===plainCx(formatExpressionDisplay(raw))?'':'= '+rect+'  ·  ')+fmtCx(v,'polar'):'= '+rect}
  }
  else if(raw&&!justCalculated){text=livePreviewText(raw);live=Boolean(text)}
 }
 d?.classList.toggle('has-live',live);
 if(!text){alt?.remove();d?.classList.remove('has-alt');return null}
 if(!alt){alt=document.createElement('div');alt.id='resultAlt';alt.className='result-alt'}
 if(live){if(alt.nextElementSibling!==r)r.before(alt)}else if(r.nextElementSibling!==alt)r.after(alt);// the live result above the calculation, r ∠ θ under it
 alt.textContent=text;d?.classList.toggle('has-alt',!live);
 return alt;
}
function clearAll(){caretTail='';caretOn=false;carry=null;resultNegated=false;expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;lastOperation=null;resetHow();render()}
// C clears the number being typed (with the cursor in it: the whole number, both sides); a second C, or C with no number, everything
function clearCurrent(){resetHow();if(current){if(/\d/.test(current))caretTail=caretTail.replace(/^[\d.]+%?/,'');current='';currentIsPercent=false;render();return}clearAll()}
function clearButtonAction(){
 if(justCalculated||calcError){clearAll();return}// the key shows AC then
 clearCurrent();
}
function backspace(){resetHow();if(justCalculated){clearAll();return}if(!expression&&!current&&caretTail){refuseKey();return}/* the cursor is at the start */if(!current&&carry&&expression===carry.raw){expression=carry.plain;carry=null}if(current){current=current.slice(0,-1);if(current==='−')current='-';currentIsPercent=false}else if(expression){const f=expression.match(FN_OPEN_END)||expression.match(/⟨\w+⟩$|⟪⟫$/);expression=expression.slice(0,-(f?f[0].length:1))}if(!current&&expression&&!(carry?.raw&&expression.endsWith(carry.raw)))caretTo(expression.length);render()}
function digit(v){
 if(v===',')v='.';
 if(memFresh&&current&&!justCalculated){current='';currentIsPercent=false}// after MR, M+ …: a new number
 // a digit right after a carried result edits the number as it is shown (0,3333333333 then 5 → 0,33333333335); one shown
 // as × 10ⁿ is a value of its own, so the digit is multiplied
 if(!justCalculated&&!current&&carry?.raw&&expression.endsWith(carry.raw)&&expression.indexOf(carry.raw)===expression.length-carry.raw.length){
  if(carry.plain){expression=expression.slice(0,-carry.raw.length);current=carry.plain;carry=null}else expression+='×'}
 const after=justCalculated||carryAt(typedText(),(expression+current).length)?'':(caretTail.match(/^[\d.]+/)||[''])[0];// the same number goes on after the cursor
 if(!justCalculated&&(digitCount(current+after)>=MAX_DIGITS&&!currentIsPercent||inputLength()>=MAX_INPUT)){refuseKey();return}// 15 digits a number, 150 characters
 if(v==='.'&&after.includes('.')){refuseKey();return}
 resetHow();
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null}
 // after a closed bracket or a percent, a new number is multiplied: (8+9)5 → (8+9)×5, 10%5 → 10%×5 (as in Units)
 if(currentIsPercent){expression+=current+'×';current='';currentIsPercent=false}
 else if(!current&&/[)πeφ⟩⟫i!]$/.test(expression))expression+='×';
 if(v==='.'&&current.includes('.'))return;
 if(v==='.'&&(!current||current==='-'))current+='0.';else if(current==='0'&&v!=='.')current=v;else current+=v;
 render()
}
// Brackets that change nothing are dropped, so the screen never fills with ((((5)))).
// A pair is useless when it holds only one number – (5), or (−5) after × ÷ ( or at the start when no power or ! follows –
// or when it holds exactly one other bracket pair – ((2+3)). Brackets with % inside are kept (50+(10%) ≠ 50+10%).
// Works on calculator (× ÷) and Units (* /) expressions.
function uselessParen(inner,before,after=''){
 if(FN_END.test(before)&&!(inner[0]==='('&&inner.at(-1)===')'))return false;// sin(5) keeps its brackets
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
 if(/\($/.test(s))s=s.replace(new RegExp('(?:[(+\\-×÷*/^CPm]|(?:'+FN_ALT+'))+$'),'');
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
   if((current&&current!=='-')||(!current&&VALUE_END.test(expression)))operator('×');// after a number: 5( → 5×(
   if(current==='-'){expression+=current;current='';currentIsPercent=false}
   if(expression&&/[0-9.)]$/.test(expression))return false;
   expression+='(';
 }else{
   if(current==='-')return false;
   if(wrapAll()){render();return true}// nothing open: around everything before it, 5+5 → (5+5)
   if(current){expression+=current;current='';currentIsPercent=false}
   const opens=(expression.match(/\(/g)||[]).length,closes=(expression.match(/\)/g)||[]).length;
   if(opens<=closes||OP_OPEN_END.test(expression))return false;
   expression=closeParen(expression);
   // brackets around a single number were dropped: the number is the one being typed again (± and % work on it)
   if(!/\)$/.test(expression)){const m=expression.match(/([-−]?)(\d+(?:\.\d*)?)$/);if(m){const before=expression.slice(0,-m[0].length),num=(m[1]&&(before===''||/[×÷(]$/.test(before))?m[1]:'')+m[2];current=num;expression=expression.slice(0,-num.length)}/* the minus is the number's own at the start or after × ÷ (, otherwise it is subtraction */}
 }
 render();
 return true;
}
function operator(op){
 resetHow();
 if(justCalculated)continueFromResult();// the result goes on: 84+…
 if(current==='-'&&expression){current=''}
 if(op==='-'&&!current&&/[×÷(^CPm]$/.test(expression)){current='-';render();return}
 if(!current&&!expression){if(op==='-'){current='-';render()}return;}if(!current&&/\($/.test(expression))return;
 if(current){expression+=current;current='';currentIsPercent=false}
 if(OP_END.test(expression))expression=expression.slice(0,-1)+op;else expression+=op;
 render()
}
// ± (hold − on the keypad, F9 or Shift + − on a keyboard): flips the sign of the number being typed, or of the result.
// With no number started yet it starts a negative one (the same as − after × or ÷).
function negate(){
 resetHow();
 if(justCalculated){
  if(!lastResult)return;
  const prevShown=lastShown||formatExpressionDisplay(lastExpression);
  carry=null;resultNegated=!resultNegated;lastResult=vNeg(lastResult);lastExpression='-('+lastExpression+')';lastShown='−('+prevShown+')';lastOperation=null;
  howData=explanationForExpression(lastExpression,lastResult)||{formula:lastShown,steps:[lastShown+' = '+fmt(lastResult)],result:howResult(lastResult)};
  if(howData&&!howData.spaced)howData.formula=lastShown;calcHowData=howData;
  render();return;
 }
 // ± writes real brackets, which edit like typed ones: 15 → (−15), a digit after them is multiplied, ⌫ takes them apart;
 // ± again on (−15) takes them off. Inside a bracket just opened it only adds the sign: ( 5 → (−5. The minus is "−".
 const room=n=>{if(inputLength()+n>MAX_INPUT){refuseKey();return false}return true};
 const wrapped=!current&&expression.match(/\(([-−])(\d+(?:\.\d*)?%?)\)$/);
 if(wrapped){expression=expression.slice(0,-wrapped[0].length);current=wrapped[2];currentIsPercent=current.endsWith('%')}
 else if(current==='-'||current==='−'){if(current==='−'&&expression.endsWith('('))expression=expression.slice(0,-1);current=''}
 else if(/^[-−]/.test(current))current=current.slice(1);
 else if(current){
  if(expression.endsWith('('))current='−'+current;
  else{const rest=carryAt(typedText(),(expression+current).length)?'':(caretTail.match(/^[\d.]+%?/)||[''])[0];// the whole number, also what is after the cursor
   if(!room(3))return;expression+='(−'+current+rest+')';current='';currentIsPercent=false;caretTail=caretTail.slice(rest.length)}
 }
 else if(!expression||OP_OPEN_END.test(expression)){if(expression.endsWith('('))current='−';else{if(!room(2))return;expression+='(';current='−'}}
 else return;
 render();
}
// One "( )" key: closes a parenthesis when one is open and a number was just typed; after a calculation with none open it
// puts the brackets around it (5+5 → (5+5), wrapAll); otherwise opens one (after a single value it adds × first: 5 → 5×().
function smartParen(){
 const full=justCalculated?'':expression+current,open=(full.match(/\(/g)||[]).length-(full.match(/\)/g)||[]).length,afterValue=VALUE_END.test(full);
 if(open>0&&afterValue){parenthesis(')');return}
 if(afterValue&&inputLength()+2<=MAX_INPUT&&wrapAll()){resetHow();render();return}
 if(afterValue)operator('×');
 parenthesis('(')
}
function percent(){resetHow();if(!current||currentIsPercent)return;current+='%';currentIsPercent=true;render()}
function parseLastOperation(full){const m=String(full).match(/^(.*?)([+\-×÷])([-−]?\d+(?:[.,]\d+)?%?)$/);return m?{op:m[2],rhs:m[3]}:null}
function repeatEquals(){
 if(!justCalculated||!lastOperation)return false;
 resetHow();
 try{const rhs=lastOperation.rhs,base=isCx(lastResult)?(carryCx=lastResult,carry=null,'⟪⟫'):carryText(lastResult,24),full=base+lastOperation.op+rhs,value=evalExpr(full);lastExpression=full;lastShown=formatExpressionDisplay(full);lastResult=value;justCalculated=true;resultNegated=false;howData=explanationForExpression(full,value)||{formula:formatExpressionDisplay(full),steps:[`${formatExpressionDisplay(full)} = ${fmt(value)}`],result:howResult(value)};calcHowData=howData;saveHistory({expression:full,result:value,how:howData});render();return true}catch(e){calcError=calcErrorKind(e);render();return true}
}
const PLAIN_NUMBER=/^[-−]?\d*\.?\d*$/;
function equals(){
 // = again repeats the last operation (2+3 = 5, = 8); with none to repeat (2×(3+4), 5%) it does nothing: no second History entry
 if(justCalculated){repeatEquals();return}
 const was=[expression,current,currentIsPercent,caretTail,caretOn],back=()=>{if(was[3]){[expression,current,currentIsPercent,caretTail,caretOn]=was;refuseKey();render()}};
 dropCaret();// the whole calculation, also what is after the cursor
 let full=expression+current;if(!full||OP_END.test(full)){back();return}
 if(/[()]/.test(full)){full=tidyParens(full);expression=full;current=''}// close what is open, drop brackets that change nothing
 if(!full||OP_OPEN_END.test(full)){back();return}
 if(PLAIN_NUMBER.test(full)){if(full!==was[0]+was[1]+was[3]){expression='';current=full;currentIsPercent=false}else[expression,current,currentIsPercent,caretTail,caretOn]=was;render();return}// a number alone is no calculation: nothing to save (brackets round it still go)
 resetHow();const from=$('#calculatorDisplay')?.classList.contains('has-live')?$('#resultAlt')?.getBoundingClientRect():null;
 try{const value=evalExpr(full);lastExpression=full;lastShown=formatExpressionDisplay(full);lastResult=value;lastOperation=parseLastOperation(full);justCalculated=true;resultNegated=false;currentIsPercent=false;howData=explanationForExpression(full,value)||{formula:formatExpressionDisplay(full),steps:[`${formatExpressionDisplay(full)} = ${fmt(value)}`],result:howResult(value)};saveHistory({expression:full,result:value,how:howData});render();if(from)liveGrow(from)}
 catch(e){calcError=calcErrorKind(e);render()}
}
// on =, the live result (where it stood, from) grows into the result
function liveGrow(from){
 const r=$('#result');if(!r?.animate||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{// after fitDisplayText has sized it
  const to=r.getBoundingClientRect(),z=window.__uiZoom||1;if(!to.height||!from.height)return;
  r.style.transformOrigin='100% 100%';
  r.animate([{transform:`translateY(${(from.bottom-to.bottom)/z}px) scale(${Math.min(1,from.height/to.height)})`,opacity:.6},{transform:'none',opacity:1}],{duration:220,easing:'cubic-bezier(.2,.7,.3,1)'});
 }));
}
// ---------- Scientific ----------
// Basic or Scientific is a view of the same calculator (the switch on the display, saved as uc-sci): the same
// calculation, History and explanation. Scientific adds the memory keys and 24 more above the basic ones (on a phone held
// sideways, beside them), and ± takes the place of ( ) (the brackets are keys of their own there). 2nd swaps some keys for their inverse; Deg/Rad sets the angle unit (angleUnit, numbers.js).
let sciMode=store.get('uc-sci')==='1',sciSecond=false;
// every function (numbers.js FN_NAMES) by its own name, plus √ and ∛ as keys
const SCI_FN={...Object.fromEntries(FN_NAMES.map(n=>[n,n])),sqrt:'√',cbrt:'∛',log2:'log₂'};
let sciHyp=false;// hyp: sin, cos, tan become sinh, cosh, tanh (and their inverses with 2nd)
// [key, its 2nd key] in rows of six under the memory keys (labels from sciLabel)
const SCI_KEYS=[['2nd'],['angle'],['sin','asin'],['cos','acos'],['tan','atan'],['hyp'],
 ['sq','cube'],['pow','root'],['sqrt','cbrt'],['ln','exp'],['log','pow10'],['log2','pow2'],
 ['open'],['close'],['inv'],['fact'],['pi'],['e'],
 ['ee'],['ncr','npr'],['mod','abs'],['i'],['polar','rand'],['more']];
// Sideways the keys stand beside the basic ones in five rows (the memory keys the first column): each key's row and column
// there (styles.css places them with --lr/--lc); ⋯ is two columns wide.
const SCI_LAND=[['2nd','angle','hyp','open','close'],['sin','cos','tan','inv','fact'],['sq','pow','sqrt','pi','e'],
 ['ln','log','log2','ee','i'],['ncr','mod','polar','more']];
const SCI_LAND_AT=Object.fromEntries(SCI_LAND.flatMap((row,r)=>row.map((k,c)=>[k,[r+1,c+2]])));
// a function's name on a key: asin -> sin⁻¹, asinh -> sinh⁻¹
const fnLabel=n=>/^a(?:sin|cos|tan|cot|sec|csc)h?$/.test(n)?n.slice(1)+'⁻¹':n;
// Key labels are the same in both languages, as on calculators (the owner's choice: hyp, 2nd, Deg, EE stay in Greek);
// the aria-label says in words what a key does (sciAria).
function sciLabel(k){
 return {'2nd':'2nd',angle:angleUnit==='deg'?'Deg':'Rad',sin:'sin',cos:'cos',tan:'tan',asin:'sin⁻¹',acos:'cos⁻¹',atan:'tan⁻¹',
  sq:'x²',cube:'x³',pow:'xʸ',root:'ʸ√x',sqrt:'√x',cbrt:'∛x',ln:'ln',exp:'eˣ',log:'log',pow10:'10ˣ',log2:'log₂',pow2:'2ˣ',rand:'Rand',open:'(',close:')',inv:'1/x',fact:'x!',pi:'π',e:'e',ee:'EE',
  hyp:'hyp',ncr:'nCr',npr:'nPr',mod:'mod',abs:'|x|',phi:'φ',more:'⋯',i:'i',polar:'∠'}[k]??fnLabel(k);
}
function sciAria(k){
 const el={i:'Φανταστική μονάδα i',polar:'Πολική μορφή: μέτρο ∠ γωνία',hyp:'Υπερβολικές συναρτήσεις',ncr:'Συνδυασμοί (nCr)',npr:'Διατάξεις (nPr)',mod:'Υπόλοιπο διαίρεσης (mod)',abs:'Απόλυτη τιμή',phi:'Χρυσή τομή φ',more:'Περισσότερες συναρτήσεις και σταθερές','2nd':'Δεύτερες συναρτήσεις',angle:angleUnit==='deg'?'Μοίρες (πάτα για ακτίνια)':'Ακτίνια (πάτα για μοίρες)',sq:'Τετράγωνο',cube:'Κύβος',pow:'Δύναμη',root:'y-οστή ρίζα',sqrt:'Τετραγωνική ρίζα',cbrt:'Κυβική ρίζα',inv:'Αντίστροφο',fact:'Παραγοντικό',ee:'Επί 10 εις τη δύναμη',exp:'e εις τη δύναμη',pow10:'10 εις τη δύναμη',ln:'Φυσικός λογάριθμος',log:'Λογάριθμος',log2:'Λογάριθμος με βάση 2',pow2:'2 εις τη δύναμη',rand:'Τυχαίος αριθμός από 0 έως 1',open:'Άνοιγμα παρένθεσης',close:'Κλείσιμο παρένθεσης',pi:'Πι',e:'Ο αριθμός e'};
 const en={i:'Imaginary unit i',polar:'Polar form: size ∠ angle',hyp:'Hyperbolic functions',ncr:'Combinations (nCr)',npr:'Permutations (nPr)',mod:'Remainder (mod)',abs:'Absolute value',phi:'Golden ratio φ',more:'More functions and constants','2nd':'Second functions',angle:angleUnit==='deg'?'Degrees (tap for radians)':'Radians (tap for degrees)',sq:'Square',cube:'Cube',pow:'Power',root:'y-th root',sqrt:'Square root',cbrt:'Cube root',inv:'Reciprocal',fact:'Factorial',ee:'Times 10 to the power',exp:'e to the power',pow10:'10 to the power',ln:'Natural logarithm',log:'Logarithm',log2:'Logarithm base 2',pow2:'2 to the power',rand:'Random number from 0 to 1',open:'Open bracket',close:'Close bracket',pi:'Pi',e:'Euler’s number e'};
 const ft=typeof FN_TITLE!=='undefined'&&FN_TITLE[k];// sin: Ημίτονο / Sine (explain.js)
 return (lang==='el'?el:en)[k]||(ft&&ft[lang==='el'?0:1])||sciLabel(k);
}
function sciKeysHtml(){
 return '<div class="sci-pad"><div class="mem-row">'+memKeysHtml()+'</div>'+SCI_KEYS.map(([k,k2])=>{let key=sciSecond&&k2?k2:k;if(sciHyp&&/^a?(sin|cos|tan)$/.test(key))key+='h';
  const on=k==='2nd'&&sciSecond||k==='hyp'&&sciHyp,toggle=k==='2nd'||k==='hyp',[lr,lc]=SCI_LAND_AT[k];
  return '<button class="key sci-key'+(on?' on':'')+(k==='more'?' land-wide':'')+([...sciLabel(key)].length>4?' long':'')+'" data-sci="'+key+'" style="--lr:'+lr+';--lc:'+lc+'" type="button" aria-label="'+esc(sciAria(key))+'"'+(toggle?' aria-pressed="'+on+'"':'')+'>'+esc(sciLabel(key))+'</button>'}).join('')+'</div>';
}
// Rand: a random number from 0 to 1 with 10 decimals, typed in like a number (as MR types the memory)
function randomText(){let d='';try{const a=new Uint32Array(2);crypto.getRandomValues(a);d=String((a[0]%100000)*100000+a[1]%100000)}catch{d=String(Math.floor(Math.random()*1e10))}
 return ('0.'+d.padStart(10,'0')).replace(/0+$/,'').replace(/\.$/,'')}
function typeRandom(){
 if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;carry=null}
 if(currentIsPercent){expression+=current+'×';current='';currentIsPercent=false}
 else if(!current&&VALUE_END.test(expression))expression+='×';// after a value: 5 × 0,123…
 else if(current==='-'||current==='−'){expression+='-';current=''}// a minus waiting for its number (a number being typed is replaced, as by MR)
 current=randomText();render();
}
// a finished result becomes the start of a new calculation (as when an operator follows it)
// The switch on the display: f(x) turns Scientific on and off. (The angle unit is the Deg/Rad key on the keypad.)
function renderSciBar(){
 const d=$('#calculatorDisplay');if(!d)return;
 let bar=$('#sciBar');
 if(!bar){bar=document.createElement('div');bar.id='sciBar';bar.className='sci-bar';d.appendChild(bar);
  bar.addEventListener('click',e=>{if(e.target.closest('[data-bar="sci"]'))toggleSci();else if(e.target.closest('[data-bar="mr"]'))memKey('mr')})}
 const html='<button class="sci-chip'+(sciMode?' on':'')+'" data-bar="sci" type="button" aria-pressed="'+sciMode+'" aria-label="'+esc(t('scientific'))+'" title="'+esc(t('scientific'))+'">f(x)</button>'+memChipHtml();
 if(bar.dataset.html!==html){bar.innerHTML=html;bar.dataset.html=html}
}
function toggleSci(){sciMode=!sciMode;sciSecond=false;store.set('uc-sci',sciMode?'1':'0');renderCalcKeypad();render();fitLayout()}
function continueFromResult(){
 if(isCx(lastResult)){carryCx=lastResult;carry=null;expression='⟪⟫'}// complex: carried whole (complex.js)
 else{expression=carryText(lastResult,18);if(resultNegated&&lastResult.n<0n)carry.shown='(−'+carry.shown.replace(/^-/,'')+')'}// turned negative with ±: (−84)+…
 resultNegated=false;current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;
}
// where the last complete value at the end of the expression starts (-1 if it ends with an operator or "(")
const FN_BEFORE=FN_END;
function lastValueStart(s){
 if(!s)return -1;let i;
 if(/!$/.test(s)){i=lastValueStart(s.replace(/!+$/,''));}
 else if(/[πeφi]$/.test(s))i=s.length-1;
 else if(/⟩$/.test(s))i=s.lastIndexOf('⟨');// a constant
 else if(/⟫$/.test(s))i=s.lastIndexOf('⟪');// a complex result carried on
 else if(/[0-9.%]$/.test(s)){i=s.length;while(i>0&&/[0-9.%]/.test(s[i-1]))i--;if(/[-−]/.test(s[i-1]||'')&&(i===1||/[×÷(^]/.test(s[i-2])))i--}
 else if(/\)$/.test(s)){let d=0;for(i=s.length-1;i>=0;i--){if(s[i]===')')d++;else if(s[i]==='('&&--d===0)break}if(i<0)return -1;const f=s.slice(0,i).match(FN_BEFORE);if(f)i-=f[0].length}
 else return -1;
 if(i>0&&s[i-1]==='^'){const b=lastValueStart(s.slice(0,i-1));if(b>=0)i=b}// 3^2 is one value: sin(3^2)
 return i;
}
function sciKey(k){
 resetHow();
 if(k==='2nd'){sciSecond=!sciSecond;renderCalcKeypad();fitLayout();return}
 if(k==='hyp'){sciHyp=!sciHyp;renderCalcKeypad();fitLayout();return}
 if(k==='more'){openFunctions();return}
 if(k==='open'){parenthesis('(');return}
 if(k==='close'){if(!parenthesis(')'))refuseKey();return}// nothing open to close
 if(k==='rand'){typeRandom();return}
 if(k==='ncr'||k==='npr'||k==='mod'){operator(k==='ncr'?'C':k==='npr'?'P':'m');return}// between two numbers, like ×
 if(k==='angle'){angleUnit=angleUnit==='deg'?'rad':'deg';store.set('uc-angle',angleUnit);renderCalcKeypad();render();return}
 if(justCalculated){if(!lastResult)return;continueFromResult()}
 // a minus waiting for its number ("2×−"): a function or constant can follow it (2×−sin(30)); the rest cannot
 if(current==='-'||current==='−'){if(!SCI_FN[k]&&!['pi','e','phi','i','exp','pow10','pow2','inv'].includes(k)&&!k.startsWith('const:'))return;expression+='-';current=''}
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
 else if(k==='exp'||k==='pow10'||k==='pow2'){const b=k==='exp'?'e':k==='pow2'?'2':'10';expression=value?head+b+'^'+(plainNumber(value)?value:wrap(value)):expression+b+'^(';}
 else if(k==='inv'){expression=value?head+'(1÷'+(plainNumber(value)||/^(?:[πeφi]|⟨\w+⟩)$/.test(value)?value:wrap(value))+')':expression+'1÷(';}
 else if(k==='pi'||k==='e'||k==='phi'||k==='i'||k.startsWith('const:')){const c=k==='pi'?'π':k==='e'?'e':k==='phi'?'φ':k==='i'?'i':'⟨'+k.slice(6)+'⟩';expression+=(value?'×':'')+c;}
 else if(!value){refuseKey();return}// the rest need a value before them
 else if(k==='sq')expression=head+whole(value)+'^2';
 else if(k==='cube')expression=head+whole(value)+'^3';
 else if(k==='pow')expression=head+whole(value)+'^';
 else if(k==='root')expression=head+whole(value)+'^(1÷';
 else if(k==='fact')expression=head+whole(value)+'!';
 else if(k==='polar')expression=head+whole(value)+'∠';// r∠θ: the size typed, the angle next
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
 $('#keypad').innerHTML=(sci?sciKeysHtml()+'<div class="basic-pad">':'')+'<button class="key utility" data-action="backspace" type="button" aria-label="'+esc(t('deleteKey'))+'">'+BACK_ICON+'</button><button id="clearButton" class="key utility" data-action="clear" type="button">AC</button><button class="key utility" data-value="%" type="button">%</button><button class="key operator" data-value="/" type="button">÷</button><button class="key" data-value="7" type="button">7</button><button class="key" data-value="8" type="button">8</button><button class="key" data-value="9" type="button">9</button><button class="key operator" data-value="*" type="button">×</button><button class="key" data-value="4" type="button">4</button><button class="key" data-value="5" type="button">5</button><button class="key" data-value="6" type="button">6</button><button class="key operator" data-value="-" type="button">−</button><button class="key" data-value="1" type="button">1</button><button class="key" data-value="2" type="button">2</button><button class="key" data-value="3" type="button">3</button><button class="key operator" data-value="+" type="button">+</button>'+(sci?'<button class="key utility" data-action="negate" type="button" aria-label="'+esc(lang==='el'?'Αλλαγή προσήμου':'Change sign')+'">±</button><button class="key" data-value="0" type="button">0</button>':extra?'<button class="key utility" data-action="paren" type="button" aria-label="'+esc(parenLabel)+'">( )</button><button class="key" data-value="0" type="button">0</button>':'<button class="key wide" data-value="0" type="button">0</button>')+'<button class="key" data-value="," type="button">,</button><button class="key equals" data-action="equals" type="button">=</button>'+(sci?'</div>':'');
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
