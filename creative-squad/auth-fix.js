// Login por e-mail da Creative Squad.
// O Supabase envia o OTP; este arquivo trata o fluxo e mensagens de erro para o usuário.
window.sendCode = async function(resend=false){
  const email=resend?pendingEmail:$('email').value.trim();
  if(!email.includes('@')) return loginMsg('Digite um e-mail válido.');

  pendingEmail=email;
  loginMsg('Enviando código...');

  const redirectTo=location.origin+location.pathname;
  const {error}=await sb.auth.signInWithOtp({
    email,
    options:{shouldCreateUser:true,emailRedirectTo:redirectTo}
  });

  if(error){
    const m=String(error.message||'');
    if(/rate limit/i.test(m)){
      return loginMsg('Muitos códigos foram solicitados. O envio de e-mail está temporariamente no limite. Aguarde alguns minutos e tente novamente.');
    }
    return loginMsg('Não foi possível enviar o código: '+m);
  }

  $('emailStep').classList.add('hidden');
  $('codeStep').classList.remove('hidden');
  $('codeEmail').textContent=email;
  $('code').value='';
  loginMsg('Código enviado. Confira seu e-mail e digite os 6 números.');
};
