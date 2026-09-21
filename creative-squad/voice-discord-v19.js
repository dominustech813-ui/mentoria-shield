(()=>{
  const REFRESH_MS=3500;
  const STALE_MS=45000;
  let uiSub=null;
  let uiTimer=null;
  let uiStarted=false;
  let lastRows=[];
  let painting=false;

  const q=id=>document.getElementById(id);
  const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function availableRooms(){
    try{return voiceRooms.filter(r=>!r.private||admin())}catch{return []}
  }

  function currentProfile(uid){
    try{return profiles.get(uid)||null}catch{return null}
  }

  async function avatarFor(p){
    try{return await url('avatars',p?.avatar_path)}catch{return '../creative-squad-v9/logo.jpg'}
  }

  function installDock(){
    const dock=q('voiceDock');
    if(!dock||dock.dataset.discordVoice==='1')return;
    dock.dataset.discordVoice='1';
    dock.classList.add('discordVoiceDock');
    dock.innerHTML=`
      <div class="dvConnection">
        <div>
          <span class="dvConnectedLabel">VOICE CONNECTED</span>
          <b id="voiceTitle">🔊 Voz</b>
          <small id="voiceStatus">Conectando...</small>
        </div>
        <button class="dvDisconnect" type="button" onclick="leaveVoice()" aria-label="Desconectar">☎</button>
      </div>
      <div class="dvSelf">
        <div class="dvAvatarWrap"><img id="voiceSelfAvatar" class="dvAvatar" src="../creative-squad-v9/logo.jpg" alt="Perfil"><span class="dvOnline"></span></div>
        <div class="dvSelfText"><b id="voiceSelfName">Membro CDL</b><small id="voiceSelfState">Conectado ao canal de voz</small></div>
        <button id="mute" class="dvIconBtn" type="button" onclick="toggleMute()" aria-label="Microfone">🎙️</button>
        <button class="dvIconBtn" type="button" onclick="leaveVoice()" aria-label="Sair do canal">🔌</button>
      </div>
      <div class="dvRoomMembersTitle">NO CANAL</div>
      <div id="voicePeople" class="voicePeople dvPeople"></div>
      <div id="audios" hidden></div>`;
    refreshSelf();
  }

  async function refreshSelf(){
    const img=q('voiceSelfAvatar'),name=q('voiceSelfName'),state=q('voiceSelfState');
    if(!img||!name)return;
    try{
      name.textContent=profile?.display_name||profile?.nickname||'Membro CDL';
      img.src=await avatarFor(profile);
      if(state)state.textContent=muted?'Microfone silenciado':'Conectado ao canal de voz';
      const muteBtn=q('mute');
      if(muteBtn){muteBtn.textContent=muted?'🔇':'🎙️';muteBtn.classList.toggle('muted',!!muted)}
    }catch{}
  }

  async function liveRows(){
    if(!user)return [];
    const cutoff=new Date(Date.now()-STALE_MS).toISOString();
    const {data,error}=await sb.from('voice_presence').select('user_id,room,updated_at').gte('updated_at',cutoff);
    if(error)return lastRows;
    lastRows=data||[];
    return lastRows;
  }

  async function memberData(row){
    let p=currentProfile(row.user_id);
    if(!p){
      try{
        const {data}=await sb.from('profiles').select('id,display_name,nickname,avatar_path').eq('id',row.user_id).maybeSingle();
        if(data){p=data;profiles.set(data.id,data)}
      }catch{}
    }
    const avatar=await avatarFor(p);
    return {row,p:p||{display_name:'Membro CDL'},avatar};
  }

  async function paintVoices(){
    if(painting||!user)return;
    const box=q('voices');
    if(!box)return;
    painting=true;
    try{
      const rows=await liveRows();
      const info=await Promise.all(rows.map(memberData));
      const byRoom=new Map();
      info.forEach(x=>{if(!byRoom.has(x.row.room))byRoom.set(x.row.room,[]);byRoom.get(x.row.room).push(x)});
      box.innerHTML=availableRooms().map(r=>{
        const members=(byRoom.get(r.id)||[]).sort((a,b)=>String(a.p.display_name||'').localeCompare(String(b.p.display_name||''),'pt-BR'));
        return `<div class="dvChannel ${room===r.id?'joined':''}">
          <button class="voice dvChannelButton ${room===r.id?'joined':''}" type="button" onclick="joinVoice('${e(r.id)}')">
            <span class="dvVoiceIcon">🔊</span><span class="dvChannelName">${e(r.name.replace(' • Voz',''))}</span>${r.private?'<span class="lock">🔒</span>':''}
          </button>
          <div class="dvMembers ${members.length?'':'empty'}">${members.map(m=>{
            const mine=m.row.user_id===user.id;
            return `<div class="dvMember ${mine?'me':''}" data-voice-user="${e(m.row.user_id)}">
              <span class="dvMiniAvatarWrap"><img class="dvMiniAvatar" src="${e(m.avatar)}" alt="${e(m.p.display_name||'Membro CDL')}"><span class="dvMemberOnline"></span></span>
              <span class="dvMemberName">${e(m.p.display_name||m.p.nickname||'Membro CDL')}</span>
              ${mine&&muted?'<span class="dvMuted">🔇</span>':'<span class="dvMic">🎙️</span>'}
            </div>`
          }).join('')}</div>
        </div>`;
      }).join('');
      await paintCurrentRoom(info);
      await refreshSelf();
    }finally{painting=false}
  }

  async function paintCurrentRoom(info){
    const list=q('voicePeople');
    if(!list)return;
    if(!room){list.innerHTML='<div class="dvEmptyRoom">Entre em um canal para conversar.</div>';return}
    const members=info.filter(x=>x.row.room===room);
    if(!members.length){list.innerHTML='<div class="dvEmptyRoom">Conectando participantes...</div>';return}
    list.innerHTML=members.map(m=>{
      const mine=m.row.user_id===user.id;
      return `<div class="dvDockMember ${mine?'me':''}">
        <span class="dvDockAvatarWrap"><img class="dvDockAvatar" src="${e(m.avatar)}" alt="${e(m.p.display_name||'Membro CDL')}"><span class="dvMemberOnline"></span></span>
        <span><b>${e(m.p.display_name||m.p.nickname||'Membro CDL')}</b><small>${mine?'Você':'Conectado'}</small></span>
        <span class="dvDockMic">${mine&&muted?'🔇':'🎙️'}</span>
      </div>`
    }).join('');
  }

  function schedule(){setTimeout(paintVoices,80)}

  function wrapCore(){
    try{
      const coreRender=renderVoices;
      renderVoices=function(){try{coreRender()}catch{}schedule()};
    }catch{}
    try{
      const coreJoin=joinVoice;
      joinVoice=async function(id){const out=await coreJoin(id);installDock();schedule();setTimeout(schedule,700);return out};
    }catch{}
    try{
      const coreLeave=leaveVoice;
      leaveVoice=async function(){const out=await coreLeave();schedule();return out};
    }catch{}
    try{
      const coreMute=toggleMute;
      toggleMute=function(){const out=coreMute();refreshSelf();schedule();return out};
    }catch{}
    try{
      const coreEnter=enter;
      enter=function(){const out=coreEnter();start();return out};
    }catch{}
  }

  async function start(){
    if(uiStarted||!user)return;
    uiStarted=true;
    installDock();
    try{await caches()}catch{}
    await paintVoices();
    uiSub=sb.channel('cdl-discord-voice-ui-'+Date.now())
      .on('postgres_changes',{event:'*',schema:'public',table:'voice_presence'},schedule)
      .subscribe();
    uiTimer=setInterval(paintVoices,REFRESH_MS);
  }

  wrapCore();
  installDock();
  setInterval(()=>{if(user&&!uiStarted)start()},700);
  setTimeout(()=>{if(user)start();else schedule()},300);
})();