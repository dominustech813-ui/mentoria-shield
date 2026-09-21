(()=>{
  const q=id=>document.getElementById(id);
  let notifSub=null,accessSub=null,guestSub=null,started=false,pendingTimer=null;
  const oldTab=window.tab;
  const oldEnter=window.enter;

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
      return;
    }
    return oldTab(name);
  };

  window.enter=function(){
    oldEnter();
    setTimeout(initNotifUi,0);
  };

  async function initNotifUi(){
    if(started||!user)return;
    started=true;
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
      return `<article class="csNotice ${unread?'unread':''}"><div class="row between"><b>${esc(n.title||'Notificação')}</b><span class="small">${esc(time)}</span></div><p>${esc(n.body||'')}</p>${n.related_ticket?`<div class="small">Ticket: <b>${esc(n.related_ticket)}</b></div>`:''}</article>`;
    }).join(''):'<p class="small">Nenhuma notificação ainda.</p>';
    if(mark){
      const missing=notifs.filter(n=>!reads.has(n.id)).map(n=>({notification_id:n.id,user_id:user.id}));
      if(missing.length)await sb.from('notification_reads').insert(missing);
    }
    await refreshBadge();
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
    const {error}=await sb.from('notifications').insert({recipient_email:target,title,body,type:'admin_message',created_by:user.id});
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
      : `<div class="csRequest"><div><b>${esc(r.email)}</b></div><div class="csTicket">Ticket ${esc(r.ticket)}</div><div class="small">Está tentando entrar na Creative Squad.</div><div class="row" style="margin-top:8px"><button class="btn green" onclick="resolveCsAccess(${Number(r.ticket)},'approved')">Sim, autorizar</button><button class="btn danger" onclick="resolveCsAccess(${Number(r.ticket)},'denied')">Não</button></div></div>`
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

  setTimeout(initNotifUi,500);
  setTimeout(initNotifUi,1500);
})();