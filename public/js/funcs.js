// "⋯" on the scientific keys: every function and constant in one sheet (the ? dialog, .fn-open), with a search.
// Trigonometry and hyperbolic functions with their inverses, abs, nCr, nPr, mod; π, e, φ; physical constants (CONSTS,
// numbers.js). A tap puts it into the calculation as its key would (sciKey) and closes the sheet.
const FN_GROUPS=[
 ['trig',['sin','cos','tan','cot','sec','csc','asin','acos','atan','acot','asec','acsc']],
 ['hyp',['sinh','cosh','tanh','coth','sech','csch','asinh','acosh','atanh','acoth','asech','acsch']],
 ['other',['abs','ncr','npr','mod','sqrt','cbrt','fact','inv']],
 ['math',['pi','e','phi']]];
const fnText=k=>({el:{title:'Συναρτήσεις και σταθερές',search:'Αναζήτηση…',trig:'Τριγωνομετρικές',hyp:'Υπερβολικές',other:'Άλλες',
  math:'Μαθηματικές σταθερές',phys:'Φυσικές σταθερές',none:'Δεν βρέθηκε τίποτα.',source:'Τιμές CODATA 2018· με * οι ακριβείς (SI 2019).',
  pi:'Ο αριθμός π',e:'Ο αριθμός e',phi:'Η χρυσή τομή'},
 en:{title:'Functions and constants',search:'Search…',trig:'Trigonometric',hyp:'Hyperbolic',other:'Other',math:'Math constants',
  phys:'Physical constants',none:'Nothing found.',source:'CODATA 2018 values; * marks the exact ones (SI 2019).',pi:'Pi',e:'Euler’s number',
  phi:'Golden ratio'}}[lang==='el'?'el':'en'][k]);
// 6.62607015e-34 -> 6,62607015 × 10⁻³⁴
function constValueText(v){const [m,e]=String(v).split('e');return formatGroupedNumber(m)+(e?' × 10'+supText(String(+e)):'')}
const fnFold=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function fnItemHtml(k){
 const ft=FN_TITLE[k],name=ft?ft[lang==='el'?0:1]:sciAria(k),label=sciLabel(k);// sinh: Hyperbolic sine
 return '<button class="fn-item" type="button" data-fn="'+esc(k)+'" data-find="'+esc(fnFold(label+' '+name+' '+k))+'"><b>'+esc(label)+'</b><span>'+esc(name)+'</span></button>';
}
function constItemHtml(id){
 const [sym,v,unit,el,en]=CONSTS[id],name=lang==='el'?el:en;
 return '<button class="fn-const" type="button" data-fn="const:'+id+'" data-find="'+esc(fnFold(sym+' '+id+' '+el+' '+en))+'"><b>'+esc(sym)+'</b><span>'+esc(name)+'</span><small>'+esc(constValueText(v))+(unit?' '+esc(unit):'')+(CONST_EXACT.has(id)?' *':'')+'</small></button>';
}
function openFunctions(){
 const m=$('#howModal');
 $('#howTitle').textContent=fnText('title');
 $('#howContent').innerHTML='<input class="modes-search fn-search" type="search" autocomplete="off" spellcheck="false" placeholder="'+esc(fnText('search'))+'" aria-label="'+esc(fnText('search'))+'">'+
  FN_GROUPS.map(([g,keys])=>'<section class="fn-group"><h3 class="help-heading">'+esc(fnText(g))+'</h3><div class="fn-grid">'+keys.map(k=>g==='math'?constLikeHtml(k):fnItemHtml(k)).join('')+'</div></section>').join('')+
  '<section class="fn-group"><h3 class="help-heading">'+esc(fnText('phys'))+'</h3><div class="fn-consts">'+Object.keys(CONSTS).map(constItemHtml).join('')+'</div><p class="chart-note">'+esc(fnText('source'))+'</p></section>'+
  '<p class="empty fn-none hidden">'+esc(fnText('none'))+'</p>';
 m.classList.remove('help-open','help-wide');m.classList.add('fn-open');m.classList.remove('hidden');
 $('#howContent').scrollTop=0;
 const search=$('#howContent .fn-search');
 search.addEventListener('input',()=>filterFunctions(search.value));
 search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const first=[...$$('#howContent [data-fn]')].find(b=>!b.hidden);if(first)first.click()}});
 if(!isMobileDevice())search.focus();// phones: no keyboard popping up
}
// π, e and φ: like the constants, with their value
function constLikeHtml(k){
 const sym=sciLabel(k),v={pi:'3.14159265358979',e:'2.71828182845905',phi:'1.61803398874989'}[k];
 return '<button class="fn-const" type="button" data-fn="'+k+'" data-find="'+esc(fnFold(sym+' '+k+' '+fnText(k)))+'"><b>'+esc(sym)+'</b><span>'+esc(fnText(k))+'</span><small>'+esc(formatGroupedNumber(v))+'…</small></button>';
}
function filterFunctions(q){
 const words=fnFold(q).split(/\s+/).filter(Boolean);let any=false;
 $$('#howContent [data-fn]').forEach(b=>{const hit=words.every(w=>b.dataset.find.includes(w));b.hidden=!hit;any=any||hit});
 $$('#howContent .fn-group').forEach(g=>{g.hidden=![...g.querySelectorAll('[data-fn]')].some(b=>!b.hidden)});
 $('#howContent .fn-none')?.classList.toggle('hidden',any);
}
function setupFunctions(){
 $('#howContent').addEventListener('click',e=>{
  if(!$('#howModal').classList.contains('fn-open'))return;
  const b=e.target.closest('[data-fn]');if(!b)return;
  document.activeElement?.blur?.();// the search keeps no focus (keys go to the calculator again)
  closeHow();sciKey(b.dataset.fn);
 });
}
