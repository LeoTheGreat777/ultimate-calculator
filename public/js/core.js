// Shared basics: version, DOM and storage helpers, the saved language and theme, and the app's state.
// Loaded first; every other script uses these globals.
const VERSION='0.41.0';
const NUMBER_LOCALE='de-DE';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// localStorage can throw (blocked storage, private mode, quota full). Never let that break the app.
const store={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
// Was this click/press inside an element matching sel? Uses the event's path from when it started, so it stays right
// when a handler has already re-drawn (replaced) the element that was pressed. Use it for every "a press outside closes it".
const eventInside=(e,sel)=>e.composedPath().some(n=>n instanceof Element&&n.matches(sel));
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
// The ⌫ key's icon on every keypad: drawn, so it looks the same on every device (a font's ⌫ differs). The viewBox starts at
// x 1.25 so the drawing sits a little left: the box with the × is the heavy part and looked off centre when centred exactly
const BACK_ICON='<svg class="back-icon" viewBox="1.25 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.6 5.5H19a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5H8.6L2.5 12z"/><path d="M11.5 9.5l5 5M16.5 9.5l-5 5"/></svg>';
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function readLanguage(){
 let stored='';
 try{stored=localStorage.getItem('uc-lang')||''}catch{}
 return stored==='en'||stored==='el'?stored:'en';
}
let lang=readLanguage();
// The chosen theme: 'auto' (Match device: the device picks between two, themePair in theme.js) or one theme name
// (THEMES in theme.js, which also checks it). New users start in dark; people who used the app before dark became the
// default keep auto. What is on screen is resolvedTheme().
let theme=store.get('uc-theme')||'dark';
let carry=null;
let mode='calc',expression='',current='',currentIsPercent=false,justCalculated=false,lastExpression='',lastResult=null,howData=null,calcHowData=null,lastOperation=null,historyClearConfirm=false,toolResult=null,toolActiveInput=null,unitActiveInput='from',unitSource='from',unitReplaceOnNextKey=false,unitExpressions={from:'',to:''},toolState={fuel:{inputs:{},result:null},energy:{inputs:{},result:null},vat:{inputs:{},result:null},pct:{inputs:{},result:null},loan:{inputs:{},result:null},dates:{inputs:{},result:null},net:{inputs:{},result:null},numbers:{inputs:{},result:null},equation:{inputs:{},result:null},stats:{inputs:{},result:null},prog:{inputs:{},result:null},transfer:{inputs:{},result:null}};
// The modes that are tools with fields (VAT, Percent, Interest, Dates, Fuel, Energy, Subnet); Units has its own code.
// The Currency tab is the Units mode with unitView 'currency' (currency.js); currentTab() is the tab on screen.
let unitView='units';
const currentTab=()=>mode==='units'&&unitView==='currency'?'currency':mode;
const TOOL_MODES=['vat','pct','loan','dates','fuel','energy','net','transfer','numbers','equation','stats','prog'];
store.del('uc-mode');store.del('uc-keys');store.del('uc-keys-preview');// the keys are always round now (there was a Square | Round choice)
function isMobileDevice(){
 return matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent);
}
