// The Subnet tool (IPv4): "Subnet" gives the network, broadcast, host range, mask and wildcard of an address with a
// prefix (/24) or a mask (255.255.255.0); "Hosts" gives the smallest subnet with room for so many hosts.
// Addresses are 32-bit numbers (>>>0 keeps them unsigned). /31 has 2 usable addresses (point-to-point), /32 one.
// The fields are typed on the keypad, whose , key types a dot here (FIELD_TYPE 'ip' and 'mask' in tools.js).
// The details sit in a small grid under the fields (#netDetails); ? shows the working in binary.
const ipText=n=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
const ipBinary=n=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].map(o=>o.toString(2).padStart(8,'0')).join('.');
function parseIp(s){
 const m=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s||'');if(!m)return null;
 const o=m.slice(1).map(Number);if(o.some(x=>x>255))return null;
 return ((o[0]<<24)|(o[1]<<16)|(o[2]<<8)|o[3])>>>0;
}
const prefixMask=p=>p?(0xFFFFFFFF<<(32-p))>>>0:0;
// A prefix (0-32, "/24" too) or a mask whose ones come first (255.255.255.192); null if neither.
function parsePrefix(s){
 s=(s||'').replace(/^\//,'');
 if(/^\d{1,2}$/.test(s))return +s<=32?+s:null;
 const n=parseIp(s);if(n===null)return null;
 for(let p=0;p<=32;p++)if(prefixMask(p)===n)return p;
 return null;
}
const usableHosts=p=>p===32?1:p===31?2:2**(32-p)-2;
function ipKind(n){
 const a=n>>>24,b=(n>>>16)&255,in_=(net,p)=>((n&prefixMask(p))>>>0)===parseIp(net);
 if(in_('10.0.0.0',8)||in_('172.16.0.0',12)||in_('192.168.0.0',16))return 'netPrivate';
 if(a===127)return 'netLoopback';
 if(a===169&&b===254)return 'netLinkLocal';
 if(in_('100.64.0.0',10))return 'netCgnat';
 if(a>=224&&a<240)return 'netMulticast';
 if(a>=240)return 'netReserved';
 return 'netPublic';
}
const ipClass=n=>{const a=n>>>24;return a<128?'A':a<192?'B':a<224?'C':a<240?'D':'E'};
// What a key does to a dotted field: the new text, or null to refuse it. The dots come by themselves: after a third
// digit, and before a digit that can't belong to the part (192 then 1 is 192.1, 30 then 0 is 30.0, 0 then 1 is 0.1).
// A dot pressed right after one is ignored, so typing it out of habit does no harm.
function dottedKey(value,key){
 const parts=value.split('.'),part=parts[parts.length-1],more=parts.length<4;
 if(key==='.'||key===','){
  if(!value)return null;
  if(value.endsWith('.'))return value;
  return more?value+'.':null;
 }
 if(!/^\d$/.test(key))return null;
 const next=part+key,fits=next.length<=3&&+next<=255&&!(next.length>1&&next[0]==='0');
 if(!fits)return more&&part!==''?value+'.'+key:null;
 return value+key+(next.length===3&&more?'.':'');
}
// Always the same cells (– until there's a result), so the layout doesn't jump when one appears.
const NET_CELLS={subnet:['netMask','netWildcard','netFirst','netLast','netBroadcast','netHostsLbl'],hosts:['netMask','netWildcard','netBlock','netSpare']};
function renderNetDetails(cells){
 const box=$('#netDetails');if(!box)return;
 const list=cells||NET_CELLS[toolKind.net].map(k=>[k,'–']);
 box.innerHTML=list.map(([k,v])=>'<div><span>'+esc(t(k))+'</span><strong>'+esc(v)+'</strong></div>').join('');
 box.querySelectorAll('strong').forEach(s=>fitDisplayText(s,9));// a long mask gets a smaller font, never "…"
}
function netCalculate(){
 const el=lang==='el',none=()=>{setToolResult('','',null);renderNetDetails(null)};
 if(toolKind.net==='hosts'){
  const raw=$('#netHosts')?.value??'';if(!/^\d+$/.test(raw))return none();
  const need=Number(raw);if(need<1||need>usableHosts(1))return none();
  let p=32;while(usableHosts(p)<need)p--;
  const mask=prefixMask(p),hosts=usableHosts(p);
  const how={formula:fmt(need)+(el?' συσκευές':' hosts'),steps:[
   {title:el?'Bits για τις συσκευές':'Host bits',text:'2^'+(32-p)+(p<31?' − 2 = ':' = ')+fmt(hosts)+' ≥ '+fmt(need)},
   {title:el?'Πρόθεμα':'Prefix',text:'32 − '+(32-p)+' = /'+p},
   {title:el?'Μάσκα':'Mask',text:ipBinary(mask)+' = '+ipText(mask)}],result:'/'+p};
  setToolResult('/'+p,ipText(mask)+' · '+fmt(hosts)+' '+t(hosts===1?'netHost':'netHostsWord'),how);
  renderNetDetails([['netMask',ipText(mask)],['netWildcard',ipText(~mask>>>0)],['netBlock',fmt(2**(32-p))],['netSpare',fmt(hosts-need)]]);
  return;
 }
 const ip=parseIp($('#netIp')?.value),p=parsePrefix($('#netPrefix')?.value);
 if(ip===null||p===null)return none();
 const mask=prefixMask(p),wild=~mask>>>0,net=(ip&mask)>>>0,bc=(net|wild)>>>0,hosts=usableHosts(p);
 const first=p>=31?net:net+1,last=p>=31?bc:bc-1,kind=t(ipKind(ip));
 const how={formula:ipText(ip)+'/'+p,steps:[
  {title:el?'Η διεύθυνση σε δυαδικό':'The address in binary',text:ipBinary(ip)},
  {title:el?'Η μάσκα /'+p:'The mask /'+p,text:ipBinary(mask)+' = '+ipText(mask)},
  {title:el?'Δίκτυο (διεύθυνση AND μάσκα)':'Network (address AND mask)',text:ipBinary(net)+' = '+ipText(net)},
  {title:el?'Broadcast (δίκτυο OR wildcard)':'Broadcast (network OR wildcard)',text:ipBinary(bc)+' = '+ipText(bc)},
  {title:el?'Διευθύνσεις για συσκευές':'Host addresses',text:ipText(first)+' – '+ipText(last)},
  {title:el?'Wildcard (το αντίστροφο της μάσκας)':'Wildcard (the mask inverted)',text:ipText(wild)},
  {title:el?'Συσκευές':'Hosts',text:p>=31?fmt(hosts)+(p===31?(el?' (σύνδεση σημείου προς σημείο)':' (point-to-point link)'):''):'2^'+(32-p)+' − 2 = '+fmt(hosts)}],result:ipText(net)+'/'+p};
 setToolResult(ipText(net)+'/'+p,fmt(hosts)+' '+t(hosts===1?'netHost':'netHostsWord')+' · '+kind+' · '+(el?'Κλάση ':'Class ')+ipClass(ip),how);
 renderNetDetails([['netMask',ipText(mask)],['netWildcard',ipText(wild)],['netFirst',ipText(first)],['netLast',ipText(last)],['netBroadcast',ipText(bc)],['netHostsLbl',fmt(hosts)]]);
}
window._runNet=netCalculate;
