# AUDI STUDY IA — cópia de desenvolvimento baseada no MentorIA Shield

A ramificação `audi-study-ia` é uma cópia do estado original da ramificação `main`. O arquivo original `index.html` (MentorIA Shield) foi preservado integralmente **nesta cópia e na main**. Nenhuma alteração foi feita no projeto original.

## AUDI STUDY
Abra `audi-study/index.html` para acessar:
- aulas, quizzes, acompanhamento, treino por voz e chat da AUDI STUDY;
- cadastro de avaliações, conteúdos e datas;
- cronograma de estudos sugerido;
- atalhos de pedidos de simulados e análises.

A migração completa da interface de 15 MB da MentorIA Shield para o novo tema **não está concluída**. A nova AUDI STUDY foi adicionada como módulo independente à cópia, sem remover o conteúdo original.

## IA
A página dispõe de um chat que tenta alcançar `/api/chat`. O exemplo de backend está em `audi-study/worker/audi-ai.js` e pode ser hospedado separadamente em um Cloudflare Worker. É necessário configurar OPENAI_API_KEY como segredo de servidor, definir ALLOWED_ORIGIN para o domínio hospedado, implantar o Worker e configurar a URL no aplicativo. **A IA generativa não está ativa nem foi testada de ponta a ponta.** Não inclua chaves no HTML. Adicione autenticação e limitação de uso antes de liberar publicamente.

## Como visualizar
No GitHub, selecione a ramificação `audi-study-ia` e abra a pasta `audi-study`. Para publicar pela web, configure GitHub Pages na branch ou use outra hospedagem.

## Original preservado
`main`: versão original da MentorIA Shield, sem alterações deste trabalho.
