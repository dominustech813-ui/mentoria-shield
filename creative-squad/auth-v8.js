// Creative Squad v8 - login OTP com tratamento de limite
window.sendCode = async function(resend=false){
  const email = resend ? pendingEmail : $('email').value.trim();
  if(!email || !email.includes('@')) return loginMsg('Digite um e-mail válido.');
  pendingEmail = email;

  const now = Date.now();
  const last = Number(localStorage.getItem('cs_last_otp') || '0');
  const wait = Math.max(0, 60 - Math.floor((now-last)/1000));
  if(wait > 0) return loginMsg('Aguarde '+wait+' segundos antes de pedir outro código.');

  loginMsg('Enviando código...');
  const {error} = await sb.auth.signInWithOtp({ email, options:{shouldCreateUser:true} });

  if(error){
    const msg = String(error.message || '').toLowerCase();
    if(msg.includes('rate limit')){
      loginMsg('Muitos códigos foram pedidos. O envio do Supabase está temporariamente bloqueado pelo limite de e-mails.');
      return;
    }
    if(msg.includes('not authorized')){
      loginMsg('Este e-mail ainda não está autorizado pelo provedor de e-mail do projeto.');
      return;
    }
    loginMsg('Não foi possível enviar o código: '+error.message);
    return;
  }

  localStorage.setItem('cs_last_otp', String(Date.now()));
  $('emailStep').classList.add('hidden');
  $('codeStep').classList.remove('hidden');
  $('codeEmail').textContent = email;
  $('code').value = '';
  loginMsg('Código enviado. Confira sua caixa de entrada e também o spam.');
};
