// Graph mode: plots up to three functions of x. Uses the drawing helpers in charts.js.
/* ---------- Graph mode: function parser ---------- */
const G_FUNCS={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sqrt:Math.sqrt,'√':Math.sqrt,ln:Math.log,log:Math.log10,abs:Math.abs,exp:Math.exp};
const G_NAMES=['asin','acos','atan','sqrt','sin','cos','tan','abs','exp','log','ln','pi','π','√','x','e'];
function gTokens(src){
 const s=String(src).replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/,/g,'.').replace(/\s+/g,'').toLowerCase(),out=[];let i=0;
 while(i<s.length){
  const ch=s[i];
  if(/[0-9.]/.test(ch)){let j=i;while(j<s.length&&/[0-9.]/.test(s[j]))j++;const raw=s.slice(i,j);if(raw==='.'||(raw.match(/\./g)||[]).length>1)throw Error('NUMBER');out.push({t:'num',v:Number(raw)});i=j;continue}
  if('+-*/^()'.includes(ch)){out.push({t:ch});i++;continue}
  const name=G_NAMES.find(n=>s.startsWith(n,i));if(!name)throw Error('NAME');i+=name.length;
  if(name==='x')out.push({t:'x'});else if(name==='pi'||name==='π')out.push({t:'num',v:Math.PI});else if(name==='e')out.push({t:'num',v:Math.E});else out.push({t:'fn',f:G_FUNCS[name]});
 }
 return out;
}
// x^(1/3) of a negative x is a real cube root, not NaN.
function gPow(b,e){if(b<0&&e!==0){const inv=1/e,n=Math.round(inv);if(Math.abs(inv-n)<1e-9&&Math.abs(n)%2===1)return -Math.pow(-b,e)}return Math.pow(b,e)}
// Returns a function of x, or null if the text is empty or not a valid formula.
// Supports + − × ÷ ^, parentheses (missing ")" are closed at the end), x, π, e, sin cos tan asin acos atan √ sqrt ln log abs exp,
// and implied multiplication: 2x, 3(x+1), 2sin(x), xπ. "sin x^2" means sin(x²); "-x^2" means −(x²).
function gParse(src){
 let tk;try{tk=gTokens(src)}catch{return null}
 if(!tk.length)return null;
 let p=0;const peek=()=>tk[p];
 const atomStart=t=>t&&(t.t==='num'||t.t==='x'||t.t==='fn'||t.t==='(');
 function expr(){let a=term();while(peek()&&(peek().t==='+'||peek().t==='-')){const op=tk[p++].t,b=term(),l=a;a=op==='+'?x=>l(x)+b(x):x=>l(x)-b(x)}return a}
 function term(){let a=unary();for(;;){const t=peek();if(t&&(t.t==='*'||t.t==='/')){p++;const b=unary(),l=a;a=t.t==='*'?x=>l(x)*b(x):x=>l(x)/b(x)}else if(atomStart(t)){const b=power(),l=a;a=x=>l(x)*b(x)}else break}return a}
 function unary(){const t=peek();if(t&&(t.t==='-'||t.t==='+')){p++;const a=unary();return t.t==='-'?x=>-a(x):a}return power()}
 function power(){const base=atom();if(peek()&&peek().t==='^'){p++;const e=unary();return x=>gPow(base(x),e(x))}return base}
 function atom(){
  const t=tk[p++];if(!t)throw Error('END');
  if(t.t==='num'){const v=t.v;return()=>v}
  if(t.t==='x')return x=>x;
  if(t.t==='('){const a=expr();if(peek()&&peek().t===')')p++;else if(peek())throw Error('PAREN');return a}
  if(t.t==='fn'){const f=t.f,a=peek()&&peek().t==='('?atom():power();return x=>f(a(x))}
  throw Error('SYNTAX');
 }
 try{const f=expr();if(p!==tk.length)return null;return f}catch{return null}
}
const G_SUP='⁰¹²³⁴⁵⁶⁷⁸⁹';
function gPretty(src){
 return String(src).replace(/sqrt/g,'√').replace(/pi/g,'π').replace(/\^(\d+)(?![\d.])/g,(m,d)=>[...d].map(c=>G_SUP[c]).join(''))
  .replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−').replace(/\./g,',');
}

