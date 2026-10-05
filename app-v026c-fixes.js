/* v0.2.6 calculator behavior fixes */
function clearLabel(){return (result!==null||!expression)?'AC':'C'}
function renderDisplay(){
  const ex=$('#expression'),r=$('#result');
  if(result!==null&&resultExpression===expression){ex.textContent=resultExpression+' =';r.textContent=fmt(result)}
  else{
    const pending=expression.match(/^(.*?)([+\-*/])$/);
    if(pending){ex.textContent='';r.textContent=pending[1]||'0'}
    else{ex.textContent='';r.textContent=current||'0'}
  }
  setText('#clearButton',clearLabel());
  $('#howButton').classList.toggle('hidden',!(result!==null&&resultExpression===expression&&explanation));
}
function clearCurrent(){
  if(!expression){current='0';result=null;resultExpression='';explanation=null;$('#howPanel').classList.add('hidden');renderDisplay();return}
  if(result!==null){clearAll();return}
  $('#howPanel').classList.add('hidden');result=null;resultExpression='';explanation=null;
  if(/[+\-*/]$/.test(expression)){current='0';renderDisplay();return}
  expression=expression.replace(/(?:\d*\.?\d+%?)$/,'');current='0';renderDisplay();
}
