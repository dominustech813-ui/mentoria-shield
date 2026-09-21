// Compatibilidade do login por e-mail da Creative Squad.
// Se o template do Supabase ainda estiver em Magic Link, o link volta para a página correta.
window.sendCode = async function(resend=false){
  const email=resend?pendingEmail:$('email').value.trim();
  if(!email.includes('@')) return loginMsg('Digite um e-mail válido.');
  pendingEmail=email;
  loginMsg('Enviando e-mail de verificação...');
  const redirectTo=location.origin+location.pathname;
  const {error}=await sb.auth.signInWithOtp({
    email,
    options:{shouldCreateUser:true,emailRedirectTo:redirectTo}
  });
  if(error) return loginMsg('Erro: '+error.message);
  $('emailStep').classList.add('hidden');
  $('codeStep').classList.remove('hidden');
  $('codeEmail').textContent=email;
  $('code').value='';
  loginMsg('E-mail enviado. Digite o código de 6 dígitos recebido.');
};
