// Big screens: two panels beside the app, both live, nothing to open. On the left this mode's History (the same list
// as the History sheet, tap to bring one back); on the right the working of what is on screen (howHtml, explain.js),
// in Graph its key points, and in VAT, Fuel, Energy and Interest the chart under it. They show when there is room for
// a 260–300px panel on each side of the card (html.side-panels), and sit level with it (--side-*). Phones never get them.
const SIDE_W=300,SIDE_MIN_W=260,SIDE_GAP=20,SIDE_MIN_H=600;
const sText=k=>({el:{calc:'Πάτα = και η λύση φαίνεται εδώ, βήμα βήμα.',tool:'Συμπλήρωσε τα πεδία και η λύση φαίνεται εδώ.',
  units:'Γράψε μια τιμή και η μετατροπή φαίνεται εδώ.'},
 en:{calc:'Press = and the working shows here, step by step.',tool:'Fill in the fields and the working shows here.',
  units:'Type a value and how it converts shows here.'}}[lang==='el'?'el':'en'][k]);
let sideRaf=0,sideLast={};
// called whenever something on screen changes; draws once per frame at most. force: draw again even if unchanged (theme)
function refreshSide(force){if(force)sideLast={};if(sideRaf||typeof $!=='function')return;sideRaf=requestAnimationFrame(()=>{sideRaf=0;renderSide()})}
function sideRoom(){
 const card=$('#calculatorCard'),root=document.documentElement;if(!card)return null;
 if(root.classList.contains('landscape')||root.classList.contains('page-scroll'))return null;
 const z=window.__uiZoom||1,r=card.getBoundingClientRect(),left=r.left/z,right=r.right/z,top=r.top/z,h=r.height/z;
 const w=Math.min(SIDE_W,Math.floor(left-SIDE_GAP-12));// narrower on a 1280px screen
 if(w<SIDE_MIN_W||innerHeight/z<SIDE_MIN_H)return null;
 return {left:left-SIDE_GAP-w,right:right+SIDE_GAP,top,h,w};
}
function renderSide(){
 const root=document.documentElement,room=sideRoom();
 root.classList.toggle('side-panels',!!room);if(!room){sideLast={};return}
 root.style.setProperty('--side-l',room.left+'px');root.style.setProperty('--side-r',room.right+'px');
 root.style.setProperty('--side-top',room.top+'px');root.style.setProperty('--side-w',room.w+'px');root.style.setProperty('--side-h',room.h+'px');
 const tab=currentTab();
 // left: History
 const hTitle=t('history')+(tab==='calc'?'':' · '+modeText(tab)),hList=historyRowsHtml(tab);
 if(sideLast.hTitle!==hTitle){$('#sideHistoryTitle').textContent=hTitle;sideLast.hTitle=hTitle}
 if(sideLast.hList!==hList){$('#sideHistoryList').innerHTML=hList;sideLast.hList=hList}
 // right: the working, or Graph's key points; a tool's chart under it
 let title=t('how'),html;
 if(mode==='graph'){title=gText('pointsTitle');html=graphPointsHtml()}
 else{const d=mode==='units'?unitsHow():howData;html=d?howHtml(d):'<p class="side-empty">'+esc(sText(mode==='calc'?'calc':mode==='units'?'units':'tool'))+'</p>'}
 if(sideLast.wTitle!==title){$('#sideWorkTitle').textContent=title;sideLast.wTitle=title}
 if(sideLast.work!==html){$('#sideWorkBody').innerHTML=html;sideLast.work=html}
 const chart=TOOL_MODES.includes(mode)&&toolChartAvailable(),box=$('#sideChart');
 box.classList.toggle('hidden',!chart);
 if(chart){if(!box.querySelector('.tc-canvas'))box.innerHTML=toolChartHtml(false);drawToolChart(box)}else if(box.innerHTML)box.innerHTML='';
}
function setupSide(){
 $('#sideHistoryList').addEventListener('click',historyClick);// the same as the sheet: bring one back, ×
 addEventListener('resize',()=>refreshSide());
 refreshSide();
}