/* ---------- Graph mode: state ---------- */
const GRAPH_NAMES=['f','g','h'];
function graphLoad(){try{const s=JSON.parse(localStorage.getItem('uc-graph')||'null');if(s&&Array.isArray(s.fns)&&s.fns.length&&s.fns.length<=3&&s.fns.every(f=>typeof f==='string'))return{fns:s.fns,active:Math.min(Math.max(0,s.active|0),s.fns.length-1),view:null}}catch{}return{fns:['x^2-2x-3'],active:0,view:null}}
let graph=graphLoad();
let graphTrace=null,graphPts=[],graphRaf=0;
function graphSave(){try{localStorage.setItem('uc-graph',JSON.stringify({fns:graph.fns,active:graph.active}))}catch{}}
function gText(k){
 const el={zoomIn:'Μεγέθυνση',zoomOut:'Σμίκρυνση',fit:'Προσαρμογή ύψους στην καμπύλη',home:'Αρχική θέση',points:'Σημεία',save:'Αποθήκευση εικόνας',add:'Πρόσθεσε συνάρτηση',del:'Διαγραφή',clearFn:'Καθαρισμός',empty:'γράψε μια συνάρτηση του x',invalid:'Δεν καταλαβαίνω τον τύπο',root:'Ρίζα',min:'Ελάχιστο',max:'Μέγιστο',yint:'Τομή με τον άξονα y',cross:'Τομή',pointsTitle:'Σημεία του γραφήματος',none:'Δεν βρέθηκαν σημεία στο κομμάτι που φαίνεται.',pointsNote:'Τα σημεία αφορούν το κομμάτι του γραφήματος που φαίνεται τώρα. Μετακίνησε ή άλλαξε ζουμ για να δεις άλλα.',saved:'Αποθηκεύτηκε'};
 const en={zoomIn:'Zoom in',zoomOut:'Zoom out',fit:'Fit height to the curve',home:'Reset view',points:'Key points',save:'Save image',add:'Add function',del:'Delete',clearFn:'Clear',empty:'type a function of x',invalid:"I can't read this formula",root:'Root',min:'Minimum',max:'Maximum',yint:'y-intercept',cross:'Intersection',pointsTitle:'Key points',none:'No points in the part that is visible.',pointsNote:'Points cover the part of the graph you can see now. Move or zoom to see others.',saved:'Saved'};
 return (lang==='el'?el:en)[k];
}

