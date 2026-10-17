// Fitting the app to the screen: key and display sizes (fitLayout), long results, and zoom on big screens.
// Text too long for its line (a result, a calculation, a Units value, a tool field): first a smaller font, down to
// minSize; if it still does not fit, it scrolls sideways (swipe) and shows its start, or with showEnd its end –
// what was typed last. The side that is cut off fades out (fade-start / fade-end).
// Each fitted element remembers how it was fitted and is watched: when its width changes (the phone turned, the layout
// re-fitted) it is fitted again, so a number sized for one width is never cut off at another.
const fitWatch=window.ResizeObserver?new ResizeObserver(entries=>{for(const {target:el,contentRect} of entries){
 if(!el.isConnected||el.dataset.fit!=='1'){fitWatch.unobserve(el);continue}
 const w=Math.round(contentRect.width);if(w&&String(w)!==el.dataset.fitW)fitDisplayText(el,+el.dataset.fitMin||12,el.dataset.fitEnd==='1');
}}):null;
function fitDisplayText(el,minSize,showEnd=false){
 if(!el)return;
 el.dataset.fitMin=minSize;el.dataset.fitEnd=showEnd?'1':'';
 el.classList.remove('near-limit');
 el.style.removeProperty('font-size');
 el.style.removeProperty('letter-spacing');
 el.dataset.fit='1';
 requestAnimationFrame(()=>{
   if(!el.isConnected)return;
   const width=el.clientWidth,contentWidth=el.scrollWidth;
   const cs=getComputedStyle(el);el.dataset.fitW=Math.round(width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight));fitWatch?.observe(el);// the same width the watcher sees
   if(width&&contentWidth>width+2){
     const base=parseFloat(getComputedStyle(el).fontSize);
     el.style.setProperty('font-size',Math.max(minSize,base*(width/contentWidth)*0.97)+'px','important');// beats the !important sizes of .unit-value
     el.style.setProperty('letter-spacing','-0.04em','important');
   }
   el.scrollLeft=showEnd?el.scrollWidth:0;
   fitFade(el);
 });
}
function fitFade(el){
 const max=el.scrollWidth-el.clientWidth;
 el.classList.toggle('fade-start',max>2&&el.scrollLeft>2);
 el.classList.toggle('fade-end',max>2&&el.scrollLeft<max-2);
}
document.addEventListener('scroll',e=>{if(e.target?.dataset?.fit)fitFade(e.target)},true);
// A key that cannot do anything more (the number or the calculation is as long as it can be): a small shake, and on
// phones that support it a short vibration. el: what shakes (the result line by default).
function refuseKey(el=$('#result')){
 if(el){el.classList.remove('refused');void el.offsetWidth;el.classList.add('refused')}
 try{navigator.vibrate?.(10)}catch{}
}
// Fit the app to the screen, the same way in every mode and on every device. Step by step, only as far as needed:
// a shorter display, smaller keys, the most compact display, the tools' compact layout (the one phones use),
// no copy button (tapping the result copies). Only if even that does not fit (a phone held sideways)
// does the page scroll; nothing is ever cut off.
// k = key height [max,min], d = display height [max,min], roomy = smallest display that keeps the ? above the result,
// comfy = key height kept as long as the display can still give way.
const FIT={
 calc:{k:[68,40],d:[205,128],roomy:172,comfy:48,copy:true},
 units:{k:[68,40],d:[205,165],comfy:48,copy:false},
 sci:{k:[62,31],d:[180,96],roomy:150,comfy:42,copy:true},// Scientific: 10 rows of keys (memory, 4 scientific, 5 basic)
 tool:{k:[56,36],d:[205,128],roomy:172,comfy:44,copy:true},
 mobileTool:{k:[56,36],d:[108,98],comfy:44,copy:true},
 graphMin:520,
 // small phones (320×568, 360×640): when even the sizes above don't fit, tighter limits before the page scrolls
 tight:{calc:{k:[68,36],d:[205,110],comfy:48},units:{k:[68,32],d:[205,160],comfy:48},sci:{k:[62,28],d:[180,84],comfy:42},
  tool:{k:[56,31],d:[108,76],comfy:44}}
};
// On phones the browser bars slide in and out while scrolling, changing the height; fitting to the smallest
// height seen (per width, i.e. per orientation) keeps the layout from jumping back and forth.
const fitHeights={};
function fitAvailHeight(){const h=window.innerHeight;if(!isMobileDevice())return h;const w=window.innerWidth;fitHeights[w]=Math.min(fitHeights[w]??h,h);return fitHeights[w]}
// Big desktop screens (e.g. a 4K monitor at 100% scaling): the whole app scales up like browser zoom, so it
// fills about the same share of the screen as on a 1080p monitor. Laptops, tablets and phones stay at 1.
// CSS zoom does not scale viewport units, so the CSS divides them by --z, and code that turns screen
// pixels into CSS pixels divides by window.__uiZoom (charts, History sheet, VAT switch, fitLayout).
const ZOOM={baseH:1050,baseW:1500,min:1.1,max:2.2};
window.__uiZoom=1;
const zoomSupported=(()=>{
 try{
  if(/^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent))return false;// Safari's zoom differs; it keeps the normal size
  const o=document.createElement('div'),i=document.createElement('div');o.style.cssText='zoom:2;position:absolute;visibility:hidden';i.style.width='100px';
  o.appendChild(i);document.body.appendChild(o);const ok=Math.round(i.getBoundingClientRect().width)===200&&i.offsetWidth===100;o.remove();return ok;
 }catch{return false}
})();
function applyUiZoom(){
 let z=1;
 if(zoomSupported&&matchMedia('(hover:hover) and (pointer:fine)').matches){const raw=Math.min(innerHeight/ZOOM.baseH,innerWidth/ZOOM.baseW,ZOOM.max);if(raw>=ZOOM.min)z=Math.floor(raw*20)/20}
 if(z===window.__uiZoom)return false;
 window.__uiZoom=z;const root=document.documentElement;
 root.style.zoom=z===1?'':String(z);root.style.setProperty('--z',String(z));
 return true;
}
// A phone held sideways (or any short, wide window): the keypad goes on the right and everything else on the left
// (styles.css, html.landscape). The keys get the height there is, and the display takes what is left beside them.
// Also a touch screen that is clearly wider than tall and not tall enough for the upright layout's tools: a foldable
// opened up and held sideways (the iPhone Duo's or a Galaxy Fold's inner screen in a browser), a small tablet sideways.
const LANDSCAPE='(orientation: landscape) and (max-height: 500px), (pointer: coarse) and (min-aspect-ratio: 6/5) and (max-height: 720px)';
function fitLandscape(card,root,avail,need,tool,setToolLayout){
 if(tool)setToolLayout(true);
 const graph=mode==='graph',v=graph?'--gk':'--k',tall=avail>520,[kMax,kMin]=graph?[tall?72:56,28]:tool?[tall?96:84,32]:[tall?96:68,34];// taller: a foldable's inner screen
 const rows=new Set([...$('#keypad').querySelectorAll('button')].map(b=>b.getBoundingClientRect().top|0)).size||5;
 root.classList.remove('land-fill');// measured at its natural height; filled to the bottom at the end
 card.style.setProperty('--disp','auto');// the display fills the height beside the keys
 if(mode==='units')card.style.setProperty('--urow','36px');// the unit rows grow afterwards, into the room beside the keys
 let k;
 const grow=()=>{
  // the biggest keys that still fit (a halving search): the keypad then fills its column even when the left side is the
  // taller one and sets the height, so Subnet's keys are as big as the other tabs'
  const fits=x=>{card.style.setProperty(v,x+'px');return need()<=avail};
  let lo=kMin,hi=kMax;
  if(fits(lo)){while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fits(mid))lo=mid;else hi=mid-1}}
  k=lo;card.style.setProperty(v,k+'px');
  return need()-avail;
 };
 let over=grow();
 if(over>0){card.classList.add('fit-no-copy');over=grow()}
 if(over>0&&tool){card.classList.add('fit-tight');over=grow()}
 if(over>0&&$('#eqForm')){card.classList.add('fit-no-form');over=grow()}// Equations: the form line goes (the switch still names the kind)
 if(over>0&&$('#netDetails,#statDetails')){card.classList.add('fit-no-details');over=grow()}// Subnet, Statistics on a very short screen: the details stay under ?
 if(mode==='units'){const h=$('#calculatorDisplay').getBoundingClientRect().height/window.__uiZoom;card.style.setProperty('--urow',Math.max(36,Math.min(70,Math.floor((h-61)/2)))+'px')}
 over=need()-avail;
 if(over>0)root.classList.add('page-scroll');else root.classList.add('land-fill');// the card reaches the bottom (Dates' list has no keys to grow)
 root.dataset.fitOver=Math.max(0,over);
}
let fitRaf=0;
function fitLayoutSoon(){if(!fitRaf)fitRaf=requestAnimationFrame(()=>{fitRaf=0;fitLayout()})}
function fitLayout(){refreshSide();
 const card=$('#calculatorCard'),shell=$('.app-shell'),footer=$('.app-footer'),root=document.documentElement;if(!card||!shell||!footer)return;
 document.body.classList.add('fit');
 if(applyUiZoom())requestAnimationFrame(redrawCharts);
 const Z=window.__uiZoom;
 // everything below is in CSS pixels (screen pixels / zoom)
 const avail=fitAvailHeight()/Z;
 const need=()=>Math.ceil((footer.getBoundingClientRect().bottom+window.scrollY)/Z+(parseFloat(getComputedStyle(shell).paddingBottom)||0));
 root.classList.remove('page-scroll','fit-small');shell.style.height='';card.classList.remove('compact-display','fit-no-copy','fit-no-details','fit-tight','fit-no-form','fit-row');
 const tool=TOOL_MODES.includes(mode),touchTool=tool&&isMobileDevice();
 const setToolLayout=compact=>{card.classList.toggle('mobile-tool',compact);document.body.classList.toggle('mobile-tool-on',compact)};
 if(tool)setToolLayout(touchTool);
 // A foldable half open like a book (or a dual-screen phone spanned) reports two screen segments side by side: the
 // sideways layout then puts the display on one side of the fold and the keypad on the other, the gap over the fold.
 const segs=window.viewport?.segments,hinge=segs&&segs.length===2&&Math.abs(segs[0].top-segs[1].top)<1?Math.max(0,(segs[1].left-segs[0].right)/Z):null;
 root.classList.toggle('hinge-v',hinge!==null);if(hinge!==null)root.style.setProperty('--hinge-w',hinge+'px');
 const land=matchMedia(LANDSCAPE).matches||hinge!==null;root.classList.toggle('landscape',land);if(!land)root.classList.remove('land-fill');
 if(tool)fitShortLabels();
 if(land){fitLandscape(card,root,avail,need,tool,setToolLayout);if(tool)fitShortLabels();return}
 card.style.removeProperty('--gk');// back in portrait, Graph keys size themselves again (styles.css)
 if(mode==='graph'){if(avail<FIT.graphMin){root.classList.add('page-scroll');shell.style.height=FIT.graphMin+'px'}return}
 const attempt=spec=>{
  let [k,kMin]=spec.k,[d,dMin]=spec.d;
  const apply=()=>{
   card.style.setProperty('--k',k+'px');card.style.setProperty('--disp',d+'px');
   if(mode==='units')card.style.setProperty('--urow',Math.min(70,Math.floor((d-61)/2))+'px');
   card.classList.toggle('compact-display',!!spec.roomy&&d<spec.roomy);
  };
  apply();
  let over=need()-avail;if(over<=0)return 0;
  const rows=new Set([...$('#keypad').querySelectorAll('button')].map(b=>b.getBoundingClientRect().top|0)).size||5;
  const shrinkDisplay=to=>{const step=Math.min(over,Math.max(0,d-to));d-=step;over-=step};
  const shrinkKeys=to=>{const dk=Math.min(Math.max(0,k-to),Math.ceil(over/rows));k-=dk;over-=dk*rows};
  if(spec.roomy)shrinkDisplay(spec.roomy);
  if(over>0)shrinkKeys(spec.comfy);
  if(over>0)shrinkDisplay(dMin);
  if(over>0)shrinkKeys(kMin);
  apply();
  return need()-avail;
 };
 let over=attempt(mode==='calc'?(sciMode?FIT.sci:FIT.calc):mode==='units'?FIT.units:touchTool?FIT.mobileTool:FIT.tool);
 if(over>0&&tool&&!touchTool){setToolLayout(true);over=attempt(FIT.mobileTool)}
 const spec=mode==='calc'?(sciMode?FIT.sci:FIT.calc):mode==='units'?FIT.units:FIT.tool;
 if(over>0&&spec.copy){card.classList.add('fit-no-copy');over=need()-avail}
 // still too tall (a small phone): the tools get less padding (fit-tight) and the display and keys may get smaller, then
 // a kind's fields share one row (fit-row, short labels), last Equations' form line and the details (Subnet, Statistics) go (? shows them)
 if(over>0){
  const tight=FIT.tight[mode==='calc'?(sciMode?'sci':'calc'):mode==='units'?'units':'tool'];
  if(tool)card.classList.add('fit-tight');
  root.classList.add('fit-small');// the footer on one line, as sideways
  over=attempt(tight);
  if(over>0&&tool&&$('#toolPanel .kind-grid')){card.classList.add('fit-row');fitShortLabels();over=attempt(tight)}// the fields in one row, as sideways
  if(over>0&&tool&&$('#eqForm')){card.classList.add('fit-no-form');over=attempt(tight)}
  if(over>0&&tool&&$('#netDetails,#statDetails')){card.classList.add('fit-no-details');over=attempt(tight)}
  // even that doesn't fit (Scientific on the smallest phones): back to the normal sizes, and the page scrolls
  if(over>0){card.classList.remove('fit-tight','fit-row','fit-no-form','fit-no-details');root.classList.remove('fit-small');if(tool)fitShortLabels();over=attempt(card.classList.contains('mobile-tool')?FIT.mobileTool:spec)}
 }
 if(tool)fitShortLabels();// the fields' final widths
 if(over>0)root.classList.add('page-scroll');
 root.dataset.fitOver=Math.max(0,over);// how many px did not fit (used by tests)
}
window.addEventListener('resize',fitLayoutSoon);
// iOS reports a turned phone's new size only after its 'resize' event, so everything measured on 'resize' (the layout,
// the charts, the tabs) would keep the old size. When the page's width really changes, 'resize' runs once more.
if(window.ResizeObserver){let pageW=0;new ResizeObserver(()=>{const w=document.documentElement.clientWidth;if(w===pageW)return;const first=!pageW;pageW=w;if(!first)dispatchEvent(new Event('resize'))}).observe(document.documentElement)}
window.visualViewport?.addEventListener('resize',fitLayoutSoon);
window.addEventListener('orientationchange',()=>setTimeout(fitLayout,250));
document.fonts?.ready?.then(fitLayoutSoon);
