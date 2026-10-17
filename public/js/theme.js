// Themes: the ready-made ones (colours in styles.css, html[data-theme]), the user's own light and dark theme,
// Match device, the theme menu and the editor for the own themes.
// - A ready-made theme is a block in styles.css, its name in LIGHT_PRESETS or DARK_PRESETS and its text in T (themeX).
// - Own themes ('custom-light', 'custom-dark') are made from just a background and an accent (deriveTheme works out
//   every other token and keeps text readable). Saved in uc-custom-themes with the tokens, so the <head> script in
//   index.html can apply them before the first paint; writeCustomCss puts them in <style id="customThemes"> as
//   html[data-theme="custom-…"] rules, so they work like the others (also in [data-theme-preview] swatches).
// - theme is 'auto' (Match device) or one theme. With 'auto' the device picks between two themes: themePair
//   (uc-theme-pair) {light, dark}, one from each group.
const LIGHT_PRESETS=['light','paper'],DARK_PRESETS=['dark','black'];
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
 if(b){const icon=themeGroup(shown)==='light'?'sun':'moon';if(b.dataset.icon!==icon){b.innerHTML=THEME_ICONS[icon];b.dataset.icon=icon}b.setAttribute('aria-label',t('theme'));b.title=t('theme')}
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
// The theme button's icons are drawn: the characters ☀ ☾ looked different on every phone (a colour emoji on iPhone).
const THEME_ICONS={sun:'<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',moon:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8z" fill="currentColor"/></svg>'};
const themeMenuOpen=()=>!!$('#themeMenu')&&!$('#themeMenu').classList.contains('hidden');
const themeKey=n=>n.startsWith('custom-')?'themeCustom':'theme'+n[0].toUpperCase()+n.slice(1);
const PALETTE_ICON='<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.7-1.7h2a4 4 0 0 0 4-4C20.5 6.9 16.7 3.5 12 3.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="11" r="1.3" fill="currentColor"/><circle cx="10.5" cy="7.3" r="1.3" fill="currentColor"/><circle cx="15" cy="7.6" r="1.3" fill="currentColor"/></svg>';
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
  const swatch=made?'<span class="theme-swatch" data-theme-preview="'+n+'" aria-hidden="true"><i></i></span>':'<span class="theme-swatch theme-swatch-new" aria-hidden="true">'+PALETTE_ICON+'</span>';
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
 if(themeEditorOpen())closeThemeEditor();
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
// Every change shows at once and is kept: the panel closes with ×, Esc, Enter or a tap outside it. Recent colour pairs
// (uc-theme-recent, per group, newest first) bring back an earlier look. The panel is built once per opening and then
// only updated in place (updateThemeEditor), so the device's colour picker stays open while you drag in it.
const THEME_BG_SWATCHES={
 dark:['#000000','#0b0f14','#0d1b2e','#1c1030','#0c2018','#2a0f14','#241a0c'],
 light:['#ffffff','#f2f4f7','#f7efe1','#efe8fb','#e3f0fa','#fbe8ee','#e6f4e3']
};
const THEME_ACCENT_SWATCHES=['#6ea8fe','#2ec5d3','#5fd3a3','#a3e635','#facc15','#ff9a3d','#ef4444','#ff4fa3','#b18cff','#8b9bb4'];
const THEME_RECENT_MAX=8;
let themeRecent=readJson('uc-theme-recent');
for(const g of ['light','dark'])themeRecent[g]=(Array.isArray(themeRecent[g])?themeRecent[g]:[]).filter(r=>r&&HEX_RE.test(r.bg)&&HEX_RE.test(r.accent)).map(r=>({bg:r.bg.toLowerCase(),accent:r.accent.toLowerCase()})).slice(0,THEME_RECENT_MAX);
const samePair=(a,b)=>a.bg===b.bg&&a.accent===b.accent;
function rememberThemeColours(g,pair){
 themeRecent[g]=[{bg:pair.bg,accent:pair.accent},...themeRecent[g].filter(r=>!samePair(r,pair))].slice(0,THEME_RECENT_MAX);
 store.set('uc-theme-recent',JSON.stringify(themeRecent));
}
const themeEditorOpen=()=>!!themeDraft;
// a new own theme starts from the colours of the theme now chosen in its group
function themeStartColours(g){
 if(customThemes[g])return {...customThemes[g]};
 const base=theme!=='auto'&&themeGroup(theme)===g&&themeUsable(theme)?theme:themeUsable(themePair[g])?themePair[g]:g;
 const probe=document.createElement('span');probe.dataset.themePreview=base;probe.hidden=true;document.body.appendChild(probe);
 const cs=getComputedStyle(probe),hex=v=>{const m=v.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!m)return null;const h=m[1];return '#'+(h.length===3?[...h].map(c=>c+c).join(''):h).toLowerCase()};
 const out={bg:hex(cs.getPropertyValue('--bg'))||THEME_BG_SWATCHES[g][0],accent:hex(cs.getPropertyValue('--accent'))||THEME_ACCENT_SWATCHES[0]};
 probe.remove();return out;
}
function openThemeEditor(g){
 closeThemeMenu();$('#themeButton').classList.add('open');// lit while its window is open
 themeDraft={group:g,...themeStartColours(g)};
 rememberThemeColours(g,themeDraft);// where you started is always in Recent, to go back to
 let ed=$('#themeEditor');
 if(!ed){
  ed=document.createElement('div');ed.id='themeEditor';ed.className='theme-editor hidden';ed.setAttribute('role','dialog');ed.setAttribute('aria-labelledby','themeEditorTitle');
  document.body.appendChild(ed);
  ed.addEventListener('click',e=>{
   if(e.target.closest('[data-te-close]')){closeThemeEditor();return}
   const r=e.target.closest('[data-te-recent]');if(r){const x=themeRecent[themeDraft.group][+r.dataset.teRecent];if(x)setDraft(x);return}
   const s=e.target.closest('[data-te-colour]');if(s)setDraft({[s.closest('[data-te-row]').dataset.teRow]:s.dataset.teColour});
  });
  ed.addEventListener('input',e=>{const i=e.target.closest('input[type=color]');if(i)setDraft({[i.dataset.tePick]:i.value},i)});
 }
 renderThemeEditor();ed.classList.remove('hidden');
 writeCustomCss();applyTheme();
 if(hasKeyboard())(ed.querySelector('[data-te-row="bg"] [aria-checked="true"]')||ed.querySelector('[data-te-row="bg"] .te-sw'))?.focus({preventScroll:true});
}
// A change of background and/or accent. The colours on screen follow at most once a frame (the picker sends many while dragging).
let themeDraftFrame=0;
function setDraft(change,fromInput){
 if(!themeDraft)return;
 for(const k of ['bg','accent']){
  const v=change[k];if(!HEX_RE.test(v||''))continue;
  themeDraft[k]=k==='bg'?clampThemeBg(v,themeDraft.group):v.toLowerCase();
 }
 updateThemeEditor(fromInput);
 if(!themeDraftFrame)themeDraftFrame=requestAnimationFrame(()=>{themeDraftFrame=0;if(themeDraft){writeCustomCss();applyTheme()}});
}
// The whole panel: on opening and after a language change.
function renderThemeEditor(){
 const ed=$('#themeEditor');if(!ed||!themeDraft)return;
 const g=themeDraft.group,focused=document.activeElement?.closest?.('#themeEditor [data-mi]')?.dataset.mi;
 const row=(which,list)=>'<div class="te-label" id="te-'+which+'">'+esc(t(which==='bg'?'themeBg':'themeAccent'))+'</div><div class="te-row" role="radiogroup" aria-labelledby="te-'+which+'" data-te-row="'+which+'">'+
   list.map(c=>'<button type="button" class="te-sw" role="radio" aria-label="'+c+'" data-te-colour="'+c+'" data-mi="'+which+c+'" style="--c:'+c+'"></button>').join('')+
   '<label class="te-sw te-any" title="'+esc(t('themeAnyColour'))+'"><input type="color" data-te-pick="'+which+'" data-mi="'+which+'-any" aria-label="'+esc(t('themeAnyColour'))+'"></label></div>';
 ed.innerHTML='<div class="section-heading"><h2 id="themeEditorTitle">'+esc(t(g==='light'?'themeCustomLight':'themeCustomDark'))+'</h2><button type="button" class="modal-close" data-te-close data-mi="close" aria-label="'+esc(t('close'))+'" title="'+esc(t('close'))+'">×</button></div>'+
  row('bg',THEME_BG_SWATCHES[g])+row('accent',THEME_ACCENT_SWATCHES)+
  '<div class="te-recent-wrap"><div class="te-label" id="te-recent">'+esc(t('themeRecent'))+'</div><div class="te-row" role="radiogroup" aria-labelledby="te-recent" data-te-recent-row></div></div>';
 updateThemeEditor();
 if(focused)ed.querySelector('[data-mi="'+focused+'"]')?.focus({preventScroll:true});
}
// Marks the chosen swatches and refreshes Recent, without replacing the colour inputs (one may have its picker open).
function updateThemeEditor(activeInput){
 const ed=$('#themeEditor');if(!ed||!themeDraft)return;
 for(const which of ['bg','accent']){
  const v=themeDraft[which],rowEl=ed.querySelector('[data-te-row="'+which+'"]');if(!rowEl)continue;
  let found=false;
  rowEl.querySelectorAll('[data-te-colour]').forEach(b=>{const on=b.dataset.teColour===v;found=found||on;b.setAttribute('aria-checked',on)});
  const any=rowEl.querySelector('.te-any'),input=any.querySelector('input');
  any.classList.toggle('on',!found);any.style.setProperty('--c',v);
  if(input!==activeInput)input.value=v;
 }
 const rec=ed.querySelector('[data-te-recent-row]'),list=themeRecent[themeDraft.group];
 const focusedRecent=document.activeElement?.closest?.('[data-te-recent]')?.dataset.teRecent;
 rec.innerHTML=list.map((r,i)=>'<button type="button" class="te-sw te-pair" role="radio" aria-checked="'+samePair(r,themeDraft)+'" aria-label="'+r.bg+' '+r.accent+'" data-te-recent="'+i+'" data-mi="recent'+i+'" style="--b:'+r.bg+';--c:'+r.accent+'"></button>').join('');
 ed.querySelector('.te-recent-wrap').hidden=list.length<2&&samePair(list[0]||{},themeDraft);// only where you started: nothing to go back to yet
 if(focusedRecent!=null)rec.querySelector('[data-te-recent="'+focusedRecent+'"]')?.focus({preventScroll:true});
}
// The colours are kept and the own theme chosen (with Match device, for its group). Also when the app goes to the
// background with the panel open, so nothing is lost.
function keepThemeDraft(){
 if(!themeDraft)return;
 const {group:g,bg,accent}=themeDraft;
 customThemes[g]={bg,accent};saveCustomThemes();
 if(theme==='auto'){themePair[g]='custom-'+g;store.set('uc-theme-pair',JSON.stringify(themePair))}
 else{theme='custom-'+g;store.set('uc-theme',theme)}
}
function closeThemeEditor(){
 if(!themeDraft)return;
 keepThemeDraft();rememberThemeColours(themeDraft.group,themeDraft);
 const hadFocus=!!document.activeElement?.closest?.('#themeEditor');
 themeDraft=null;$('#themeEditor').classList.add('hidden');$('#themeButton').classList.remove('open');
 writeCustomCss();applyTheme();
 if(hadFocus&&hasKeyboard())$('#themeButton').focus({preventScroll:true});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)keepThemeDraft()});