/* ---------- Graph mode: building the screen ---------- */
function renderGraphMode(){
 const d=$('#calculatorDisplay');
 d.className='display-wrap graph-display';
 const tool=(g,label,icon)=>'<button class="graph-tool" data-gtool="'+g+'" type="button" aria-label="'+esc(gText(label))+'" title="'+esc(gText(label))+'">'+icon+'</button>';
 d.innerHTML='<div class="graph-box"><canvas id="graphCanvas" aria-label="'+esc(modeText('graph'))+'"></canvas><div id="graphReadout" class="graph-readout"></div><div class="graph-tools">'+
  tool('out','zoomOut','−')+tool('in','zoomIn','+')+tool('fit','fit','⤢')+tool('home','home','⌂')+tool('points','points','?')+tool('save','save','⤓')+'</div></div><div id="graphFns" class="graph-fns"></div>';
 d.querySelector('.graph-tools').addEventListener('click',e=>{const b=e.target.closest('[data-gtool]');if(!b)return;const g=b.dataset.gtool,cv=$('#graphCanvas'),w=cv.clientWidth,h=cv.clientHeight;
  if(g==='in')graphZoomAt(w/2,h/2,1.6);else if(g==='out')graphZoomAt(w/2,h/2,1/1.6);else if(g==='home'){graph.view=null;graphTrace=null;drawGraphSoon()}else if(g==='fit')graphFit();else if(g==='points')showGraphPoints();else if(g==='save')graphSaveImage(b)});
 $('#graphFns').addEventListener('click',e=>{
  const add=e.target.closest('[data-gadd]'),del=e.target.closest('[data-gdel]'),row=e.target.closest('[data-grow]');
  if(add){if(graph.fns.length<3){graph.fns.push('');graph.active=graph.fns.length-1;graphChanged()}return}
  if(del){const i=+del.dataset.gdel;if(graph.fns.length>1){graph.fns.splice(i,1);if(graph.active>=graph.fns.length||graph.active>i)graph.active=Math.max(0,graph.active-1)}else graph.fns[0]='';graphChanged();return}
  if(row){graph.active=+row.dataset.grow;graphTrace=null;renderGraphFns();drawGraphSoon()}
 });
 bindGraphCanvas($('#graphCanvas'));
 renderGraphFns();
 renderGraphKeypad();
 drawGraphSoon();
}
function renderGraphFns(){
 const box=$('#graphFns');if(!box)return;const C=chColors();
 box.innerHTML=graph.fns.map((src,i)=>{
  const ok=!src||gParse(src),last=i===graph.fns.length-1;
  return '<div class="graph-fn'+(i===graph.active?' active':'')+(ok?'':' invalid')+'" data-grow="'+i+'" role="button" tabindex="-1"><span class="graph-fn-dot" style="background:'+C.series[i]+'"></span><span class="graph-fn-name">'+GRAPH_NAMES[i]+'(x) =</span><span class="graph-fn-src'+(src?'':' empty')+'" title="'+(ok?'':esc(gText('invalid')))+'">'+esc(src?gPretty(src):gText('empty'))+'</span>'+
   '<button class="graph-fn-btn" data-gdel="'+i+'" type="button" aria-label="'+esc(gText(graph.fns.length>1?'del':'clearFn'))+'">×</button>'+(last&&graph.fns.length<3?'<button class="graph-fn-btn graph-fn-add" data-gadd="1" type="button" aria-label="'+esc(gText('add'))+'" title="'+esc(gText('add'))+'">+</button>':'')+'</div>';
 }).join('');
 box.querySelectorAll('.graph-fn-src').forEach(el=>el.scrollLeft=el.scrollWidth);
}
const GRAPH_KEYS=[['x','x'],['x²','^2'],['xʸ','^'],['√','√('],['⌫','back'],['sin','sin('],['cos','cos('],['tan','tan('],['( )','paren'],['÷','/'],['7','7'],['8','8'],['9','9'],['π','π'],['×','*'],['4','4'],['5','5'],['6','6'],['e','e'],['−','-'],['1','1'],['2','2'],['3','3'],['ln','ln('],['+','+'],['AC','clear'],['0','0'],[',','.'],['log','log('],['|x|','abs(']];
function renderGraphKeypad(){
 const k=$('#keypad');k.className='keypad graph-keypad';
 k.innerHTML=GRAPH_KEYS.map(([label,g])=>{const cls=/^\d$|^[.]$/.test(g)?'':['/','*','-','+'].includes(g)?' operator':['back','clear','paren'].includes(g)?' utility':' fn-key';
  const aria=g==='back'?' aria-label="'+esc(t('deleteKey'))+'"':'';return '<button class="key'+cls+'" data-g="'+esc(g)+'" type="button"'+aria+'>'+esc(label)+'</button>'}).join('');
}
function graphChanged(){graphTrace=null;graphSave();renderGraphFns();drawGraphSoon()}
function graphKey(k){
 if(k==null)return;
 let s=graph.fns[graph.active]??'';
 if(k==='back'){const m=s.match(/(?:asin|acos|atan|sqrt|sin|cos|tan|abs|exp|log|ln|√)\($/);s=m?s.slice(0,-m[0].length):s.slice(0,-1)}
 else if(k==='clear')s='';
 else if(k==='paren'){const open=(s.match(/\(/g)||[]).length-(s.match(/\)/g)||[]).length;s+=open>0&&/[0-9.xπe)]$/.test(s)?')':'('}
 else if(s.length<120)s+=k;
 graph.fns[graph.active]=s;graphChanged();
}
// Desktop keyboard in Graph mode. Returns true when the key was used.
// Letters are also read by key position (e.code), so a Greek keyboard layout (χ, ε, σ ...) and accented letters
// (ê after a "dead" ^ key) still type x, e, sin ... The π key on a Greek layout stays π.
const G_DEAD_CARET=['Digit6','BracketLeft','Backquote'];// where ^ is a dead key: US-International, French/Spanish, German
function graphKeydown(e){
 let k=e.key;
 if(k==='Dead'){if(G_DEAD_CARET.includes(e.code)){graphKey('^');return true}return false}
 if(k.length===1&&!/^[a-zA-Zπ√]$/.test(k)&&/^Key[A-Z]$/.test(e.code||''))k=e.code.slice(3).toLowerCase();
 if(k==='Backspace'){graphKey('back');return true}
 if(/^[0-9]$/.test(k)||['+','-','*','/','^','(',')'].includes(k)){graphKey(k);return true}
 if(k===','||k==='.'||k==='Decimal'){graphKey('.');return true}
 if(/^[a-zA-Zπ√]$/.test(k)){graphKey(k.toLowerCase());return true}
 if(k==='Enter'){if(graph.active<graph.fns.length-1)graph.active++;else if(graph.fns.length<3){graph.fns.push('');graph.active=graph.fns.length-1}graphChanged();return true}
 if(k==='ArrowUp'||k==='ArrowDown'){graph.active=Math.min(graph.fns.length-1,Math.max(0,graph.active+(k==='ArrowUp'?-1:1)));graphTrace=null;renderGraphFns();drawGraphSoon();return true}
 if(k==='ArrowLeft'||k==='ArrowRight'){const cv=$('#graphCanvas');if(cv){const v=graphView(cv.clientWidth);v.cx+=(k==='ArrowLeft'?-1:1)*cv.clientWidth*.1/v.ux;graphTrace=null;drawGraphSoon()}return true}
 return false;
}

