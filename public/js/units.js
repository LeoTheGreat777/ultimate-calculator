// Units mode: unit data and names, converting, the two values and their keypad input.
const units={length:{mm:'0.001',cm:'0.01',m:'1',km:'1000',in:'0.0254',ft:'0.3048',yd:'0.9144',mi:'1609.344',nmi:'1852'},area:{'mm²':'0.000001','cm²':'0.0001','m²':'1','km²':'1000000','in²':'0.00064516','ft²':'0.09290304',stremma:'1000',acre:'4046.8564224',ha:'10000'},mass:{mg:'0.000001',g:'0.001',kg:'1',oz:'0.028349523125',lb:'0.45359237',t:'1000'},volume:{ml:'0.001',l:'1','m³':'1000',tsp:'0.00492892159375',tbsp:'0.01478676478125',cup:'0.2365882365',gal:'3.785411784',qt:'0.946352946',pt:'0.473176473'},speed:{'m/s':'1','km/h':'0.27777777777777777778',mph:'0.44704',knot:'0.51444444444444444444'},time:{ms:'0.001',s:'1',min:'60',h:'3600',day:'86400',week:'604800'},data:{bit:'1',kbit:'1000',Mbit:'1000000',Gbit:'1000000000',Tbit:'1000000000000',B:'8',kB:'8000',MB:'8000000',GB:'8000000000',TB:'8000000000000',KiB:'8192',MiB:'8388608',GiB:'8589934592',TiB:'8796093022208'},energy:{J:'1',kJ:'1000',Wh:'3600',kWh:'3600000',cal:'4.184',kcal:'4184'},power:{W:'1',kW:'1000',MW:'1000000',hp:'745.69987158227022'},pressure:{Pa:'1',kPa:'1000',bar:'100000',psi:'6894.757293168',atm:'101325'},angle:{deg:'1',rad:'57.2957795130823208768',grad:'0.9'},temperature:{'°C':'1','°F':'1',K:'1'}};
function normalizeUnitExpression(expr){
 return String(expr??'').trim().replace(/×/g,'*').replace(/÷/g,'/').replace(/-?\d[\d.,]*/g,m=>{
  const sign=m.startsWith('-')?'-':'';
  let token=sign?m.slice(1):m;
  if(token.includes(',')){
   const parts=token.split(',');
   token=parts.slice(0,-1).join('').replace(/\./g,'')+'.'+parts.at(-1);
  }
  const parts=token.split('.');
  parts[0]=(parts[0]||'0').replace(/^0+(?=\d)/,'');
  if(parts[0]==='')parts[0]='0';
  return sign+parts.join('.');
 });
}
function unitEvaluate(expr){
 let raw=normalizeUnitExpression(expr);
 if(!raw||/[-+*/.(]$/.test(raw)||!/^[0-9+*/().\s%-]+$/.test(raw))return null;
 const open=(raw.match(/\(/g)||[]).length-(raw.match(/\)/g)||[]).length;if(open>0)raw+=')'.repeat(open);// still typing: close them
 try{return evalExpr(raw)}catch{return null}
}
function unitFactor(value){
 return ratFromString(String(value));
}
function unitValueFormat(value){
 if(!value||typeof value!=='object'||!('n'in value&&'d'in value))return '';
 return ratToDecimal(value,24);
}
function formatUnitDisplayValue(value){
 const s=String(value??'').trim();
 if(!s)return '0';
 return formatInputDisplay(s);
}
function renderUnitsDisplay(){
 const d=$('#calculatorDisplay');
 d.className='display-wrap unit-display';
 d.innerHTML='<div class="unit-display-toolbar"><select id="unitCategory" class="conversion-category">'+Object.keys(units).map(x=>'<option value="'+x+'">'+esc(t(x))+'</option>').join('')+'</select><button id="unitSwap" class="conversion-swap" type="button" aria-label="'+esc(t('swap'))+'">⇄</button></div><div class="unit-rows"><div class="unit-row" data-unit-row="from"><input id="unitValueFrom" class="unit-value" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="'+esc(t('from'))+'"><select id="unitFrom" class="unit-unit"></select></div><div class="unit-row" data-unit-row="to"><input id="unitValueTo" class="unit-value" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="'+esc(t('to'))+'"><select id="unitTo" class="unit-unit"></select></div></div>';
 const cat=$('#unitCategory');
 cat.value=window._unitCategory||'length';
 populateUnits(true);

 const bindInput=input=>{
   const side=input.id==='unitValueFrom'?'from':'to';
   const row=input.closest('.unit-row');
   input.dataset.unitInput=side;
   input.readOnly=true;
   input.setAttribute('inputmode','none');
   input.setAttribute('aria-readonly','true');
   input.addEventListener('focus',()=>input.blur());
   const activate=()=>{
     unitActiveInput=side;
     unitSource=side;
     unitReplaceOnNextKey=true;
     updateUnitsDisplay();
   };
   input.addEventListener('click',activate);
   row?.addEventListener('click',e=>{
     if(e.target.closest('select'))return;
     activate();
   });
 };
 bindInput($('#unitValueFrom'));
 bindInput($('#unitValueTo'));

 cat.addEventListener('change',()=>{
   window._unitCategory=cat.value||'length';
   // A new category keeps the number that was typed (or brought from the calculator) and converts it with the new units.
   const keep=unitExpressions[unitSource]||'0';
   unitExpressions={from:'0',to:'0'};unitExpressions[unitSource]=keep;
   unitActiveInput=unitSource;
   unitReplaceOnNextKey=true;
   populateUnits(true);
   convertUnitExpression(unitSource);
   setTimeout(()=>cat.blur(),0);
 });

 const handleUnitChange=select=>{
   const changed=select.id==='unitFrom'?'from':'to';
   const source=unitExpressions[unitSource]?.trim()?unitSource:unitExpressions[changed]?.trim()?changed:(unitExpressions.from?.trim()?'from':unitExpressions.to?.trim()?'to':changed);
   unitSource=source;
   unitActiveInput=source;
   unitReplaceOnNextKey=false;
   convertUnitExpression(source);
 };
 // After picking from a menu, the keyboard goes straight back to typing numbers.
 // (blur after the menu has closed: closing a menu hands the focus back to it)
 const release=sel=>setTimeout(()=>sel.blur(),0);
 $('#unitFrom').addEventListener('change',()=>{handleUnitChange($('#unitFrom'));release($('#unitFrom'))});
 $('#unitTo').addEventListener('change',()=>{handleUnitChange($('#unitTo'));release($('#unitTo'))});

 $('#unitSwap').addEventListener('click',()=>{
   const a=$('#unitFrom'),b=$('#unitTo');
   [a.value,b.value]=[b.value,a.value];
   const from=unitExpressions.from,to=unitExpressions.to;
   unitExpressions={from:to,to:from};
   unitSource=unitSource==='from'?'to':'from';
   unitActiveInput=unitSource;
   unitReplaceOnNextKey=false;unitSourceTyped=false;
   convertUnitExpression(unitSource);
 });
 updateUnitsDisplay();
}
// A converted value: about 6 decimals, more for small values so that at least 6 significant digits show.
function formatUnitResult(s){
 const raw=String(s??'').trim();
 if(!/^-?\d+(?:\.\d+)?$/.test(raw))return formatUnitDisplayValue(raw);
 const r=ratFromString(raw);if(r.n===0n)return '0';
 const abs=Math.abs(Number(raw)),dec=abs<1?Math.min(12,Math.max(6,Math.ceil(-Math.log10(abs))+5)):6;
 const rounded=ratToRoundedDecimal(r,dec);
 return rounded==='0'||rounded==='-0'?formatScientific(ratToDecimal(r,200)):formatGroupedNumber(rounded);
}
// Only what you are typing shows exactly as typed; every other value (converted, finished with =, brought from
// the calculator, swapped) is shown rounded. unitSourceTyped says whether the source side was typed by hand.
let unitSourceTyped=false;
function unitSideText(side){
 const expr=unitExpressions[side]??'0';
 return side===unitSource&&unitSourceTyped&&!unitReplaceOnNextKey?formatUnitDisplayValue(expr):formatUnitResult(expr);
}
// The number being typed at the end of the Units value, which C clears (like the calculator's C).
// null when there is none – a finished value, one brought from the calculator, or 0 – and the key is AC.
function unitEntry(){
 if(!unitSourceTyped||unitReplaceOnNextKey)return null;
 const v=unitExpressions[unitActiveInput==='to'?'to':'from']||'';
 if(v==='0')return null;
 if(/(^|[*/(])-$/.test(v))return '-';
 const m=v.match(/(^|[*/(])?(-?)([\d.]+%?)$/);
 return m?(m[1]!==undefined?m[2]:'')+m[3]:null;
}
function updateUnitsDisplay(){
 const from=$('#unitValueFrom'),to=$('#unitValueTo');
 if(!from||!to)return;
 if(mode==='units'&&$('#clearButton'))$('#clearButton').textContent=unitEntry()?'C':'AC';
 from.value=unitSideText('from');
 to.value=unitSideText('to');
 saveTools();
 const active=unitActiveInput==='to'?'to':'from';
 unitActiveInput=active;
 from.classList.toggle('unit-active-value',active==='from');
 from.classList.toggle('unit-result-value',active==='to');
 to.classList.toggle('unit-active-value',active==='to');
 to.classList.toggle('unit-result-value',active==='from');
 from.closest('.unit-row')?.classList.toggle('active',active==='from');
 to.closest('.unit-row')?.classList.toggle('active',active==='to');
}
function unitConvertValue(category,value,from,to){
 if(category==='temperature'){
   const v=value;
   if(from==='°F'){
     const c=ratDiv(ratSub(v,ratFromString('32')),ratFromString('1.8'));
     return to==='°C'?c:to==='°F'?v:ratAdd(c,ratFromString('273.15'));
   }
   if(from==='K'){
     const c=ratSub(v,ratFromString('273.15'));
     return to==='°C'?c:to==='°F'?ratAdd(ratMul(c,ratFromString('1.8')),ratFromString('32')):v;
   }
   return to==='°C'?v:to==='°F'?ratAdd(ratMul(v,ratFromString('1.8')),ratFromString('32')):ratAdd(v,ratFromString('273.15'));
 }
 const factors=units[category]||{};
 return ratMul(value,ratDiv(unitFactor(factors[from]),unitFactor(factors[to])));
}
function convertUnitExpression(source='from'){
 const cc=$('#unitCategory')?.value,fu=$('#unitFrom')?.value,tu=$('#unitTo')?.value;
 if(!cc||!fu||!tu)return;
 const expr=String(unitExpressions[source]??'').trim();
 if(!expr){
   unitExpressions[source]='0';
   unitExpressions[source==='from'?'to':'from']='0';
   updateUnitsDisplay();
   return;
 }
 const value=unitEvaluate(expr);
 if(value===null){
   updateUnitsDisplay();
   return;
 }
 const out=source==='from'?unitConvertValue(cc,value,fu,tu):unitConvertValue(cc,value,tu,fu);
 unitExpressions[source==='from'?'to':'from']=unitValueFormat(out);
 updateUnitsDisplay();
}
function equalsUnits(){
 const source=unitSource||unitActiveInput||'from';
 const other=source==='from'?'to':'from';
 const expr=tidyParens(String(unitExpressions[source]??'').trim());// brackets left open at the end are dropped, as in the calculator
 const value=unitEvaluate(expr);
 if(value===null)return;
 const cc=$('#unitCategory')?.value,fu=$('#unitFrom')?.value,tu=$('#unitTo')?.value;
 if(!cc||!fu||!tu)return;
 unitExpressions[source]=unitValueFormat(value);unitSourceTyped=false;
 unitExpressions[other]=unitValueFormat(source==='from'?unitConvertValue(cc,value,fu,tu):unitConvertValue(cc,value,tu,fu));
 unitReplaceOnNextKey=true;
 updateUnitsDisplay();
}
window._runUnits=()=>convertUnitExpression(unitSource||unitActiveInput||'from');
window._equalsUnits=equalsUnits;
const UNIT_LABELS={length:{mm:['Χιλιοστό','Millimeter'],cm:['Εκατοστό','Centimeter'],m:['Μέτρο','Meter'],km:['Χιλιόμετρο','Kilometer'],in:['Ίντσα','Inch'],ft:['Πόδι','Foot'],yd:['Γιάρδα','Yard'],mi:['Μίλι','Statute mile'],nmi:['Ναυτικό μίλι','Nautical mile']},area:{'mm²':['Τετρ. χιλιοστό','Square millimeter'],'cm²':['Τετρ. εκατοστό','Square centimeter'],'m²':['Τετρ. μέτρο','Square meter'],'km²':['Τετρ. χιλιόμετρο','Square kilometer'],'in²':['Τετρ. ίντσα','Square inch'],'ft²':['Τετρ. πόδι','Square foot'],stremma:['Στρέμμα','Stremma'],acre:['Έικρ','Acre'],ha:['Εκτάριο','Hectare']},mass:{mg:['Χιλιοστόγραμμο','Milligram'],g:['Γραμμάριο','Gram'],kg:['Χιλιόγραμμο','Kilogram'],oz:['Ουγγιά','Ounce'],lb:['Λίβρα','Pound'],t:['Τόνος','Metric ton']},volume:{ml:['Χιλιοστόλιτρο','Milliliter'],l:['Λίτρο','Liter'],'m³':['Κυβικό μέτρο','Cubic meter'],tsp:['Κουταλάκι','Teaspoon'],tbsp:['Κουταλιά','Tablespoon'],cup:['Κούπα','Cup'],gal:['Γαλόνι','Gallon'],qt:['Quart','Quart'],pt:['Pint','Pint']},speed:{'m/s':['Μέτρα/δευτ.','Meters/second'],'km/h':['Χιλιόμετρα/ώρα','Kilometers/hour'],mph:['Μίλια/ώρα','Miles/hour'],knot:['Κόμβος','Knot']},time:{ms:['Millisec.','Millisecond'],s:['Δευτερόλεπτο','Second'],min:['Λεπτό','Minute'],h:['Ώρα','Hour'],day:['Ημέρα','Day'],week:['Εβδομάδα','Week']},data:{bit:['Bit','Bit'],b:['Bit','Bit'],kbit:['Κιλομπίτ','Kilobit'],Mbit:['Μεγαμπίτ','Megabit'],Gbit:['Γιγαμπίτ','Gigabit'],Tbit:['Τεραμπίτ','Terabit'],B:['Byte','Byte'],kB:['Κιλομπάιτ','Kilobyte'],MB:['Μεγαμπάιτ','Megabyte'],GB:['Γιγαμπάιτ','Gigabyte'],TB:['Τεραμπάιτ','Terabyte'],KiB:['Κιμπιμπάιτ','Kibibyte'],MiB:['Μεμπιμπάιτ','Mebibyte'],GiB:['Γκιμπιμπάιτ','Gibibyte'],TiB:['Τεμπιμπάιτ','Tebibyte']},energy:{J:['Τζάουλ','Joule'],kJ:['Κιλοτζάουλ','Kilojoule'],Wh:['Watt-ώρα','Watt-hour'],kWh:['Kilowatt-ώρα','Kilowatt-hour'],cal:['Θερμίδα','cal'],kcal:['Χιλιοθερμίδα','kcal']},power:{W:['Βατ','Watt'],kW:['Κιλοβάτ','Kilowatt'],MW:['Μεγαβάτ','Megawatt'],hp:['Ιπποδύναμη','Horsepower']},pressure:{Pa:['Πασκάλ','Pascal'],kPa:['Κιλοπασκάλ','Kilopascal'],bar:['Μπαρ','Bar'],psi:['PSI','PSI'],atm:['Ατμόσφαιρα','Atmosphere']},angle:{deg:['Μοίρα','Degree'],rad:['Ακτίνιο','Radian'],grad:['Γκραντ','Grad']},temperature:{'°C':['Κελσίου','Celsius'],'°F':['Φαρενάιτ','Fahrenheit'],K:['Kelvin','Kelvin']}};
const unitOptions=(category,selected)=>Object.keys(units[category]||{}).map(x=>'<option value="'+x+'"'+(x===selected?' selected':'')+'>'+esc(UNIT_LABELS[category]?.[x]?.[lang==='el'?0:1]||x)+'</option>').join('');
function populateUnits(preserve=true){
 const cat=$('#unitCategory'),from=$('#unitFrom'),to=$('#unitTo');
 if(!cat||!from||!to)return;
 const category=cat.value||'length';
 const keys=Object.keys(units[category]||{});
 const previousFrom=from.value,previousTo=to.value,pick=unitPick[category];
 from.innerHTML=unitOptions(category,preserve&&keys.includes(previousFrom)?previousFrom:pick?.from??keys[0]);
 to.innerHTML=unitOptions(category,preserve&&keys.includes(previousTo)?previousTo:pick?.to??(keys[1]||keys[0]));
}
// Keys typed into the Units value (keypad and keyboard). Called through toolKeyInput.
function unitKeyInput(key){
 const side=unitActiveInput||'from';
 let value=unitExpressions[side]||'';
 if(key==='clear'){unitExpressions={from:'0',to:'0'};unitSource=side;unitReplaceOnNextKey=true;unitSourceTyped=false;updateUnitsDisplay();return true}
 if(key==='clearEntry'){const e=unitEntry();if(!e)return unitKeyInput('clear');value=value.slice(0,-e.length)||'0';unitExpressions[side]=value;unitSource=side;convertUnitExpression(side);return true}
 const afterValue=/[\d.%)]$/,opener=/(^|[+*/(])$/;
 if(key==='backspace'){unitReplaceOnNextKey=false;value=value.slice(0,-1)||'0'}
 else if(key==='negate'){
   // ±: flip the sign of the last number, or start a negative one (works on a carried or finished value too)
   if(value==='0')value='';
   const m=value.match(/(^|[+*/(-])(-?)([\d.]+%?)$/);
   if(m)value=value.slice(0,value.length-m[0].length)+m[1]+(m[2]?'':'-')+m[3];
   else if(/-$/.test(value)&&opener.test(value.slice(0,-1)))value=value.slice(0,-1);
   else if(value===''||/[+*/(-]$/.test(value))value+='-';
   else return false;
   unitReplaceOnNextKey=false;
   if(!unitSourceTyped){unitExpressions[side]=value||'0';unitSource=side;convertUnitExpression(side);return true}
 }
 else{
   if(unitReplaceOnNextKey&&['+','-','*','/'].includes(key))unitReplaceOnNextKey=false;
   else if(unitReplaceOnNextKey&&key!=='%'){value='';unitReplaceOnNextKey=false}
   if(value==='0'&&(key==='paren'||key==='('))value='';
   const open=(value.match(/\(/g)||[]).length-(value.match(/\)/g)||[]).length;
   if(key==='paren'||key==='('||key===')'){
     // the same smart ( ) as the calculator: closes when one is open after a number, otherwise opens (× first after a number)
     const close=key===')'||(key==='paren'&&open>0&&afterValue.test(value));
     if(close){if(open<=0||!afterValue.test(value))return false;value=closeParen(value)}// (5) and ((…)) lose the brackets
     else value+=afterValue.test(value)?'*(':'(';
   }else if(key==='.'||key===','){
     const tail=value.split(/[+*/()-]/).pop();
     if(!tail.includes('.'))value+=afterValue.test(value)&&!/[)%]$/.test(value)?'.':/[)%]$/.test(value)?'*0.':'0.';
   }else if(key==='%'){
     if(!afterValue.test(value)||value.endsWith('%'))return false;
     value+='%';
   }else if(key==='-'){
     // like the calculator: − after × ÷ ( starts a negative number; after + or − it replaces / toggles
     if(value==='')value='-';
     else if(/[*/(]$/.test(value))value+='-';
     else if(/[+-]$/.test(value)){
       if(value.endsWith('-'))value=value.slice(0,-1);
       else value=value.slice(0,-1)+'-';
     }else value+='-';
   }else if(/^[0-9]$/.test(key)){
     if(value==='0')value=key;
     else if(/(?:^|[+*/(-])0$/.test(value))value=value.slice(0,-1)+key;
     else if(/\)$/.test(value))value+='*'+key;
     else value+=key;
   }
   else if(['+','*','/'].includes(key)){
     if(!value||/\($/.test(value))return false;
     if(/[*/(]-$/.test(value))value=value.slice(0,-2)+key;
     else if(/[+*/-]$/.test(value))value=value.slice(0,-1)+key;
     else value+=key;
   }else return false;
 }
 unitExpressions[side]=value;unitSource=side;unitSourceTyped=true;convertUnitExpression(side);return true;
}
