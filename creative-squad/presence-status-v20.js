(()=>{
  const HEARTBEAT_MS=25000;
  const STALE_MS=90000;
  const REFRESH_MS=5000;
  let started=false,sub=null,heartbeatTimer=null,refreshTimer=null;
  const q=id=>document.getElementById(id);
  const statuses={
    online:{label:'Online',desc:'Você aparece disponível.',cls:'ps-online'},
    idle:{label:'Ausente',desc:'Você aparece ausente.',cls:'ps-idle'},
    dnd:{label:'Não perturbe',desc:'Você aparece ocupado.',cls:'ps-dnd'},
    invisible:{label:'Invisível',desc:'Você aparece offline para os outros.',cls:'ps-invisible'},
    offline:{label:'Offline',desc:'Offline',cls:'ps-offline'}
  };

  function getOwnStatus(){return profile?.presence_status||'online'}
  function ageOf(p){const t=new Date(p?.presence_updated_at||0).getTime();return t?Date.now()-t:Infinity}
  function visibleStatus(p,uid){
    const s=p?.presence_status||'online';
    if(user&&uid===user.id)return s;
    if(s==='invisible')return 'offline';
    if(ageOf(p)>STALE_MS)return 'offline';
    return statuses[s]?s:'offline';
  }
  function meta(status){return statuses[status]||statuses.offline}

  async function avatarFor(p){try{return await url('avatars',p?.avatar_path)}catch{return '../creative-squad-v9/logo.jpg'}}

  async function installSidebarPanel(){
    if(!user||!profile)return;
    const aside=document.querySelector('#chat .chat aside');
    if(!aside)return;
    let panel=q('cdlStatusPanel');
    if(!panel){
      panel=document.createElement('div');panel.id='cdlStatusPanel';
      panel.innerHTML=`<div class="cdlPresenceUser">
        <div class="cdlPresenceAvatarWrap"><img id="cdlPresenceAvatar" class="cdlPresenceAvatar" src="../creative-squad-v9/logo.jpg" alt="Perfil"><span id="cdlPresenceDot" class="cdlPresenceDot"></span></div>
        <button id="cdlPresenceMain" type="button" style="all:unset;cursor:pointer;min-width:0" onclick="CDLPresence.toggleMenu()"><span class="cdlPresenceText"><b id="cdlPresenceName">Membro CDL</b><small id="cdlPresenceLabel">Online</small></span></button>
        <button class="cdlPresenceMenuBtn" type="button" onclick="CDLPresence.toggleMenu()" aria-label="Alterar status">⚙</button>
        <div id="cdlPresenceMenu" class="cdlPresenceMenu hidden"></div>
      </div>`;
      aside.appendChild(panel);
    }
    q('cdlPresenceName').textContent=profile.display_name||profile.nickname||'Membro CDL';
    q('cdlPresenceAvatar').src=await avatarFor(profile);
    renderOwnStatus();
    renderMenu();
  }

  function renderOwnStatus(){
    const s=getOwnStatus(),m=meta(s),dot=q('cdlPresenceDot'),label=q('cdlPresenceLabel');
    if(dot)dot.className='cdlPresenceDot '+m.cls;
    if(label)label.textContent=m.label;
    const select=q('cdlProfilePresenceSelect');if(select)select.value=s;
    document.querySelectorAll('.cdlPresenceOption').forEach(b=>b.classList.toggle('active',b.dataset.status===s));
    const selfDot=document.querySelector('#voiceDock .dvOnline');
    if(selfDot)selfDot.className='dvOnline '+m.cls;
  }

  function renderMenu(){
    const menu=q('cdlPresenceMenu');if(!menu)return;
    const opts=['online','idle','dnd','invisible'];
    menu.innerHTML=opts.map(s=>{const m=meta(s);return `<button class="cdlPresenceOption ${getOwnStatus()===s?'active':''}" data-status="${s}" type="button" onclick="CDLPresence.setStatus('${s}')"><span class="cdlStatusIcon ${m.cls}"></span><span><strong>${m.label}</strong><small>${m.desc}</small></span></button>`}).join('');
  }

  function installProfileControl(){
    const box=document.querySelector('#profile .card.box');if(!box||q('cdlProfilePresence'))return;
    const div=document.createElement('div');div.id='cdlProfilePresence';div.className='cdlProfileStatus';
    div.innerHTML=`<label for="cdlProfilePresenceSelect">Status</label><select id="cdlProfilePresenceSelect" onchange="CDLPresence.setStatus(this.value)"><option value="online">🟢 Online</option><option value="idle">🟡 Ausente</option><option value="dnd">🔴 Não perturbe</option><option value="invisible">⚫ Invisível</option></select><div class="cdlProfileStatusHelp">Invisível faz você aparecer offline para os outros membros.</div>`;
    const bio=box.querySelector('#bio');if(bio)bio.insertAdjacentElement('afterend',div);else box.appendChild(div);
    renderOwnStatus();
  }

  async function setStatus(status){
    if(!user||!statuses[status]||status==='offline')return;
    const now=new Date().toISOString();
    const {data,error}=await sb.from('profiles').update({presence_status:status,presence_updated_at:now}).eq('id',user.id).select().single();
    if(error){alert('Não foi possível alterar o status: '+error.message);return}
    profile=data;
    try{profiles.set(data.id,data)}catch{}
    renderOwnStatus();renderMenu();applyVoiceStatuses();
    const menu=q('cdlPresenceMenu');if(menu)menu.classList.add('hidden');
  }

  async function heartbeat(){
    if(!user||!profile)return;
    const now=new Date().toISOString();
    const {error}=await sb.from('profiles').update({presence_updated_at:now}).eq('id',user.id);
    if(!error){profile.presence_updated_at=now;try{const p=profiles.get(user.id);if(p){p.presence_updated_at=now;profiles.set(user.id,p)}}catch{}}
  }

  function applyVoiceStatuses(){
    document.querySelectorAll('.dvMember[data-voice-user],.dvDockMember[data-voice-user]').forEach(row=>{
      const uid=row.dataset.voiceUser;let p=null;try{p=profiles.get(uid)||null}catch{}
      const s=visibleStatus(p,uid),m=meta(s),dot=row.querySelector('.dvMemberOnline');
      if(dot)dot.className='dvMemberOnline '+m.cls;
      row.title=m.label;
    });
    renderOwnStatus();
  }

  function toggleMenu(force){
    const menu=q('cdlPresenceMenu');if(!menu)return;
    const show=typeof force==='boolean'?force:menu.classList.contains('hidden');
    menu.classList.toggle('hidden',!show);
  }

  async function refreshProfiles(){
    if(!user)return;
    try{
      const {data}=await sb.from('profiles').select('id,display_name,nickname,avatar_path,presence_status,presence_updated_at');
      (data||[]).forEach(p=>profiles.set(p.id,p));
      const own=profiles.get(user.id);if(own){profile={...profile,...own}}
    }catch{}
    await installSidebarPanel();installProfileControl();applyVoiceStatuses();
  }

  async function start(){
    if(started||!user)return;started=true;
    await refreshProfiles();await heartbeat();
    sub=sb.channel('cdl-presence-'+Date.now()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},payload=>{
      const p=payload.new;try{profiles.set(p.id,{...(profiles.get(p.id)||{}),...p})}catch{}
      if(user&&p.id===user.id)profile={...profile,...p};
      installSidebarPanel();renderOwnStatus();applyVoiceStatuses();
    }).subscribe();
    heartbeatTimer=setInterval(heartbeat,HEARTBEAT_MS);
    refreshTimer=setInterval(refreshProfiles,REFRESH_MS);
  }

  try{
    const oldEnter=enter;
    enter=function(){const out=oldEnter();setTimeout(start,80);return out};
  }catch{}
  try{
    const oldRenderProfile=renderProfile;
    renderProfile=async function(){const out=await oldRenderProfile();installProfileControl();await installSidebarPanel();renderOwnStatus();return out};
  }catch{}

  document.addEventListener('click',e=>{if(!e.target.closest('#cdlStatusPanel'))toggleMenu(false)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)heartbeat()});
  const observer=new MutationObserver(()=>{if(user){installSidebarPanel();installProfileControl();applyVoiceStatuses()}});
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.CDLPresence={setStatus,toggleMenu,visibleStatus,meta,applyVoiceStatuses,start};
  setInterval(()=>{if(user&&!started)start()},700);
})();