/* ---------- Graph mode: view, pan and zoom ---------- */
function graphView(w){
 let v=graph.view;
 if(!v||![v.cx,v.cy,v.ux,v.uy].every(Number.isFinite)||v.ux<=0||v.uy<=0)v=graph.view={cx:0,cy:0,ux:Math.max(8,w/20),uy:Math.max(8,w/20)};
 return v;
}
function graphZoomAt(px,py,f){
 const cv=$('#graphCanvas');if(!cv)return;const w=cv.clientWidth,h=cv.clientHeight,v=graphView(w);
 const wx=v.cx+(px-w/2)/v.ux,wy=v.cy-(py-h/2)/v.uy;
 const nx=Math.min(1e9,Math.max(1e-6,v.ux*f)),ny=Math.min(1e9,Math.max(1e-6,v.uy*f));
 v.ux=nx;v.uy=ny;v.cx=wx-(px-w/2)/v.ux;v.cy=wy+(py-h/2)/v.uy;graphTrace=null;drawGraphSoon();
}
// Fit the height to the visible part of the active curve (or of all curves if the active one is empty).
function graphFit(){
 const cv=$('#graphCanvas');if(!cv)return;const w=cv.clientWidth,h=cv.clientHeight,v=graphView(w);
 const fa=gParse(graph.fns[graph.active]||''),fs=fa?[fa]:graph.fns.map(gParse).filter(Boolean);if(!fs.length)return;
 const ys=[];for(let i=0;i<=w;i+=2){const x=v.cx+(i-w/2)/v.ux;fs.forEach(f=>{const y=f(x);if(Number.isFinite(y))ys.push(y)})}
 if(!ys.length)return;ys.sort((a,b)=>a-b);
 let lo=ys[Math.floor(ys.length*.02)],hi=ys[Math.ceil(ys.length*.98)-1];
 if(hi-lo<1e-9){lo-=1;hi+=1}
 v.cy=(lo+hi)/2;v.uy=h/((hi-lo)*1.25);graphTrace=null;drawGraphSoon();
}
function bindGraphCanvas(cv){
 const ptrs=new Map();let start=null,moved=false,pinch=null;
 const pos=e=>{const r=cv.getBoundingClientRect(),z=chZoom();return{x:(e.clientX-r.left)/z,y:(e.clientY-r.top)/z}};
 cv.addEventListener('pointerdown',e=>{
  e.preventDefault();cv.setPointerCapture?.(e.pointerId);ptrs.set(e.pointerId,pos(e));
  const v=graphView(cv.clientWidth);
  if(ptrs.size===1){const p=pos(e);start={x:p.x,y:p.y,cx:v.cx,cy:v.cy};moved=false}
  if(ptrs.size===2){const [a,b]=[...ptrs.values()],w=cv.clientWidth,h=cv.clientHeight,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
   pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,ux:v.ux,uy:v.uy,wx:v.cx+(mx-w/2)/v.ux,wy:v.cy-(my-h/2)/v.uy};moved=true}
  cv.classList.add('grabbing');
 });
 cv.addEventListener('pointermove',e=>{
  const p=pos(e);
  if(!ptrs.has(e.pointerId)){if(e.pointerType==='mouse'){graphSetTrace(p.x,p.y);}return}
  ptrs.set(e.pointerId,p);const v=graphView(cv.clientWidth),w=cv.clientWidth,h=cv.clientHeight;
  if(ptrs.size>=2&&pinch){const [a,b]=[...ptrs.values()],s=Math.hypot(a.x-b.x,a.y-b.y)/pinch.d,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
   v.ux=Math.min(1e9,Math.max(1e-6,pinch.ux*s));v.uy=Math.min(1e9,Math.max(1e-6,pinch.uy*s));v.cx=pinch.wx-(mx-w/2)/v.ux;v.cy=pinch.wy+(my-h/2)/v.uy;graphTrace=null;drawGraphSoon();return}
  if(start){const dx=p.x-start.x,dy=p.y-start.y;if(!moved&&Math.hypot(dx,dy)>5)moved=true;if(moved){v.cx=start.cx-dx/v.ux;v.cy=start.cy+dy/v.uy;graphTrace=null;drawGraphSoon()}}
 });
 const up=e=>{
  if(!ptrs.has(e.pointerId))return;const p=pos(e);
  if(ptrs.size===1&&!moved&&e.type==='pointerup')graphSetTrace(p.x,p.y);
  ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;
  if(ptrs.size===1){const v=graphView(cv.clientWidth),q=[...ptrs.values()][0];start={x:q.x,y:q.y,cx:v.cx,cy:v.cy}}
  if(!ptrs.size){start=null;cv.classList.remove('grabbing')}
 };
 cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!ptrs.size&&graphTrace){graphTrace=null;drawGraphSoon()}});
 cv.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e),dy=e.deltaMode===1?e.deltaY*16:e.deltaY;graphZoomAt(p.x,p.y,Math.exp(-dy*.0016))},{passive:false});
}
// Show the value under the pointer, snapping to a key point when one is close.
function graphSetTrace(px,py){
 const cv=$('#graphCanvas');if(!cv)return;const w=cv.clientWidth,h=cv.clientHeight,v=graphView(w);
 const near=graphPts.map(pt=>({pt,d:Math.hypot(w/2+(pt.x-v.cx)*v.ux-px,h/2-(pt.y-v.cy)*v.uy-py)})).filter(o=>o.d<14).sort((a,b)=>a.d-b.d)[0];
 if(near){graphTrace={x:near.pt.x,y:near.pt.y,i:near.pt.i,point:near.pt};drawGraphSoon();return}
 const f=gParse(graph.fns[graph.active]||''),x=v.cx+(px-w/2)/v.ux,y=f?f(x):NaN;
 graphTrace=f&&Number.isFinite(y)?{x,y,i:graph.active}:null;drawGraphSoon();
}

