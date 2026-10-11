// Shared basics: version, DOM and storage helpers, the saved language and theme, and the app's state.
// Loaded first; every other script uses these globals.
const VERSION='0.16.0';
const NUMBER_LOCALE='de-DE';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// localStorage can throw (blocked storage, private mode, quota full). Never let that break the app.
const store={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}},del:k=>{try{localStorage.removeItem(k)}catch{}}};
// Was this click/press inside an element matching sel? Uses the event's path from when it started, so it stays right
// when a handler has already re-drawn (replaced) the element that was pressed. Use it for every "a press outside closes it".
const eventInside=(e,sel)=>e.composedPath().some(n=>n instanceof Element&&n.matches(sel));
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
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
let mode='calc',expression='',current='',currentIsPercent=false,justCalculated=false,lastExpression='',lastResult=null,howData=null,calcHowData=null,lastOperation=null,historyClearConfirm=false,toolResult=null,toolActiveInput=null,unitActiveInput='from',unitSource='from',unitReplaceOnNextKey=false,unitExpressions={from:'',to:''},toolState={fuel:{inputs:{},result:null},energy:{inputs:{},result:null},vat:{inputs:{},result:null},pct:{inputs:{},result:null},loan:{inputs:{},result:null},dates:{inputs:{},result:null},net:{inputs:{},result:null}};
// The modes that are tools with fields (VAT, Percent, Interest, Dates, Fuel, Energy, Subnet); Units has its own code.
// The Currency tab is the Units mode with unitView 'currency' (currency.js); currentTab() is the tab on screen.
let unitView='units';
const currentTab=()=>mode==='units'&&unitView==='currency'?'currency':mode;
const TOOL_MODES=['vat','pct','loan','dates','fuel','energy','net'];
store.del('uc-mode');
function isMobileDevice(){
 return matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent);
}
