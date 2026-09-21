(()=>{
  let editingRoleId=null;
  const q=id=>document.getElementById(id);

  function injectStyles(){
    if(document.getElementById('roleEditorV23Style'))return;
    const s=document.createElement('style');
    s.id='roleEditorV23Style';
    s.textContent=`
      .roleActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      .roleEditBtn{background:#5865f2!important;color:#fff!important}
      .roleEditorOverlay{position:fixed;inset:0;background:#000a;display:grid;place-items:center;z-index:4000;padding:16px}
      .roleEditorOverlay.hidden{display:none}
      .roleEditorCard{width:min(460px,100%);background:#1e1f22;border:1px solid #3f4147;border-radius:14px;padding:18px;color:#f2f3f5;box-shadow:0 20px 60px #000a}
      .roleEditorCard h2{margin:0 0 14px}.roleEditorCard label{display:block;margin:10px 0 5px;font-size:12px;font-weight:800;color:#b5bac1}
      .roleEditorCard input,.roleEditorCard select{width:100%;box-sizing:border-box}.roleEditorPreview{margin:14px 0;padding:12px;background:#111214;border-radius:10px}
      .roleEditorButtons{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.roleItem{padding:10px 0;border-bottom:1px solid #2b2d31}
    `;
    document.head.appendChild(s);
  }

  function installModal(){
    if(q('roleEditorOverlay'))return;
    const d=document.createElement('div');
    d.id='roleEditorOverlay';
    d.className='roleEditorOverlay hidden';
    d.innerHTML=`<div class="roleEditorCard">
      <h2>✏️ Editar cargo</h2>
      <label>Nome do cargo</label>
      <input id="editRoleName" maxlength="60" placeholder="Nome do cargo">
      <label>Estilo</label>
      <select id="editRoleStyle">
        <option value="solid">Cor normal</option>
        <option value="pulse">Pulsante</option>
        <option value="rainbow">Rainbow</option>
        <option value="neon">Neon</option>
      </select>
      <label>Cor</label>
      <input id="editRoleColor" type="color" value="#7cff35">
      <div class="roleEditorPreview"><div class="small">PRÉ-VISUALIZAÇÃO</div><div id="editRolePreview" style="margin-top:8px"></div></div>
      <div class="roleEditorButtons"><button class="btn dark" type="button" onclick="RoleEditorV23.close()">Cancelar</button><button id="saveRoleEditBtn" class="btn green" type="button" onclick="RoleEditorV23.save()">Salvar alterações</button></div>
    </div>`;
    d.addEventListener('click',e=>{if(e.target===d)close()});
    document.body.appendChild(d);
    ['editRoleName','editRoleStyle','editRoleColor'].forEach(id=>q(id)?.addEventListener('input',preview));
    q('editRoleStyle')?.addEventListener('change',preview);
  }

  function preview(){
    const box=q('editRolePreview');if(!box)return;
    const r={name:q('editRoleName')?.value||'Cargo',style:q('editRoleStyle')?.value||'solid',color:q('editRoleColor')?.value||'#7cff35'};
    try{box.innerHTML=roleHtml(r)}catch{box.textContent=r.name}
  }

  function open(id){
    if(!admin())return;
    injectStyles();installModal();
    const r=roles.get(Number(id));if(!r)return alert('Cargo não encontrado.');
    editingRoleId=Number(id);
    q('editRoleName').value=r.name||'';
    q('editRoleStyle').value=r.style||'solid';
    q('editRoleColor').value=r.color||'#7cff35';
    preview();q('roleEditorOverlay').classList.remove('hidden');
  }

  function close(){editingRoleId=null;q('roleEditorOverlay')?.classList.add('hidden')}

  async function save(){
    if(!admin()||!editingRoleId)return;
    const name=q('editRoleName').value.trim();
    const style=q('editRoleStyle').value;
    const color=q('editRoleColor').value;
    if(!name)return alert('Digite o nome do cargo.');
    if(!['solid','pulse','rainbow','neon'].includes(style))return alert('Estilo inválido.');
    const btn=q('saveRoleEditBtn');if(btn)btn.disabled=true;
    const {error}=await sb.from('roles').update({name,style,color}).eq('id',editingRoleId);
    if(btn)btn.disabled=false;
    if(error)return alert('Não foi possível editar: '+error.message);
    close();
    try{await caches()}catch{}
    try{renderRoles()}catch{}
    try{renderMembers()}catch{}
    try{await renderProfile()}catch{}
    try{await renderMessages()}catch{}
    alert('✅ Cargo atualizado.');
  }

  function installRenderer(){
    try{
      renderRoles=function(){
        const box=q('roleList');if(!box)return;
        const a=[...roles.values()];
        box.innerHTML=a.length?a.map(r=>`<div class="roleItem"><div>${roleHtml(r)}</div><div class="roleActions"><button class="btn roleEditBtn" type="button" onclick="RoleEditorV23.open(${Number(r.id)})">✏️ Editar</button><button class="btn danger" type="button" onclick="deleteRole(${Number(r.id)})">Excluir</button></div></div>`).join(''):'<p class="small">Nenhum cargo.</p>';
      };
    }catch{}
  }

  injectStyles();installModal();installRenderer();
  window.RoleEditorV23={open,close,save,preview};
})();