/* ---------- Graph mode: key points (roots, minima, maxima, intersections, y-intercept) ---------- */
function gSnap(v,tol=1e-9){if(Math.abs(v)<Math.min(1e-10,tol))return 0;const r=Math.round(v);return Math.abs(v-r)<tol*Math.max(1,Math.abs(v))?r:v}
function gBisect(f,a,b){let fa=f(a);for(let k=0;k<90;k++){const m=(a+b)/2,fm=f(m);if(!Number.isFinite(fm))return null;if(fm===0)return m;if((fa<0)===(fm<0)){a=m;fa=fm}else b=m;if(Math.abs(b-a)<=1e-15*Math.max(1,Math.abs(a)))break}return (a+b)/2}
function gGolden(f,a,b,wantMax){const g=(Math.sqrt(5)-1)/2,s=wantMax?-1:1;let c=b-g*(b-a),d=a+g*(b-a),fc=s*f(c),fd=s*f(d);for(let k=0;k<80&&Math.abs(b-a)>1e-13*Math.max(1,Math.abs(a));k++){if(fc<fd){b=d;d=c;fd=fc;c=b-g*(b-a);fc=s*f(c)}else{a=c;c=d;fc=fd;d=a+g*(b-a);fd=s*f(d)}}return (a+b)/2}
function graphKeyPoints(fs,x0,x1,n){
 const pts=[],xs=[];for(let i=0;i<=n;i++)xs.push(x0+(x1-x0)*i/n);
 const ys=fs.map(f=>f?xs.map(x=>{const y=f(x);return Number.isFinite(y)?y:NaN}):null);
 const add=(i,type,x,y,j)=>{const loose=type==='min'||type==='max';x=gSnap(x,loose?1e-6:1e-9);y=gSnap(y,loose?1e-9:1e-9);if(!Number.isFinite(x)||!Number.isFinite(y))return;const tol=(x1-x0)*1e-6;if(pts.some(p=>p.i===i&&(p.type===type||type==='yint')&&Math.abs(p.x-x)<tol&&Math.abs(p.y-y)<tol*1e3+1e-9))return;if(pts.length<80)pts.push({i,type,x,y,j})};
 fs.forEach((f,i)=>{
  if(!f)return;const y=ys[i];
  for(let k=0;k<n;k++){const a=y[k],b=y[k+1];if(Number.isNaN(a)||Number.isNaN(b))continue;
   if(a===0){add(i,'root',xs[k],0);continue}
   if(a*b<0){const r=gBisect(f,xs[k],xs[k+1]);if(r!==null&&Math.abs(f(r))<=1e-7*Math.max(1,Math.abs(a),Math.abs(b)))add(i,'root',r,0)}}
  // Extremum where the slope changes sign (flat steps skipped, so two equal samples around the peak still count).
  let pd=0,pk=-1;
  for(let k=0;k<n;k++){const a=y[k],b=y[k+1];if(Number.isNaN(a)||Number.isNaN(b)){pd=0;continue}const d=b-a;if(d===0)continue;
   if(pd&&pd*d<0){const mx=pd>0,x=gGolden(f,xs[pk],xs[k+1],mx),v=f(x);if(Number.isFinite(v)&&Math.abs(v-a)<=Math.abs(pd)+Math.abs(d))add(i,mx?'max':'min',x,v)}
   pd=d;pk=k}
  if(x0<=0&&x1>=0){const v=f(0);if(Number.isFinite(v))add(i,'yint',0,v)}
 });
 for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++){
  const f=fs[i],g=fs[j];if(!f||!g)continue;const d=x=>f(x)-g(x);
  for(let k=0;k<n;k++){const a=ys[i][k]-ys[j][k],b=ys[i][k+1]-ys[j][k+1];if(!Number.isFinite(a)||!Number.isFinite(b))continue;
   if(a===0||a*b<0){const r=a===0?xs[k]:gBisect(d,xs[k],xs[k+1]);if(r!==null&&Math.abs(d(r))<=1e-7*Math.max(1,Math.abs(a),Math.abs(b),Math.abs(f(r))))add(i,'cross',r,f(r),j)}}
 }
 return pts;
}
function gPointLabel(pt){
 const n=GRAPH_NAMES[pt.i];
 if(pt.type==='root')return gText('root')+' '+n+' · x = '+chNum(pt.x);
 if(pt.type==='yint')return gText('yint')+' · y = '+chNum(pt.y);
 if(pt.type==='cross')return gText('cross')+' '+n+', '+GRAPH_NAMES[pt.j]+' · ('+chNum(pt.x)+'; '+chNum(pt.y)+')';
 return gText(pt.type)+' '+n+' · ('+chNum(pt.x)+'; '+chNum(pt.y)+')';
}

