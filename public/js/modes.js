// All modes: the ⊞ button beside History opens a sheet with every mode, grouped, with a search box. The strip of tabs
// shows only the pinned modes (uc-pins; pin or unpin in the sheet), plus the mode on screen while it isn't pinned.
// New modes go into MODE_LABELS (ui.js), a group here and MODE_WORDS (what the search finds them by).
const DEFAULT_PINS=['calc','units','currency','vat'];
const MODE_GROUPS=[['everyday',['calc','units','currency']],['money',['vat','pct','loan','fuel','energy']],['more',['graph','numbers','equation','stats','dates','net','transfer','prog']]];
// PROTOTYPE (preview branch only): three new looks for this sheet, to compare. ?menu=a|b|c|now picks one, and on the
// preview site (/preview/) the switch at the bottom of the sheet does too (uc-try-menu). Anywhere else the look is 'now'.
// a: a launcher (round icons like the keys, 4 a row; a sheet from the bottom on phones, a popover under ⊞ on a computer)
// b: a list with a line about each mode (a sheet from the bottom on phones, two columns on a computer)
// c: the strip unfolds (the same pills as the tabs, in a panel under the top bar)
const MENU_LOOKS=['now','a','b','c'];
const MENU_TRY=(()=>{try{return location.pathname.startsWith('/preview/')||new URLSearchParams(location.search).has('menu')}catch{return false}})();
let menuLook=(()=>{if(!MENU_TRY)return 'now';let v='';try{v=new URLSearchParams(location.search).get('menu')||store.get('uc-try-menu')||'a'}catch{}return MENU_LOOKS.includes(v)?v:'a'})();
let modesEdit=false;// looks a and c: choosing what shows in the bar (a press pins or unpins instead of opening)
const modesDesk=()=>matchMedia('(min-width:601px) and (min-height:500px)').matches;// a tablet or a computer; phones get sheets
// look b: what each mode does, [Greek, English]
const MODE_DESC={
 calc:['Επιστημονική, μιγαδικοί, μνήμη','Scientific, complex numbers, memory'],
 units:['Μήκος, βάρος, θερμοκρασία','Length, weight, temperature'],
 currency:['Ισοτιμίες της ΕΚΤ','ECB exchange rates'],
 vat:['Με ΦΠΑ ή χωρίς','Add or remove VAT'],
 pct:['Έκπτωση, μεταβολή, φιλοδώρημα','Discount, change, tip'],
 loan:['Δάνειο και αποταμίευση','Loan and savings'],
 fuel:['Κόστος διαδρομής, κατανάλωση','Trip cost, consumption'],
 energy:['Κόστος ρεύματος','Electricity cost'],
 graph:['Γραφική παράσταση συναρτήσεων','Plot functions'],
 numbers:['ΜΚΔ, ΕΚΠ, πρώτοι παράγοντες','GCD, LCM, prime factors'],
 equation:['Δευτεροβάθμιες, συστήματα 2×2','Quadratics, 2×2 systems'],
 stats:['Μέσος όρος, διάμεσος, απόκλιση','Average, median, deviation'],
 dates:['Διαφορά ημερών, εργάσιμες','Days between, working days'],
 net:['Δίκτυα IPv4','IPv4 networks'],
 transfer:['Χρόνος, μέγεθος, ταχύτητα λήψης','Download time, size, speed'],
 prog:['Δεκαεξαδικό, δυαδικό, οκταδικό','Hex, binary, octal']
};
// Extra words the search finds a mode by (besides its name in both languages), so "tip", "loan" or "ip" lead somewhere.
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
 const el={title:'Όλες οι λειτουργίες',search:'Αναζήτηση',none:'Δεν βρέθηκε κάτι.',everyday:'Καθημερινά',money:'Χρήματα',more:'Άλλα',
  pin:'Καρφίτσωμα στη γραμμή',unpin:'Ξεκαρφίτσωμα από τη γραμμή',hint:'Οι καρφιτσωμένες εμφανίζονται στη γραμμή επάνω.',close:'Κλείσιμο',
  edit:'Αλλαγές',done:'Τέλος',editHint:'Πάτα όσες θέλεις στη γραμμή επάνω.',bar:'Στη γραμμή',tryNow:'Τώρα',try:'Δοκιμή',
  pins:'Καρφιτσωμένες',all:'Όλες',default:'Αρχικές',nopins:'Καμία',allL:'Καρφίτσωμα όλων',defaultL:'Οι αρχικές καρφιτσωμένες',nopinsL:'Ξεκαρφίτσωμα όλων'};
 const en={title:'All modes',search:'Search',none:'Nothing found.',everyday:'Everyday',money:'Money',more:'More',
  pin:'Pin to the bar',unpin:'Unpin from the bar',hint:'Pinned modes show in the bar at the top.',close:'Close',
  edit:'Edit',done:'Done',editHint:'Tap the ones you want in the bar at the top.',bar:'In the bar',tryNow:'Now',try:'Try',
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
// The All | Default | None switch in the sheet's header: pins every mode, the starting ones, or none (the mode on
// screen still shows in the strip). The matching choice is lit; after pinning by hand none may match.
const PIN_SETS={all:()=>MODE_LABELS.slice(),default:()=>DEFAULT_PINS.slice(),nopins:()=>[]};
function pinSetNow(){const same=a=>a.length===pinnedModes.length&&a.every(m=>pinnedModes.includes(m));return Object.keys(PIN_SETS).find(k=>same(PIN_SETS[k]()))||''}
function renderPinSet(){
 const box=$('#modesPins');if(!box)return;const on=pinSetNow();
 box.setAttribute('aria-label',mText('pins'));
 box.innerHTML='<span class="modes-seg-icon" aria-hidden="true">'+PIN_ICON+'</span>'+Object.keys(PIN_SETS).map(k=>'<button type="button" data-pins="'+k+'" aria-pressed="'+(k===on)+'" title="'+esc(mText(k+'L'))+'" aria-label="'+esc(mText(k+'L'))+'">'+esc(mText(k))+'</button>').join('');
}
// beside the title when there is room, else on its own line under it (Greek on a phone)
function fitModesHead(){
 const card=$('#modesModal .modes-card'),head=card?.querySelector('.section-heading');if(!head||!modesOpen())return;
 card.classList.remove('seg-below');if(menuLook!=='now')return;if(head.scrollWidth>head.clientWidth+1)card.classList.add('seg-below');
}
// Search: no accents, no capitals, final ς as σ, so "καυσ" finds Καύσιμα.
const plainText=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ς/g,'σ');
function modeMatches(m,q){
 if(!q)return true;
 const hay=plainText([...MODE_TRANSLATIONS[m]||[],MODE_WORDS[m]||''].join(' '));
 const words=hay.split(/\s+/);
 return plainText(q).split(/\s+/).filter(Boolean).every(w=>words.some(x=>x.startsWith(w)));// the start of a word: "ip" isn't "tip"
}
const modesOpen=()=>{const c=$('#modesModal').classList;return !c.contains('hidden')&&!c.contains('closing')};
// PROTOTYPE: where the popover (a, on a computer) and the panel (c) sit: under the ⊞ button, under the top bar. CSS pixels.
function placeModes(){
 const box=$('#modesModal'),Z=window.__uiZoom||1;if(!box||menuLook==='now')return;
 const b=$('#modesButton').getBoundingClientRect(),t=$('.topbar').getBoundingClientRect();
 box.style.setProperty('--by',(b.bottom/Z+8)+'px');box.style.setProperty('--br',Math.max(8,(innerWidth-b.right)/Z)+'px');
 box.style.setProperty('--ty',(t.bottom/Z+2)+'px');box.style.setProperty('--tl',(t.left/Z)+'px');box.style.setProperty('--tw',(t.width/Z)+'px');
}
function applyMenuLook(){
 const box=$('#modesModal');if(!box||!$('#modesEdit'))return;
 for(const k of MENU_LOOKS)box.classList.toggle('look-'+k,k===menuLook&&k!=='now');
 modesEdit=false;box.classList.remove('editing');
 if(menuLook==='b')$('#modesFoot').append($('#modesPins'));else $('#modesEdit').before($('#modesPins'));
 placeModes();
}
function setModesEdit(on){
 modesEdit=on;$('#modesModal').classList.toggle('editing',on);
 if(on)$('#modesSearch').value='';
 renderModesList();
}
function openModes(){
 const box=$('#modesModal');if(!box)return;
 modesEdit=false;box.classList.remove('editing','closing');
 const s=$('#modesSearch');s.value='';s.placeholder=mText('search');s.setAttribute('aria-label',mText('search'));
 $('#closeModes').setAttribute('aria-label',mText('close'));
 renderModesList();
 const card=box.querySelector('.modes-card');card.style.transform='';card.style.transition='';
 placeModes();
 box.classList.remove('hidden');$('#modesButton').setAttribute('aria-expanded','true');
 fitModeNames();fitModesHead();
 // a keyboard goes straight to the search; on a phone the keyboard would cover the list, so nothing is focused
 if(hasKeyboard())s.focus({preventScroll:true});
}
function closeModes(focusBack){
 const box=$('#modesModal');if(!box||!modesOpen())return;
 $('#modesButton').setAttribute('aria-expanded','false');
 if(menuLook==='now')box.classList.add('hidden');
 else{// the new looks slide or fade away first
  box.classList.add('closing');const card=box.querySelector('.modes-card');card.style.transition='';card.style.transform='';
  setTimeout(()=>{if(box.classList.contains('closing')){box.classList.add('hidden');box.classList.remove('closing','editing');modesEdit=false}},200);
 }
 if(focusBack&&hasKeyboard())$('#modesButton').focus({preventScroll:true});
}
function renderModesList(){
 const list=$('#modesList');if(!list)return;
 const q=$('#modesSearch')?.value.trim()||'',cur=currentTab(),look=menuLook;
 const icon=m=>'<span class="mode-pick-icon" aria-hidden="true">'+modeIcon(m)+'</span>',name=m=>'<span class="mode-pick-name">'+esc(modeText(m))+'</span>';
 const pinBtn=(m,pinned)=>'<button class="mode-pin'+(pinned?' pinned':'')+'" type="button" data-pin="'+m+'" aria-pressed="'+pinned+'" aria-label="'+esc(mText(pinned?'unpin':'pin')+': '+modeText(m))+'" title="'+esc(mText(pinned?'unpin':'pin'))+'">'+PIN_ICON+'</button>';
 const tile=m=>{const pinned=pinnedModes.includes(m),on=m===cur;
  const open='<div class="mode-tile'+(on?' on':'')+(pinned?' pinned':'')+'"><button class="mode-pick'+(on?' on':'')+'" type="button" data-mode="'+m+'"'+(on?' aria-current="true"':'');
  if(look==='b')return open+'>'+icon(m)+'<span class="mode-pick-text">'+name(m)+'<span class="mode-pick-desc">'+esc(MODE_DESC[m]?.[lang==='el'?0:1]||'')+'</span></span></button>'+pinBtn(m,pinned)+'</div>';
  // a and c: no pin on the tile; while choosing what shows in the bar (Edit) a press pins or unpins, shown by the mark
  if(look==='a'||look==='c')return open+(modesEdit?' aria-pressed="'+pinned+'"':'')+'>'+icon(m)+name(m)+'</button><span class="mode-badge" aria-hidden="true">'+PIN_ICON+'</span></div>';
  return open+'>'+icon(m)+name(m)+'</button>'+pinBtn(m,pinned)+'</div>'};
 // a: one grid, no group titles (16 modes are four rows of four)
 const sets=look==='a'?[['',MODE_GROUPS.flatMap(g=>g[1])]]:MODE_GROUPS;
 const groups=sets.map(([g,ms])=>{const shown=ms.filter(m=>modeMatches(m,q));
  return shown.length?'<section class="mode-group">'+(g?'<h3>'+esc(mText(g))+'</h3>':'')+'<div class="mode-grid">'+shown.map(tile).join('')+'</div></section>':''}).join('');
 list.innerHTML=groups||'<p class="modes-none">'+esc(mText('none'))+'</p>';
 $('#modesTitle').textContent=mText(modesEdit?'pins':'title');
 $('#modesHint').textContent=mText(modesEdit?'editHint':'hint');
 const ed=$('#modesEdit');if(ed){ed.innerHTML=modesEdit?esc(mText('done')):PIN_ICON+'<span>'+esc(mText('edit'))+'</span>';ed.setAttribute('aria-pressed',modesEdit)}
 const foot=$('#modesFootLabel');if(foot)foot.textContent=mText('bar');
 const tr=$('#modesTry');if(tr)tr.innerHTML='<span>'+esc(mText('try'))+'</span>'+MENU_LOOKS.map(k=>'<button type="button" data-look="'+k+'" aria-pressed="'+(k===menuLook)+'">'+esc(k==='now'?mText('tryNow'):k.toUpperCase())+'</button>').join('');
 renderPinSet();
 fitModeNames();fitModesHead();
}
// a long name (Αριθμομηχανή on a phone) gets a slightly smaller font rather than "…"
function fitModeNames(){
 if(!modesOpen())return;
 for(const n of $$('#modesList .mode-pick-name')){n.style.fontSize='';n.style.letterSpacing='';const cut=()=>n.scrollWidth>n.clientWidth+1;
  if(!cut())continue;const base=parseFloat(getComputedStyle(n).fontSize)||13,lo=Math.max(10,base-2),lo2=Math.max(10,base-3);// 13px: to 11, then tighter to 10
  for(let px=base-.5;px>=lo&&cut();px-=.5)n.style.fontSize=px+'px';
  if(cut()){n.style.letterSpacing='-.03em';for(let px=lo;px>=lo2&&cut();px-=.5)n.style.fontSize=px+'px'}}// a narrow phone with a wide font: a little tighter, then 10px
}
addEventListener('resize',()=>{if(modesOpen())placeModes();fitModeNames();fitModesHead()});
function pickMode(m){closeModes(false);if(m!==currentTab())switchMode(m);else syncModeTabs()}
function setupModes(){
 const box=$('#modesModal');if(!box)return;
 if(MENU_TRY){// PROTOTYPE: the handle, the Edit button, look b's foot and the switch between the looks
  const card=box.querySelector('.modes-card');
  card.insertAdjacentHTML('afterbegin','<div class="sheet-handle modes-handle" aria-hidden="true"></div>');
  $('#closeModes').insertAdjacentHTML('beforebegin','<button id="modesEdit" class="modes-edit" type="button"></button>');
  card.insertAdjacentHTML('beforeend','<div id="modesFoot" class="modes-foot"><span id="modesFootLabel"></span></div><div id="modesTry" class="modes-try" role="group"></div>');
  applyMenuLook();setupModesDrag();
 }
 $('#modesButton').addEventListener('click',()=>modesOpen()?closeModes(true):openModes());
 $('#closeModes').addEventListener('click',()=>closeModes(true));
 box.addEventListener('click',e=>{
  if(e.target===box){closeModes(true);return}// the dimmed space around the sheet
  const look=e.target.closest('[data-look]');if(look){menuLook=look.dataset.look;store.set('uc-try-menu',menuLook);applyMenuLook();openModes();return}
  if(e.target.closest('#modesEdit')){setModesEdit(!modesEdit);return}
  const set=e.target.closest('[data-pins]');if(set){const k=set.dataset.pins;savePins(PIN_SETS[k]());renderModesList();if(hasKeyboard())$('#modesPins [data-pins="'+k+'"]')?.focus({preventScroll:true});return}
  const pin=e.target.closest('[data-pin]');if(pin){const m=pin.dataset.pin;togglePin(m);renderModesList();if(hasKeyboard())$('#modesList [data-pin="'+m+'"]')?.focus({preventScroll:true});return}
  if(modesEdit){const tl=e.target.closest('.mode-tile')?.querySelector('.mode-pick');if(tl){const m=tl.dataset.mode;togglePin(m);renderModesList();if(hasKeyboard())$('#modesList .mode-pick[data-mode="'+m+'"]')?.focus({preventScroll:true})}return}
  const pick=e.target.closest('.mode-pick');if(pick)pickMode(pick.dataset.mode);
 });
 $('#modesSearch').addEventListener('input',renderModesList);
 $('#modesSearch').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();const first=$('#modesList .mode-pick');if(first)pickMode(first.dataset.mode)}
  else if(e.key==='ArrowDown'){e.preventDefault();$('#modesList .mode-pick')?.focus()}
 });
}
// PROTOTYPE: on phones looks a and b are sheets from the bottom: dragging the handle or the title down closes them.
function setupModesDrag(){
 const box=$('#modesModal'),card=box.querySelector('.modes-card');let d=null;
 const sheet=()=>(menuLook==='a'||menuLook==='b')&&!modesDesk();
 card.addEventListener('pointerdown',e=>{
  if(!sheet()||!e.target.closest('.modes-handle,.section-heading')||e.target.closest('button,input'))return;
  d={y:e.clientY,t:performance.now(),id:e.pointerId,dy:0};try{card.setPointerCapture(e.pointerId)}catch{}
 });
 card.addEventListener('pointermove',e=>{
  if(!d||e.pointerId!==d.id)return;d.dy=Math.max(0,(e.clientY-d.y)/(window.__uiZoom||1));
  card.style.transition='none';card.style.transform='translateY('+d.dy+'px)';
 });
 const end=e=>{
  if(!d||e.pointerId!==d.id)return;const speed=d.dy/Math.max(1,performance.now()-d.t),far=d.dy>90||(d.dy>24&&speed>.5);d=null;
  card.style.transition='';if(far)closeModes(false);else card.style.transform='';
 };
 card.addEventListener('pointerup',end);card.addEventListener('pointercancel',end);
}
// Keys while the sheet is open stay in it (main.js asks first): Esc closes, Ctrl+K / ⌘K opens it from anywhere.
function modesKeydown(e){
 if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){e.preventDefault();modesOpen()?closeModes(true):openModes();return true}
 if(!modesOpen())return false;
 if(e.key==='Escape'){e.preventDefault();closeModes(true);return true}
 // ← → ↑ ↓ move between the modes in the sheet
 if(/^Arrow(Left|Right|Up|Down)$/.test(e.key)&&document.activeElement?.matches('.mode-pick')){
  e.preventDefault();const all=[...$('#modesList').querySelectorAll('.mode-pick')],i=all.indexOf(document.activeElement);
  const n=all[i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)];if(n)n.focus();else if(e.key==='ArrowUp'||e.key==='ArrowLeft')$('#modesSearch').focus();
 }
 return true;
}
