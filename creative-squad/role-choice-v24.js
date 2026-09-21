(()=>{
  const q=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function roleFor(uid){
    try{
      const p=profiles.get(uid)||null;
      const assigned=memberRoles.get(uid)||[];
      if(!assigned.length)return null;
      const chosen=p?.primary_role_id?assigned.find(r=>Number(r.id)===Number(p.primary_role_id)):null;
      return chosen||assigned[0]||null;
    }catch{return null}
  }

  function nameHtml(uid,name){
    const r=roleFor(uid),safe=esc(name||'Membro CDL');
    if(!r)return safe;
    const style=String(r.style||'solid');
    const color=String(r.color||'#7cff35');
    if(style==='rainbow')return `<span class="cdlRoleName cdlRoleRainbow">${safe}</span>`;
    if(style==='pulse')return `<span class="cdlRoleName cdlRolePulse" style="--role-color:${esc(color)};color:${esc(color)}">${safe}</span>`;
    if(style==='neon')return `<span class="cdlRoleName cdlRoleNeon" style="--role-color:${esc(color)};color:${esc(color)}">${safe}</span>`;
    return `<span class="cdlRoleName" style="color:${esc(color)}">${safe}</span>`;
  }

  function installCss(){
    if(q('cdlRoleChoiceStyle'))return;
    const s=document.createElement('style');s.id='cdlRoleChoiceStyle';s.textContent=`
      .cdlRoleName{font-weight:900}.cdlRolePulse{animation:cdlRolePulse 1.15s ease-in-out infinite alternate}.cdlRoleNeon{text-shadow:0 0 5px var(--role-color),0 0 10px var(--role-color),0 0 18px var(--role-color)}.cdlRoleRainbow{background:linear-gradient(90deg,#ff4d4d,#ffb84d,#fff04d,#69ff69,#5ad7ff,#8e7dff,#ff61d8,#ff4d4d);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:cdlRoleRainbow 2.3s linear infinite}@keyframes cdlRolePulse{from{opacity:.55;text-shadow:0 0 2px var(--role-color)}to{opacity:1;text-shadow:0 0 10px var(--role-color)}}@keyframes cdlRoleRainbow{to{background-position:300% 0}}
      .cdlPrimaryRoleBox{margin-top:14px;padding-top:12px;border-top:1px solid #31523b}.cdlPrimaryRoleBox label{display:block;font-size:11px;font-weight:900;margin-bottom:6px}.cdlPrimaryRoleBox select{width:100%}.cdlPrimaryRoleHelp{margin-top:5px;color:#949ba4;font-size:10px}
    `;document.head.appendChild(s);
  }

  function assigned(){try{return memberRoles.get(user?.id)||[]}catch{return []}}
  function installSelector(){
    if(!user||!profile)return;
    const box=document.querySelector('#profile .card.box');if(!box)return;
    let wrap=q('cdlPrimaryRoleBox');
    if(!wrap){wrap=document.createElement('div');wrap.id='cdlPrimaryRoleBox';wrap.className='cdlPrimaryRoleBox';wrap.innerHTML='<label for="cdlPrimaryRole">Cor do meu nome</label><select id="cdlPrimaryRole" onchange="CDLRoleChoice.setPrimary(this.value)"></select><div class="cdlPrimaryRoleHelp">Escolha qual dos seus cargos vai definir a cor/efeito do seu nome.</div>';box.appendChild(wrap)}
    const sel=q('cdlPrimaryRole');if(!sel)return;
    const list=assigned();sel.innerHTML='<option value="">Padrão</option>'+list.map(r=>`<option value="${Number(r.id)}">${esc(r.name)} • ${esc(r.style||'solid')}</option>`).join('');
    sel.value=profile.primary_role_id?String(profile.primary_role_id):'';
  }

  async function setPrimary(v){
    if(!user||!profile)return;
    const value=v?Number(v):null;
    const {data,error}=await sb.from('profiles').update({primary_role_id:value}).eq('id',user.id).select().single();
    if(error){alert('Não foi possível escolher o cargo: '+error.message);installSelector();return}
    profile=data;try{profiles.set(data.id,data)}catch{}
    try{await caches()}catch{}
    installSelector();
    try{await renderProfile()}catch{}
    try{await renderMessages()}catch{}
    try{renderMembers()}catch{}
    applySelfColor();
  }

  function applySelfColor(){
    if(!user||!profile)return;
    const r=roleFor(user.id);
    const els=[q('displayName'),q('displayName2'),q('homeName'),q('cdlPresenceName'),q('voiceSelfName')].filter(Boolean);
    els.forEach(el=>{
      el.classList.remove('cdlRoleRainbow','cdlRolePulse','cdlRoleNeon');el.style.color='';el.style.textShadow='';el.style.removeProperty('--role-color');
      if(!r)return;
      const c=r.color||'#7cff35';
      if(r.style==='rainbow')el.classList.add('cdlRoleRainbow');
      else if(r.style==='pulse'){el.classList.add('cdlRolePulse');el.style.setProperty('--role-color',c);el.style.color=c}
      else if(r.style==='neon'){el.classList.add('cdlRoleNeon');el.style.setProperty('--role-color',c);el.style.color=c}
      else el.style.color=c;
    });
  }

  function installRenderers(){
    try{
      renderMessages=async function(){
        const {data,error}=await sb.from('messages').select('*').eq('channel_id',current).order('created_at').limit(250);
        if(error)return q('messages').innerHTML='<div class="small">Sem acesso.</div>';
        let h='';
        for(const m of data||[]){
          const p=profiles.get(m.user_id)||{display_name:'Membro CDL'},a=await url('avatars',p.avatar_path),im=m.image_path?await url('chat-media',m.image_path):'',time=new Date(m.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
          h+=`<div class="m"><img class="av" src="${esc(a)}"><div><div class="mh"><b>${nameHtml(m.user_id,p.display_name||p.nickname||'Membro CDL')}</b>${badges(memberRoles.get(m.user_id)||[])}<time>${time}</time></div>${m.text?`<div class="mt">${esc(m.text)}</div>`:''}${m.sticker?`<div class="st">${esc(m.sticker)}</div>`:''}${im?`<img class="mi" src="${esc(im)}">`:''}</div></div>`;
        }
        q('messages').innerHTML=h||'<div class="small">Ainda não há mensagens.</div>';q('messages').scrollTop=q('messages').scrollHeight;
      };
    }catch{}
    try{
      renderMembers=async function(){
        if(!admin())return;const {data}=await sb.from('profiles').select('*').order('display_name');let h='';
        for(const p of data||[]){const rs=memberRoles.get(p.id)||[],available=[...roles.values()].filter(r=>!rs.some(x=>x.id===r.id));h+=`<div class="member"><b>${nameHtml(p.id,p.display_name)}</b><div class="small">${esc(p.email)}</div><div>${badges(rs)}</div><div class="row"><select id="rs_${p.id}"><option value="">Escolher cargo...</option>${available.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select><button class="btn green" onclick="assignRole('${p.id}')">Dar cargo</button></div>${rs.map(r=>`<button class="btn dark" onclick="removeRole('${p.id}',${r.id})">Remover ${esc(r.name)}</button>`).join(' ')}</div>`}q('memberList').innerHTML=h||'<p class="small">Nenhum membro.</p>';
      };
    }catch{}
  }

  try{const oldRenderProfile=renderProfile;renderProfile=async function(){const out=await oldRenderProfile();installSelector();applySelfColor();return out}}catch{}
  installCss();installRenderers();
  window.CDLRoleChoice={roleFor,nameHtml,setPrimary,installSelector,applySelfColor};
  setInterval(()=>{if(user){installSelector();applySelfColor()}},3000);
})();