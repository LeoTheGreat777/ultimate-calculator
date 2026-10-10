// Shared basics: version, DOM and storage helpers, the saved language and theme, and the app's state.
// Loaded first; every other script uses these globals.
const VERSION='0.4.147';
const NUMBER_LOCALE='de-DE';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// localStorage can throw (blocked storage, private mode, quota full). Never let that break the app.
const store={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function readLanguage(){
 let stored='';
 try{stored=localStorage.getItem('uc-lang')||''}catch{}
 return stored==='en'||stored==='el'?stored:'en';
}
let lang=readLanguage();
// The chosen theme: auto (follow the device), light, dark or black. New users start in dark; people who used the app
// before dark became the default keep auto. What is on screen is resolvedTheme() (ui.js).
let theme=['auto','light','paper','rose','sky','black','ocean','violet','ember','forest'].includes(store.get('uc-theme'))?store.get('uc-theme'):'dark';
let carry=null;
let mode='calc',expression='',current='',currentIsPercent=false,justCalculated=false,lastExpression='',lastResult=null,howData=null,calcHowData=null,lastOperation=null,historyClearConfirm=false,toolResult=null,toolActiveInput=null,unitActiveInput='from',unitSource='from',unitReplaceOnNextKey=false,unitExpressions={from:'',to:''},toolState={fuel:{inputs:{},result:null},energy:{inputs:{},result:null},vat:{inputs:{},result:null}};
store.del('uc-mode');
function isMobileDevice(){
 return matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent);
}
