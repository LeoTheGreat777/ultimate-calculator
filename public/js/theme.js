// Themes: the ready-made ones (colours in styles.css, html[data-theme]), the user's own light and dark theme,
// Match device, the theme menu and the editor for the own themes.
// - A ready-made theme is a block in styles.css, its name in LIGHT_PRESETS or DARK_PRESETS and its text in T (themeX).
// - Own themes ('custom-light', 'custom-dark') are made from just a background and an accent (deriveTheme works out
//   every other token and keeps text readable). Saved in uc-custom-themes with the tokens, so the <head> script in
//   index.html can apply them before the first paint; writeCustomCss puts them in <style id="customThemes"> as
//   html[data-theme="custom-…"] rules, so they work like the others (also in [data-theme-preview] swatches).
// - theme is 'auto' (Match device) or one theme. With 'auto' the device picks between two themes: themePair
//   (uc-theme-pair) {light, dark}, one from each group.
const LIGHT_PRESETS=['light','paper','rose','sky'],DARK_PRESETS=['dark','black','ocean','violet','ember','forest'];
const THEME_GROUPS={light:[...LIGHT_PRESETS,'custom-light'],dark:[...DARK_PRESETS,'custom-dark']};
const THEMES=['auto',...THEME_GROUPS.light,...THEME_GROUPS.dark];
const themeGroup=n=>THEME_GROUPS.light.includes(n)?'light':'dark';
const prefersLight=matchMedia('(prefers-color-scheme: light)');
const deviceGroup=()=>prefersLight.matches?'light':'dark';
const readJson=k=>{try{const v=JSON.parse(store.get(k)||'null');return v&&typeof v==='object'?v:{}}catch{return {}}};
const HEX_RE=/^#[0-9a-f]{6}$/i;
let customThemes=readJson('uc-custom-themes');// {light:{bg,accent,vars}, dark:{…}}
for(const g of ['light','dark']){const c=customThemes[g];if(c&&HEX_RE.test(c.bg)&&HEX_RE.test(c.accent))customThemes[g]={bg:c.bg,accent:c.accent};else delete customThemes[g]}
let themePair=readJson('uc-theme-pair');
for(const g of ['light','dark'])if(!THEME_GROUPS[g].includes(themePair[g]))themePair[g]=g;
if(!THEMES.includes(theme))theme='dark';
let themeDraft=null;// while the editor is open: {group, bg, accent}, shown on screen but not saved
const themeUsable=n=>THEMES.includes(n)&&n!=='auto'&&(!n.startsWith('custom-')||!!customThemes[themeGroup(n)]);
function resolveTheme(name){
 const n=name==='auto'?themePair[deviceGroup()]:name;
 return themeUsable(n)?n:themeGroup(n);// an own theme that isn't made: its group's first theme
}
function resolvedTheme(){return resolveTheme(theme)}

