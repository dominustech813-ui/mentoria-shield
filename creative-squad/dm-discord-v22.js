(()=>{
  let started=false,sub=null,currentPeer=null,lastRecent=[];
  const q=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function addCss(){if(document.getElementById('dmDiscordCss'))return;const l=document.createElement('link');l.id='dmDiscordCss';l.rel='stylesheet';l.href='../creative-squad/dm-discord-v22.css?v=22';document.head.appendChild(l)}

  function statusFor(p,id){
    try{if(window.CDLPresence)return CDLPresence.visibleStatus(p,id)}catch{}
    const s=p?.presence_status||'online';
    if(s==='invisible')return 'offline';
    const age=Date.now()-new Date(p?.presence_updated_at||0).getTime();
    if(!Number.isFinite(age)||age>90000)return 'offline';
    return ['online','idle','dnd'].includes(s)?s:'offline';
  }
  function statusClass(s){return 'ps-'+(s||'offline')}
  function statusLabel(s){return ({online:'Online',idle:'Ausente',dnd:'Não perturbe',invisible:'Invisível',offline:'Offline'})[s]||'Offline'}
  async function avatarFor(p){try{return await url('avatars',p?.avatar_path)}catch{return '../creative-squad-v9/logo.jpg'}}
  function pFor(id){try{return profiles.get(id)||null}catch{return null}}

  function installUi(){
    if(q('direct'))return;
    addCss();
    const nav=document.querySelector('nav.tabs');
    const profileTab=nav?.querySelector('[data-tab="profile"]');
    if(nav){const b=document.createElement('button');b.className='tab';b.dataset.tab='direct';b.setAttribute('onclick',"tab('direct')");b.innerHTML='💬 Privado <span id="dmBadge" class="dmTopBadge hidden">0</span>';nav.insertBefore(b,profileTab||null)}
    const app=q('app');
    const section=document.createElement('section');section.id='direct';section.className='view hidden';
    section.innerHTML=`<div class="dmShell card">
      <aside class="dmSidebar">
        <div class="dmSideTop"><div class="dmSideTitle"><span>Mensagens diretas</span><button class="dmNewBtn" type="button" onclick="CDLDM.openPicker()" title="Nova conversa">＋</button></div><input id="dmRecentSearch" class="dmSearch" placeholder="Buscar conversa" oninput="CDLDM.filterRecent(this.value)"></div>
        <div class="dmLabel">MENSAGENS DIRETAS</div><div id="dmRecent" class="dmRecent"><div class="dmEmpty"><span>Nenhuma conversa ainda.</span></div></div>
      </aside>
      <main class="dmMain">
        <div id="dmHeader" class="dmHeader"><div class="dmHeaderText"><b>Mensagens privadas</b><small>Escolha uma pessoa para conversar</small></div></div>
        <div id="dmMessages" class="dmMessages"><div class="dmEmpty"><div><strong>Suas mensagens privadas</strong><span>Use o botão ＋ para começar uma conversa.</span></div></div></div>
        <div id="dmComposer" class="dmComposer hidden"><div class="dmComposerInner"><textarea id="dmText" maxlength="2000" placeholder="Mensagem privada..." rows="1"></textarea><button id="dmSend" class="dmSend" type="button" onclick="CDLDM.send()">Enviar</button></div></div>
      </main>
    </div>
    <div id="dmPicker" class="dmPicker hidden" onclick="if(event.target===this) CDLDM.closePicker()"><div class="dmPickerCard"><div class="dmPickerHead"><b>Nova mensagem</b><button class="dmPickerClose" type="button" onclick="CDLDM.closePicker()">×</button></div><input id="dmPickerSearch" class="dmPickerSearch" placeholder="Buscar membro da CDL" oninput="CDLDM.renderPicker(this.value)"><div id="dmPickerList" class="dmPickerList"></div></div></div>`;
    app?.appendChild(section);
    const ta=q('dmText');if(ta)ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
  }

  function installTab(){
    if(window.__cdlDmTabWrapped)return;window.__cdlDmTabWrapped=true;
    const oldTab=window.tab;
    window.tab=function(name){
      if(name==='direct'){
        ['home','chat','notifications','profile','roles'].forEach(id=>q(id)?.classList.add('hidden'));
        q('direct')?.classList.remove('hidden');
        document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab==='direct'));
        start();loadRecent();refreshBadge();
        return;
      }
      q('direct')?.classList.add('hidden');
      return oldTab(name);
    };
  }

  async function loadProfiles(){try{await caches()}catch{}}
  async function unreadCount(){if(!user)return 0;const {count}=await sb.from('direct_messages').select('id',{count:'exact',head:true}).eq('recipient_id',user.id).is('read_at',null);return count||0}
  async function refreshBadge(){const b=q('dmBadge');if(!b||!user)return;const n=await unreadCount();b.textContent=String(n);b.classList.toggle('hidden',n===0)}

  async function loadRecent(){
    if(!user)return;await loadProfiles();
    const {data,error}=await sb.from('direct_messages').select('id,sender_id,recipient_id,body,created_at,read_at').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(500);
    if(error){q('dmRecent').innerHTML='<div class="dmEmpty"><span>Não foi possível carregar.</span></div>';return}
    const map=new Map();
    (data||[]).forEach(m=>{const peer=m.sender_id===user.id?m.recipient_id:m.sender_id;if(!map.has(peer))map.set(peer,{peer,last:m,unread:0});if(m.recipient_id===user.id&&!m.read_at)map.get(peer).unread++});
    lastRecent=[...map.values()];await renderRecent(lastRecent);
  }

  async function renderRecent(rows){
    const box=q('dmRecent');if(!box)return;
    if(!rows.length){box.innerHTML='<div class="dmEmpty"><span>Nenhuma conversa ainda.</span></div>';return}
    const html=await Promise.all(rows.map(async r=>{const p=pFor(r.peer)||{display_name:'Membro CDL'};const a=await avatarFor(p),s=statusFor(p,r.peer);return `<button class="dmPerson ${currentPeer===r.peer?'active':''}" type="button" onclick="CDLDM.open('${esc(r.peer)}')"><span class="dmAvatarWrap"><img class="dmAvatar" src="${esc(a)}" alt="${esc(p.display_name||'Membro CDL')}"><span class="dmStatus ${statusClass(s)}"></span></span><span class="dmPersonText"><b>${esc(p.display_name||p.nickname||'Membro CDL')}</b><small>${esc(r.last.body||'')}</small></span>${r.unread?`<span class="dmUnreadDot">${r.unread}</span>`:''}</button>`}));
    box.innerHTML=html.join('');
  }

  function filterRecent(v){const t=String(v||'').trim().toLowerCase();if(!t)return renderRecent(lastRecent);renderRecent(lastRecent.filter(r=>{const p=pFor(r.peer);return `${p?.display_name||''} ${p?.nickname||''}`.toLowerCase().includes(t)}))}

  async function openPicker(){await loadProfiles();q('dmPicker')?.classList.remove('hidden');const s=q('dmPickerSearch');if(s){s.value='';setTimeout(()=>s.focus(),50)}renderPicker('')}
  function closePicker(){q('dmPicker')?.classList.add('hidden')}
  async function renderPicker(term=''){
    const box=q('dmPickerList');if(!box||!user)return;const t=String(term).trim().toLowerCase();
    const list=[...profiles.values()].filter(p=>p.id!==user.id).filter(p=>!t||`${p.display_name||''} ${p.nickname||''}`.toLowerCase().includes(t)).sort((a,b)=>String(a.display_name||'').localeCompare(String(b.display_name||''),'pt-BR'));
    if(!list.length){box.innerHTML='<div class="dmEmpty"><span>Nenhum membro encontrado.</span></div>';return}
    const html=await Promise.all(list.map(async p=>{const a=await avatarFor(p),s=statusFor(p,p.id);return `<button class="dmPerson" type="button" onclick="CDLDM.open('${esc(p.id)}');CDLDM.closePicker()"><span class="dmAvatarWrap"><img class="dmAvatar" src="${esc(a)}" alt="${esc(p.display_name||'Membro CDL')}"><span class="dmStatus ${statusClass(s)}"></span></span><span class="dmPersonText"><b>${esc(p.display_name||p.nickname||'Membro CDL')}</b><small>${esc(statusLabel(s))}</small></span></button>`}));
    box.innerHTML=html.join('');
  }

  async function open(peerId){
    if(!user||!peerId||peerId===user.id)return;currentPeer=peerId;await loadProfiles();
    const p=pFor(peerId)||{display_name:'Membro CDL'};const a=await avatarFor(p),s=statusFor(p,peerId);
    q('dmHeader').innerHTML=`<span class="dmAvatarWrap"><img class="dmAvatar" src="${esc(a)}" alt="${esc(p.display_name||'Membro CDL')}"><span class="dmStatus ${statusClass(s)}"></span></span><span class="dmHeaderText"><b>${esc(p.display_name||p.nickname||'Membro CDL')}</b><small>${esc(statusLabel(s))}</small></span>`;
    q('dmComposer')?.classList.remove('hidden');if(q('dmText'))q('dmText').placeholder='Mensagem para '+(p.display_name||p.nickname||'membro')+'...';
    await renderThread();await markRead();await loadRecent();await refreshBadge();setTimeout(()=>q('dmText')?.focus(),40);
  }

  async function renderThread(){
    const box=q('dmMessages');if(!box||!user||!currentPeer)return;
    const filter=`and(sender_id.eq.${user.id},recipient_id.eq.${currentPeer}),and(sender_id.eq.${currentPeer},recipient_id.eq.${user.id})`;
    const {data,error}=await sb.from('direct_messages').select('*').or(filter).order('created_at',{ascending:true}).limit(400);
    if(error){box.innerHTML='<div class="dmEmpty"><span>Não foi possível abrir a conversa.</span></div>';return}
    if(!(data||[]).length){const p=pFor(currentPeer)||{};box.innerHTML=`<div class="dmEmpty"><div><strong>Comece a conversa com ${esc(p.display_name||'este membro')}</strong><span>Esta conversa é privada entre vocês.</span></div></div>`;return}
    const html=await Promise.all((data||[]).map(async m=>{const mine=m.sender_id===user.id,p=pFor(m.sender_id)||{display_name:'Membro CDL'},a=await avatarFor(p),time=new Date(m.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});return `<div class="dmMsg ${mine?'mine':''}"><img class="dmMsgAvatar" src="${esc(a)}" alt="${esc(p.display_name||'Membro CDL')}"><div><div class="dmMsgHead"><b>${esc(p.display_name||p.nickname||'Membro CDL')}</b><time>${esc(time)}</time></div><div class="dmMsgBody">${esc(m.body)}</div></div></div>`}));
    box.innerHTML=html.join('');box.scrollTop=box.scrollHeight;
  }

  async function markRead(){if(!user||!currentPeer)return;await sb.from('direct_messages').update({read_at:new Date().toISOString()}).eq('recipient_id',user.id).eq('sender_id',currentPeer).is('read_at',null)}
  async function send(){
    if(!user||!currentPeer)return;const ta=q('dmText'),btn=q('dmSend'),body=ta?.value.trim();if(!body)return;btn.disabled=true;
    const {error}=await sb.from('direct_messages').insert({sender_id:user.id,recipient_id:currentPeer,body});btn.disabled=false;if(error)return alert('Não foi possível enviar: '+error.message);ta.value='';await renderThread();await loadRecent();
  }

  function relevant(m){return m&&(m.sender_id===user?.id||m.recipient_id===user?.id)}
  function subscribe(){if(sub||!user)return;sub=sb.channel('cdl-private-dm-'+Date.now()).on('postgres_changes',{event:'*',schema:'public',table:'direct_messages'},async payload=>{const m=payload.new?.id?payload.new:payload.old;if(!relevant(m))return;await refreshBadge();await loadRecent();if(currentPeer&&(m.sender_id===currentPeer||m.recipient_id===currentPeer))await renderThread()}).subscribe()}
  async function start(){if(started||!user)return;started=true;installUi();installTab();await loadProfiles();await loadRecent();await refreshBadge();subscribe()}

  window.CDLDM={open,send,openPicker,closePicker,renderPicker,filterRecent,start};
  addCss();installUi();installTab();setInterval(()=>{if(user&&!started)start()},700);setTimeout(()=>{if(user)start()},400);
})();
