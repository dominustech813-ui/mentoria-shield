window.sendCode = async function(resend=false){
  const email = resend ? pendingEmail : $('email').value.trim();
  if(!email || !email.includes('@')) return loginMsg('Digite um e-mail válido.');
  pendingEmail=email;
  loginMsg('Bot CDL está enviando o código...');
  try{
    const r = await fetch('https://yivgtvgyaalhlcxatbfc.supabase.co/functions/v1/send-cs-otp',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify({email})
    });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || !j.ok) return loginMsg(j.error || 'Não foi possível enviar o código agora.');
    $('emailStep').classList.add('hidden');
    $('codeStep').classList.remove('hidden');
    $('codeEmail').textContent=email;
    $('code').value='';
    loginMsg('Código enviado pelo Bot CDL. Confira seu e-mail.');
  }catch(e){
    loginMsg('Não foi possível conectar ao Bot CDL. Tente novamente.');
  }
};

(()=>{
  if(document.getElementById('roleEditorV23Script'))return;
  const s=document.createElement('script');
  s.id='roleEditorV23Script';
  s.src='../creative-squad/role-editor-v23.js?v=23';
  document.head.appendChild(s);
})();