/* ---------- Own themes: all the colours from a background and an accent ---------- */
const hexRgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const rgbHex=c=>'#'+c.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
const mixRgb=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const relLum=c=>{const l=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};return .2126*l(c[0])+.7152*l(c[1])+.0722*l(c[2])};
const contrastRatio=(a,b)=>{const x=relLum(a),y=relLum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
function rgbHsl(c){
 const [r,g,b]=c.map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
 let h=0;const s=d?d/(1-Math.abs(2*l-1)):0;
 if(d)h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;
 return [(h*60+360)%360,s,l];
}
function hslRgb([h,s,l]){
 h=(h%360+360)%360;
 const C=(1-Math.abs(2*l-1))*s,X=C*(1-Math.abs((h/60)%2-1)),m=l-C/2;
 const p=h<60?[C,X,0]:h<120?[X,C,0]:h<180?[0,C,X]:h<240?[0,X,C]:h<300?[X,0,C]:[C,0,X];
 return p.map(v=>(v+m)*255);
}
// A background stays in its group: a dark theme's at most as bright as navy (luminance 0.02), a light theme's at least
// 0.72 (a pale tint). Only its lightness changes, so the colour keeps its hue.
function clampThemeBg(hex,group){
 const [h,s,l]=rgbHsl(hexRgb(hex)),lumAt=x=>relLum(hslRgb([h,s,x])),dark=group==='dark',limit=dark?.02:.72;
 if(dark?lumAt(l)<=limit:lumAt(l)>=limit)return hex.toLowerCase();
 let lo=dark?0:l,hi=dark?l:1;
 for(let i=0;i<24;i++){const mid=(lo+hi)/2;if((lumAt(mid)<=limit)===dark)(dark?lo=mid:hi=mid);else(dark?hi=mid:lo=mid)}
 return rgbHex(hslRgb([h,s,dark?lo:hi]));
}
function deriveTheme(group,bgHex,accentHex){
 const dark=group==='dark',W=[255,255,255],K=[0,0,0],A=hexRgb(accentHex),B=hexRgb(clampThemeBg(bgHex,group));
 // move a colour towards white or black until it reads well enough on every surface given (the targets are a
 // little above the usual 3, 4.5 and 7, so rounding to #rrggbb can't drop below them)
 const readable=(c,on,min)=>{for(let i=0;i<30&&Math.min(...on.map(o=>contrastRatio(c,o)))<min;i++)c=mixRgb(c,dark?W:K,.07);return c};
 const text=dark?mixRgb(W,A,.04):mixRgb([17,23,34],A,.08);
 const tint=mixRgb(text,A,.25),shade=mixRgb(K,A,.3);// surfaces step from the background, a little towards the accent
 const card=dark?mixRgb(B,tint,.04):mixRgb(B,W,.7);
 const card2=dark?mixRgb(B,tint,.07):mixRgb(B,W,.35);
 const key=dark?mixRgb(B,tint,.11):mixRgb(B,shade,.06);
 const keyHover=dark?mixRgb(B,tint,.17):mixRgb(B,shade,.1);
 let accent=readable(A,[card,key],3.1);
 // text on the accent (the = key, the chosen tab): white or a dark shade of the accent, whichever reads better;
 // when neither reads well enough the accent moves away from the background a little more
 const onFor=c=>{const d=mixRgb(K,c,.1);return contrastRatio(c,d)>contrastRatio(c,W)?d:W};
 for(let i=0;i<30&&contrastRatio(accent,onFor(accent))<4.7;i++)accent=mixRgb(accent,dark?W:K,.05);
 const onAccent=onFor(accent);
 const series=deg=>{const [h,s,l]=rgbHsl(accent);return rgbHex(readable(hslRgb([h+deg,Math.max(s,.45),l]),[card],3.2))};
 return {
  'color-scheme':dark?'dark':'light','--bg':rgbHex(B),'--card':rgbHex(card),'--card2':rgbHex(card2),'--key':rgbHex(key),
  '--key-hover':rgbHex(keyHover),'--text':rgbHex(readable(text,[key],7.2)),'--muted':rgbHex(readable(mixRgb(card,text,dark?.55:.62),[card],4.7)),
  '--accent':rgbHex(accent),'--accent2':rgbHex(mixRgb(accent,dark?W:K,dark?.18:.15)),
  '--border':dark?'rgba(255,255,255,.1)':'rgba(17,23,34,.1)','--danger':dark?'#ff6b6b':'#c43c3c',
  '--on-accent':rgbHex(onAccent),
  '--unit-result':rgbHex(mixRgb(card,text,.35)),'--series1':rgbHex(accent),'--series2':series(150),'--series3':series(250)
 };
}
// The own themes as CSS rules (the editor's draft in place of its saved theme).
function writeCustomCss(){
 let css='';
 for(const g of ['light','dark']){
  const c=themeDraft?.group===g?themeDraft:customThemes[g];if(!c)continue;
  const vars=deriveTheme(g,c.bg,c.accent);
  css+=`html[data-theme="custom-${g}"],[data-theme-preview="custom-${g}"]{${Object.entries(vars).map(([k,v])=>k+':'+v).join(';')}}\n`;
 }
 let s=$('#customThemes');
 if(!s){s=document.createElement('style');s.id='customThemes';document.head.appendChild(s)}
 s.textContent=css;
}
function saveCustomThemes(){
 const out={};
 for(const g of ['light','dark'])if(customThemes[g]){const {bg,accent}=customThemes[g];out[g]={bg,accent,vars:deriveTheme(g,bg,accent)}}
 store.set('uc-custom-themes',JSON.stringify(out));
}
// Tokens are re-made on every start, so a newer deriveTheme reaches themes saved by an older version.
writeCustomCss();if(Object.keys(customThemes).length)saveCustomThemes();

/* ---------- Applying and changing the theme ---------- */
function applyTheme(){
 const root=document.documentElement,shown=themeDraft?'custom-'+themeDraft.group:resolvedTheme();
 root.dataset.theme=shown;
 const b=$('#themeButton');
 if(b){b.textContent=themeGroup(shown)==='light'?'☀':'☾';b.setAttribute('aria-label',t('theme'));b.title=t('theme')}
 // the browser's own bar (Android, installed app) takes the theme's background
 $('meta[name="theme-color"]')?.setAttribute('content',getComputedStyle(root).getPropertyValue('--bg').trim()||'#0b0f14');
 if(themeMenuOpen())renderThemeMenu();
 redrawCharts();
}
try{prefersLight.addEventListener('change',()=>{if(theme==='auto'&&!themeDraft)applyTheme()})}catch{}
// The new theme spreads out in a circle from the theme button (View Transitions); browsers without it get a
// short colour fade; with reduced motion, or when the colours stay the same (e.g. dark -> auto at night), it switches at once.
// run changes the saved choice and calls applyTheme; nextShown is the theme that will be on screen.
function transitionTheme(nextShown,run){
 const root=document.documentElement;
 if(reducedMotion()||nextShown===root.dataset.theme){run();return}
 if(!document.startViewTransition){root.classList.add('theme-fade');run();setTimeout(()=>root.classList.remove('theme-fade'),400);return}
 const z=window.__uiZoom||1,b=$('#themeButton').getBoundingClientRect(),x=(b.left+b.width/2)/z,y=(b.top+b.height/2)/z;// CSS px
 const r=Math.hypot(Math.max(x,innerWidth/z-x),Math.max(y,innerHeight/z-y));
 root.classList.add('vt-theme');
 try{
  const vt=document.startViewTransition(run);
  vt.ready.then(()=>root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${r}px at ${x}px ${y}px)`]},{duration:560,easing:'cubic-bezier(.4,0,.2,1)',pseudoElement:'::view-transition-new(root)'})).catch(()=>{});
  vt.finished.finally(()=>root.classList.remove('vt-theme'));
 }catch{root.classList.remove('vt-theme');run()}
}
function setTheme(next){
 if(!THEMES.includes(next))return;
 transitionTheme(resolveTheme(next),()=>{theme=next;store.set('uc-theme',theme);applyTheme()});
}
function setPairTheme(n){
 const g=themeGroup(n),pair={...themePair,[g]:n};
 transitionTheme(themeUsable(pair[deviceGroup()])?pair[deviceGroup()]:deviceGroup(),()=>{themePair=pair;store.set('uc-theme-pair',JSON.stringify(themePair));applyTheme()});
}
// A tap in the menu: with Match device it sets that group's theme (the menu stays open to pick the other one),
// otherwise the one theme. An own theme that isn't made yet opens the editor.
function pickTheme(n){
 if(n.startsWith('custom-')&&!themeUsable(n)){closeThemeMenu();openThemeEditor(themeGroup(n));return}
 if(theme==='auto'){setPairTheme(n);return}
 closeThemeMenu();setTheme(n);
}
// Match device on: the theme in use becomes its group's choice. Off: the theme on screen stays.
function toggleMatchDevice(){
 if(theme==='auto'){setTheme(resolvedTheme());return}
 themePair[themeGroup(theme)]=theme;store.set('uc-theme-pair',JSON.stringify(themePair));setTheme('auto');
}

/* ---------- The theme menu ---------- */
const themeMenuOpen=()=>!!$('#themeMenu')&&!$('#themeMenu').classList.contains('hidden');
const themeKey=n=>n.startsWith('custom-')?'themeCustom':'theme'+n[0].toUpperCase()+n.slice(1);
const EDIT_ICON='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function renderThemeMenu(){
 let m=$('#themeMenu');
 if(!m){
  m=document.createElement('div');m.id='themeMenu';m.className='theme-menu hidden';m.setAttribute('role','menu');
  $('.top-actions').appendChild(m);
  m.addEventListener('click',e=>{
   const ed=e.target.closest('[data-theme-edit]');if(ed){closeThemeMenu();openThemeEditor(ed.dataset.themeEdit);return}
   if(e.target.closest('[data-theme-auto]')){toggleMatchDevice();return}
   const b=e.target.closest('[data-theme-pick]');if(b)pickTheme(b.dataset.themePick);
  });
 }
 const focused=document.activeElement?.closest?.('#themeMenu [data-mi]')?.dataset.mi;
 m.setAttribute('aria-label',t('theme'));
 const auto=theme==='auto',shown=resolvedTheme();
 const preview=n=>themeUsable(n)?n:themeGroup(n);
 const option=n=>{
  const made=themeUsable(n),checked=auto?themePair[themeGroup(n)]===n:theme===n;
  // each swatch carries the theme's own colours (data-theme-preview), so it shows the real thing
  const swatch=made?'<span class="theme-swatch" data-theme-preview="'+n+'" aria-hidden="true"><i></i></span>':'<span class="theme-swatch theme-swatch-new" aria-hidden="true"></span>';
  const pick='<button type="button" class="theme-option" role="menuitemradio" aria-checked="'+(checked&&made)+'" data-theme-pick="'+n+'" data-mi="'+n+'">'+swatch+
   '<span class="theme-option-text">'+esc(t(themeKey(n))+(made||!n.startsWith('custom-')?'':'…'))+'</span><span class="theme-check" aria-hidden="true">✓</span></button>';
  if(!n.startsWith('custom-')||!made)return pick;
  const g=themeGroup(n);
  return '<div class="theme-row">'+pick+'<button type="button" class="theme-edit" role="menuitem" data-theme-edit="'+g+'" data-mi="edit-'+g+'" aria-label="'+esc(t('themeEdit'))+'" title="'+esc(t('themeEdit'))+'">'+EDIT_ICON+'</button></div>';
 };
 const group=g=>'<div class="theme-group'+(auto&&themeGroup(shown)===g?' now':'')+'" role="presentation">'+esc(t(g==='light'?'themeLightGroup':'themeDarkGroup'))+'</div>'+THEME_GROUPS[g].map(option).join('');
 m.innerHTML='<button type="button" class="theme-option theme-auto" role="menuitemcheckbox" aria-checked="'+auto+'" data-theme-auto data-mi="auto">'+
  '<span class="theme-swatch theme-swatch-auto" aria-hidden="true"><span data-theme-preview="'+preview(themePair.light)+'"><i></i></span><span data-theme-preview="'+preview(themePair.dark)+'"><i></i></span></span>'+
  '<span class="theme-option-text">'+esc(t('themeAuto'))+(auto?'<small>'+esc(t('themeMatchHint'))+'</small>':'')+'</span><span class="theme-switch" aria-hidden="true"><i></i></span></button>'+
  '<hr>'+group('light')+'<hr>'+group('dark');
 if(focused)m.querySelector('[data-mi="'+focused+'"]')?.focus({preventScroll:true});
}
function openThemeMenu(){
 if(themeEditorOpen())closeThemeEditor(false);
 renderThemeMenu();$('#themeMenu').classList.remove('hidden');$('.topbar').classList.add('menu-open');$('#themeButton').setAttribute('aria-expanded','true');
 if(hasKeyboard())$('#themeMenu .theme-option[aria-checked="true"]:not(.theme-auto)')?.focus({preventScroll:true});
}
function closeThemeMenu(focusButton){
 if(!themeMenuOpen())return;
 $('#themeMenu').classList.add('hidden');$('.topbar').classList.remove('menu-open');$('#themeButton').setAttribute('aria-expanded','false');
 if(focusButton)$('#themeButton').focus({preventScroll:true});
}
function toggleThemeMenu(){if(themeMenuOpen())closeThemeMenu();else openThemeMenu()}
// Keys while the menu is open: ↑ ↓ move, Enter/Space choose (the buttons do that themselves), Esc or Tab close it.
function themeMenuKeydown(e){
 if(!themeMenuOpen())return false;
 const items=[...$('#themeMenu').querySelectorAll('.theme-option,.theme-edit')],i=items.indexOf(document.activeElement);
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();return true}
 if(e.key==='Home'||e.key==='End'){e.preventDefault();items[e.key==='Home'?0:items.length-1].focus();return true}
 if(e.key==='Escape'){e.preventDefault();closeThemeMenu(true);return true}
 if((e.key==='Enter'||e.key===' ')&&i>=0)return true;
 closeThemeMenu();return false;
}

/* ---------- The editor for an own theme: a panel at the bottom; the app behind shows the colours live ---------- */
const THEME_BG_SWATCHES={
 dark:['#000000','#0b0f14','#0d1b2e','#1c1030','#0c2018','#2a0f14','#241a0c'],
 light:['#ffffff','#f2f4f7','#f7efe1','#efe8fb','#e3f0fa','#fbe8ee','#e6f4e3']
};
const THEME_ACCENT_SWATCHES=['#6ea8fe','#2ec5d3','#5fd3a3','#a3e635','#facc15','#ff9a3d','#ef4444','#ff4fa3','#b18cff','#8b9bb4'];
const themeEditorOpen=()=>!!themeDraft;
// a new own theme starts from the colours of the theme now chosen in its group
function themeStartColours(g){
 const base=theme!=='auto'&&themeGroup(theme)===g&&themeUsable(theme)?theme:themeUsable(themePair[g])?themePair[g]:g;
 if(customThemes[g])return {...customThemes[g]};
 const probe=document.createElement('span');probe.dataset.themePreview=base;probe.hidden=true;document.body.appendChild(probe);
 const cs=getComputedStyle(probe),hex=v=>{const m=v.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!m)return null;const h=m[1];return '#'+(h.length===3?[...h].map(c=>c+c).join(''):h).toLowerCase()};
 const out={bg:hex(cs.getPropertyValue('--bg'))||THEME_BG_SWATCHES[g][0],accent:hex(cs.getPropertyValue('--accent'))||THEME_ACCENT_SWATCHES[0]};
 probe.remove();return out;
}
function openThemeEditor(g){
 closeThemeMenu();
 themeDraft={group:g,...themeStartColours(g)};
 let ed=$('#themeEditor');
 if(!ed){
  ed=document.createElement('div');ed.id='themeEditor';ed.className='theme-editor hidden';ed.setAttribute('role','dialog');ed.setAttribute('aria-labelledby','themeEditorTitle');
  document.body.appendChild(ed);
  ed.addEventListener('click',e=>{
   const a=e.target.closest('[data-te]')?.dataset.te;if(a){closeThemeEditor(a==='save');return}
   const s=e.target.closest('[data-te-colour]');if(s)setDraftColour(s.closest('[data-te-row]').dataset.teRow,s.dataset.teColour);
  });
  ed.addEventListener('input',e=>{const i=e.target.closest('input[type=color]');if(i)setDraftColour(i.dataset.tePick,i.value)});
 }
 renderThemeEditor();ed.classList.remove('hidden');
 writeCustomCss();applyTheme();
 if(hasKeyboard())ed.querySelector('[data-te-row="bg"] [aria-checked="true"]')?.focus({preventScroll:true})||ed.querySelector('[data-te-row="bg"] .te-sw')?.focus({preventScroll:true});
}
function setDraftColour(which,hex){
 if(!themeDraft||!HEX_RE.test(hex))return;
 themeDraft[which]=which==='bg'?clampThemeBg(hex,themeDraft.group):hex.toLowerCase();
 renderThemeEditor();writeCustomCss();applyTheme();
}
function renderThemeEditor(){
 const ed=$('#themeEditor');if(!ed||!themeDraft)return;
 const g=themeDraft.group,focused=document.activeElement?.closest?.('#themeEditor [data-mi]')?.dataset.mi;
 const row=(which,list)=>{
  const v=themeDraft[which],own=!list.includes(v);
  return '<div class="te-label" id="te-'+which+'">'+esc(t(which==='bg'?'themeBg':'themeAccent'))+'</div><div class="te-row" role="radiogroup" aria-labelledby="te-'+which+'" data-te-row="'+which+'">'+
   list.map(c=>'<button type="button" class="te-sw" role="radio" aria-checked="'+(c===v)+'" aria-label="'+c+'" data-te-colour="'+c+'" data-mi="'+which+c+'" style="--c:'+c+'"></button>').join('')+
   '<label class="te-sw te-any'+(own?' on':'')+'" title="'+esc(t('themeAnyColour'))+'" style="--c:'+v+'"><input type="color" value="'+v+'" data-te-pick="'+which+'" data-mi="'+which+'-any" aria-label="'+esc(t('themeAnyColour'))+'"></label></div>';
 };
 ed.innerHTML='<div class="section-heading"><h2 id="themeEditorTitle">'+esc(t(g==='light'?'themeCustomLight':'themeCustomDark'))+'</h2><button type="button" class="modal-close" data-te="cancel" aria-label="'+esc(t('close'))+'">×</button></div>'+
  row('bg',THEME_BG_SWATCHES[g])+row('accent',THEME_ACCENT_SWATCHES)+
  '<div class="te-actions"><button type="button" class="te-btn" data-te="cancel" data-mi="cancel">'+esc(t('cancel'))+'</button><button type="button" class="te-btn primary" data-te="save" data-mi="save">'+esc(t('save'))+'</button></div>';
 if(focused)ed.querySelector('[data-mi="'+focused+'"]')?.focus({preventScroll:true});
}
// Save keeps the colours and chooses the theme (with Match device, for its group); Cancel goes back to before.
function closeThemeEditor(save){
 if(!themeDraft)return;
 const {group:g,bg,accent}=themeDraft;
 themeDraft=null;$('#themeEditor').classList.add('hidden');
 if(save){
  customThemes[g]={bg,accent};saveCustomThemes();
  if(theme==='auto'){themePair[g]='custom-'+g;store.set('uc-theme-pair',JSON.stringify(themePair))}
  else{theme='custom-'+g;store.set('uc-theme',theme)}
 }
 writeCustomCss();applyTheme();
}
// Keys while the editor is open: Esc cancels, Enter saves (on Cancel or × it cancels), Space picks the swatch with
// the focus, Tab moves; nothing reaches the calculator.
function themeEditorKeydown(e){
 if(!themeEditorOpen())return false;
 if(e.key==='Escape'){e.preventDefault();closeThemeEditor(false)}
 else if(e.key==='Enter'){e.preventDefault();closeThemeEditor(!document.activeElement?.closest?.('#themeEditor [data-te="cancel"]'))}
 return true;
}
