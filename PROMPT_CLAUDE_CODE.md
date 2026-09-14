Cole o texto abaixo no Claude Code (dentro do VS Code), na pasta onde está o
arquivo `rifas-acampamento.html`.

---

Tenho um app de página única em `rifas-acampamento.html` que criei no Claude.ai
para controlar a venda de rifas de um acampamento de igreja (adolescentes e
jovens vendendo rifas para pagar a própria vaga). O app tem: cadastro de
vendedores, registro de vendas (número automático, comprador, telefone, forma
de pagamento, status pago/pendente), controle de repasse do dinheiro para a
tesouraria, dashboard com totais e ranking de vendedores, sorteio do ganhador
entre as rifas pagas, exportação para CSV, e configurações (preço da rifa,
meta por pessoa, grupos, senha do líder).

O problema: ele usa `window.storage`, uma API que só existe dentro do
Claude.ai. Preciso que você transforme isso em um app real que eu possa
hospedar e que várias pessoas (os vendedores e o líder) acessem ao mesmo
tempo pelo celular, com os dados sincronizados entre todos.

O que preciso que você faça:

1. Leia `rifas-acampamento.html` inteiro primeiro para entender a lógica de
   negócio, os textos em português e o visual (paleta escura verde-noturno com
   detalhe âmbar tipo fogueira, fontes Baloo 2 + Manrope) — quero manter esse
   visual e esses textos, só trocar a camada de dados.

2. Configure um projeto novo com Supabase como backend (banco de dados
   Postgres + API já pronta, tem plano gratuito). Crie as tabelas
   equivalentes às estruturas que hoje ficam em `window.storage`:
   `config`, `vendedores`, `vendas`, `sorteios` — com os mesmos campos que já
   existem no HTML atual. Ative Realtime nas tabelas `vendas` e `vendedores`
   para que o dashboard do líder atualize sozinho quando alguém registra uma
   venda em outro celular, sem precisar recarregar a página.

3. Troque a autenticação por PIN "fake" por algo simples mas real: um login
   por senha para o papel de líder (pode ser Supabase Auth com e-mail/senha,
   ou uma tabela de PIN com hash — me diga qual acha mais simples de manter
   para um grupo de igreja sem TI dedicado). Vendedores continuam só
   escolhendo o próprio nome numa lista, sem senha, como já era.

4. Estruture o projeto como um app Vite (React ou vanilla JS, o que for mais
   rápido de portar mantendo a lógica atual) com variáveis de ambiente para
   as credenciais do Supabase (não deixe chave nenhuma hardcoded no código).
   O arquivo original é um único HTML porque era um artifact do Claude.ai,
   mas aqui quero o projeto organizado em múltiplos arquivos, por exemplo:
   - `src/components/` — um componente por tela/bloco (painel do líder, tela
     do vendedor, modal de nova venda, modal de vendedor, cartão de ranking,
     tela de sorteio, configurações etc.), não tudo num componente só
   - `src/styles/` — CSS separado do JS/JSX (arquivo próprio por componente
     ou um arquivo global de tokens de cor/tipografia, o que fizer mais
     sentido na stack escolhida)
   - `src/lib/supabase.js` — inicialização do client do Supabase
   - `src/lib/` ou `src/hooks/` — funções/hooks de acesso a dados (buscar
     vendas, salvar venda, assinar realtime etc.), separadas da UI
   - `src/utils/` — funções auxiliares (formatar moeda, formatar número da
     rifa, gerar número sequencial etc.)
   Nada de deixar tudo em um `App.jsx` gigante — quero conseguir abrir cada
   arquivo e entender rápido o que ele faz.

5. Me dê um passo a passo claro depois de terminar: como criar o projeto no
   Supabase, onde colar as credenciais, como rodar localmente
   (`npm install`, `npm run dev`), e como fazer o deploy gratuito (sugira
   Vercel ou Netlify, o que for mais direto).

6. Mantenha tudo em português (interface, mensagens de erro, nomes de
   campos) igual ao arquivo original.

Antes de começar a escrever código, me confirme o plano (estrutura de tabelas,
abordagem de login do líder, e stack escolhida) para eu aprovar.

---
