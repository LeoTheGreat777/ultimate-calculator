// Fitting the app to the screen: key and display sizes (fitLayout), long results, and zoom on big screens.
function fitDisplayText(el,minSize){
 if(!el)return;
 el.classList.remove('near-limit');
 el.style.fontSize='';
 el.style.letterSpacing='';
 el.scrollLeft=0;
 requestAnimationFrame(()=>{
   if(!el.isConnected)return;
   const width=el.clientWidth;
   const contentWidth=el.scrollWidth;
   if(!width||contentWidth<=width+2)return;
   const base=parseFloat(getComputedStyle(el).fontSize);
   const target=Math.max(minSize,base*(width/contentWidth)*0.97);
   el.style.fontSize=target+'px';
   el.style.letterSpacing='-0.04em';
   el.scrollLeft=0;
 });
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
 tool:{k:[56,36],d:[205,128],roomy:172,comfy:44,copy:true},
 mobileTool:{k:[56,36],d:[108,98],comfy:44,copy:true},
 graphMin:520
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
let fitRaf=0;
function fitLayoutSoon(){if(!fitRaf)fitRaf=requestAnimationFrame(()=>{fitRaf=0;fitLayout()})}
function fitLayout(){
 const card=$('#calculatorCard'),shell=$('.app-shell'),footer=$('.app-footer'),root=document.documentElement;if(!card||!shell||!footer)return;
 document.body.classList.add('fit');
 if(applyUiZoom())requestAnimationFrame(redrawCharts);
 const Z=window.__uiZoom;
 // everything below is in CSS pixels (screen pixels / zoom)
 const avail=fitAvailHeight()/Z;
 const need=()=>Math.ceil((footer.getBoundingClientRect().bottom+window.scrollY)/Z+(parseFloat(getComputedStyle(shell).paddingBottom)||0));
 root.classList.remove('page-scroll');shell.style.height='';card.classList.remove('compact-display','fit-no-copy');
 const tool=['fuel','energy','vat'].includes(mode),touchTool=tool&&isMobileDevice();
 const setToolLayout=compact=>{card.classList.toggle('mobile-tool',compact);document.body.classList.toggle('mobile-tool-on',compact)};
 if(tool)setToolLayout(touchTool);
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
  const rows=new Set([...$('#keypad').children].map(b=>b.offsetTop)).size||5;
  const shrinkDisplay=to=>{const step=Math.min(over,Math.max(0,d-to));d-=step;over-=step};
  const shrinkKeys=to=>{const dk=Math.min(Math.max(0,k-to),Math.ceil(over/rows));k-=dk;over-=dk*rows};
  if(spec.roomy)shrinkDisplay(spec.roomy);
  if(over>0)shrinkKeys(spec.comfy);
  if(over>0)shrinkDisplay(dMin);
  if(over>0)shrinkKeys(kMin);
  apply();
  return need()-avail;
 };
 let over=attempt(mode==='calc'?FIT.calc:mode==='units'?FIT.units:touchTool?FIT.mobileTool:FIT.tool);
 if(over>0&&tool&&!touchTool){setToolLayout(true);over=attempt(FIT.mobileTool)}
 const spec=mode==='calc'?FIT.calc:mode==='units'?FIT.units:FIT.tool;
 if(over>0&&spec.copy){card.classList.add('fit-no-copy');over=need()-avail}
 if(over>0)root.classList.add('page-scroll');
 root.dataset.fitOver=Math.max(0,over);// how many px did not fit (used by tests)
}
window.addEventListener('resize',fitLayoutSoon);
window.visualViewport?.addEventListener('resize',fitLayoutSoon);
window.addEventListener('orientationchange',()=>setTimeout(fitLayout,250));
document.fonts?.ready?.then(fitLayoutSoon);
