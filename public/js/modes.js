// All modes: the ⊞ button at the top opens a launcher with every mode as a round icon (like the keys), four a row, and a
// search box. On phones it is a sheet that slides up from the bottom (drag it down or press its handle to close it); on
// tablets and computers a popover under the button. The strip of tabs shows only the pinned modes (uc-pins), plus the mode
// on screen while it isn't pinned. Edit turns the launcher into choosing them: a press pins or unpins, All | Default | None.
// New modes go into MODE_LABELS (ui.js), MODE_ORDER here and MODE_WORDS (what the search finds them by).
const DEFAULT_PINS=['calc','units','currency','vat'];
// The launcher's order, four a row: everyday, money, maths, the rest
const MODE_ORDER=['calc','units','currency','vat', 'pct','loan','fuel','energy', 'graph','numbers','equation','stats', 'dates','net','transfer','prog'];
const MODE_WORDS={
 calc:'calculator math scientific sin cos αριθμομηχανη πραξεις επιστημονικη',
 units:'units convert length weight temperature km kg μοναδες μετατροπη μηκος βαρος θερμοκρασια',
 currency:'currency money exchange rate euro dollar usd νομισμα ισοτιμια ευρω δολαριο',
 graph:'graph plot function chart γραφημα συναρτηση',
 vat:'vat tax invoice φπα φορος τιμολογιο',
 pct:'percent of discount tip change sale ποσοστα ποσοστο εκπτωση φιλοδωρημα μεταβολη',
 loan:'interest loan savings mortgage payment τοκοι δανειο αποταμιευση στεγαστικο δοση',
 dates:'dates days calendar age holidays working ημερομηνιες ημερες ημερολογιο ηλικια αργιες εργασιμες',
 numbers:'numbers gcd lcm hcf prime factors factorization divisors αριθμοι μκδ εκπ πρωτοι παραγοντες παραγοντοποιηση διαιρετες',
 equation:'equation equations quadratic solve roots system linear εξισωσεις εξισωση δευτεροβαθμια λυση ριζες συστημα',
 stats:'statistics stats average mean median standard deviation variance sigma list data στατιστικα μεσος ορος διαμεσος τυπικη αποκλιση διακυμανση',
 prog:'programmer hex hexadecimal binary octal decimal bits bytes base convert προγραμματιστης δεκαεξαδικο δυαδικο οκταδικο δεκαδικο βαση μετατροπη',
 fuel:'fuel petrol gas diesel car trip καυσιμα βενζινη πετρελαιο αυτοκινητο ταξιδι',
 energy:'energy electricity kwh power watt cost bill ενεργεια ρευμα καταναλωση ισχυς κοστος λογαριασμος',
 net:'subnet ip network mask cidr ipv4 υποδικτυο δικτυο μασκα',
 transfer:'transfer download upload speed time internet network bandwidth file size data mbps gbps bits bytes copy backup nas μεταφορα ληψη κατεβασμα ανεβασμα ταχυτητα χρονος ιντερνετ δικτυο αρχειο μεγεθος δεδομενα αντιγραφη'
};
function mText(k){
 const el={title:'Όλες οι λειτουργίες',search:'Αναζήτηση',none:'Δεν βρέθηκε κάτι.',close:'Κλείσιμο',
  pin:'Καρφίτσωμα στη γραμμή',unpin:'Ξεκαρφίτσωμα από τη γραμμή',edit:'Αλλαγές',done:'Τέλος',editL:'Διάλεξε ποιες φαίνονται στη γραμμή επάνω',editHint:'Πάτα όσες θέλεις στη γραμμή επάνω.',
  pins:'Καρφιτσωμένες',all:'Όλες',default:'Αρχικές',nopins:'Καμία',allL:'Καρφίτσωμα όλων',defaultL:'Οι αρχικές καρφιτσωμένες',nopinsL:'Ξεκαρφίτσωμα όλων'};
 const en={title:'All modes',search:'Search',none:'Nothing found.',close:'Close',
  pin:'Pin to the bar',unpin:'Unpin from the bar',edit:'Edit',done:'Done',editL:'Choose the modes in the bar at the top',editHint:'Tap the ones you want in the bar at the top.',
  pins:'Pinned modes',all:'All',default:'Default',nopins:'None',allL:'Pin all',defaultL:'Pin the default modes',nopinsL:'Unpin all'};
 return (lang==='el'?el:en)[k];
}
const PIN_ICON='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1.8h4l-.6 4.4 2.4 2.2v1H4.2v-1l2.4-2.2zM8 9.4v4.8" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
function readPins(){
 try{const a=JSON.parse(store.get('uc-pins')||'null');if(Array.isArray(a))return a.filter(m=>MODE_LABELS.includes(m))}catch{}
 return DEFAULT_PINS.slice();
}
let pinnedModes=readPins();
// The tabs in the strip, in the usual order: the pinned modes and the one on screen.
function stripModes(){const cur=currentTab();return MODE_LABELS.filter(m=>pinnedModes.includes(m)||m===cur)}
function savePins(list){
 pinnedModes=MODE_LABELS.filter(x=>list.includes(x));
 store.set('uc-pins',JSON.stringify(pinnedModes));
 renderModeTabs();
}
function togglePin(m){savePins(pinnedModes.includes(m)?pinnedModes.filter(x=>x!==m):[...pinnedModes,m])}
// The All | Default | None switch, shown while choosing (Edit): pins every mode, the starting ones, or none (the mode on
// screen still shows in the strip). The matching choice is lit; after pinning by hand none may match.
const PIN_SETS={all:()=>MODE_LABELS.slice(),default:()=>DEFAULT_PINS.slice(),nopins:()=>[]};
function pinSetNow(){const same=a=>a.length===pinnedModes.length&&a.every(m=>pinnedModes.includes(m));return Object.keys(PIN_SETS).find(k=>same(PIN_SETS[k]()))||''}
function renderPinSet(){
 const box=$('#modesPins');if(!box)return;const on=pinSetNow();
 box.setAttribute('aria-label',mText('pins'));
 box.innerHTML='<span class="modes-seg-icon" aria-hidden="true">'+PIN_ICON+'</span>'+Object.keys(PIN_SETS).map(k=>'<button type="button" data-pins="'+k+'" aria-pressed="'+(k===on)+'" title="'+esc(mText(k+'L'))+'" aria-label="'+esc(mText(k+'L'))+'">'+esc(mText(k))+'</button>').join('');
}
// Search: no accents, no capitals, final ς as σ, so "καυσ" finds Καύσιμα.
const plainText=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ς/g,'σ');
function modeMatches(m,q){
 if(!q)return true;
 const hay=plainText([...MODE_TRANSLATIONS[m]||[],MODE_WORDS[m]||''].join(' '));
 const words=hay.split(/\s+/);
 return plainText(q).split(/\s+/).filter(Boolean).every(w=>words.some(x=>x.startsWith(w)));// the start of a word: "ip" isn't "tip"
}
let modesEditing=false;// choosing what shows in the bar: a press pins or unpins instead of opening
const modesOpen=()=>{const c=$('#modesModal').classList;return !c.contains('hidden')&&!c.contains('closing')};
// A sheet from the bottom on phones (upright or sideways) and narrow windows; a popover on tablets and computers (styles.css has the same sizes)
const modesSheet=()=>matchMedia('(max-width:600px),(max-height:499px)').matches;
// The popover sits under the ⊞ button, its right edge on the button's (CSS pixels: the app is zoomed on big screens)
function placeModes(){
 const box=$('#modesModal'),Z=window.__uiZoom||1,b=$('#modesButton').getBoundingClientRect();
 box.style.setProperty('--by',(b.bottom/Z+8)+'px');box.style.setProperty('--br',Math.max(8,(innerWidth-b.right)/Z)+'px');
}
function openModes(){
 const box=$('#modesModal');if(!box)return;
 modesEditing=false;box.classList.remove('editing','closing');
 $('#modesSearch').value='';
 const card=box.querySelector('.modes-card');card.style.transform='';card.style.transition='';
 placeModes();
 box.classList.remove('hidden');$('#modesButton').setAttribute('aria-expanded','true');
 renderModesList();$('#modesList').scrollTop=0;
 // a keyboard goes straight to the search; on a phone the keyboard would cover the list, so nothing is focused
 if(hasKeyboard())$('#modesSearch').focus({preventScroll:true});
}
// It slides down (the sheet) or fades (the popover) and then goes; closed at once as far as modesOpen() and the keys are concerned
function closeModes(focusBack){
 const box=$('#modesModal');if(!box||!modesOpen())return;
 $('#modesButton').setAttribute('aria-expanded','false');
 box.classList.add('closing');const card=box.querySelector('.modes-card');card.style.transition='';card.style.transform='';
 setTimeout(()=>{if(box.classList.contains('closing')){box.classList.add('hidden');box.classList.remove('closing','editing');modesEditing=false}},200);
 if(focusBack&&hasKeyboard())$('#modesButton').focus({preventScroll:true});
}
function setModesEdit(on){
 modesEditing=on;$('#modesModal').classList.toggle('editing',on);
 if(on)$('#modesSearch').value='';
 renderModesList();
}
function renderModesList(){
 const list=$('#modesList');if(!list)return;
 const q=modesEditing?'':$('#modesSearch').value.trim(),cur=currentTab();
 const tile=m=>{const pinned=pinnedModes.includes(m),on=m===cur;
  return '<div class="mode-tile'+(on?' on':'')+(pinned?' pinned':'')+'"><button class="mode-pick" type="button" data-mode="'+m+'"'+(on?' aria-current="true"':'')+
   (modesEditing?' aria-pressed="'+pinned+'" aria-label="'+esc(mText(pinned?'unpin':'pin')+': '+modeText(m))+'"':'')+'>'+
   '<span class="mode-pick-icon" aria-hidden="true">'+modeIcon(m)+'</span><span class="mode-pick-name">'+esc(modeText(m))+'</span></button>'+
   '<span class="mode-badge" aria-hidden="true">'+PIN_ICON+'</span></div>'};
 const shown=MODE_ORDER.filter(m=>modeMatches(m,q));
 list.innerHTML=shown.length?'<div class="mode-grid">'+shown.map(tile).join('')+'</div>':'<p class="modes-none">'+esc(mText('none'))+'</p>';
 // the texts (also after a change of language while it is open)
 $('#modesTitle').textContent=mText(modesEditing?'pins':'title');
 const s=$('#modesSearch');s.placeholder=mText('search');s.setAttribute('aria-label',mText('search'));
 $('#closeModes').setAttribute('aria-label',mText('close'));
 const ed=$('#modesEdit');ed.innerHTML=modesEditing?esc(mText('done')):PIN_ICON+'<span>'+esc(mText('edit'))+'</span>';
 ed.setAttribute('aria-pressed',modesEditing);ed.setAttribute('aria-label',mText(modesEditing?'done':'editL'));ed.title=modesEditing?'':mText('editL');
 $('#modesHint').textContent=mText('editHint');
 renderPinSet();
 fitModeNames();
}
// a long name (Αριθμομηχανή on a narrow phone) gets a slightly smaller font rather than "…"
function fitModeNames(){
 if(!modesOpen())return;
 for(const n of $$('#modesList .mode-pick-name')){n.style.fontSize='';n.style.letterSpacing='';const cut=()=>n.scrollWidth>n.clientWidth;
  if(!cut())continue;const base=parseFloat(getComputedStyle(n).fontSize)||11.5;
  for(let px=base-.5;px>=10&&cut();px-=.5)n.style.fontSize=px+'px';
  if(cut())n.style.letterSpacing='-.03em'}// a narrow phone with a wide font: 10px and a little tighter
}
addEventListener('resize',()=>{if(modesOpen())placeModes();fitModeNames()});
function pickMode(m){closeModes(false);if(m!==currentTab())switchMode(m);else syncModeTabs()}
function setupModes(){
 const box=$('#modesModal');if(!box)return;
 $('#modesButton').addEventListener('click',()=>modesOpen()?closeModes(true):openModes());
 box.addEventListener('click',e=>{
  if(e.target===box){closeModes(true);return}// the space around the sheet or the popover
  if(e.target.closest('#closeModes')){if(performance.now()-modesDragged>400)closeModes(true);return}// not the click that ends a drag
  if(e.target.closest('#modesEdit')){setModesEdit(!modesEditing);if(hasKeyboard())$('#modesEdit').focus({preventScroll:true});return}
  const set=e.target.closest('[data-pins]');if(set){const k=set.dataset.pins;savePins(PIN_SETS[k]());renderModesList();if(hasKeyboard())$('#modesPins [data-pins="'+k+'"]')?.focus({preventScroll:true});return}
  const pick=e.target.closest('.mode-tile')?.querySelector('.mode-pick');if(!pick)return;
  const m=pick.dataset.mode;
  if(!modesEditing){pickMode(m);return}
  togglePin(m);renderModesList();if(hasKeyboard())$('#modesList .mode-pick[data-mode="'+m+'"]')?.focus({preventScroll:true});
 });
 $('#modesSearch').addEventListener('input',renderModesList);
 $('#modesSearch').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();const first=$('#modesList .mode-pick');if(first)pickMode(first.dataset.mode)}
  else if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();$('#modesList .mode-pick')?.focus()}// stopped here, or modesKeydown would move on from that icon
 });
 setupModesDrag();
}
// The sheet (phones): dragging its handle or the row under it down closes it; let go early and it goes back up.
let modesDragged=0;// when a drag last moved, so the click that ends it on the handle doesn't count as a press
function setupModesDrag(){
 const box=$('#modesModal'),card=box.querySelector('.modes-card');let d=null;
 card.addEventListener('pointerdown',e=>{
  if(!modesSheet()||!e.target.closest('.modes-handle,.modes-head')||e.target.closest('.modes-head button,input'))return;
  d={y:e.clientY,t:performance.now(),id:e.pointerId,dy:0};try{card.setPointerCapture(e.pointerId)}catch{}
 });
 card.addEventListener('pointermove',e=>{
  if(!d||e.pointerId!==d.id)return;d.dy=Math.max(0,(e.clientY-d.y)/(window.__uiZoom||1));
  if(d.dy>6)modesDragged=performance.now();
  card.style.transition='none';card.style.transform='translateY('+d.dy+'px)';
 });
 const end=e=>{
  if(!d||e.pointerId!==d.id)return;const speed=d.dy/Math.max(1,performance.now()-d.t),far=d.dy>90||(d.dy>24&&speed>.5);d=null;
  card.style.transition='';if(far)closeModes(false);else card.style.transform='';
 };
 card.addEventListener('pointerup',end);card.addEventListener('pointercancel',end);
}
// Keys while the launcher is open stay in it (main.js asks first): Esc closes, Ctrl+K / ⌘K opens it from anywhere.
function modesKeydown(e){
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();modesOpen()?closeModes(true):openModes();return true}
 if(!modesOpen())return false;
 if(e.key==='Escape'){e.preventDefault();closeModes(true);return true}
 // ← → ↑ ↓ move between the modes, a row up or down at a time; up from the first row goes to the search
 if(/^Arrow(Left|Right|Up|Down)$/.test(e.key)&&document.activeElement?.matches('.mode-pick')){
  e.preventDefault();const all=[...$('#modesList').querySelectorAll('.mode-pick')],i=all.indexOf(document.activeElement);
  const cols=getComputedStyle($('#modesList .mode-grid')).gridTemplateColumns.split(' ').length;
  const n=all[i+{ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols}[e.key]];
  if(n)n.focus();else if((e.key==='ArrowUp'||(e.key==='ArrowLeft'&&i===0))&&!modesEditing)$('#modesSearch').focus();
 }
 return true;
}
