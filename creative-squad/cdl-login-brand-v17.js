(()=>{
  const BRAND='Creative Dark Legends 2 COPA CDL';
  const repl=s=>String(s??'')
    .replace(/Creative Squad/g,BRAND)
    .replace(/Bot CS/g,'Bot CDL')
    .replace(/Membro CS/g,'Membro CDL')
    .replace(/\bCS\b/g,'CDL');
  function apply(root=document){
    document.title=BRAND;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;
    while(n=walker.nextNode())nodes.push(n);
    nodes.forEach(t=>{const p=t.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))return;const v=repl(t.nodeValue);if(v!==t.nodeValue)t.nodeValue=v;});
    root.querySelectorAll?.('[alt]').forEach(el=>el.alt=repl(el.alt));
  }
  apply();
  new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)apply(n);else if(n.nodeType===3){const v=repl(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;}}))).observe(document.documentElement,{childList:true,subtree:true});
})();