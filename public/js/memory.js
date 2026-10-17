// Memory, in the Calculator: MC clears it, MR brings it back, M+ and M− add the number on screen to it or take it away,
// MS stores the number on screen. One number, kept across visits (uc-memory, exact, as a decimal string). The number on
// screen is the result, else the number being typed, else what has been typed so far. While something is in memory the
// chip beside f(x) shows it (tap it for MR). After a memory key the next digit starts a new number, as on a pocket
// calculator. Keyboard (as in Windows' calculator): Ctrl+M MS, Ctrl+P M+, Ctrl+Q M−, Ctrl+R MR, Ctrl+L MC.
let memory=(()=>{try{const s=store.get('uc-memory');return s?vFromStore(s):null}catch{return null}})();// a fraction, or {re, im}
let memFresh=false;// a memory key was just used: the next digit starts a new number
const MEM_KEYS=[['mc','MC'],['mr','MR'],['m+','M+'],['m-','M−'],['ms','MS']];
const memText=k=>({el:{mc:'Καθαρισμός μνήμης',mr:'Ανάκληση μνήμης',ms:'Αποθήκευση στη μνήμη','m+':'Πρόσθεση στη μνήμη','m-':'Αφαίρεση από τη μνήμη',
  row:'Μνήμη',now:'Μνήμη: {v}',cleared:'Η μνήμη καθάρισε'},
 en:{mc:'Memory clear',mr:'Memory recall',ms:'Memory store','m+':'Memory add','m-':'Memory subtract',row:'Memory',now:'Memory: {v}',cleared:'Memory cleared'}}[lang==='el'?'el':'en'][k]);
// The keys: the first row of the scientific keys (f(x)), as on the iPhone's calculator; the basic keypad stays as it was.
// MC and MR look dimmed while memory is empty. The keyboard shortcuts work in the Calculator either way.
function memKeysHtml(){
 return MEM_KEYS.map(([k,l])=>'<button class="key sci-key mem-key'+((k==='mc'||k==='mr')&&!memory?' empty':'')+'" data-mem="'+k+'" type="button" aria-label="'+esc(memText(k))+'" title="'+esc(memText(k))+'">'+l+'</button>').join('');
}
function saveMemory(){if(memory)store.set('uc-memory',vToStore(memory));else store.del('uc-memory')}
// the number on screen: the result, the number being typed, or what has been typed so far (an operator at the end left out)
function memScreenValue(){
 if(calcError)return null;
 if(justCalculated)return lastResult;
 try{
  if(current&&current!=='-'&&current!=='−')return evalExpr(current);
  const s=expression.replace(new RegExp('(?:[+\\-×÷^(CPm]|(?:'+FN_ALT+')\\()+$'),'');
  return s?evalExpr(tidyParens(s)):null;
 }catch{return null}
}
// the memory as a number to type: up to 15 significant digits (the most a typed number may have); very large or very
// small ones as 1,2345 × 10ⁿ in brackets
function memTyped(r){
 if(isCx(r))return {sci:true,text:vExprText(r,15)};// complex: (3+2×i)
 const neg=r.n<0n,abs=neg?{n:-r.n,d:r.d}:r,x=ratToNumber(abs),trim=s=>s.includes('.')?s.replace(/0+$/,'').replace(/\.$/,''):s;
 if(x!==0&&(x>=1e15||x<1e-6)){const [m,e]=x.toExponential(14).split('e');return {sci:true,text:(neg?'-':'')+trim(m)+'×10^'+(+e)}}
 const intDigits=x>=1?Math.floor(Math.log10(x))+1:1;
 return {sci:false,text:(neg?'−':'')+trim(ratToRoundedDecimal(abs,Math.max(0,15-intDigits)))};
}
function memKey(k){
 if(mode!=='calc')return;
 if(k==='mc'){memory=null;saveMemory();srSay(memText('cleared'))}
 else if(k==='mr'){
  if(!memory){refuseKey();return}
  resetHow();
  if(justCalculated){expression='';current='';currentIsPercent=false;justCalculated=false;lastExpression='';lastResult=null;carry=null}
  if(currentIsPercent){expression+=current+'×';current='';currentIsPercent=false}
  else if(!current&&VALUE_END.test(expression))expression+='×';
  else if(current==='-'){expression+='-';current=''}
  const m=memTyped(memory);
  if(m.sci){current='';expression+=isCx(memory)?m.text:'('+m.text+')'}else current=m.text;
  if(inputLength()>MAX_INPUT){refuseKey();return}
 }else{
  const v=memScreenValue();if(v===null){refuseKey();return}
  try{memory=k==='ms'?v:vLimit(k==='m+'?vAdd(memory||rat(0n),v):vSub(memory||rat(0n),v))}catch{refuseKey();return}
  if(!isCx(memory)&&memory.n===0n&&k!=='ms')memory=null;// back to nothing: as if cleared
  saveMemory();srSay(memory?memText('now').replace('{v}',fmt(memory)):memText('cleared'));
 }
 memFresh=k!=='mc';
 renderMemory();render();
}
// MC and MR look empty with nothing in memory; the chip beside f(x) shows what is in it
function renderMemory(){
 $$('#keypad .mem-key[data-mem="mc"],#keypad .mem-key[data-mem="mr"]').forEach(b=>b.classList.toggle('empty',!memory));
}
function memChipHtml(){
 return memory?'<button class="sci-chip mem-chip" data-bar="mr" type="button" aria-label="'+esc(memText('now').replace('{v}',fmt(memory)))+'" title="'+esc(memText('mr'))+'">M '+esc(fmt(memory))+'</button>':'';
}
// said by a screen reader (the same aria-live note as refuseLimit's)
function srSay(text){let n=$('#srNote');if(!n){n=document.createElement('div');n.id='srNote';n.className='sr-only';n.setAttribute('aria-live','polite');document.body.appendChild(n)}n.textContent='';requestAnimationFrame(()=>{n.textContent=text})}
// Ctrl+M MS, Ctrl+P M+, Ctrl+Q M−, Ctrl+R MR, Ctrl+L MC (in the Calculator; returns true when the key was used)
const MEM_SHORTCUTS={m:'ms',p:'m+',q:'m-',r:'mr',l:'mc'};
function memKeydown(e){
 if(mode!=='calc'||!(e.ctrlKey||e.metaKey)||e.altKey||e.shiftKey)return false;
 const k=MEM_SHORTCUTS[e.key.toLowerCase()];if(!k)return false;
 if(!$('#howModal').classList.contains('hidden')||!$('#historyPanel').classList.contains('hidden'))return false;
 e.preventDefault();memKey(k);return true;
}