addEventListener('pagehide',keepThemeDraft);// a reload or a closed tab with the panel open keeps the colours too
// a press anywhere outside the panel closes it (and still does what it does there)
document.addEventListener('pointerdown',e=>{if(themeEditorOpen()&&!eventInside(e,'#themeEditor'))closeThemeEditor()},true);
// Keys while the editor is open: Esc and Enter close it (Enter on a swatch picks it first), ← → move through a row
// of swatches and pick, Tab moves between rows; nothing reaches the calculator.
function themeEditorKeydown(e){
 if(!themeEditorOpen())return false;
 const a=document.activeElement,sw=a?.closest?.('#themeEditor .te-sw');
 if(e.key==='Escape'){e.preventDefault();closeThemeEditor()}
 else if(e.key==='Enter'){e.preventDefault();if(sw&&a.tagName==='BUTTON')a.click();closeThemeEditor()}
 else if(sw&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
  e.preventDefault();
  const items=[...sw.closest('.te-row').querySelectorAll('button.te-sw')],i=items.indexOf(sw),n=items[(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+items.length)%items.length];
  n?.focus({preventScroll:true});n?.click();
 }
 return true;
}

/* ---------- Rose, Sky, Ocean, Violet, Ember and Forest were removed in 0.14.2 (own themes do the same) ---------- */
// Whoever used one gets it as their own theme with the same background and accent, so it looks the same; an own theme
// they already had goes to Recent. One that only waited in Match device's other slot goes to Recent.
const REMOVED_THEMES={rose:['light','#fbf1f3','#c13a6e'],sky:['light','#eef6fb','#077a99'],ocean:['dark','#04111c','#2ec5d3'],
 violet:['dark','#0e0a1a','#b18cff'],ember:['dark','#120c08','#ff9a3d'],forest:['dark','#07120f','#5fd3a3']};
(()=>{
 const saved=store.get('uc-theme'),pair=readJson('uc-theme-pair');
 let changed=false;
 for(const n of new Set([saved,pair.light,pair.dark])){
  if(!REMOVED_THEMES[n])continue;
  const [g,bg,accent]=REMOVED_THEMES[n],colours={bg,accent},inUse=saved===n||(saved==='auto'&&pair[g]===n);
  if(!inUse&&pair[g]!==n)continue;// in the wrong slot: nothing to keep
  changed=true;
  if(!inUse){rememberThemeColours(g,colours);continue}
  if(customThemes[g]&&!samePair(customThemes[g],colours))rememberThemeColours(g,customThemes[g]);
  customThemes[g]=colours;rememberThemeColours(g,colours);
  if(saved===n){theme='custom-'+g;store.set('uc-theme',theme)}
  if(pair[g]===n)themePair[g]='custom-'+g;
 }
 if(changed){store.set('uc-theme-pair',JSON.stringify(themePair));saveCustomThemes();writeCustomCss()}
})();