/* ---------- Graph mode: drawing ---------- */
function drawGraphSoon(){if(!graphRaf)graphRaf=requestAnimationFrame(()=>{graphRaf=0;drawGraph()})}
function drawGraph(){
 const cv=$('#graphCanvas');if(!cv||mode!=='graph')return;
 const {ctx,w,h}=chSetup(cv);if(w<20||h<20)return;
 const C=chColors(),v=graphView(w),PX=x=>w/2+(x-v.cx)*v.ux,PY=y=>h/2-(y-v.cy)*v.uy;
 const x0=v.cx-w/2/v.ux,x1=v.cx+w/2/v.ux,y0=v.cy-h/2/v.uy,y1=v.cy+h/2/v.uy;
 ctx.fillStyle=C.card2;ctx.fillRect(0,0,w,h);
 // grid
 const sx=chStep(x1-x0,w/72),sy=chStep(y1-y0,h/56);ctx.lineWidth=1;ctx.strokeStyle=C.grid;ctx.beginPath();
 for(let x=Math.ceil(x0/sx)*sx;x<=x1;x+=sx){const p=Math.round(PX(x))+.5;ctx.moveTo(p,0);ctx.lineTo(p,h)}
 for(let y=Math.ceil(y0/sy)*sy;y<=y1;y+=sy){const p=Math.round(PY(y))+.5;ctx.moveTo(0,p);ctx.lineTo(w,p)}
 ctx.stroke();
 // axes
 const ax=PX(0),ay=PY(0);ctx.strokeStyle=C.axis;ctx.lineWidth=1.2;ctx.beginPath();
 if(ax>=0&&ax<=w){ctx.moveTo(Math.round(ax)+.5,0);ctx.lineTo(Math.round(ax)+.5,h)}
 if(ay>=0&&ay<=h){ctx.moveTo(0,Math.round(ay)+.5);ctx.lineTo(w,Math.round(ay)+.5)}
 ctx.stroke();
 // tick labels, kept inside the canvas when the axis is off-screen
 ctx.fillStyle=C.muted;ctx.font=CH_FONT;
 const lyTop=Math.min(Math.max(ay+5,4),h-18);ctx.textAlign='center';ctx.textBaseline='top';
 for(let x=Math.ceil(x0/sx)*sx;x<=x1;x+=sx){if(Math.abs(x)<sx/2)continue;const p=PX(x);if(p<14||p>w-14)continue;ctx.fillText(chTick(x,sx),p,lyTop)}
 const yl=[];for(let y=Math.ceil(y0/sy)*sy;y<=y1;y+=sy)if(Math.abs(y)>=sy/2)yl.push(y);
 const yw=Math.max(0,...yl.map(y=>ctx.measureText(chTick(y,sy)).width)),right=ax+6+yw>w-4;
 ctx.textAlign=right?'right':'left';ctx.textBaseline='middle';const lx=right?Math.min(Math.max(ax-6,yw+4),w-4):Math.max(ax+6,4);
 yl.forEach(y=>{const p=PY(y);if(p<10||p>h-10)return;ctx.fillText(chTick(y,sy),lx,p)});
 if(ax>=0&&ax<=w&&ay>=0&&ay<=h){ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText('0',ax-5,ay+5)}
 // curves (active one on top)
 const fs=graph.fns.map(gParse),order=fs.map((_,i)=>i).filter(i=>i!==graph.active).concat(graph.active);
 order.forEach(i=>{
  const f=fs[i];if(!f)return;ctx.strokeStyle=C.series[i];ctx.lineWidth=i===graph.active?2.6:2;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
  let pen=false,prev=0;
  for(let px=0;px<=w;px+=.5){const y=f(v.cx+(px-w/2)/v.ux);if(!Number.isFinite(y)){pen=false;continue}
   let py=PY(y);if(pen&&Math.abs(py-prev)>h*2.5&&(py<0||py>h||prev<0||prev>h)){pen=false}
   const cy=Math.max(-h,Math.min(2*h,py));if(pen)ctx.lineTo(px,cy);else ctx.moveTo(px,cy);pen=true;prev=py}
  ctx.stroke();
 });
 // key points
 graphPts=graphKeyPoints(fs,x0,x1,Math.min(1200,Math.max(200,Math.round(w))));
 graphPts.forEach(pt=>{const x=PX(pt.x),y=PY(pt.y);if(x<-6||x>w+6||y<-6||y>h+6)return;ctx.beginPath();ctx.arc(x,y,pt.type==='cross'?4.5:3.6,0,Math.PI*2);ctx.fillStyle=pt.type==='cross'?C.text:C.card2;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=pt.type==='cross'?C.card2:C.series[pt.i];ctx.stroke()});
 // trace under the pointer
 const ro=$('#graphReadout');
 if(graphTrace){
  const x=PX(graphTrace.x),y=PY(graphTrace.y),col=C.series[graphTrace.i]||C.accent;
  ctx.strokeStyle=C.axis;ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle=C.card2;ctx.stroke();
  if(ro){ro.textContent=graphTrace.point?gPointLabel(graphTrace.point):'x = '+chNum(graphTrace.x)+' · '+GRAPH_NAMES[graphTrace.i]+'(x) = '+chNum(graphTrace.y);ro.style.borderColor=col}
 }else if(ro){ro.textContent='';ro.style.borderColor=''}
}
function showGraphPoints(){
 const C=chColors(),pts=graphPts;
 let html='';
 graph.fns.forEach((src,i)=>{
  if(!src||!gParse(src))return;const mine=pts.filter(p=>p.i===i&&p.type!=='cross');
  html+='<div class="how-step graph-points"><div class="how-formula"><span class="chart-dot" style="background:'+C.series[i]+'"></span> '+GRAPH_NAMES[i]+'(x) = '+esc(gPretty(src))+'</div>'+
   (mine.length?mine.map(p=>'<div class="graph-point-line"><span>'+esc(gText(p.type))+'</span><strong>'+(p.type==='root'?'x = '+esc(chNum(p.x)):p.type==='yint'?'y = '+esc(chNum(p.y)):'('+esc(chNum(p.x))+'; '+esc(chNum(p.y))+')')+'</strong></div>').join(''):'<div class="empty">'+esc(gText('none'))+'</div>')+'</div>';
 });
 const cross=pts.filter(p=>p.type==='cross');
 if(cross.length)html+='<div class="how-step graph-points"><div class="how-formula">'+esc(gText('cross'))+'</div>'+cross.map(p=>'<div class="graph-point-line"><span>'+GRAPH_NAMES[p.i]+', '+GRAPH_NAMES[p.j]+'</span><strong>('+esc(chNum(p.x))+'; '+esc(chNum(p.y))+')</strong></div>').join('')+'</div>';
 if(!html)html='<div class="empty">'+esc(gText('none'))+'</div>';
 html+='<p class="chart-note">'+esc(gText('pointsNote'))+'</p>';
 $('#howTitle').textContent=gText('pointsTitle');$('#howContent').innerHTML=html;$('#howModal').classList.remove('hidden');
}
function graphSaveImage(button){
 const cv=$('#graphCanvas');if(!cv)return;const C=chColors(),dpr=cv.width/Math.max(1,cv.clientWidth);
 const rows=graph.fns.map((s,i)=>({s,i})).filter(r=>r.s&&gParse(r.s)),lh=22,pad=12,head=rows.length?rows.length*lh+pad*2:0;
 const out=document.createElement('canvas');out.width=cv.width;out.height=cv.height+Math.round(head*dpr);
 const ctx=out.getContext('2d');ctx.fillStyle=C.card;ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(cv,0,Math.round(head*dpr));
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.textBaseline='middle';ctx.font='600 14px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';
 rows.forEach((r,k)=>{const y=pad+lh*k+lh/2;ctx.fillStyle=C.series[r.i];ctx.beginPath();ctx.arc(pad+5,y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle=C.text;ctx.fillText(GRAPH_NAMES[r.i]+'(x) = '+gPretty(r.s),pad+16,y)});
 out.toBlob(blob=>{
  if(!blob)return;const file=new File([blob],'graph.png',{type:'image/png'});
  const done=()=>{if(button){button.textContent='✓';setTimeout(()=>button.textContent='⤓',1200)}};
  if(isMobileDevice()&&navigator.canShare?.({files:[file]})){navigator.share({files:[file]}).then(done).catch(()=>{});return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='graph.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);done();
 },'image/png');
}
