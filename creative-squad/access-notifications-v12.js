(()=>{
  const q=id=>document.getElementById(id);
  const BRAND='Creative Dark Legends 2 COPA CDL';
  const SHORT='CDL';
  const LOGO='../creative-squad/logo-cdl.svg';
  let notifSub=null,accessSub=null,guestSub=null,started=false,pendingTimer=null;
  const oldTab=window.tab;
  const oldEnter=window.enter;

  function brandText(s){
    return String(s??'')
      .replace(/Creative Squad/g,BRAND)
      .replace(/Bot CS/g,'Bot CDL')
      .replace(/Membro CS/g,'Membro CDL')
      .replace(/Carregadoria da CS/g,'Carregadoria da CDL')
      .replace(/Poder Judiciário CS/g,'Poder Judiciário CDL')
      .replace(/\bCS\b/g,SHORT);
  }

  function applyBranding(root=document){
    document.title=BRAND;
    try{
      if(typeof textChannels!=='undefined'){
        textChannels.forEach(c=>{
          if(c.id==='geral')c.desc='Conversa geral da '+BRAND+'.';
          if(c.id==='carregadoria')c.name='Carregadoria da CDL';
          if(c.id==='judiciario')c.name='Poder Judiciário CDL';
          c.name=brandText(c.name);c.desc=brandText(c.desc);
        });
      }
    }catch{}
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;
    while(n=walker.nextNode())nodes.push(n);
    nodes.forEach(t=>{const p=t.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))return;const v=brandText(t.nodeValue);if(v!==t.nodeValue)t.nodeValue=v;});
    root.querySelectorAll?.('[alt]').forEach(el=>{el.alt=brandText(el.alt)});
    root.querySelectorAll?.('img').forEach(img=>{if((img.getAttribute('src')||'').includes('logo'))img.src=LOGO;});
  }

  applyBranding();
  new MutationObserver(m=>{m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)applyBranding(n);else if(n.nodeType===3){const v=brandText(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;}}))}).observe(document.documentElement,{childList:true,subtree:true});

  try{
    const oldEnsureProfile=ensureProfile;
    ensureProfile=async function(){
      await oldEnsureProfile();
      if(profile?.bio&&profile.bio.includes('Creative Squad')){
        const bio=brandText(profile.bio);
        const {data}=await sb.from('profiles').update({bio}).eq('id',user.id).select().single();
        if(data)profile=data;
      }
      applyBranding();
    };
  }catch{}

  function setActiveTab(name){
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  }

  window.tab=function(name){
    const n=q('notifications');
    if(name!=='notifications'&&n)n.classList.add('hidden');
    if(name==='notifications'){
      if(!user)return;
      ['home','chat','profile','roles'].forEach(id=>q(id)?.classList.add('hidden'));
      n?.classList.remove('hidden');
      setActiveTab('notifications');
      loadNotifications(true);
      if(admin()){q('adminNotifPanel')?.classList.remove('hidden');loadTargets();loadPending();}
      else q('adminNotifPanel')?.classList.add('hidden');
      applyBranding();
      return;
    }
    const out=oldTab(name);applyBranding();return out;
  };

  window.enter=function(){
    oldEnter();
    applyBranding();
    setTimeout(initNotifUi,0);
  };

  async function initNotifUi(){
    if(started||!user)return;
    started=true;
    applyBranding();
    q('adminNotifPanel')?.classList.toggle('hidden',!admin());
    await refreshBadge();
    await subscribe();
    if(admin()){
      await loadPending();
      pendingTimer=setInterval(loadPending,5000);
    }
  }

  async function rows(){
    const [{data:notifs,error},{data:reads}]=await Promise.all([
      sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(100),
      sb.from('notification_reads').select('notification_id').eq('user_id',user.id)
    ]);
    return {notifs:notifs||[],reads:new Set((reads||[]).map(x=>x.notification_id)),error};
  }

  async function loadNotifications(mark=false){
    if(!user)return;
    const box=q('notificationsList');
    if(!box)return;
    const {notifs,reads,error}=await rows();
    if(error){box.innerHTML='<p class="small">Não foi possível carregar as notificações.</p>';return;}
    box.innerHTML=notifs.length?notifs.map(n=>{
      const unread=!reads.has(n.id);
      const time=new Date(n.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      return `<article class="csNotice ${unread?'unread':''}"><div class="row between"><b>${esc(brandText(n.title||'Notificação'))}</b><span class="small">${esc(time)}</span></div><p>${esc(brandText(n.body||''))}</p>${n.related_ticket?`<div class="small">Ticket: <b>${esc(n.related_ticket)}</b></div>`:''}</article>`;
    }).join(''):'<p class="small">Nenhuma notificação ainda.</p>';
    if(mark){
      const missing=notifs.filter(n=>!reads.has(n.id)).map(n=>({notification_id:n.id,user_id:user.id}));
      if(missing.length)await sb.from('notification_reads').insert(missing);
    }
    await refreshBadge();
    applyBranding(box);
  }

  async function refreshBadge(){
    if(!user)return;
    const badge=q('notifBadge');if(!badge)return;
    const {notifs,reads}=await rows();
    const count=notifs.filter(n=>!reads.has(n.id)).length;
    badge.textContent=String(count);
    badge.classList.toggle('hidden',count===0);
  }

  async function loadTargets(){
    if(!admin())return;
    const sel=q('notificationTarget');if(!sel)return;
    const {data}=await sb.from('profiles').select('email,display_name').order('display_name');
    sel.innerHTML='<option value="">Todos</option>'+(data||[]).map(p=>`<option value="${esc(p.email)}">${esc(p.display_name||p.email)} • ${esc(p.email)}</option>`).join('');
  }

  window.sendCsNotification=async function(){
    if(!admin())return;
    const target=q('notificationTarget').value||null;
    const title=q('notificationTitle').value.trim();
    const body=q('notificationBody').value.trim();
    if(!title||!body)return alert('Digite o título e a mensagem.');
    const {error}=await sb.from('notifications').insert({recipient_email:target,title:brandText(title),body:brandText(body),type:'admin_message',created_by:user.id});
    if(error)return alert('Não foi possível enviar: '+error.message);
    q('notificationTitle').value='';q('notificationBody').value='';
    alert(target?'Notificação enviada para a pessoa escolhida.':'Notificação enviada para todos.');
    await loadNotifications(false);
  };

  async function loadPending(){
    if(!admin())return;
    const box=q('pendingAccessRequests');if(!box)return;
    const [emailReq,guestReq]=await Promise.all([
      sb.from('access_requests').select('ticket,email,created_at').eq('status','pending').order('created_at',{ascending:true}),
      sb.from('guest_access_requests').select('ticket,created_at').eq('status','pending').order('created_at',{ascending:true})
    ]);
    if(emailReq.error||guestReq.error){box.innerHTML='<p class="small">Não foi possível carregar as solicitações.</p>';return;}
    const emailRows=(emailReq.data||[]).map(r=>({kind:'email',...r}));
    const guestRows=(guestReq.data||[]).map(r=>({kind:'guest',...r}));
    const rows=[...emailRows,...guestRows].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    if(!rows.length){box.innerHTML='<p class="small">Nenhuma solicitação pendente.</p>';return;}
    box.innerHTML=rows.map(r=>r.kind==='guest'
      ? `<div class="csRequest"><div><b>🔔 Alguém está tentando entrar</b></div><div class="csTicket">Seu ticket é ${esc(r.ticket)}</div><div class="small">Entrada solicitada sem e-mail.</div><div class="row" style="margin-top:8px"><button class="btn green" onclick="resolveCsGuestAccess(${Number(r.ticket)},'approved')">Sim, autorizar</button><button class="btn danger" onclick="resolveCsGuestAccess(${Number(r.ticket)},'denied')">Não</button></div></div>`
      : `<div class="csRequest"><div><b>${esc(r.email)}</b></div><div class="csTicket">Ticket ${esc(r.ticket)}</div><div class="small">Está tentando entrar na ${BRAND}.</div><div class="row" style="margin-top:8px"><button class="btn green" onclick="resolveCsAccess(${Number(r.ticket)},'approved')">Sim, autorizar</button><button class="btn danger" onclick="resolveCsAccess(${Number(r.ticket)},'denied')">Não</button></div></div>`
    ).join('');
  }

  async function api(payload){
    const {data:s}=await sb.auth.getSession();
    const headers={'Content-Type':'application/json','apikey':SUPABASE_KEY};
    if(s.session?.access_token)headers.Authorization='Bearer '+s.session.access_token;
    const r=await fetch(SUPABASE_URL+'/functions/v1/send-cs-otp',{method:'POST',headers,body:JSON.stringify(payload)});
    const j=await r.json().catch(()=>({}));
    return {ok:r.ok,data:j};
  }

  window.resolveCsAccess=async function(ticket,decision){
    if(!admin())return;
    if(!confirm(decision==='approved'?'Autorizar este e-mail a entrar?':'Recusar esta solicitação?'))return;
    const r=await api({action:'resolve_access',ticket,decision});
    if(!r.ok)return alert(r.data?.error||'Não foi possível concluir.');
    alert(decision==='approved'?'✅ Entrada autorizada.':'❌ Solicitação recusada.');
    await loadPending();await loadNotifications(false);await refreshBadge();
  };

  window.resolveCsGuestAccess=async function(ticket,decision){
    if(!admin())return;
    if(!confirm(decision==='approved'?`Autorizar o ticket ${ticket} a entrar?`:`Recusar o ticket ${ticket}?`))return;
    const r=await api({action:'resolve_guest_access',ticket,decision});
    if(!r.ok)return alert(r.data?.error||'Não foi possível concluir.');
    alert(decision==='approved'?`✅ Ticket ${ticket} autorizado.`:`❌ Ticket ${ticket} recusado.`);
    await loadPending();await loadNotifications(false);await refreshBadge();
  };

  async function subscribe(){
    notifSub=sb.channel('cs-notifications-ui-'+Date.now())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},async()=>{await refreshBadge();if(admin())await loadPending();if(!q('notifications')?.classList.contains('hidden'))await loadNotifications(false);})
      .subscribe();
    if(admin()){
      accessSub=sb.channel('cs-access-ui-'+Date.now())
        .on('postgres_changes',{event:'*',schema:'public',table:'access_requests'},async()=>{await loadPending();await refreshBadge();})
        .subscribe();
      guestSub=sb.channel('cs-guest-access-ui-'+Date.now())
        .on('postgres_changes',{event:'*',schema:'public',table:'guest_access_requests'},async()=>{await loadPending();await refreshBadge();})
        .subscribe();
    }
  }

  setTimeout(()=>{applyBranding();initNotifUi()},500);
  setTimeout(()=>{applyBranding();initNotifUi()},1500);
})();