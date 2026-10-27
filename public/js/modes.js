// All modes: the ⊞ button beside History opens a sheet with every mode, grouped, with a search box. The strip of tabs
// shows only the pinned modes (uc-pins; pin or unpin in the sheet), plus the mode on screen while it isn't pinned.
// New modes go into MODE_LABELS (ui.js), a group here and MODE_WORDS (what the search finds them by).
const DEFAULT_PINS=['calc','units','currency','vat'];
const MODE_GROUPS=[['everyday',['calc','units','currency']],['money',['vat','pct','loan','fuel','energy']],['more',['graph','numbers','equation','stats','dates','net','prog']]];
// Extra words the search finds a mode by (besides its name in both languages), so "tip", "loan" or "ip" lead somewhere.
const MODE_WORDS={
 calc:'calculator math scientific sin cos αριθμομηχανη πραξεις επιστημονικη',
 units:'units convert length weight temperature km kg μοναδες μετατροπη μηκος βαρος θερμοκρασια',
 currency:'currency money exchange rate euro dollar usd νομισμα ισοτιμια ευρω δολαριο',
 graph:'graph plot function chart γραφημα συναρτηση',
 vat:'vat tax invoice φπα φορος τιμολογιο',
 pct:'percent discount tip change sale ποσοστα εκπτωση φιλοδωρημα μεταβολη',
 loan:'interest loan savings mortgage payment τοκοι δανειο αποταμιευση στεγαστικο δοση',
 dates:'dates days calendar age holidays working ημερομηνιες ημερες ημερολογιο ηλικια αργιες εργασιμες',
 numbers:'numbers gcd lcm hcf prime factors factorization divisors αριθμοι μκδ εκπ πρωτοι παραγοντες παραγοντοποιηση διαιρετες',
 equation:'equation equations quadratic solve roots system linear εξισωσεις εξισωση δευτεροβαθμια λυση ριζες συστημα',
 stats:'statistics stats average mean median standard deviation variance sigma list data στατιστικα μεσος ορος διαμεσος τυπικη αποκλιση διακυμανση',
 prog:'programmer hex hexadecimal binary octal decimal bits bytes base convert προγραμματιστης δεκαεξαδικο δυαδικο οκταδικο δεκαδικο βαση μετατροπη',
 fuel:'fuel petrol gas diesel car trip καυσιμα βενζινη πετρελαιο αυτοκινητο ταξιδι',
 energy:'energy electricity kwh power watt cost bill ενεργεια ρευμα καταναλωση ισχυς κοστος λογαριασμος',
 net:'subnet ip network mask cidr ipv4 υποδικτυο δικτυο μασκα'
};
function mText(k){
 const el={title:'Όλες οι λειτουργίες',search:'Αναζήτηση',none:'Δεν βρέθηκε κάτι.',everyday:'Καθημερινά',money:'Χρήματα',more:'Άλλα',
  pin:'Καρφίτσωμα στη γραμμή',unpin:'Ξεκαρφίτσωμα από τη γραμμή',hint:'Οι καρφιτσωμένες εμφανίζονται στη γραμμή επάνω.',close:'Κλείσιμο',
  pins:'Καρφιτσωμένες',all:'Όλες',default:'Αρχικές',nopins:'Καμία',allL:'Καρφίτσωμα όλων',defaultL:'Οι αρχικές καρφιτσωμένες',nopinsL:'Ξεκαρφίτσωμα όλων'};
 const en={title:'All modes',search:'Search',none:'Nothing found.',everyday:'Everyday',money:'Money',more:'More',
  pin:'Pin to the bar',unpin:'Unpin from the bar',hint:'Pinned modes show in the bar at the top.',close:'Close',
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
 card.classList.remove('seg-below');if(head.scrollWidth>head.clientWidth+1)card.classList.add('seg-below');
}
// Search: no accents, no capitals, final ς as σ, so "καυσ" finds Καύσιμα.
const plainText=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ς/g,'σ');
function modeMatches(m,q){
 if(!q)return true;
 const hay=plainText([...MODE_TRANSLATIONS[m]||[],MODE_WORDS[m]||''].join(' '));
 const words=hay.split(/\s+/);
 return plainText(q).split(/\s+/).filter(Boolean).every(w=>words.some(x=>x.startsWith(w)));// the start of a word: "ip" isn't "tip"
}
const modesOpen=()=>!$('#modesModal').classList.contains('hidden');
function openModes(){
 const box=$('#modesModal');if(!box)return;
 $('#modesTitle').textContent=mText('title');
 const s=$('#modesSearch');s.value='';s.placeholder=mText('search');s.setAttribute('aria-label',mText('search'));
 $('#closeModes').setAttribute('aria-label',mText('close'));
 renderModesList();
 box.classList.remove('hidden');$('#modesButton').setAttribute('aria-expanded','true');
 fitModeNames();fitModesHead();
 // a keyboard goes straight to the search; on a phone the keyboard would cover the list, so nothing is focused
 if(hasKeyboard())s.focus({preventScroll:true});
}
function closeModes(focusBack){
 const box=$('#modesModal');if(!box||box.classList.contains('hidden'))return;
 box.classList.add('hidden');$('#modesButton').setAttribute('aria-expanded','false');
 if(focusBack&&hasKeyboard())$('#modesButton').focus({preventScroll:true});
}
function renderModesList(){
 const list=$('#modesList');if(!list)return;
 const q=$('#modesSearch')?.value.trim()||'',cur=currentTab();
 const tile=m=>{const pinned=pinnedModes.includes(m);
  return '<div class="mode-tile'+(m===cur?' on':'')+'"><button class="mode-pick'+(m===cur?' on':'')+'" type="button" data-mode="'+m+'"'+(m===cur?' aria-current="true"':'')+'>'+
   '<span class="mode-pick-icon" aria-hidden="true">'+modeIcon(m)+'</span><span class="mode-pick-name">'+esc(modeText(m))+'</span></button>'+
   '<button class="mode-pin'+(pinned?' pinned':'')+'" type="button" data-pin="'+m+'" aria-pressed="'+pinned+'" aria-label="'+esc(mText(pinned?'unpin':'pin')+': '+modeText(m))+'" title="'+esc(mText(pinned?'unpin':'pin'))+'">'+PIN_ICON+'</button></div>'};
 const groups=MODE_GROUPS.map(([g,ms])=>{const shown=ms.filter(m=>modeMatches(m,q));
  return shown.length?'<section class="mode-group"><h3>'+esc(mText(g))+'</h3><div class="mode-grid">'+shown.map(tile).join('')+'</div></section>':''}).join('');
 list.innerHTML=groups||'<p class="modes-none">'+esc(mText('none'))+'</p>';
 $('#modesHint').textContent=mText('hint');
 renderPinSet();
 fitModeNames();fitModesHead();
}
// a long name (Αριθμομηχανή on a phone) gets a slightly smaller font rather than "…"
function fitModeNames(){
 if(!modesOpen())return;
 for(const n of $$('#modesList .mode-pick-name')){n.style.fontSize='';for(let px=12.5;px>=11&&n.scrollWidth>n.clientWidth+1;px-=.5)n.style.fontSize=px+'px'}
}
addEventListener('resize',()=>{fitModeNames();fitModesHead()});
function pickMode(m){closeModes(false);if(m!==currentTab())switchMode(m);else syncModeTabs()}
function setupModes(){
 const box=$('#modesModal');if(!box)return;
 $('#modesButton').addEventListener('click',()=>modesOpen()?closeModes(true):openModes());
 $('#closeModes').addEventListener('click',()=>closeModes(true));
 box.addEventListener('click',e=>{
  if(e.target===box){closeModes(true);return}// the dimmed space around the sheet
  const set=e.target.closest('[data-pins]');if(set){const k=set.dataset.pins;savePins(PIN_SETS[k]());renderModesList();if(hasKeyboard())$('#modesPins [data-pins="'+k+'"]')?.focus({preventScroll:true});return}
  const pin=e.target.closest('[data-pin]');if(pin){const m=pin.dataset.pin;togglePin(m);renderModesList();if(hasKeyboard())$('#modesList [data-pin="'+m+'"]')?.focus({preventScroll:true});return}
  const pick=e.target.closest('.mode-pick');if(pick)pickMode(pick.dataset.mode);
 });
 $('#modesSearch').addEventListener('input',renderModesList);
 $('#modesSearch').addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();const first=$('#modesList .mode-pick');if(first)pickMode(first.dataset.mode)}
  else if(e.key==='ArrowDown'){e.preventDefault();$('#modesList .mode-pick')?.focus()}
 });
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
