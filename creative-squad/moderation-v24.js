(()=>{
  const ADMIN_EMAIL='theoccosta2020@gmail.com';
  const q=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let started=false,checkTimer=null;

  function addCss(){
    if(q('moderationV24Style'))return;
    const s=document.createElement('style');s.id='moderationV24Style';s.textContent=`
      .modGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.modUser{background:#232428;border:1px solid #35373c;border-radius:10px;padding:12px}.modTop{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:10px;align-items:center}.modAvatar{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#111214}.modName{font-weight:900;color:#f2f3f5}.modEmail{font-size:10px;color:#949ba4;word-break:break-all}.modStatus{font-size:9px;font-weight:900;padding:4px 7px;border-radius:999px;background:#3f4147;color:#dbdee1}.modStatus.banned{background:#6d2024;color:#ffb5b9}.modStatus.suspended{background:#66530c;color:#ffe88a}.modActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.modBtn{border:0;border-radius:7px;padding:8px 10px;font-size:10px;font-weight:900;cursor:pointer}.modBan{background:#da373c;color:#fff}.modSuspend{background:#f0b232;color:#1e1f22}.modRestore{background:#23a55a;color:#fff}.modInfo{margin-top:7px;color:#b5bac1;font-size:10px;line-height:1.35}.modSearch{width:100%;margin-bottom:12px!important}
    `;document.head.appendChild(s)
  }

  function installUi(){
    if(!admin()||q('moderation'))return;
    addCss();
    const nav=document.querySelector('nav.tabs');
    const b=document.createElement('button');b.id='moderationTab';b.className='tab admin';b.dataset.tab='moderation';b.setAttribute('onclick',"tab('moderation')");b.textContent='🛡️ Moderação';nav?.appendChild(b);
    const sec=document.createElement('section');sec.id='moderation';sec.className='view hidden';sec.innerHTML=`<div class="card box"><h2>🛡️ Moderação de participantes</h2><p class="small">Banir remove o acesso ao site. Suspender bloqueia o acesso até o prazo terminar.</p><input id="modSearch" class="modSearch" placeholder="Buscar participante" oninput="CDLModeration.render(this.value)"><div id="modList" class="modGrid"><p class="small">Carregando...</p></div></div>`;q('app')?.appendChild(sec)
  }

  function installTab(){
    if(window.__cdlModerationTabWrapped)return;window.__cdlModerationTabWrapped=true;
    const oldTab=window.tab;
    window.tab=function(name){
      if(name==='moderation'){
        if(!admin())return oldTab('home');
        ['home','chat','notifications','profile','roles','direct'].forEach(id=>q(id)?.classList.add('hidden'));
        q('moderation')?.classList.remove('hidden');document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab==='moderation'));load();return;
      }
      q('moderation')?.classList.add('hidden');return oldTab(name)
    }
  }

  async function avatarFor(p){try{return await url('avatars',p?.avatar_path)}catch{return '../creative-squad-v9/logo.jpg'}}
  function effectiveStatus(row){if(!row||row.status==='active')return 'active';if(row.status==='banned')return 'banned';if(row.status==='suspended'){const t=row.suspended_until?new Date(row.suspended_until).getTime():Infinity;return t>Date.now()?'suspended':'active'}return 'active'}

  async function dataRows(){
    await caches();
    const {data:mods}=await sb.from('member_moderation').select('*');
    const map=new Map((mods||[]).map(x=>[x.user_id,x]));
    return [...profiles.values()].map(p=>({p,m:map.get(p.id)||null})).sort((a,b)=>String(a.p.display_name||'').localeCompare(String(b.p.display_name||''),'pt-BR'))
  }

  async function load(){window.__modRows=await dataRows();render(q('modSearch')?.value||'')}
  async function render(term=''){
    const box=q('modList');if(!box||!admin())return;const t=String(term).trim().toLowerCase();const rows=(window.__modRows||await dataRows()).filter(x=>!t||`${x.p.display_name||''} ${x.p.nickname||''} ${x.p.email||''}`.toLowerCase().includes(t));
    if(!rows.length){box.innerHTML='<p class="small">Nenhum participante encontrado.</p>';return}
    const html=await Promise.all(rows.map(async x=>{const p=x.p,m=x.m,s=effectiveStatus(m),a=await avatarFor(p),isMain=String(p.email||'').toLowerCase()===ADMIN_EMAIL;let info='Ativo';if(s==='banned')info='Banido'+(m?.reason?' • '+m.reason:'');if(s==='suspended')info='Suspenso até '+new Date(m.suspended_until).toLocaleString('pt-BR')+(m?.reason?' • '+m.reason:'');return `<div class="modUser"><div class="modTop"><img class="modAvatar" src="${esc(a)}"><div><div class="modName">${window.CDLRoleChoice?CDLRoleChoice.nameHtml(p.id,p.display_name||p.nickname||'Membro CDL'):esc(p.display_name||p.nickname||'Membro CDL')}</div><div class="modEmail">${esc(p.email||'')}</div></div><span class="modStatus ${s}">${s==='banned'?'BANIDO':s==='suspended'?'SUSPENSO':'ATIVO'}</span></div><div class="modInfo">${esc(info)}</div>${isMain?'<div class="modInfo">👑 Administrador principal</div>':`<div class="modActions">${s!=='banned'?'<button class="modBtn modBan" onclick="CDLModeration.ban(\''+esc(p.id)+'\')">Banir</button>':''}${s!=='suspended'?'<button class="modBtn modSuspend" onclick="CDLModeration.suspend(\''+esc(p.id)+'\',1)">1 hora</button><button class="modBtn modSuspend" onclick="CDLModeration.suspend(\''+esc(p.id)+'\',24)">1 dia</button><button class="modBtn modSuspend" onclick="CDLModeration.suspend(\''+esc(p.id)+'\',168)">7 dias</button><button class="modBtn modSuspend" onclick="CDLModeration.suspend(\''+esc(p.id)+'\',720)">30 dias</button>':''}${s!=='active'?'<button class="modBtn modRestore" onclick="CDLModeration.restore(\''+esc(p.id)+'\')">Reativar</button>':''}</div>`}</div>`}));box.innerHTML=html.join('')
  }

  function reasonPrompt(label){const v=prompt('Motivo para '+label+' (opcional):','');return v===null?null:String(v).slice(0,500)}
  async function ban(uid){if(!admin())return;const reason=reasonPrompt('banir');if(reason===null)return;if(!confirm('Banir este participante do site?'))return;const {error}=await sb.from('member_moderation').upsert({user_id:uid,status:'banned',suspended_until:null,reason:reason||null,updated_by:user.id});if(error)return alert(error.message);await load()}
  async function suspend(uid,hours){if(!admin())return;const reason=reasonPrompt('suspender');if(reason===null)return;const until=new Date(Date.now()+hours*3600000).toISOString();const {error}=await sb.from('member_moderation').upsert({user_id:uid,status:'suspended',suspended_until:until,reason:reason||null,updated_by:user.id});if(error)return alert(error.message);await load()}
  async function restore(uid){if(!admin())return;const {error}=await sb.from('member_moderation').upsert({user_id:uid,status:'active',suspended_until:null,reason:null,updated_by:user.id});if(error)return alert(error.message);await load()}

  async function checkOwn(){
    if(!user||admin())return;
    const {data}=await sb.from('member_moderation').select('status,suspended_until,reason').eq('user_id',user.id).maybeSingle();if(!data)return;
    const s=effectiveStatus(data);if(s==='active')return;
    const text=s==='banned'?'Seu acesso à CDL foi banido.':`Seu acesso à CDL está suspenso até ${new Date(data.suspended_until).toLocaleString('pt-BR')}.`;
    alert(text+(data.reason?'\nMotivo: '+data.reason:''));
    try{await sb.auth.signOut()}catch{}
    location.replace('../creative-squad-v14/?blocked='+s+'&v=24')
  }

  async function start(){if(started||!user)return;started=true;if(admin()){installUi();installTab();await load()}await checkOwn();checkTimer=setInterval(checkOwn,10000)}
  window.CDLModeration={render,ban,suspend,restore,load,start};
  addCss();installTab();setInterval(()=>{if(user&&!started)start()},700);setTimeout(()=>{if(user)start()},500);
})();