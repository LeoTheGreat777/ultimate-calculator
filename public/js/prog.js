// Programmer: one whole number (0 up to 64 bits) in decimal, hexadecimal, binary and octal at once. Type in any of the
// four fields and the other three follow (progSource is the one typed in last). The display answers "what is it in the
// other base": hexadecimal while you type decimal, decimal otherwise. The fields group their digits: decimal with
// thousands dots, hex and binary in fours (DEAD BEEF, 1111 0000), octal in threes. The keypad has A–F; the keys a
// field's base hasn't got are dimmed and refused. The working under ?: to decimal by place values, from decimal by
// dividing again and again (the remainders read from the bottom up).
const PROG_BASES={progDec:10,progHex:16,progBin:2,progOct:8};
const PROG_IDS=Object.keys(PROG_BASES);
const PROG_MAX=(1n<<64n)-1n;
const PROG_DIGITS='0123456789ABCDEF';
const progBase=id=>PROG_BASES[id]||0;
// the digits of a field without its grouping (and without a pasted 0x / 0b / 0o)
const progRaw=s=>String(s??'').replace(/[\s.]/g,'').toUpperCase().replace(/^0[XBO](?=.)/,'');
const progValid=(raw,base)=>[...raw].every(c=>{const d=PROG_DIGITS.indexOf(c);return d>=0&&d<base});
function progParse(raw,base){let n=0n;const B=BigInt(base);for(const c of raw)n=n*B+BigInt(PROG_DIGITS.indexOf(c));return n}
const groupEvery=(s,k,sep)=>s.replace(new RegExp('\\B(?=(.{'+k+'})+$)','g'),sep);
function progText(n,base){const s=n.toString(base).toUpperCase();return base===10?groupDigits(s):groupEvery(s,base===8?3:4,' ')}
const SUB_DIGITS='₀₁₂₃₄₅₆₇₈₉';
const baseMark=b=>[...String(b)].map(c=>SUB_DIGITS[+c]).join('');// 16 -> ₁₆, written after a number: FF₁₆
const progBits=n=>n===0n?1:n.toString(2).length;
const bitWord=k=>k+' bit'+(lang==='el'||k===1?'':'s');
let progSource='progDec';
function progPanelHtml(){return '<div class="tool-grid prog-grid">'+PROG_IDS.map(id=>field(id,t(id))).join('')+'</div>'}
// A field typed in (keypad, keyboard or paste): its digits checked and grouped again, then the others follow.
function progInput(input){
 const id=input.id,base=progBase(id),prev=toolState.prog.inputs[id]??'',raw=progRaw(input.value).replace(/^0+(?=.)/,'');
 const back=()=>{input.value=prev};
 if(!progValid(raw,base)){back();refuseKey(input);return}
 const n=raw?progParse(raw,base):null;
 if(n!==null&&n>PROG_MAX){back();refuseLimit(input,[64,lang==='el'?' bit':' bits']);return}
 const text=n===null?'':progText(n,base);
 if(text!==input.value){
  // the cursor stays after the same digit (the grouping only adds spaces and dots)
  const caret=document.activeElement===input&&input.selectionStart!=null?progRaw(input.value.slice(0,input.selectionStart)).length:null;
  input.value=text;
  if(caret!=null){let k=0,d=0;while(k<text.length&&d<caret){if(!/[ .]/.test(text[k]))d++;k++}input.setSelectionRange(k,k)}
 }
 toolState.prog.inputs[id]=text;progSource=id;
 fitDisplayText(input,11,true);
 progCalculate();
}
function progCalculate(){
 const el=lang==='el',L=(g,e)=>el?g:e;
 const src=PROG_IDS.includes(progSource)&&toolState.prog.inputs[progSource]?progSource:PROG_IDS.find(id=>toolState.prog.inputs[id])||'progDec';
 const base=progBase(src),raw=progRaw(toolState.prog.inputs[src]);
 const fill=n=>PROG_IDS.forEach(id=>{if(id===src)return;const v=n===null?'':progText(n,progBase(id));toolState.prog.inputs[id]=v;const i=$('#'+id);if(i&&i.value!==v){i.value=v;fitDisplayText(i,11,true)}});
 if(!raw||!progValid(raw,base)){fill(null);setToolResult('','',null);return}
 const n=progParse(raw,base);fill(n);
 const out=base===10?16:10,main=progText(n,out),bits=progBits(n);
 const steps=[];
 if(base!==10){
  const digits=[...raw.replace(/^0+(?=.)/,'')],k=digits.length,B=BigInt(base);
  if(k<=16){
   steps.push({title:L('Κάθε ψηφίο επί τη θέση του (δυνάμεις του ','Each digit times its place (powers of ')+base+')',
    text:digits.map((c,i)=>{const d=PROG_DIGITS.indexOf(c);return (d>9?c+'('+d+')':c)+' × '+base+supText(String(k-1-i))}).join(' + ')});
   const terms=digits.map((c,i)=>BigInt(PROG_DIGITS.indexOf(c))*B**BigInt(k-1-i)).filter(x=>x>0n);
   steps.push({title:L('Άθροισμα: σε δεκαδικό','Sum: in decimal'),text:(terms.length>1?terms.map(x=>groupDigits(x.toString())).join(' + ')+' = ':'')+groupDigits(n.toString())});
  }else steps.push({title:L('Σε δεκαδικό','In decimal'),text:groupDigits(n.toString())});
 }
 for(const b of [2,16,8]){
  if(b===base)continue;
  const B=BigInt(b),rows=[];let q=n;
  do{rows.push(groupDigits(q.toString())+' ÷ '+b+' = '+groupDigits((q/B).toString())+L(', υπόλοιπο ',', remainder ')+PROG_DIGITS[Number(q%B)]);q/=B}while(q>0n);
  steps.push(rows.length<=16?{title:L('Σε βάση ','To base ')+b+L(': διαίρεση με ',': divide by ')+b+L(', τα υπόλοιπα από κάτω προς τα πάνω',', the remainders from the bottom up'),text:rows.join('\n')+'\n→ '+progText(n,b)+baseMark(b)}
   :{title:L('Σε βάση ','In base ')+b,text:progText(n,b)+baseMark(b)});
 }
 steps.push({title:L('Μέγεθος','Size'),text:bitWord(bits)+' · '+Math.ceil(bits/8)+' byte'+(el||bits<=8?'':'s')});
 setToolResult(main,t(out===16?'progHex':'progDec')+' · '+bitWord(bits),{formula:progText(n,base)+baseMark(base),steps,result:main+baseMark(out)});
}
window._runProg=progCalculate;
// the keys a field's base hasn't got are dimmed (setActiveToolInput)
function progDimKeys(input){
 const base=progBase(input?.id)||10;
 $$('#keypad .tool-key[data-value]').forEach(k=>{const d=PROG_DIGITS.indexOf(k.dataset.value);if(d>=0)k.classList.toggle('key-off',d>=base)});
}
// The keypad: A–F on the left, the digits like a numeric keypad on the right, ⌫ and AC under the letters (C would
// be confused with the hex digit C; with one number in four fields AC is all that is needed).
function progKeypadHtml(){
 const k=v=>'<button class="tool-key" data-value="'+v+'" type="button">'+v+'</button>';
 return k('A')+k('B')+k('7')+k('8')+k('9')+k('C')+k('D')+k('4')+k('5')+k('6')+k('E')+k('F')+k('1')+k('2')+k('3')+
  '<button class="tool-key tool-utility" data-action="backspace" type="button" aria-label="'+esc(t('deleteKey'))+'">⌫</button><button class="tool-key tool-utility" data-action="clear-all" type="button">AC</button><button class="tool-key prog-zero" data-value="0" type="button">0</button>';
}
