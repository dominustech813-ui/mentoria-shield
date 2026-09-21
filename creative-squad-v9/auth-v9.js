window.sendCode = async function(resend=false){
  const email = resend ? pendingEmail : $('email').value.trim();
  if(!email || !email.includes('@')) return loginMsg('Digite um e-mail válido.');
  pendingEmail=email;
  loginMsg('Bot CS está enviando o código...');
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
    loginMsg('Código enviado pelo Bot CS. Confira seu e-mail.');
  }catch(e){
    loginMsg('Não foi possível conectar ao Bot CS. Tente novamente.');
  }
};
